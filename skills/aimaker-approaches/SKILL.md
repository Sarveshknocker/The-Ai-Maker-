---
name: aimaker-approaches
description: Map a problem to the right AI techniques — classical ML, deep learning, foundation models/GenAI/LLMs, RAG, agents, computer vision, NLP, speech, multimodal, time-series, recommender, anomaly detection, reinforcement learning, optimisation, simulation, digital twins, physics-informed ML, causal inference, hybrid/neuro-symbolic, edge and real-time learning — with fit/no-fit criteria and an anti-hype check. Use when choosing what kind of AI (if any) a project needs.
---

# Choose approaches (evidence over fashion)

1. **Archetype mapping**: identify every sub-problem's archetype in `references/archetypes.md` (a system usually combines 2–4: e.g. perception + forecasting + optimisation + human interface).
2. **Shortlist**: for each archetype, pull candidate techniques from `references/technique-atlas.md`. For each: *fits because / doesn't fit because*, data needs, compute, latency, explainability, maturity, evidence from SOTA_REVIEW.
3. **Anti-hype check** (`references/anti-hype.md`): every advanced technique on the shortlist must answer the "why not simpler?" questions. Remove any that can't.
4. **Creative levers**: add the atlas's creative levers that plausibly improve accuracy, robustness or efficiency *for this domain*, each with a testable hypothesis.
5. **Build vs buy vs reuse**: for each component, decide between a managed API, an open pretrained model (fine-tuned or not), or a model trained from scratch. Check licenses, data-residency rules and cost.

Output `.aimaker/APPROACH_SHORTLIST.md`: archetypes → shortlisted techniques (with reasons), rejected techniques (with reasons), creative levers (hypothesis + metric), build/buy/reuse decisions.
