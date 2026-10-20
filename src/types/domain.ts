/**
 * EconoLoom Core Domain & Provenance Types
 *
 * Implements the 5-tier data classification taxonomy and 4-level evidence
 * confidence structure specified in DATA_STRATEGY.md. Every quantitative
 * attribute on a node or edge carries explicit provenance metadata.
 */

export type DataClassification =
  | 'observed'          // Directly reported in an empirical dataset or official release
  | 'derived'           // Computed mathematically from one or more observed datasets
  | 'model_parameter'   // Structural simulation parameter chosen from empirical literature ranges
  | 'user_input'        // Explicitly controlled by the user via interactive scenario levers
  | 'illustrative';     // Heuristic value used where granular public data is unavailable

export type EvidenceConfidence =
  | 'high'              // Direct official statistics (OECD ICIO, EIA, Canal Authority, UNCTAD)
  | 'medium'            // Derived from aggregate sector data or peer-reviewed policy briefs
  | 'low'               // Proxy estimate or broad industry average with wide variance
  | 'illustrative_only';// Pedagogical placeholder; directionally plausible but not empirically calibrated

export interface SourceRecord {
  id: string;
  title: string;
  organization: string;
  publicationDate: string;
  url: string;
  license: string;
  accessNotes?: string;
  usageScope: string;
}

export interface TraceableValue<T> {
  value: T;
  unit: string;
  classification: DataClassification;
  confidence: EvidenceConfidence;
  sourceIds: string[];
  derivationNote?: string;
  uncertaintyRange?: [number, number];
}

export type NodeCategory =
  | 'chokepoint'        // Physical maritime canal/strait or concentrated fabrication cluster
  | 'geography'         // Country or macro-regional trade hub
  | 'commodity'         // Primary energy, mineral, agricultural, or intermediate industrial material
  | 'industry'          // Processing, manufacturing, or logistics sector (ISIC Rev.4 aligned)
  | 'consumer_category';// Everyday household product or service basket

export interface ConsumerBomShare {
  upstreamNodeId: string;
  upstreamLabel: string;
  costSharePct: number; // Percentage of product cost structure (0 - 100)
  sourceIds: string[];
}

export interface NetworkNode {
  id: string;
  name: string;
  shortLabel: string;
  category: NodeCategory;
  tierIndex: 0 | 1 | 2 | 3; // 0: Chokepoint/Geography, 1: Commodity, 2: Industry, 3: Consumer Category
  regionCode: string;       // ISO-3166 alpha-3 or macro-region code ('WLD', 'EU27', 'GULF', 'SAM')
  coordinates?: [number, number]; // [longitude, latitude] for geographic projection
  isicCode?: string;        // OECD ICIO / ISIC Rev.4 sector alignment where applicable
  description: string;

  // Baseline structural parameters (all wrapped in TraceableValue for 100% provenance)
  baselineInventoryDays: TraceableValue<number>;
  substitutionPotential: TraceableValue<number>; // [0.0 - 1.0] max medium-term alternative sourcing
  pricePassThroughElasticity: TraceableValue<number>; // [0.0 - 1.0] cost pressure transmission factor
  baselineImportDependency: TraceableValue<number>;   // [0.0 - 1.0] reliance on cross-border inputs

  // Optional consumer bill-of-materials breakdown (for consumer_category nodes)
  consumerBomBreakdown?: ConsumerBomShare[];
  caveats: string[];
}

export type RelationshipType =
  | 'transits_through'
  | 'produces'
  | 'exports_to'
  | 'supplies_input_to'
  | 'feeds_consumer_basket';

export interface DependencyEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationshipType: RelationshipType;

  // Quantitative propagation weights
  dependencyWeight: TraceableValue<number>;   // [0.0 - 1.0] share of target's requirement supplied by source
  inputCriticality: TraceableValue<number>;   // [0.0 - 1.0] 1.0 = hard Leontief bottleneck; 0.2 = easily buffered
  transitLagWeeks: TraceableValue<number>;    // [0 - 8] weeks before upstream shock reaches target
  bypassAvailable: boolean;                   // True if physical rerouting (e.g., Cape of Good Hope) is possible
  maxBypassShare: TraceableValue<number>;     // [0.0 - 1.0] fraction of disrupted flow replaceable via rerouting
  bypassTransitPenaltyWeeks: number;          // Extra weeks added when rerouted
  corridorId?: string;
  mechanismSummary: string;                   // Plain-English explanation of why this link exists
}

export interface CorridorGeometry {
  id: string;
  name: string;
  chokepointNodeId: string;
  primaryWaypoints: [number, number][];       // [lon, lat] sequence for primary shipping/air lane
  bypassName?: string;
  bypassWaypoints?: [number, number][];       // [lon, lat] sequence for emergency rerouting
  baselineTransitDays: number;
  bypassTransitDays?: number;
  description: string;
}

export interface ModelAssumption {
  id: string;
  parameterKey: string;
  title: string;
  valueSummary: string;
  classification: DataClassification;
  confidence: EvidenceConfidence;
  rationale: string;
  limitation: string;
  validationCheck: string;
  sourceIds: string[];
}

export interface ScenarioParameters {
  shockSeverityPct: number;       // [0.0 - 1.0] e.g., 0.60 = 60% capacity loss
  durationDays: number;           // [7 - 180] disruption duration in days
  inventoryBufferScale: number;   // [0.5 - 2.0] multiplier on baseline inventory days
  rerouteCapacityShare: number;   // [0.0 - 1.0] fraction of theoretical bypass capacity utilized
  substitutionFlexibility: number;// [0.0 - 1.0] speed/availability of non-affected supplier switching
  shippingCostMultiplier: number; // [1.0 - 4.0] freight & war-risk insurance surcharge multiplier
}

export interface ScenarioPreset {
  id: string;
  title: string;
  subtitle: string;
  shockOriginNodeIds: string[];
  affectedCorridorId: string;
  defaultParams: ScenarioParameters;
  historicalPrecedent: string;
  narrativeHook: string;
  featuredConsumerNodeId: string;
  featuredCausalNodeIds: string[];
  supportedOutputs: string[];
  excludedClaims: string[];
  sourceIds: string[];
}
