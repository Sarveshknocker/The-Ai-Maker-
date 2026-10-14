#!/usr/bin/env node
// The AI Maker — live hosted-model catalog: prices, context windows and capabilities, so cost estimates never rely on
// remembered (stale) numbers. Data: the community-maintained LiteLLM price list, fetched and cached for 24 hours.
//
//   node models.mjs find "<words>" [--provider anthropic] [--min-context 100000] [--vision] [--tools] [--reasoning] [--limit 20] [--json]
//   node models.mjs cost --models id1,id2,... --requests-per-day 5000 --in-tokens 1200 --out-tokens 300
//                        [--cache-hit 0.5] [--batch] [--out .aimaker] [--json]
//   node models.mjs show <model-id>
//
// Always confirm the final choice on the vendor's pricing page and cite it: community data can lag a price change.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const URL_ = () => process.env.AIMAKER_MODELS_URL ?? 'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json';
const CACHE = () => path.resolve(process.env.AIMAKER_CACHE ?? '.aimaker/cache', 'models.json');
const DAY = 86_400_000;

export async function loadCatalog({ offline = false, fetchImpl = globalThis.fetch } = {}) {
  const file = CACHE();
  let cached = null;
  try { cached = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
  if (cached && (offline || Date.now() - cached.fetchedAt < DAY)) return cached;
  if (offline) throw new Error('No cached model catalog; run once online.');
  try {
    const r = await fetchImpl(URL_(), { headers: { 'user-agent': 'the-ai-maker' }, signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const raw = await r.json();
    const data = { fetchedAt: Date.now(), source: URL_(), models: normalise(raw) };
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data));
    return data;
  } catch (e) {
    if (cached) return { ...cached, stale: `refresh failed (${e.message}); using cache from ${new Date(cached.fetchedAt).toISOString().slice(0, 10)}` };
    throw new Error(`Model catalog unavailable (${e.message}). Look prices up on the vendor pages instead.`);
  }
}

/** Keeps chat/completion models with token prices; prices become USD per 1M tokens. */
export function normalise(raw) {
  const per1M = (x) => (typeof x === 'number' ? Math.round(x * 1e6 * 10000) / 10000 : null);
  const out = [];
  for (const [id, m] of Object.entries(raw)) {
    if (id === 'sample_spec' || !m || typeof m !== 'object') continue;
    if (m.mode && !['chat', 'completion', 'responses'].includes(m.mode)) continue;
    const input = per1M(m.input_cost_per_token); const output = per1M(m.output_cost_per_token);
    if (input === null || output === null) continue;
    out.push({
      id, provider: m.litellm_provider ?? id.split('/')[0], input, output,
      cachedInput: per1M(m.cache_read_input_token_cost), batchInput: per1M(m.input_cost_per_token_batches), batchOutput: per1M(m.output_cost_per_token_batches),
      context: m.max_input_tokens ?? m.max_tokens ?? null, maxOutput: m.max_output_tokens ?? null,
      vision: !!m.supports_vision, tools: !!m.supports_function_calling, reasoning: !!m.supports_reasoning, jsonSchema: !!m.supports_response_schema,
      deprecation: m.deprecation_date ?? null,
    });
  }
  return out;
}

export function find(models, words = '', { provider, minContext, vision, tools, reasoning, limit = 20, includeFree = false } = {}) {
  const terms = String(words).toLowerCase().split(/\s+/).filter(Boolean);
  return models
    .filter((m) => terms.every((t) => `${m.id} ${m.provider}`.toLowerCase().includes(t)))
    .filter((m) => (!provider || m.provider.toLowerCase() === provider.toLowerCase()) && (!minContext || (m.context ?? 0) >= minContext)
      && (!vision || m.vision) && (!tools || m.tools) && (!reasoning || m.reasoning))
    .filter((m) => !m.deprecation || new Date(m.deprecation) > new Date())
    .filter((m) => includeFree || m.input + m.output > 0) // $0 entries are previews/free tiers with rate limits, not production prices
    .sort((a, b) => a.input + a.output - (b.input + b.output))
    .slice(0, limit);
}

/** Monthly cost per model for the same workload. cacheHit = share of input tokens served from the prompt cache. */
export function cost(models, ids, { requestsPerDay, inTokens, outTokens, cacheHit = 0, batch = false }) {
  if (![requestsPerDay, inTokens, outTokens].every((x) => typeof x === 'number' && x >= 0)) throw new Error('cost needs --requests-per-day --in-tokens --out-tokens');
  return ids.map((id) => {
    const m = models.find((x) => x.id === id) ?? models.find((x) => x.id.endsWith(`/${id}`));
    if (!m) return { id, error: 'not in catalog (check the id with `find`)' };
    const inP = batch && m.batchInput !== null ? m.batchInput : m.input;
    const outP = batch && m.batchOutput !== null ? m.batchOutput : m.output;
    const cachedP = m.cachedInput ?? inP;
    const perRequest = (inTokens * (1 - cacheHit) * inP + inTokens * cacheHit * cachedP + outTokens * outP) / 1e6;
    return { id: m.id, provider: m.provider, inPrice: inP, outPrice: outP, cachedPrice: m.cachedInput, context: m.context, perRequest: +perRequest.toFixed(6), perMonth: Math.round(perRequest * requestsPerDay * 30), fitsContext: m.context === null || inTokens + outTokens <= m.context };
  }).sort((a, b) => (a.perMonth ?? Infinity) - (b.perMonth ?? Infinity));
}

const money = (x) => (x === null || x === undefined ? '—' : `$${Number(x).toLocaleString('en-US', { maximumFractionDigits: 4 })}`);

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = process.argv.slice(2);
  const flag = (n, d) => { const i = args.indexOf(`--${n}`); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
  const has = (n) => { const i = args.indexOf(`--${n}`); if (i < 0) return false; args.splice(i, 1); return true; };
  const json = has('json'); const offline = has('offline');
  const opts = { provider: flag('provider'), minContext: Number(flag('min-context', 0)), vision: has('vision'), tools: has('tools'), reasoning: has('reasoning'), limit: Number(flag('limit', 20)), includeFree: has('include-free') };
  const costOpts = { ids: flag('models', ''), requestsPerDay: Number(flag('requests-per-day')), inTokens: Number(flag('in-tokens')), outTokens: Number(flag('out-tokens')), cacheHit: Number(flag('cache-hit', 0)), batch: has('batch'), out: flag('out', '.aimaker') };
  const [cmd, ...rest] = args;
  try {
    const cat = await loadCatalog({ offline });
    const asOf = `${new Date(cat.fetchedAt).toISOString().slice(0, 10)}${cat.stale ? ` (${cat.stale})` : ''}`;
    if (cmd === 'find') {
      const r = find(cat.models, rest.join(' '), opts);
      if (json) console.log(JSON.stringify(r, null, 2));
      else {
        console.log(`${r.length} model(s) · prices USD per 1M tokens · catalog as of ${asOf}`);
        for (const m of r) console.log(`${m.id.padEnd(48)} in ${money(m.input).padEnd(9)} out ${money(m.output).padEnd(9)} ctx ${String(m.context ?? '?').padEnd(8)} ${[m.vision && 'vision', m.tools && 'tools', m.reasoning && 'reasoning', m.jsonSchema && 'json-schema'].filter(Boolean).join(',')}`);
      }
    } else if (cmd === 'cost') {
      const ids = costOpts.ids.split(',').map((s) => s.trim()).filter(Boolean);
      if (ids.length < 1) throw new Error('--models id1,id2 required');
      const r = cost(cat.models, ids, costOpts);
      const md = `# Model cost comparison\n\n_Workload: ${costOpts.requestsPerDay.toLocaleString('en-US')} requests/day · ${costOpts.inTokens} in / ${costOpts.outTokens} out tokens · cache hit ${Math.round(costOpts.cacheHit * 100)}%${costOpts.batch ? ' · batch pricing' : ''}. Prices from the LiteLLM community catalog as of ${asOf}; confirm on vendor pricing pages before committing._\n\n| Model | In $/1M | Out $/1M | Cached in $/1M | Context | Per request | Per month | Fits context |\n|---|---|---|---|---|---|---|---|\n${r.map((x) => x.error ? `| ${x.id} | ${x.error} |||||||` : `| ${x.id} | ${money(x.inPrice)} | ${money(x.outPrice)} | ${money(x.cachedPrice)} | ${x.context ?? '?'} | ${money(x.perRequest)} | ${money(x.perMonth)} | ${x.fitsContext ? 'yes' : '**no**'} |`).join('\n')}\n`;
      fs.mkdirSync(costOpts.out, { recursive: true });
      fs.writeFileSync(path.join(costOpts.out, 'MODEL_COSTS.md'), md);
      if (json) console.log(JSON.stringify(r, null, 2)); else { console.log(md); console.log(`→ ${path.join(costOpts.out, 'MODEL_COSTS.md')}`); }
    } else if (cmd === 'show' && rest[0]) {
      const m = cat.models.find((x) => x.id === rest[0]);
      if (!m) throw new Error(`${rest[0]} not found`);
      console.log(JSON.stringify({ ...m, catalogAsOf: asOf }, null, 2));
    } else { console.error('usage: models.mjs find "<words>" [--provider p --min-context n --vision --tools --reasoning] | cost --models a,b --requests-per-day N --in-tokens N --out-tokens N [--cache-hit 0.5 --batch] | show <id>'); process.exit(2); }
  } catch (e) { console.error(`✖ ${e.message}`); process.exit(1); }
}
