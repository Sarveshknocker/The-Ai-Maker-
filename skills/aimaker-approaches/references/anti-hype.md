# Anti-hype check

Every advanced technique on the shortlist must pass these questions **in writing**. If it can't, drop it or move it to "future research".

1. **Objective link**: which measurable objective (from PROBLEM_BRIEF) does it improve, and by how much do we expect? What's the evidence (paper, benchmark, case study, pilot)?
2. **Simpler alternative**: what is the simplest approach that could reach the target (rules, GBDT, solver, off-the-shelf API)? Why is it insufficient? Show numbers or strong reasoning.
3. **Data reality**: do we have (or can we get, legally and affordably) the data it needs, at the needed quality and volume?
4. **Operational cost**: inference cost at production volume, latency vs budget, hardware, team skills to maintain it.
5. **Failure modes**: how does it fail (hallucination, reward hacking, sim-to-real gap, drift, adversarial inputs) and can we detect and contain failures?
6. **Explainability & compliance**: can we explain decisions to the people who must trust or audit them?
7. **Reversibility**: if it disappoints, how easily can we fall back to the baseline?

## Common hype traps
| Trap | Reality check |
|---|---|
| "Use an LLM for everything" | Structured prediction on tabular data → GBDT usually wins on accuracy, cost and latency |
| "Let's build an autonomous agent" | Most business processes are better as a workflow with a few LLM steps and human approvals |
| "We need a digital twin" | Only if an instrumented, valuable asset + frequent decisions justify continuous synchronisation; otherwise a simulation study or a surrogate model is enough |
| "Reinforcement learning will optimise it" | Without a trustworthy simulator or safe exploration, use optimisation/MPC/bandits |
| "Train our own foundation model" | Almost never: fine-tune or prompt an existing one, or distil |
| "Deep learning on 500 rows" | Use regularised simple models, priors, transfer learning or collect more data |
| "Real-time online learning" | Periodic retraining with drift monitoring covers most needs with far less risk |
| "99 % accuracy" | With 1 % positives that's a model predicting "no" every time; use cost-weighted metrics |
