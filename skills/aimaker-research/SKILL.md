---
name: aimaker-research
description: State-of-the-art research for an AI project — papers (arXiv, Hugging Face papers, OpenAlex), implementations (GitHub, Hugging Face models), datasets, practitioner discussion, plus web search for leaderboards, model cards, vendor docs, pricing and regulation — with critical appraisal of claims. Use to find the best current techniques for a specific task and domain.
---

# SOTA research

## 1. Queries
Write 6–12 **short** queries in `.aimaker/queries.txt` combining:
- **Task + domain**: "bearing fault diagnosis", "crop disease detection", "clinical note summarization"
- **Task + modality**: "vibration anomaly detection", "multimodal document understanding"
- **Technique candidates**: "physics-informed neural network heat", "digital twin reinforcement learning", "time series foundation model"
- **Constraints**: "edge deployment", "few-shot", "low-resource language", "real-time"
- **Data**: "<domain> dataset", "synthetic data <domain>"
- **Surveys**: "<task> survey", "<task> benchmark"

## 2. Collect
```bash
node <kit>/skills/aimaker-research/scripts/sota.mjs --queries-file .aimaker/queries.txt --limit 8 --tag sota
```
Defaults: `arxiv, hf-papers, openalex, github, huggingface, hf-datasets, hn` (opt-in: `stackoverflow, reddit, wikipedia, npm, news`). The collector broadens queries automatically, filters irrelevant hits, and weights freshness strongly (AI moves fast). Output: `.aimaker/research/sota.{md,json}`. Optional env: `GITHUB_TOKEN`, `OPENALEX_MAILTO`, `REDDIT_CLIENT_ID/SECRET`.

## 3. Web search (no free API)
- Leaderboards/benchmarks relevant to the task (check dataset, split, date, whether results are self-reported).
- **Official model cards & docs** for candidate models/services: capabilities, context limits, licenses, prices, rate limits, data-usage terms. **Verify current versions; don't rely on memory.**
- Domain-specific venues and standards (e.g. medical imaging, industrial IoT, remote sensing, finance).
- Regulatory guidance for the sector and the EU AI Act risk tier if applicable.
- Case studies of production deployments (engineering blogs) — they reveal real-world failure modes that papers omit.

## 4. Appraise critically (`references/reading-research.md`)
For every technique you might recommend, record: problem setting vs ours, data scale/modality, metric and baseline used, reproducibility (code? weights? license?), compute required, known limitations, and **transfer risk** to our domain.

## 5. Output: `.aimaker/SOTA_REVIEW.md`
1. Landscape summary (5–10 lines)
2. Technique families with best evidence (table: approach, key papers/repos, reported results, data/compute needs, maturity, license, transfer risk)
3. Available pretrained models & datasets we can reuse (with licenses)
4. Existing products/services that already solve part of the problem (build vs buy input)
5. Gaps: where research does not cover our setting (these become experiments)
6. Sources (links, dates)
