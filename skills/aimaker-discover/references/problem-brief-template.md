# PROBLEM_BRIEF — <project>

## 1. Problem in one paragraph
What is going wrong in the real world, for whom, how often, at what cost.

## 2. Decision & workflow
| Item | Answer |
|---|---|
| Decision/action the AI supports | |
| Who acts on it | |
| Frequency / volume | |
| Current process & tools | |
| Where AI output appears (UI/API/alert/actuator) | |
| Human-in-the-loop? (approve / override / fully automatic) | |

## 3. Cost of errors
| Error type | Consequence | Estimated cost | Acceptable rate |
|---|---|---|---|
| False positive / over-prediction | | | |
| False negative / under-prediction | | | |
| Latency miss / downtime | | | |

## 4. Objectives (measurable)
| # | Objective | Metric | Baseline (today) | Target | Measured how | By when |
|---|---|---|---|---|---|---|
| O1 | | | | | | |

**Guardrails** (must not degrade): safety incidents, fairness gap across groups, cost per prediction, operator workload, latency p95, privacy incidents…

## 5. Users & stakeholders
Roles, expertise, trust, accessibility/language needs, affected non-users.

## 6. Environment & constraints
Inference location, hardware, connectivity, latency budget (p50/p95), throughput, availability SLO, budget (build/run), team skills, timeline, regulation & risk class, data residency, explainability needs.

## 7. Data inventory (from project-profile + interviews)
| Source | Modality | Volume | Labels? | Quality issues | Access/legal | Refresh rate |
|---|---|---|---|---|---|---|

## 8. Domain knowledge to exploit
Physics/equations, business rules, standards, expert heuristics, known causal relations, simulators that already exist.

## 9. Existing solutions & prior attempts
What exists (internal/external), results, why insufficient.

## 10. Assumptions & open questions
Each with how to verify it and the impact if wrong.
