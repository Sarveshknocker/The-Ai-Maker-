#!/usr/bin/env node
// The AI Maker installer — works for any AI coding tool.
//
//   node bin/aimaker.mjs init   [targetDir] [--tools all|claude,cursor,...] [--kit-dir .aimaker-kit] [--force]
//   node bin/aimaker.mjs update [targetDir]   (re-copies kit, refreshes instruction blocks)
//   node bin/aimaker.mjs remove [targetDir]   (removes only what the kit installed; leaves .aimaker/ outputs)
//   node bin/aimaker.mjs profile|research|decide|estimate ... (proxies to the kit scripts)
//
// Or without cloning:  npx github:Sarveshknocker/The-Ai-Maker- init
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { installerCommand } from './kit-installer.mjs';

const KIT_SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KIT = {
  id: 'the-ai-maker',
  name: 'The AI Maker',
  marker: 'ai-maker',
  kitDir: '.aimaker-kit',
  agentPrefix: 'aimaker',
  parts: ['skills', 'agents', 'adapters', 'README.md', 'LICENSE'],
  ruleFile: 'the-ai-maker',
  description: 'The AI Maker kit — use when designing, choosing or adding AI/ML/GenAI/RL/simulation/digital-twin solutions to a project',
  next: 'Next: open the project in your AI tool and say, e.g.\n  "Use The AI Maker to design the most effective AI system for this project"',
  kept: '.aimaker/ outputs',
  legacyPaths: {
    '.claude/agents/evaluation-lead.md': '.claude/agents/aimaker-evaluation-lead.md',
    '.claude/agents/problem-analyst.md': '.claude/agents/aimaker-problem-analyst.md',
    '.claude/agents/research-scout.md': '.claude/agents/aimaker-research-scout.md',
    '.claude/agents/solution-architect.md': '.claude/agents/aimaker-solution-architect.md',
  },
  kitSrc: KIT_SRC,
};

const [cmd = 'help', ...rest] = process.argv.slice(2);
const flag = (name, def) => { const i = rest.indexOf(name); return i >= 0 ? rest[i + 1] : def; };
const positional = rest.filter((a, i) => !a.startsWith('--') && !rest[i - 1]?.startsWith('--'));

if (installerCommand(KIT, cmd, rest)) process.exit(0);

function runScript(rel, args) {
  const r = spawnSync(process.execPath, [path.join(KIT_SRC, rel), ...args], { stdio: 'inherit' });
  process.exit(r.status ?? 1);
}

switch (cmd) {
  case 'profile': runScript('skills/aimaker-discover/scripts/profile.mjs', rest); break;
  case 'research': runScript('skills/aimaker-research/scripts/sota.mjs', rest); break;
  case 'decide': runScript('skills/aimaker-architect/scripts/decide.mjs', rest); break;
  case 'estimate': runScript('skills/aimaker-architect/scripts/estimate.mjs', rest); break;
  case 'models': runScript('skills/aimaker-architect/scripts/models.mjs', rest); break;
  case 'redteam': runScript('skills/aimaker-evaluate/scripts/redteam.mjs', rest); break;
  default:
    console.log(`The AI Maker — engineer the most effective domain-specific AI system for any project

Commands:
  init     [dir] [--tools all|agents,claude,gemini,copilot,cursor,windsurf,cline] [--kit-dir .aimaker-kit] [--force]
  update   [dir]             refresh kit + instruction files
  remove   [dir]             uninstall: only what the kit installed, restores backups (keeps .aimaker/ outputs)
  profile  [dir]             project & data profile → .aimaker/project-profile.{md,json}
  research "<query>"         state-of-the-art collector → .aimaker/research/<tag>.{md,json}
           [--queries-file f] [--sources cases,arxiv,hf-papers,openalex,github,huggingface,hf-datasets,hn,...] [--limit 8] [--tag name]
  decide   [candidates.json] weighted architecture decision + Monte-Carlo robustness → .aimaker/DECISION.md
  estimate <train|finetune|inference|api|throughput|sample> [--options]   compute / memory / cost / sample-size planning
  models   find "<words>" | cost --models a,b --requests-per-day N --in-tokens N --out-tokens N   live model prices & limits
  redteam  --app "<one line>" [--tools a,b] [--pii x]   defensive LLM test set for eval_harness.py

The installer never overwrites files it did not create; --force backs them up first and remove restores them.`);
}
