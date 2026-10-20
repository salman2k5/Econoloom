# ECONOLOOM — ASSUMPTIONS, EVIDENCE GAPS, RISKS & MITIGATIONS

**Document Status:** Phase 0 Discovery Risk Register  
**Last Updated:** 2026-10-19

---

## 1. Explicit Assumptions Made During Discovery

Because discovery required resolving product, data, modeling, and engineering architecture decisions without blocking on user questionnaires, the following professional decisions and assumptions were recorded:

| ID | Category | Assumption / Decision Made | Rationale | Validation Required Before / During Implementation |
| :--- | :--- | :--- | :--- | :--- |
| **ASM-01** | **Product Scope** | **48-Node, 78-Edge Unified Global Network:** The MVP models a single cohesive 48-node network spanning 3 chokepoints, 9 regional hubs, 14 commodities, 14 industries, and 8 consumer categories rather than three disconnected mini-graphs. | Allows cross-scenario insights (e.g., how a Strait of Hormuz naphtha/sulfur shock reaches Korean chip solvents and Chilean copper) while staying squarely within the 30–60 node target. | Verify during Stage 1 `dataIntegrity.test.ts` and Stage 3 visual layout inspection that all 48 nodes remain legible in the 4-tier DAG. |
| **ASM-02** | **Temporal Resolution** | **Weekly Discrete Time Step ($\Delta t = 1\text{ week}$) over a 26-Week Horizon ($182\text{ days}$):** User disruption durations in days ($7–180\text{d}$) are mapped onto a 26-week timeline. | Captures both the active disruption phases (Weeks 1–4 buffer absorption, Weeks 8–10 stockout threshold) and the post-reopening recovery tail without the noise of fake daily precision. | Validate in Stage 2 unit tests that fractional-week durations (e.g., $90\text{ days} = 12.86\text{ weeks}$) transition smoothly into recovery. |
| **ASM-03** | **Economic Modelling** | **Short-Run Fixed Input Proportions with Bounded Substitution:** Technical dependency shares ($w_e$) and bottleneck criticalities ($c_e$) are held constant over the 26-week horizon, with short-run adaptation represented by route bypass ($\beta_e$) and bounded input substitution ($\sigma_i \le 0.50$). | Over a 1-to-6 month shock window, industrial plants cannot redesign physical chemistry (e.g., copper oxide leaching still requires sulfuric acid; EUV lithography still requires photoresists). | Documented explicitly in [`SIMULATION_METHODOLOGY.md`](file:///c:/Users/User/Desktop/Salman/Projects/SIMULATION_METHODOLOGY.md) and surfaced in the in-app Methodology modal. |
| **ASM-04** | **Consumer Impact Metric** | **0–100 Cost-Pressure Index ($\text{CPI}$) Instead of Retail Price Percentages:** Consumer impact is expressed as a bounded Cost-Pressure Index ($0–100$) plus an Illustrative Input Exposure Breakdown. | Predicting exact retail price percentages (e.g., "+18% smartphone price") without a calibrated CGE price-elasticity and monetary model would violate EconoLoom's core honesty guardrail. | Enforce via code review and automated UI tests that no component outputs `%` retail price claims. |
| **ASM-05** | **Technical Stack** | **Zero-Key SVG Map (`d3-geo` + Natural Earth `110m`) & Deterministic 4-Tier SVG DAG:** Selected over WebGL tile maps (`MapLibre`) and physics force graphs (`d3-force`). | Guarantees 100% offline reliability, zero external API keys, deterministic positioning, full keyboard accessibility, and a fast bundle ($<180\text{ KB}$ gzipped). | Verify smooth 60fps pan/zoom and scrubber updates in Stage 3 and Stage 6 Playwright tests. |
| **ASM-06** | **Naming & IP** | **Provisional Brand ("EconoLoom"):** Treated strictly as a working project name. | Domain, trademark, and social handle availability have not been legally cleared. | Keep brand strings centralized in `src/components/layout/AppHeader.tsx` and config constants for easy renaming. |

---

## 2. Verification Limitations & Evidence Gaps Encountered

In accordance with our commitment never to invent research findings or conceal verification barriers, we explicitly document the following items from the discovery phase:

### 2.1 Automated HTTP 403 on OECD Dataset Landing Pages
- **What Occurred:** Direct automated HTTP requests via `read_url_content` to the three `oecd.org` URLs (`inter-country-input-output-tables.html`, `input-output-tables.html`, and `gross-output-flows-in-global-value-chains.html`) returned `HTTP 403 Forbidden` due to OECD's Cloudflare anti-bot challenge.
- **How We Mitigated It:** We verified the exact structure, sector coverage (ISIC Rev. 4, 50 industries, 80–81 economies + RoW), final demand columns (`HFCE`, `GFCF`, `INVNT`, `EXPO`), and GVC metrics (`Foreign Input Reliance` / `Foreign Market Reliance`) via indexed OECD technical documentation and secondary scholarly/institutional records, and documented the live-fetch limitation transparently in [`COMPETITIVE_RESEARCH.md`](file:///c:/Users/User/Desktop/Salman/Projects/COMPETITIVE_RESEARCH.md) and [`DATA_STRATEGY.md`](file:///c:/Users/User/Desktop/Salman/Projects/DATA_STRATEGY.md).
- **Fallback for MVP Implementation:** Because browser clients cannot fetch raw files from `oecd.org` due to CORS and Cloudflare protections anyway, EconoLoom bundles pre-extracted, derived sectoral dependency weights offline in `src/data/` with full attribution to OECD ICIO/IOT/GVC.

### 2.2 Proprietary Firm-Level Inventory & Contract Buffers
- **Evidence Gap:** While aggregate trade volumes and chokepoint transit shares are publicly reported by EIA, UNCTAD, and OECD, exact commercial inventory holdings (in weeks of consumption) vary across firms and are only publicly documented for select crisis case studies (such as the April 2026 IIASA Strait of Hormuz briefs reporting ~2 weeks of packaging resin stocks in South Korea and ~8–12 weeks of sulfur stocks in DRC/Zambian copper mines).
- **Fallback:** All node-level inventory buffer defaults ($\tau^{\text{inv}}_i$) are explicitly badged as `classification: 'model_parameter'` with documented literature ranges, and users can directly vary the global **Inventory Buffer Multiplier ($0.5\times–2.0\times$)** in the top control bar to inspect sensitivity.

### 2.3 Consumer Product Bill-of-Materials (BOM) Cost Shares
- **Evidence Gap:** National Input–Output tables map industry-to-household final consumption expenditure (`HFCE`), but do not publish product-level BOM cost splits for specific items like a smartphone or passenger vehicle.
- **Fallback:** Consumer category input decompositions combine `derived` OECD IOT industry shares with explicitly badged `illustrative` BOM weights, and only drive the relative **Cost-Pressure Index (0–100)**.

---

## 3. Top Risks & Concrete Mitigation Plans

### Risk 1: Misinterpretation of Model Outputs as Real-World Forecasts or Price Predictions
- **Severity:** High | **Likelihood:** Medium
- **Description:** Users or screenshots shared out of context might interpret an $\text{REI}$ of `65` or $\text{CPI}$ of `58` as a prediction of a `65%` shortage or `58%` price hike, or assume a preset represents a live real-time news feed.
- **Mitigation Plan:**
  1. Render a persistent epistemic banner in the application header and comparison drawer: *"Conditional Scenario Simulation · Relative Exposure & Cost-Pressure Indices (0–100), Not Forecasts."*
  2. Pair every numerical index (`0–100`) with its qualitative band (`Low`, `Moderate`, `Elevated`, `Severe`) and explicit unit label (`Index / 100`).
  3. Explicitly list *"Outputs This Model Cannot Responsibly Justify"* inside every Scenario Preset brief and in the Inspector Dock.

### Risk 2: Visual Clutter ("Graph Hairball") in the 48-Node, 78-Edge Dependency Network
- **Severity:** High | **Likelihood:** Medium
- **Description:** Rendering 48 nodes and 78 directed edges simultaneously can overwhelm non-specialist users if node placement is chaotic or all edges draw at full opacity.
- **Mitigation Plan:**
  1. Use a strict **Deterministic 4-Tier Left-to-Right DAG Layout** (`Origin/Geo` $\to$ `Commodities` $\to$ `Industries` $\to$ `Consumer Categories`) with vertical ordering optimized to minimize edge crossings.
  2. Default edge rendering to subtle low-opacity hairlines (`0.22` opacity) for unexposed/non-selected links, elevating stroke weight and luminance only along active shock pathways and the currently selected node's neighborhood.
  3. Provide one-click **Hop Depth Controls (`All`, `1-Hop`, `2-Hop`)** and a **Minimum Exposure Filter ($\text{REI} \ge \theta$)** in the Network toolbar, and default mobile viewports (`<768px`) to `1-Hop Focused Mode`.

### Risk 3: GPL-3.0 Licence Contamination from DisruptSC
- **Severity:** Critical (Legal/IP) | **Likelihood:** Low (With Strict Controls)
- **Description:** DisruptSC (`ccolon/disrupt-sc`) is licensed under **GNU General Public License v3.0 (GPL-3.0)**. Copying, translating, or adapting any Python code or YAML/GPKG files from its repository would subject EconoLoom to GPL-3.0 copyleft obligations.
- **Mitigation Plan:**
  1. **Zero Code / File Copying:** Strictly prohibit viewing, copying, or translating DisruptSC's Python source code modules.
  2. **Clean-Room Mathematical Implementation:** Implement EconoLoom's TypeScript engine (`src/engine/`) exclusively from the first-principles recurrence equations defined in [`SIMULATION_METHODOLOGY.md`](file:///c:/Users/User/Desktop/Salman/Projects/SIMULATION_METHODOLOGY.md).
  3. **Proper Academic Citation:** Cite *Colon, Hallegatte, & Rozenberg (2021, Nature Sustainability)* and the public *IIASA Strait of Hormuz Crisis Analytics Briefs (April 2026)* solely for published empirical facts and conceptual domain insights.

### Risk 4: Compounding Bias or Double-Counting in Multi-Hop Network Propagation
- **Severity:** High (Mathematical Credibility) | **Likelihood:** Low-Medium
- **Description:** In a directed network where an industry receives multiple disrupted inputs (e.g., `Automotive Manufacturing` receiving both `Primary Aluminum`, `Refined Copper`, and `Automotive Microcontrollers`), naive summation of upstream exposure can exceed $100\%$ or double-count a single upstream chokepoint shock traveling along two parallel branches.
- **Mitigation Plan:**
  1. Normalize incoming dependency weights $\tilde{w}_e = w_e / \max(1, \sum w_k)$ at every node so $\sum \tilde{w}_e \le 1$.
  2. Use the bounded convex combination of weighted average shortfall $d_v^{\text{avg}}(t) \in [0, 1]$ and critical bottleneck shortfall $d_v^{\text{bot}}(t) \in [0, 1]$ with per-hop damping $\gamma = 0.92$, mathematically guaranteeing $d_v(t) \in [0, 1]$ and $\text{REI}_v(t) \in [0, 100]$.
  3. Enforce automated boundary and conservation tests in `src/test/engine.test.ts`.

### Risk 5: Third-Party Map Tile Outages, Missing API Keys, or Offline Failures
- **Severity:** Medium | **Likelihood:** Zero (Under Selected Architecture)
- **Description:** Applications relying on Mapbox, Google Maps, or live OpenStreetMap tile servers frequently fail in restricted corporate networks, offline demos, or CI test runners when API keys expire or rate limits trigger.
- **Mitigation Plan:**
  1. Bundle a compact, public-domain Natural Earth `110m` TopoJSON geometry (`src/data/geo/world-110m.json`) directly in the repository and render via client-side `d3-geo` SVG.
  2. Implement a React Error Boundary around `GeographicView` that renders `MapFallbackMatrix.tsx` (a clean interactive regional chokepoint & corridor status table) if SVG geometry parsing ever fails.
