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

## What's new in 0.2
| Capability | Why it matters |
|---|---|
| **Live model catalog** (`models`) | Prices, context windows and capabilities for thousands of hosted models, fetched from the community-maintained LiteLLM list and cached for a day. Compares the monthly cost of several models for your workload (with prompt caching and batch pricing). No more prices remembered from training data. |
| **~950 real case studies** (`research` source `cases`) | How Stripe, Uber, Netflix, Airbnb, Pinterest and others actually built similar systems: the closest ones are read before designing. |
| **Evaluation harness with statistics** | Per-case assertions, retrieval recall@k / MRR / nDCG, bootstrap intervals, repeat-run consistency, a paired comparison against the current system with a significance test, and an LLM judge that is trusted only after it agrees with human labels. |
| **Sample-size planning** (`estimate sample`) | How many golden-set cases you need for a given precision, and how long an A/B test must run. |
| **Defensive red-team set** (`redteam`) | Prompt injection (direct and hidden in documents), system-prompt leakage via a canary, data disclosure, unsafe output, excessive agency and unbounded consumption tests for the LLM feature you are building (OWASP Top 10 for LLM Applications). |
| **System card** in the blueprint | Intended use, data, per-slice results, red-team results, oversight and regulatory class on one page. |

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
node bin/aimaker.mjs estimate sample --type ab --p0 0.10 --mde 0.02 --traffic-per-day 4000   # A/B size + duration
node bin/aimaker.mjs models   find "claude" --tools --min-context 200000                   # live prices & limits
node bin/aimaker.mjs models   cost --models <id1>,<id2> --requests-per-day 5000 --in-tokens 1200 --out-tokens 300 --cache-hit 0.5
node bin/aimaker.mjs redteam  --app "support bot for invoices" --tools refund --pii jane@example.com
```
No vendor prices are hard-coded: `models` reads a maintained catalog (dated in every output) and the blueprint confirms the chosen model on the vendor's page.

Python templates (need `scikit-learn` and `pandas` only when you run them):
- `baseline_tabular.py`: a leakage-safe baseline with time- or group-aware splits, GBDT vs linear, and a cost-optimal threshold.
- `eval_harness.py` (standard library only): golden-set evaluation for LLM, RAG, agent, extraction and classification systems: assertions, retrieval metrics, per-slice results, latency and cost, bootstrap intervals, `--baseline` significance test, `--judge` with human-label calibration, `--repeats` consistency. It fails CI when a threshold ("gate") is not met.

## What's inside
```
skills/
  aimaker/            orchestrator: autonomous 10-step workflow, non-negotiables
  aimaker-discover/   problem analysis + project/data profiler (scripts/profile.mjs)
  aimaker-research/   SOTA collector incl. ~950 production case studies (scripts/sota.mjs) + appraisal guide
  aimaker-approaches/ 20 archetypes, technique atlas, anti-hype check, creative levers
  aimaker-data/       data strategy, labeling, splits, synthetic data validation
  aimaker-simulate/   simulation, digital twins, physics-informed ML, sim-to-real
  aimaker-architect/  decision engine, estimator + sample sizes, live model catalog (scripts/models.mjs),
                      serving patterns, ADRs, Python templates (baseline, eval harness)
  aimaker-evaluate/   metric hierarchy, validation ladder, monitoring, defensive red-team set (scripts/redteam.mjs)
  aimaker-blueprint/  final blueprint + roadmap template
agents/               problem-analyst, research-scout, solution-architect, evaluation-lead
bin/aimaker.mjs       installer + CLI
evals/                with-kit vs baseline cases judged blind by a domain expert
research/BENCHMARK.md what we learned from leading open-source projects
tests/run.mjs         offline tests (mocked network), optional live + Python template tests
```

## Limitations
- **Its output is a proposal, not a proven system.** Its value is making the proposal evidence-based and testable. The roadmap starts with a baseline and a bake-off precisely so that real data, not opinion, makes the final call.
- **Research depends on sources and the AI's web access.** Model versions, prices and capabilities change quickly, so the kit makes the AI verify them rather than rely on memory.
- **Decision-matrix scores are judgements.** The engine makes them explicit, weighted and stress-tested, and every score has to be justified in writing.
- **Estimates are order-of-magnitude.** Confirm them with a short dry run.
- **Model prices come from a community catalog.** It is usually current, but can lag a price change; outputs show the catalog date, and the chosen model is confirmed on the vendor's page.

## Related kits
[Idea Enhancer](https://github.com/Sarveshknocker/-Idea-Enhancer-and-Value-Maximiser) (concept & business model) · [3D-animated-web-developer](https://github.com/Sarveshknocker/3D-animated-web-developer) (premium front-end) · [The-protectors-](https://github.com/Sarveshknocker/The-protectors-) (security hardening) · [The-Hardware-engineering](https://github.com/Sarveshknocker/The-Hardware-engineering) · [The-Reconstructor](https://github.com/Sarveshknocker/The-Reconstructor).

## Credits
Ideas adapted (re-implemented, not copied) from leading open-source projects are listed in [CREDITS.md](CREDITS.md); the comparison is in [research/BENCHMARK.md](research/BENCHMARK.md).

## Develop
```bash
npm test                                   # offline
npm run test:live                          # + real research APIs
AIMAKER_PYTHON=/path/to/python npm test    # + baseline template (needs scikit-learn, pandas); the eval harness runs with any Python 3
```
License: MIT.
