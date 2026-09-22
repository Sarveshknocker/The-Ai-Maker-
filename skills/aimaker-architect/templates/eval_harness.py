"""Golden-set evaluation harness for LLM / extraction / classification systems (stdlib only).

Golden set: JSONL, one case per line: {"id": "c1", "input": ..., "expected": ..., "slice": "invoices-hindi"}
Predictor:  any Python callable "module:function" that takes `input` and returns either the output,
            or {"output": ..., "cost": 0.0012} to also track cost.

usage:
  python eval_harness.py --golden golden.jsonl --predictor my_system:predict
                         [--schema '{"invoice_no": "str", "total": "number"}'] [--gate exact=0.85,schema=0.99,p95_ms=2000]
                         [--out .aimaker/eval]
Metrics: exact match, token F1 (strings), field accuracy (dicts), schema validity, latency p50/p95, cost, per-slice breakdown.
Exit code 1 if any --gate threshold fails (use in CI before promoting a prompt/model change).
"""
from __future__ import annotations

import argparse
import importlib
import json
import re
import statistics
import sys
import time
from collections import defaultdict
from pathlib import Path

TYPES = {"str": str, "number": (int, float), "int": int, "bool": bool, "list": list, "dict": dict}


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


def pct(values, q):
    if not values:
        return None
    s = sorted(values)
    return s[min(len(s) - 1, int(round(q * (len(s) - 1))))]


def summarise(rows):
    out = {"n": len(rows), "exact": round(sum(r["exact"] for r in rows) / len(rows), 4)}
    f1 = [r["f1"] for r in rows if r["f1"] is not None]
    if f1:
        out["token_f1"] = round(statistics.mean(f1), 4)
    fa = [r["field_acc"] for r in rows if r["field_acc"] is not None]
    if fa:
        out["field_accuracy"] = round(statistics.mean(fa), 4)
    sv = [r["schema"] for r in rows if r["schema"] is not None]
    if sv:
        out["schema"] = round(sum(sv) / len(sv), 4)
    lat = [r["ms"] for r in rows]
    out["p50_ms"], out["p95_ms"] = round(pct(lat, 0.5), 1), round(pct(lat, 0.95), 1)
    cost = [r["cost"] for r in rows if r["cost"] is not None]
    if cost:
        out["cost_total"], out["cost_per_case"] = round(sum(cost), 6), round(sum(cost) / len(cost), 6)
    out["errors"] = sum(1 for r in rows if r["error"])
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--golden", required=True)
    ap.add_argument("--predictor", required=True, help="module:function")
    ap.add_argument("--schema", help='JSON mapping field -> type (str, number, int, bool, list, dict)')
    ap.add_argument("--gate", default="", help="e.g. exact=0.85,schema=0.99,p95_ms=2000 (p95_ms/cost_per_case are maxima)")
    ap.add_argument("--out", default=".aimaker/eval")
    a = ap.parse_args()

    sys.path.insert(0, str(Path.cwd()))
    mod, fn = a.predictor.split(":")
    predict = getattr(importlib.import_module(mod), fn)
    schema = json.loads(a.schema) if a.schema else None

    rows = []
    for line in Path(a.golden).read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        case = json.loads(line)
        t0 = time.perf_counter()
        err, cost = None, None
        try:
            res = predict(case["input"])
            if isinstance(res, dict) and "output" in res:
                res, cost = res["output"], res.get("cost")
        except Exception as e:  # a crash is a failed case, not a crashed evaluation
            res, err = None, f"{type(e).__name__}: {e}"
        ms = (time.perf_counter() - t0) * 1000
        gold = case["expected"]
        rows.append({
            "id": case.get("id"), "slice": case.get("slice", "all"), "ms": ms, "cost": cost, "error": err,
            "exact": (norm(json.dumps(res, sort_keys=True)) == norm(json.dumps(gold, sort_keys=True))) if res is not None else False,
            "f1": token_f1(res, gold) if isinstance(gold, str) and res is not None else (0.0 if isinstance(gold, str) else None),
            "field_acc": field_accuracy(res, gold), "schema": schema_valid(res, schema), "output": res,
        })
    if not rows:
        print("golden set is empty", file=sys.stderr)
        return 2

    overall = summarise(rows)
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
        elif (k in ("p95_ms", "p50_ms", "cost_per_case") and actual > v) or (k not in ("p95_ms", "p50_ms", "cost_per_case") and actual < v):
            failures.append(f"{k}: {actual} vs gate {v}")
    # Slices far below overall are a red flag even when the average passes.
    weak = [s for s, m in per_slice.items() if len(per_slice) > 1 and m["exact"] < overall["exact"] - 0.1]

    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    (out / "results.json").write_text(json.dumps({"overall": overall, "slices": per_slice, "gate_failures": failures, "weak_slices": weak, "cases": rows}, indent=2, default=str), encoding="utf-8")
    print(json.dumps({"overall": overall, "slices": per_slice}, indent=2))
    if weak:
        print(f"weak slices (>10 pts below overall exact): {', '.join(weak)}")
    if failures:
        print("GATE FAILED: " + "; ".join(failures))
        return 1
    print("gates passed" if a.gate else "no gates set")
    return 0


if __name__ == "__main__":
    sys.exit(main())
