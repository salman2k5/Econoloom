# EconoLoom — Interactive Global Economic Shock Explorer

> *"Pull one thread of the global economy. Explore what else might unravel."*

**Live Demo:** [https://econoloom.vercel.app/](https://econoloom.vercel.app/)

**EconoLoom** is a client-side, deterministic global economic shock and supply-chain dependency explorer. It enables analysts, educators, students, and policy readers to perturb critical nodes of the global economy—such as maritime chokepoints, semiconductor foundry clusters, or key commodity corridors—and trace how disruptions propagate week by week through intermediate commodities, industrial sectors, and everyday consumer categories.

---

## Important Epistemic & Model Disclaimer

**EconoLoom is an educational scenario-analysis and structural dependency exploration instrument. Its outputs are deterministic, model-based scenario estimates—never guaranteed forecasts, real-time market feeds, retail price predictions, or financial/investment advice.**

Every quantitative output in EconoLoom is governed by strict epistemic guardrails:
1. **Conditional Scenario Framing:** All simulation outputs represent conditional responses to user-configured parameters over a discrete 26-week horizon under explicit mathematical assumptions.
2. **Relative Stress Indices, Never Retail Price or Inflation Claims:** Because short-run retail price pass-through depends on unmodeled demand elasticities, monetary policy, exchange rates, and firm-level markups, EconoLoom **never** predicts dollar commodity prices (`$/bbl`), retail shelf prices, or national inflation rates (`% CPI`). Instead, it computes two bounded dimensionless indices on `[0, 100]`:
   - **Relative Exposure Index ($\text{REI} \in [0, 100]$):** Measures the degree of unbuffered upstream supply shortfall and operational bottleneck pressure reaching a node at simulation week $t$.
   - **Cost-Pressure Index ($\text{CPI} \in [0, 100]$):** Measures cumulative upstream input scarcity, buffer-depletion stress, and maritime rerouting freight friction affecting downstream industries and consumer categories.
3. **Full Provenance & Data-Tier Transparency:** Every node, directed edge, baseline parameter, and assumption carries an explicit five-tier epistemic classification (`observed`, `derived`, `model_parameter`, `user_input`, or `illustrative`) and links to its underlying public source citations and rationale.

---

## Problems EconoLoom Helps Users Explore

Static news articles and high-level trade charts rarely explain *how*, *when*, and *why* an upstream disruption cascades into seemingly unrelated industries:
- **Multi-Hop Industrial Cascades:** Trace non-obvious industrial chains—for example, how a Strait of Hormuz transit curtailment restricts seaborne elemental sulfur exports (`chk_hormuz` $\rightarrow$ `com_sulfur`), constraining sulfuric acid production (`com_sulfuric_acid`) required for hydrometallurgical copper oxide leaching (`ind_copper_mining`), and ultimately pressuring refined copper (`com_copper`) used in residential wiring (`con_construction`) and passenger vehicles (`con_vehicles`).
- **Inventory Buffer Exhaustion Thresholds:** Observe why downstream sectors can appear resilient during Weeks 1–4 of a disruption while working inventory buffers absorb the shock, before crossing non-linear stockout inflection points around Weeks 6–10.
- **Bottleneck Criticality vs. Input Share:** Explore Leontief complementarity in complex manufacturing—such as how a shortage of advanced logic semiconductors (`<7nm`) or automotive microcontrollers (`28nm+`) halts downstream server or vehicle assembly even when bulk commodities are abundant.
- **Mitigation & Counterfactual Trade-Offs:** Compare how expanding strategic inventory buffers (`0.5×` to `2.0×`), activating pipeline/maritime bypass corridors (`0%` to `100%`), or increasing post-Week-2 supplier substitution flexibility alters peak exposure, cumulative stress (`REI-weeks`), and post-disruption recovery lag.

---

## Key Features

- **Curated 48-Node, 78-Edge Directed Acyclic Network:**
  - **3 Chokepoints (`chokepoint`):** Strait of Hormuz, Taiwan Advanced Semiconductor Foundries, Panama Canal Locks.
  - **9 Regional Economic Hubs (`geography`):** Persian Gulf (`GULF`), Taiwan (`TWN`), South Korea (`KOR`), Japan (`JPN`), China (`CHN`), India (`IND`), United States (`USA`), European Union (`EU27`), South America Andean Belt (`SAM`).
  - **14 Critical Commodities (`commodity`):** Seaborne Crude Oil, LNG, Naphtha & LPG, Elemental Sulfur, Sulfuric Acid, Primary Aluminum, Refined Copper, Urea & Nitrogen Fertilizers, High-Purity Semiconductor Solvents & Photoresists, 300mm Silicon Wafers, Advanced Logic Semiconductors (`<7nm`), Mature/Automotive Microcontrollers (`28nm+`), Containerized Freight, Dry Bulk Grain & Soy.
  - **14 Industrial Sectors (`industry`):** Aligned with ISIC Rev. 4 / OECD ICIO groupings across refining, petrochemicals, fertilizers, metals, semiconductors, electronics, automotive, textiles, food processing, packaging, and maritime logistics.
  - **8 Everyday Consumer Categories (`consumer_category`):** Household Gasoline & Heating Energy, Retail Groceries & Packaged Food, Everyday Apparel & Fast Fashion, Smartphones & Personal Computing, Cloud & AI Digital Services, Passenger Vehicles & Auto Repair, Household Appliances & White Goods, Residential Construction & Electrical Wiring.
- **3 Evidence-Backed Disruption Presets + Interactive Parameter Matrix:**
  - **Preset 1:** *Strait of Hormuz Energy & Industrial Feedstock Shock* (`preset_hormuz_energy`)
  - **Preset 2:** *Taiwan Advanced Semiconductor Foundry & Packaging Disruption* (`preset_taiwan_semi`)
  - **Preset 3:** *Panama Canal Drought Draft & Transit Slot Restriction* (`preset_panama_canal`)
  - Real-time synchronized sliders and numeric inputs for **Shock Severity (`0%–100%`)**, **Duration (`7–180 days`)**, **Inventory Buffer Scale (`0.50×–2.00×`)**, **Rerouting Capacity Share (`0%–100%`)**, **Substitution Flexibility (`0%–100%`)**, and **Shipping Cost Multiplier (`1.00×–4.00×`)**.
- **Synchronized Geographic Map & 5-Tier Dependency Graph:**
  - **Geographic View (`WorldMap.tsx`):** Self-contained offline SVG world map displaying the 12 physical chokepoint and regional hub nodes, primary disrupted shipping/pipeline corridors, bypass routes, pan/zoom/corridor-focus controls, and a toggleable **Tabular Corridor & Hub Matrix Fallback (`MapFallbackMatrix.tsx`)**.
  - **Dependency Network (`DependencyNetwork.tsx`):** Deterministic 5-tier left-to-right DAG (`Chokepoints` $\rightarrow$ `Regional Hubs` $\rightarrow$ `Commodities` $\rightarrow$ `Industries` $\rightarrow$ `Consumer Categories`) with neighborhood hop filters (`All`, `1-Hop`, `2-Hop`), category filters, keyword search, interactive edge inspection, and active/alternate causal pathway highlighting.
- **26-Week Simulation Timeline & Trajectory Scrubber (`SimulationTimeline.tsx`):**
  - Scrub or animate across **Weeks 0–26** (`182 days`), with shaded active-disruption vs. post-shock recovery phases and synchronized multi-metric SVG trajectories (`REI`, `CPI`, and remaining inventory buffer days).
- **Multi-Hop Impact Pathway Explorer (`ImpactPathwayExplorer.tsx`):**
  - Ranks up to 5 simple directed causal pathways from the active shock origin(s) to any selected node, identifies the **Primary Bottleneck Link** via resistance scoring, and breaks down hop-by-hop dependency weights, input criticalities, transit lags, active bypass shares, and Week-$t$ exposure.
- **Isolated A/B Counterfactual Comparison Workbench (`ScenarioComparisonView.tsx`):**
  - Compare Reference Scenario A against Counterfactual Scenario B across 4 one-click resilience templates or custom parameter configurations without overwriting the main workspace state. Includes a parameter diff matrix, network-wide summary deltas, a dual-trajectory SVG chart, and a sortable 48-node delta table.
- **Audited Dataset Explorer, Provenance Inspector & Shareable State:**
  - Inspect node/edge structural parameters, 14 cited institutional sources, and 8 explicit model assumptions; persist state automatically in schema-validated `localStorage`; copy shareable URLs with query parameters; or export a versioned JSON scenario snapshot (`econoloom.scenario_snapshot.v1`).

---

## Screenshots

No static screenshot image files are currently committed to the repository. To explore the interface interactively—including the Global Intelligence dark-theme workbench, synchronized vector map, 5-tier dependency network, pathway explorer, and A/B scenario comparison view—visit the live deployment:

👉 **[Launch EconoLoom Live Demo (https://econoloom.vercel.app/)](https://econoloom.vercel.app/)**

---

## Technology Stack

Verified directly from [`package.json`](./package.json), [`tsconfig.json`](./tsconfig.json), [`vite.config.ts`](./vite.config.ts), and [`playwright.config.ts`](./playwright.config.ts):

| Layer | Technology | Version / Details |
| :--- | :--- | :--- |
| **UI Framework** | React + React DOM | `^18.3.1` |
| **Language** | TypeScript | `~5.6.3` (`strict: true`, `noUncheckedIndexedAccess: true`) |
| **Build Tool & Dev Server** | Vite + `@vitejs/plugin-react` | `^6.0.1` / `^4.3.4` |
| **Styling** | Tailwind CSS + PostCSS + Autoprefixer | `^3.4.15` + custom CSS variables in [`src/index.css`](./src/index.css) |
| **Runtime Schema Validation** | Zod | `^3.23.8` (`localStorage` & URL state validation) |
| **Icons** | `lucide-react` | `^0.460.0` |
| **Visualizations** | Custom Deterministic React SVG | Zero external charting/map runtime dependencies; bundled vector geometry in [`src/data/geo/worldLandmarks.ts`](./src/data/geo/worldLandmarks.ts) |
| **Unit & Integration Testing** | Vitest + React Testing Library + `jsdom` | `vitest ^2.1.5`, `@testing-library/react ^16.1.0`, `@testing-library/jest-dom ^6.6.3` |
| **End-to-End Browser Testing** | Playwright | `@playwright/test ^1.49.0` |
| **Linting** | ESLint 9 + `typescript-eslint` | `^9.15.0` / `^8.15.0` |

---

## Getting Started

### Prerequisites

- **Node.js:** `v18.18+` or `v20+` LTS recommended (ES2022 module support)
- **npm:** `v9+` or `v10+` (ships with Node.js)

### Installation

Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd econoloom
npm install
```

### Environment Configuration

EconoLoom is **100% client-side and offline-capable**. It requires **zero `.env` files, zero backend servers, and zero external API keys**. All network topology, source provenance records, and cartographic landmass coordinates are bundled directly in `src/data/`.

### Local Development & Build Commands

All scripts are defined in [`package.json`](./package.json):

```bash
# Start the local Vite development server with HMR
npm run dev

# Run TypeScript strict type checking (tsc --noEmit)
npm run typecheck

# Run ESLint across the codebase
npm run lint

# Create a production build in dist/ (runs tsc --noEmit && vite build)
npm run build

# Preview the production build locally
npm run preview
```

---

## High-Level Architecture Overview

EconoLoom enforces a strict unidirectional data flow and separation of concerns across four architectural layers:

```text
econoloom/
├── index.html                        # Entry HTML with inline SVG favicon & metadata
├── package.json                      # Scripts and verified dependency manifest
├── vite.config.ts                    # Vite build chunking (vendor, geo-data, index) & Vitest config
├── tailwind.config.js                # Global Intelligence theme tokens & typography stacks
├── playwright.config.ts              # Playwright E2E browser test configuration
├── e2e/
│   └── releaseSmoke.spec.ts          # 9-stage live browser E2E verification suite
└── src/
    ├── types/                        # Strict TypeScript interfaces
    │   ├── domain.ts                 # NetworkNode, DependencyEdge, SourceRecord, TraceableValue
    │   ├── simulation.ts             # SimulationResult, NodeWeeklyState, PathwayAnalysisReport
    │   └── ui.ts                     # WorkspaceTab, CanvasViewMode, DatasetFilterState
    ├── data/                         # Audited, locally bundled dataset & provenance catalog
    │   ├── nodes.ts                  # 48 nodes across 5 categories & tiers (0..4)
    │   ├── edges.ts                  # 78 directed supply-chain & maritime edges
    │   ├── corridors.ts              # Physical corridor waypoints & bypass route geometry
    │   ├── presets.ts                # 3 flagship disruption presets (Hormuz, Taiwan, Panama)
    │   ├── sources.ts                # 14 SourceRecord citations & 8 ModelAssumption records
    │   ├── geo/worldLandmarks.ts     # Offline world landmass polygons & projection helpers
    │   └── index.ts                  # Unified dataset export & initial DAG validation report
    ├── engine/                       # Pure, deterministic TypeScript simulation core (0 React/DOM imports)
    │   ├── normalizeInputs.ts        # Parameter clamping & NaN/Infinity sanitization
    │   ├── validateNetwork.ts        # Referential integrity, provenance & Kahn's DAG cycle validator
    │   ├── simulateScenario.ts       # 26-week propagation, bypass, substitution & buffer engine
    │   ├── pathwayTracer.ts          # Simple directed path discovery, bottleneck & resistance scoring
    │   ├── compareScenarios.ts       # Pure Scenario A vs. Scenario B counterfactual delta calculator
    │   └── graphLayout.ts            # Deterministic 5-tier SVG node & cubic Bézier layout calculator
    ├── state/                        # Canonical synchronized state & persistence
    │   ├── useScenarioStore.tsx      # React Context store synchronizing all views in lockstep
    │   └── scenarioPersistence.ts    # Zod-validated localStorage, URL query sync & JSON snapshot export
    ├── components/                   # Synchronized UI views
    │   ├── common/                   # Panel, Button, SeverityBadge, DataTierBadge, Tooltip
    │   ├── layout/                   # AppHeader, ScenarioSelectorBar, WorkspaceShell
    │   ├── map/                      # WorldMap & MapFallbackMatrix
    │   ├── network/                  # DependencyNetwork (interactive 5-tier SVG DAG)
    │   ├── timeline/                 # SimulationTimeline (Weeks 0–26 scrubber & chart)
    │   ├── inspector/                # NodeBaselineInspector (right-hand intelligence dossier)
    │   ├── pathway/                  # ImpactPathwayExplorer (multi-hop causal chain diagnostics)
    │   ├── comparison/               # ScenarioComparisonView (isolated A/B counterfactual workbench)
    │   └── methodology/              # MethodologyModal (equations, guardrails & assumptions dialog)
    └── test/                         # 8 Vitest unit & component integration test suites (67 tests)
```

### Architectural Invariants
1. **Pure Simulation Engine (`src/engine/`):** Contains pure, deterministic TypeScript functions with zero React or DOM imports, zero `Math.random()` calls, and zero side effects. Identical inputs always produce bit-identical 26-week trajectories.
2. **UI Never Invents Economic Math (`src/components/`):** React components never calculate or approximate economic metrics; they read pre-computed state from `useScenarioStore`.
3. **Single Synchronized Source of Truth (`src/state/useScenarioStore.tsx`):** Selecting a preset, dragging a parameter slider, clicking a map or graph node, choosing a ranked causal pathway, or scrubbing the simulation week updates all workspace views simultaneously.

---

## Testing & Verification

EconoLoom includes a comprehensive 4-layer verification suite covering static analysis, dataset provenance, mathematical invariants, component integration, and live headless browser execution.

### 1. Run Unit & Integration Tests (Vitest)
Executes all 8 test suites (**67 tests**) in `src/test/` (`dataIntegrity.test.ts`, `engine.test.ts`, `pathwayEngine.test.ts`, `pathwayExplorer.test.tsx`, `graphAndMap.test.tsx`, `scenarioComparison.test.tsx`, `persistenceAndSharing.test.tsx`, and `appFoundation.test.tsx`):

```bash
# Run all 67 Vitest unit and integration tests once
npm test -- --run

# Or run Vitest in interactive watch mode
npm test
```

### 2. Run Static Type & Lint Checks
```bash
npm run typecheck
npm run lint
```

### 3. Run End-to-End Browser Tests (Playwright)
Builds and previews the application, then runs [`e2e/releaseSmoke.spec.ts`](./e2e/releaseSmoke.spec.ts) to verify the complete 9-stage user journey across desktop (`1440×900`) and mobile (`390×844`) viewports with zero console or page errors:

```bash
npm run build
npx playwright test
```
*(Note: [`playwright.config.ts`](./playwright.config.ts) is configured to use the `msedge` Desktop Edge channel against `http://127.0.0.1:4173` via `npm run preview`.)*

---

## Current Limitations & Known Caveats

Supported by [`SIMULATION_METHODOLOGY.md`](./SIMULATION_METHODOLOGY.md), [`DATA_STRATEGY.md`](./DATA_STRATEGY.md), [`ASSUMPTIONS_AND_RISKS.md`](./ASSUMPTIONS_AND_RISKS.md), and [`PROJECT_STATUS.md`](./PROJECT_STATUS.md):

1. **No Live Market Feeds or Real-Time AIS Tracking:** EconoLoom does not ingest live satellite vessel tracking, port congestion feeds, or real-time commodity spot prices. All simulations run against a curated, version-controlled baseline network.
2. **Relative Indices (`0–100`), Not Price or Inflation Forecasts:** Outputs are bounded Relative Exposure Index (`REI`) and Cost-Pressure Index (`CPI`) scores. The model is not a Computable General Equilibrium (CGE) price-clearing model and does not forecast dollar prices (`$/bbl`, `$/FEU`) or national CPI inflation percentages.
3. **Curated 48-Node Macro-Sector & Commodity Aggregation:** Rather than modeling thousands of individual firms or HS6 product codes, the network aggregates global flows into 48 representative nodes and 78 directed links.
4. **Discrete Weekly Time Step over a 26-Week Horizon:** Transit delays and inventory drawdowns are evaluated in integer weeks (`t = 0..26`, `182 days`) with short-run fixed technical input proportions (`ASM-02`, `ASM-03`).
5. **Modeled Inventory Buffers & Illustrative Consumer BOM Weights:** Where firm-level commercial inventory holdings or product-level consumer bill-of-materials (BOM) splits are proprietary, parameters are explicitly classified as `model_parameter` or `illustrative` and calibrated from published literature ranges (`ASM-04`, Section 2 of `ASSUMPTIONS_AND_RISKS.md`).
6. **Structural Pathway Heuristics:** Pathway scores (`0–100`) in the Impact Pathway Explorer are monotonic structural transmission heuristics used to rank relative pathway salience and identify primary bottlenecks; because node exposure uses a nonlinear hybrid weighted-average and Leontief bottleneck operator coupled with shared node inventory buffers, pathway scores do not sum additively to a node's total `REI`.
7. **Ephemeral A/B Sandbox Edits:** Counterfactual Scenario A and Scenario B slider adjustments inside the Comparison tab are intentionally kept in local component state so exploratory A/B comparisons never overwrite the user's primary workspace scenario.

---

## Project Documentation

For deep dives into the product scope, equations, data provenance, and architecture, consult the canonical specification documents in the repository root:

- [`PRODUCT_REQUIREMENTS.md`](./PRODUCT_REQUIREMENTS.md) — Product vision, user personas, MVP network scope, preset definitions, and functional requirements.
- [`SIMULATION_METHODOLOGY.md`](./SIMULATION_METHODOLOGY.md) — Exact deterministic weekly propagation equations, inventory buffer drawdown/replenishment recurrences, REI/CPI formulas, and pathway ranking heuristics.
- [`DATA_STRATEGY.md`](./DATA_STRATEGY.md) — Public data source evaluations (OECD ICIO/IOT/GVC, World Bank Pink Sheet, U.S. EIA, UNCTAD, Panama Canal Authority, SIA/BCG, IIASA briefs, Natural Earth), licensing rules, and 5-tier provenance schemas.
- [`TECHNICAL_ARCHITECTURE.md`](./TECHNICAL_ARCHITECTURE.md) — Architectural principles, module boundaries, data flow, and verification pyramid.
- [`ASSUMPTIONS_AND_RISKS.md`](./ASSUMPTIONS_AND_RISKS.md) — Recorded modeling assumptions (`ASM-01` through `ASM-06`), evidence gaps, and risk mitigations.
- [`UX_SPECIFICATION.md`](./UX_SPECIFICATION.md) — Visual design tokens, layout hierarchy, interaction inventory, and accessibility rules.
- [`COMPETITIVE_RESEARCH.md`](./COMPETITIVE_RESEARCH.md) — Analysis of existing macro-IO, trade visualization, and supply-chain simulation tools.
- [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) — Sequenced development stages and deliverables.
- [`PROJECT_STATUS.md`](./PROJECT_STATUS.md) — Latest verification results, audit findings, and release status report.

---

## Contributing

Contributions that improve empirical data provenance, accessibility, test coverage, or documentation clarity are welcome:

1. **Fork and create a feature branch** from `main`.
2. **Preserve architectural and epistemic guardrails:**
   - Keep `src/engine/` pure and deterministic (no React/DOM imports, no `Math.random()`).
   - Every quantitative parameter in `src/data/` must carry a valid `TraceableValue` with an honest `DataClassification` (`observed`, `derived`, `model_parameter`, `user_input`, or `illustrative`) and valid `sourceIds`.
   - Never introduce unsubstantiated retail price or national inflation percentage claims.
   - Maintain strict clean-room licensing compliance (never copy or adapt GPL-3.0 code from external repositories such as `DisruptSC`).
3. **Run the full verification suite before opening a Pull Request:**
   ```bash
   npm run typecheck
   npm run lint
   npm test -- --run
   npm run build
   npx playwright test
   ```

---

## License & Data Attribution

- **Source Code License:** No license has been specified yet for this repository (`"private": true` in `package.json`, and no `LICENSE` file is currently present). Until an explicit open-source license is added by the repository owner, default copyright laws apply.
- **Public Data Sources & Clean-Room Attribution:** EconoLoom's simulation engine is a clean-room TypeScript implementation written from first-principles equations in [`SIMULATION_METHODOLOGY.md`](./SIMULATION_METHODOLOGY.md). Baseline network parameters cite public institutional data from the **OECD** (ICIO / IOT / GVC), **World Bank** (*Commodity Price Data — The Pink Sheet*, CC BY 4.0), **U.S. Energy Information Administration (EIA)** (Public Domain), **UNCTAD**, **Panama Canal Authority (ACP)**, **Semiconductor Industry Association (SIA) / BCG**, **IIASA / Colon et al.** (published research findings), and **Natural Earth** (Public Domain CC0). Full source records and license notes are inspectable in [`src/data/sources.ts`](./src/data/sources.ts) and inside the application's *Evidence & Sources* view.
