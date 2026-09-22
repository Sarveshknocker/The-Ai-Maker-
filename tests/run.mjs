// Tests for The AI Maker. Network is mocked (offline, deterministic); pass --live (or LIVE=1) to also hit real APIs.
// Python templates are exercised when a Python with scikit-learn+pandas is available (set AIMAKER_PYTHON to its path).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseCSV, profileTable, profileProject } from '../skills/aimaker-discover/scripts/profile.mjs';
import { research, SOURCES, DEFAULT_SOURCES } from '../skills/aimaker-research/scripts/sota.mjs';
import { decide, PROFILES, CRITERIA } from '../skills/aimaker-architect/scripts/decide.mjs';
import { train, finetune, inference, api, throughput } from '../skills/aimaker-architect/scripts/estimate.mjs';

const KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLI = path.join(KIT, 'bin', 'aimaker.mjs');
const node = (args, opts = {}) => spawnSync(process.execPath, args, { encoding: 'utf8', ...opts });
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'aimaker-'));
const write = (dir, files) => { for (const [rel, c] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), c); } return dir; };

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

// ---------------------------------------------------------------- profiler
test('CSV parser handles quotes, escaped quotes, CRLF and delimiter sniffing', () => {
  const r = parseCSV('a;b;c\r\n1;"x;y";"he said ""hi"""\r\n2;z;w\r\n');
  assert.equal(r.delimiter, ';');
  assert.deepEqual(r.header, ['a', 'b', 'c']);
  assert.deepEqual(r.rows[0], ['1', 'x;y', 'he said "hi"']);
  assert.equal(r.rows.length, 2);
});

function churnCSV(n = 400) {
  const lines = ['customer_id,signup_date,plan,monthly_fee,tickets,notes,region,churned'];
  for (let i = 0; i < n; i++) {
    const churn = i % 12 === 0 ? 1 : 0; // ~8% minority → imbalanced
    const fee = i % 7 === 0 ? '' : (40 + (i % 30)).toFixed(2);
    lines.push(`C${i},2024-01-${String((i % 28) + 1).padStart(2, '0')},${['basic', 'pro', 'biz'][i % 3]},${fee},${i % 5},"note, ${i}",IN,${churn}`);
  }
  lines.push(lines[1]); // duplicate row
  return lines.join('\n');
}

test('profileTable infers types, targets, imbalance, time columns, duplicates and issues', () => {
  const t = profileTable(parseCSV(churnCSV()));
  const col = (n) => t.cols.find((c) => c.name === n);
  assert.equal(col('signup_date').type, 'datetime');
  assert.equal(col('monthly_fee').type, 'numeric');
  assert.ok(col('monthly_fee').missingPct > 10);
  assert.equal(col('plan').type, 'categorical');
  assert.equal(col('region').role, 'constant');
  assert.equal(col('churned').type, 'boolean');
  assert.deepEqual(t.targets.map((x) => [x.column, x.task, x.imbalanced]), [['churned', 'classification', true]]);
  assert.equal(t.duplicateRows, 1);
  assert.ok(t.issues.some((i) => /imbalanced/.test(i)));
  assert.ok(t.issues.some((i) => /time-based splits/.test(i)));
  assert.ok(t.issues.some((i) => /constant/.test(i)));
});

test('profileProject inventories data, models, stack and GPU hints', () => {
  const dir = write(tmp(), {
    'data/churn.csv': churnCSV(),
    'data/images/a.png': 'x', 'data/images/b.jpg': 'x',
    'models/old.onnx': Buffer.alloc(20_000),
    'requirements.txt': 'torch==2.4\nlightgbm\nlangchain\nmlflow\nfaiss-cpu\n',
    'train.py': "device = 'cuda'\n",
    'notebooks/eda.ipynb': '{}',
  });
  const p = profileProject(dir);
  assert.equal(p.data.tabular.files, 1);
  assert.equal(p.data.image.files, 2);
  assert.equal(p.models[0].file, 'models/old.onnx');
  assert.deepEqual(p.notebooks, ['notebooks/eda.ipynb']);
  assert.ok(p.libs['deep learning'].includes('torch') && p.libs['classical ML'].includes('lightgbm'));
  assert.ok(p.libs['LLM / GenAI'].includes('langchain') && p.libs.MLOps.includes('mlflow') && p.libs['retrieval / vector DB'].includes('faiss-cpu'));
  assert.equal(p.compute.gpuHints, true);
  assert.equal(p.tables[0].targets[0].column, 'churned');
  const r = node([CLI, 'profile', dir]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(fs.readFileSync(path.join(dir, '.aimaker/project-profile.md'), 'utf8'), /Candidate targets: `churned` → classification \(imbalanced/);
});

// ---------------------------------------------------------------- research (mocked)
const recent = new Date(Date.now() - 20 * 864e5).toISOString();
const FIX = {
  'export.arxiv.org': `<feed><entry><id>http://arxiv.org/abs/2501.00001</id><published>${recent}</published><title>Vibration anomaly detection for predictive maintenance</title><summary>We propose a method.</summary></entry></feed>`,
  'huggingface.co/api/papers': [{ paper: { id: '2501.00002', title: 'Predictive maintenance with foundation models', summary: 'anomaly detection on vibration', upvotes: 40, publishedAt: recent, ai_keywords: ['predictive maintenance', 'vibration'] }, numComments: 3 }],
  'huggingface.co/api/models': [{ id: 'org/vibration-anomaly-detector', downloads: 1200, likes: 5, pipeline_tag: 'time-series-forecasting', lastModified: recent }],
  'huggingface.co/api/datasets': [{ id: 'org/predictive-maintenance-vibration', downloads: 900, likes: 3, lastModified: recent }],
  'api.openalex.org': { results: [{ display_name: 'Vibration-based predictive maintenance: a review', doi: 'https://doi.org/10.1/x', cited_by_count: 500, publication_date: '2022-01-01', primary_location: { source: { display_name: 'MSSP' } } }] },
  'api.github.com': { items: [{ full_name: 'a/vibration-anomaly', html_url: 'https://github.com/a/vibration-anomaly', description: 'predictive maintenance vibration anomaly detection', stargazers_count: 300, pushed_at: recent, topics: [], license: { spdx_id: 'Apache-2.0' } }] },
  'hn.algolia.com': { hits: [{ objectID: '9', title: 'Predictive maintenance with vibration sensors', points: 80, num_comments: 20, created_at: recent }] },
};
function mockFetch(url) {
  const u = new URL(url);
  const key = Object.keys(FIX).find((k) => (u.host + u.pathname).startsWith(k));
  const body = FIX[key];
  if (!body) return Promise.resolve(new Response('nf', { status: 404 }));
  return Promise.resolve(typeof body === 'string' ? new Response(body) : Response.json(body));
}

test('SOTA collector: default sources incl. HF papers, normalised items with arXiv links', async () => {
  assert.deepEqual(DEFAULT_SOURCES, ['arxiv', 'hf-papers', 'openalex', 'github', 'huggingface', 'hf-datasets', 'hn']);
  const run = await research('predictive maintenance vibration anomaly detection', { fetchImpl: mockFetch, limit: 3 });
  const srcs = new Set(run.items.map((i) => i.source));
  for (const s of DEFAULT_SOURCES) assert.ok(srcs.has(s), `missing ${s}`);
  const hp = run.items.find((i) => i.source === 'hf-papers');
  assert.equal(hp.url, 'https://huggingface.co/papers/2501.00002');
  assert.equal(hp.extra.arxiv, 'https://arxiv.org/abs/2501.00002');
  assert.deepEqual(run.errors, []);
  assert.ok(SOURCES.reddit && SOURCES.stackoverflow, 'opt-in sources remain available');
});

// ---------------------------------------------------------------- decision engine
const cand = (id, s, over = {}) => ({ id, name: id, scores: { ...Object.fromEntries(CRITERIA.map((k) => [k, s])), ...over } });
test('decide: ranking, hard constraints, robustness and trade-offs', () => {
  const d = decide({ profile: 'realtime-edge', constraints: { latency: 3 }, candidates: [cand('simple', 4), cand('deep', 3, { performance: 5 }), cand('llm', 2, { latency: 1 })] });
  assert.equal(d.winner, 'simple');
  assert.equal(d.ranked.find((c) => c.id === 'llm').eligible, false);
  assert.match(d.ranked.find((c) => c.id === 'llm').violations[0], /latency 1 < 3/);
  assert.ok(d.ranked[0].winProbability >= 70);
  assert.match(d.verdict, /Robust winner/);
  assert.ok(d.tradeoffs.some((t) => t.startsWith('performance')));
});

test('decide: close calls are flagged; profiles change winners; ≥2 candidates required', () => {
  const a = cand('explainable', 3, { explainability: 5, risk: 5, performance: 2 });
  const b = cand('accurate', 3, { performance: 5, explainability: 1, risk: 2 });
  assert.equal(decide({ profile: 'regulated', candidates: [a, b] }).winner, 'explainable');
  assert.equal(decide({ profile: 'frontier-performance', candidates: [a, b] }).winner, 'accurate');
  const close = decide({ candidates: [cand('x', 3, { cost: 4 }), cand('y', 3, { latency: 4 })] });
  assert.match(close.verdict, /Close call/);
  assert.throws(() => decide({ candidates: [cand('only', 3)] }), /at least 2/);
  assert.throws(() => decide({ profile: 'nope', candidates: [a, b] }), /Unknown profile/);
  assert.equal(Object.keys(PROFILES).length, 6);
  for (const w of Object.values(PROFILES)) assert.deepEqual(Object.keys(w).sort(), [...CRITERIA].sort());
});

test('decide CLI writes DECISION.md; invalid scores fail', () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, 'c.json'), JSON.stringify({ candidates: [cand('A', 4), cand('B', 2)] }));
  let r = node([CLI, 'decide', path.join(dir, 'c.json'), '--out', dir]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(fs.readFileSync(path.join(dir, 'DECISION.md'), 'utf8'), /\| 1 \| A · A \| \*\*80\*\* \|/);
  fs.writeFileSync(path.join(dir, 'bad.json'), JSON.stringify({ candidates: [{ id: 'A', scores: { latency: 9 } }, cand('B', 2)] }));
  r = node([CLI, 'decide', path.join(dir, 'bad.json'), '--out', dir]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /missing\/invalid/);
});

// ---------------------------------------------------------------- estimator
test('estimator formulas: 6ND training FLOPs, KV cache, API cost, throughput', () => {
  const t = train({ params: 7e9, tokens: 1.4e11, gpuTflops: 989, mfu: 0.4, gpus: 8, gpuHourPrice: 3 });
  assert.equal(t.flops, 6 * 7e9 * 1.4e11);
  assert.ok(Math.abs(t.gpuHours - 4128.7) < 1);
  assert.equal(t.computeOptimalTokens, 1.4e11);
  const inf = inference({ params: 8e9, bits: 4, layers: 32, kvHeads: 8, headDim: 128, context: 8192 });
  assert.equal(inf.kvCacheGiB, 1);
  assert.equal(inf.weightsGiB, 3.7);
  const c = api({ requestsPerDay: 5000, inTokens: 1200, outTokens: 300, inPrice: 3, outPrice: 15 });
  assert.equal(c.perRequest, 0.0081);
  assert.equal(c.perMonth, 1215);
  const cached = api({ requestsPerDay: 5000, inTokens: 1200, outTokens: 300, inPrice: 3, outPrice: 15, cacheHit: 0.5, cachedPrice: 0.3 });
  assert.ok(cached.perRequest < c.perRequest);
  assert.throws(() => api({ requestsPerDay: 1 }), /needs/);
  assert.ok(finetune({ params: 8e9, method: 'full' }).gib > finetune({ params: 8e9, method: 'qlora' }).gib * 10);
  assert.deepEqual(throughput({ tokensPerSecond: 50, outTokens: 100, concurrency: 4, ttftMs: 0 }), { latencySeconds: 2, requestsPerMinute: 120 });
  const r = node([CLI, 'estimate', 'api', '--requests-per-day', '5000', '--in-tokens', '1200', '--out-tokens', '300', '--in-price', '3', '--out-price', '15']);
  assert.match(r.stdout, /perRequest\s+0\.0081/);
});

// ---------------------------------------------------------------- python templates (optional)
const PY = process.env.AIMAKER_PYTHON;
if (PY) {
  test('python templates: baseline runs with time split; eval harness gates', () => {
    const dir = tmp();
    fs.writeFileSync(path.join(dir, 'd.csv'), churnCSV(600));
    let r = spawnSync(PY, [path.join(KIT, 'skills/aimaker-architect/templates/baseline_tabular.py'), '--data', 'd.csv', '--target', 'churned', '--time', 'signup_date', '--drop', 'customer_id,notes', '--fn-cost', '5', '--out', 'out'], { cwd: dir, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    const m = JSON.parse(fs.readFileSync(path.join(dir, 'out/metrics.json'), 'utf8'));
    assert.match(m.meta.split, /time-based/);
    assert.ok(m.results.gbdt && m.results.linear && m.results.naive_prior);
    fs.writeFileSync(path.join(dir, 'sysx.py'), 'def predict(x):\n    return {"output": x.upper(), "cost": 0.001}\n');
    fs.writeFileSync(path.join(dir, 'g.jsonl'), '{"id":"1","input":"a b","expected":"A B"}\n{"id":"2","input":"c","expected":"D"}\n');
    r = spawnSync(PY, [path.join(KIT, 'skills/aimaker-architect/templates/eval_harness.py'), '--golden', 'g.jsonl', '--predictor', 'sysx:predict', '--gate', 'exact=0.9'], { cwd: dir, encoding: 'utf8' });
    assert.equal(r.status, 1, 'gate should fail at 50% exact');
    assert.match(r.stdout, /"exact": 0\.5/);
  });
}

// ---------------------------------------------------------------- installer & skills
test('init → update → remove round-trip keeps user content intact', () => {
  const dir = write(tmp(), { 'AGENTS.md': '# Mine\nKeep.\n' });
  let r = node([CLI, 'init', dir]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8'), /Keep\.[\s\S]*\.aimaker-kit\/skills\/aimaker\/SKILL\.md/);
  for (const f of ['CLAUDE.md', 'GEMINI.md', '.github/copilot-instructions.md', '.cursor/rules/the-ai-maker.mdc', '.windsurf/rules/the-ai-maker.md', '.clinerules/the-ai-maker.md', '.claude/skills/aimaker/SKILL.md', '.claude/agents/solution-architect.md', '.aimaker-kit/skills/aimaker-architect/templates/eval_harness.py']) assert.ok(fs.existsSync(path.join(dir, f)), `missing ${f}`);
  r = node([CLI, 'update', dir]);
  assert.equal(r.status, 0, r.stderr);
  assert.equal((fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8').match(/ai-maker:start/g) ?? []).length, 1);
  r = node([CLI, 'remove', dir]);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8'), '# Mine\nKeep.\n');
  assert.ok(!fs.existsSync(path.join(dir, '.aimaker-kit')));
});

test('profiler ignores the installed kit (all adapters) and AI-tool config folders', () => {
  const dir = write(tmp(), { 'x.csv': 'a,b\n1,2\n', 'docs/manual.pdf': 'x' });
  const r = node([CLI, 'init', dir]); // every adapter, incl. .claude/skills copies
  assert.equal(r.status, 0, r.stderr);
  const p = profileProject(dir);
  assert.equal(p.data.tabular.files, 1);
  assert.equal(p.data.text.files, 1, `kit/tool docs counted as data: ${JSON.stringify(p.data.text.examples)}`);
  assert.deepEqual(p.data.text.examples, ['docs/manual.pdf']);
});

test('every skill has valid frontmatter and referenced files exist', () => {
  for (const s of fs.readdirSync(path.join(KIT, 'skills'))) {
    const md = fs.readFileSync(path.join(KIT, 'skills', s, 'SKILL.md'), 'utf8');
    const fm = md.match(/^---\nname: ([\w-]+)\ndescription: (.+)\n---/);
    assert.ok(fm, `${s}: bad frontmatter`);
    assert.equal(fm[1], s);
    for (const ref of md.matchAll(/`((?:references|templates|scripts)\/[\w./-]+\.\w+)`/g)) assert.ok(fs.existsSync(path.join(KIT, 'skills', s, ref[1])), `${s}: missing ${ref[1]}`);
  }
  const orchestrator = fs.readFileSync(path.join(KIT, 'skills/aimaker/SKILL.md'), 'utf8');
  for (const s of fs.readdirSync(path.join(KIT, 'skills')).filter((x) => x !== 'aimaker')) assert.ok(orchestrator.includes(s), `orchestrator does not route to ${s}`);
});

if (process.env.LIVE === '1' || process.argv.includes('--live')) {
  test('LIVE: SOTA sources respond with relevant results', async () => {
    const run = await research('graph neural network traffic forecasting', { limit: 3 });
    const ok = new Set(run.items.map((i) => i.source));
    assert.ok(ok.size >= 4, `only ${[...ok]}; errors ${JSON.stringify(run.errors)}`);
  });
}

let failed = 0;
for (const t of tests) {
  try { await t.fn(); console.log(`✔ ${t.name}`); }
  catch (e) { failed++; console.log(`✖ ${t.name}\n   ${String(e.message).split('\n').slice(0, 10).join('\n   ')}`); }
}
console.log(`\n${tests.length - failed}/${tests.length} passed${PY ? '' : ' (python templates skipped — set AIMAKER_PYTHON to include them)'}`);
process.exit(failed ? 1 : 0);
