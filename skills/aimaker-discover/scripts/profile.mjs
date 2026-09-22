#!/usr/bin/env node
// The AI Maker — project & data profiler (zero dependencies, Node >= 18).
// Inventories data assets, existing ML code/models, frameworks and compute hints, and profiles tabular data
// (rows, types, missingness, cardinality, time columns, candidate targets, class balance, leakage hints).
// Usage: node profile.mjs [projectRoot] [--out .aimaker] [--max-rows 50000]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const IGNORE = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.venv', 'venv', 'env', '__pycache__', '.mypy_cache', '.pytest_cache',
  'target', '.gradle', '.idea', '.aimaker', '.aimaker-kit', '.protectors', '.protectors-kit', '.enhancer', '.enhancer-kit', '.immersive-kit',
  'site-packages', '.ipynb_checkpoints', 'wandb', 'mlruns', '.cache', '.dvc/cache', 'lightning_logs']);

const DATA_KINDS = {
  tabular: /\.(csv|tsv|parquet|feather|arrow|xlsx?|jsonl|ndjson|orc|avro)$/i,
  image: /\.(png|jpe?g|bmp|tiff?|webp|dcm|nii(\.gz)?)$/i,
  audio: /\.(wav|mp3|flac|ogg|m4a)$/i,
  video: /\.(mp4|avi|mov|mkv|webm)$/i,
  text: /\.(txt|md|pdf|docx?|html?)$/i,
  geo: /\.(geojson|shp|kml|tif|gpkg)$/i,
  pointcloud: /\.(pcd|ply|las|laz|bag|mcap)$/i,
  database: /\.(db|sqlite3?|duckdb)$/i,
  timeseries: /\.(h5|hdf5|nc|zarr)$/i,
};
const MODEL_FILES = /\.(pt|pth|ckpt|safetensors|onnx|h5|keras|pb|tflite|pkl|joblib|gguf|engine|mlmodel|bin)$/i;

const LIBS = {
  'classical ML': ['scikit-learn', 'sklearn', 'xgboost', 'lightgbm', 'catboost', 'statsmodels'],
  'deep learning': ['torch', 'pytorch-lightning', 'lightning', 'tensorflow', 'keras', 'jax', 'flax', 'mxnet', 'paddlepaddle'],
  'LLM / GenAI': ['transformers', 'openai', 'anthropic', '@anthropic-ai/sdk', 'langchain', 'langgraph', 'llama-index', 'llama_index', 'vllm', 'ollama', 'google-genai', '@google/genai', 'mistralai', 'sentence-transformers', 'diffusers', 'peft', 'trl', 'dspy', 'ai'],
  'retrieval / vector DB': ['faiss-cpu', 'faiss-gpu', 'chromadb', 'qdrant-client', 'pinecone', 'weaviate-client', 'pgvector', 'lancedb', 'milvus'],
  'computer vision': ['opencv-python', 'ultralytics', 'torchvision', 'timm', 'albumentations', 'detectron2', 'mmdet', 'supervision', 'segment-anything'],
  'NLP / speech': ['spacy', 'nltk', 'whisper', 'openai-whisper', 'faster-whisper', 'gensim'],
  'time series': ['prophet', 'sktime', 'darts', 'neuralforecast', 'statsforecast', 'gluonts', 'tsfresh', 'pmdarima'],
  'RL / simulation': ['gymnasium', 'gym', 'stable-baselines3', 'ray', 'rllib', 'pettingzoo', 'mujoco', 'pybullet', 'simpy', 'mesa'],
  'optimization': ['ortools', 'pulp', 'pyomo', 'cvxpy', 'gurobipy', 'scipy', 'optuna', 'highspy'],
  'physics-informed / scientific': ['deepxde', 'nvidia-physicsnemo', 'modulus', 'fenics', 'sympy', 'torchdiffeq'],
  'MLOps': ['mlflow', 'wandb', 'dvc', 'bentoml', 'kserve', 'seldon-core', 'evidently', 'great-expectations', 'feast', 'prefect', 'airflow', 'dagster', 'kedro', 'zenml'],
  'edge': ['tflite-runtime', 'onnxruntime', 'openvino', 'tensorrt', 'coremltools', 'executorch'],
};

function walk(root, dir = root, acc = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of entries) {
    if (IGNORE.has(e.name) || e.isSymbolicLink()) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(root, full, acc);
    else { let size = 0; try { size = fs.statSync(full).size; } catch {} acc.push({ rel: path.relative(root, full).split(path.sep).join('/'), size }); }
    if (acc.length > 200000) break;
  }
  return acc;
}

// ---------- minimal RFC-4180 CSV parser (quotes, escaped quotes, CRLF) ----------
export function parseCSV(text, { delimiter, maxRows = 50000 } = {}) {
  const firstLine = text.slice(0, text.indexOf('\n') === -1 ? undefined : text.indexOf('\n'));
  const delim = delimiter ?? ([',', ';', '\t', '|'].map((d) => [d, firstLine.split(d).length]).sort((a, b) => b[1] - a[1])[0][0]);
  const rows = [];
  let row = [], field = '', inQ = false, i = 0;
  const n = text.length;
  while (i < n && rows.length <= maxRows) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i += 2; continue; } inQ = false; i++; continue; }
      field += c; i++; continue;
    }
    if (c === '"' && field === '') { inQ = true; i++; continue; }
    if (c === delim) { row.push(field); field = ''; i++; continue; }
    if (c === '\r') { i++; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += c; i++;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const [header = [], ...body] = rows.filter((r) => r.length > 1 || r[0] !== '');
  return { delimiter: delim, header: header.map((h) => h.trim()), rows: body.slice(0, maxRows), truncated: rows.length > maxRows };
}

const MISSING = new Set(['', 'na', 'n/a', 'nan', 'null', 'none', '?', '-', 'nil']);
const isNum = (v) => /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(v);
const isBool = (v) => /^(true|false|yes|no|y|n|0|1)$/i.test(v);
const isDate = (v) => /^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/.test(v) || /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}( \d{1,2}:\d{2})?$/.test(v);

export function profileTable({ header, rows }) {
  const nRows = rows.length;
  const cols = header.map((name, ci) => {
    const vals = rows.map((r) => (r[ci] ?? '').trim());
    const present = vals.filter((v) => !MISSING.has(v.toLowerCase()));
    const missingPct = nRows ? Math.round(((nRows - present.length) / nRows) * 1000) / 10 : 0;
    const distinct = new Set(present);
    const numShare = present.length ? present.filter(isNum).length / present.length : 0;
    const dateShare = present.length ? present.filter(isDate).length / present.length : 0;
    const boolShare = present.length ? present.filter(isBool).length / present.length : 0;
    let type = 'text';
    if (dateShare > 0.9) type = 'datetime';
    else if (distinct.size <= 2 && boolShare > 0.95) type = 'boolean';
    else if (numShare > 0.95) type = distinct.size <= Math.max(10, nRows * 0.02) && present.every((v) => /^-?\d+$/.test(v)) ? 'categorical-int' : 'numeric';
    else if (distinct.size <= Math.max(50, nRows * 0.05)) type = 'categorical';
    const col = { name, type, missingPct, distinct: distinct.size };
    if (type === 'numeric') {
      const nums = present.map(Number).sort((a, b) => a - b);
      const mean = nums.reduce((s, x) => s + x, 0) / nums.length;
      const q = (p) => nums[Math.min(nums.length - 1, Math.floor(p * (nums.length - 1)))];
      const iqr = q(0.75) - q(0.25);
      Object.assign(col, { min: nums[0], p50: q(0.5), max: nums.at(-1), mean: +mean.toFixed(4), outlierPct: iqr > 0 ? Math.round((nums.filter((x) => x < q(0.25) - 3 * iqr || x > q(0.75) + 3 * iqr).length / nums.length) * 1000) / 10 : 0 });
    }
    if (['categorical', 'categorical-int', 'boolean'].includes(type)) {
      const counts = {};
      for (const v of present) counts[v] = (counts[v] ?? 0) + 1;
      col.top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([v, c]) => ({ value: v, pct: Math.round((c / present.length) * 1000) / 10 }));
    }
    if (type === 'text') col.avgLength = Math.round(present.reduce((s, v) => s + v.length, 0) / Math.max(1, present.length));
    if (distinct.size === present.length && present.length === nRows && nRows > 20) col.role = 'identifier';
    if (distinct.size <= 1) col.role = 'constant';
    return col;
  });

  // Candidate targets: named like a label, or low-cardinality last column.
  const TARGET_NAME = /^(target|label|y|class|outcome|churn(ed)?|fraud|is_?\w+|default(ed)?|failure|fault|anomaly|diagnosis|survived|price|sales|demand|revenue|score|rating|status|result)$/i;
  const candidates = cols.filter((c) => c.role !== 'identifier' && c.role !== 'constant' && (TARGET_NAME.test(c.name) || (c === cols.at(-1) && ['boolean', 'categorical', 'categorical-int'].includes(c.type))));
  const targets = candidates.map((c) => {
    const task = ['boolean', 'categorical', 'categorical-int'].includes(c.type) ? 'classification' : c.type === 'numeric' ? 'regression' : 'unknown';
    const t = { column: c.name, task };
    if (task === 'classification' && c.top) {
      const minority = Math.min(...c.top.map((x) => x.pct));
      t.minorityClassPct = minority;
      t.imbalanced = minority < 10;
    }
    return t;
  });

  const timeCols = cols.filter((c) => c.type === 'datetime').map((c) => c.name);
  const issues = [];
  for (const c of cols) {
    if (c.missingPct >= 30) issues.push(`"${c.name}" is ${c.missingPct}% missing`);
    if (c.role === 'constant') issues.push(`"${c.name}" is constant (no information)`);
    if (c.outlierPct >= 2) issues.push(`"${c.name}" has ${c.outlierPct}% extreme outliers (>3×IQR)`);
    if (/(_id|id)$/i.test(c.name) && c.role !== 'identifier' && c.type !== 'text') issues.push(`"${c.name}" looks like an ID but isn't unique — check for duplicates/entities (group-aware splits)`);
    if (/(after|post|outcome_date|closed|resolved|final|result_)/i.test(c.name) && targets.length) issues.push(`"${c.name}" may leak future information into training — verify it is known at prediction time`);
  }
  const dupRows = nRows - new Set(rows.map((r) => r.join('\u0001'))).size;
  if (dupRows) issues.push(`${dupRows} duplicate rows (${Math.round((dupRows / nRows) * 1000) / 10}%)`);
  for (const t of targets) if (t.imbalanced) issues.push(`target "${t.column}" is imbalanced (minority ${t.minorityClassPct}%) — use PR-AUC/recall at fixed precision, stratified splits, cost-sensitive learning`);
  if (timeCols.length) issues.push(`time column(s) ${timeCols.join(', ')} → use time-based splits/backtesting, never random shuffles`);
  if (nRows < 1000) issues.push(`only ${nRows} rows — prefer simple/regularised models, strong priors, transfer learning or data collection`);

  return { rows: nRows, columns: cols.length, cols, targets, timeColumns: timeCols, duplicateRows: dupRows, issues };
}

export function profileProject(root, { maxRows = 50000 } = {}) {
  const files = walk(root);
  const read = (p) => { try { return fs.readFileSync(path.join(root, p), 'utf8'); } catch { return ''; } };

  const data = Object.fromEntries(Object.keys(DATA_KINDS).map((k) => [k, { files: 0, bytes: 0, examples: [] }]));
  for (const f of files) {
    for (const [k, re] of Object.entries(DATA_KINDS)) {
      if (re.test(f.rel) && !/(^|\/)(readme|license|changelog|contributing|agents|claude|gemini)\.md$/i.test(f.rel)) {
        data[k].files++; data[k].bytes += f.size; if (data[k].examples.length < 5) data[k].examples.push(f.rel); break;
      }
    }
  }
  const models = files.filter((f) => MODEL_FILES.test(f.rel) && f.size > 10_000).map((f) => ({ file: f.rel, mb: Math.round(f.size / 1048576 * 10) / 10 })).slice(0, 30);
  const notebooks = files.filter((f) => /\.ipynb$/.test(f.rel)).map((f) => f.rel).slice(0, 30);

  const manifests = [read('requirements.txt'), read('pyproject.toml'), read('environment.yml'), read('Pipfile'), read('setup.py'), read('package.json'),
    ...files.filter((f) => /(^|\/)requirements[\w-]*\.txt$/.test(f.rel)).slice(0, 5).map((f) => read(f.rel))].join('\n').toLowerCase();
  const libs = {};
  for (const [group, names] of Object.entries(LIBS)) {
    const found = names.filter((n) => new RegExp(`(^|[\\s"'\\[,=])${n.replace(/[.*+?^${}()|[\]\\/@]/g, '\\$&')}([\\s"'\\]=<>~!;,:\\[]|$)`, 'm').test(manifests));
    if (found.length) libs[group] = found;
  }

  const compute = {
    gpuHints: /cuda|nvidia|--gpus|runtime:\s*nvidia|torch\.cuda|device\s*=\s*["']cuda/.test(files.filter((f) => /(Dockerfile|compose.*\.ya?ml|\.py)$/.test(f.rel)).slice(0, 300).map((f) => read(f.rel)).join('\n')),
    dockerfile: files.some((f) => /(^|\/)Dockerfile/.test(f.rel)),
    cloud: [files.some((f) => /sagemaker|\.aws/.test(f.rel)) && 'aws', files.some((f) => /vertex|gcloud|app\.yaml$/.test(f.rel)) && 'gcp', files.some((f) => /azureml|azure-pipelines/.test(f.rel)) && 'azure'].filter(Boolean),
  };

  const tables = [];
  for (const f of files.filter((x) => /\.(csv|tsv)$/i.test(x.rel)).sort((a, b) => b.size - a.size).slice(0, 5)) {
    try {
      const fd = fs.openSync(path.join(root, f.rel), 'r');
      const buf = Buffer.alloc(Math.min(f.size, 20 * 1048576));
      fs.readSync(fd, buf, 0, buf.length, 0); fs.closeSync(fd);
      let text = buf.toString('utf8');
      if (buf.length < f.size) text = text.slice(0, text.lastIndexOf('\n'));
      const parsed = parseCSV(text, { maxRows, delimiter: f.rel.endsWith('.tsv') ? '\t' : undefined });
      tables.push({ file: f.rel, mb: Math.round(f.size / 1048576 * 10) / 10, sampled: buf.length < f.size || parsed.truncated, ...profileTable(parsed) });
    } catch (e) { tables.push({ file: f.rel, error: e.message }); }
  }

  const docs = ['README.md', 'readme.md', 'docs/README.md'].map(read).find(Boolean) ?? '';
  return {
    generatedAt: new Date().toISOString(), root,
    summary: docs.replace(/\r/g, '').split('\n').filter((l) => l.trim()).slice(0, 20).join('\n'),
    files: files.length, data, models, notebooks, libs, compute, tables,
  };
}

export function toMarkdown(p) {
  const kb = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`);
  const dataRows = Object.entries(p.data).filter(([, v]) => v.files).map(([k, v]) => `| ${k} | ${v.files} | ${kb(v.bytes)} | ${v.examples.map((e) => `\`${e}\``).join(', ')} |`);
  return `# Project & data profile

_Generated ${p.generatedAt} by The AI Maker. Facts only — interpretation belongs in PROBLEM_BRIEF.md._

## Data assets
${dataRows.length ? `| Kind | Files | Size | Examples |\n|---|---|---|---|\n${dataRows.join('\n')}` : 'No data files found in the project. → Data acquisition is part of the plan (see aimaker-data).'}

## Existing models / notebooks
${p.models.length ? p.models.map((m) => `- \`${m.file}\` (${m.mb} MB)`).join('\n') : '- none'}
${p.notebooks.length ? `\nNotebooks: ${p.notebooks.map((n) => `\`${n}\``).join(', ')}` : ''}

## AI/ML stack in use
${Object.entries(p.libs).map(([g, l]) => `- **${g}**: ${l.join(', ')}`).join('\n') || '- none detected'}

## Compute hints
GPU usage detected: ${p.compute.gpuHints ? 'yes' : 'no'} · Dockerfile: ${p.compute.dockerfile ? 'yes' : 'no'} · Cloud: ${p.compute.cloud.join(', ') || '—'}

${p.tables.map((t) => t.error ? `## Table \`${t.file}\`\nCould not parse: ${t.error}\n` : `## Table \`${t.file}\` (${t.mb} MB${t.sampled ? ', sampled' : ''})
${t.rows} rows × ${t.columns} columns · duplicates: ${t.duplicateRows} · time columns: ${t.timeColumns.join(', ') || '—'}
Candidate targets: ${t.targets.map((x) => `\`${x.column}\` → ${x.task}${x.imbalanced ? ` (imbalanced, minority ${x.minorityClassPct}%)` : ''}`).join(', ') || 'none detected — define the target explicitly'}

| Column | Type | Missing % | Distinct | Notes |
|---|---|---|---|---|
${t.cols.map((c) => `| ${c.name} | ${c.type} | ${c.missingPct} | ${c.distinct} | ${[c.role, c.type === 'numeric' ? `min ${c.min} · p50 ${c.p50} · max ${c.max}${c.outlierPct ? ` · outliers ${c.outlierPct}%` : ''}` : '', c.top ? c.top.slice(0, 3).map((x) => `${x.value} (${x.pct}%)`).join(', ') : '', c.avgLength ? `avg len ${c.avgLength}` : ''].filter(Boolean).join(' — ')} |`).join('\n')}

**Data issues:**
${t.issues.map((i) => `- ⚠️ ${i}`).join('\n') || '- none detected'}
`).join('\n')}`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
  const root = path.resolve(args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--')) ?? process.cwd());
  const out = path.resolve(root, opt('--out', '.aimaker'));
  const p = profileProject(root, { maxRows: Number(opt('--max-rows', 50000)) });
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'project-profile.json'), JSON.stringify(p, null, 2));
  fs.writeFileSync(path.join(out, 'project-profile.md'), toMarkdown(p));
  const dataKinds = Object.entries(p.data).filter(([, v]) => v.files).map(([k, v]) => `${k}:${v.files}`).join(' ') || 'none';
  console.log(`✔ Profiled ${p.files} files · data ${dataKinds} · tables ${p.tables.length} · models ${p.models.length} · stack ${Object.keys(p.libs).join(', ') || '—'}`);
  console.log(`→ ${path.relative(process.cwd(), path.join(out, 'project-profile.md'))}`);
}
