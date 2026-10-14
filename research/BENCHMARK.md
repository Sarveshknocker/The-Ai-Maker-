# Benchmark: what leading projects do, and what this kit took

Researched October 2026 from the most-starred open-source projects for AI engineering, evaluation and ML system design.
Star counts are from the GitHub API at the time. Only ideas and public data were used; the code here is original
(see [CREDITS.md](../CREDITS.md)).

| Project | Stars | Licence | Best at | Taken into this kit |
|---|---|---|---|---|
| [promptfoo/promptfoo](https://github.com/promptfoo/promptfoo) | ~26k | MIT | Declarative test cases with assertions; side-by-side model comparison; red-teaming plugins mapped to OWASP LLM risks | Per-case assertions in `eval_harness.py`; `redteam.mjs` defensive test set with canary-based leak detection |
| [confident-ai/deepeval](https://github.com/confident-ai/deepeval) · [Arize-ai/phoenix](https://github.com/Arize-ai/phoenix) · [langfuse/langfuse](https://github.com/langfuse/langfuse) | ~19k · ~12k · ~36k | Apache-2.0 / other | LLM and RAG metrics, LLM-as-judge, tracing | Retrieval recall@k / MRR / nDCG; judge scores gated behind calibration against human labels |
| [BerriAI/litellm](https://github.com/BerriAI/litellm) | ~61k | MIT (core) | A maintained price and context-window list for thousands of models | `models.mjs` reads it at run time (cached), compares workload cost with cache and batch pricing |
| [Engineer1999/A-Curated-List-of-ML-System-Design-Case-Studies](https://github.com/Engineer1999/A-Curated-List-of-ML-System-Design-Case-Studies) · [mallahyari/ml-practical-usecases](https://github.com/mallahyari/ml-practical-usecases) | ~11k · ~1.3k | none stated | ~950 links to how companies built production ML systems | `cases` research source: fetched at run time and linked, never redistributed |
| [mercari/ml-system-design-pattern](https://github.com/mercari/ml-system-design-pattern) | ~2.9k | MIT | Catalogue of serving and training patterns | Compact serving-pattern table in `system-design.md` (own wording) |
| [Orchestra-Research/AI-Research-SKILLs](https://github.com/Orchestra-Research/AI-Research-SKILLs) · [K-Dense-AI/scientific-agent-skills](https://github.com/K-Dense-AI/scientific-agent-skills) | ~13.5k · ~49k | MIT | Large per-library skill collections (fine-tuning, serving, evaluation frameworks) | Not copied: this kit decides *what* to build; those skills help *implement* it. The blueprint can point to them for the chosen stack |
| [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) | ~107k | MIT | Rationalizations, red flags, verification sections; should-not-trigger evals | Same sections in the orchestrator; negative eval case |
| [autogluon/autogluon](https://github.com/autogluon/autogluon) · [microsoft/nni](https://github.com/microsoft/nni) | ~11k · ~14k | Apache-2.0 · MIT | Strong automatic baselines | Reinforces "baseline first"; AutoML is listed as a baseline option, not bundled |

## Measured
- Live: `cases` returned Stripe, Uber, PayPal, Feedzai and Binance case studies for "fraud detection payments"; the two
  lists parse into 961 entries.
- Live: `models cost` compared three vendors for 20k requests/day in one call ($184 vs $499 vs $3,492 per month).
- Sample sizes match textbook values (385 cases for ±3 points at p = 0.9; 3,841 per arm for 10% → 12%).
- Eval harness: on a synthetic task the paired comparison reported +0.51 pass rate, 95% CI [0.34, 0.66], McNemar
  p ≈ 1e-6; an uncalibrated judge was correctly refused for gating.

## Not adopted, and why
- Running a hosted observability platform (Langfuse, Phoenix): useful in production, but the kit plans the system; the
  monitoring section of the blueprint names them as options.
- Offensive red-team payload libraries: the generated set covers the OWASP categories with standard, mild probes for
  the user's own application only.
