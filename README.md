# The AI Maker

**Give it a project (a description, a codebase, or a dataset). It analyses the real problem, researches the current state of the art, compares several genuinely different AI architectures, and engineers the most effective domain-specific AI system, with a justified design, real-world evaluation plan and implementation roadmap.**

The goal isn't "add a model". It's reliable, measurable real-world results. Evidence, experimentation and practicality beat fashionable techniques. When a spreadsheet rule, a gradient-boosted tree or an optimisation solver is the right answer, The AI Maker says so.

Works with **Claude Code, OpenAI Codex, Cursor, GitHub Copilot, Gemini CLI, Windsurf, Cline/Roo, Aider, Jules, Amp, Zed**, and chat-only AIs. Any field: manufacturing, health, agriculture, finance, logistics, energy, retail, education, robotics, science, media…

```
project ─► 1 Understand ─► 2 Research ─► 3 Approaches ─► 4 Architectures ─► 5 Data & cost ─► 6 Simulation? ─► 7-8 Improve & justify ─► 9 Evaluate ─► 10 Blueprint
           objectives,     papers, HF,    archetypes,     ≥3 candidates,     labeling,        digital twin,     creative levers,       real-world      architecture,
           constraints,    GitHub,        technique       decision engine    synthetic data,  sim-to-real,      ADRs for every         metrics,        pipeline,
           data profile    benchmarks     atlas, anti-    + Monte-Carlo      compute & API    PINNs — only      major choice           validation      roadmap with
                                          hype check      robustness         cost estimates   if justified                             ladder, gates   exit criteria
```

## Your 10 requirements → where they live
| # | Requirement | Implemented by |
|---|---|---|
| 1 | Understand the real-world problem, measurable objectives | `aimaker-discover`: project & data profiler, problem brief with metric/baseline/target, cost of errors |
| 2 | Existing solutions, research, SOTA | `aimaker-research`: collector over arXiv, Hugging Face papers/models/datasets, OpenAlex, GitHub, HN + web search; critical-appraisal guide |
| 3 | Most suitable AI/ML/DL approaches for the domain | `aimaker-approaches`: 20 problem archetypes, technique atlas (classical → GenAI → RL → optimisation → scientific ML), anti-hype check |
| 4 | Explore multiple architectures before selecting | `aimaker-architect`: ≥ 3 candidates, weighted decision engine with 6 priority profiles, hard constraints, Monte-Carlo robustness |
| 5 | Data, training, compute, scalability, latency, cost, security, reliability, deployment | `aimaker-data` + estimator (training FLOPs/GPU-hours, fine-tune & inference memory, API cost, throughput) + system-design checklist |
| 6 | Simulation, digital twins, synthetic environments where they help | `aimaker-simulate`: decision gate, simulation/scientific-ML atlas, calibration & sim-to-real, twin maturity levels |
| 7 | Creative, technically sound improvements | Creative levers (hybrid residuals, predict-then-optimise, cascades, distillation, conformal abstention, active learning…) |
| 8 | Explain why each technology is chosen | ADR per major decision, linked to objectives, evidence and the decision matrix |
| 9 | Real-world metrics & validation | `aimaker-evaluate`: metric hierarchy, catalogue per task, validation ladder (offline → stress → shadow → A/B → production), LLM/RL/twin evals |
| 10 | Practical implementation roadmap | `aimaker-blueprint`: architecture, components, data pipeline, model strategy, training/testing, deployment, costs, phased roadmap with exit criteria |

## Use it

**Option A: open this repo directly** in your AI tool and describe your project:
> Design the best AI system for detecting early crop disease from drone images for smallholder farms in Karnataka. Budget is small; connectivity is poor.

**Option B: install into your project** so the AI can profile your code and data:
```bash
npx github:Sarveshknocker/The-Ai-Maker- init path/to/your-project
```
Then say: *"Use The AI Maker to design the most effective AI system for this project."* `init` adds instruction files for every AI tool without touching your existing text. Use `update` to refresh and `remove` to uninstall; your `.aimaker/` outputs are kept.

**Option C: Claude Code plugin**: `/plugin marketplace add Sarveshknocker/The-Ai-Maker-` then `/plugin install the-ai-maker@the-ai-maker`.

It runs **autonomously** and writes everything to `.aimaker/`:

| File | Contents |
|---|---|
| `project-profile.md` | Data assets, table profiles (types, missingness, targets, imbalance, leakage hints), existing models, ML stack, GPU hints |
| `PROBLEM_BRIEF.md` | Decision supported, cost of errors, measurable objectives & guardrails, constraints |
| `research/*.md`, `SOTA_REVIEW.md` | Graded research landscape, reusable models/datasets (licenses), build-vs-buy |
| `APPROACH_SHORTLIST.md` | Techniques in/out with reasons, creative levers with hypotheses |
| `ARCHITECTURE_OPTIONS.md`, `DECISION.md` | ≥ 3 architectures, estimates, scored comparison, robustness |
| `DECISIONS/ADR-*.md` | Why each major technology was chosen |
| `DATA_STRATEGY.md`, `SIMULATION_PLAN.md`, `EVALUATION_PLAN.md` | Supporting plans |
| **`AI_SYSTEM_BLUEPRINT.md`** | The deliverable: architecture, pipeline, model strategy, deployment, costs, roadmap |

More prompts: [prompts/README.md](prompts/README.md).

## CLI (usable without an AI too)
```bash
node bin/aimaker.mjs profile  path/to/project                          # project & data profile
node bin/aimaker.mjs research "vibration anomaly detection" --limit 8  # SOTA collector
node bin/aimaker.mjs decide   .aimaker/candidates.json                 # architecture decision + robustness
node bin/aimaker.mjs estimate train --params 1e9 --tokens 2e10 --gpu-tflops 989 --gpus 8 --gpu-hour-price 3
node bin/aimaker.mjs estimate api --requests-per-day 5000 --in-tokens 1200 --out-tokens 300 --in-price 3 --out-price 15
```
The estimator never hard-codes vendor prices; you pass current, verified ones.

Python templates (need `scikit-learn` and `pandas` only when you run them):
- `baseline_tabular.py`: a leakage-safe baseline with time- or group-aware splits, GBDT vs linear, and a cost-optimal threshold.
- `eval_harness.py`: golden-set evaluation for LLM, extraction and classification systems. It reports per-slice metrics, latency and cost, and fails CI when a threshold ("gate") isn't met.

## What's inside
```
skills/
  aimaker/            orchestrator: autonomous 10-step workflow, non-negotiables
  aimaker-discover/   problem analysis + project/data profiler (scripts/profile.mjs)
  aimaker-research/   SOTA collector (scripts/sota.mjs) + critical appraisal guide
  aimaker-approaches/ 20 archetypes, technique atlas, anti-hype check, creative levers
  aimaker-data/       data strategy, labeling, splits, synthetic data validation
  aimaker-simulate/   simulation, digital twins, physics-informed ML, sim-to-real
  aimaker-architect/  decision engine, estimator, system design, ADRs, Python templates
  aimaker-evaluate/   metric hierarchy, metrics catalogue, validation ladder, monitoring
  aimaker-blueprint/  final blueprint + roadmap template
agents/               problem-analyst, research-scout, solution-architect, evaluation-lead
bin/aimaker.mjs       installer + CLI
tests/run.mjs         offline tests (mocked network), optional live + Python template tests
```

## Limitations
- **Its output is a proposal, not a proven system.** Its value is making the proposal evidence-based and testable. The roadmap starts with a baseline and a bake-off precisely so that real data, not opinion, makes the final call.
- **Research depends on sources and the AI's web access.** Model versions, prices and capabilities change quickly, so the kit makes the AI verify them rather than rely on memory.
- **Decision-matrix scores are judgements.** The engine makes them explicit, weighted and stress-tested, and every score has to be justified in writing.
- **Estimates are order-of-magnitude.** Confirm them with a short dry run.

## Related kits
[Idea Enhancer](https://github.com/Sarveshknocker/-Idea-Enhancer-and-Value-Maximiser) (concept & business model) · [3D-animated-web-developer](https://github.com/Sarveshknocker/3D-animated-web-developer) (premium front-end) · [The-protectors-](https://github.com/Sarveshknocker/The-protectors-) (security hardening).

## Develop
```bash
npm test                                   # offline
npm run test:live                          # + real research APIs
AIMAKER_PYTHON=/path/to/python npm test    # + Python templates (needs scikit-learn, pandas)
```
License: MIT.
