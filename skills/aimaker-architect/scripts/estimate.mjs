#!/usr/bin/env node
// The AI Maker — compute, memory and cost estimator (order-of-magnitude planning, not quotes).
// No vendor prices are hard-coded: pass current prices you verified (they change often).
//
//   node estimate.mjs train      --params 7e9 --tokens 2e11 [--gpu-tflops 989 --mfu 0.4 --gpus 8 --gpu-hour-price 3]
//   node estimate.mjs finetune   --params 8e9 --method full|lora|qlora [--seq 4096 --batch 4]
//   node estimate.mjs inference  --params 8e9 --bits 16|8|4 [--layers 32 --kv-heads 8 --head-dim 128 --context 8192 --batch 1]
//   node estimate.mjs api        --requests-per-day 5000 --in-tokens 1200 --out-tokens 300 --in-price 3 --out-price 15 [--cache-hit 0.5 --cached-price 0.3]
//   node estimate.mjs throughput --tokens-per-second 60 --out-tokens 300 --concurrency 16
//   node estimate.mjs sample     --type ci --p 0.9 --margin 0.03            (golden-set size)
//   node estimate.mjs sample     --type ab --p0 0.10 --mde 0.02 [--alpha 0.05 --power 0.8 --traffic-per-day 4000]
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GiB = 1024 ** 3;
const r1 = (x) => Math.round(x * 10) / 10;
const fmt = (x) => (x >= 1e6 ? x.toExponential(2) : x !== 0 && Math.abs(x) < 1 ? Number(x.toPrecision(3)).toString() : r1(x).toLocaleString('en-US'));

/** Dense transformer training compute ≈ 6 · N · D FLOPs (Kaplan et al. 2020; Hoffmann et al. 2022). */
export function train({ params, tokens, gpuTflops = 989, mfu = 0.4, gpus = 8, gpuHourPrice }) {
  const flops = 6 * params * tokens;
  const gpuHours = flops / (gpuTflops * 1e12 * mfu) / 3600;
  return {
    flops, gpuHours: r1(gpuHours), wallClockDays: r1(gpuHours / gpus / 24),
    cost: gpuHourPrice ? Math.round(gpuHours * gpuHourPrice) : null,
    computeOptimalTokens: 20 * params, // Chinchilla heuristic: ~20 tokens per parameter
    notes: ['gpuTflops = dense BF16 peak of your accelerator (check the datasheet)', 'MFU 0.3–0.5 is typical for well-tuned training', 'Fine-tuning uses the same formula with D = fine-tuning tokens'],
  };
}

/** Rule-of-thumb GPU memory for fine-tuning (weights + grads + optimizer; activations added coarsely). */
export function finetune({ params, method = 'lora', seq = 2048, batch = 1 }) {
  const bytesPerParam = { full: 16, lora: 2.2, qlora: 0.7 }[method]; // full: bf16 weights+grads + fp32 Adam states & master weights
  if (!bytesPerParam) throw new Error('method must be full, lora or qlora');
  const base = params * bytesPerParam;
  const activations = params * 0.02 * (seq / 2048) * batch * (method === 'full' ? 2 : 1); // coarse; gradient checkpointing reduces it a lot
  const totalGiB = (base + activations) / GiB;
  return { method, gib: r1(totalGiB), notes: ['Coarse estimate — measure with a short dry run', 'Use gradient checkpointing, FlashAttention and paged optimizers to cut memory', 'full = mixed-precision AdamW (~16 bytes/param)'] };
}

/** Inference memory = weights + KV cache (+ ~10% runtime overhead). */
export function inference({ params, bits = 16, layers, kvHeads, headDim, context = 4096, batch = 1, kvBits = 16 }) {
  const weights = params * (bits / 8);
  const kv = layers && kvHeads && headDim ? 2 * layers * kvHeads * headDim * context * batch * (kvBits / 8) : 0;
  const total = (weights + kv) * 1.1;
  return { weightsGiB: r1(weights / GiB), kvCacheGiB: r1(kv / GiB), totalGiB: r1(total / GiB), notes: kv ? [] : ['Pass --layers --kv-heads --head-dim (from the model config) to include the KV cache'] };
}

/** Hosted-model API cost with optional prompt caching. Prices are per 1M tokens, supplied by the caller. */
export function api({ requestsPerDay, inTokens, outTokens, inPrice, outPrice, cacheHit = 0, cachedPrice }) {
  if ([requestsPerDay, inTokens, outTokens, inPrice, outPrice].some((x) => typeof x !== 'number' || Number.isNaN(x))) throw new Error('api needs --requests-per-day --in-tokens --out-tokens --in-price --out-price (USD per 1M tokens)');
  const cp = cachedPrice ?? inPrice;
  const inCost = (inTokens * (1 - cacheHit) * inPrice + inTokens * cacheHit * cp) / 1e6;
  const perRequest = inCost + (outTokens * outPrice) / 1e6;
  return { perRequest: Math.round(perRequest * 1e6) / 1e6, perDay: r1(perRequest * requestsPerDay), perMonth: Math.round(perRequest * requestsPerDay * 30), per1kRequests: r1(perRequest * 1000) };
}

/** Inverse standard normal CDF (Acklam's rational approximation, |error| < 1.2e-9). */
export function zQuantile(p) {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const lo = 0.02425;
  if (p <= 0 || p >= 1) throw new Error('p must be in (0,1)');
  if (p < lo) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p > 1 - lo) return -zQuantile(1 - p);
  const q = p - 0.5; const r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

/**
 * Sample sizes for evaluation planning.
 *  type=ci : golden-set size so a measured rate p is known within ± margin.  n = z² p(1-p) / margin²
 *  type=ab : per-arm size to detect an absolute change `mde` from baseline rate p0 (two-sided two-proportion z-test),
 *            plus test duration when traffic-per-day is given.
 */
export function sample({ type = 'ci', p = 0.5, margin = 0.05, conf = 0.95, p0, mde, alpha = 0.05, power = 0.8, trafficPerDay, arms = 2 }) {
  if (type === 'ci') {
    if (!(margin > 0 && margin < 1)) throw new Error('ci needs --margin between 0 and 1 (e.g. 0.03 for ±3 points)');
    const z = zQuantile(1 - (1 - conf) / 2);
    return { type, n: Math.ceil((z * z * p * (1 - p)) / (margin * margin)), notes: [`±${margin * 100} points at ${conf * 100}% confidence around p=${p}; use p=0.5 when unknown (largest n)`, 'Per slice: every slice you will report needs its own n'] };
  }
  if (type === 'ab') {
    if (typeof p0 !== 'number' || typeof mde !== 'number' || mde === 0) throw new Error('ab needs --p0 (baseline rate) and --mde (absolute change to detect)');
    const p1 = p0 + mde; if (p1 <= 0 || p1 >= 1) throw new Error('p0 + mde must stay within (0,1)');
    const za = zQuantile(1 - alpha / 2); const zb = zQuantile(power); const pbar = (p0 + p1) / 2;
    const n = Math.ceil((za * Math.sqrt(2 * pbar * (1 - pbar)) + zb * Math.sqrt(p0 * (1 - p0) + p1 * (1 - p1))) ** 2 / (mde * mde));
    return { type, perArm: n, total: n * arms, days: trafficPerDay ? Math.ceil((n * arms) / trafficPerDay) : null, notes: ['Pre-register the metric, mde and stopping rule; do not peek and stop early', 'Run at least one full weekly cycle even if n is reached sooner'] };
  }
  throw new Error('type must be ci or ab');
}

/** Latency & capacity sketch for generative serving. */
export function throughput({ tokensPerSecond, outTokens, concurrency = 1, ttftMs = 300 }) {
  const genSeconds = outTokens / tokensPerSecond;
  const latency = ttftMs / 1000 + genSeconds;
  return { latencySeconds: r1(latency), requestsPerMinute: Math.round((60 / latency) * concurrency) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [cmd, ...rest] = process.argv.slice(2);
  const o = {};
  for (let i = 0; i < rest.length; i++) if (rest[i].startsWith('--')) { const k = rest[i].slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase()); const v = rest[i + 1]; o[k] = v !== undefined && !v.startsWith('--') ? (isNaN(Number(v)) ? v : Number(v)) : true; }
  const fns = { train, finetune, inference, api, throughput, sample };
  if (!fns[cmd]) { console.error('Usage: node estimate.mjs <train|finetune|inference|api|throughput|sample> [--options]  (see header comment)'); process.exit(2); }
  try {
    const res = fns[cmd](o);
    for (const [k, v] of Object.entries(res)) if (k !== 'notes') console.log(`${k.padEnd(22)} ${typeof v === 'number' ? fmt(v) : v}`);
    for (const n of res.notes ?? []) console.log(`  · ${n}`);
  } catch (e) { console.error(e.message); process.exit(1); }
}
