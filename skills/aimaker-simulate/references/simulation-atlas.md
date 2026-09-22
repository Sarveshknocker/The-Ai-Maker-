# Simulation & scientific-ML atlas

Tool names are examples of mature options. Verify current versions and licenses during research.

## Simulation paradigms
| Paradigm | Good for | Example tools |
|---|---|---|
| Discrete-event simulation | queues, factories, logistics, hospitals, call centres | SimPy, Salabim, AnyLogic, Arena |
| Agent-based modelling | markets, crowds, epidemics, traffic, social behaviour | Mesa, NetLogo, AnyLogic, MATSim (transport) |
| System dynamics | feedback-driven macro systems (supply chains, policy) | PySD, Vensim, Stella |
| Physics/multibody | robots, vehicles, mechanisms | MuJoCo, PyBullet, Isaac Sim/Isaac Lab, Gazebo, Drake |
| Driving & aerial | autonomous vehicles, drones | CARLA, AirSim-style simulators, PX4 SITL |
| CFD / FEM / multiphysics | fluids, heat, structures, electromagnetics | OpenFOAM, FEniCS, Elmer, COMSOL/ANSYS (commercial) |
| Equation-based / co-simulation | HVAC, power, energy systems | Modelica (OpenModelica), FMI/FMU co-simulation, EnergyPlus, pandapower |
| RL environment APIs | standard interface for agents | Gymnasium, PettingZoo (multi-agent) |
| Digital twin platforms | synchronised virtual assets, 3D context | Azure Digital Twins, AWS IoT TwinMaker, Eclipse Ditto, NVIDIA Omniverse (3D/physics) |

## Scientific / physics-informed ML
| Technique | Use when | Tools |
|---|---|---|
| Physics-informed neural networks (PINNs) | PDE known, sparse/noisy data, inverse problems | DeepXDE, NVIDIA PhysicsNeMo, PyTorch |
| Neural operators (FNO, DeepONet) | fast surrogates across many parameter settings | neuraloperator, PhysicsNeMo |
| Reduced-order models (POD, DMD) | cheap real-time approximations of big simulations | PyDMD, custom |
| Hybrid residual models | physics model + ML learns the unexplained part | any ML stack |
| Universal differential equations / neural ODEs | dynamics partly known | torchdiffeq, SciML (Julia) |
| Bayesian calibration | tune simulator parameters with uncertainty | PyMC, emcee, SBI libraries |
| Simulation-based inference | infer parameters from observations via a simulator | sbi |

## Sim-to-real techniques
Domain randomisation (textures, dynamics, noise, delays), system identification, residual/fine-tuning on real data, teacher-student distillation from privileged simulation, safety shields and conservative action limits, progressive rollout (sim → hardware-in-the-loop → shadow → limited live).

## Digital twin design checklist
- [ ] Asset/process scope and decisions the twin supports
- [ ] Data sync: sensors, frequency, latency, quality handling, state estimation (e.g. Kalman filters)
- [ ] Model core: physics, ML, or hybrid; calibration cadence
- [ ] What-if/optimisation interface for users
- [ ] Validation: twin prediction error vs reality, tracked continuously
- [ ] Security: OT/IT separation, read-only by default, authenticated command paths
- [ ] Cost: compute, integration, maintenance ownership
