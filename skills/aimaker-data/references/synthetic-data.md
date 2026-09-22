# Synthetic data: when and how

## Good reasons
- Rare but critical events (failures, fraud patterns, accidents, rare diseases)
- Privacy constraints prevent sharing/using real records
- Cold start before real data exists
- Balancing under-represented conditions (lighting, weather, accents, demographics)
- Testing edge cases and robustness systematically

## Methods
| Method | Modality | Notes |
|---|---|---|
| Rule/physics-based simulation | sensors, physical systems, logistics | High control; fidelity depends on the model; pair with domain randomisation |
| Rendering engines / 3D scenes | vision, robotics | Automatic perfect labels; mind the sim-to-real appearance gap |
| Generative models (diffusion, GANs, VAEs) | images, audio, tabular | Can copy training data — check memorisation/privacy |
| LLM-generated text | NLP, dialogue, instructions | Diverse prompts/personas needed to avoid homogeneity; verify labels |
| Tabular synthesizers (copulas, CTGAN-style, diffusion) | tabular | Validate correlations and constraints |
| Augmentation (noise, crops, time-warping, mixup, back-translation) | all | Cheapest; always a baseline |
| Differentially private synthesis | sensitive tabular | Formal privacy at a utility cost |

## Validation checklist
- [ ] **TSTR**: model trained on synthetic (or real + synthetic) evaluated on *real* held-out data beats the real-only baseline where it matters (e.g. rare-class recall)
- [ ] Fidelity: marginal distributions and key correlations match; domain experts can't trivially tell them apart (for the relevant features)
- [ ] Diversity: covers the conditions it was meant to add
- [ ] Constraints hold (physical limits, business rules)
- [ ] Privacy: nearest-neighbour distance / membership-inference checks; no copied records
- [ ] Label correctness verified on a sample
- [ ] Synthetic share tracked and ablated (performance vs % synthetic)
