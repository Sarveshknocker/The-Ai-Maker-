# Changelog

## 0.3.0 — 2026-11-05
Safety release, from an external review (P0 blockers).
- **The installer can no longer delete your files.** New shared `bin/kit-installer.mjs` (the same file in all of Sarvesh's kits). `--kit-dir` must be a new sub-folder of the project. A folder the kit did not create is never deleted. Only paths recorded in the manifest *and* produced by this kit are removed, so a tampered manifest cannot widen the delete. Existing files are never overwritten: `--force` backs them up to `<kit-dir>/backup/` and `remove` restores them. Covered by `tests/installer.mjs` (11 cases, run by `npm test`).
- **Kits no longer collide:** agents are prefixed `aimaker-` (`aimaker-solution-architect`, …). Updating an older install removes the old copies, but only when they are provably this kit's.

## 0.2.0 — 2026-10-15
Upgrade informed by leading open-source AI engineering and evaluation projects (see `research/BENCHMARK.md`).

### Added
- **`models.mjs`**: live hosted-model catalog (LiteLLM community list, cached 24 h, offline and stale-cache fallback):
  `find` by provider, context, vision, tools, reasoning; `cost` compares monthly cost for a workload with prompt caching
  and batch pricing and writes `.aimaker/MODEL_COSTS.md`. Hides $0 preview entries and deprecated models by default.
- **`cases` research source** (default): ~950 production ML case studies from two curated lists, searched by keyword.
- **`estimate sample`**: golden-set size for a target precision and A/B test size/duration (two-proportion power analysis).
- **`redteam.mjs`**: defensive LLM test set (OWASP LLM01/02/05/06/07/10) with a per-run canary for system-prompt leakage.
- **`eval_harness.py` v2** (stdlib, backwards compatible): per-case assertions, retrieval recall@k/MRR/nDCG, bootstrap
  intervals, `--repeats` consistency, `--baseline` paired comparison with exact McNemar test, `--judge` trusted only
  after calibration against ≥ 10 human labels (kappa ≥ 0.6, both classes present).
- Serving-pattern table, system card in the blueprint, rationalizations / red flags / definition of done, evals,
  Codex plugin manifests, CLI commands `models` and `redteam`.
- Tests: case-table parsing, catalog normalisation/cost/caching (mock server), sample sizes vs textbook values,
  red-team generation, harness statistics (runs with any Python 3).

## 0.1.0
- Initial release: discovery and profiler, SOTA collector, approaches atlas, decision engine, estimator, simulation,
  data, evaluation and blueprint skills, installer.
