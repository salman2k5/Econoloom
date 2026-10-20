/**
 * EconoLoom Pure Deterministic Scenario Comparison Engine
 *
 * Compares Scenario A (Baseline / Reference) against Scenario B (Comparison / Counterfactual)
 * across the 26-week horizon (Weeks 0..26) without mutating shared application state.
 *
 * Strictly pure TypeScript: zero React/DOM imports, zero Math.random() calls,
 * and zero side effects.
 */

import { ECONOLOOM_DATASET } from '../data';
import type { ScenarioParameters } from '../types/domain';
import type {
  NodeScenarioComparison,
  NodeScenarioWeeklyPoint,
  ScenarioComparisonInput,
  ScenarioComparisonReport,
  ScenarioNetworkSummaryComparison,
  ScenarioParameterDiff,
  SimulationResult,
} from '../types/simulation';
import {
  normalizeScenarioParameters,
  normalizeWeekIndex,
} from './normalizeInputs';
import {
  SIMULATION_HORIZON_WEEKS,
  simulateScenario,
} from './simulateScenario';
import type { NetworkDatasetInput } from './validateNetwork';

const EPSILON = 1e-6;

function round1(val: number): number {
  return Math.round(val * 10) / 10;
}

function round2(val: number): number {
  return Math.round(val * 100) / 100;
}

function formatSignedNumber(val: number, decimals = 1, suffix = ''): string {
  if (Math.abs(val) < EPSILON) {
    return `0.${'0'.repeat(decimals)}${suffix}`;
  }
  const sign = val > 0 ? '+' : '';
  return `${sign}${val.toFixed(decimals)}${suffix}`;
}

interface ParameterSpec {
  key: keyof ScenarioParameters;
  label: string;
  unit: string;
  formatValue: (v: number) => string;
  formatDelta: (d: number) => string;
}

const PARAMETER_SPECS: ParameterSpec[] = [
  {
    key: 'shockSeverityPct',
    label: 'Shock Severity',
    unit: '% capacity loss',
    formatValue: (v) => `${Math.round(v * 100)}%`,
    formatDelta: (d) => {
      const pts = Math.round(d * 100);
      if (pts === 0) return '0% pts';
      return `${pts > 0 ? '+' : ''}${pts}% pts`;
    },
  },
  {
    key: 'durationDays',
    label: 'Disruption Duration',
    unit: 'days',
    formatValue: (v) => `${Math.round(v)}d`,
    formatDelta: (d) => {
      const days = Math.round(d);
      if (days === 0) return '0d';
      return `${days > 0 ? '+' : ''}${days}d`;
    },
  },
  {
    key: 'inventoryBufferScale',
    label: 'Inventory Buffer Scale',
    unit: '× baseline stock',
    formatValue: (v) => `${v.toFixed(2)}×`,
    formatDelta: (d) => formatSignedNumber(d, 2, '×'),
  },
  {
    key: 'rerouteCapacityShare',
    label: 'Rerouting Capacity Share',
    unit: '% bypass utilized',
    formatValue: (v) => `${Math.round(v * 100)}%`,
    formatDelta: (d) => {
      const pts = Math.round(d * 100);
      if (pts === 0) return '0% pts';
      return `${pts > 0 ? '+' : ''}${pts}% pts`;
    },
  },
  {
    key: 'substitutionFlexibility',
    label: 'Substitution Flexibility',
    unit: '% switching speed',
    formatValue: (v) => `${Math.round(v * 100)}%`,
    formatDelta: (d) => {
      const pts = Math.round(d * 100);
      if (pts === 0) return '0% pts';
      return `${pts > 0 ? '+' : ''}${pts}% pts`;
    },
  },
  {
    key: 'shippingCostMultiplier',
    label: 'Shipping & Insurance Surcharge',
    unit: '× freight rate',
    formatValue: (v) => `${v.toFixed(2)}×`,
    formatDelta: (d) => formatSignedNumber(d, 2, '×'),
  },
];

/**
 * Computes parameter differences between Scenario A and Scenario B (\Delta = B - A).
 */
export function buildParameterDiffs(
  paramsA: ScenarioParameters,
  paramsB: ScenarioParameters,
): ScenarioParameterDiff[] {
  return PARAMETER_SPECS.map((spec) => {
    const valueA = paramsA[spec.key];
    const valueB = paramsB[spec.key];
    const rawDelta = round2(valueB - valueA);
    const direction: ScenarioParameterDiff['direction'] =
      Math.abs(rawDelta) < EPSILON
        ? 'unchanged'
        : rawDelta > 0
          ? 'increased'
          : 'decreased';

    return {
      key: spec.key,
      label: spec.label,
      unit: spec.unit,
      valueA,
      valueB,
      delta: Math.abs(rawDelta) < EPSILON ? 0 : rawDelta,
      formattedA: spec.formatValue(valueA),
      formattedB: spec.formatValue(valueB),
      formattedDelta: spec.formatDelta(rawDelta),
      direction,
    };
  });
}

interface NodeTrajectoryStats {
  peakRei: number;
  peakWeek: number;
  cumulativeReiWeeks: number;
  meanRei: number;
  firstOnsetWeek: number | null;
  weeksAtElevatedOrSevere: number;
  week26ResidualRei: number;
  recoveryWeek: number | null;
  neverDisrupted: boolean;
}

/**
 * Computes summary trajectory metrics for a single node across Weeks 0..26.
 *
 * Recovery Week definition (SIMULATION_METHODOLOGY.md & MILESTONE_5_HANDOFF.md):
 * - First week t > max(peakWeek, W_dur) where REI_v(t) < 5.0 (Baseline band),
 *   provided the node experienced onset (REI_v(t) >= 5.0 at some week).
 * - If the node never reached REI_v(t) >= 5.0, neverDisrupted is true and recoveryWeek is null.
 * - If the node reached REI_v(t) >= 5.0 and remains >= 5.0 through Week 26, recoveryWeek is null.
 */
function computeNodeTrajectoryStats(
  nodeId: string,
  result: SimulationResult,
  durationDays: number,
): NodeTrajectoryStats {
  const durationWeeks = Math.ceil(durationDays / 7);
  let peakRei = 0;
  let peakWeek = 0;
  let sumRei = 0;
  let firstOnsetWeek: number | null = null;
  let weeksAtElevatedOrSevere = 0;

  for (let w = 0; w <= SIMULATION_HORIZON_WEEKS; w++) {
    const rei = result.nodeStatesByWeek[w]?.[nodeId]?.relativeExposureIndex ?? 0;
    sumRei += rei;
    if (rei > peakRei) {
      peakRei = rei;
      peakWeek = w;
    }
    if (w >= 1 && firstOnsetWeek === null && rei >= 5.0) {
      firstOnsetWeek = w;
    }
    if (rei >= 40.0) {
      weeksAtElevatedOrSevere += 1;
    }
  }

  const neverDisrupted = firstOnsetWeek === null && peakRei < 5.0;
  const week26ResidualRei = round1(
    result.nodeStatesByWeek[SIMULATION_HORIZON_WEEKS]?.[nodeId]
      ?.relativeExposureIndex ?? 0,
  );

  let recoveryWeek: number | null = null;
  if (!neverDisrupted) {
    const searchStartWeek = Math.max(peakWeek + 1, durationWeeks + 1);
    for (let w = searchStartWeek; w <= SIMULATION_HORIZON_WEEKS; w++) {
      const rei = result.nodeStatesByWeek[w]?.[nodeId]?.relativeExposureIndex ?? 0;
      if (rei < 5.0) {
        // Verify it stays below 5.0 for the remainder of the horizon
        let staysRecovered = true;
        for (let k = w + 1; k <= SIMULATION_HORIZON_WEEKS; k++) {
          const laterRei =
            result.nodeStatesByWeek[k]?.[nodeId]?.relativeExposureIndex ?? 0;
          if (laterRei >= 5.0) {
            staysRecovered = false;
            break;
          }
        }
        if (staysRecovered) {
          recoveryWeek = w;
          break;
        }
      }
    }
  }

  const totalSteps = SIMULATION_HORIZON_WEEKS + 1; // 27 weeks (0..26)
  return {
    peakRei: round1(peakRei),
    peakWeek,
    cumulativeReiWeeks: round1(sumRei),
    meanRei: round1(sumRei / totalSteps),
    firstOnsetWeek,
    weeksAtElevatedOrSevere,
    week26ResidualRei,
    recoveryWeek,
    neverDisrupted,
  };
}

/**
 * Compares Scenario A (Baseline / Reference) and Scenario B (Counterfactual / Comparison)
 * across all 48 nodes and 27 simulation weeks (Weeks 0..26).
 */
export function compareScenarios(
  scenarioA: ScenarioComparisonInput,
  scenarioB: ScenarioComparisonInput,
  currentWeek = 0,
  dataset: NetworkDatasetInput = ECONOLOOM_DATASET,
): ScenarioComparisonReport {
  const safeWeek = normalizeWeekIndex(currentWeek, 0);
  const paramsA = normalizeScenarioParameters(
    scenarioA.params,
    scenarioA.preset.defaultParams,
  );
  const paramsB = normalizeScenarioParameters(
    scenarioB.params,
    scenarioB.preset.defaultParams,
  );

  const resultA =
    scenarioA.simulationResult ??
    simulateScenario(scenarioA.preset, paramsA, { dataset });
  const resultB =
    scenarioB.simulationResult ??
    simulateScenario(scenarioB.preset, paramsB, { dataset });

  const parameterDiffs = buildParameterDiffs(paramsA, paramsB);
  const isSamePreset = scenarioA.preset.id === scenarioB.preset.id;
  const isIdenticalConfiguration =
    isSamePreset && parameterDiffs.every((d) => d.direction === 'unchanged');

  const nodeComparisons: Record<string, NodeScenarioComparison> = {};
  const orderedNodeComparisons: NodeScenarioComparison[] = [];

  let totalMeanReiSumA = 0;
  let totalMeanReiSumB = 0;

  for (const node of dataset.nodes) {
    const weeklySeries: NodeScenarioWeeklyPoint[] = [];

    for (let w = 0; w <= SIMULATION_HORIZON_WEEKS; w++) {
      const stateA = resultA.nodeStatesByWeek[w]?.[node.id];
      const stateB = resultB.nodeStatesByWeek[w]?.[node.id];

      const reiA = stateA?.relativeExposureIndex ?? 0;
      const reiB = stateB?.relativeExposureIndex ?? 0;
      const cpiA = stateA?.costPressureIndex ?? 0;
      const cpiB = stateB?.costPressureIndex ?? 0;
      const invA =
        stateA?.remainingInventoryDays ?? node.baselineInventoryDays.value;
      const invB =
        stateB?.remainingInventoryDays ?? node.baselineInventoryDays.value;

      weeklySeries.push({
        week: w,
        reiA: round1(reiA),
        reiB: round1(reiB),
        reiDelta: round1(reiB - reiA),
        cpiA: round1(cpiA),
        cpiB: round1(cpiB),
        cpiDelta: round1(cpiB - cpiA),
        inventoryDaysA: round1(invA),
        inventoryDaysB: round1(invB),
        inventoryDaysDelta: round1(invB - invA),
        severityBandA: stateA?.severityBand ?? 'Baseline',
        severityBandB: stateB?.severityBand ?? 'Baseline',
      });
    }

    const currentPoint = weeklySeries[safeWeek] ?? weeklySeries[0]!;
    const statsA = computeNodeTrajectoryStats(
      node.id,
      resultA,
      paramsA.durationDays,
    );
    const statsB = computeNodeTrajectoryStats(
      node.id,
      resultB,
      paramsB.durationDays,
    );

    totalMeanReiSumA += statsA.meanRei;
    totalMeanReiSumB += statsB.meanRei;

    const comparison: NodeScenarioComparison = {
      nodeId: node.id,
      nodeName: node.name,
      shortLabel: node.shortLabel,
      category: node.category,
      tierIndex: node.tierIndex,
      regionCode: node.regionCode,
      weeklySeries,
      currentWeekReiA: currentPoint.reiA,
      currentWeekReiB: currentPoint.reiB,
      currentWeekReiDelta: currentPoint.reiDelta,
      currentWeekCpiA: currentPoint.cpiA,
      currentWeekCpiB: currentPoint.cpiB,
      currentWeekCpiDelta: currentPoint.cpiDelta,
      currentWeekInventoryDaysA: currentPoint.inventoryDaysA,
      currentWeekInventoryDaysB: currentPoint.inventoryDaysB,
      currentWeekInventoryDaysDelta: currentPoint.inventoryDaysDelta,
      peakReiA: statsA.peakRei,
      peakReiB: statsB.peakRei,
      peakReiDelta: round1(statsB.peakRei - statsA.peakRei),
      peakWeekA: statsA.peakWeek,
      peakWeekB: statsB.peakWeek,
      cumulativeReiWeeksA: statsA.cumulativeReiWeeks,
      cumulativeReiWeeksB: statsB.cumulativeReiWeeks,
      cumulativeReiWeeksDelta: round1(
        statsB.cumulativeReiWeeks - statsA.cumulativeReiWeeks,
      ),
      meanReiA: statsA.meanRei,
      meanReiB: statsB.meanRei,
      meanReiDelta: round1(statsB.meanRei - statsA.meanRei),
      firstOnsetWeekA: statsA.firstOnsetWeek,
      firstOnsetWeekB: statsB.firstOnsetWeek,
      weeksAtElevatedOrSevereA: statsA.weeksAtElevatedOrSevere,
      weeksAtElevatedOrSevereB: statsB.weeksAtElevatedOrSevere,
      weeksAtElevatedOrSevereDelta:
        statsB.weeksAtElevatedOrSevere - statsA.weeksAtElevatedOrSevere,
      week26ResidualReiA: statsA.week26ResidualRei,
      week26ResidualReiB: statsB.week26ResidualRei,
      week26ResidualReiDelta: round1(
        statsB.week26ResidualRei - statsA.week26ResidualRei,
      ),
      recoveryWeekA: statsA.recoveryWeek,
      recoveryWeekB: statsB.recoveryWeek,
      neverDisruptedA: statsA.neverDisrupted,
      neverDisruptedB: statsB.neverDisrupted,
    };

    nodeComparisons[node.id] = comparison;
    orderedNodeComparisons.push(comparison);
  }

  const nodeCount = Math.max(1, dataset.nodes.length);
  const meanNetworkReiA = round1(totalMeanReiSumA / nodeCount);
  const meanNetworkReiB = round1(totalMeanReiSumB / nodeCount);

  const summaryAtWeekA =
    resultA.summaryByWeek[safeWeek] ?? resultA.overallPeakSummary;
  const summaryAtWeekB =
    resultB.summaryByWeek[safeWeek] ?? resultB.overallPeakSummary;

  const networkSummary: ScenarioNetworkSummaryComparison = {
    peakNetworkReiA: resultA.overallPeakSummary.peakNetworkRei,
    peakNetworkReiB: resultB.overallPeakSummary.peakNetworkRei,
    peakNetworkReiDelta: round1(
      resultB.overallPeakSummary.peakNetworkRei -
        resultA.overallPeakSummary.peakNetworkRei,
    ),
    peakWeekA: resultA.overallPeakSummary.peakWeek,
    peakWeekB: resultB.overallPeakSummary.peakWeek,
    currentWeekSeverelyExposedCountA: summaryAtWeekA.severelyExposedCount,
    currentWeekSeverelyExposedCountB: summaryAtWeekB.severelyExposedCount,
    currentWeekSeverelyExposedDelta:
      summaryAtWeekB.severelyExposedCount - summaryAtWeekA.severelyExposedCount,
    horizonSeverelyExposedCountA:
      resultA.overallPeakSummary.severelyExposedCount,
    horizonSeverelyExposedCountB:
      resultB.overallPeakSummary.severelyExposedCount,
    horizonSeverelyExposedDelta:
      resultB.overallPeakSummary.severelyExposedCount -
      resultA.overallPeakSummary.severelyExposedCount,
    meanNetworkReiA,
    meanNetworkReiB,
    meanNetworkReiDelta: round1(meanNetworkReiB - meanNetworkReiA),
    firstConsumerImpactWeekA:
      resultA.overallPeakSummary.firstConsumerImpactWeek,
    firstConsumerImpactWeekB:
      resultB.overallPeakSummary.firstConsumerImpactWeek,
  };

  return {
    labelA: scenarioA.label,
    labelB: scenarioB.label,
    presetA: scenarioA.preset,
    presetB: scenarioB.preset,
    paramsA,
    paramsB,
    currentWeek: safeWeek,
    isSamePreset,
    isIdenticalConfiguration,
    parameterDiffs,
    networkSummary,
    nodeComparisons,
    orderedNodeComparisons,
  };
}
