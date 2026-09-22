---
name: aimaker-blueprint
description: Assemble the final AI System Blueprint and implementation roadmap — problem & objectives, SOTA summary, compared architectures and the justified decision, system architecture diagram, components, data pipeline, model strategy, training/testing process, simulation plan, evaluation plan, deployment approach, security/responsible AI, costs, phased roadmap with exit criteria, risks and future improvements. Use as the final step of AI system design.
---

# AI System Blueprint

1. Fill `references/blueprint-template.md` → `.aimaker/AI_SYSTEM_BLUEPRINT.md`. It **links** to the detailed documents (PROBLEM_BRIEF, SOTA_REVIEW, APPROACH_SHORTLIST, ARCHITECTURE_OPTIONS, DECISION, DECISIONS/ADR-*, DATA_STRATEGY, SIMULATION_PLAN, EVALUATION_PLAN) rather than duplicating them.
2. Quality bar before delivering:
   - [ ] Objectives are measurable with baselines and targets
   - [ ] ≥ 3 architectures compared; decision score and robustness reported; simpler alternatives addressed
   - [ ] Every major technology has a "why" linked to an objective and evidence (ADR)
   - [ ] Advanced techniques (simulation, twins, RL, agents, PINNs, edge…) are used only where justified, and the justification is written down
   - [ ] Data plan covers acquisition, quality, labeling, splits, privacy, drift
   - [ ] Evaluation measures real-world outcomes, with a validation ladder and go/no-go gates
   - [ ] Compute, latency and cost estimated with stated assumptions and current prices
   - [ ] Security (incl. AI-specific threats), reliability, fallbacks and responsible-AI covered
   - [ ] Roadmap phases have exit criteria; the first 2-week experiment is concrete
   - [ ] Sources listed; assumptions labelled
3. Summarise to the user in ≤ 15 lines.
