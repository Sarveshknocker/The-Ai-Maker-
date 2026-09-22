# Technique atlas: when each approach genuinely helps

Format: **Use when** · **Avoid when** · **Needs** · **Watch-outs**. Verify current best models/tools in SOTA research; names here are families, not endorsements.

## Classical & statistical ML
- **Linear/logistic, GLMs**: *Use when* few samples, need calibrated, explainable baselines · *Avoid when* strong non-linear interactions dominate · *Needs* feature engineering · *Watch* multicollinearity, scaling.
- **Gradient-boosted trees (GBDT)**: *Use when* tabular data (usually the strongest default), mixed types, missing values · *Avoid when* raw images/audio/text are the main signal · *Needs* thousands+ rows · *Watch* leakage via features, extrapolation outside training range.
- **Survival analysis**: time-to-event with censoring (churn timing, failures, clinical outcomes).
- **Bayesian models / Gaussian processes**: small data, uncertainty matters, expert priors; GPs scale poorly beyond ~10⁴ points without approximations.

## Deep learning
- **CNNs / Vision Transformers**: images, video, spectrograms. Fine-tune pretrained; from-scratch rarely justified.
- **Sequence models (TCN, RNN/LSTM, Transformers, state-space models)**: long sequences, sensor streams, event logs; compare against GBDT-with-lags first.
- **Graph neural networks**: data is naturally a graph (molecules, supply networks, power grids, fraud rings); needs graph structure worth exploiting.
- **Autoencoders / representation learning**: anomaly detection, compression, pretraining on unlabelled data.
- **Self-supervised pretraining**: lots of unlabelled domain data, few labels.

## Foundation models & Generative AI
- **LLMs (prompting)**: open-ended language tasks, low label availability, fast iteration · *Avoid when* strict latency/cost at high volume, deterministic numeric logic, or offline tiny devices · *Watch* hallucination, prompt injection, data governance, version drift → pin versions and build evals.
- **RAG (retrieval-augmented generation)**: answers must be grounded in private/current documents; invest in chunking, hybrid retrieval, reranking, citations, and retrieval evals.
- **Fine-tuning (LoRA/QLoRA, full)**: consistent format/style/domain vocabulary, cost reduction by moving to a smaller model, or behaviour prompting can't reach; requires quality examples (hundreds–thousands) and evals.
- **Distillation**: an LLM labels/solves at small scale → train a small, cheap, fast model for production volume.
- **Structured outputs & tool use**: whenever outputs feed software, use schemas/function calling and validate.
- **Agentic AI**: multi-step tasks with branching and tool use · *Prefer* explicit workflows (deterministic graph with LLM steps) over free-roaming agents; bounded permissions, human approval for irreversible actions, budget/step limits, full tracing · *Avoid* when a fixed pipeline works.
- **Diffusion / flow models**: image/audio/3D/video generation, also synthetic data and inverse design.
- **Vision-language / multimodal models**: documents, screenshots, visual QA, zero-shot perception; check latency and accuracy on *your* images.
- **Time-series & tabular foundation models**: zero-shot baselines and small-data regimes; benchmark against tuned GBDT/statistical models.

## Decision-making
- **Mathematical optimisation (LP/MILP/CP-SAT, VRP solvers)**: scheduling, routing, allocation with hard constraints. Often the highest-ROI "AI" in operations; combine with ML forecasts (predict-then-optimise).
- **Model predictive control**: control of physical systems with a model and constraints; mature and explainable.
- **Reinforcement learning**: sequential decisions where actions affect future states and a simulator or safe exploration exists. *Offline RL* for learning from logs; *contextual bandits* for single-step choices with exploration (pricing, recommendations) · *Avoid when* no simulator, no safe exploration, sparse rewards and small data, or a solver/MPC already works · *Watch* reward hacking, sim-to-real gap, safety constraints.
- **Causal inference**: estimate effects of interventions; required whenever the model will be used to *decide* rather than only predict.

## Simulation & scientific ML (see aimaker-simulate)
- **Digital twins**: a continuously synchronised virtual model of a real asset/process for monitoring, what-if, optimisation and control; worth it when the asset is valuable, instrumented and decisions are frequent.
- **Simulation for training/testing**: generate rare/dangerous scenarios, train RL, stress-test models.
- **Physics-informed ML (PINNs, neural operators, hybrid residual models)**: physics partly known, data scarce, need physically consistent predictions or fast surrogates.
- **Synthetic data**: rare classes, privacy constraints, cold start. Always validate with train-on-synthetic, test-on-real.

## Deployment-oriented
- **Edge AI**: latency, privacy, connectivity or cost demand on-device inference → quantisation, pruning, distillation, efficient architectures, hardware-specific runtimes.
- **Online / continual learning**: fast-drifting environments with rapid label feedback; guard against catastrophic forgetting and feedback loops; often periodic retraining is enough.
- **Federated learning**: data can't leave devices/sites (health, finance, phones); adds complexity; consider only when centralisation is truly impossible.
- **Active learning**: labeling is expensive; the model picks the most informative samples for humans to label.

## Hybrid & neuro-symbolic
Combine learned models with rules, knowledge graphs, physics, optimisers or human review. Often the most robust real-world design: ML where patterns are fuzzy, rules/solvers where guarantees matter.

## Creative levers (add when they serve the objective)
| Lever | Improves | Example |
|---|---|---|
| Physics/domain features | accuracy, data efficiency | spectral features from vibration; degree-days for crops |
| Hybrid residual modelling | robustness, extrapolation | ML learns the error of a physics model |
| Predict-then-optimise | business outcome | demand forecast feeds an inventory optimiser |
| Uncertainty estimation (conformal prediction, ensembles) | safe decisions | abstain & route to humans when unsure |
| Human-in-the-loop + active learning | label efficiency, trust | experts review low-confidence cases, which become training data |
| Cascades (cheap model first, expensive model on hard cases) | cost, latency | small classifier → LLM only for ambiguous tickets |
| Distillation from a large model | cost, latency, edge | LLM-labelled data trains an on-device model |
| Synthetic + domain randomisation | rare events, robustness | simulated defects, weather, lighting |
| Test-time adaptation / per-site calibration | drift across sites | recalibrate thresholds per factory line |
| Multi-task / shared representations | data efficiency | one encoder for several related predictions |
| Retrieval of similar past cases | explainability, accuracy | "similar incidents & how they were resolved" |
| Digital twin what-if | planning, safety | test a schedule in the twin before applying |
