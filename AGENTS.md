# AGENTS.md — PERSISTENT PROJECT INSTRUCTIONS FOR ECONOLOOM

**Project:** EconoLoom — Interactive Global Economic Shock Explorer  
**Purpose of this File:** Non-negotiable product, data-integrity, mathematical, UX, and engineering instructions that every coding session and agent task must obey.

---

## 1. Canonical Specification Documents

Before implementing or modifying any feature, consult the authoritative specifications in the workspace root:
- [`PRODUCT_REQUIREMENTS.md`](file:///c:/Users/User/Desktop/Salman/Projects/PRODUCT_REQUIREMENTS.md) — Vision, personas, MVP scope (48 nodes, 78 edges, 3 presets), functional requirements, and acceptance criteria.
- [`COMPETITIVE_RESEARCH.md`](file:///c:/Users/User/Desktop/Salman/Projects/COMPETITIVE_RESEARCH.md) — Verified competitor analysis and differentiation strategy.
- [`DATA_STRATEGY.md`](file:///c:/Users/User/Desktop/Salman/Projects/DATA_STRATEGY.md) — Source evaluations, licensing rules, TypeScript schemas, and 5-tier provenance taxonomy.
- [`SIMULATION_METHODOLOGY.md`](file:///c:/Users/User/Desktop/Salman/Projects/SIMULATION_METHODOLOGY.md) — Exact deterministic weekly propagation equations, inventory buffer drawdown/recovery formulas, and index guardrails.
- [`UX_SPECIFICATION.md`](file:///c:/Users/User/Desktop/Salman/Projects/UX_SPECIFICATION.md) — Dark-first visual tokens, 4-zone workbench layout, interaction inventory, and WCAG 2.1 AA accessibility rules.
- [`TECHNICAL_ARCHITECTURE.md`](file:///c:/Users/User/Desktop/Salman/Projects/TECHNICAL_ARCHITECTURE.md) — Stack choices, module boundaries, folder structure, and 4-layer test strategy.
- [`IMPLEMENTATION_PLAN.md`](file:///c:/Users/User/Desktop/Salman/Projects/IMPLEMENTATION_PLAN.md) — Sequenced 6-stage development plan.
- [`ASSUMPTIONS_AND_RISKS.md`](file:///c:/Users/User/Desktop/Salman/Projects/ASSUMPTIONS_AND_RISKS.md) — Recorded assumptions, evidence gaps, and risk mitigations.

---

## 2. Non-Negotiable Product & Epistemic Guardrails

1. **Foresight & Exploration, Never Retail Price Prediction:**
   - EconoLoom is an educational scenario-analysis instrument.
   - **NEVER** display claims such as *"this shock will raise smartphone prices by 18%"* or predict specific dollar commodity prices (`$/bbl`) or national inflation rates (`% CPI`).
   - Always output the bounded **Relative Exposure Index ($\text{REI} \in [0, 100]$)** and **Cost-Pressure Index ($\text{CPI} \in [0, 100]$)** paired with their qualitative severity bands (`Baseline`, `Low`, `Moderate`, `Elevated`, `Severe`).
2. **100% Provenance & Data-Tier Transparency:**
   - Every node, edge, and quantitative parameter in `src/data/` MUST carry a valid `TraceableValue` with an explicit `DataClassification` (`'observed' | 'derived' | 'model_parameter' | 'user_input' | 'illustrative'`), `EvidenceConfidence`, and non-empty `sourceIds` linking to `src/data/sources.ts`.
   - Never fabricate citations, trade shares, inventory figures, or elasticity numbers. Where exact empirical data is unavailable, classify the value as `'model_parameter'` or `'illustrative'` and explain the rationale in plain English.
3. **Strict Clean-Room Licensing Compliance:**
   - `DisruptSC` (`github.com/ccolon/disrupt-sc`) is licensed under **GPL-3.0**. **NEVER copy, incorporate, translate, or adapt any code or configuration files from DisruptSC.** All simulation logic in `src/engine/` must be written from scratch in TypeScript from the equations in `SIMULATION_METHODOLOGY.md`.
   - Always display proper attribution in the Evidence & Provenance panel for public data sources (OECD ICIO/IOT/GVC, World Bank Pink Sheet CC BY 4.0, U.S. EIA, UNCTAD, Panama Canal Authority, SIA/BCG, IIASA research briefs, and Natural Earth CC0).

---

## 3. Architecture & Engineering Constraints

1. **Pure, Deterministic Simulation Engine (`src/engine/`):**
   - `src/engine/` must contain pure TypeScript functions with **zero React/DOM imports**, **zero `Math.random()` calls**, and **zero side effects**.
   - UI components (`src/components/`) must **never** calculate or invent economic metrics; they must read pre-computed state from `useScenarioStore`.
2. **Synchronized Single Source of Truth (`src/state/useScenarioStore.ts`):**
   - The Geographic View, Dependency Network, Simulation Timeline, Impact Pathway Explorer, Node Inspector, and Scenario Comparison Drawer must all read from and dispatch to the same canonical store.
   - Changing a preset, dragging a parameter slider, typing in a numeric input, clicking a node, or scrubbing the week ($t \in [0, 26]$) must update all views in lockstep.
3. **Zero Backend, Zero Paid APIs, 100% Offline-Capable:**
   - Do not introduce external map tile servers that require API keys, backend databases, authentication walls, or secret environment variables.
   - Use the bundled Natural Earth `110m` TopoJSON (`src/data/geo/world-110m.json`) with `d3-geo` and include a graceful tabular fallback (`MapFallbackMatrix.tsx`).
4. **Visual & Interaction Quality Standards:**
   - Follow the dark-first token palette in `UX_SPECIFICATION.md` (`#0B0F17` canvas, `#111722` panels, high-contrast semantic exposure accents).
   - No fake live tickers, no decorative edges without backing data, no non-working placeholder buttons, and no text smaller than `11px`.
   - Maintain full keyboard navigation (`Tab`, `Enter`, `Space`, `Arrow` keys) and dual colorblind-safe encoding (icon + numeric badge + border style + color) across all visualizations.

---

## 4. Mandatory Verification Procedure for Every Implementation Stage

Never claim a stage, feature, or test is complete unless you have actually executed the verification commands and inspected their output:

1. **Type Check:** `npm run typecheck` (`tsc --noEmit` with `"strict": true` and `"noUncheckedIndexedAccess": true`) — must pass with 0 errors.
2. **Lint Check:** `npm run lint` — must pass with 0 errors.
3. **Unit & Integration Tests:** `npm test -- --run` (Vitest covering data integrity, simulation math invariants, pathway tracing, persistence, and component synchronization) — all tests must execute and pass.
4. **Production Build:** `npm run build` — must compile cleanly with no broken imports or bundle warnings.
5. **Live Browser & E2E Smoke Verification:** Start the dev/preview server and run Playwright (`npx playwright test`) or inspect in a headless browser to verify:
   - Zero `console.error` or uncaught `pageerror` messages.
   - Interactive controls, map, network graph, timeline scrubber, inspector, and comparison views render and synchronize properly at both desktop (`1440×900`) and mobile (`390×844`) viewports.
