"""Leakage-safe tabular baseline — the bar every advanced approach must beat.

Compares a regularised linear model with gradient-boosted trees using splits that mirror reality
(time-based or group-aware), then picks a decision threshold by *business cost* instead of accuracy.

deps: pip install scikit-learn pandas
usage:
  python baseline_tabular.py --data data.csv --target churned [--time signup_date] [--group customer_id]
                             [--drop col1,col2] [--fp-cost 1 --fn-cost 5] [--out .aimaker/baseline]
Writes metrics.json and BASELINE.md (a minimal model card) to --out.
"""
from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingClassifier, HistGradientBoostingRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.metrics import (average_precision_score, brier_score_loss, mean_absolute_error,
                             mean_absolute_percentage_error, roc_auc_score)
from sklearn.model_selection import GroupShuffleSplit
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


def split(df: pd.DataFrame, time_col: str | None, group_col: str | None, test_size: float = 0.2):
    """Time-based if a time column is given, else group-aware if a group column is given, else random."""
    if time_col:
        order = pd.to_datetime(df[time_col], errors="coerce").sort_values(kind="stable").index
        cut = int(len(order) * (1 - test_size))
        return order[:cut], order[cut:], f"time-based (train before, test after, on '{time_col}')"
    if group_col:
        gss = GroupShuffleSplit(n_splits=1, test_size=test_size, random_state=42)
        tr, te = next(gss.split(df, groups=df[group_col]))
        return df.index[tr], df.index[te], f"group-aware on '{group_col}' (no entity in both sets)"
    rng = np.random.default_rng(42)
    idx = rng.permutation(df.index.to_numpy())
    cut = int(len(idx) * (1 - test_size))
    return idx[:cut], idx[cut:], "random (only valid if rows are independent and identically distributed)"


def build_preprocessor(X: pd.DataFrame, scale: bool) -> ColumnTransformer:
    num = X.select_dtypes(include="number").columns.tolist()
    cat = [c for c in X.columns if c not in num]
    num_steps = [("impute", SimpleImputer(strategy="median"))] + ([("scale", StandardScaler())] if scale else [])
    return ColumnTransformer([
        ("num", Pipeline(num_steps), num),
        ("cat", Pipeline([("impute", SimpleImputer(strategy="most_frequent")),
                          ("onehot", OneHotEncoder(handle_unknown="ignore", min_frequency=10, sparse_output=False))]), cat),
    ])


def best_threshold(y_true: np.ndarray, proba: np.ndarray, fp_cost: float, fn_cost: float):
    """Threshold minimising expected cost per case: fp_cost·FP + fn_cost·FN."""
    best = (0.5, float("inf"))
    for t in np.linspace(0.01, 0.99, 99):
        pred = proba >= t
        fp = np.sum(pred & (y_true == 0))
        fn = np.sum(~pred & (y_true == 1))
        cost = (fp_cost * fp + fn_cost * fn) / len(y_true)
        if cost < best[1]:
            best = (float(t), float(cost))
    return best


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--data", required=True)
    ap.add_argument("--target", required=True)
    ap.add_argument("--time")
    ap.add_argument("--group")
    ap.add_argument("--drop", default="", help="comma-separated columns to exclude (IDs, leakage)")
    ap.add_argument("--fp-cost", type=float, default=1.0)
    ap.add_argument("--fn-cost", type=float, default=1.0)
    ap.add_argument("--out", default=".aimaker/baseline")
    a = ap.parse_args()

    df = pd.read_csv(a.data).dropna(subset=[a.target]).reset_index(drop=True)
    y_all = df[a.target]
    task = "classification" if y_all.nunique() <= 2 else "regression"
    exclude = {a.target, a.time, a.group, *[c for c in a.drop.split(",") if c]} - {None}
    X_all = df[[c for c in df.columns if c not in exclude]]

    tr, te, split_desc = split(df, a.time, a.group)
    X_tr, X_te, y_tr, y_te = X_all.loc[tr], X_all.loc[te], y_all.loc[tr], y_all.loc[te]
    if task == "classification":
        classes = sorted(y_all.unique())
        y_tr, y_te = (y_tr == classes[-1]).astype(int), (y_te == classes[-1]).astype(int)

    models = {
        "linear": (LogisticRegression(max_iter=2000, class_weight="balanced") if task == "classification" else Ridge(alpha=1.0), True),
        "gbdt": (HistGradientBoostingClassifier(random_state=42) if task == "classification" else HistGradientBoostingRegressor(random_state=42), False),
    }
    results = {}
    for name, (est, scale) in models.items():
        pipe = Pipeline([("prep", build_preprocessor(X_tr, scale)), ("model", est)])
        t0 = time.perf_counter()
        pipe.fit(X_tr, y_tr)
        fit_s = time.perf_counter() - t0
        t0 = time.perf_counter()
        if task == "classification":
            proba = pipe.predict_proba(X_te)[:, 1]
            infer_ms = (time.perf_counter() - t0) / len(X_te) * 1000
            thr, cost = best_threshold(y_te.to_numpy(), proba, a.fp_cost, a.fn_cost)
            pred = proba >= thr
            tp = int(np.sum(pred & (y_te == 1)))
            results[name] = {
                "roc_auc": round(roc_auc_score(y_te, proba), 4) if y_te.nunique() > 1 else None,
                "pr_auc": round(average_precision_score(y_te, proba), 4),
                "brier": round(brier_score_loss(y_te, proba), 4),
                "cost_optimal_threshold": round(thr, 2), "expected_cost_per_case": round(cost, 4),
                "precision_at_threshold": round(tp / max(1, int(pred.sum())), 4),
                "recall_at_threshold": round(tp / max(1, int(y_te.sum())), 4),
                "fit_seconds": round(fit_s, 2), "infer_ms_per_row": round(infer_ms, 4),
            }
        else:
            pred = pipe.predict(X_te)
            infer_ms = (time.perf_counter() - t0) / len(X_te) * 1000
            results[name] = {
                "mae": round(mean_absolute_error(y_te, pred), 4),
                "mape": round(mean_absolute_percentage_error(y_te, pred), 4) if (y_te != 0).all() else None,
                "fit_seconds": round(fit_s, 2), "infer_ms_per_row": round(infer_ms, 4),
            }

    # Trivial reference: always predict the majority class / the training mean.
    if task == "classification":
        prior = float(y_tr.mean())
        results["naive_prior"] = {"pr_auc": round(float(y_te.mean()), 4),
                                  "expected_cost_per_case": round(min(a.fn_cost * y_te.mean(), a.fp_cost * (1 - y_te.mean())), 4),
                                  "note": f"always-{'positive' if prior >= 0.5 else 'negative'} baseline; PR-AUC of random = positive rate"}
    else:
        results["naive_mean"] = {"mae": round(mean_absolute_error(y_te, np.full(len(y_te), y_tr.mean())), 4)}

    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    meta = {"task": task, "target": a.target, "rows": len(df), "train_rows": len(tr), "test_rows": len(te),
            "split": split_desc, "features": list(X_all.columns), "fp_cost": a.fp_cost, "fn_cost": a.fn_cost}
    (out / "metrics.json").write_text(json.dumps({"meta": meta, "results": results}, indent=2), encoding="utf-8")

    rows = "\n".join(f"| {m} | " + " | ".join(f"{k}={v}" for k, v in r.items()) + " |" for m, r in results.items())
    (out / "BASELINE.md").write_text(f"""# Baseline model card

- Task: **{task}** on `{a.target}` · rows {len(df)} (train {len(tr)}, test {len(te)})
- Split: {split_desc}
- Excluded columns: {', '.join(sorted(exclude)) or '—'}
- Error costs: FP={a.fp_cost}, FN={a.fn_cost} (threshold chosen to minimise expected cost)

| Model | Metrics |
|---|---|
{rows}

Notes: the linear model uses balanced class weights, which distorts probabilities (see Brier) — calibrate before
using scores as probabilities. Any advanced approach must beat the best row here on the objective metric,
under the same split, to be adopted.
""", encoding="utf-8")
    print(json.dumps(results, indent=2))
    print(f"-> {out / 'BASELINE.md'}")


if __name__ == "__main__":
    main()
