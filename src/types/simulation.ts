/**
 * EconoLoom Simulation Types & Severity Guardrails
 *
 * Defines the structural output contracts for the deterministic propagation engine
 * (SIMULATION_METHODOLOGY.md) and network validation diagnostics.
 * Contains zero React or DOM imports.
 */

import type {
  DataClassification,
  EvidenceConfidence,
  NodeCategory,
  ScenarioParameters,
  ScenarioPreset,
} from './domain';

export type SeverityBand = 'Baseline' | 'Low' | 'Moderate' | 'Elevated' | 'Severe';

export interface NodeWeeklyState {
  nodeId: string;
  week: number;
  rawInputShortfall: number;       // [0, 1] pre-buffer input deficit d_v(t)
  remainingInventoryDays: number;  // Current inventory buffer remaining in days (7 * I_v(t))
  inventoryCoverageRatio: number;  // [0, 1] fraction of post-substitution deficit absorbed by buffer
  effectiveSubstitution: number;   // [0, 1] active supplier switching relief at week t
  unbufferedShortfall: number;     // [0, 1] net supply disruption passed downstream s_v(t)
  relativeExposureIndex: number;   // Total REI in [0, 100]
  directRei: number;               // Direct 1-hop exposure component E_dir in [0, 100]
  indirectRei: number;             // Indirect >=2-hop exposure component E_ind in [0, 100] (directRei + indirectRei == relativeExposureIndex)
  costPressureIndex: number;       // CPI in [0, 100]
  severityBand: SeverityBand;
  dominantUpstreamNodeId: string | null;
  dominantEdgeId: string | null;
}

export interface EdgeWeeklyState {
  edgeId: string;
  week: number;
  transmittedDisruption: number;   // [0, 1] active flow stress delta_e(t) on this edge at week t
  activeBypassShare: number;       // [0, 1] fraction currently rerouted via alternative corridor
  effectiveLagWeeks: number;
}

export interface CausalPathStep {
  nodeId: string;
  nodeName: string;
  edgeId?: string;
  mechanismSummary?: string;
  dependencyWeight?: number;
  inputCriticality?: number;
  reiAtWeek: number;
  targetRei: number;               // Target node REI at the requested simulation week (matches reiAtWeek)
  cpiAtWeek: number;
  severityBand: SeverityBand;
  lagWeeksFromOrigin: number;
  cumulativeLagWeeks: number;      // Cumulative integer transit lag in weeks from shock origin up to this hop
  sourceInventoryDays: number;     // Upstream source node remaining inventory days at the requested simulation week
  targetInventoryDays: number;     // Target node remaining inventory days at the requested simulation week
  edgeActiveBypassShare: number;   // [0, 1] active bypass share on the incoming edge at the requested simulation week (0 at origin step)
  classification: DataClassification;
  confidence: EvidenceConfidence;
}

export interface CausalPathway {
  targetNodeId: string;
  week: number;
  pathScore: number;
  totalLagWeeks: number;
  bottleneckNodeId: string;
  bottleneckEdgeId: string;
  bottleneckSummary: string;
  steps: CausalPathStep[];
  narrativeSummary: string;
}

export type PathwayReachabilityStatus =
  | 'origin_node'
  | 'reachable'
  | 'unreachable';

export interface PathwayAnalysisReport {
  targetNodeId: string;
  week: number;
  reachabilityStatus: PathwayReachabilityStatus;
  reachabilityReason: string;
  totalDiscoveredPaths: number;
  truncatedPathCount: number;
  searchLimitReached: boolean;
  pathways: CausalPathway[];
}

export interface SimulationSummaryMetrics {
  peakNetworkRei: number;
  peakWeek: number;
  severelyExposedCount: number;    // Nodes with REI >= 65 at selected or peak week
  elevatedOrWorseCount: number;    // Nodes with REI >= 40
  mostExposedIndustryId: string;
  mostExposedConsumerId: string;
  firstConsumerImpactWeek: number | null; // First week any consumer node reaches REI >= 5
}

export interface SimulationResult {
  presetId: string;
  computedAtIso: string;
  horizonWeeks: number; // Always 27 steps (Week 0 .. Week 26)
  nodeStatesByWeek: Record<number, Record<string, NodeWeeklyState>>;
  edgeStatesByWeek: Record<number, Record<string, EdgeWeeklyState>>;
  topPathwaysByTargetAndWeek: Record<number, Record<string, CausalPathway[]>>;
  summaryByWeek: Record<number, SimulationSummaryMetrics>;
  overallPeakSummary: SimulationSummaryMetrics;
}

export interface ScenarioComparisonInput {
  label: string;
  preset: ScenarioPreset;
  params: ScenarioParameters;
  simulationResult?: SimulationResult;
}

export interface ScenarioParameterDiff {
  key: keyof ScenarioParameters;
  label: string;
  unit: string;
  valueA: number;
  valueB: number;
  delta: number;
  formattedA: string;
  formattedB: string;
  formattedDelta: string;
  direction: 'increased' | 'decreased' | 'unchanged';
}

export interface NodeScenarioWeeklyPoint {
  week: number;
  reiA: number;
  reiB: number;
  reiDelta: number;
  cpiA: number;
  cpiB: number;
  cpiDelta: number;
  inventoryDaysA: number;
  inventoryDaysB: number;
  inventoryDaysDelta: number;
  severityBandA: SeverityBand;
  severityBandB: SeverityBand;
}

export interface NodeScenarioComparison {
  nodeId: string;
  nodeName: string;
  shortLabel: string;
  category: NodeCategory;
  tierIndex: number;
  regionCode: string;
  weeklySeries: NodeScenarioWeeklyPoint[];
  currentWeekReiA: number;
  currentWeekReiB: number;
  currentWeekReiDelta: number;
  currentWeekCpiA: number;
  currentWeekCpiB: number;
  currentWeekCpiDelta: number;
  currentWeekInventoryDaysA: number;
  currentWeekInventoryDaysB: number;
  currentWeekInventoryDaysDelta: number;
  peakReiA: number;
  peakReiB: number;
  peakReiDelta: number;
  peakWeekA: number;
  peakWeekB: number;
  cumulativeReiWeeksA: number;
  cumulativeReiWeeksB: number;
  cumulativeReiWeeksDelta: number;
  meanReiA: number;
  meanReiB: number;
  meanReiDelta: number;
  firstOnsetWeekA: number | null;
  firstOnsetWeekB: number | null;
  weeksAtElevatedOrSevereA: number;
  weeksAtElevatedOrSevereB: number;
  weeksAtElevatedOrSevereDelta: number;
  week26ResidualReiA: number;
  week26ResidualReiB: number;
  week26ResidualReiDelta: number;
  recoveryWeekA: number | null;
  recoveryWeekB: number | null;
  neverDisruptedA: boolean;
  neverDisruptedB: boolean;
}

export interface ScenarioNetworkSummaryComparison {
  peakNetworkReiA: number;
  peakNetworkReiB: number;
  peakNetworkReiDelta: number;
  peakWeekA: number;
  peakWeekB: number;
  currentWeekSeverelyExposedCountA: number;
  currentWeekSeverelyExposedCountB: number;
  currentWeekSeverelyExposedDelta: number;
  horizonSeverelyExposedCountA: number;
  horizonSeverelyExposedCountB: number;
  horizonSeverelyExposedDelta: number;
  meanNetworkReiA: number;
  meanNetworkReiB: number;
  meanNetworkReiDelta: number;
  firstConsumerImpactWeekA: number | null;
  firstConsumerImpactWeekB: number | null;
}

export interface ScenarioComparisonReport {
  labelA: string;
  labelB: string;
  presetA: ScenarioPreset;
  presetB: ScenarioPreset;
  paramsA: ScenarioParameters;
  paramsB: ScenarioParameters;
  currentWeek: number;
  isSamePreset: boolean;
  isIdenticalConfiguration: boolean;
  parameterDiffs: ScenarioParameterDiff[];
  networkSummary: ScenarioNetworkSummaryComparison;
  nodeComparisons: Record<string, NodeScenarioComparison>;
  orderedNodeComparisons: NodeScenarioComparison[];
}

export interface NetworkValidationIssue {
  code:
    | 'DUPLICATE_ID'
    | 'DANGLING_EDGE_NODE'
    | 'MISSING_SOURCE_ID'
    | 'INVALID_PARAMETER_BOUNDS'
    | 'CYCLE_DETECTED'
    | 'INVALID_CORRIDOR_REF'
    | 'INVALID_PRESET_REF'
    | 'EMPTY_PROVENANCE_SOURCES';
  severity: 'error' | 'warning';
  entityId: string;
  message: string;
}

export interface NetworkValidationReport {
  isValid: boolean;
  nodeCount: number;
  edgeCount: number;
  sourceCount: number;
  corridorCount: number;
  presetCount: number;
  categoryCounts: Record<string, number>;
  classificationCounts: Record<DataClassification, number>;
  issues: NetworkValidationIssue[];
}
