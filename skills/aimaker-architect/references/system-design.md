# AI system design checklist

## Components (name each, with owner and interface)
Data sources → ingestion → validation → feature/embedding computation → model(s) → post-processing (rules, calibration, constraints, optimiser) → decision/action interface → feedback capture → monitoring → retraining.

## Serving patterns
| Pattern | When | Notes |
|---|---|---|
| Batch scoring | predictions needed hourly/daily | cheapest; simple rollback |
| Online (request/response) | user-facing, ≤ seconds | autoscaling, caching, timeouts, fallbacks |
| Streaming | sensor/event streams, continuous detection | windowing, late data, exactly-once semantics |
| Edge / on-device | latency, privacy, connectivity, cost | quantisation, OTA model updates, on-device monitoring |
| Hybrid edge-cloud cascade | cheap local model, escalate hard cases | best cost/latency trade-off for many vision/NLP systems |

## Model strategy patterns
Pretrained API → prompt/RAG → fine-tune → distil into small model; ensembles & cascades; champion/challenger; per-segment models vs one global model; uncertainty-aware abstention to humans.

## MLOps / LLMOps
- Versioning: data, code, config, model, prompts (prompts are code)
- Experiment tracking, model registry, reproducible training pipelines
- CI for ML: data validation, unit tests for features, evaluation gates before promotion
- Deployment: shadow → canary → full; instant rollback; feature flags
- Monitoring: data drift, prediction drift, performance with delayed labels, latency, cost, errors; LLM: hallucination/grounding rate, refusal rate, safety filter hits, token usage
- Retraining triggers: schedule + drift + performance thresholds

## Security for AI systems
- Prompt injection (direct and via retrieved documents/tools): isolate instructions from data, restrict tool permissions, validate outputs, human approval for irreversible actions
- Data poisoning & label manipulation: data provenance, anomaly checks on training data
- Model/data exfiltration: access control, rate limiting, no secrets in prompts, output filtering for PII
- Adversarial inputs (vision/audio): robustness testing, input sanity checks
- Supply chain: pinned model versions/hashes, trusted sources, safetensors over pickle
- OT/IoT: network segmentation, signed model updates on edge devices

## Reliability & safety
Graceful degradation (fallback to rules/baseline when the model or an API fails), timeouts & circuit breakers, confidence thresholds, bounded actions, audit logs, incident playbook, kill switch.

## Responsible AI
Fairness metrics across relevant groups, explanations appropriate to users, documentation (model cards, datasheets), human oversight, regulatory classification (e.g. EU AI Act risk tiers; sector rules for health, finance, employment, critical infrastructure).

## Cost controls
Caching, batching, smaller models for easy cases, quantisation, autoscaling to zero, token budgets, spot instances for training, monitoring cost per prediction against value per prediction.
