---
name: aimaker-evaluate
description: Define evaluation metrics and validation strategies that reflect real-world performance, not just benchmark accuracy — business/outcome KPIs, cost-weighted error metrics, calibration, robustness, slice/fairness analysis, latency and cost, LLM/RAG/agent evals, RL/simulation evals, offline→shadow→A/B validation ladder, go/no-go gates and production monitoring. Use when planning how to prove an AI system works.
---

# Evaluate what matters

## 1. Metric hierarchy (define all three levels)
1. **Outcome KPIs**: the real-world objective from PROBLEM_BRIEF (downtime, revenue, time saved, lives, yield, CO₂).
2. **Decision-quality metrics**: tied to how outputs are used (cost-weighted error, precision at the operating threshold, recall at fixed alert budget, calibration, ranking quality at k, forecast bias).
3. **Model/system health**: accuracy-type metrics per slice, latency p50/p95/p99, throughput, cost per prediction, availability, drift.
Plus **guardrails** that must not regress (safety, fairness gaps, operator workload, complaint rate). Pick from `references/metrics-catalog.md`.

## 2. Validation ladder (each rung has exit criteria)
| Rung | What | Exit criterion example |
|---|---|---|
| Offline (historical) | Reality-mirroring splits (time/group/site), backtests, locked test set | Beats baseline by ≥ X on decision metric, CI excludes 0 |
| Stress & robustness | Noise, missing inputs, shifted distributions, adversarial/prompt-injection tests, edge cases, simulated rare events | Degradation within tolerance; safe failure behaviour |
| Human review | Experts review a sample of outputs/explanations | ≥ Y % rated useful/correct |
| Shadow mode | Runs live alongside the current process, no action taken | Live metrics match offline within tolerance |
| Limited pilot / canary / A/B | Real decisions for a subset, with a control group | Outcome KPI improvement significant; guardrails hold |
| Production | Full rollout with monitoring & rollback | Ongoing SLOs met |

## 3. Statistical rigour
Confidence intervals (bootstrap), multiple seeds, significance tests for A/B, power analysis for pilot size, correction for multiple comparisons, pre-registered success criteria.

## 4. Special cases
- **LLM / RAG / agents**: golden sets built from real cases (incl. hard and adversarial ones), task success rate, groundedness/citation accuracy, hallucination rate, retrieval recall@k, tool-call correctness, cost/latency per task, safety/refusal behaviour, prompt-injection resistance. LLM-as-judge only after calibrating it against human labels. Re-run on every prompt/model change (`<kit>/skills/aimaker-architect/templates/eval_harness.py`).
- **Forecasting**: rolling-origin backtests, MASE/WAPE, bias, prediction-interval coverage, performance at the decision horizon.
- **RL / control / simulation-trained**: evaluate in held-out simulation scenarios, then with real data (off-policy evaluation), then in shadow/limited live; report constraint violations and worst-case, not just mean reward.
- **Computer vision**: per-condition slices (lighting, device, site), small-object performance, false alarms per hour/shift.
- **Digital twins**: twin-vs-reality error over time, calibration drift, value of what-if recommendations when executed.

## 5. Monitoring plan
Data drift, prediction drift, delayed-label performance, slice performance, latency, cost, business KPI, human override rate; alert thresholds and owners; retraining & rollback triggers.

Output `.aimaker/EVALUATION_PLAN.md`.
