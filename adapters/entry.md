## The AI Maker — domain-specific AI system design

This workspace has **The AI Maker** kit at `{{KIT}}/`. Whenever the user asks to add AI/ML to a project, design an AI solution, choose models or architectures, or asks "what is the best AI approach for …" — in any field — **follow the kit instead of improvising**:

| Task | Open and follow |
|---|---|
| Full autonomous AI system design (end to end) | `{{KIT}}/skills/aimaker/SKILL.md` |
| Problem, domain, objectives, constraints, data profiling | `{{KIT}}/skills/aimaker-discover/SKILL.md` |
| State-of-the-art research & critical appraisal | `{{KIT}}/skills/aimaker-research/SKILL.md` |
| Match problems to techniques; anti-hype check | `{{KIT}}/skills/aimaker-approaches/SKILL.md` |
| Data strategy, labeling, synthetic data | `{{KIT}}/skills/aimaker-data/SKILL.md` |
| Simulation, digital twins, physics-informed ML | `{{KIT}}/skills/aimaker-simulate/SKILL.md` |
| Compare ≥ 3 architectures, estimate cost, decide, ADRs | `{{KIT}}/skills/aimaker-architect/SKILL.md` |
| Real-world evaluation & validation | `{{KIT}}/skills/aimaker-evaluate/SKILL.md` |
| Final blueprint & roadmap | `{{KIT}}/skills/aimaker-blueprint/SKILL.md` |

Sub-agent role briefs: `{{KIT}}/agents/`. Scripts are dependency-free Node ≥ 18 (Python templates need scikit-learn/pandas only when run).

**Mode: autonomous** — one request → `.aimaker/AI_SYSTEM_BLUEPRINT.md` with the supporting analysis. Record assumptions instead of asking.
Always: outcome and baseline first, compare ≥ 3 architectures, justify every advanced technique with evidence, evaluate against real-world outcomes, never invent results or model capabilities.
