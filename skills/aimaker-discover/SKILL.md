---
name: aimaker-discover
description: Deep problem analysis for an AI project — real-world problem, domain, stakeholders and users, measurable objectives and KPIs, constraints (latency, cost, privacy, regulation, hardware), available data (with automatic profiling of datasets and existing ML code), environment and deployment context, and expected outcomes. First step of any AI system design.
---

# Discover: understand before modelling

## 1. Profile the project (if there is a codebase or data folder)
```bash
node <kit>/skills/aimaker-discover/scripts/profile.mjs . --out .aimaker
```
Inventories data assets (tabular, image, audio, video, text, geo, point clouds, time series, DBs), existing models/notebooks, the AI/ML stack in use, and compute hints. It also profiles CSV/TSV tables: types, missingness, cardinality, outliers, candidate targets, class imbalance, time columns, duplicates, leakage hints. Read `.aimaker/project-profile.md`, then open the real files it points to.

No data in the project? That's a finding: data acquisition becomes part of the plan (see `aimaker-data`).

## 2. Interrogate the problem (answer each in writing)
- **Decision supported**: what decision or action will the AI output drive, who takes it, how often, and what happens today?
- **Value of being right / cost of being wrong**: cost of a false positive vs a false negative (or over- vs under-prediction), in money, time, safety or trust. This drives metric choice.
- **Users & stakeholders**: operators, end-users, affected people, approvers; their expertise and trust level; how they'll interact (dashboard, alert, API, chat, robot action).
- **Environment**: where inference runs (cloud, on-prem, factory floor, vehicle, phone, microcontroller), connectivity, latency budget, throughput, uptime needs.
- **Data reality**: what exists, who owns it, labels (quality, cost, delay), volume, velocity, drift, privacy class, legal basis for use.
- **Constraints**: budget (build + run), team skills, timeline, hardware, regulation (sector rules, EU AI Act risk tier, data residency), explainability requirements.
- **Domain knowledge**: physics, rules, standards, expert heuristics, causal structure. Hybrid approaches can use this to beat pure data-driven ones.
- **Existing solutions**: current process, incumbent tools, previous attempts and why they failed.

## 3. Define measurable objectives
Use `references/problem-brief-template.md`. Each objective needs a **metric, current baseline, target, measurement method and time horizon**, e.g. "reduce unplanned downtime from 6 % to 3 % of hours within 6 months, measured from maintenance logs". Include guardrail metrics (what must not get worse: safety incidents, fairness gaps, cost per prediction, operator workload).

## 4. Output
`.aimaker/PROBLEM_BRIEF.md` (template), citing file paths for facts and marking assumptions.
