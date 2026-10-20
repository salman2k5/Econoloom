# ECONOLOOM — PROJECT IMPLEMENTATION AUDIT & STAGE 3 EXECUTION PLAN

**Audit Date:** 2026-10-19  
**Repository Root:** `c:\Users\User\Desktop\Salman\Projects`  
**Current Implementation State:** Stage 1 Complete & Verified; Auditing for Stage 2/3 Transition  
**Build & Test Status:** `typecheck` PASS (0 errors) · `lint` PASS (0 warnings/errors) · `vitest` PASS (12/12 tests) · `vite build` PASS · Production Runtime `npm audit` PASS (0 vulnerabilities)

---

## 1. Executive Summary

A comprehensive code, data, build, and test audit of the EconoLoom repository confirms that **Stage 1 (Application Foundation, Type-Safe Domain Schema, Audited 48-Node / 78-Edge Dataset, Pure Network Validator, and Responsive Workbench Shell)** is fully implemented, compiles cleanly, and passes all static and runtime checks.

Crucially, the repository adheres strictly to the epistemic and engineering guardrails in [`AGENTS.md`](file:///c:/Users/User/Desktop/Salman/Projects/AGENTS.md):
- **Zero fabricated or hardcoded simulation outputs:** The UI does not pretend to run a live simulation using fake numbers. Instead, it exposes the real audited baseline parameters, connecting edge weights, and source citations while clearly labeling the Stage 2/3 visualization slots.
- **100% provenance coverage:** Every quantitative baseline parameter across all **48 nodes** (`192` node-level `TraceableValue` records) and **78 directed edges** (`312` edge-level `TraceableValue` records) resolves to verified entries in [`src/data/sources.ts`](file:///c:/Users/User/Desktop/Salman/Projects/src/data/sources.ts) and passes Kahn's topological sort acyclicity verification in [`src/engine/validateNetwork.ts`](file:///c:/Users/User/Desktop/Salman/Projects/src/engine/validateNetwork.ts).

At the same time, the audit identifies what remains to transform EconoLoom from an **inspectable baseline supply-chain atlas** into a **dynamic interactive shock simulator**:
1. The **26-week deterministic propagation and inventory-drawdown engine** (`src/engine/simulateScenario.ts`, `src/engine/normalizeInputs.ts`, `src/engine/pathwayTracer.ts`) is not yet implemented.
2. The **Top Scenario Bar** ([`src/components/layout/ScenarioSelectorBar.tsx`](file:///c:/Users/User/Desktop/Salman/Projects/src/components/layout/ScenarioSelectorBar.tsx)) switches presets but displays scenario parameters (`shockSeverityPct`, `durationDays`, `inventoryBufferScale`, `rerouteCapacityShare`, `substitutionFlexibility`, `shippingCostMultiplier`) as read-only badges rather than interactive sliders and numeric inputs.
3. The **Interactive 26-Week Timeline Scrubber**, **Deterministic 4-Tier SVG Dependency DAG**, and **Natural Earth `d3-geo` Vector Map** are currently honest architectural preview cards in [`src/components/layout/WorkspaceShell.tsx`](file:///c:/Users/User/Desktop/Salman/Projects/src/components/layout/WorkspaceShell.tsx).

---

## 2. Module-by-Module Implementation Inventory

 Behaviors below were verified directly from source code inspection, not inferred from filenames.

| Module / File | Status | Verified Functionality & Evidence | Identified Gaps / Next Steps |
| :--- | :--- | :--- | :--- |
| [`src/main.tsx`](file:///c:/Users/User/Desktop/Salman/Projects/src/main.tsx) & [`src/App.tsx`](file:///c:/Users/User/Desktop/Salman/Projects/src/App.tsx) | **Working** | Mounts React 18 `StrictMode` root wrapped in `ScenarioStoreProvider`; renders `AppHeader`, `ScenarioSelectorBar`, `WorkspaceShell`, and `MethodologyModal`. | None for foundation; will host comparison drawer and live region announcer in later stages. |
| [`src/types/domain.ts`](file:///c:/Users/User/Desktop/Salman/Projects/src/types/domain.ts) | **Working** | Defines `DataClassification` (5 tiers), `EvidenceConfidence` (4 levels), `SourceRecord`, `TraceableValue<T>`, `NetworkNode`, `DependencyEdge`, `CorridorGeometry`, `ModelAssumption`, `ScenarioParameters`, and `ScenarioPreset`. | Complete and strictly typed. |
| [`src/types/simulation.ts`](file:///c:/Users/User/Desktop/Salman/Projects/src/types/simulation.ts) | **Partial** (Types only) | Defines `SeverityBand`, `NodeWeeklyState`, `EdgeWeeklyState`, `CausalPathStep`, `CausalPathway`, `SimulationSummaryMetrics`, `SimulationResult`, and `NetworkValidationReport`. | `NodeWeeklyState` should be extended with explicit `directRei: number` and `indirectRei: number` fields so Principle #10 ($E_v^{\text{dir}}(t) + E_v^{\text{ind}}(t) = \text{REI}_v(t)$) in [`SIMULATION_METHODOLOGY.md`](file:///c:/Users/User/Desktop/Salman/Projects/SIMULATION_METHODOLOGY.md#L134-L145) is first-class in the type contract. |
| [`src/data/sources.ts`](file:///c:/Users/User/Desktop/Salman/Projects/src/data/sources.ts) | **Working** | Contains `14` verified `SourceRecord` entries (OECD ICIO/IOT/GVC, World Bank Pink Sheet, EIA, IIASA Hormuz Briefs 1 & 2, UNCTAD, Panama Canal Authority, SIA/BCG, USGS, FAO, Natural Earth CC0, EconoLoom Methodology) and `4` `ModelAssumption` records. | Complete for MVP. |
| [`src/data/nodes.ts`](file:///c:/Users/User/Desktop/Salman/Projects/src/data/nodes.ts) | **Working** | Contains all `48` `NetworkNode` records (`3` chokepoints, `9` geographies, `14` commodities, `14` industries, `8` consumer categories). All `12` Tier-0 geographic/chokepoint nodes include `[lon, lat]` coordinates; all `8` consumer categories include `consumerBomBreakdown` summing to `100%`. | Consumer BOM cost-share breakdowns should be badged in the UI as `derived` / `illustrative` structural approximations rather than exact retail receipts. |
| [`src/data/edges.ts`](file:///c:/Users/User/Desktop/Salman/Projects/src/data/edges.ts) | **Working** | Contains all `78` directed `DependencyEdge` records (`e_01`–`e_78`) with `dependencyWeight`, `inputCriticality`, `transitLagWeeks`, `bypassAvailable`, `maxBypassShare`, `bypassTransitPenaltyWeeks`, `corridorId`, and plain-English `mechanismSummary`. | Complete and verified acyclic. |
| [`src/data/corridors.ts`](file:///c:/Users/User/Desktop/Salman/Projects/src/data/corridors.ts) & [`src/data/presets.ts`](file:///c:/Users/User/Desktop/Salman/Projects/src/data/presets.ts) | **Working** | Defines `3` maritime/air corridors (`cor_hormuz_asia_europe`, `cor_taiwan_transpacific`, `cor_panama_canal_americas`) with primary and bypass waypoints, and `3` flagship `ScenarioPreset` configurations with `supportedOutputs` and `excludedClaims`. | Bundled Natural Earth TopoJSON (`src/data/geo/world-110m.json`) is not yet added for the map canvas. |
| [`src/engine/validateNetwork.ts`](file:///c:/Users/User/Desktop/Salman/Projects/src/engine/validateNetwork.ts) | **Working** | Pure TypeScript + Zod validator (`0` React/DOM imports). Validates unique IDs, `sourceIds` resolution, parameter bounds, preset references, and Kahn's algorithm DAG acyclicity. Also provides `validateScenarioParameters()` and `getSeverityBand()`. | **Engine Gap:** `simulateScenario.ts`, `normalizeInputs.ts`, `pathwayTracer.ts`, `graphLayout.ts`, and `compareScenarios.ts` do not exist yet. |
| [`src/state/useScenarioStore.tsx`](file:///c:/Users/User/Desktop/Salman/Projects/src/state/useScenarioStore.tsx) | **Partial** | Provides React Context store tracking `activePreset`, `activeCorridor`, `selectedNode`, `incomingEdgesForSelectedNode`, `outgoingEdgesForSelectedNode`, `activeWorkspaceTab`, `datasetFilter`, `isMethodologyModalOpen`, and `validationReport`. | Does not yet hold mutable `scenarioParams: ScenarioParameters`, `currentWeek: number` ($t \in [0, 26]$), `isPlaying: boolean`, or memoized `simulationResult: SimulationResult`. |
| [`src/components/layout/ScenarioSelectorBar.tsx`](file:///c:/Users/User/Desktop/Salman/Projects/src/components/layout/ScenarioSelectorBar.tsx) | **Partial** | Preset switcher buttons work and update the store. Parameter display strip shows the 6 preset baseline parameters. | Parameters are currently read-only text cards; interactive sliders, numeric inputs, and `Reset to Preset` / `Zero Shock` controls are not yet wired. |
| [`src/components/layout/WorkspaceShell.tsx`](file:///c:/Users/User/Desktop/Salman/Projects/src/components/layout/WorkspaceShell.tsx) | **Partial** | Implements 3 working tabs (`overview`, `dataset_explorer`, `evidence_sources`). Featured causal chain traversal, 48-node filtering/searching, and source/assumption inspection work end-to-end. | `Zone B1` (Geographic Map) and `Zone B2 & C` (4-Tier SVG DAG & 26-Week Timeline Scrubber) are honest Stage 1 architectural preview slots rather than live visualizations. |
| [`src/components/inspector/NodeBaselineInspector.tsx`](file:///c:/Users/User/Desktop/Salman/Projects/src/components/inspector/NodeBaselineInspector.tsx) | **Working** (Baseline) | Displays selected node metadata, all 4 `TraceableValue` baseline metrics with uncertainty ranges and `DataTierBadge` pills, clickable Consumer BOM bars, clickable Upstream/Downstream edge lists, caveats, and linked `SourceRecord` citations. | Once the simulation engine is active, needs to display dynamic Week-$t$ metrics ($\text{REI}_v(t)$ with Direct vs. Indirect split, $\text{CPI}_v(t)$, Remaining Inventory Buffer $I_v(t)$, and top traced causal pathways). |
| [`src/components/methodology/MethodologyModal.tsx`](file:///c:/Users/User/Desktop/Salman/Projects/src/components/methodology/MethodologyModal.tsx) | **Working** | Opens/closes via button, backdrop click, or `Escape` key; displays epistemic guardrails, 5-tier data taxonomy badges, 5 severity band badges, and all 4 `ModelAssumption` cards. | Should add focus management on open/close and include the explicit mathematical formulas for $\text{REI}(t)$ and $\text{CPI}(t)$ once Stage 2/3 engine is active. |

---

## 3. Build, Test & Dependency Audit Verification

All verification commands were executed directly in `c:\Users\User\Desktop\Salman\Projects` on Node `v24.22.0` / npm `11.19.1`:

### 3.1 Static Analysis, Unit Tests & Production Build

| Check | Command | Exit Code | Result Summary |
| :--- | :--- | :---: | :--- |
| **TypeScript Typecheck** | `npm run typecheck` (`tsc --noEmit`) | `0` | **PASS** — `0` errors with `"strict": true` and `"noUncheckedIndexedAccess": true`. |
| **ESLint Check** | `npm run lint` (`eslint .`) | `0` | **PASS** — `0` errors and `0` warnings across all `src/**/*.{ts,tsx}` files. |
| **Unit & Component Tests** | `npm test -- --run` (`vitest --run`) | `0` | **PASS** — `2` test suites (`src/test/dataIntegrity.test.ts` [8 tests], `src/test/appFoundation.test.tsx` [4 tests]), **12/12 tests passed** in `5.16s`. |
| **Production Build** | `npm run build` (`tsc --noEmit && vite build`) | `0` | **PASS** — Built cleanly in `5.75s`: `dist/index.html` (`0.81 kB`), `dist/assets/index-B_Aq63EJ.css` (`24.67 kB` / `5.42 kB` gzip), `dist/assets/index-DAHrX6qW.js` (`387.41 kB` / `104.72 kB` gzip). |

### 3.2 Dependency Security Audit (`npm audit`)

1. **TLS Certificate Note on Windows:** Running bare `npm audit` fails with `unable to verify the first certificate` unless Node is instructed to use the Windows system root store via `$env:NODE_OPTIONS="--use-system-ca"`.
2. **Production Runtime Dependencies (`npm audit --omit=dev`):**
   - **Result:** **`found 0 vulnerabilities`** across `react`, `react-dom`, `lucide-react`, and `zod`. Zero vulnerable code ships in the production client bundle.
3. **Development Tooling Dependencies (`npm audit` including `devDependencies`):**
   - Reports `13` advisories (`5 moderate`, `6 high`, `2 critical`) strictly confined to local build/test devDependencies:
     - `vitest@2.1.9` transitive dependencies (`tinypool`, `@vitest/mocker`, `vite-node`/`esbuild`).
     - `tailwindcss@3.4.19` transitive file-globbing dependencies (`chokidar` $\to$ `braces`, `postcss-selector-parser`).
   - **Remediation Assessment:** Running `npm audit fix --force` would install `vitest@5.0.5` and `tailwindcss@4.3.3`—both of which are breaking major-version upgrades (`tailwindcss@4` removes `tailwind.config.js` compatibility and rewrites directive syntax). Because these packages never execute in user browsers or production builds, we **preserve current locked versions** to avoid breaking the build pipeline.

---

## 4. Detailed Product & Scientific Credibility Audit

### 4.1 Geographic Visualization & Dataset Grounding
- **Dataset Grounding (Verified):** All 3 chokepoints (`chk_hormuz` `[56.25, 26.56]`, `chk_taiwan_fabs` `[120.97, 24.78]`, `chk_panama` `[-79.68, 9.08]`) and all 9 regional hubs (`geo_gulf`, `geo_twn`, `geo_kor`, `geo_jpn`, `geo_chn`, `geo_ind`, `geo_usa`, `geo_eu`, `geo_sam`) carry accurate `[longitude, latitude]` coordinates in [`src/data/nodes.ts`](file:///c:/Users/User/Desktop/Salman/Projects/src/data/nodes.ts). All 3 corridors in [`src/data/corridors.ts`](file:///c:/Users/User/Desktop/Salman/Projects/src/data/corridors.ts) define multi-point `primaryWaypoints`, `bypassWaypoints`, `baselineTransitDays`, and `bypassTransitDays`.
- **Visual Status (Placeholder Slot):** `WorkspaceShell.tsx` currently displays the active corridor's textual metadata, baseline transit days, and bypass penalty days in `Zone B1`, but does not yet render an SVG map.

### 4.2 Dependency Graph Correctness, Directionality & Edge Relationships
- **Structural Verification (Verified):**
  - **Node Count & Tiering:** Exactly `48` nodes partitioned into `Tier 0` (3 Chokepoints + 9 Geographies = 12), `Tier 1` (14 Commodities), `Tier 2` (14 Industries), and `Tier 3` (8 Consumer Categories).
  - **Edge Count & Acyclicity:** Exactly `78` directed edges (`e_01`–`e_78`). Topological sort in `validateNetworkDataset()` visits all `48` nodes with `0` cycles, and `dataIntegrity.test.ts` confirms `0` orphaned nodes.
  - **Economic Meaningfulness:** Non-obvious empirical cascades are accurately encoded, including:
    - *Sulfur Cascade:* `geo_gulf` $\to$ `chk_hormuz` (`e_01`) $\to$ `com_sulfur` (`e_05`, weight `0.48`) $\to$ `com_sulfuric_acid` (`e_45`, weight `0.78`) $\to$ `ind_fertilizer` (`e_46`) & `ind_copper_mining` (`e_47`) $\to$ `com_copper` (`e_51`) $\to$ `ind_automotive` (`e_52`) & `con_construction` (`e_72`).
    - *Naphtha-to-Chip-Solvent Cascade:* `chk_hormuz` $\to$ `com_naphtha` (`e_04`) $\to$ `com_chip_solvents` (`e_44`) $\to$ `chk_taiwan_fabs` (`e_33`) $\to$ `com_adv_logic` (`e_34`) $\to$ `ind_ai_servers` (`e_54`) $\to$ `con_cloud_ai` (`e_74`).
    - *"Golden Screw" Automotive MCU Bottleneck:* `chk_taiwan_fabs` $\to$ `com_auto_mcu` (`e_35`, weight `0.62`, criticality `0.90`) $\to$ `ind_automotive` (`e_56`, weight `0.42`, criticality `0.95`) $\to$ `con_vehicles` (`e_76`).

### 4.3 Scenario Controls & State Propagation
- **Working:** Clicking any preset in `ScenarioSelectorBar.tsx` invokes `selectPreset(preset.id)`, which updates `activePreset`, `activeCorridor`, and resets `selectedNode` to the preset's primary shock origin (`chk_hormuz`, `chk_taiwan_fabs`, or `chk_panama`).
- **Missing:** Users cannot yet adjust scenario parameters (`shockSeverityPct`, `durationDays`, `inventoryBufferScale`, `rerouteCapacityShare`, `substitutionFlexibility`, `shippingCostMultiplier`) or scrub across weeks $t \in [0, 26]$.

### 4.4 Simulation Engine & Mathematical Alignment Audit
- **Current State:** No simulation engine exists yet in `src/engine/`.
- **Specification Alignment Findings to Resolve When Implementing `simulateScenario.ts`:**
  1. **Parameter Schema Reconciliation:**
     - [`src/types/domain.ts`](file:///c:/Users/User/Desktop/Salman/Projects/src/types/domain.ts#L118-L125) and [`src/data/presets.ts`](file:///c:/Users/User/Desktop/Salman/Projects/src/data/presets.ts) define `ScenarioParameters` with six continuous numeric levers: `shockSeverityPct` ($[0, 1]$), `durationDays` ($[7, 180]$), `inventoryBufferScale` ($[0.5, 2.0]$), `rerouteCapacityShare` ($[0, 1]$), `substitutionFlexibility` ($[0, 1]$), and `shippingCostMultiplier` ($[1.0, 4.0]$).
     - [`SIMULATION_METHODOLOGY.md`](file:///c:/Users/User/Desktop/Salman/Projects/SIMULATION_METHODOLOGY.md#L46-L53) wrote the equations using a discrete `mitigationProfile` enum (`restricted | baseline | enhanced`).
     - **Resolution:** Having continuous numeric levers (`rerouteCapacityShare`, `substitutionFlexibility`, `shippingCostMultiplier`) in `ScenarioParameters` is strictly more expressive and matches `presets.ts` and `validateNetwork.ts`. In `simulateScenario.ts`, we should use the continuous parameters from `ScenarioParameters` directly (where `rerouteCapacityShare` scales edge `maxBypassShare`, `substitutionFlexibility` scales node `substitutionPotential`, and `shippingCostMultiplier` scales freight friction in $\text{CPI}_v(t)$), and optionally provide quick-preset mitigation buttons (`Restricted`, `Baseline`, `Enhanced`) that set those continuous sliders!
  2. **Inventory Units (`days` vs. `weeks`):**
     - In [`src/data/nodes.ts`](file:///c:/Users/User/Desktop/Salman/Projects/src/data/nodes.ts), `baselineInventoryDays` is stored in **days** (e.g., `14 days`, `28 days`), whereas the time step in `simulateScenario.ts` is **1 week ($7\text{ days}$)**.
     - **Resolution:** In `simulateScenario.ts`, initial inventory capacity in weeks must be converted via $I_v^{\max\text{ (weeks)}} = \frac{\mu_{\text{inv}} \cdot \text{baselineInventoryDays}_v}{7}$ (or weekly drawdown multiplied by $7\text{ days/week}$) so `remainingInventoryDays` in `NodeWeeklyState` is reported consistently in **days** alongside `inventoryCoverageRatio` $\in [0, 1]$.
  3. **Severity Band Threshold Alignment:**
     - [`src/engine/validateNetwork.ts`](file:///c:/Users/User/Desktop/Salman/Projects/src/engine/validateNetwork.ts#L46-L53), [`src/components/common/SeverityBadge.tsx`](file:///c:/Users/User/Desktop/Salman/Projects/src/components/common/SeverityBadge.tsx), and [`src/test/dataIntegrity.test.ts`](file:///c:/Users/User/Desktop/Salman/Projects/src/test/dataIntegrity.test.ts#L64-L75) test and enforce the canonical bands: `0–4` (`Baseline`), `5–19` (`Low`), `20–39` (`Moderate`), `40–64` (`Elevated`), and `65–100` (`Severe`). We will retain `getSeverityBand()` as the single authoritative band mapper across engine and UI.

### 4.5 Data Provenance, Units, Uncertainty & Scientific Credibility
- **Strengths:**
  - Every `TraceableValue` across all 48 nodes (`192` parameters) and 78 edges (`312` parameters) has explicit `unit`, `classification`, `confidence`, `sourceIds`, and `derivationNote`.
  - Automated validation confirms `399` `observed` parameters, `26` `derived` parameters, and `79` `model_parameter` entries, with `0` un-cited values.
  - Every preset explicitly lists `excludedClaims` (refusing to forecast `$/bbl` oil prices, retail `%` markups, or national CPI inflation).
- **Credibility Safeguard Required for Stage 2/3:**
  - When simulated $\text{REI}(t)$, $\text{CPI}(t)$, and remaining inventory days $I_v(t)$ are rendered in the UI, they must be badged as **Simulated Output (Model-Derived)** and paired with a clear tooltip formula summary so users never confuse simulated trajectories with historical empirical observations.

---

## 5. Prioritized Gap Analysis (Ranked Tasks)

The eight remaining product and engineering tasks are ranked below by **User Value**, **Scientific Credibility**, **Technical Risk**, **Dependencies**, and **Estimated Effort**:

| Rank | Task / Feature | User Value | Scientific Credibility | Technical Risk | Dependencies | Effort | Rationale |
| :---: | :--- | :---: | :---: | :---: | :--- | :---: | :--- |
| **1** | **Pure 26-Week Simulation Engine, Input Normalizer & Causal Pathway Tracer (`src/engine/`)** | **Critical (5/5)** | **Critical (5/5)** | **High** (Math invariants, buffer depletion, DAG lag handling) | Stage 1 dataset & types (Done) | **Medium** | Core engine of EconoLoom. Unlocks dynamic $\text{REI}(t)$, $\text{CPI}(t)$, inventory buffer drawdown $I_v(t)$, and bottleneck causal path ranking across all 27 time steps ($t = 0 \dots 26$). |
| **2** | **Interactive Scenario Controls, Week Scrubber & Dynamic Node/Pathway Inspector (`src/state/` & `src/components/`)** | **Critical (5/5)** | **High (5/5)** | **Medium** (State sync across sliders, week scrubber, and inspector) | Rank 1 (`simulateScenario.ts`) | **Medium** | Connects the simulation engine to the user: live parameter sliders + numeric inputs, Week $0 \dots 26$ timeline scrubber with Play/Pause & SVG trajectory chart, and live simulated readouts in the Right Inspector. |
| **3** | **Deterministic 4-Tier SVG Dependency Network & Anti-Clutter Filter Bar (`src/components/network/`)** | **High (5/5)** | **High (4/5)** | **Medium** (Bézier edge routing, 48-node legibility, keyboard focus) | Rank 1 & Rank 2 | **Medium** | Replaces the static Tier 0–3 chip list with an interactive 4-tier directed graph showing live shock propagation, edge flow stress, and 1-hop/2-hop neighborhood filtering. |
| **4** | **Offline Natural Earth `d3-geo` Vector Map & Tabular Fallback (`src/components/map/`)** | **High (4/5)** | **High (4/5)** | **Medium** (TopoJSON bundle, anti-meridian/waypoint arcs, fallback) | Rank 1 & Rank 2 | **Medium** | Replaces the Zone B1 text slot with an offline vector map showing chokepoint beacons, regional exposure halos, disrupted shipping corridors, and `--mitigation-cyan` bypass routes. |
| **5** | **Dedicated Consumer Cost-Pressure & Multi-Hop Pathway Explorer Tab (`ImpactPathwayPanel.tsx`)** | **High (4/5)** | **Critical (5/5)** | **Low** | Rank 1 & Rank 2 | **Small–Med** | Allows users to pick any everyday consumer basket (`con_groceries`, `con_vehicles`, `con_smartphones`, etc.) and inspect its primary/secondary upstream causal chains and BOM cost-pressure drivers. |
| **6** | **Scenario Comparison Drawer (`compareScenarios.ts` & `ComparisonDrawer.tsx`)** | **Medium–High (4/5)** | **High (4/5)** | **Low–Med** | Rank 1 & Rank 2 | **Small–Med** | Enables side-by-side comparison of Active vs. Baseline or Mitigated vs. Unmitigated scenarios ($\Delta \text{Peak REI}$, $\Delta \text{Stockout Week}$, overlaid 26-week curves). |
| **7** | **Local Scenario Persistence (`localStorage`) & URL Query State Sync (`persistence.ts`, `urlState.ts`)** | **Medium (3/5)** | **Medium (3/5)** | **Low** (Zod schema validation & quota fallback) | Rank 2 | **Small** | Lets users save custom scenarios locally, export/import JSON, and share reproducible scenario links via URL query parameters. |
| **8** | **End-to-End Playwright Browser Suite & WCAG 2.1 AA Accessibility Polish (`e2e/smoke.spec.ts`)** | **High (4/5)** | **High (4/5)** | **Low** | Ranks 1–7 | **Small–Med** | Automates desktop (`1440×900`) and mobile (`390×844`) browser verification, `aria-live` announcements, modal focus trapping, and zero-console-error assertions. |

---

## 6. Specification for the Single Highest-Value Next Milestone

### Milestone Title
**Stage 2/3 Core Milestone: Pure 26-Week Deterministic Simulation Engine, Causal Pathway Tracer, Interactive Scenario Controls & Live Timeline Scrubber** *(Combining Ranked Tasks #1 and #2 into a single cohesive, user-verifiable milestone)*

### Why This Milestone Is Highest Value
Implementing `src/engine/simulateScenario.ts` in isolation without wiring it to interactive parameter controls, a Week $0 \dots 26$ timeline scrubber, and dynamic inspector readouts would leave the user interface static. Conversely, building map or network SVG chrome before the simulation engine is verified would violate our clean-room engineering rule against unbacked visuals. Combining **Task #1 (Pure Simulation & Pathway Engine)** and **Task #2 (Interactive Controls, Week Scrubber & Dynamic Inspector)** delivers a complete, scientifically credible, end-to-end interactive loop where users can pull any scenario lever, scrub across 26 weeks, and inspect real calculated propagation trajectories.

### 6.1 Explicit Acceptance Criteria
1. **Pure Deterministic Engine (`src/engine/`):**
   - `src/engine/normalizeInputs.ts` clamps and sanitizes any `ScenarioParameters` input (replacing `NaN`/`Infinity` with safe defaults and clamping all 6 levers to their legal bounds).
   - `src/engine/simulateScenario.ts` computes a complete 27-step (`Week 0` through `Week 26`) `SimulationResult` across all 48 nodes and 78 edges in **$< 5\text{ ms}$** with **zero React/DOM imports** and **zero `Math.random()` calls**.
   - Every `NodeWeeklyState` includes `rawInputShortfall`, `remainingInventoryDays`, `inventoryCoverageRatio`, `effectiveSubstitution`, `unbufferedShortfall`, `relativeExposureIndex` ($\text{REI} \in [0, 100]$), `directRei`, `indirectRei` ($E^{\text{dir}} + E^{\text{ind}} = \text{REI}$), `costPressureIndex` ($\text{CPI} \in [0, 100]$), `severityBand`, `dominantUpstreamNodeId`, and `dominantEdgeId`.
   - `src/engine/pathwayTracer.ts` extracts and ranks the top directed causal pathways from the active shock origin(s) to any target node at week $t$, computing cumulative transit lag and identifying the tightest bottleneck step.
2. **Mathematical & Scientific Invariants:**
   - **Zero-Shock Identity:** When `shockSeverityPct = 0`, $\text{REI}_v(t) = 0$, $\text{CPI}_v(t) = 0$, and `remainingInventoryDays` equals scaled baseline inventory for all 48 nodes and all weeks $t \in [0, 26]$.
   - **Monotonicity:** Increasing `shockSeverityPct` or `durationDays` strictly increases or maintains cumulative exposure $\sum_t \text{REI}_v(t)$; increasing `inventoryBufferScale`, `rerouteCapacityShare`, or `substitutionFlexibility` monotonically decreases or delays peak downstream $\text{REI}_v$.
   - **Strict Directionality:** Unconnected upstream nodes (e.g., `chk_hormuz` during a `chk_taiwan_fabs` shock) maintain $\text{REI}(t) = 0$ across all 26 weeks.
   - **Post-Shock Recovery Tail:** After `durationDays` elapses, origin curtailment decays exponentially and depleted downstream inventory buffers replenish gradually rather than snapping instantaneously to zero exposure.
3. **Interactive UI & State Synchronization (`src/state/` & `src/components/`):**
   - `useScenarioStore.tsx` manages mutable `scenarioParams: ScenarioParameters`, `currentWeek: number` ($0 \dots 26$), `isPlaying: boolean`, and memoized `simulationResult: SimulationResult`.
   - `ScenarioSelectorBar.tsx` provides interactive, synchronized slider + numeric inputs for the scenario parameters, a `Reset to Preset` button, and a `Zero Shock (0%)` baseline button.
   - A new `SimulationTimeline.tsx` component allows scrubbing from `Week 0` to `Week 26` (with `Play/Pause`, step `-1/+1 week` buttons, active disruption window shading, and a responsive SVG time-series chart plotting $\text{REI}(t)$, $\text{CPI}(t)$, and Inventory Buffer Cover for the selected node).
   - `NodeBaselineInspector.tsx` and `WorkspaceShell.tsx` display live Week-$t$ simulated $\text{REI}(t)$ (with Direct vs. Indirect decomposition), $\text{CPI}(t)$, Remaining Inventory Buffer gauge, and Top Traced Causal Pathways alongside the audited baseline parameters.

### 6.2 Affected & New Files
- **Modified Files:**
  - [`src/types/simulation.ts`](file:///c:/Users/User/Desktop/Salman/Projects/src/types/simulation.ts) — Add `directRei: number` and `indirectRei: number` to `NodeWeeklyState`.
  - [`src/state/useScenarioStore.tsx`](file:///c:/Users/User/Desktop/Salman/Projects/src/state/useScenarioStore.tsx) — Add mutable `scenarioParams`, `currentWeek`, `isPlaying`, parameter update actions, and memoized `simulateScenario()` execution.
  - [`src/components/layout/ScenarioSelectorBar.tsx`](file:///c:/Users/User/Desktop/Salman/Projects/src/components/layout/ScenarioSelectorBar.tsx) — Upgrade read-only parameter cards to interactive slider + numeric controls with `Reset to Preset` and `Zero Shock` actions.
  - [`src/components/inspector/NodeBaselineInspector.tsx`](file:///c:/Users/User/Desktop/Salman/Projects/src/components/inspector/NodeBaselineInspector.tsx) — Add Week-$t$ Simulated Exposure ($\text{REI}$, Direct/Indirect split, $\text{CPI}$, Inventory Buffer drawdown bar) clearly separated from Audited Baseline Parameters.
  - [`src/components/layout/WorkspaceShell.tsx`](file:///c:/Users/User/Desktop/Salman/Projects/src/components/layout/WorkspaceShell.tsx) — Embed `SimulationTimeline` and bind Week-$t$ severity badges and causal pathway readouts across the Overview and Dataset Explorer views.
- **New Files to Create:**
  - `src/engine/normalizeInputs.ts` — Pure parameter clamping and sanitization.
  - `src/engine/pathwayTracer.ts` — Pure directed causal chain extractor and bottleneck scorer.
  - `src/engine/simulateScenario.ts` — Pure 26-week discrete-time shock propagation and inventory buffer engine.
  - `src/components/timeline/SimulationTimeline.tsx` — Interactive 26-week scrubber, playback controls, and SVG trajectory chart (`REI(t)`, `CPI(t)`, `Inventory(t)`) with screen-reader summary table.
  - `src/test/engine.test.ts` — Comprehensive unit test suite proving all mathematical invariants, edge cases, and performance bounds.

### 6.3 Required Verification Tests
1. **`src/test/engine.test.ts` (Unit Tests):**
   - Zero-shock identity test ($S = 0 \implies \forall v, t: \text{REI}_v(t) = 0, \text{CPI}_v(t) = 0$).
   - Severity and duration monotonicity tests across all 3 presets.
   - Inventory buffer scaling test ($\mu_{\text{inv}} = 2.0$ delays or reduces downstream peak $\text{REI}$ vs. $\mu_{\text{inv}} = 0.5$).
   - Route bypass and substitution mitigation tests.
   - Directionality & unconnected node isolation test (`chk_hormuz` has $\text{REI} = 0$ under `preset_taiwan_semi`).
   - Direct vs. Indirect decomposition identity ($\forall v, t: \text{directRei} + \text{indirectRei} \approx \text{relativeExposureIndex}$).
   - Pathway tracer test verifying valid connected paths from shock origin to `con_groceries`, `con_vehicles`, and `con_appliances`.
   - Fuzz/boundary safety test (`NaN`, `Infinity`, negative inputs produce zero `NaN` outputs) and $< 5\text{ ms}$ execution benchmark.
2. **`src/test/appFoundation.test.tsx` (Component Synchronization Tests):**
   - Adjusting the Shock Severity slider/input updates the displayed Week-$t$ $\text{REI}$ and $\text{CPI}$ readouts in the inspector and overview.
   - Scrubbing the timeline from `Week 0` to `Week 8` updates the displayed week and node exposure metrics in lockstep.
   - Clicking `Zero Shock (0%)` resets all displayed node exposures to `0` (`Baseline`) and clicking `Reset to Preset` restores the preset's default trajectory.

### 6.4 Data & Licensing Limitations to Respect
- **Strict Clean-Room Rule (`AGENTS.md` Section 2.3):** Zero code or configuration may be copied or adapted from GPL-3.0 `DisruptSC`. All algorithms in `src/engine/simulateScenario.ts` and `src/engine/pathwayTracer.ts` must be written from scratch in TypeScript from the equations in [`SIMULATION_METHODOLOGY.md`](file:///c:/Users/User/Desktop/Salman/Projects/SIMULATION_METHODOLOGY.md).
- **Epistemic Guardrail (`AGENTS.md` Section 2.1):** Simulated $\text{REI}(t)$ and $\text{CPI}(t)$ must always be presented as bounded $[0, 100]$ ordinal stress indices paired with qualitative severity bands (`Baseline`, `Low`, `Moderate`, `Elevated`, `Severe`), never as retail price percentage forecasts or inflation predictions.
