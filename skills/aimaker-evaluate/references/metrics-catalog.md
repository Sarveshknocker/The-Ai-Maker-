# Metrics catalogue

| Task | Prefer | Avoid relying on alone | Notes |
|---|---|---|---|
| Imbalanced classification (fraud, faults, disease) | PR-AUC, recall at fixed precision, cost-weighted error, alerts per day | Accuracy, ROC-AUC alone | Choose threshold by cost, not 0.5 |
| Risk scoring / probabilities | Brier score, calibration curve/ECE, log-loss | Accuracy | Decisions consume probabilities → calibrate |
| Regression | MAE (robust), RMSE (penalises big errors), MAPE/WAPE (scale-free), quantile/pinball loss | R² alone | Report error in business units |
| Forecasting | MASE, WAPE, bias, interval coverage, error at decision horizon | Single split accuracy | Rolling-origin backtests |
| Ranking / recommendation | NDCG@k, recall@k, MAP, coverage, diversity, online CTR/conversion | Offline-only accuracy | Position bias; online tests decide |
| Detection (CV) | mAP@IoU, recall on small objects, false alarms per hour | mAP alone | Slice by condition |
| Segmentation | IoU/Dice per class, boundary F-score | Pixel accuracy | Class imbalance |
| Anomaly detection | Precision@k alerts, time-to-detect, false alarms per asset-day, event-level recall | Point-wise F1 | Evaluate on labelled incidents |
| NLP extraction | Field-level precision/recall/F1, exact match, schema validity | BLEU | Per document type/language |
| Text generation / summarisation | Task success with rubric, factual consistency/groundedness, human preference, edit distance to accepted output | BLEU/ROUGE alone | Calibrate LLM judges against humans |
| RAG | Retrieval recall@k, answer correctness, citation precision, "I don't know" rate on unanswerable | Answer fluency | Include unanswerable questions |
| Agents | Task completion rate, steps/cost per task, tool error rate, unsafe action rate, human intervention rate | Single demo success | Test on varied, messy tasks |
| RL / control | Return with confidence bands, constraint violations, worst-case performance, sim-to-real gap | Mean training reward | Held-out scenarios |
| Optimisation | Objective value vs baseline, feasibility rate, solve time, robustness to input error | — | Predict-then-optimise: evaluate end decision cost |
| Causal / uplift | Qini/uplift curves, policy value, A/B-measured effect | Predictive accuracy | Needs experiments or strong identification |
| Speech | WER per accent/noise level, latency | Overall WER | Slice by speaker group |

## Always add
- **Slices**: segment, site, device, language, demographic (where lawful), time period, rare conditions
- **Fairness gaps** where decisions affect people (differences in error rates across groups)
- **Latency p95/p99** and **cost per prediction** vs value per prediction
- **Uncertainty**: confidence intervals, coverage of prediction intervals
- **Human factors**: override rate, time to decision, user trust/usability scores
