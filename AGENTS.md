# The AI Maker

## If the user describes a project, problem or dataset
This repository **is** the kit. Treat the request as a call to design the most effective domain-specific AI system:
open and follow `skills/aimaker/SKILL.md` (the orchestrator). It routes to `aimaker-discover`, `aimaker-research`, `aimaker-approaches`, `aimaker-data`, `aimaker-simulate`, `aimaker-architect`, `aimaker-evaluate` and `aimaker-blueprint`. Scripts run with Node ≥ 18 from this folder, e.g. `node bin/aimaker.mjs research "<keywords>"`. Write outputs to `.aimaker/`. Work autonomously; record assumptions instead of asking. Never invent research results, benchmarks, model capabilities or prices.

Sub-agent briefs (if supported): `agents/`.

## If the user wants to change the kit itself
- Skills: `skills/<name>/SKILL.md`, frontmatter `name` (= folder) + `description`; bundled files in `references/`, `templates/`, `scripts/`, referenced by those relative paths. The orchestrator must route to every sub-skill (tested).
- Tool-agnostic Markdown; refer to kit files as `<kit>/…`.
- Scripts: zero-dependency Node ≥ 18 ESM, cross-platform; network code takes an injectable `fetchImpl` with mocked tests. Python templates: stdlib or scikit-learn/pandas only, tested when `AIMAKER_PYTHON` is set.
- Don't hard-code model names, versions or prices as facts: they go stale. Reference families and make the AI verify current ones.
- Run `npm test` (plus `npm run test:live` / `AIMAKER_PYTHON=… npm test` when touching those areas) before committing.
