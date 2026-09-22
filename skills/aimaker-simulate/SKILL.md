---
name: aimaker-simulate
description: Decide whether and how simulation, digital twins, synthetic environments, physics-informed ML, surrogate models and sim-to-real reinforcement learning improve an AI system's training, testing, prediction or safety — and design them with calibration and validation. Use for physical systems, operations, robotics, infrastructure, healthcare, logistics or any project where real-world experimentation is costly, slow or dangerous.
---

# Simulation, digital twins & scientific ML

## 1. Decide if it's worth it (write the answer in SIMULATION_PLAN.md)
Simulation adds value when at least one is true:
- Real-world experiments are **dangerous, expensive, slow or impossible** (failures, extreme conditions, safety-critical control)
- Critical events are **rare** in historical data
- A **decision/control policy** must be learned or tested before deployment (RL, scheduling, what-if planning)
- Reliable **domain physics/process knowledge** exists and data is scarce
- Real-time predictions need a **fast surrogate** of a slow solver
- Continuous **monitoring and what-if analysis** of a valuable instrumented asset justify a digital twin

If none apply, document "no simulation needed" and why. Don't build a twin for prestige.

## 2. Choose the form (`references/simulation-atlas.md`)
| Need | Form |
|---|---|
| Test/train policies for decisions over time | Discrete-event / agent-based / physics simulator as an RL or optimisation environment |
| Rare-event training data | Scenario generator with domain randomisation |
| Monitor + predict + what-if for a live asset | **Digital twin**: physics/ML model synchronised with sensor streams (state estimation, calibration) |
| Fast predictions of physical fields | Surrogate: neural operators, PINNs, reduced-order models |
| Robust ML under partial physics | Hybrid residual model (physics + ML correction) |
| Safety validation | Scenario-based testing in simulation + real-world shadow mode |

## 3. Fidelity & validation (never skip)
- **Calibrate** simulator parameters against real data (system identification, Bayesian calibration).
- **Validate**: compare simulated vs real distributions of key outputs; report error bands.
- **Sim-to-real gap mitigation**: domain randomisation, system identification, fine-tuning on real data, residual learning, conservative policies, staged rollout.
- **Digital-twin maturity**: descriptive (mirror) → diagnostic → predictive → prescriptive (recommends actions) → autonomous (acts). Plan the level you actually need.
- **Uncertainty**: propagate parameter uncertainty; make decisions robust to it.

## 4. Output `.aimaker/SIMULATION_PLAN.md`
Decision (use / don't use and why), form, tools, fidelity requirements, calibration data, validation metrics, sim-to-real strategy, compute cost, and how simulation results feed training/testing/decisions.
