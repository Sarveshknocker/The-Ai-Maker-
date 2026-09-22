# Reading AI research critically

## Questions for every paper, model or benchmark claim
1. **Setting match**: same task, modality, data distribution, label definition and constraints (latency, hardware) as ours?
2. **Baselines**: compared against strong, tuned baselines (including simple ones like GBDT or linear) or against weak/outdated ones?
3. **Evaluation**: proper splits (time-based for temporal data, group-aware for entities/patients/machines), no test-set tuning, multiple seeds, confidence intervals?
4. **Leakage & contamination**: could the test data be in the pretraining data (common for LLM benchmarks)? Any target leakage?
5. **Scale & cost**: data volume, compute and inference latency required. Is it reproducible at our budget?
6. **Artifacts**: code, weights, data available? License compatible with our use (commercial? copyleft? model-use restrictions)?
7. **Robustness**: tested under distribution shift, noise, missing sensors, adversarial or out-of-distribution inputs?
8. **Independent confirmation**: replicated by others, used in production, or only in the original paper?
9. **Recency vs maturity**: newest ≠ best for production. Prefer techniques with maintained tooling unless the gain is large and measured.

## Maturity scale (use in SOTA_REVIEW)
| Level | Meaning |
|---|---|
| M1 Research | Single paper, no maintained code |
| M2 Emerging | Code available, a few replications, small community |
| M3 Established | Widely replicated, maintained libraries, used in industry |
| M4 Commodity | Managed services / standard components |

## Benchmark vs reality gap: typical causes
Distribution shift (new sites, seasons, devices), label noise, class imbalance, latency limits, missing inputs, human workflow friction, feedback loops (model changes the data), adversarial users, cost at scale.
