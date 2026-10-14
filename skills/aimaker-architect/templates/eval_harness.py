"""Golden-set evaluation harness for LLM / RAG / agent / extraction / classification systems (stdlib only).

Golden set: JSONL, one case per line:
  {"id": "c1", "input": ..., "expected": ..., "slice": "invoices-hindi",
   "assert": [{"type": "contains", "value": "refund"}, {"type": "max_latency_ms", "value": 2000}],   # optional
   "relevant_ids": ["doc-12", "doc-40"],                                                             # optional (retrieval)
   "human_score": 1}                                                                                 # optional (judge calibration)
Predictor:  any Python callable "module:function" taking `input` and returning the output, or a dict
            {"output": ..., "cost": 0.0012, "retrieved": ["doc-12", ...]}.
Judge:      optional "module:function(case, output) -> float 0..1 or bool" (e.g. an LLM rubric grader).

usage:
  python eval_harness.py --golden golden.jsonl --predictor my_system:predict
      [--schema '{"invoice_no": "str", "total": "number"}'] [--gate exact=0.85,pass_rate=0.9,p95_ms=2000]
      [--baseline old_system:predict] [--judge graders:rubric --min-kappa 0.6] [--repeats 3] [--k 5]
      [--out .aimaker/eval] [--seed 7]

Reports: exact match, token F1, field accuracy, schema validity, assertion pass rate, retrieval recall@k / MRR / nDCG@k,
latency p50/p95, cost, per-slice breakdown, 95% bootstrap intervals, judge-vs-human agreement (Cohen's kappa; judge
results are marked untrusted below --min-kappa), consistency across --repeats, and a paired comparison with --baseline
(difference with bootstrap interval + exact McNemar test). Exit code 1 if any --gate fails.
"""
from __future__ import annotations

import argparse
import importlib
import json
import math
import random
import re
import statistics
import sys
import time
from collections import defaultdict
from pathlib import Path

TYPES = {"str": str, "number": (int, float), "int": int, "bool": bool, "list": list, "dict": dict}
MAXIMA = ("p95_ms", "p50_ms", "cost_per_case")


def norm(x):
    return re.sub(r"\s+", " ", str(x).strip().lower())


def token_f1(pred, gold) -> float:
    p, g = norm(pred).split(), norm(gold).split()
    if not p and not g:
        return 1.0
    common = sum(min(p.count(t), g.count(t)) for t in set(p))
    if common == 0:
        return 0.0
    prec, rec = common / len(p), common / len(g)
    return 2 * prec * rec / (prec + rec)


def field_accuracy(pred, gold) -> float | None:
    if not isinstance(gold, dict):
        return None
    if not isinstance(pred, dict):
        return 0.0
    return sum(norm(pred.get(k)) == norm(v) for k, v in gold.items()) / max(1, len(gold))


def type_ok(value, t: str) -> bool:
    if t == "bool":
        return isinstance(value, bool)
    # bool is a subclass of int in Python — never accept True/False as a number.
    return isinstance(value, TYPES[t]) and not isinstance(value, bool)


def schema_valid(pred, schema: dict | None) -> bool | None:
    if schema is None:
        return None
    if not isinstance(pred, dict):
        return False
    return all(k in pred and type_ok(pred[k], t) for k, t in schema.items())


def as_text(x) -> str:
    return x if isinstance(x, str) else json.dumps(x, ensure_ascii=False, sort_keys=True)


def check_assert(a: dict, out, ms: float, cost, judge_score) -> bool:
    """One assertion. Types: equals, contains, not_contains, icontains, regex, not_regex, is_json, json_schema,
    max_latency_ms, max_cost, min_judge."""
    t, v = a.get("type"), a.get("value")
    text = as_text(out) if out is not None else ""
    if t == "equals":
        return norm(as_text(out)) == norm(as_text(v))
    if t == "contains":
        return str(v) in text
    if t == "icontains":
        return str(v).lower() in text.lower()
    if t == "not_contains":
        return str(v).lower() not in text.lower()
    if t == "regex":
        return re.search(v, text) is not None
    if t == "not_regex":
        return re.search(v, text) is None
    if t == "is_json":
        if isinstance(out, (dict, list)):
            return True
        try:
            json.loads(text)
            return True
        except ValueError:
            return False
    if t == "json_schema":
        obj = out if isinstance(out, dict) else (json.loads(text) if text.strip().startswith("{") else None)
        return isinstance(obj, dict) and bool(schema_valid(obj, v))
    if t == "max_latency_ms":
        return ms <= float(v)
    if t == "max_cost":
        return cost is not None and cost <= float(v)
    if t == "min_judge":
        return judge_score is not None and judge_score >= float(v)
    raise ValueError(f"unknown assertion type: {t}")


def retrieval_metrics(retrieved, relevant, k: int) -> dict:
    rel = set(relevant)
    top = list(retrieved)[:k]
    hits = [1 if d in rel else 0 for d in top]
    recall = sum(hits) / len(rel) if rel else None
    mrr = next((1 / (i + 1) for i, h in enumerate(hits) if h), 0.0)
    dcg = sum(h / math.log2(i + 2) for i, h in enumerate(hits))
    idcg = sum(1 / math.log2(i + 2) for i in range(min(k, len(rel))))
    return {"recall_at_k": recall, "mrr": mrr, "ndcg_at_k": dcg / idcg if idcg else None}


def pct(values, q):
    if not values:
        return None
    s = sorted(values)
    return s[min(len(s) - 1, int(round(q * (len(s) - 1))))]


def bootstrap_ci(values, rng, n=1000):
    """95% percentile bootstrap interval of the mean."""
    if len(values) < 2:
        return None
    means = sorted(statistics.mean(rng.choices(values, k=len(values))) for _ in range(n))
    return [round(means[int(0.025 * n)], 4), round(means[int(0.975 * n) - 1], 4)]


def cohen_kappa(a, b):
    """Agreement between two binary raters beyond chance."""
    n = len(a)
    if n == 0:
        return None
    po = sum(x == y for x, y in zip(a, b)) / n
    pa, pb = sum(a) / n, sum(b) / n
    pe = pa * pb + (1 - pa) * (1 - pb)
    return 1.0 if pe == 1 else round((po - pe) / (1 - pe), 4)


def mcnemar_exact(b: int, c: int) -> float:
    """Two-sided exact McNemar p-value from the discordant pair counts."""
    n = b + c
    if n == 0:
        return 1.0
    k = min(b, c)
    p = sum(math.comb(n, i) for i in range(k + 1)) / 2 ** n
    return round(min(1.0, 2 * p), 6)


def load(spec: str):
    mod, fn = spec.split(":")
    return getattr(importlib.import_module(mod), fn)


def run_case(predict, case, schema, judge, k):
    t0 = time.perf_counter()
    err, cost, retrieved = None, None, None
    try:
        res = predict(case["input"])
        if isinstance(res, dict) and "output" in res:
            res, cost, retrieved = res["output"], res.get("cost"), res.get("retrieved")
    except Exception as e:  # a crash is a failed case, not a crashed evaluation
        res, err = None, f"{type(e).__name__}: {e}"
    ms = (time.perf_counter() - t0) * 1000
    gold = case.get("expected")
    judge_score = None
    if judge and res is not None:
        try:
            j = judge(case, res)
            judge_score = float(j) if not isinstance(j, bool) else (1.0 if j else 0.0)
        except Exception as e:
            err = err or f"judge {type(e).__name__}: {e}"
    asserts = case.get("assert") or []
    passed = [check_assert(a, res, ms, cost, judge_score) if res is not None or a.get("type") in ("not_contains", "not_regex") else False for a in asserts]
    row = {
        "id": case.get("id"), "slice": case.get("slice", "all"), "ms": ms, "cost": cost, "error": err, "output": res,
        "exact": (gold is not None and res is not None and norm(json.dumps(res, sort_keys=True)) == norm(json.dumps(gold, sort_keys=True))),
        "f1": token_f1(res, gold) if isinstance(gold, str) and res is not None else (0.0 if isinstance(gold, str) else None),
        "field_acc": field_accuracy(res, gold), "schema": schema_valid(res, schema),
        "asserts": len(asserts), "asserts_passed": sum(passed), "judge": judge_score,
    }
    # A case passes when it did not crash and its criteria hold: its assertions if it has any, otherwise an exact match
    # with `expected`, otherwise just running without error.
    row["pass"] = err is None and (all(passed) if asserts else row["exact"] if gold is not None else True)
    if case.get("relevant_ids") is not None and retrieved is not None:
        row.update(retrieval_metrics(retrieved, case["relevant_ids"], k))
    return row


def summarise(rows, rng=None):
    out = {"n": len(rows), "pass_rate": round(sum(r["pass"] for r in rows) / len(rows), 4), "exact": round(sum(r["exact"] for r in rows) / len(rows), 4)}
    for key, name in (("f1", "token_f1"), ("field_acc", "field_accuracy"), ("recall_at_k", "recall_at_k"), ("mrr", "mrr"), ("ndcg_at_k", "ndcg_at_k"), ("judge", "judge_mean")):
        vals = [r[key] for r in rows if r.get(key) is not None]
        if vals:
            out[name] = round(statistics.mean(vals), 4)
    sv = [r["schema"] for r in rows if r["schema"] is not None]
    if sv:
        out["schema"] = round(sum(sv) / len(sv), 4)
    na = sum(r["asserts"] for r in rows)
    if na:
        out["assertions_passed"] = round(sum(r["asserts_passed"] for r in rows) / na, 4)
    lat = [r["ms"] for r in rows]
    out["p50_ms"], out["p95_ms"] = round(pct(lat, 0.5), 1), round(pct(lat, 0.95), 1)
    cost = [r["cost"] for r in rows if r["cost"] is not None]
    if cost:
        out["cost_total"], out["cost_per_case"] = round(sum(cost), 6), round(sum(cost) / len(cost), 6)
    out["errors"] = sum(1 for r in rows if r["error"])
    if rng is not None:
        out["pass_rate_ci95"] = bootstrap_ci([1.0 if r["pass"] else 0.0 for r in rows], rng)
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--golden", required=True)
    ap.add_argument("--predictor", required=True, help="module:function")
    ap.add_argument("--schema", help='JSON mapping field -> type (str, number, int, bool, list, dict)')
    ap.add_argument("--gate", default="", help="e.g. exact=0.85,pass_rate=0.9,p95_ms=2000,delta_pass_rate=0 (p95_ms/p50_ms/cost_per_case are maxima)")
    ap.add_argument("--baseline", help="module:function of the current system, for a paired comparison")
    ap.add_argument("--judge", help="module:function(case, output) -> score 0..1 or bool")
    ap.add_argument("--min-kappa", type=float, default=0.6, help="judge must agree with human_score labels at least this much")
    ap.add_argument("--repeats", type=int, default=1, help="run each case N times to measure consistency")
    ap.add_argument("--k", type=int, default=5, help="cut-off for retrieval metrics")
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--out", default=".aimaker/eval")
    a = ap.parse_args()

    sys.path.insert(0, str(Path.cwd()))
    rng = random.Random(a.seed)
    predict = load(a.predictor)
    judge = load(a.judge) if a.judge else None
    schema = json.loads(a.schema) if a.schema else None
    cases = [json.loads(line) for line in Path(a.golden).read_text(encoding="utf-8").splitlines() if line.strip()]
    if not cases:
        print("golden set is empty", file=sys.stderr)
        return 2

    runs = [[run_case(predict, c, schema, judge, a.k) for c in cases] for _ in range(max(1, a.repeats))]
    rows = runs[0]
    overall = summarise(rows, rng)
    if a.repeats > 1:
        # Share of cases whose pass/fail is identical in every repeat, and share passing every time (pass^k).
        same = sum(len({run[i]["pass"] for run in runs}) == 1 for i in range(len(cases)))
        overall["consistency"] = round(same / len(cases), 4)
        overall["pass_all_repeats"] = round(sum(all(run[i]["pass"] for run in runs) for i in range(len(cases))) / len(cases), 4)

    notes = []
    labelled = [(r["judge"], c["human_score"]) for r, c in zip(rows, cases) if r["judge"] is not None and c.get("human_score") is not None]
    if judge:
        humans = {1 if h >= 0.5 else 0 for _, h in labelled}
        if len(labelled) >= 10 and len(humans) < 2:
            overall["judge_trusted"] = False
            notes.append("judge uncalibrated: human_score labels must include both good and bad answers")
        elif len(labelled) >= 10:
            kappa = cohen_kappa([1 if j >= 0.5 else 0 for j, _ in labelled], [1 if h >= 0.5 else 0 for _, h in labelled])
            overall["judge_kappa"] = kappa
            overall["judge_trusted"] = kappa is not None and kappa >= a.min_kappa
        else:
            overall["judge_trusted"] = False
            notes.append(f"judge uncalibrated: only {len(labelled)} cases carry human_score (need >= 10)")
        if not overall["judge_trusted"]:
            notes.append("judge results are NOT trusted: calibrate the rubric against human labels before gating on them")

    comparison = None
    if a.baseline:
        base = [run_case(load(a.baseline), c, schema, judge, a.k) for c in cases]
        b = sum(1 for x, y in zip(rows, base) if x["pass"] and not y["pass"])  # new wins
        c_ = sum(1 for x, y in zip(rows, base) if not x["pass"] and y["pass"])  # new losses
        diffs = [(1.0 if x["pass"] else 0.0) - (1.0 if y["pass"] else 0.0) for x, y in zip(rows, base)]
        comparison = {"baseline": summarise(base), "delta_pass_rate": round(statistics.mean(diffs), 4), "delta_ci95": bootstrap_ci(diffs, rng),
                      "new_wins": b, "new_losses": c_, "mcnemar_p": mcnemar_exact(b, c_)}
        comparison["significant"] = comparison["mcnemar_p"] < 0.05
        overall["delta_pass_rate"] = comparison["delta_pass_rate"]

    slices = defaultdict(list)
    for r in rows:
        slices[r["slice"]].append(r)
    per_slice = {s: summarise(rs) for s, rs in sorted(slices.items())}

    failures = []
    for item in filter(None, a.gate.split(",")):
        k, v = item.split("=")
        v = float(v)
        actual = overall.get(k)
        if actual is None:
            failures.append(f"{k}: metric not available")
        elif (k in MAXIMA and actual > v) or (k not in MAXIMA and actual < v):
            failures.append(f"{k}: {actual} vs gate {v}")
        if k in ("judge_mean",) and not overall.get("judge_trusted"):
            failures.append("judge_mean: judge is not calibrated against human labels")
    # Slices far below overall are a red flag even when the average passes.
    weak = [s for s, m in per_slice.items() if len(per_slice) > 1 and m["pass_rate"] < overall["pass_rate"] - 0.1]

    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    report = {"overall": overall, "slices": per_slice, "comparison": comparison, "gate_failures": failures, "weak_slices": weak, "notes": notes, "cases": rows}
    (out / "results.json").write_text(json.dumps(report, indent=2, default=str), encoding="utf-8")
    print(json.dumps({"overall": overall, "slices": per_slice, "comparison": comparison}, indent=2, default=str))
    for n in notes:
        print(f"note: {n}")
    if weak:
        print(f"weak slices (>10 pts below overall pass rate): {', '.join(weak)}")
    if comparison:
        verdict = "significantly better" if comparison["significant"] and comparison["delta_pass_rate"] > 0 else "significantly worse" if comparison["significant"] else "not significantly different"
        print(f"vs baseline: {comparison['delta_pass_rate']:+.3f} pass rate (95% CI {comparison['delta_ci95']}), McNemar p={comparison['mcnemar_p']} -> {verdict}")
    if failures:
        print("GATE FAILED: " + "; ".join(failures))
        return 1
    print("gates passed" if a.gate else "no gates set")
    return 0


if __name__ == "__main__":
    sys.exit(main())
