# ECONOLOOM — DATA STRATEGY, SCHEMA & PROVENANCE SPECIFICATION

**Document Status:** Phase 0 Baseline Specification  
**Last Updated:** 2026-10-19

---

## 1. Core Data Strategy Principles

1. **Local-First, Zero-Key Execution:** The EconoLoom MVP runs entirely from a compact, version-controlled, statically typed JSON/TypeScript dataset bundled within the repository (`src/data/`). It requires **zero paid APIs, zero secret keys, zero live scraping, and zero external database servers**.
2. **Offline Compilation from Authoritative Public Sources:** Raw public datasets (such as multi-hundred-megabyte OECD ICIO CSV matrices or World Bank `.xlsx` workbooks) are unsuitable for direct runtime parsing in a user's browser and frequently lack permissive CORS headers or stable unauthenticated REST endpoints. Instead, EconoLoom extracts, normalizes, and audits a curated **48-node, 78-edge structural dataset** offline, committing both the normalized data and full `SourceRecord` provenance metadata to version control.
3. **Strict Five-Tier Epistemic Classification:** Every quantitative value that influences a simulation outcome must carry an explicit `DataClassification` tag:
   - `observed` — Directly reported in an official statistical release or peer-reviewed empirical study (e.g., EIA's ~20% global LNG share transiting the Strait of Hormuz).
   - `derived` — Mathematically computed from `observed` values using a documented transformation (e.g., normalized technical input share $a_{ij} = Z_{ij} / X_j$ aggregated from OECD ICIO tables).
   - `model_parameter` — A structural or behavioral parameter calibrated from academic literature ranges (e.g., 2-to-8 week industrial inventory buffer cover or route bypass ceiling).
   - `user_input` — A scenario parameter actively set or modified by the user in the interface (e.g., $60\%$ disruption severity for $90\text{ days}$).
   - `illustrative` — A clearly labeled representative value used where public firm- or product-level data is proprietary or unavailable (e.g., illustrative bill-of-materials cost weights linking upstream industrial sectors to a familiar consumer category).
4. **No Silent Fabrication:** Missing data is never silently treated as zero risk, and an `illustrative` or `model_parameter` value is never presented as an empirically observed fact.

---

## 2. Evaluation of Public Data Sources

### 2.1 OECD Inter-Country Input–Output (ICIO) Tables
- **URL:** `https://www.oecd.org/en/data/datasets/inter-country-input-output-tables.html` *(Note: Direct automated HTTP fetch returned `403 Forbidden` due to Cloudflare bot protection on `oecd.org`; evaluated via official OECD ICIO documentation and metadata).*
- **Variables Provided:** Bilateral intermediate consumption matrix ($Z_{ij}^{rs}$, flow of inputs from industry $i$ in country $r$ to industry $j$ in country $s$), Final Demand columns (`HFCE`, `NPISH`, `GGFC`, `GFCF`, `INVNT`), Value Added at basic prices, and Gross Output ($X_j^s$) in current USD millions.
- **Geographic & Industry Coverage:** 80–81 individual economies (all OECD, EU27, G20, major ASEAN economies, plus China and Mexico split into processing vs. non-processing trade) plus Rest of the World (~120 economies), across **50 ISIC Rev. 4 industries**.
- **Time Coverage & Update Frequency:** Annual series (typically 1995–2022/2023 in recent 2025/2026 editions); updated periodically every 1–2 years.
- **Resolution:** Country $\times$ 2-digit ISIC Rev. 4 sector level, annual.
- **Access Method & Format:** Bulk downloadable `.CSV` / `.RData` archives via the OECD Data Explorer and SDMX API.
- **Licence & Attribution:** Governed by OECD Terms and Conditions (`https://www.oecd.org/en/about/terms-conditions.html`). Free to extract, transform, and publish derived indicators with mandatory attribution to OECD. Bulk redistribution of raw unmodified OECD databases is restricted unless authorized; EconoLoom only distributes a small set of derived/aggregated technical coefficients with full OECD citation.
- **Known Limitations:** Annual resolution; 2-to-3 year publication lag; aggregates distinct physical commodities (e.g., elemental sulfur and specialty photoresists both sit inside `Chemicals and chemical products`, ISIC D20).
- **Support for EconoLoom & MVP Suitability:** **High (Offline Reference Spine).** Used to ground baseline cross-sector technical input shares ($w_{e}$) between the 14 `industry` nodes and regional hubs.

### 2.2 OECD Input–Output Tables (IOTs)
- **URL:** `https://www.oecd.org/en/data/datasets/input-output-tables.html` *(Evaluated via OECD documentation; direct automated fetch returned `403 Forbidden`).*
- **Variables Provided:** Domestic and imported intermediate transaction tables, household final consumption expenditure (`HFCE`) shares by industry, and value-added ratios.
- **Geographic & Industry Coverage:** OECD member and key partner economies; up to 50–89 harmonized ISIC Rev. 4 industry/product groupings.
- **Time Coverage & Update Frequency:** Annual benchmark tables updated periodically.
- **Access Method & Format:** Bulk CSV / Excel / SDMX via OECD Data Explorer.
- **Licence & Attribution:** OECD Terms and Conditions with attribution.
- **Known Limitations:** Single-country focus unless paired with ICIO; annual static coefficients.
- **Support for EconoLoom & MVP Suitability:** **Medium-High (Offline Reference).** Used to calibrate baseline linkage weights from `industry` nodes into `consumer_category` nodes (via `HFCE` expenditure shares).

### 2.3 OECD Gross Output Flows in Global Value Chains (GVC)
- **URL:** `https://www.oecd.org/en/data/datasets/gross-output-flows-in-global-value-chains.html` *(Evaluated via OECD GVC documentation; direct automated fetch returned `403 Forbidden`).*
- **Variables Provided:** **Foreign Input Reliance (FIR)** and **Foreign Market Reliance (FMR)** computed on a *gross output* basis rather than a value-added (TiVA) basis.
- **Geographic & Industry Coverage:** Matches OECD ICIO (~80 economies, 50 ISIC Rev. 4 industries).
- **Time Coverage & Update Frequency:** Annual series aligned with ICIO releases.
- **Access Method & Format:** CSV / OECD Data Explorer.
- **Licence & Attribution:** OECD Terms and Conditions with attribution.
- **Known Limitations:** Macro-sector resolution; does not identify which physical maritime chokepoint a gross input flow traverses.
- **Support for EconoLoom & MVP Suitability:** **High (Methodological & Parameter Calibration).** Directly validates EconoLoom's choice to model *gross intermediate input reliance* rather than domestic value-added shares when evaluating supply-chain bottlenecks.

### 2.4 World Bank Commodity Price Data ("The Pink Sheet")
- **URL:** `https://thedocs.worldbank.org/en/doc/18675f1d1639c7a34d463f59263ba0a2-0050012025/` *(Verified via live HTTP fetch on 2026-10-19).*
- **Variables Provided:** Monthly, quarterly, and annual spot/benchmark prices and composite indices (2010=100) for **70+ commodities**: Energy (Crude oil Brent/WTI/Dubai in `$/bbl`, Natural Gas US/Europe/Japan LNG in `$/mmbtu`, Coal in `$/mt`), Fertilizers (Urea, DAP, Phosphate rock, Potassium chloride in `$/mt`), Base Metals (Aluminum, Copper, Iron ore, Nickel, Zinc in `$/mt`), and Agriculture (Wheat, Maize, Rice, Soybeans, Palm oil).
- **Geographic & Industry Coverage:** Global benchmark commodity markets.
- **Time Coverage & Update Frequency:** Historical series from 1960 to present; updated monthly by the World Bank Prospects Group.
- **Access Method & Format:** Publicly downloadable `.xlsx` and `.pdf` files.
- **Licence & Attribution:** World Bank Open Data Terms of Use (Creative Commons Attribution 4.0 International / CC BY 4.0). Requires citation: *"World Bank Commodities Price Data (The Pink Sheet)."*
- **Known Limitations:** Reports global benchmark prices rather than bilateral physical trade volumes or industrial inventory levels.
- **Support for EconoLoom & MVP Suitability:** **High (MVP Baseline Metadata).** Used to define standard commodity units, reference baseline prices, and historical stress ranges for EconoLoom's `commodity` nodes.

### 2.5 Authoritative Chokepoint, Maritime & Sectoral Sources
To bridge the gap between macro IO sectors and physical chokepoints, EconoLoom incorporates verified public domain and institutional reports:

| Source & Publisher | Variables Extracted for EconoLoom MVP | Coverage & Resolution | Licence / Attribution | MVP Suitability |
| :--- | :--- | :--- | :--- | :--- |
| **U.S. Energy Information Administration (EIA)** — *World Oil Transit Chokepoints* (`eia.gov`) | Daily petroleum liquids (`mb/d`, ~20% global share) and LNG (`bcf/d`, ~20% global share) transiting Strait of Hormuz; active & spare bypass capacity of Saudi East–West Pipeline (Petroline) and UAE Habshan–Fujairah pipeline; regional destination shares (~80%+ to Asia). | Global maritime energy chokepoints; annual/periodic briefings. | U.S. Government Public Domain (17 U.S.C. § 105); attribution to U.S. EIA required for transparency. | **High (Primary source for Preset 1 energy & bypass parameters).** |
| **IIASA / DisruptSC Research Briefs** — *Colon, Hallegatte, & Rozenberg (2021, Nature Sustainability)* & *Strait of Hormuz Crisis Analytics Briefs 1 & 2 (April 2026)* (`ccolon.github.io/disrupt-sc/research/hormuz/`) | Non-oil Hormuz dependency shares (~50% global seaborne sulfur, Korea/India naphtha & LNG shares, Gulf aluminum smelting share ~8–9%); empirical inventory buffer exhaustion windows (Weeks 2–4 for packaging resins, Weeks 8–10 for industrial cascades); post-reopening recovery drag dynamics. | Gulf + 8 global trade blocs; weekly cascade resolution. | Academic fair-use citation of published empirical metrics and model findings *(zero GPL-3.0 code used)*. | **High (Primary source for Preset 1 non-oil cascades & buffer windows).** |
| **UNCTAD** (*Review of Maritime Transport*) & **Panama Canal Authority (ACP)** (`pancanal.com` / `unctad.org`) | Baseline daily vessel transits (36–38/day vs. drought-restricted 22–24/day), cargo share by segment (containers, dry bulk grain, LPG/chemical tankers), and US–Asia route share (~40% of US East Coast container traffic). | Panama Canal & global shipping routes; monthly/annual reports. | Public institutional statistics; cite UNCTAD and ACP. | **High (Primary source for Preset 3 parameters).** |
| **Semiconductor Industry Association (SIA) / BCG** — *Strengthening the Global Semiconductor Supply Chain* (`semiconductors.org`) | Regional share of global wafer fabrication capacity (~60%+ foundry revenue in Taiwan; >80% of advanced logic $<7\text{nm}$; mature node shares in automotive/industrial). | Global semiconductor value chain by node size and stage (wafers, chemicals, fab, ATP). | Public industry report metrics; cite SIA / WSTS / BCG. | **High (Primary source for Preset 2 parameters).** |
| **Natural Earth Vector Data** (`naturalearthdata.com`) | Simplified world coastline, country polygons (`1:110m`), and geographic coordinates for map rendering. | Global vector geometry. | **Public Domain (CC0)** — unrestricted client-side bundling. | **High (Bundled offline base map).** |

---

## 3. Domain Data Architecture & TypeScript Schema

All domain data lives in `src/data/` and is validated at build and test time against strict TypeScript interfaces (`src/types/domain.ts`).

### 3.1 Provenance & Classification Primitives

```typescript
/**
 * Five-tier epistemic classification required for every quantitative parameter,
 * baseline observation, edge weight, and model assumption.
 */
export type DataClassification =
  | 'observed'         // Directly reported in cited official statistics or empirical study
  | 'derived'          // Calculated from observed sources via documented transformation
  | 'model_parameter'  // Calibrated structural/behavioral parameter from literature ranges
  | 'user_input'       // Actively configured by the user in the scenario UI
  | 'illustrative';    // Representative value inserted where empirical data is unavailable

export type EvidenceConfidence =
  | 'high'             // Multi-source official statistical consensus (e.g., EIA, OECD, UNCTAD)
  | 'medium'           // Single-source report, aggregated proxy, or literature estimate
  | 'low'              // Broad order-of-magnitude approximation with high variance
  | 'illustrative_only'; // Pedagogical placeholder; must never be cited as empirical fact

export interface SourceRecord {
  id: string;                        // e.g., 'src_eia_hormuz_2024'
  title: string;                     // Official publication or dataset title
  publisher: string;                 // e.g., 'U.S. Energy Information Administration (EIA)'
  url: string;                       // Primary reference URL
  publicationDateOrPeriod: string;   // e.g., '2024–2025 Reference Period'
  accessDate: string;                // ISO date, e.g., '2026-10-19'
  variablesSupported: string[];      // Specific metrics grounded by this source
  licence: string;                   // e.g., 'U.S. Government Public Domain' or 'CC BY 4.0'
  attributionText: string;           // Exact citation string displayed in UI
  transformationNotes: string;       // How raw source figures were mapped into EconoLoom
  knownLimitations: string;          // Caveats on coverage, lag, or aggregation
  confidence: EvidenceConfidence;
}

export interface TraceableValue<T = number> {
  value: T;
  unit: string;                      // e.g., 'share_0_to_1', 'weeks', 'usd_per_mt', 'index_0_100'
  classification: DataClassification;
  confidence: EvidenceConfidence;
  sourceIds: string[];               // References to SourceRecord.id[]
  assumptionId?: string;             // Optional reference to ModelAssumption.id
  rationale: string;                 // Concise explanation shown in the Provenance Inspector
}

export interface ModelAssumption {
  id: string;                        // e.g., 'asm_fixed_short_run_coefficients'
  title: string;
  category: 'structural' | 'temporal' | 'resilience' | 'price_guardrail';
  description: string;
  impactOnResults: string;           // How relaxing this assumption would alter the output
  falsifiabilityOrLimit: string;     // Conditions under which this assumption breaks down
}
```

### 3.2 Network Node & Directed Edge Schema

```typescript
export type NodeCategory =
  | 'chokepoint'         // Maritime straits, canals, or concentrated production infrastructure
  | 'geography'          // Country or regional economic hub
  | 'commodity'          // Raw material, energy carrier, chemical feedstock, or component
  | 'industry'           // ISIC Rev. 4 aligned manufacturing, extraction, or logistics sector
  | 'consumer_category'; // Everyday household product or service category

export interface BaseEconNode {
  id: string;                        // e.g., 'chk_hormuz', 'com_naphtha', 'ind_petrochem', 'con_groceries'
  name: string;
  shortLabel: string;                // Max 22 chars for compact graph node rendering
  category: NodeCategory;
  regionCode: string;                // ISO-3 or regional code ('GULF', 'TWN', 'KOR', 'JPN', 'CHN', 'IND', 'USA', 'EU27', 'SAM', 'GLOBAL')
  coordinates: [number, number];     // [longitude, latitude] for Geographic View placement
  tierIndex: 0 | 1 | 2 | 3;          // Deterministic column in DAG: 0=Origin/Geo, 1=Commodity, 2=Industry, 3=Consumer
  summary: string;                   // Plain-language explanation of the node's role in the global economy
  baselineMetric: TraceableValue<number>; // e.g., global transit share, global output share, or benchmark price
  inventoryBufferWeeks: TraceableValue<number>; // Baseline working stock cover in weeks (\tau^{inv}_i)
  substitutionCapacity: TraceableValue<number>; // Short-run ability to substitute missing inputs (\sigma_i \in [0, 0.5])
  recoveryHalfLifeWeeks: TraceableValue<number>; // Post-disruption operational recovery speed
  consumerBomBreakdown?: ConsumerInputComponent[]; // Populated only when category === 'consumer_category'
}

export interface ConsumerInputComponent {
  upstreamNodeId: string;            // Connected industry or commodity node ID
  componentLabel: string;            // e.g., 'PET & Polyolefin Food Packaging Resins'
  costShare: TraceableValue<number>; // Share of category cost structure (0 to 1)
}

export type RelationshipType =
  | 'transits_through'     // Chokepoint -> Commodity or Geography -> Chokepoint
  | 'produces_or_exports'  // Geography/Hub -> Commodity
  | 'supplies_input_to'    // Commodity -> Industry or Industry -> Industry
  | 'delivers_to_consumer';// Industry -> Consumer Category

export interface DependencyEdge {
  id: string;                        // e.g., 'edge_hormuz_to_sulfur'
  sourceNodeId: string;              // Upstream node u
  targetNodeId: string;              // Downstream node v
  relationshipType: RelationshipType;
  mechanismSummary: string;          // Plain-language causal explanation of WHY v depends on u
  dependencyStrength: TraceableValue<number>; // Share of target's requirement supplied via this link (w_e \in (0, 1])
  bottleneckCriticality: TraceableValue<number>; // Complementarity factor (c_e \in [0, 1]; 1 = strict Leontief bottleneck)
  transitDelayWeeks: TraceableValue<number>; // Propagation lag in integer weeks (L_e \in {0, 1, 2, 3, 4})
  bypassCapacityShare: TraceableValue<number>; // Fraction of disrupted flow mitigable via alternate route (\beta_e \in [0, 1])
  bypassDelayPenaltyWeeks: number;   // Additional transit lag when rerouted (e.g., +2 weeks around Cape of Good Hope)
  corridorGeoJsonId?: string;        // Links to maritime/pipeline route geometry on the map
}
```

### 3.3 Scenario & Simulation Output Schema

```typescript
export type MitigationProfile = 'restricted' | 'baseline' | 'enhanced';

export interface ScenarioParameters {
  targetNodeIds: string[];           // Primary disrupted node(s), e.g., ['chk_hormuz']
  severity: number;                  // Normalized [0, 1] (UI displays 0% to 100%)
  durationDays: number;              // Integer days [7, 180] (converted to active shock profile over weeks)
  inventoryBufferMultiplier: number; // Multiplier [0.5, 2.0] applied to baseline node inventoryBufferWeeks
  mitigationProfile: MitigationProfile; // Scales active bypassCapacityShare and substitutionCapacity
}

export interface ScenarioPreset {
  id: string;                        // 'preset_hormuz_energy' | 'preset_taiwan_semi' | 'preset_panama_canal'
  title: string;
  subtitle: string;
  shockOriginNodeId: string;
  defaultParams: ScenarioParameters;
  narrativeBrief: string;
  historicalAndEmpiricalContext: string;
  supportedOutputs: string[];
  unsupportedOutputsWarning: string; // Explicit guardrail displayed in UI
  featuredPathwayTargetIds: string[]; // Default downstream nodes highlighted in Impact Explorer
  sourceIds: string[];
}
```

---

## 4. Initial 48-Node Dataset Plan & Provenance Matrix

The table below defines the complete 48-node architecture planned for `src/data/network.ts` and documents the exact provenance tier for each group:

| Node Category (Count) | Node IDs & Representative Entities | Primary Data Classification | Grounding Sources |
| :--- | :--- | :--- | :--- |
| **Chokepoints (3)** | `chk_hormuz` (Strait of Hormuz), `chk_taiwan_fabs` (Taiwan Foundry Cluster & Strait), `chk_panama` (Panama Canal Locks) | `observed` (transit shares & capacity) + `model_parameter` (bypass ceilings) | U.S. EIA (2024–2025), UNCTAD (2024), Panama Canal Authority (ACP), SIA/BCG |
| **Geographic Hubs (9)** | `geo_gulf` (Persian Gulf: SAU/QAT/ARE), `geo_twn` (Taiwan), `geo_kor` (South Korea), `geo_jpn` (Japan), `geo_chn` (China), `geo_ind` (India), `geo_usa` (United States), `geo_eu` (European Union), `geo_sam` (South America: CHL/PER) | `observed` / `derived` (regional export & import concentration shares) | OECD ICIO (2025 ed.), OECD GVC Gross Output Flows (`FIR`/`FMR`) |
| **Commodities (14)** | `com_crude` (Seaborne Crude Oil), `com_lng` (LNG), `com_naphtha` (Naphtha & LPG), `com_sulfur` (Elemental Sulfur), `com_sulfuric_acid` (Sulfuric Acid), `com_aluminum` (Primary Aluminum), `com_copper` (Refined Copper), `com_urea` (Urea & Nitrogen Fertilizer), `com_chip_solvents` (High-Purity Chip Solvents/Photoresists), `com_wafers` (300mm Silicon Wafers), `com_adv_logic` (<7nm Logic Chips), `com_auto_mcu` (28nm+ Auto/Industrial MCUs), `com_containers` (Containerized Freight), `com_grain` (Dry Bulk Grain & Soy) | `observed` (benchmark units & trade shares) + `model_parameter` (stock cover in weeks) | World Bank Pink Sheet (2025), EIA, IIASA Hormuz Briefs 1 & 2 (Apr 2026), SIA/WSTS |
| **Industries (14)** | `ind_refining` (Petroleum Refining), `ind_petrochem` (Petrochemical Cracking), `ind_fertilizer` (Fertilizer & Agrochemicals), `ind_copper_mining` (Acid-Leach Copper Mining), `ind_aluminum_smelt` (Aluminum Smelting & Rolling), `ind_foundry` (Semiconductor Foundry & ATP), `ind_ai_servers` (AI & Cloud Server Mfg), `ind_electronics` (Consumer Electronics Assembly), `ind_automotive` (Automotive & EV Mfg), `ind_textiles` (Synthetic Textile & Apparel), `ind_food_proc` (Food & Beverage Processing), `ind_packaging` (Plastic & PET Packaging), `ind_shipping` (Container Shipping & Insurance), `ind_grain_logistics` (Agri Export Logistics) | `derived` (technical input shares from OECD ICIO) + `model_parameter` (buffer weeks & complementarity) | OECD ICIO (ISIC Rev. 4 D19–D30, H50), IIASA/Colon et al. (2021, 2026) |
| **Consumer Categories (8)** | `con_fuel_heat` (Household Gasoline & Heating), `con_groceries` (Retail Groceries & Packaged Food), `con_apparel` (Everyday Apparel & Fast Fashion), `con_smartphones` (Smartphones & PCs), `con_cloud_ai` (Cloud & AI Digital Services), `con_vehicles` (Passenger Vehicles & Auto Repair), `con_appliances` (Household Appliances), `con_construction` (Residential Construction & Wiring) | `derived` (OECD IOT `HFCE` sector weights) + `illustrative` (product-level BOM breakdown weights) | OECD IOT (`HFCE`), supplemented by explicitly badged `illustrative` BOM shares |

---

## 5. Known Data Limitations & Fallback Rules

1. **Macro-Sector vs. Specific Chemical/Component Resolution:** Official OECD ICIO tables report industry-level flows (e.g., `Chemicals`, `Basic Metals`, `Computer, Electronic and Optical Products`), whereas real supply-chain bottlenecks often hinge on specific sub-sector inputs (such as elemental sulfur for copper leaching or sub-7nm logic chips).
   - *Fallback & Transparency Rule:* EconoLoom uses empirical trade-share studies (e.g., IIASA 2026 Hormuz Briefs, SIA/BCG semiconductor studies, EIA briefings) for specific commodity-to-industry edges, and tags the resulting `bottleneckCriticality` as `model_parameter` with full citation and sensitivity controls.
2. **Proprietary Firm-Level Inventory Data:** Actual commercial inventory levels (days of cover held by specific refineries, chipmakers, or food packagers) are rarely published in harmonized global statistics.
   - *Fallback & Transparency Rule:* Baseline inventory buffers ($\tau^{\text{inv}}_i$, in weeks) are classified as `model_parameter` grounded in documented industry ranges (e.g., 2 weeks for Korean packaging film resins, 8–10 weeks for DRC/Zambian copper mine sulfur stocks), and users are given an explicit **Inventory Buffer Multiplier ($0.5\times–2.0\times$)** slider in the main control bar to test sensitivity directly.
3. **Consumer Bill-of-Materials (BOM) Weights:** Mapping industrial sectors into specific household product categories involves illustrative cost decompositions.
   - *Fallback & Transparency Rule:* All `ConsumerInputComponent` weights are explicitly marked `classification: 'illustrative'` or `'derived'` in the UI, and drive a bounded **Cost-Pressure Index (0–100)** rather than predicted retail price percentages.
