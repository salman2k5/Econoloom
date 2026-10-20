# ECONOLOOM — PRODUCT REQUIREMENTS DOCUMENT (PRD)

**Document Status:** Phase 0 Baseline Specification (Product Foundation & Technical Discovery)  
**Last Updated:** 2026-10-19  
**Working Product Name:** EconoLoom *(provisional working title; domain, trademark, and social handle availability are unverified)*

---

## 1. Product Vision & Core Promise

### 1.1 Vision Statement
EconoLoom is an interactive, narrative-first global economic shock explorer that enables curious, analytically minded non-specialists to perturb a critical thread of the global economy—such as a maritime chokepoint, a concentrated manufacturing hub, or a key commodity corridor—and trace how the resulting shock propagates over time through trade routes, intermediate commodities, industrial sectors, and everyday consumer categories.

### 1.2 Core Promise
> *"Pull one thread of the global economy. Explore what else might unravel."*

### 1.3 Educational & Epistemic Positioning
EconoLoom is an **educational scenario-analysis and structural dependency exploration instrument**. It is explicitly **not** a macroeconomic forecasting engine, a live financial terminal, an investment advisory tool, or a retail inflation predictor.

Every quantitative output in EconoLoom is governed by three non-negotiable epistemic rules:
1. **Conditional Scenario Framing:** All outputs represent conditional responses to user-configured parameters under an explicit deterministic model, never predictions of real-world future events.
2. **Cost-Pressure & Exposure Indices over Fabricated Price Claims:** Where empirical price pass-through elasticities and firm-level margins cannot be responsibly validated, EconoLoom reports a bounded **Relative Exposure Index (REI, 0–100)** and **Cost-Pressure Index (CPI, 0–100)** rather than unsubstantiated claims such as *"this shock will raise smartphone retail prices by 18%."*
3. **Radical Provenance Transparency:** Every node, edge, baseline share, inventory buffer, and calculation step exposes its underlying data classification (`observed`, `derived`, `model_parameter`, `user_input`, or `illustrative`) and links directly to its source record and assumptions.

---

## 2. Target Audience & User Personas

### 2.1 Primary Audience
Curious, intelligent non-specialists interested in global affairs, geopolitics, supply chains, technology, business, or economic news who do not necessarily hold formal training in input–output economics or operations research.

### 2.2 Core User Personas

| Persona | Background & Context | Primary Goal in EconoLoom | Key Pain Point with Existing Tools |
| :--- | :--- | :--- | :--- |
| **1. The Geopolitical & Business Reader** | Reads *The Economist*, *Financial Times*, or industry newsletters; follows news on maritime chokepoints, energy transitions, and chip controls. | Wants to move beyond headline claims ("Strait of Hormuz at risk") to see *which* industries and everyday products are exposed, *why* (e.g., sulfur $\rightarrow$ sulfuric acid $\rightarrow$ copper), and *when* buffers run out. | News articles are static; academic papers and Input–Output tables are impenetrable; enterprise risk tools are locked behind five-figure contracts. |
| **2. The Policy & Strategy Generalist** | Junior policy analyst, corporate strategy associate, or NGO researcher preparing a briefing on supply-chain resilience. | Needs to compare a baseline disruption against a mitigation scenario (e.g., pipeline bypass + expanded strategic inventory buffers) and export or cite the underlying public evidence. | Commercial IO platforms (e.g., IOMInsight) focus on annual macro multipliers without physical chokepoints or inventory dynamics; ABM codebases (e.g., DisruptSC) require Python/Conda and private spatial datasets. |
| **3. The Educator & University Student** | Instructor or student in international relations, economic geography, business strategy, or industrial engineering. | Wants an interactive, zero-setup browser instrument to demonstrate upstream/downstream dependencies, bottlenecks, inventory exhaustion thresholds, and post-disruption recovery lags. | Existing trade visualizers (OEC, ResourceTrade.earth) show historical trade volumes but cannot simulate shock propagation over time. |

---

## 3. Primary Use Cases

1. **UC-01: Preset Shock Exploration** — Select one of three curated, evidence-backed disruption presets (Strait of Hormuz, Taiwan Advanced Semiconductor Foundries, Panama Canal Transit Restriction) and immediately inspect its geographic footprint and dependency cascade.
2. **UC-02: Parameter Sensitivity & Mitigation Testing** — Adjust disruption severity ($0\%$ to $100\%$), duration ($7$ to $180$ days), inventory buffer multiplier ($0.5\times$ to $2.0\times$), and bypass/substitution activation to observe non-linear threshold effects (such as when inventory buffers exhaust around Weeks 8–10).
3. **UC-03: Temporal Scrubbing & Recovery Analysis** — Scrub across a 26-week simulation timeline to observe how direct shocks, transit delays, inventory depletion, and post-reopening recovery drag evolve week by week.
4. **UC-04: Multi-Hop Pathway Tracing** — Select any affected downstream industry or consumer category (e.g., *Passenger Vehicles & Auto Repair* or *Retail Groceries & Packaged Food*) and highlight the exact directed chain of intermediate commodities and industries connecting it to the shock origin.
5. **UC-05: Side-by-Side Scenario Comparison** — Compare an active configuration against the unshocked baseline or against a saved alternative scenario (e.g., *60% Hormuz Disruption — No Bypass* vs. *60% Hormuz Disruption — Full Pipeline Bypass + 1.5x Buffer*), with parameter deltas and outcome deltas clearly juxtaposed.
6. **UC-06: Evidence & Assumption Auditing** — Inspect any node, edge, or simulation metric to view the exact mathematical formula, parameter values, data tier badge, and cited public sources (OECD ICIO/GVC, EIA, UNCTAD, World Bank Pink Sheet, peer-reviewed literature).

---

## 4. MVP Scope: Ambitious, Credible, and Achievable

### 4.1 Network Size & Structural Scope
Rather than attempting an unverified, noisy graph of thousands of firms or every HS6 product code, the EconoLoom MVP ships with a **curated, version-controlled, locally bundled 48-node, 78-edge global economic dependency network**:
- **3 Maritime & Production Chokepoints (`chokepoint`):** Strait of Hormuz, Taiwan Hsinchu/Tainan Fab Cluster & Corridor, Panama Canal Locks.
- **9 Regional Economic Hubs (`geography`):** Persian Gulf Producers (`GULF`), Taiwan (`TWN`), South Korea (`KOR`), Japan (`JPN`), China (`CHN`), India (`IND`), United States (`USA`), European Union (`EU27`), South America Andean Copper/Agri Belt (`SAM`).
- **14 Critical Commodities & Intermediate Inputs (`commodity`):** Seaborne Crude Oil, Liquefied Natural Gas (LNG), Naphtha & LPG Feedstock, Elemental Sulfur, Sulfuric Acid, Primary Aluminum, Refined Copper, Urea & Nitrogen Fertilizers, High-Purity Semiconductor Solvents & Photoresists, Silicon Wafers (300mm), Advanced Logic Semiconductors (<7nm), Mature/Automotive Microcontrollers (28nm+), Containerized Manufactured Freight, Dry Bulk Grain & Soy.
- **14 Industrial Sectors (`industry`):** Aligned with ISIC Rev. 4 / OECD ICIO groupings, including Petroleum Refining, Petrochemical Cracking, Fertilizer Manufacturing, Acid-Leach Copper Mining, Aluminum Smelting, Semiconductor Foundry & Packaging, AI & Cloud Server Manufacturing, Consumer Electronics Assembly, Automotive & EV Manufacturing, Synthetic Textile & Apparel Manufacturing, Food & Beverage Processing, Plastic & PET Packaging, Global Container Shipping, and Grain Export Logistics.
- **8 Everyday Consumer Categories (`consumer_category`):** Household Gasoline & Heating Energy, Retail Groceries & Packaged Food, Everyday Apparel & Fast Fashion, Smartphones & Personal Computing, Cloud & AI Digital Services, Passenger Vehicles & Auto Repair, Household Appliances & White Goods, Residential Construction & Electrical Wiring.

### 4.2 Curated Scenario Presets (MVP)

#### Preset 1: Strait of Hormuz Maritime & Energy Chokepoint (`preset_hormuz_energy`)
- **What is Disrupted:** Maritime transit capacity through the Strait of Hormuz (`chk_hormuz`), affecting outbound Persian Gulf liquid bulk (crude oil, condensate, LNG, naphtha/LPG), dry bulk (elemental sulfur, urea fertilizer, primary aluminum), and inbound containerized/ro-ro vehicle imports.
- **Model Parameters:** Disruption Severity $S = 0.60$ ($60\%$ transit capacity reduction); Disruption Duration $D = 90\text{ days}$ ($\approx 13\text{ weeks}$); Route Bypass Parameter $\beta_{\text{bypass}} = 0.18$ (representing documented spare pipeline bypass capacity via Saudi Petroline to Yanbu and UAE Habshan–Fujairah pipeline).
- **Baseline Comparison:** Unconstrained pre-shock steady state ($S = 0$, $I_i(t) = \tau^{\text{inv}}_i$, $\text{REI} = 0$, $\text{CPI} = 0$) anchored to EIA (2024–2025) transit shares (~20% of global petroleum liquids and ~20% of global LNG trade) and IIASA/DisruptSC (2026) documented non-oil industrial flows (~50% of seaborne elemental sulfur).
- **Relevant Nodes & Dependency Paths:**
  1. *Energy Path:* `chk_hormuz` $\rightarrow$ Seaborne Crude & LNG $\rightarrow$ Petroleum Refining & Utilities $\rightarrow$ Household Gasoline & Heating Energy.
  2. *Petrochemical-to-Packaging/Apparel Path:* `chk_hormuz` $\rightarrow$ Naphtha & LPG $\rightarrow$ Petrochemical Cracking (`KOR`/`IND`) $\rightarrow$ Plastic & PET Packaging / Synthetic Textiles $\rightarrow$ Retail Groceries & Everyday Apparel.
  3. *Sulfur-to-Copper Industrial Cascade:* `chk_hormuz` $\rightarrow$ Elemental Sulfur $\rightarrow$ Sulfuric Acid (`CHN`) $\rightarrow$ Acid-Leach Copper Mining (`SAM`) $\rightarrow$ Refined Copper $\rightarrow$ Residential Construction & Passenger Vehicles.
  4. *Aluminum & Bidirectional Auto Path:* `chk_hormuz` $\rightarrow$ Primary Aluminum (`GULF`) $\rightarrow$ Automotive Manufacturing (`JPN`) $\rightarrow$ Passenger Vehicles.
- **Required Assumptions:** Fixed short-run technical input proportions during the 26-week horizon; initial industry inventory buffers ($\tau^{\text{inv}}_i$ ranging from 2 weeks for packaging resins to 8–10 weeks for copper leaching and strategic crude reserves); proportional rationing when demand exceeds reduced chokepoint capacity.
- **Outputs Responsibly Produced:** Weekly Inventory Buffer Remaining (weeks of cover), Direct vs. Indirect Relative Exposure Index ($\text{REI} \in [0, 100]$), Bottleneck Input Identification, and Consumer Category Cost-Pressure Index ($\text{CPI} \in [0, 100]$).
- **Outputs Deliberately Excluded / Unjustified:** Spot Brent crude price predictions in `$/bbl`, national CPI inflation percentages, currency exchange rate movements, or corporate equity/profit forecasts.

#### Preset 2: Taiwan Advanced Semiconductor Foundry Disruption (`preset_taiwan_semi`)
- **What is Disrupted:** Fabrication and export throughput at Taiwan's advanced and mature semiconductor foundry clusters (`chk_taiwan_fabs`).
- **Model Parameters:** Disruption Severity $S = 0.50$ ($50\%$ curtailment in wafer fabrication and air/sea export output); Disruption Duration $D = 60\text{ days}$ ($\approx 9\text{ weeks}$); Substitution / Alternative Foundry Capacity $\sigma_{\text{alt}} = 0.08$ for advanced logic (<7nm) and $\sigma_{\text{alt}} = 0.22$ for mature/automotive nodes (28nm+).
- **Baseline Comparison:** Baseline global semiconductor supply chain anchored to SIA/WSTS and OECD TiVA/GVC structural shares (~60%+ global foundry revenue share and >80% sub-7nm logic share in Taiwan).
- **Relevant Nodes & Dependency Paths:**
  1. *Advanced Compute Path:* `chk_taiwan_fabs` $\rightarrow$ Advanced Logic Semiconductors (<7nm) $\rightarrow$ AI & Cloud Server Manufacturing / Consumer Electronics Assembly (`CHN`/`USA`) $\rightarrow$ Smartphones & Personal Computing / Cloud & AI Digital Services.
  2. *Automotive & Industrial Microcontroller Path:* `chk_taiwan_fabs` $\rightarrow$ Mature/Automotive Microcontrollers (28nm+) $\rightarrow$ Automotive & EV Manufacturing (`JPN`/`EU27`/`USA`) $\rightarrow$ Passenger Vehicles & Auto Repair / Household Appliances.
- **Required Assumptions:** High Leontief complementarity (a vehicle or server cannot ship without its microcontroller/logic package regardless of other abundant inputs); wafer-to-system assembly lag of 2–4 weeks; working chip inventory buffers of 3–6 weeks at downstream OEMs.
- **Outputs Responsibly Produced:** Downstream Production Bottleneck Severity, Time-to-Buffer-Exhaustion (week of stockout onset), Relative Exposure Index ($\text{REI}$), and relative Cost-Pressure / Availability Stress Index ($\text{CPI}$).
- **Outputs Deliberately Excluded / Unjustified:** Exact unit shortfalls per specific automaker/phone brand or retail electronics MSRP changes in dollars.

#### Preset 3: Panama Canal Drought & Transit Capacity Restriction (`preset_panama_canal`)
- **What is Disrupted:** Daily lock transit capacity and maximum vessel draft through the Panama Canal (`chk_panama`).
- **Model Parameters:** Disruption Severity $S = 0.40$ ($40\%$ reduction in daily transit slots/tonnage capacity); Disruption Duration $D = 120\text{ days}$ ($\approx 17\text{ weeks}$); Rerouting Mitigation $\beta_{\text{bypass}} = 0.55$ (rerouting via Suez/Cape of Good Hope or US intermodal rail at the cost of a $+2\text{ week}$ transit lag penalty and elevated freight cost-pressure).
- **Baseline Comparison:** Normal 36–38 daily vessel transits and baseline maritime trade shares anchored to Panama Canal Authority (ACP) and UNCTAD Review of Maritime Transport reports.
- **Relevant Nodes & Dependency Paths:**
  1. *Agri-Bulk Path:* `chk_panama` $\rightarrow$ Dry Bulk Grain & Soy (`USA` to `CHN`/`JPN`) $\rightarrow$ Grain Export Logistics $\rightarrow$ Food & Beverage Processing $\rightarrow$ Retail Groceries & Packaged Food.
  2. *Energy/Chemical Tanker Path:* `chk_panama` $\rightarrow$ Naphtha & LPG Feedstock (`USA` Gulf Coast to East Asia / `SAM`) $\rightarrow$ Petrochemical Cracking & Household Heating Energy.
  3. *Containerized East Coast Retail Path:* `chk_panama` $\rightarrow$ Containerized Manufactured Freight (`CHN`/East Asia to `USA` East Coast) $\rightarrow$ Global Container Shipping $\rightarrow$ Everyday Apparel & Household Appliances.
- **Required Assumptions:** Rerouting absorbs a larger fraction of volume than in a closed-basin blockade (like Hormuz), but introduces an explicit $+2\text{ week}$ propagation lag and a logistics surcharge factor into the Cost-Pressure Index.
- **Outputs Responsibly Produced:** Rerouted vs. Stranded Flow Share, Transit Delay Shift, Weekly Exposure Trajectory, and Freight-Driven Cost-Pressure Index.
- **Outputs Deliberately Excluded / Unjustified:** Spot container freight rate forecasts (e.g., Drewry WCI in `$/FEU`) or supermarket item price predictions.

---

## 5. Required Application Capabilities & Functional Requirements

| ID | Capability Area | Functional Requirements |
| :--- | :--- | :--- |
| **FR-A** | **Scenario Explorer & Parameter Controls** | • Select from the 3 curated presets or start from a custom shock on any `chokepoint`, `commodity`, or `industry` node.<br>• Configure **Disruption Severity** ($0\%–100\%$, step $5\%$), **Duration** ($7–180\text{ days}$, step $7\text{ days}$), **Inventory Buffer Multiplier** ($0.5\times–2.0\times$, step $0.25\times$), and **Mitigation / Rerouting Toggle** (`Baseline`, `Restricted`, `Enhanced`).<br>• Keep slider and numeric input fields strictly synchronized.<br>• Provide an explicit **Run / Recompute Scenario** action (plus instant deterministic preview mode) and a **Reset to Baseline** button. |
| **FR-B** | **Geographic View** | • Render an interactive vector map showing regional hubs, production clusters, maritime chokepoints, and active shipping/pipeline corridors.<br>• Visually distinguish the **Shock Origin** (pulsing high-contrast coral/amber beacon), **Primary Disrupted Corridors** (dashed/constricted arcs), **Bypass Corridors** (cyan reroute arcs), and **Exposed Regional Hubs** (choropleth/halo scaled by regional $\text{REI}$ at selected week $t$).<br>• Clicking any geographic hub or chokepoint selects it across all synchronized views.Must function 100% offline/client-side using bundled TopoJSON/GeoJSON without requiring paid third-party map API keys. |
| **FR-C** | **Dependency Network** | • Render an interactive directed graph of the 48 nodes arranged in a clear, deterministic **Left-to-Right Tiered DAG / Sankey-DAG Layout** (`Chokepoints & Geographies` $\rightarrow$ `Commodities` $\rightarrow$ `Industries` $\rightarrow$ `Consumer Categories`).<br>• Encode node type via distinct geometric badges/icons, affected status via color/luminance ($\text{REI}$ at week $t$), edge weight via stroke width, propagation direction via animated flow particles/chevrons, and data confidence tier via border treatment.<br>• Include anti-clutter controls: **Focus on Selected Node Neighborhood** ($1\text{-hop}$, $2\text{-hop}$, `All`), **Filter by Node Type**, **Minimum Exposure Threshold Slider** ($\text{REI} \ge \theta$), and **Highlight Critical Path**. |
| **FR-D** | **Simulation Timeline** | • Provide an interactive 26-week timeline scrubber ($t = 0\text{ to }26\text{ weeks}$, with day equivalents $0\text{ to }182\text{ days}$) plus Play/Pause and Step Forward/Back controls.<br>• Clearly shade the **Active Disruption Window** ($[1, T_{\text{shock}}]$) vs. the **Post-Disruption Recovery Window** ($[T_{\text{shock}}+1, 26]$).<br>• Display synchronized multi-line time-series charts for the selected node(s): **Relative Exposure Index ($\text{REI}$)**, **Remaining Inventory Buffer (Weeks)**, and **Cost-Pressure Index ($\text{CPI}$)**.<br>• Explicitly label the timeline as *Simulated Weeks from Shock Onset (Not Live Market Data)*. |
| **FR-E** | **Impact Explorer & Pathway Tracer** | • Allow users to pick any affected downstream `industry` or `consumer_category` and trace the highest-contributing directed path(s) back to the shock origin.<br>• Render a step-by-step **Narrative Cascade Chain** explaining *why* each hop is affected (input share, bottleneck criticality, transit lag, buffer exhaustion week).<br>• For consumer categories, display the **Cost-Pressure Index (0–100)** and an **Illustrative Input Exposure Breakdown** clearly separating observed/derived upstream shares from illustrative consumer bill-of-materials weights. |
| **FR-F** | **Scenario Comparison** | • Compare any active scenario against (a) the **Pre-Shock Baseline** or (b) any **Saved Scenario Snapshot**.<br>• Display a structured **Parameter Delta Table** (showing exact differences in Severity, Duration, Buffer Multiplier, and Mitigation) alongside an **Outcome Delta View** (comparing peak $\text{REI}$, week of buffer exhaustion, and week-26 recovery residual across top affected nodes). |
| **FR-G** | **Evidence, Provenance & Methodology** | • Every node, edge, and metric card includes an inspectable **Evidence & Provenance Drawer** showing: Data Classification Badge (`Observed`, `Derived`, `Model Parameter`, `User Input`, `Illustrative`), Source Citation(s) with publisher, period, URL, licence, transformation notes, and uncertainty/limitations.<br>• Provide an in-app **Methodology & Model Guardrails Modal** explaining the mathematical equations and model limits in plain English. |
| **FR-H** | **Local Persistence & Shareable State** | • Persist user-saved scenarios and custom configurations in versioned `localStorage` (`econoloom.scenarios.v1`) with JSON export/import and URL query-string serialization for sharing.<br>• Handle storage quota errors, schema version mismatches, or corrupted JSON gracefully with a non-destructive reset option. |

---

## 6. Explicit Non-Goals (Out of Scope for MVP)

To ensure engineering focus, statistical honesty, and visual clarity, EconoLoom explicitly **will not**:
1. **Predict Retail Prices, Inflation, or Financial Markets:** No dollar-denominated commodity price forecasts (`$/bbl`), no CPI/PCE inflation percentage predictions, and no stock ticker impacts.
2. **Simulate Every Global Firm or HS6 Product:** Will not ingest raw multi-gigabyte OECD ICIO CSVs or 5,000-product BACI matrices in the browser; the MVP uses a pre-compiled, audited 48-node, 78-edge structural graph.
3. **Claim Real-Time / Live AIS Vessel Tracking:** EconoLoom does not stream live satellite ship positions or claim real-time port congestion feeds.
4. **Require User Accounts, Cloud Databases, or Paid APIs:** Zero backend servers, zero authentication walls, and zero secret API keys in client code.
5. **Copy GPL-3.0 Code from DisruptSC:** All simulation algorithms and TypeScript modules are clean-room implementations designed from first-principles input–output and buffer-routing mathematics.

---

## 7. End-to-End User Journey & Edge Cases

### 7.1 Primary 9-Step User Journey
1. **Landing & Orientation:** The user opens EconoLoom and lands directly in the dark-first interactive workspace loaded with **Preset 1 (Strait of Hormuz — 60% Capacity Reduction, 90 Days)** at **Week 8** (the critical inventory-exhaustion inflection point), accompanied by a concise 3-line scenario brief and a clear epistemic badge (*"Conditional Simulation · Relative Exposure Index"*).
2. **Preset Selection or Customization:** Using the top Scenario Bar, the user switches presets (e.g., to *Taiwan Semiconductor Foundry Disruption* or *Panama Canal Drought*) or clicks *Customize Parameters*.
3. **Parameter Manipulation:** The user drags the **Severity** slider from `60%` to `80%` and **Duration** from `90 days` to `120 days`, or toggles **Enhanced Pipeline Bypass & 1.5x Strategic Buffers**. Numeric inputs update in lockstep; the simulation engine recomputes all 26 weeks across 48 nodes in $< 5\text{ ms}$.
4. **Geographic & Network Observation:** The user observes the Geographic View (left/top viewport) and Dependency Network (right/main viewport) update simultaneously: the Fujairah/Yanbu bypass corridors saturate on the map, and downstream edges into `Elemental Sulfur`, `Naphtha`, and `Refined Copper` shift from moderate amber to high-exposure coral.
5. **Node Inspection:** The user clicks `Petrochemical Cracking (KOR/IND)` or `Acid-Leach Copper Mining (SAM)` in the network graph. The graph highlights its upstream suppliers and downstream dependents, while the right-hand **Context & Provenance Inspector** displays its baseline input dependencies, current inventory buffer status, and exposure decomposition.
6. **Timeline Scrubbing:** The user drags the **Simulation Timeline Scrubber** from `Week 1` through `Week 26` (or clicks *Play*). They watch Weeks 1–4 absorbed by inventory buffers, Weeks 5–10 cross the stockout threshold, and Weeks 14–26 exhibit the post-reopening recovery tail.
7. **Downstream Consumer Exploration:** In the **Impact Pathway Explorer**, the user selects *Passenger Vehicles & Auto Repair* or *Retail Groceries & Packaged Food*. EconoLoom isolates the multi-hop causal pathway (e.g., `Strait of Hormuz` $\rightarrow$ `Naphtha & LPG` $\rightarrow$ `Petrochemical Cracking` $\rightarrow$ `Plastic & PET Packaging` $\rightarrow$ `Retail Groceries & Packaged Food`), explaining each intermediate bottleneck and displaying the category's **Cost-Pressure Index (CPI)** and **Illustrative Input Exposure Breakdown**.
8. **Scenario Comparison:** The user clicks **Save Snapshot ("Hormuz 80% Baseline Buffers")**, then enables **Enhanced Bypass + 1.5x Buffers** and opens the **Compare Scenarios** drawer. A side-by-side delta view shows how mitigation delays inventory exhaustion by 4 weeks and lowers peak downstream exposure by 28 index points.
9. **Evidence & Methodology Inspection:** The user clicks the **Provenance Badge** on the `Elemental Sulfur` edge. The Evidence Drawer displays the exact citation (IIASA/DisruptSC Hormuz Brief 2, April 2026; US EIA Chokepoint Analysis; OECD ICIO chemical input shares), the data classification (`observed` share + `model_parameter` buffer), and a link to the full Methodology modal.

### 7.2 Important Edge Cases & System States
- **Zero-Disruption State ($S = 0\%$):** When severity is set to $0\%$, all nodes remain at $\text{REI} = 0$ and $\text{CPI} = 0$ across all 26 weeks, inventory buffers remain at $100\%$ of baseline ($\tau^{\text{inv}}_i$), and the Impact Explorer displays an explicit calm banner: *"No active disruption ($0\%$ severity). All corridors and industries are operating at baseline capacity."*
- **Unconnected / Unexposed Node Selection:** If a user selects a node that has zero upstream path from the active shock origin (e.g., inspecting *Dry Bulk Grain & Soy* during a pure *Taiwan Advanced Semiconductor* shock), the inspector explicitly states: *"0.0 Exposure — No directed upstream dependency path connects Taiwan Foundries to Dry Bulk Grain & Soy in the current model scope."*
- **Extreme Filter / Empty Graph State:** If the user sets node-type filters or the minimum exposure threshold ($\text{REI} \ge 90$) such that no nodes match, the Dependency Network canvas displays a structured empty state with a single-click **"Reset Graph Filters"** action.
- **Corrupted or Full `localStorage`:** If `localStorage` is disabled (e.g., strict private browsing) or contains invalid JSON, the persistence layer catches the exception, logs a structured warning, falls back to in-memory session storage for custom scenarios, and notifies the user via a non-blocking banner.

---

## 8. Product Acceptance Criteria (MVP Release)

1. **Synchronized Multi-View State:** Selecting a scenario, changing a parameter, scrubbing the week $t \in [0, 26]$, or selecting a node updates the Geographic View, Dependency Network, Simulation Timeline, Impact Pathway Explorer, and Evidence Inspector from a single immutable simulation state tree with zero visual desynchronization.
2. **Deterministic Mathematical Integrity:** Running the simulation engine with identical inputs always produces bit-identical outputs; $S=0$ produces zero exposure everywhere; increasing $S$ or $D$ never decreases cumulative exposure; no input combination produces `NaN`, `Infinity`, or out-of-bounds indices ($<0$ or $>100$).
3. **100% Provenance Coverage:** Every node and edge in the bundled dataset resolves to at least one valid `SourceRecord` and carries an explicit `DataClassification` enum value rendered visibly in the UI.
4. **Zero Unsubstantiated Price Claims:** No UI view, tooltip, or narrative template claims a specific percentage change in consumer retail prices or inflation.
5. **Offline / Zero-Key Execution:** The production build (`npm run build && npm run preview`) runs cleanly in a browser with no network requests to paid APIs, no secret keys, and zero console errors.
