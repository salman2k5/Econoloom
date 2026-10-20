/**
 * EconoLoom Verified Source Citations & Structural Model Assumptions
 *
 * Every quantitative value in src/data/nodes.ts and src/data/edges.ts links to
 * one or more SourceRecord IDs defined here.
 */

import type { ModelAssumption, SourceRecord } from '../types/domain';

export const SOURCES: SourceRecord[] = [
  {
    id: 'src_oecd_icio_2023',
    title: 'OECD Inter-Country Input-Output (ICIO) Tables (2023 Edition)',
    organization: 'Organisation for Economic Co-operation and Development (OECD)',
    publicationDate: '2023-11',
    url: 'https://www.oecd.org/en/data/datasets/inter-country-input-output-tables.html',
    license: 'OECD Terms and Conditions (Free Public Attribution Use)',
    accessNotes: 'Pre-processed offline into EconoLoom 48-node sector dependency weights (ISIC Rev. 4 aligned).',
    usageScope: 'Cross-border intermediate input dependency shares across 45 ISIC Rev. 4 industries and major trading regions.',
  },
  {
    id: 'src_oecd_iot',
    title: 'OECD National Input-Output Tables (IOTs)',
    organization: 'Organisation for Economic Co-operation and Development (OECD)',
    publicationDate: '2023-11',
    url: 'https://www.oecd.org/en/data/datasets/input-output-tables.html',
    license: 'OECD Terms and Conditions (Free Public Attribution Use)',
    usageScope: 'Domestic technical coefficients and industry-to-consumer basket cost share breakdowns.',
  },
  {
    id: 'src_oecd_gvc',
    title: 'OECD Gross Output Flows in Global Value Chains (TiVA / GVC Indicators)',
    organization: 'Organisation for Economic Co-operation and Development (OECD)',
    publicationDate: '2023-12',
    url: 'https://www.oecd.org/en/data/datasets/gross-output-flows-in-global-value-chains.html',
    license: 'OECD Terms and Conditions (Free Public Attribution Use)',
    usageScope: 'Upstream import reliance and foreign value-added shares in electronics, automotive, and chemical value chains.',
  },
  {
    id: 'src_wb_pink_sheet_2025',
    title: 'World Bank Commodity Markets ("Pink Sheet") Historical & Monthly Price Data',
    organization: 'World Bank Group',
    publicationDate: '2025-01',
    url: 'https://thedocs.worldbank.org/en/doc/18675f1d1639c7a34d463f59263ba0a2-0050012025/',
    license: 'Creative Commons Attribution 4.0 (CC BY 4.0)',
    usageScope: 'Baseline commodity price volatility ratios and historical shock pass-through benchmarks for crude, LNG, urea, aluminum, copper, and grains.',
  },
  {
    id: 'src_eia_hormuz_2024',
    title: 'World Oil Transit Chokepoints: Strait of Hormuz Analysis',
    organization: 'U.S. Energy Information Administration (EIA)',
    publicationDate: '2024-06',
    url: 'https://www.eia.gov/international/analysis/special-topics/World_Oil_Transit_Chokepoints',
    license: 'U.S. Government Public Domain',
    usageScope: 'Observed crude oil, condensate, and LNG transit shares (~20% of global petroleum liquids and ~20% of global LNG), East-West pipeline bypass capacity, and Asian destination shares.',
  },
  {
    id: 'src_iiasa_hormuz_brief1_2026',
    title: 'Hormuz Chokepoint Disruption: Energy, Naphtha, and Petrochemical Feedstock Cascades',
    organization: 'International Institute for Applied Systems Analysis (IIASA)',
    publicationDate: '2026-03',
    url: 'https://iiasa.ac.at/',
    license: 'CC BY 4.0 Academic Research Attribution',
    usageScope: 'Empirical linkage between Gulf LPG/naphtha exports and Asian steam crackers (plastics, synthetic textiles, and semiconductor-grade solvents).',
  },
  {
    id: 'src_iiasa_hormuz_brief2_2026',
    title: 'The Hidden Sulfur Cascade: Gulf Sour Gas Processing, Sulfuric Acid, Fertilizers, and Copper Leaching',
    organization: 'International Institute for Applied Systems Analysis (IIASA)',
    publicationDate: '2026-03',
    url: 'https://iiasa.ac.at/',
    license: 'CC BY 4.0 Academic Research Attribution',
    usageScope: 'Documents how >45% of global seaborne elemental sulfur originates from Gulf sour gas/oil desulfurization, feeding sulfuric acid for phosphate fertilizers and hydrometallurgical copper/cobalt leaching.',
  },
  {
    id: 'src_unctad_rmt_2024',
    title: 'Review of Maritime Transport 2024: Navigating Maritime Chokepoints',
    organization: 'UN Trade and Development (UNCTAD)',
    publicationDate: '2024-10',
    url: 'https://unctad.org/topic/transport-and-trade-logistics/review-of-maritime-transport',
    license: 'UN Open Access / Attribution',
    usageScope: 'Maritime transit lead times, Cape of Good Hope/Horn rerouting voyage penalties (+10 to +18 days), and container freight cost sensitivity.',
  },
  {
    id: 'src_acp_panama_2024',
    title: 'Panama Canal Transit Statistics & Gatun Lake Draft Restriction Advisories (FY2023–2024)',
    organization: 'Autoridad del Canal de Panamá (ACP)',
    publicationDate: '2024-09',
    url: 'https://pancanal.com/en/statistics/',
    license: 'Public Official Canal Statistics',
    usageScope: 'Daily lock slot reductions during the 2023–2024 drought (from 36–38 down to 22–24 daily transits) and commodity shares (U.S. Gulf LNG/LPG, grain, East Coast container trade, and Andean copper).',
  },
  {
    id: 'src_sia_bcg_semi_2024',
    title: 'Emerging Resilience in the Semiconductor Supply Chain',
    organization: 'Semiconductor Industry Association (SIA) & Boston Consulting Group (BCG)',
    publicationDate: '2024-05',
    url: 'https://www.semiconductors.org/',
    license: 'Public Industry Report (Fair Attribution Use)',
    usageScope: 'Geographic concentration of sub-7nm advanced logic fabrication in Taiwan (>65% global foundry share, >85% advanced node share) and fabless/OSAT lead times.',
  },
  {
    id: 'src_usgs_mcs_2024',
    title: 'Mineral Commodity Summaries 2024: Sulfur, Copper, Aluminum, and Silicon',
    organization: 'U.S. Geological Survey (USGS)',
    publicationDate: '2024-01',
    url: 'https://pubs.usgs.gov/periodicals/mcs2024/',
    license: 'U.S. Government Public Domain',
    usageScope: 'Primary production, smelting electricity intensity, byproduct sulfur share (>80% recovered from oil/gas refining), and industrial consumption structure.',
  },
  {
    id: 'src_fao_fertilizer_2024',
    title: 'Global Fertilizer Markets and Agricultural Production Cost Structure',
    organization: 'Food and Agriculture Organization of the United Nations (FAO)',
    publicationDate: '2024-07',
    url: 'https://www.fao.org/markets-and-trade/commodities/fertilizers/en/',
    license: 'CC BY-NC-SA 3.0 IGO',
    usageScope: 'Ammonia/urea and phosphate fertilizer trade shares, seasonal application lags, and farmgate-to-retail grocery cost shares.',
  },
  {
    id: 'src_natural_earth_cc0',
    title: 'Natural Earth 1:110m Cultural and Physical Vectors',
    organization: 'Natural Earth / NACIS',
    publicationDate: '2024-01',
    url: 'https://www.naturalearthdata.com/about/terms-of-use/',
    license: 'Public Domain (CC0)',
    usageScope: 'Offline vector world basemap geometry and maritime corridor reference coordinates.',
  },
  {
    id: 'src_econoloom_methodology',
    title: 'EconoLoom Structural Propagation & Inventory Buffer Methodology v1.0',
    organization: 'EconoLoom Engineering & Economic Modelling Team',
    publicationDate: '2026-10',
    url: 'SIMULATION_METHODOLOGY.md',
    license: 'Internal Project Specification',
    usageScope: 'Weekly discrete-time bottleneck-weighted Leontief propagation, sigmoid inventory coverage curve, and bounded [0, 100] Relative Exposure & Cost-Pressure Index definitions.',
  },
];

export const MODEL_ASSUMPTIONS: ModelAssumption[] = [
  {
    id: 'asm_hybrid_bottleneck_blend',
    parameterKey: 'lambda_criticality',
    title: 'Hybrid Linear-Leontief Bottleneck Blending',
    valueSummary: 'Blends weighted-average input exposure with worst-bottleneck exposure using edge inputCriticality (c in [0, 1]).',
    classification: 'model_parameter',
    confidence: 'medium',
    rationale:
      'Purely linear input-output models underestimate physical bottlenecks (e.g., missing a $2 microcontroller halts a $40,000 vehicle), while pure Leontief minimum rules ignore multi-product flexibility. Blending via inputCriticality captures both regimes.',
    limitation:
      'Sector-level criticality parameters are calibrated to representative industrial processes and may over- or under-state firm-specific design workarounds.',
    validationCheck:
      'Checked against the 2021 automotive semiconductor shortage and 2022 European energy/fertilizer curtailment episodes.',
    sourceIds: ['src_oecd_icio_2023', 'src_sia_bcg_semi_2024', 'src_econoloom_methodology'],
  },
  {
    id: 'asm_inventory_sigmoid_buffer',
    parameterKey: 'inventory_drawdown_curve',
    title: 'Inventory Buffer Drawdown & Post-Shock Recovery Rate',
    valueSummary: 'Smooth logistic coverage curve during stockout approach; post-shock replenishment rate fixed at r_rec = 2.0 days of stock recovered per week.',
    classification: 'model_parameter',
    confidence: 'medium',
    rationale:
      'Real supply chains experience precautionary rationing and spot-market bidding before aggregate stockpiles hit zero. A smooth logistic transition avoids artificial step-function cliffs.',
    limitation:
      'Inventory holdings are modeled as sector-wide averages (in days of consumption) and do not capture hoarding or unequal distribution across individual firms.',
    validationCheck:
      'Monotonicity unit test verifies that scaling inventoryBufferScale from 0.5x to 2.0x strictly delays or reduces downstream peak REI.',
    sourceIds: ['src_eia_hormuz_2024', 'src_sia_bcg_semi_2024', 'src_econoloom_methodology'],
  },
  {
    id: 'asm_substitution_ramp',
    parameterKey: 'tau_sub_weeks',
    title: 'Medium-Term Supplier Substitution Ramp (tau_sub = 4 weeks)',
    valueSummary: 'Non-affected supplier switching ramps up over a 4-week qualification lag up to node substitutionPotential.',
    classification: 'model_parameter',
    confidence: 'medium',
    rationale:
      'Switching bulk commodities on spot markets still requires vessel chartering (2–4 weeks), while custom industrial inputs (advanced logic wafers, specialty solvents) have near-zero short-term substitution.',
    limitation:
      'Assumes non-shocked suppliers have modest spare capacity; simultaneous global shocks would reduce effective substitution further.',
    validationCheck:
      'Advanced logic nodes have substitutionPotential <= 0.08, preventing unrealistic short-term fab switching.',
    sourceIds: ['src_oecd_gvc', 'src_sia_bcg_semi_2024', 'src_econoloom_methodology'],
  },
  {
    id: 'asm_bounded_indices_no_retail_forecast',
    parameterKey: 'rei_cpi_index_bounds',
    title: 'Bounded Relative Exposure (REI) & Cost-Pressure (CPI) Indices [0–100]',
    valueSummary: 'All model outputs are normalized to [0, 100] ordinal stress scores paired with 5 qualitative bands (Baseline, Low, Moderate, Elevated, Severe).',
    classification: 'model_parameter',
    confidence: 'high',
    rationale:
      'Retail consumer prices depend on monetary policy, exchange rates, retail margin compression, hedging contracts, and fiscal subsidies not modeled in a structural supply network.',
    limitation:
      'Users cannot read a direct percentage retail inflation forecast from CPI; this is an intentional epistemic guardrail.',
    validationCheck:
      'Automated boundary tests verify REI and CPI remain strictly within [0, 100] across all parameter extremes.',
    sourceIds: ['src_wb_pink_sheet_2025', 'src_oecd_iot', 'src_econoloom_methodology'],
  },
];
