/**
 * EconoLoom Flagship Scenario Presets
 *
 * Defines the three researched global shock scenarios specified in PRODUCT_REQUIREMENTS.md:
 * 1. Strait of Hormuz Energy & Sulfur Chokepoint
 * 2. Taiwan Semiconductor Foundry & Strait Disruption
 * 3. Panama Canal Severe Hydrological Draft & Lock Restriction
 */

import type { ScenarioPreset } from '../types/domain';

export const PRESETS: ScenarioPreset[] = [
  {
    id: 'preset_hormuz_energy',
    title: 'Strait of Hormuz Energy & Sulfur Chokepoint',
    subtitle:
      '60% maritime capacity curtailment across Persian Gulf crude, LNG, naphtha, aluminum, and elemental sulfur corridors for 90 days.',
    shockOriginNodeIds: ['chk_hormuz'],
    affectedCorridorId: 'cor_hormuz_asia_europe',
    defaultParams: {
      shockSeverityPct: 0.6,
      durationDays: 90,
      inventoryBufferScale: 1.0,
      rerouteCapacityShare: 0.22,
      substitutionFlexibility: 0.25,
      shippingCostMultiplier: 2.2,
    },
    historicalPrecedent:
      'Calibrated against Persian Gulf tanker-war insurance spikes, the 2019 Abqaiq processing disruption, and the 2022 global LNG/fertilizer shock.',
    narrativeHook:
      'Beyond the immediate spike in motor fuel and Asian/European LNG power, a Hormuz disruption chokes >45% of global seaborne elemental sulfur—cascading into sulfuric acid, phosphate fertilizers, copper ore leaching, and Asian naphtha steam crackers that supply food packaging, synthetic apparel, and ultra-pure chip solvents.',
    featuredConsumerNodeId: 'con_groceries',
    featuredCausalNodeIds: [
      'chk_hormuz',
      'com_sulfur',
      'com_sulfuric_acid',
      'ind_fertilizer',
      'ind_food_proc',
      'con_groceries',
    ],
    supportedOutputs: [
      'Relative Exposure Index (REI 0–100) across 48 nodes over a 26-week horizon',
      'Cost-Pressure Index (CPI 0–100) & qualitative severity band progression',
      'Pipeline bypass cap (~22% via Petroline/Fujairah for crude; 0% for LNG and sulfur)',
      'Multi-path trace from Gulf sour-gas sulfur to fertilizers, groceries, and copper leaching',
    ],
    excludedClaims: [
      'Does NOT forecast exact Brent crude spot prices ($/bbl) or retail pump prices ($/gal)',
      'Does NOT predict national CPI inflation percentages or central bank interest rate decisions',
      'Does NOT model military escalation probabilities or strategic reserve release politics',
    ],
    sourceIds: [
      'src_eia_hormuz_2024',
      'src_iiasa_hormuz_brief1_2026',
      'src_iiasa_hormuz_brief2_2026',
      'src_oecd_icio_2023',
      'src_wb_pink_sheet_2025',
    ],
  },
  {
    id: 'preset_taiwan_semi',
    title: 'Taiwan Semiconductor Foundry & Strait Disruption',
    subtitle:
      '50% curtailment of Taiwan sub-7nm advanced logic and automotive MCU fabrication & export corridors for 60 days.',
    shockOriginNodeIds: ['chk_taiwan_fabs'],
    affectedCorridorId: 'cor_taiwan_transpacific',
    defaultParams: {
      shockSeverityPct: 0.5,
      durationDays: 60,
      inventoryBufferScale: 1.0,
      rerouteCapacityShare: 0.1,
      substitutionFlexibility: 0.08,
      shippingCostMultiplier: 1.6,
    },
    historicalPrecedent:
      'Grounded in the 2021–2022 global automotive MCU shortage, the 1999 Jiji earthquake fab outage, and SIA/BCG foundry concentration studies.',
    narrativeHook:
      'Because sub-7nm logic (>85% Taiwan share) and outsourced 28nm–65nm automotive microcontrollers (~60%+ share) are mask-locked to specific foundry processes, short-term substitution is near zero. Once 2–3 weeks of OEM buffer stocks deplete, "golden screw" Leontief bottlenecks halt vehicle assembly lines, smartphones, and hyperscale AI server rollouts.',
    featuredConsumerNodeId: 'con_vehicles',
    featuredCausalNodeIds: [
      'chk_taiwan_fabs',
      'com_auto_mcu',
      'ind_automotive',
      'con_vehicles',
    ],
    supportedOutputs: [
      'Bottleneck-weighted Leontief amplification showing why a <3% BOM chip halts a full vehicle',
      'Comparison between lean just-in-time buffers (0.5x) and defensive semiconductor stockpiling (2.0x)',
      'Downstream exposure across Cloud/AI servers, Smartphones/Laptops, Vehicles, and Smart Appliances',
    ],
    excludedClaims: [
      'Does NOT predict specific tech stock valuations or OEM quarterly earnings',
      'Does NOT claim exact retail dollar markups on specific smartphone or vehicle models',
      'Does NOT model multi-year government CHIPS Act fab construction timelines (which take 3–5 years)',
    ],
    sourceIds: [
      'src_sia_bcg_semi_2024',
      'src_oecd_gvc',
      'src_oecd_icio_2023',
      'src_usgs_mcs_2024',
    ],
  },
  {
    id: 'preset_panama_canal',
    title: 'Panama Canal Hydrological Draft & Lock Restriction',
    subtitle:
      '40% reduction in daily Neo-Panamax and Panamax lock transits for 120 days, forcing Cape Horn and Cape of Good Hope rerouting.',
    shockOriginNodeIds: ['chk_panama'],
    affectedCorridorId: 'cor_panama_canal_americas',
    defaultParams: {
      shockSeverityPct: 0.4,
      durationDays: 120,
      inventoryBufferScale: 1.0,
      rerouteCapacityShare: 0.55,
      substitutionFlexibility: 0.4,
      shippingCostMultiplier: 1.8,
    },
    historicalPrecedent:
      'Directly modeled on the 2023–2024 Gatun Lake El Niño drought restrictions (which cut daily transits from ~36–38 down to 22–24 vessels) and UNCTAD maritime rerouting analyses.',
    narrativeHook:
      'Unlike a hard blockade, a Panama Canal drought allows high-value ships to bid for scarce slots or sail around Cape Horn/Cape of Good Hope. However, adding +14 to +18 days per voyage ties up global vessel ton-miles, delaying U.S. Gulf grain and LNG exports to Asia, restricting Andean copper shipments, and driving container freight cost pressure into bulky household appliances and food supply chains.',
    featuredConsumerNodeId: 'con_appliances',
    featuredCausalNodeIds: [
      'chk_panama',
      'com_containers',
      'ind_shipping',
      'con_appliances',
    ],
    supportedOutputs: [
      'Trade-off between physical flow preservation via Cape rerouting and +2 week voyage lag penalties',
      'Differential impact on bulky, freight-sensitive goods (Appliances, Grain) vs. air-shipped tech',
      'Exposure across U.S. Gulf grain/LNG exporters, Andean copper mining, and East Coast container retail',
    ],
    excludedClaims: [
      'Does NOT forecast long-term ENSO climate precipitation patterns in Panama',
      'Does NOT predict exact spot container freight rates ($/FEU) or Panama slot auction clearing bids',
      'Does NOT predict supermarket or big-box retail percentage price changes',
    ],
    sourceIds: [
      'src_acp_panama_2024',
      'src_unctad_rmt_2024',
      'src_fao_fertilizer_2024',
      'src_usgs_mcs_2024',
      'src_oecd_icio_2023',
    ],
  },
];
