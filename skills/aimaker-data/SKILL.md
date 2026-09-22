---
name: aimaker-data
description: Data strategy for an AI system — data requirements per candidate approach, quality audit, labeling strategy, splits that mirror reality, augmentation and synthetic data (with validation), privacy/governance, data pipeline and drift monitoring. Use when planning what data an AI project needs and how to get, clean, label, version and monitor it.
---

# Data strategy

Data usually decides the outcome more than model choice. Plan it as carefully as the architecture.

## 1. Requirements per candidate approach
For each shortlisted approach: input features/modalities, label type and volume needed (order of magnitude), freshness, and what happens if a source is missing at inference time. Mark gaps between requirements and the inventory in PROBLEM_BRIEF.

## 2. Quality audit (start from `project-profile.md`)
Completeness, correctness (spot-check against ground truth), consistency across sources/sites/sensors, timeliness, duplicates, outliers, **label quality** (inter-annotator agreement, noise estimate), **representativeness** (do all important segments, conditions, seasons, devices and populations appear?), and **leakage** (features not available at prediction time, post-outcome fields, entity overlap between train and test).

## 3. Splits that mirror reality
- Temporal data → time-based splits / rolling backtests.
- Entities (patients, machines, customers, sites) → group-aware splits so the same entity never appears in train and test.
- New-site generalisation → hold out whole sites/regions.
- Keep a **locked final test set** touched once per major decision.

## 4. Labeling strategy
Label schema and guidelines with edge cases, expert vs crowd vs weak supervision (rules/heuristics as labeling functions), LLM-assisted pre-labeling with human verification, active learning to prioritise informative samples, quality control (gold questions, agreement metrics), cost & time estimate.

## 5. Augmentation & synthetic data (`references/synthetic-data.md`)
Use when rare classes, privacy or cold-start block progress. Always validate: **train on synthetic → test on real** (TSTR) and compare against real-only training; check fidelity, diversity and privacy leakage.

## 6. Governance & privacy
Legal basis/consent, minimisation, anonymisation/pseudonymisation, retention, access control, data residency, licenses of third-party datasets, documentation (datasheets for datasets), PII handling in LLM prompts/logs.

## 7. Pipeline & monitoring
Ingestion → validation (schema & expectations) → feature computation (same code offline and online to avoid training/serving skew; feature store if many models share features) → versioning (data + code + model lineage) → monitoring (data drift, prediction drift, label-delay-aware performance) → feedback loop from production outcomes.

Output `.aimaker/DATA_STRATEGY.md`.
