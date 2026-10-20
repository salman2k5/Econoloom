# ECONOLOOM — SIMULATION METHODOLOGY & MATHEMATICAL SPECIFICATION

**Document Status:** Stage 3 Implemented & Verified Specification  
**Last Updated:** 2026-10-19

---

## 1. Model Purpose, Scope & Epistemic Boundaries

### 1.1 Purpose
The EconoLoom simulation engine (`src/engine/simulateScenario.ts`, `src/engine/pathwayTracer.ts`, `src/engine/normalizeInputs.ts`) is a **deterministic, discrete-time, directed-network shock propagation and buffer-depletion model**. Its purpose is to help users explore **where, when, and why** a disruption at a geographic chokepoint, commodity corridor, or manufacturing hub propagates into downstream industries and consumer categories, and how **inventory buffers, route bypasses, substitution, and transit delays** shape that trajectory over time.

### 1.2 What the Model Is — and Is Not
- **What It Is:** A transparent, reproducible structural stress-testing model combining (a) capacity-rationed transport/production corridors, (b) discrete weekly transit lags, (c) node-level inventory buffer drawdown and replenishment, and (d) a hybrid Leontief-bottleneck / weighted-input exposure aggregator.
- **What It Is Not:** It is **not** a Computable General Equilibrium (CGE) price-clearing model, a stochastic Monte Carlo forecast, an econometric inflation predictor, or a live firm-level ERP twin.
- **Core Guardrail:** The model outputs two primary normalized metrics on $[0, 100]$, always labeled in the UI as **Simulated Output — Model-Derived**:
  1. **Relative Exposure Index ($\text{REI}_i(t) \in [0, 100]$):** Measures the degree of unbuffered upstream supply shortfall and operational bottleneck pressure reaching node $i$ at simulation week $t$.
  2. **Cost-Pressure Index ($\text{CPI}_i(t) \in [0, 100]$):** Measures cumulative upstream input scarcity, buffer-depletion stress, and maritime rerouting freight friction affecting downstream industries and consumer categories, **without claiming a specific percentage change in retail dollar prices or national inflation.**

---

## 2. Adherence to the 12 Required Modelling Principles

| # | Principle | How EconoLoom Enforces It Mathematically & Architecturally |
| :--- | :--- | :--- |
| **1** | **Determinism (Identical inputs $\Rightarrow$ identical outputs)** | Pure functional computation over normalized inputs (`ScenarioParameters`, `NODES`, `EDGES`). Zero calls to `Math.random()`, system clocks, or asynchronous race conditions. |
| **2** | **No stochastic core** | All equations are closed-form, deterministic recurrences over integer weeks $t \in \{0, 1, \dots, 26\}$. |
| **3** | **Logical monotonicity** | For any node $i$ and week $t$, $\frac{\partial \text{REI}_i(t)}{\partial S} \ge 0$ and $\frac{\partial \text{REI}_i(t)}{\partial D} \ge 0$, while increasing inventory buffers ($\mu_{\text{inv}}$), bypass capacity ($\rho_{\text{bypass}}$), or substitution ($\rho_{\text{sub}}$) monotonically decreases or delays $\text{REI}_i(t)$. |
| **4** | **Strict directionality** | Shocks propagate strictly along directed edges $e = (u \to v) \in \mathcal{E}$. If no directed path exists from shocked nodes $\mathcal{S}_0$ to node $v$, then $\text{REI}_v(t) \equiv 0$ and $\text{CPI}_v(t) \equiv 0$ for all $t$. |
| **5** | **Explicit temporal step & horizon** | Discrete time step $\Delta t = 1\text{ week}$ ($7\text{ days}$) over horizon $T = 26\text{ weeks}$ ($182\text{ days}$). Baseline inventory buffers in days convert to weeks via exact division by $7$. |
| **6** | **Safe cycle handling** | The primary 48-node graph is a verified 4-tier DAG evaluated in topological order via Kahn's algorithm. If a synthetic cyclic graph is supplied, remaining cyclic vertices fall back to deterministic tier-index ordering and any 0-lag back-edge is enforced to a minimum $1\text{-week}$ lag with per-hop attenuation $\gamma = 0.92 < 1$. |
| **7** | **Missing or invalid input normalization** | `normalizeScenarioParameters()` clamps finite numbers to documented bounds, replaces `NaN` or $\pm\infty$ with safe defaults, and strictly preserves valid `0` values (`shockSeverityPct = 0`, `durationDays = 0`, `rerouteCapacityShare = 0`, `substitutionFlexibility = 0`). |
| **8** | **Honest labeling of modeled buffers & shortages** | All computed metrics (`REI`, `CPI`, remaining inventory days, causal pathway scores) are explicitly badged as *Simulated Output — Model-Derived*, distinct from *Audited Structural Parameters*. |
| **9** | **No double-counting across parallel paths** | Incoming dependencies at node $v$ are normalized such that $\sum_{e \in \text{In}(v)} \tilde{w}_e \le 1$, and nodal shortfall $s_v(t)$ is bounded on $[0, 1]$ before propagating downstream. |
| **10** | **Separation of Direct, Indirect & Consumer impacts** | Every node state explicitly decomposes total exposure into **Direct Exposure** ($\text{directRei}$, from 1-hop connections to the shock origin) and **Indirect Propagated Exposure** ($\text{indirectRei}$, from $\ge 2$-hop cascades) such that $\text{directRei} + \text{indirectRei} = \text{relativeExposureIndex}$. |
| **11** | **Explicit price-calculation refusal** | Because retail price pass-through depends on unmodeled demand elasticities, monetary policy, exchange rates, and firm markups, the engine refuses to output retail `%` price changes. |
| **12** | **Transparent Index documentation** | Both $\text{REI}$ and $\text{CPI}$ are documented in-app and below as dimensionless $0–100$ stress indices anchored to baseline capacity ($0$) and complete bottleneck halt ($100$). |

---

## 3. Mathematical Formulation & Algorithmic Specification

### 3.1 Sets, Indices, and Normalized Scenario Parameters
- **Directed Graph:** $\mathcal{G} = (\mathcal{V}, \mathcal{E})$, where $|\mathcal{V}| = 48$ nodes and $|\mathcal{E}| = 78$ directed edges $e = (u \to v)$.
- **Time Grid:** Discrete weeks $t \in \{0, 1, 2, \dots, 26\}$. Week $t = 0$ is the pre-shock steady-state baseline.
- **Six Normalized User Scenario Parameters (`src/engine/normalizeInputs.ts`):**
  1. `shockSeverityPct` $\in [0, 100]$: Origin capacity curtailment percentage ($S = \text{shockSeverityPct} / 100 \in [0, 1]$).
  2. `durationDays` ($D \in [0, 180]$): Active shock duration in days ($T_{\text{end}} = D / 7\text{ weeks}$).
  3. `inventoryBufferScale` ($\mu_{\text{inv}} \in [0.5, 2.0]$): Multiplier applied to each node's audited `baselineInventoryDays`.
  4. `rerouteCapacityShare` ($\rho_{\text{bypass}} \in [0, 1]$): User activation share of each corridor's maximum physical bypass capacity (`edge.maxBypassShare.value`).
  5. `substitutionFlexibility` ($\rho_{\text{sub}} \in [0, 1]$): User activation share of each node's medium-term substitution ceiling (`node.substitutionPotential.value`).
  6. `shippingCostMultiplier` ($M_{\text{ship}} \in [1.0, 5.0]$): Freight and war-risk insurance surcharge multiplier applied to maritime rerouting friction in the Cost-Pressure Index.

---

### 3.2 Step 1: Exogenous Shock & Post-Disruption Origin Profile
If $S = 0$ or $D = 0$, the simulation immediately satisfies the **Zero-Shock Identity**: for all $v \in \mathcal{V}$ and all $t \in \{0, \dots, 26\}$, $\text{REI}_v(t) = 0$, $\text{CPI}_v(t) = 0$, and $I_v(t) = B_v^{\max}$.

Otherwise, for each week $t \in \{1, \dots, 26\}$, the active disruption fraction of week $t$ covered by duration $D$ (in days) is:
$$\alpha_{\text{active}}(t) = \text{clamp}\left(\frac{D - 7(t - 1)}{7}, \, 0, \, 1\right)$$

For any shock origin node $u \in \mathcal{S}_0$, its capacity curtailment $u_u(t) \in [0, 1]$ at week $t$ is:
$$u_u(t) = \begin{cases} 0 & \text{if } t = 0 \text{ or } \alpha_{\text{active}}(t) = 0 \\ S \cdot \alpha_{\text{active}}(t) & \text{if } t \ge 1 \text{ and } \alpha_{\text{active}}(t) > 0 \end{cases}$$
Once the shock duration expires ($t > \lceil D / 7 \rceil$, so $\alpha_{\text{active}}(t) = 0$), origin curtailment returns to $0$, while downstream nodes continue to experience in-transit lagged waves and gradual inventory replenishment.

---

### 3.3 Step 2: Edge Flow Transmission, Route Bypass & Transit Delay
Consider a directed edge $e = (u \to v) \in \mathcal{E}$ with:
- Baseline dependency weight $w_e \in (0, 1]$ (`edge.dependencyWeight.value`).
- Bottleneck criticality $c_e \in [0, 1]$ (`edge.inputCriticality.value`).
- Baseline transit lag $L_e \in \{0, 1, 2, 3, 4\}$ weeks (`edge.transitLagWeeks.value`).
- Bypass availability flag `edge.bypassAvailable`, maximum bypass share $\beta_e^{\max} \in [0, 1]$ (`edge.maxBypassShare.value`), and bypass transit penalty $\Delta L_e^{\text{bypass}} \ge 0$ weeks (`edge.bypassTransitPenaltyWeeks`).

Let $s_u(\tau) \in [0, 1]$ denote the effective unbuffered output shortfall of upstream node $u$ at departure week $\tau = t - L_e$:
1. **Before Transit Lag Elapsed ($\tau \le 0$):**
   $$\delta_e(t) = 0, \qquad \tilde{\beta}_e(t) = 0$$
2. **After Transit Lag Elapsed ($\tau \ge 1$):**
   If $s_u(\tau) > 0$, `edge.bypassAvailable === true`, and $\tau > \Delta L_e^{\text{bypass}}$ (meaning rerouted shipments have completed their extra transit penalty):
   $$\tilde{\beta}_e(t) = \text{clamp}\left(\beta_e^{\max} \cdot \rho_{\text{bypass}}, \, 0, \, 0.90\right)$$
   Otherwise $\tilde{\beta}_e(t) = 0$. The transmitted edge disruption arriving at target node $v$ at week $t$ is:
   $$\delta_e(t) = \text{clamp}\left(s_u(t - L_e) \cdot \left(1 - \tilde{\beta}_e(t)\right), \, 0, \, 1\right)$$

---

### 3.4 Step 3: Anti-Double-Counting Aggregation of Raw Upstream Deficit
For any non-origin node $v \notin \mathcal{S}_0$ with incoming edges $\text{In}(v) = \{e = (u \to v) \in \mathcal{E}\}$, we normalize incoming weights:
$$\tilde{w}_e = \frac{w_e}{\max\left(1, \, \sum_{k \in \text{In}(v)} w_k\right)}$$
We then combine two complementary structural mechanisms:
1. **Weighted Average Input Shortfall ($d_v^{\text{avg}}(t)$):**
   $$d_v^{\text{avg}}(t) = \sum_{e \in \text{In}(v)} \tilde{w}_e \cdot \delta_e(t)$$
2. **Critical Leontief Bottleneck Shortfall ($d_v^{\text{bot}}(t)$):**
   $$d_v^{\text{bot}}(t) = \max_{e \in \text{In}(v)} \left( c_e \cdot \delta_e(t) \right)$$
3. **Combined Raw Deficit ($d_v^{\text{raw}}(t)$):**
   With $\bar{c}_v = \max_{e \in \text{In}(v)} c_e$ and per-hop cycle-damping factor $\gamma = 0.92$:
   $$d_v^{\text{raw}}(t) = \gamma \cdot \text{clamp}\left( (1 - 0.45\bar{c}_v) \cdot d_v^{\text{avg}}(t) + 0.45\bar{c}_v \cdot d_v^{\text{bot}}(t), \, 0, \, 1 \right)$$

---

### 3.5 Step 4: Substitution & Monotone Order-Preserving Inventory Recurrence
1. **Short-Run Input / Supplier Substitution ($\tilde{\sigma}_v(t)$):**
   When $d_v^{\text{raw}}(t) > 0$, alternative supplier qualification ramps linearly over the first $4$ weeks:
   $$\tilde{\sigma}_v(t) = \text{clamp}\left(\sigma_v^{\max} \cdot \rho_{\text{sub}} \cdot \min\left(1, \, \frac{t}{4}\right), \, 0, \, 0.85\right)$$
   yielding net post-substitution demand on inventory:
   $$d_v^{\text{net}}(t) = d_v^{\text{raw}}(t) \cdot \left(1 - \tilde{\sigma}_v(t)\right)$$
2. **Inventory Capacity Conversion (Days $\to$ Weeks):**
   Using a strict $7\text{-day}$ week conversion:
   $$D_v^{\max} = \mu_{\text{inv}} \cdot \text{baselineInventoryDays}_v, \qquad B_v^{\max} = \frac{D_v^{\max}}{7}, \qquad I_v(0) = B_v^{\max}$$
3. **Order-Preserving Soft-Rationed Drawdown & Unbuffered Shortfall ($t \ge 1$):**
   Let $I_v(t-1) \ge 0$ be the remaining inventory (in weeks of baseline consumption) at the end of week $t-1$. The inventory coverage factor is:
   $$\theta_v^{\text{cov}}(t) = \frac{I_v(t-1)}{I_v(t-1) + 1.0} \in [0, 1)$$
   - **Buffer Withdrawal:**
     $$b_v^{\text{draw}}(t) = \theta_v^{\text{cov}}(t) \cdot d_v^{\text{net}}(t)$$
   - **Post-Shock Replenishment:** When $t > T_{\text{end}}$ and $d_v^{\text{net}}(t) < 0.05$:
     $$b_v^{\text{rep}}(t) = 0.18 \cdot B_v^{\max} \cdot \left(1 - \frac{d_v^{\text{net}}(t)}{0.05}\right)$$
     Otherwise $b_v^{\text{rep}}(t) = 0$.
   - **Updated Inventory State:**
     $$I_v(t) = \text{clamp}\left(I_v(t-1) - b_v^{\text{draw}}(t) + b_v^{\text{rep}}(t), \, 0, \, B_v^{\max}\right)$$
   - **Unbuffered Output Shortfall ($s_v(t) \in [0, 1]$):**
     $$s_v(t) = d_v^{\text{net}}(t) - b_v^{\text{draw}}(t) = \frac{d_v^{\text{net}}(t)}{I_v(t-1) + 1.0}$$
   - **Mathematical Monotonicity Proof:** Because $\frac{\partial I_v(t)}{\partial I_v(t-1)} = 1 - \frac{d_v^{\text{net}}(t)}{(I_v(t-1) + 1)^2} \ge 0$ for all $I_v(t-1) \ge 0$ and $d_v^{\text{net}}(t) \in [0, 1]$, and $\frac{\partial I_v(t)}{\partial d_v^{\text{net}}(t)} \le 0$, any trajectory with higher shock severity $S$ or longer duration $D$ maintains $I_v^{\text{high}}(t) \le I_v^{\text{low}}(t)$ and $d_v^{\text{net,high}}(t) \ge d_v^{\text{net,low}}(t)$ at every week $t$, guaranteeing $s_v^{\text{high}}(t) \ge s_v^{\text{low}}(t)$ across all nodes and weeks without exception.

---

### 3.6 Step 5: Direct vs. Indirect Relative Exposure Index ($\text{REI}_v(t)$)
For every node $v \in \mathcal{V}$ and week $t \in \{0, \dots, 26\}$:
$$\text{REI}_v(t) = \text{round}\left(100 \cdot s_v(t), \, 1\right)$$
Let $\text{In}_{\text{direct}}(v) = \{e = (u \to v) \in \text{In}(v) \mid u \in \mathcal{S}_0\}$ be incoming edges originating directly at a shocked origin node:
- For $u \in \mathcal{S}_0$: $\text{directRei}_u(t) = \text{REI}_u(t)$ and $\text{indirectRei}_u(t) = 0$.
- For $v \notin \mathcal{S}_0$: let $\theta_v^{\text{dir}}(t) = \frac{\sum_{e \in \text{In}_{\text{direct}}(v)} \tilde{w}_e \cdot \delta_e(t)}{\sum_{e \in \text{In}(v)} \tilde{w}_e \cdot \delta_e(t)}$ when $\sum_{e \in \text{In}(v)} \tilde{w}_e \cdot \delta_e(t) > 0$ (and $0$ otherwise). Then:
  $$\text{directRei}_v(t) = \text{round}\left(\theta_v^{\text{dir}}(t) \cdot \text{REI}_v(t), \, 1\right), \qquad \text{indirectRei}_v(t) = \text{round}\left(\text{REI}_v(t) - \text{directRei}_v(t), \, 1\right)$$
  guaranteeing $\text{directRei}_v(t) + \text{indirectRei}_v(t) = \text{REI}_v(t)$ at every node and week.

---

### 3.7 Step 6: Downstream Cost-Pressure Index ($\text{CPI}_v(t)$) & Severity Bands
When upstream disruption reaches node $v$, cost pressure reflects:
1. **Pass-Through Scarcity Pressure:** $P_v^{\text{scarcity}}(t) = s_v(t) \cdot \left(0.55 + 0.45 \cdot \epsilon_v^{\text{pass}}\right)$, where $\epsilon_v^{\text{pass}}$ is `node.pricePassThroughElasticity.value`.
2. **Buffer-Depletion Precautionary Stress:** $P_v^{\text{buffer}}(t) = 0.22 \cdot \left(1 - \text{inventoryCoverageRatio}_v(t)\right) \cdot \min\left(1, \, d_v^{\text{raw}}(t) \cdot 2.5 + s_v(t)\right)$.
3. **Shipping & Rerouting Freight Surcharge:** With $F_v(t) = \sum_{e \in \text{In}(v)} \tilde{w}_e \cdot s_u(t - L_e) \cdot (0.35 + 0.65 \cdot \tilde{\beta}_e(t))$ and normalized shipping surcharge factor $\phi_{\text{ship}} = \frac{M_{\text{ship}} - 1}{4} \in [0, 1]$:
   $$P_v^{\text{freight}}(t) = 0.28 \cdot F_v(t) \cdot (0.25 + 0.75 \cdot \phi_{\text{ship}}) \cdot \left(0.5 + 0.5 \cdot \text{importDependency}_v\right)$$

Combining these components yields:
$$\text{CPI}_v(t) = \text{round}\left(100 \cdot \text{clamp}\left(P_v^{\text{scarcity}}(t) + P_v^{\text{buffer}}(t) + P_v^{\text{freight}}(t), \, 0, \, 1\right), \, 1\right)$$

#### Qualitative Severity Bands (`getSeverityBand()` in `src/types/simulation.ts`)
Every numerical $\text{REI}$ score is mapped to a qualitative severity band:
- `0 – 4.9`: `baseline` (**Baseline · 0–4**)
- `5.0 – 19.9`: `low` (**Low · 5–19**)
- `20.0 – 39.9`: `moderate` (**Moderate · 20–39**)
- `40.0 – 64.9`: `elevated` (**Elevated · 40–64**)
- `65.0 – 100.0`: `severe` (**Severe · 65–100**)

---

## 4. Causal Pathway Discovery, Scoring, Reachability & Truncation Diagnostics

### 4.1 Purpose & Epistemic Guardrail
The pathway analysis engine (`src/engine/pathwayTracer.ts`: `analyzeNodePathways` and `traceCausalPathways`) identifies and ranks the simple directed supply-chain chains connecting active scenario shock origins $\mathcal{S}_0$ to any queried target node $v \in \mathcal{V}$ at a normalized simulation week $t \in \{0, \dots, 26\}$.

- **Structural Transmission Heuristic (Not Additive Causal Attribution):** Because node exposure in Section 3.4–3.5 uses a nonlinear hybrid weighted-average + Leontief bottleneck operator coupled with shared node-level inventory buffers $I_v(t)$, individual pathways do **not** sum additively to $\text{REI}_v(t)$. Each pathway's `pathScore` $\in [0, 100]$ is a monotonic structural transmission heuristic used strictly to rank relative pathway salience and identify primary bottleneck links.

### 4.2 Reachability Classification (`PathwayReachabilityStatus`)
For any requested `targetNodeId` and `week` (normalized to $t \in \{0, \dots, 26\}$ via `normalizeWeekIndex`):
1. `'origin_node'`: `targetNodeId` exists in $\mathcal{V}$ and is an element of the active scenario's valid shock origin set $\mathcal{S}_0$. It is represented by a single $0$-hop self-origin pathway (`totalDiscoveredPaths = 1`, `totalLagWeeks = 0`, `bottleneckEdgeId = 'origin_direct'`).
2. `'reachable'`: `targetNodeId` $\in \mathcal{V} \setminus \mathcal{S}_0$ and at least one simple directed path $P = (e_1, e_2, \dots, e_m)$ of length $1 \le m \le 8$ edges (`MAX_PATH_HOPS = 8`) exists from some $u_0 \in \mathcal{S}_0$ to $v$.
3. `'unreachable'`: Either `targetNodeId` $\notin \mathcal{V}$, $\mathcal{S}_0 = \emptyset$, or no simple directed path of length $\le 8$ edges connects any $u_0 \in \mathcal{S}_0$ to $v$ (`totalDiscoveredPaths = 0`, `truncatedPathCount = 0`, `pathways = []`). Reverse-direction edges $(v \to u)$ are never traversed.

### 4.3 Cycle Safety, Path Counting & Search-Limit vs. Display Truncation
- **Cycle Safety (Simple Directed Paths Only):** Depth-first enumeration maintains a path-local `visitedNodeIds` set initialized to $\{u_0\}$. An outgoing edge $e = (x \to y)$ is traversed only if $e.\text{sourceNodeId} = x$, $y \in \mathcal{V}$, and $y \notin \text{visitedNodeIds}$, preventing cycles and repeated nodes within any path even on synthetic cyclic graphs.
- **Maximum Path Length (`MAX_PATH_HOPS = 8`):** Only simple directed paths with $1 \le m \le 8$ edges are enumerated.
- **Deterministic Search-Safety Cap (`DEFAULT_MAX_SEARCH_PATHS = 250`):** To prevent unbounded combinatorial enumeration on dense synthetic graphs, candidate discovery halts deterministically if `discoveredPaths.length` reaches `maxSearchPaths` (`250` by default) and sets `searchLimitReached = true`. On the canonical 48-node, 78-edge DAG, every target node has far fewer than 250 simple paths, so enumeration is exhaustive (`searchLimitReached = false`).
- **Path Counting & Truncation Semantics:**
  - `totalDiscoveredPaths`: Total number of simple directed paths ($\le 8$ edges) discovered before enumeration completed (or hit `maxSearchPaths`).
  - `pathways`: The top $\min(\text{totalDiscoveredPaths}, \, \text{normalizedMaxPaths})$ ranked pathways, where `maxPaths` defaults to `5` (`normalizeMaxPaths` clamps integer values to $[0, 50]$ and replaces `NaN` / $\pm\infty$ with `5`).
  - `truncatedPathCount`: Defined exactly as:
    $$\text{truncatedPathCount} = \max\left(0, \, \text{totalDiscoveredPaths} - \text{pathways.length}\right)$$
  - **Distinguishing Truncation Modes in `reachabilityReason`:**
    - When `searchLimitReached === true` (**Search-Limit Truncation**), `reachabilityReason` explicitly reports that enumeration stopped at the `maxSearchPaths` safety cap and never claims that all possible paths were enumerated.
    - When `searchLimitReached === false` and `truncatedPathCount > 0` (**Ordinary Display Truncation**), `reachabilityReason` reports that all `totalDiscoveredPaths` simple paths were exhaustively enumerated and `truncatedPathCount` lower-ranked paths were omitted from the displayed slice.

### 4.4 Cumulative Arrival Lag & Enriched Per-Hop Metrics (`CausalPathStep`)
Along a simple directed path $P = (e_1, \dots, e_m)$ with vertices $u_0 \xrightarrow{e_1} u_1 \xrightarrow{e_2} \dots \xrightarrow{e_m} u_m = v$:
- **Origin Step ($k = 0$, node $u_0$):**
  - `cumulativeLagWeeks = 0` (`lagWeeksFromOrigin = 0`)
  - `sourceInventoryDays = targetInventoryDays`: remaining inventory buffer in days of $u_0$ at requested simulation week $t$.
  - `targetRei = reiAtWeek`: $\text{REI}_{u_0}(t)$ at requested simulation week $t$.
  - `edgeActiveBypassShare = 0`.
- **Directed Edge Hop ($1 \le k \le m$, edge $e_k = (u_{k-1} \to u_k)$):**
  - **Cumulative Arrival Lag:**
    $$\text{cumulativeLagWeeks}_k = \sum_{j=1}^{k} \max\left(0, \, \text{round}(L_{e_j})\right)$$
    with path total lag $\text{totalLagWeeks} = \text{cumulativeLagWeeks}_m$. Because exogenous shock onset begins at Week $1$, the earliest week a shock wave traveling along path $P$ can arrive at hop $k$ is $t_{\text{arrival}, k} = 1 + \text{cumulativeLagWeeks}_k$.
  - **Week-$t$ State Fidelity:** All hop state metrics — `sourceInventoryDays` (remaining inventory days of $u_{k-1}$ at week $t$), `targetInventoryDays` (remaining inventory days of $u_k$ at week $t$), `targetRei` / `reiAtWeek` ($\text{REI}_{u_k}(t)$), `cpiAtWeek` ($\text{CPI}_{u_k}(t)$), and `edgeActiveBypassShare` ($\tilde{\beta}_{e_k}(t)$) — are read directly from `simulationResult` at the requested simulation week $t$, never fabricated or conflated with future arrival-week states.

### 4.5 Pathway Scoring, Bottleneck Identification & Deterministic Ranking
For a path $P = (e_1, \dots, e_m)$ at week $t$ under normalized origin shock severity $S \in [0, 1]$:
1. **Per-Hop Conductance & Bottleneck Metric:**
   For each edge $e_k = (u_{k-1} \to u_k)$ with normalized incoming weight $\tilde{w}_{e_k}$, criticality $c_{e_k}$, active bypass share $\tilde{\beta}_{e_k}(t)$, and transmitted disruption $\delta_{e_k}(t)$:
   $$g_k = \max\left(0.05, \, \left(0.5\tilde{w}_{e_k} + 0.5c_{e_k}\right)\left(1 - 0.5\tilde{\beta}_{e_k}(t)\right)\right)$$
   $$b_k = c_{e_k}\left(0.5 + 0.5\tilde{w}_{e_k}\right)\left(1 - 0.6\tilde{\beta}_{e_k}(t)\right)\left(1 + \delta_{e_k}(t)\right)$$
   The edge $e_{k^*}$ maximizing $b_k$ is recorded as `bottleneckEdgeId` (with target node $u_{k^*}$ as `bottleneckNodeId`).
2. **Heuristic Pathway Score (`pathScore` $\in [0, 100]$):**
    With geometric mean conductance $\bar{g}_P = \left(\prod_{k=1}^m g_k\right)^{1/m}$, mean active edge disruption $\bar{\delta}_P(t) = \frac{1}{m}\sum_{k=1}^m \delta_{e_k}(t)$, and hop discount $0.9^{m-1}$:
   $$\text{pathScore}_P(t) = \begin{cases} 0 & \text{if } S \le 0 \\ \text{round}\left(100 \cdot \text{clamp}\left(0.6\,\bar{\delta}_P(t) + 0.4\,S\,\bar{g}_P\,0.9^{m-1}, \, 0, \, 1\right), \, 1\right) & \text{if } S > 0 \end{cases}$$
3. **Strict Deterministic Ranking Order:**
   Discovered pathways are sorted by:
   1. `pathScore` descending,
   2. `totalLagWeeks` ascending (fastest arrival first),
   3. `steps.length` ascending (fewest hops first),
   4. Lexicographical chain key (`edgeId`/`nodeId` sequence) ascending.

---

## 5. Counterfactual Scenario Comparison Methodology (`src/engine/compareScenarios.ts`)

Given two scenario configurations — **Scenario A (Reference / Baseline)** and **Scenario B (Counterfactual / Comparison)** — the pure function `compareScenarios(scenarioA, scenarioB, currentWeek)` evaluates both scenarios over the 27-step horizon ($t \in \{0, 1, \dots, 26\}$) without mutating shared workspace state.

### 5.1 Weekly Trajectory Deltas ($\Delta = B - A$)
For each node $v \in \mathcal{V}$ and week $t \in \{0, \dots, 26\}$:
$$\Delta\text{REI}_v(t) = \text{round}\left(\text{REI}_v^{(B)}(t) - \text{REI}_v^{(A)}(t), \, 1\right) \quad \text{(index points)}$$
$$\Delta\text{CPI}_v(t) = \text{round}\left(\text{CPI}_v^{(B)}(t) - \text{CPI}_v^{(A)}(t), \, 1\right) \quad \text{(index points)}$$
$$\Delta\text{InvDays}_v(t) = \text{round}\left(7I_v^{(B)}(t) - 7I_v^{(A)}(t), \, 1\right) \quad \text{(days of stock)}$$

### 5.2 Peak Exposure, Cumulative Exposure (`REI-weeks`), and Recovery Week
- **Peak Node REI ($\text{PeakREI}_v$) & Peak Week ($t_{\text{peak},v}$):**
  $$\text{PeakREI}_v = \max_{t \in \{0,\dots,26\}} \text{REI}_v(t), \qquad \Delta\text{PeakREI}_v = \text{PeakREI}_v^{(B)} - \text{PeakREI}_v^{(A)}$$
- **Cumulative Exposure ($\text{CumREI}_v$, in `REI-weeks`) & Mean Weekly REI ($\overline{\text{REI}}_v$, in index points $0\text{–}100$):**
  $$\text{CumREI}_v = \sum_{t=0}^{26} \text{REI}_v(t), \qquad \overline{\text{REI}}_v = \frac{1}{27}\sum_{t=0}^{26} \text{REI}_v(t)$$
- **Onset & Sustained Recovery Week (`recoveryWeek`):**
  - `firstOnsetWeek`: smallest $t \ge 1$ such that $\text{REI}_v(t) \ge 5.0$ (or `null` if the node never reaches the `Low` severity threshold, in which case `neverDisrupted = true`).
  - `recoveryWeek`: smallest week $t > \max\left(t_{\text{peak},v}, \, \lceil D/7 \rceil\right)$ such that $\text{REI}_v(k) < 5.0$ for all $k \in \{t, \dots, 26\}$ (or `null` if `neverDisrupted === true` or if the node remains at $\text{REI}_v(26) \ge 5.0$).
