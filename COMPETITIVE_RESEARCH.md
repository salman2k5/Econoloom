# ECONOLOOM — COMPETITIVE LANDSCAPE & DIFFERENTIATION RESEARCH

**Date of Research:** 2026-10-19  
**Research Scope:** Publicly accessible interactive economic shock simulators, input–output scenario platforms, spatial supply-chain models, global trade visualizers, and foundational macroeconomic/commodity datasets.

---

## 1. Executive Summary & Positioning Refinement

### 1.1 Landscape Synthesis
Our empirical review of existing platforms and datasets reveals a sharp structural bifurcation in the market:
1. **Macroeconomic Input–Output & Trade Platforms (e.g., IOMInsight, OECD Data Explorer, OEC, ResourceTrade.earth):** Excel at displaying annual country-to-country trade matrices or static Leontief demand/price multipliers across 35–89 standard industrial sectors, but **lack sub-annual temporal propagation, physical transport chokepoints, inventory buffer exhaustion, and concrete multi-hop pathways into familiar consumer products.**
2. **Spatial & Agent-Based Supply-Chain Simulators (e.g., DisruptSC, IMF PortWatch):** Model physical maritime chokepoints, transport networks, and (in DisruptSC's case) week-by-week inventory depletion and rationing cascades. However, **DisruptSC is a command-line Python research codebase** requiring local Conda environments and external geopackage datasets, while **IMF PortWatch is a heavy ArcGIS macro-monitoring portal** that stops at port-level vessel counts and country/sector "trade-at-risk" aggregates without explaining multi-stage industrial transformations (e.g., why a Strait of Hormuz closure disrupts Gulf sulfur $\rightarrow$ Chinese sulfuric acid $\rightarrow$ Chilean copper mining $\rightarrow$ electrical wiring and EVs).

### 1.2 Refined Positioning Statement
We tested the initial positioning hypothesis against verified competitors and refined it to highlight EconoLoom's unique analytical bridge:

> **EconoLoom is an interactive, narrative-first economic shock explorer that bridges the gap between physical geographic chokepoints, multi-tier industrial dependencies, week-by-week inventory buffer exhaustion, and everyday consumer categories—backed by an inspectable, citation-linked explanation for every link in the chain.**

Unlike static trade atlases (OEC, ResourceTrade.earth) or annual Leontief multiplier calculators (IOMInsight), EconoLoom lets a non-specialist **scrub week-by-week through the anatomy of a shortage**—seeing how inventory buffers absorb the initial shock, when critical stockout thresholds are crossed, why post-reopening recovery lags persist, and which claims are grounded in official data versus explicit modeling assumptions.

---

## 2. Verified Competitor & Reference Source Analysis

### 2.1 IOMInsight (`https://iominsight.com/`)
- **Verification Status:** Directly inspected via live HTTP fetch (`https://iominsight.com/`, accessed 2026-10-19) and public academic/institutional references (Universiti Malaya / Prof. Dr. Yong Chen Chen & Hafiz Majid).
- **Verified Functionality:**
  - Web application translating classical Leontief Input–Output (IO) models into **10 analytical modules** across **35 consistently defined sectors** and **62 economies** using annual national accounts series (**2007–2024**).
  - **Three Module Families:**
    1. *Diagnostic (Structure):* Module 01 (Domestic Supply Chain Network Analysis by Average Propagation Length and significance threshold up to 2 layers deep), Module 02 (Industry Classification plotting normalized backward vs. forward linkages into four quadrants: *Backbone*, *Fast Growing*, *Emerging*, *Net Distributor*), and Module 08 (Bilateral & Multilateral Supply Chain Network across 1 home + up to 4 host economies).
    2. *Scenario (Multiplier Engine):* Module 03 (Economic Efficiency under resource constraint), Module 04 (Production Efficiency), Module 05 (Output Efficiency), Module 06 (Crisis Response simulating partial or complete sector shutdowns), Module 09 (Bilateral Output Efficiency across 2 countries + 8 export blocs), and Module 10 (Multilateral Output Efficiency across 5 economies).
    3. *Price (Cost-Push Dual):* Module 07 (Total Factor Productivity / Price model pushing import price, value-added/labor cost, and tax changes through the Leontief price dual to compute sectoral output price changes and economy-wide inflation contribution).
  - **Reported Indicators:** 6 economic indicators (*Output*, *Employment* per \$1M final demand, *Value Added*, *Imports*, *Taxes*, *Exports*) decomposed into **Direct, Indirect, Induced, and Total** layers, plus an **Environmental Extension** ($CO_2$, $CH_4$, $N_2O$, fluorinated gases, total GHG, water/energy intensity, permanent cropland).Supports Excel/CSV export and custom IO table upload on institutional plans.
- **Intended Users:** Government ministries (e.g., Ministry of Finance Malaysia, Singapore Food Agency), university researchers/classrooms, consultancies, and SMEs. Commercial SaaS pricing (`RM 900/seat/month` Analyst; `RM 9,000/org/month` Institution).
- **Visual & Interaction Model:** Editorial web landing experience with interactive illustrative widgets (e.g., Malaysia 35-sector ripple SVG, backward/forward linkage quadrant scatter plot, US 2020 chemicals-to-petroleum Crisis Response severity slider) leading into a gated SaaS dashboard ("Book a demo") focused on tabular multiplier readouts, stacked Direct/Indirect/Induced bars, and annual trend lines.
- **Strengths:**
  - Exemplary clarity in explaining Input–Output terminology ("foresight, not forecast") and explicitly listing model assumptions on its `/method` page (fixed technical coefficients, linear response, annual resolution, sector aggregation).
  - Strong decomposition of Direct, Indirect, and Induced (household wage-spending feedback) effects.
- **Limitations:**
  - **Annual Resolution Only:** Explicitly operates on annual accounts year-by-year; cannot model sub-annual dynamics such as a 60-day or 90-day blockade, transit lags, or week-by-week inventory depletion.
  - **No Physical Geography or Chokepoints:** Operates on national sector matrices; has no representation of maritime straits, canals, shipping routes, or pipeline bypasses.
  - **Sector-Level Stopping Point:** Stops at broad 35-sector aggregates (e.g., *"Electrical & optical equipment"* or *"Chemicals & chemical products"*) without tracing specific critical commodities (e.g., elemental sulfur, naphtha, sub-7nm wafers) into everyday consumer categories.
  - **Commercial Paywall:** Full interactive modules require a paid subscription or scheduled sales demo.
- **Overlap with EconoLoom:** Both use input–output dependency logic to educate decision-makers and generalists on how shocks ripple beyond the initial sector, and both emphasize honest methodological guardrails ("foresight under assumption, not prediction").
- **Specific Differentiation Opportunity for EconoLoom:** Combine physical geographic chokepoints and sub-annual (weekly) inventory buffer/recovery dynamics with commodity-specific industrial pathways (e.g., sulfur $\rightarrow$ sulfuric acid $\rightarrow$ copper) that connect all the way to everyday consumer categories in a free, zero-setup visual workspace.

---

### 2.2 DisruptSC (`https://github.com/ccolon/disrupt-sc` & `https://ccolon.github.io/disrupt-sc/`)
- **Verification Status:** Directly inspected via live HTTP fetch of the GitHub repository (`https://github.com/ccolon/disrupt-sc`), `README.md`, `LICENSE`, `mkdocs.yml`, and documentation site (`https://ccolon.github.io/disrupt-sc/` and `https://ccolon.github.io/disrupt-sc/research/hormuz/`, accessed 2026-10-19).
- **Licence & Legal Compliance Verification:**
  - **Verified Licence:** **GNU General Public License v3.0 (GPL-3.0)** (`https://raw.githubusercontent.com/ccolon/disrupt-sc/master/LICENSE`).
  - **Compliance Rule for EconoLoom:** Because GPL-3.0 is a strong copyleft license requiring derivative software works to be distributed under GPL-3.0, **EconoLoom must not copy, incorporate, translate, or adapt any source code or bundled configuration files from DisruptSC.** We study DisruptSC's peer-reviewed publication (*Colon, Hallegatte, & Rozenberg, 2021, Nature Sustainability, 4(3), 209–215*) and its public research briefs strictly as scientific and empirical references, implementing EconoLoom's simplified deterministic cascade engine from scratch in clean-room TypeScript.
- **Verified Functionality:**
  - Open-source Python 3.10+ command-line spatial agent-based model (`v2.0`) developed by Célian Colon (IIASA), Stéphane Hallegatte (World Bank), and Julie Rozenberg.
  - Combines **Multi-Regional Input–Output (MRIO)** tables (e.g., GLORIA 2023 MRIO) disaggregated into individual firm, household, and country agents with **spatial multimodal transport networks** (`transport.gpkg` and `multimodal.gpkg` covering roads, rail, maritime shipping, airways, waterways, and pipelines).
  - Enforces **named transport edge capacities** with within-step proportional rationing, dynamic least-cost rerouting under price-increase thresholds, firm-level input inventory buffers, and supplier switching.
  - Includes a small synthetic demo scope (`Testkistan`) in the code repository; full regional scopes (`ECA`, `Ecuador`, `Gulf`, `Cambodia`) reside in a separate data repository.
  - **Verified April 2026 Research Application (*Strait of Hormuz Crisis Analytics*):** Documents both model-based (`Brief 1`, 21 April 2026, modeling 456 firms, 46 households, 15 regions, 19 sectors, 32 Gulf ports, and 7 border crossings) and empirical (`Brief 2`, 30 April 2026) cascades of a Strait of Hormuz closure, demonstrating:
    1. **Four-Phase Weekly Cascade Timeline:** Weeks 0–4 (inventory buffers absorb shock), Weeks 5–7 (first spillovers in South Asia), Weeks 8–10 (inventory-exhaustion threshold crossed), Weeks 11+ (broad nonlinear supply-chain disturbances).
    2. **Post-Reopening Recovery Drag:** For an 11-week closure, ~90% of annual household consumption losses occur *after* the Strait reopens due to depleted buffers and asynchronous recovery.
    3. **Non-Oil Multi-Hop Cascades:** Gulf LNG/naphtha $\rightarrow$ Indian polyester textiles & Korean ethylene/PET packaging/semiconductor photoresists; Gulf aluminum + outbound vehicle blockades $\rightarrow$ Japanese auto production cuts; Gulf seaborne sulfur (~50% global share) $\rightarrow$ Chinese sulfuric acid export halt $\rightarrow$ Chilean & DRC/Zambian acid-leach copper mining at risk.
- **Intended Users:** Academic researchers, World Bank / IIASA economists, and infrastructure policy modelers proficient in Python, Conda, GIS (`GeoPackage`), and YAML configuration.
- **Visual & Interaction Model:** CLI pipeline (`validate-inputs`, `disruptsc <scope> --simulation_type disruption`) outputting static charts, GIS layers, and markdown research briefs. No interactive web application or browser-based parameter explorer exists.
- **Strengths:**
  - Gold-standard integration of physical transport bottlenecks, inventory buffer dynamics, non-linear stockout thresholds, and post-disruption recovery tails.
- **Limitations:**
  - Inaccessible to non-programmers; requires local Python/Conda setup and private/external data repositories for real-world regional scopes.
  - Computationally heavy agent-based Monte Carlo execution unsuitable for instant (<10ms) interactive browser scrubbing.
- **Overlap with EconoLoom:** Shares the core insight that supply-chain shocks are governed by physical transport bottlenecks, inventory exhaustion thresholds, and multi-hop non-obvious industrial inputs rather than static macroeconomic averages.
- **Specific Differentiation Opportunity for EconoLoom:** Distill the key structural mechanisms proved in the supply-chain literature (chokepoint capacity rationing, bypass corridors, transit delays, inventory buffer drawdown, and post-reopening recovery drag) into a **fast, deterministic, browser-native interactive explorer** where any user can adjust parameters and trace the cascade visually in real time.

---

### 2.3 IMF PortWatch (`https://portwatch.imf.org/`)
- **Verification Status:** Directly inspected via live HTTP fetch (`https://portwatch.imf.org/`, accessed 2026-10-19) and IMF/Oxford methodology documentation.
- **Verified Functionality:**
  - Public platform co-developed by the International Monetary Fund (IMF) and the University of Oxford Environmental Change Institute on Esri ArcGIS Hub.
  - Provides four core views: **Port Monitor** (tracking 1,400+ ports via satellite AIS vessel calls and cargo volume estimates), **Disruption Monitor**, **Spillover Simulator** (powered by the Oxford Maritime Transport `OxMarTrans` model and BACI HS6 bilateral trade), and **Climate Scenarios**.
  - Simulates port or chokepoint closures (across ~24 major maritime chokepoints) and outputs port-level network spillovers, country-level import/export "trade-at-risk" (as % of GDP or trade value), and broad sectoral vulnerability rankings.
- **Intended Users:** Central bankers, IMF country economists, trade ministries, and maritime risk analysts.
- **Visual & Interaction Model:** Enterprise Esri ArcGIS Hub portal with multi-page embedded web maps, port lookup templates (`ports/port57`, etc.), and GIS layer download catalogs (CSV, GeoJSON, KML, WFS).
- **Strengths:** Authoritative near-real-time satellite AIS data and rigorous maritime routing (`OxMarTrans`).
- **Limitations:**
  - Fragmented ArcGIS Hub interface with slow-loading embedded dashboards.
  - Stops at port-to-port vessel flows and national macroeconomic "trade-at-risk" totals; does not let users trace multi-stage industrial transformations (e.g., how a raw chemical or mineral becomes an intermediate industrial input and then a consumer product) or scrub through inventory buffer exhaustion over time.
- **Overlap with EconoLoom:** Both highlight maritime chokepoints as critical nodes in global economic stability.
- **Specific Differentiation Opportunity for EconoLoom:** Provide a unified, single-screen interactive workspace that connects the maritime chokepoint directly to the multi-tier industrial dependency graph and everyday consumer products, with instant timeline scrubbing.

---

### 2.4 Chatham House ResourceTrade.earth / ResourceTransitions.earth (`https://resourcetrade.earth/`)
- **Verification Status:** Directly inspected via live HTTP fetch (`https://resourcetrade.earth/`, which now serves Chatham House's expanded **Resource Transitions** platform at `https://resourcetransitions.earth/`, accessed 2026-10-19).
- **Verified Functionality:**
  - Interactive data visualization and policy insight platform mapping bilateral international trade in natural resources (land, water, biomass, critical raw materials, energy, and circular economy trade/policies) derived from UN Comtrade.
  - Renders animated chord/arc maps of country-to-country commodity flows by weight and monetary value, paired with thematic explainers on geopolitical dependency and environmental pressure.
- **Intended Users:** Policy generalists, journalists, sustainability researchers, and educators.
- **Visual & Interaction Model:** Polished editorial storytelling combined with filterable bilateral flow maps.
- **Strengths:** Visually inviting, accessible to non-specialists, and strong on critical raw materials and environmental context.
- **Limitations:** Purely descriptive historical trade visualization; contains **no simulation engine**, no shock parameters, no intermediate industrial processing graph, and no temporal disruption modeling.
- **Specific Differentiation Opportunity for EconoLoom:** Match Chatham House's editorial clarity and visual polish while adding an **interactive causal simulation engine** that shows what happens when those resource flows are disrupted.

---

### 2.5 Observatory of Economic Complexity — OEC (`https://oec.world/`)
- **Verification Status:** Directly inspected via live HTTP fetch (`https://oec.world/`, accessed 2026-10-19).
- **Verified Functionality:**
  - Comprehensive trade data portal offering Country/Product/Company profiles, Economic Complexity Index (ECI/PCI) rankings, custom visualizations (Treemap, Stacked Area, Scatter, Network, Geomap), and a **Tariff Simulator Report** (`PRO`/`PREMIUM` tiers gate company bill-of-lading data, Trend Explorer, and bulk downloads).
- **Intended Users:** Trade economists, market researchers, sourcing analysts, and students.
- **Visual & Interaction Model:** Dense, multi-tab data encyclopedia centered on treemaps and bilateral trade tables.
- **Strengths:** Massive HS-level product granularity and benchmark visual grammar for trade statistics.
- **Limitations:** High cognitive load; focuses on historical export baskets and price-elasticity tariff simulations rather than physical supply-chain disruptions, inventory buffers, and multi-hop industrial production cascades.
- **Specific Differentiation Opportunity for EconoLoom:** Offer a focused, guided causal exploration of *supply-chain shock propagation* rather than an encyclopedia of historical trade statistics.

---

### 2.6 Foundational Public Datasets Investigated (OECD & World Bank)
*(Note: Detailed technical schemas, access methods, and licensing evaluations are documented in [DATA_STRATEGY.md](file:///c:/Users/User/Desktop/Salman/Projects/DATA_STRATEGY.md).)*

1. **OECD Inter-Country Input–Output (ICIO) Tables** (`https://www.oecd.org/en/data/datasets/inter-country-input-output-tables.html`)
   - *Verification Note:* Direct automated HTTP fetch returned `403 Forbidden` (Cloudflare bot protection on `oecd.org`); verified via OECD technical documentation and secondary indexed metadata.
   - *Role in Landscape:* The global statistical spine mapping intermediate and final demand flows across ~80–81 economies and 50 ISIC Rev. 4 sectors. Provides raw matrix data, not a consumer-facing shock simulator.
2. **OECD Input–Output Tables (IOTs)** (`https://www.oecd.org/en/data/datasets/input-output-tables.html`)
   - *Verification Note:* Direct fetch returned `403 Forbidden`; verified via OECD documentation.
   - *Role in Landscape:* Harmonized national symmetric input–output tables (intermediate consumption, value added, and final demand columns `HFCE`, `GFCF`, `INVNT`, `EXPO`, `IMPO`).
3. **OECD Gross Output Flows in Global Value Chains** (`https://www.oecd.org/en/data/datasets/gross-output-flows-in-global-value-chains.html`)
   - *Verification Note:* Direct fetch returned `403 Forbidden`; verified via OECD GVC documentation.
   - *Role in Landscape:* Provides **Foreign Input Reliance (FIR)** and **Foreign Market Reliance (FMR)** indicators on a *gross output* basis rather than a value-added (TiVA) basis—crucial for EconoLoom because supply shocks disrupt the physical intermediate shipment, not just the value-added share.
4. **World Bank Commodity Price Data — "The Pink Sheet"** (`https://thedocs.worldbank.org/en/doc/18675f1d1639c7a34d463f59263ba0a2-0050012025/`)
   - *Verification Note:* Directly verified via live HTTP fetch (accessed 2026-10-19; document title *"World Bank Commodities Price Data (The Pink Sheet)"*, World Bank Prospects Group) and World Bank Open Data documentation.
   - *Role in Landscape:* Monthly historical price series and composite indices across 70+ energy, agriculture, fertilizer, and metal commodities. Provides empirical historical volatility context and unit definitions for EconoLoom's commodity nodes.

---

## 3. Competitive Comparison Matrix (7 Core Dimensions)

| Dimension | IOMInsight | DisruptSC (CLI) | IMF PortWatch | ResourceTrade.earth | OEC World | **EconoLoom (MVP Target)** |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Geography & Chokepoints** | National economies only (no routes/straits) | Full GIS multimodal networks & ports | 1,400+ ports & 24 maritime chokepoints | Country-to-country bilateral arcs | Country-to-country geomaps | **Curated chokepoints, bypass routes & regional hubs** |
| **2. Multi-Tier Dependencies** | 35 macro sectors (Leontief matrix) | MRIO + firm-level buyer-supplier network | Port & broad macro sector aggregates | Single-hop bilateral resource trade | Bilateral HS product trade | **48-node directed graph: Chokepoint $\rightarrow$ Commodity $\rightarrow$ Industry $\rightarrow$ Consumer** |
| **3. Temporal Propagation** | Annual static comparison | Weekly/daily discrete agent steps | Static spillover aggregate for $N$-day shock | Historical annual snapshots | Historical annual/monthly snapshots | **Interactive 26-week scrubber showing lag, depletion & recovery** |
| **4. Resilience Mechanics** | Optional sector capacity ceiling | Inventory buffers, rerouting, rationing, switching | Maritime rerouting (`OxMarTrans`) | None (descriptive only) | Tariff substitution only | **Inspectable inventory buffers, route bypasses & substitution** |
| **5. Everyday Consumer Impact** | Macro Household Induced layer only | Aggregate household consumption loss (%) | None (stops at trade-at-risk) | None | None | **8 consumer categories with Cost-Pressure Index & input breakdown** |
| **6. Epistemic Transparency** | High (Method page states IO limits) | High (Open academic code + briefs) | High (IMF/Oxford methodology paper) | High (Chatham House / Comtrade notes) | Moderate (ECI/Tariff method docs) | **Per-node/edge provenance drawer + 5-tier data classification** |
| **7. Scenario Comparison** | Baseline vs. Actual vs. Scenario tables | Manual CLI script comparison | Single simulation run view | None | Single tariff simulation report | **Built-in side-by-side Baseline & Saved Snapshot Delta view** |

---

## 4. Unresolved Market Questions & Validation Plan

1. **Optimal Graph Granularity for Non-Specialists:** Does a 48-node graph feel sufficiently rich without inducing the visual "hairball" fatigue seen in dense network tools?
   - *Mitigation in Design:* Use a deterministic 4-tier left-to-right column layout with progressive disclosure (1-hop / 2-hop neighborhood focus and minimum-exposure filtering).
2. **Comprehension of Relative Indices vs. Dollar Prices:** Will non-specialist users intuitively understand a `0–100 Cost-Pressure Index` when they are accustomed to media headlines quoting percentage price increases?
   - *Mitigation in Design:* Pair every numerical index (`e.g., CPI: 68 / 100`) with a plain-language severity label (`Elevated Cost Pressure`), a concrete physical explanation (`Inventory buffers exhausted at Week 9; 42% of upstream naphtha input constrained`), and a tooltip explaining why retail price percentages are not forecast.
