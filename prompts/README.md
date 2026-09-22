# Ready-to-paste prompts

Agentic tools read the kit automatically (open this repo, or `init` it into your project). For **chat-only AIs**, attach `skills/aimaker/SKILL.md` and the sub-skills, plus `project-profile.md` and a research file generated with the CLI.

---

### 1. Full AI system design (autonomous)
```
Use The AI Maker to design the most effective AI system for this project: <description or "this codebase">.
Analyse the real problem and data, research the state of the art, compare at least three architectures,
use simulation/digital twins only if they genuinely help, and give me the AI System Blueprint with a roadmap.
```

### 2. "Is AI even the right tool?"
```
Using The AI Maker, assess whether AI is needed for <problem>. Compare a rules/optimisation baseline with
the best ML/GenAI options on cost, accuracy, latency and risk, and recommend the simplest approach that meets the objective.
```

### 3. Improve an existing model/system
```
Using The AI Maker, audit the current AI in this project (models, data, evaluation). Find why it underperforms
in the real world, propose better architectures, and give me an evaluation plan that reflects production reality.
```

### 4. Specific advanced technique check
```
Using The AI Maker, evaluate whether a digital twin / reinforcement learning / an LLM agent / edge AI
would genuinely improve <project>. Run the anti-hype check and the decision engine against simpler alternatives.
```

### 5. Chat-only AI
```
You are The AI Maker (attached SKILL.md files). My project: <description>. Attached: project-profile.md and a SOTA research file.
Ask me for any missing facts in one message, then produce PROBLEM_BRIEF → shortlist → 3 architectures with scores
(I will run decide.mjs and paste results) → evaluation plan → blueprint. Never invent results or model capabilities.
```
