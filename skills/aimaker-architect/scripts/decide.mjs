#!/usr/bin/env node
// The AI Maker — architecture decision engine.
// Weighted multi-criteria comparison of candidate AI approaches + hard constraints + Monte-Carlo weight sensitivity.
//
// Input (.aimaker/candidates.json):
// {
//   "profile": "balanced" | "safety-critical" | "realtime-edge" | "regulated" | "startup-mvp" | "frontier-performance",
//   "weights": { ...optional overrides... },
//   "constraints": { "latency": 3, "dataFit": 3 },          // disqualify candidates scoring below these minimums
//   "candidates": [ { "id": "A1", "name": "GBDT on engineered features", "scores": { <criterion>: 1-5 }, "notes": "..." } ]
// }
// Criteria (5 = best): objectiveFit, dataFit, performance, robustness, latency, cost, explainability, maintainability, timeToValue, risk
// (latency 5 = fastest; cost 5 = cheapest; risk 5 = lowest risk)
// Usage: node decide.mjs [candidates.json] [--out .aimaker] [--iterations 2000] [--json]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const CRITERIA = ['objectiveFit', 'dataFit', 'performance', 'robustness', 'latency', 'cost', 'explainability', 'maintainability', 'timeToValue', 'risk'];

export const PROFILES = {
  balanced:               { objectiveFit: 20, dataFit: 14, performance: 14, robustness: 10, latency: 7, cost: 8, explainability: 6, maintainability: 7, timeToValue: 7, risk: 7 },
  'safety-critical':      { objectiveFit: 16, dataFit: 10, performance: 12, robustness: 18, latency: 6, cost: 4, explainability: 12, maintainability: 6, timeToValue: 3, risk: 13 },
  'realtime-edge':        { objectiveFit: 16, dataFit: 10, performance: 12, robustness: 10, latency: 18, cost: 12, explainability: 4, maintainability: 7, timeToValue: 5, risk: 6 },
  regulated:              { objectiveFit: 16, dataFit: 10, performance: 10, robustness: 12, latency: 4, cost: 6, explainability: 18, maintainability: 8, timeToValue: 4, risk: 12 },
  'startup-mvp':          { objectiveFit: 18, dataFit: 12, performance: 10, robustness: 6, latency: 6, cost: 14, explainability: 3, maintainability: 9, timeToValue: 17, risk: 5 },
  'frontier-performance': { objectiveFit: 18, dataFit: 12, performance: 24, robustness: 12, latency: 6, cost: 5, explainability: 3, maintainability: 5, timeToValue: 5, risk: 10 },
};

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function resolveWeights(spec = {}) {
  const base = PROFILES[spec.profile ?? 'balanced'];
  if (!base) throw new Error(`Unknown profile "${spec.profile}". Valid: ${Object.keys(PROFILES).join(', ')}`);
  const w = { ...base, ...(spec.weights ?? {}) };
  const bad = Object.keys(w).filter((k) => !CRITERIA.includes(k));
  if (bad.length) throw new Error(`Unknown criteria in weights: ${bad.join(', ')}`);
  return w;
}

const total = (w, s) => { const sum = CRITERIA.reduce((a, k) => a + w[k], 0); return (CRITERIA.reduce((a, k) => a + w[k] * s[k], 0) / (5 * sum)) * 100; };

export function decide(spec, { iterations = 2000, jitter = 0.3, seed = 42 } = {}) {
  const weights = resolveWeights(spec);
  const cands = spec.candidates ?? [];
  if (cands.length < 2) throw new Error('Provide at least 2 candidate approaches to compare (exploring alternatives is mandatory).');
  for (const c of cands) {
    const missing = CRITERIA.filter((k) => typeof c.scores?.[k] !== 'number' || c.scores[k] < 1 || c.scores[k] > 5);
    if (missing.length) throw new Error(`${c.id ?? c.name}: missing/invalid scores (1–5): ${missing.join(', ')}`);
  }
  const constraints = spec.constraints ?? {};
  const scored = cands.map((c) => {
    const violations = Object.entries(constraints).filter(([k, min]) => c.scores[k] < min).map(([k, min]) => `${k} ${c.scores[k]} < ${min}`);
    return { ...c, score: Math.round(total(weights, c.scores) * 10) / 10, eligible: violations.length === 0, violations };
  });
  const eligible = scored.filter((c) => c.eligible);

  // Monte-Carlo: perturb each weight by ±jitter and count winners among eligible candidates.
  const wins = Object.fromEntries(eligible.map((c) => [c.id ?? c.name, 0]));
  const rand = rng(seed);
  for (let i = 0; i < iterations && eligible.length; i++) {
    const w = Object.fromEntries(CRITERIA.map((k) => [k, Math.max(0, weights[k] * (1 + (rand() * 2 - 1) * jitter))]));
    let best = null, bestScore = -1;
    for (const c of eligible) { const s = total(w, c.scores); if (s > bestScore) { bestScore = s; best = c; } }
    wins[best.id ?? best.name]++;
  }
  for (const c of scored) c.winProbability = c.eligible ? Math.round((wins[c.id ?? c.name] / Math.max(1, iterations)) * 1000) / 10 : 0;

  const ranked = scored.sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.score - a.score || b.winProbability - a.winProbability);
  const winner = ranked.find((c) => c.eligible) ?? null;
  const runnerUp = ranked.filter((c) => c.eligible)[1] ?? null;
  const verdict = !winner ? 'No candidate satisfies the hard constraints — relax constraints or design a new approach.'
    : winner.winProbability >= 70 ? 'Robust winner: stays best under ±30% weight changes.'
    : 'Close call: the winner depends on priorities — prototype the top 2 and decide on measured results.';
  // Where does the winner lose to the runner-up? (informs the hybrid / mitigation design)
  const tradeoffs = winner && runnerUp ? CRITERIA.filter((k) => runnerUp.scores[k] > winner.scores[k]).map((k) => `${k}: ${runnerUp.id ?? runnerUp.name} ${runnerUp.scores[k]} vs ${winner.scores[k]}`) : [];
  return { profile: spec.profile ?? 'balanced', weights, constraints, ranked, winner: winner?.id ?? winner?.name ?? null, verdict, tradeoffs, iterations };
}

export function toMarkdown(d) {
  const head = CRITERIA.map((k) => k.replace(/([A-Z])/g, ' $1').toLowerCase());
  return `# Architecture decision matrix

Profile **${d.profile}** · weights: ${CRITERIA.map((k) => `${k} ${d.weights[k]}`).join(' · ')}
${Object.keys(d.constraints).length ? `Hard constraints (minimum scores): ${Object.entries(d.constraints).map(([k, v]) => `${k} ≥ ${v}`).join(', ')}` : 'No hard constraints.'}

| Rank | Candidate | Score | Win prob. | ${head.join(' | ')} | Status |
|---|---|---|---|${CRITERIA.map(() => '---').join('|')}|---|
${d.ranked.map((c, i) => `| ${i + 1} | ${c.id ? `${c.id} · ` : ''}${c.name} | **${c.score}** | ${c.winProbability}% | ${CRITERIA.map((k) => c.scores[k]).join(' | ')} | ${c.eligible ? '✅' : `❌ ${c.violations.join('; ')}`} |`).join('\n')}

**Verdict:** ${d.verdict}
${d.tradeoffs.length ? `\n**Where the runner-up is stronger** (consider borrowing in a hybrid or mitigating): ${d.tradeoffs.join(' · ')}` : ''}

_Win probability = share of ${d.iterations} Monte-Carlo runs (weights perturbed ±30%) in which the candidate ranks first. Scores are judgements — each must be justified with evidence in ARCHITECTURE_OPTIONS.md._
`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
  const file = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--')) ?? '.aimaker/candidates.json';
  let spec;
  try { spec = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { console.error(`Cannot read ${file}: ${e.message}`); process.exit(2); }
  let d;
  try { d = decide(spec, { iterations: Number(opt('--iterations', 2000)) }); } catch (e) { console.error(e.message); process.exit(1); }
  if (args.includes('--json')) { console.log(JSON.stringify(d, null, 2)); process.exit(0); }
  const out = path.resolve(opt('--out', '.aimaker'));
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'DECISION.md'), toMarkdown(d));
  for (const [i, c] of d.ranked.entries()) console.log(`${i + 1}. ${String(c.score).padStart(5)}  win ${String(c.winProbability).padStart(5)}%  ${c.eligible ? ' ' : '✖'} ${c.id ?? ''} ${c.name}${c.violations.length ? `  (${c.violations.join('; ')})` : ''}`);
  console.log(`\n${d.verdict}\n→ ${path.relative(process.cwd(), path.join(out, 'DECISION.md'))}`);
}
