---
name: aimaker-architect
description: Explore at least three end-to-end AI system architectures, score them with a weighted multi-criteria decision engine (with hard constraints and Monte-Carlo robustness), estimate compute/memory/latency/cost, design the full system (components, data pipeline, model strategy, serving, MLOps/LLMOps, security, reliability), and record every major choice in ADRs. Use when designing or comparing AI architectures.
---

# Architect: explore, compare, decide, justify

## 1. Design ≥ 3 genuinely different candidates
Typical spread (adapt to the problem):
- **A. Pragmatic baseline+**: strong classical/statistical models, engineered domain features, rules, solver.
- **B. Deep/foundation-model**: pretrained models fine-tuned or prompted, learned representations.
- **C. Hybrid/advanced**: physics/rules/optimisation + ML, simulation/digital-twin-trained, RL, agentic workflow, or edge-cascade, whichever the shortlist justified.
For each, write in `.aimaker/ARCHITECTURE_OPTIONS.md`: diagram (Mermaid), components, data flow, model strategy (pretrained / fine-tune / train), training approach, inference path, latency & cost estimate, data needs, risks, and evidence.

## 2. Estimate (don't guess)
```bash
node <kit>/skills/aimaker-architect/scripts/estimate.mjs train      --params 1e9 --tokens 2e10 --gpu-tflops <from datasheet> --mfu 0.4 --gpus 8 --gpu-hour-price <current>
node <kit>/skills/aimaker-architect/scripts/estimate.mjs finetune   --params 8e9 --method qlora
node <kit>/skills/aimaker-architect/scripts/estimate.mjs inference  --params 8e9 --bits 4 --layers 32 --kv-heads 8 --head-dim 128 --context 8192
node <kit>/skills/aimaker-architect/scripts/estimate.mjs api        --requests-per-day 5000 --in-tokens 1200 --out-tokens 300 --in-price <USD/1M> --out-price <USD/1M>
node <kit>/skills/aimaker-architect/scripts/estimate.mjs throughput --tokens-per-second 60 --out-tokens 300 --concurrency 16
```
Prices are never hard-coded. Look up current prices and cite them. For classical models, estimate from benchmarks or a quick timing run on sample data.

## 3. Decide
Score each candidate 1–5 on: `objectiveFit, dataFit, performance, robustness, latency, cost, explainability, maintainability, timeToValue, risk` (5 = best; cost 5 = cheapest; risk 5 = lowest). Justify every score in ARCHITECTURE_OPTIONS.md. Choose the weight profile that matches the brief (`balanced`, `safety-critical`, `realtime-edge`, `regulated`, `startup-mvp`, `frontier-performance`) and set hard constraints from non-negotiable requirements.
```bash
node <kit>/skills/aimaker-architect/scripts/decide.mjs .aimaker/candidates.json
```
→ `.aimaker/DECISION.md` with ranking, win probability under ±30 % weight changes, and where the runner-up is stronger. **Close call → run a bake-off experiment** on real data before committing; strong runner-up traits → consider a hybrid.

## 4. System design (`references/system-design.md`)
Detail the selected architecture: components, interfaces, data pipeline, training pipeline, evaluation harness, serving topology (batch / online / streaming / edge / hybrid), fallbacks, human-in-the-loop, monitoring, MLOps/LLMOps, security (incl. AI-specific threats), reliability, scalability and cost controls.

## 5. ADRs
For each major choice (model family, build-vs-buy, simulation/twin, RL, LLM/agent, edge vs cloud, vector store…), write `.aimaker/DECISIONS/ADR-00N-<slug>.md` using `references/adr-template.md`.

## Templates
- `templates/baseline_tabular.py`: leakage-safe baseline with time/group-aware splits, GBDT vs linear comparison and cost-weighted threshold selection.
- `templates/eval_harness.py`: golden-set evaluation harness for LLM/extraction/classification systems (exact match, F1, schema validity, latency, cost, per-slice results).
