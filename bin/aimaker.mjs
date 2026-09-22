#!/usr/bin/env node
// The AI Maker installer — works for any AI coding tool.
//
//   node bin/aimaker.mjs init   [targetDir] [--tools all|claude,cursor,...] [--kit-dir .aimaker-kit]
//   node bin/aimaker.mjs update [targetDir]   (re-copies kit, refreshes instruction blocks)
//   node bin/aimaker.mjs remove [targetDir]   (removes kit + instruction blocks; leaves .aimaker/ outputs)
//   node bin/aimaker.mjs profile|research|decide|estimate ... (proxies to the kit scripts)
//
// Or without cloning:  npx github:Sarveshknocker/The-Ai-Maker- init
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const KIT_SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const START = '<!-- ai-maker:start -->';
const END = '<!-- ai-maker:end -->';

const [cmd = 'help', ...rest] = process.argv.slice(2);
const flag = (name, def) => { const i = rest.indexOf(name); return i >= 0 ? rest[i + 1] : def; };
const positional = rest.filter((a, i) => !a.startsWith('--') && !rest[i - 1]?.startsWith('--'));

// Each AI tool's instruction file. `wrap` adds tool-specific frontmatter; `block` = append marker block into a shared file.
const TOOLS = {
  agents: { file: 'AGENTS.md', block: true, note: 'Codex, Jules, Amp, Aider, Zed, OpenCode, Factory, Devin & other AGENTS.md readers' },
  claude: { file: 'CLAUDE.md', block: true, note: 'Claude Code (+ skills & agents copied into .claude/)' },
  gemini: { file: 'GEMINI.md', block: true, note: 'Gemini CLI' },
  copilot: { file: '.github/copilot-instructions.md', block: true, note: 'GitHub Copilot' },
  cursor: {
    file: '.cursor/rules/the-ai-maker.mdc', block: false, note: 'Cursor',
    wrap: (b) => `---\ndescription: The AI Maker kit — use when designing, choosing or adding AI/ML/GenAI/RL/simulation/digital-twin solutions to a project\nglobs:\nalwaysApply: false\n---\n\n${b}`,
  },
  windsurf: {
    file: '.windsurf/rules/the-ai-maker.md', block: false, note: 'Windsurf',
    wrap: (b) => `---\ntrigger: model_decision\ndescription: The AI Maker kit — use when designing, choosing or adding AI/ML/GenAI/RL/simulation/digital-twin solutions to a project\n---\n\n${b}`,
  },
  cline: { file: '.clinerules/the-ai-maker.md', block: false, note: 'Cline / Roo Code' },
};
const KIT_PARTS = ['skills', 'agents', 'adapters', 'README.md', 'LICENSE'];

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    e.isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
  }
}
const copyAny = (s, d) => {
  if (!fs.existsSync(s)) return;
  fs.statSync(s).isDirectory() ? copyDir(s, d) : (fs.mkdirSync(path.dirname(d), { recursive: true }), fs.copyFileSync(s, d));
};

function upsertBlock(file, body) {
  const block = `${START}\n${body.trim()}\n${END}\n`;
  const prev = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const re = new RegExp(`${START}[\\s\\S]*?${END}\\n?`);
  const next = re.test(prev) ? prev.replace(re, block) : (prev ? prev.replace(/\s*$/, '\n\n') : '') + block;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, next);
}
function removeBlock(file) {
  if (!fs.existsSync(file)) return false;
  const prev = fs.readFileSync(file, 'utf8');
  const next = prev.replace(new RegExp(`\\n*${START}[\\s\\S]*?${END}\\n?`), '\n');
  if (next === prev) return false;
  next.trim() ? fs.writeFileSync(file, next.replace(/\n+$/, '\n')) : fs.rmSync(file);
  return true;
}

function resolveTools(spec) {
  if (!spec || spec === 'all') return Object.keys(TOOLS);
  const list = spec.split(',').map((s) => s.trim()).filter(Boolean);
  const bad = list.filter((t) => !TOOLS[t]);
  if (bad.length) { console.error(`Unknown tool(s): ${bad.join(', ')}. Valid: ${Object.keys(TOOLS).join(', ')}`); process.exit(2); }
  return list;
}

function readManifest(target) {
  try { return JSON.parse(fs.readFileSync(path.join(target, flag('--kit-dir', '.aimaker-kit'), 'manifest.json'), 'utf8')); } catch { return null; }
}

function install(target, { tools, kitDir }) {
  if (path.resolve(target) === KIT_SRC) { console.error('Refusing to install the kit into itself. Pass a target project directory.'); process.exit(2); }
  const kitAbs = path.join(target, kitDir);
  const kitRel = kitDir.split(path.sep).join('/');
  fs.rmSync(kitAbs, { recursive: true, force: true });
  for (const p of KIT_PARTS) copyAny(path.join(KIT_SRC, p), path.join(kitAbs, p));
  const version = JSON.parse(fs.readFileSync(path.join(KIT_SRC, 'package.json'), 'utf8')).version;

  const entry = fs.readFileSync(path.join(KIT_SRC, 'adapters', 'entry.md'), 'utf8').replaceAll('{{KIT}}', kitRel);
  const written = [];
  for (const t of tools) {
    const def = TOOLS[t];
    const file = path.join(target, def.file);
    if (def.block) upsertBlock(file, entry);
    else { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, (def.wrap ? def.wrap(entry) : entry)); }
    written.push(`${def.file}  (${def.note})`);
  }
  if (tools.includes('claude')) {
    // Native Claude Code discovery: skills auto-trigger from their descriptions, agents become sub-agents.
    for (const s of fs.readdirSync(path.join(KIT_SRC, 'skills'))) {
      const dst = path.join(target, '.claude', 'skills', s);
      fs.rmSync(dst, { recursive: true, force: true });
      copyDir(path.join(KIT_SRC, 'skills', s), dst);
    }
    for (const a of fs.readdirSync(path.join(KIT_SRC, 'agents'))) copyAny(path.join(KIT_SRC, 'agents', a), path.join(target, '.claude', 'agents', a));
    written.push('.claude/skills/*, .claude/agents/*  (Claude Code native)');
  }
  fs.writeFileSync(path.join(kitAbs, 'manifest.json'), JSON.stringify({ version, kitDir: kitRel, tools, installedAt: new Date().toISOString() }, null, 2));

  console.log(`\n✔ The AI Maker ${version} installed into ${target}`);
  console.log(`  Kit: ${kitRel}/`);
  for (const w of written) console.log(`  + ${w}`);
  console.log(`\nNext: open the project in your AI tool and say, e.g.\n  "Use The AI Maker to design the most effective AI system for this project"\n`);
}

function remove(target) {
  const m = readManifest(target);
  const kitDir = m?.kitDir ?? '.aimaker-kit';
  const tools = m?.tools ?? Object.keys(TOOLS);
  for (const t of tools) {
    const file = path.join(target, TOOLS[t].file);
    if (TOOLS[t].block) removeBlock(file) && console.log(`  - block removed from ${TOOLS[t].file}`);
    else if (fs.existsSync(file)) { fs.rmSync(file); console.log(`  - ${TOOLS[t].file}`); }
  }
  if (tools.includes('claude')) {
    for (const s of fs.readdirSync(path.join(KIT_SRC, 'skills'))) fs.rmSync(path.join(target, '.claude', 'skills', s), { recursive: true, force: true });
    for (const a of fs.readdirSync(path.join(KIT_SRC, 'agents'))) fs.rmSync(path.join(target, '.claude', 'agents', a), { force: true });
  }
  fs.rmSync(path.join(target, kitDir), { recursive: true, force: true });
  console.log(`✔ Removed The AI Maker from ${target} (kept .aimaker/ outputs).`);
}

function runScript(rel, args) {
  const r = spawnSync(process.execPath, [path.join(KIT_SRC, rel), ...args], { stdio: 'inherit' });
  process.exit(r.status ?? 1);
}

const target = path.resolve(positional[0] ?? process.cwd());
switch (cmd) {
  case 'init':
    install(target, { tools: resolveTools(flag('--tools', 'all')), kitDir: flag('--kit-dir', '.aimaker-kit') });
    break;
  case 'update': {
    const m = readManifest(target);
    if (!m) { console.error('Kit not installed here — run init first.'); process.exit(1); }
    install(target, { tools: m.tools, kitDir: m.kitDir });
    break;
  }
  case 'remove':
    remove(target);
    break;
  case 'profile': runScript('skills/aimaker-discover/scripts/profile.mjs', rest); break;
  case 'research': runScript('skills/aimaker-research/scripts/sota.mjs', rest); break;
  case 'decide': runScript('skills/aimaker-architect/scripts/decide.mjs', rest); break;
  case 'estimate': runScript('skills/aimaker-architect/scripts/estimate.mjs', rest); break;
  default:
    console.log(`The AI Maker — engineer the most effective domain-specific AI system for any project

Commands:
  init     [dir] [--tools all|${Object.keys(TOOLS).join(',')}] [--kit-dir .aimaker-kit]
  update   [dir]             refresh kit + instruction files
  remove   [dir]             uninstall (keeps .aimaker/ outputs)
  profile  [dir]             project & data profile → .aimaker/project-profile.{md,json}
  research "<query>"         state-of-the-art collector → .aimaker/research/<tag>.{md,json}
           [--queries-file f] [--sources arxiv,hf-papers,openalex,github,huggingface,hf-datasets,hn,...] [--limit 8] [--tag name]
  decide   [candidates.json] weighted architecture decision + Monte-Carlo robustness → .aimaker/DECISION.md
  estimate <train|finetune|inference|api|throughput> [--options]   compute / memory / cost planning`);
}
