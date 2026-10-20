/**
 * EconoLoom Pure Deterministic 26-Week Shock Propagation Engine
 *
 * Implements the discrete-time directed network propagation, route bypass,
 * supplier substitution, soft-rationed inventory buffer drawdown/replenishment,
 * Direct vs. Indirect Relative Exposure Index (REI), and Cost-Pressure Index (CPI)
 * equations specified in SIMULATION_METHODOLOGY.md.
 *
 * Strictly pure TypeScript: zero React/DOM imports, zero Math.random() calls,
 * and zero side effects.
 */

import { ECONOLOOM_DATASET } from '../data';
import type {
  DependencyEdge,
  NetworkNode,
  ScenarioParameters,
  ScenarioPreset,
} from '../types/domain';
import type {
  CausalPathway,
  EdgeWeeklyState,
  NodeWeeklyState,
  SimulationResult,
  SimulationSummaryMetrics,
} from '../types/simulation';
import { normalizeScenarioParameters } from './normalizeInputs';
import {
  buildNetworkLookupMaps,
  buildOriginSelfPathway,
  discoverAllDirectedPathsFromOrigins,
  scoreAndRankPathways,
} from './pathwayTracer';
import { getSeverityBand, type NetworkDatasetInput } from './validateNetwork';

export const SIMULATION_HORIZON_WEEKS = 26; // Weeks 0 .. 26 inclusive (27 steps)
const ATTENUATION_GAMMA = 0.92;
const ORIGIN_RECOVERY_HALF_LIFE_WEEKS = 2.0;
const INVENTORY_REPLENISHMENT_WEEKS_PER_WEEK = 2.0 / 7.0; // 2.0 days of stock recovered per week
const CUSHION_CONSTANT_WEEKS = 1.0; // 1.0 week (7 days) soft-rationing constant

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

function round1(val: number): number {
  return Math.round(val * 10) / 10;
}

function round4(val: number): number {
  return Math.round(val * 10000) / 10000;
}

/**
 * Computes a deterministic topological ordering of nodes using Kahn's algorithm.
 * If the supplied graph contains a synthetic cycle, remaining nodes are appended
 * in deterministic ID order so evaluation never hangs or throws.
 */
function computeEvaluationOrder(
  nodes: NetworkNode[],
  edges: DependencyEdge[],
): {
  orderedNodes: NetworkNode[];
  backEdgeIds: Set<string>;
} {
  const nodeMap = new Map<string, NetworkNode>();
  const inDegree = new Map<string, number>();
  const outgoing = new Map<string, DependencyEdge[]>();

  for (const node of nodes) {
    nodeMap.set(node.id, node);
    inDegree.set(node.id, 0);
    outgoing.set(node.id, []);
  }

  for (const edge of edges) {
    if (nodeMap.has(edge.sourceNodeId) && nodeMap.has(edge.targetNodeId)) {
      outgoing.get(edge.sourceNodeId)!.push(edge);
      inDegree.set(
        edge.targetNodeId,
        (inDegree.get(edge.targetNodeId) ?? 0) + 1,
      );
    }
  }

  const queue: string[] = [];
  for (const [nodeId, deg] of inDegree.entries()) {
    if (deg === 0) {
      queue.push(nodeId);
    }
  }

  const orderedNodes: NetworkNode[] = [];
  const visitedIds = new Set<string>();

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const node = nodeMap.get(currentId);
    if (!node || visitedIds.has(currentId)) continue;
    visitedIds.add(currentId);
    orderedNodes.push(node);

    for (const edge of outgoing.get(currentId) ?? []) {
      const nextId = edge.targetNodeId;
      const nextDeg = (inDegree.get(nextId) ?? 1) - 1;
      inDegree.set(nextId, nextDeg);
      if (nextDeg === 0 && !visitedIds.has(nextId)) {
        queue.push(nextId);
      }
    }
  }

  // Fallback for synthetic cyclic graphs in unit tests
  if (orderedNodes.length < nodes.length) {
    for (const node of nodes) {
      if (!visitedIds.has(node.id)) {
        visitedIds.add(node.id);
        orderedNodes.push(node);
      }
    }
  }

  const rankByNodeId = new Map<string, number>();
  orderedNodes.forEach((node, idx) => rankByNodeId.set(node.id, idx));

  const backEdgeIds = new Set<string>();
  for (const edge of edges) {
    const srcRank = rankByNodeId.get(edge.sourceNodeId) ?? 0;
    const tgtRank = rankByNodeId.get(edge.targetNodeId) ?? 0;
    if (srcRank >= tgtRank) {
      backEdgeIds.add(edge.id);
    }
  }

  return { orderedNodes, backEdgeIds };
}

export interface SimulateScenarioOptions {
  dataset?: NetworkDatasetInput;
  computedAtIso?: string;
}

/**
 * Runs the deterministic 26-week economic shock propagation simulation.
 */
export function simulateScenario(
  preset: ScenarioPreset,
  rawParams?: Partial<ScenarioParameters> | null,
  options?: SimulateScenarioOptions,
): SimulationResult {
  const dataset = options?.dataset ?? ECONOLOOM_DATASET;
  const computedAtIso = options?.computedAtIso ?? 'deterministic-v1';

  const params: ScenarioParameters = normalizeScenarioParameters(
    rawParams ?? preset.defaultParams,
    preset.defaultParams,
  );

  const {
    shockSeverityPct: S,
    durationDays: D,
    inventoryBufferScale: muInv,
    rerouteCapacityShare: rhoBypass,
    substitutionFlexibility: rhoSub,
    shippingCostMultiplier: mShip,
  } = params;

  const nodes = dataset.nodes;
  const edges = dataset.edges;

  const nodeMap = new Map<string, NetworkNode>();
  const incomingEdgesByNodeId = new Map<string, DependencyEdge[]>();
  const outgoingEdgesByNodeId = new Map<string, DependencyEdge[]>();

  for (const node of nodes) {
    nodeMap.set(node.id, node);
    incomingEdgesByNodeId.set(node.id, []);
    outgoingEdgesByNodeId.set(node.id, []);
  }

  for (const edge of edges) {
    if (nodeMap.has(edge.sourceNodeId) && nodeMap.has(edge.targetNodeId)) {
      incomingEdgesByNodeId.get(edge.targetNodeId)!.push(edge);
      outgoingEdgesByNodeId.get(edge.sourceNodeId)!.push(edge);
    }
  }

  const { orderedNodes, backEdgeIds } = computeEvaluationOrder(nodes, edges);

  // Precompute normalized incoming weights \tilde{w}_e and max criticality \bar{c}_v
  const normalizedWeightByEdgeId = new Map<string, number>();
  const maxCriticalityByNodeId = new Map<string, number>();
  const maxInventoryWeeksByNodeId = new Map<string, number>();

  for (const node of nodes) {
    const incoming = incomingEdgesByNodeId.get(node.id) ?? [];
    let weightSum = 0;
    let maxCrit = 0;
    for (const edge of incoming) {
      const w = clamp(edge.dependencyWeight.value, 0.01, 1.0);
      const c = clamp(edge.inputCriticality.value, 0.0, 1.0);
      weightSum += w;
      if (c > maxCrit) maxCrit = c;
    }
    const normDenom = Math.max(1.0, weightSum);
    for (const edge of incoming) {
      const w = clamp(edge.dependencyWeight.value, 0.01, 1.0);
      normalizedWeightByEdgeId.set(edge.id, w / normDenom);
    }
    maxCriticalityByNodeId.set(node.id, maxCrit);

    const baseDays = Math.max(0, node.baselineInventoryDays.value);
    const scaledDays = muInv * baseDays;
    maxInventoryWeeksByNodeId.set(node.id, scaledDays / 7.0);
  }

  const originSet = new Set(
    preset.shockOriginNodeIds.filter((id) => nodeMap.has(id)),
  );

  // State history across weeks 0 .. 26
  const nodeStatesByWeek: Record<number, Record<string, NodeWeeklyState>> = {};
  const edgeStatesByWeek: Record<number, Record<string, EdgeWeeklyState>> = {};
  const summaryByWeek: Record<number, SimulationSummaryMetrics> = {};

  // Track exact floating-point inventory in weeks I_v(t) and unbuffered shortfall s_v(t)
  const inventoryWeeksByWeekAndNode: Record<number, Record<string, number>> = {};
  const shortfallByWeekAndNode: Record<number, Record<string, number>> = {};

  const tEndWeeks = D / 7.0;
  const freightFactor = 0.4 + 0.6 * ((mShip - 1.0) / 3.0);

  for (let week = 0; week <= SIMULATION_HORIZON_WEEKS; week += 1) {
    const weekNodeStates: Record<string, NodeWeeklyState> = {};
    const weekEdgeStates: Record<string, EdgeWeeklyState> = {};
    const weekInventoryWeeks: Record<string, number> = {};
    const weekShortfall: Record<string, number> = {};

    nodeStatesByWeek[week] = weekNodeStates;
    edgeStatesByWeek[week] = weekEdgeStates;
    inventoryWeeksByWeekAndNode[week] = weekInventoryWeeks;
    shortfallByWeekAndNode[week] = weekShortfall;

    if (week === 0) {
      // Week 0: Pre-shock steady-state baseline
      for (const edge of edges) {
        const baseLag = Math.max(0, Math.round(edge.transitLagWeeks.value));
        weekEdgeStates[edge.id] = {
          edgeId: edge.id,
          week: 0,
          transmittedDisruption: 0,
          activeBypassShare: 0,
          effectiveLagWeeks: baseLag,
        };
      }

      for (const node of orderedNodes) {
        const bMaxWeeks = maxInventoryWeeksByNodeId.get(node.id) ?? 0;
        weekInventoryWeeks[node.id] = bMaxWeeks;
        weekShortfall[node.id] = 0;

        const baseCoverage =
          bMaxWeeks > 0
            ? round4(bMaxWeeks / (bMaxWeeks + CUSHION_CONSTANT_WEEKS))
            : 0;

        weekNodeStates[node.id] = {
          nodeId: node.id,
          week: 0,
          rawInputShortfall: 0,
          remainingInventoryDays: round1(bMaxWeeks * 7.0),
          inventoryCoverageRatio: baseCoverage,
          effectiveSubstitution: 0,
          unbufferedShortfall: 0,
          relativeExposureIndex: 0,
          directRei: 0,
          indirectRei: 0,
          costPressureIndex: 0,
          severityBand: 'Baseline',
          dominantUpstreamNodeId: null,
          dominantEdgeId: null,
        };
      }
      continue;
    }

    // Week t >= 1: Evaluate nodes and edges in topological order
    const alphaActive = clamp((D - 7 * (week - 1)) / 7.0, 0, 1);
    const recoveryDecay = Math.pow(
      2,
      -Math.max(0, week - tEndWeeks) / ORIGIN_RECOVERY_HALF_LIFE_WEEKS,
    );
    const originCurtailment =
      S <= 0
        ? 0
        : clamp(S * alphaActive + S * (1 - alphaActive) * recoveryDecay, 0, 1);

    const subRamp = Math.min(1.0, week / 4.0);

    for (const node of orderedNodes) {
      const incoming = incomingEdgesByNodeId.get(node.id) ?? [];
      const bMaxWeeks = maxInventoryWeeksByNodeId.get(node.id) ?? 0;
      const prevInvWeeks =
        inventoryWeeksByWeekAndNode[week - 1]?.[node.id] ?? bMaxWeeks;

      // Evaluate all incoming edges into this node first
      let weightedAvgShortfall = 0;
      let directWeightedShortfall = 0;
      let bottleneckShortfall = 0;
      let weightedFreightSignal = 0;

      let dominantEdgeId: string | null = null;
      let dominantUpstreamNodeId: string | null = null;
      let bestEdgeContribution = 0;

      const cBar = maxCriticalityByNodeId.get(node.id) ?? 0;

      for (const edge of incoming) {
        const rawLag = Math.max(0, Math.round(edge.transitLagWeeks.value));
        const effectiveBaseLag = backEdgeIds.has(edge.id)
          ? Math.max(1, rawLag)
          : rawLag;
        const departureWeek = week - effectiveBaseLag;

        const upstreamShortfall =
          departureWeek <= 0
            ? 0
            : departureWeek === week
              ? (weekShortfall[edge.sourceNodeId] ?? 0)
              : (shortfallByWeekAndNode[departureWeek]?.[edge.sourceNodeId] ?? 0);

        const bypassPenalty = Math.max(0, Math.round(edge.bypassTransitPenaltyWeeks));
        const canBypassNow =
          edge.bypassAvailable &&
          edge.maxBypassShare.value > 0 &&
          upstreamShortfall > 0 &&
          departureWeek > bypassPenalty;

        const activeBypassShare = canBypassNow
          ? clamp(edge.maxBypassShare.value * rhoBypass, 0, 0.9)
          : 0;

        const transmittedDisruption =
          (1 - activeBypassShare) * upstreamShortfall;
        const effectiveLagWeeks =
          effectiveBaseLag + (activeBypassShare > 0 ? bypassPenalty : 0);

        weekEdgeStates[edge.id] = {
          edgeId: edge.id,
          week,
          transmittedDisruption: round4(transmittedDisruption),
          activeBypassShare: round4(activeBypassShare),
          effectiveLagWeeks,
        };

        const wNorm = normalizedWeightByEdgeId.get(edge.id) ?? 0;
        const crit = clamp(edge.inputCriticality.value, 0, 1);

        weightedAvgShortfall += wNorm * transmittedDisruption;
        if (originSet.has(edge.sourceNodeId)) {
          directWeightedShortfall += wNorm * transmittedDisruption;
        }

        const critShortfall = crit * transmittedDisruption;
        if (critShortfall > bottleneckShortfall) {
          bottleneckShortfall = critShortfall;
        }

        const edgeContribution =
          ((1 - 0.5 * cBar) * wNorm + 0.5 * cBar * crit) *
          transmittedDisruption;
        if (edgeContribution > bestEdgeContribution) {
          bestEdgeContribution = edgeContribution;
          dominantEdgeId = edge.id;
          dominantUpstreamNodeId = edge.sourceNodeId;
        }

        if (upstreamShortfall > 0) {
          const edgeFreight =
            upstreamShortfall *
            (0.35 + 0.65 * activeBypassShare) *
            freightFactor;
          weightedFreightSignal += wNorm * edgeFreight;
        }
      }

      // Determine whether this node is an active shock origin
      if (originSet.has(node.id)) {
        const dOrigin = originCurtailment;
        const coverageRatio =
          bMaxWeeks > 0
            ? prevInvWeeks / (prevInvWeeks + CUSHION_CONSTANT_WEEKS)
            : 0;
        const drawWeeks = coverageRatio * dOrigin;
        const repWeeks =
          (1 - alphaActive) *
          INVENTORY_REPLENISHMENT_WEEKS_PER_WEEK *
          Math.max(0, 1 - dOrigin / 0.04);
        const nextInvWeeks = clamp(
          prevInvWeeks - drawWeeks + repWeeks,
          0,
          bMaxWeeks,
        );

        weekInventoryWeeks[node.id] = nextInvWeeks;
        weekShortfall[node.id] = dOrigin;

        const rei = round1(100 * dOrigin);
        const elasticity = clamp(node.pricePassThroughElasticity.value, 0, 1);
        const rawOriginCpi =
          dOrigin * (0.75 + 0.25 * elasticity * ((mShip - 1.0) / 3.0));
        const cpi = round1(100 * clamp(rawOriginCpi, 0, 1));

        weekNodeStates[node.id] = {
          nodeId: node.id,
          week,
          rawInputShortfall: round4(dOrigin),
          remainingInventoryDays: round1(nextInvWeeks * 7.0),
          inventoryCoverageRatio: round4(coverageRatio),
          effectiveSubstitution: 0,
          unbufferedShortfall: round4(dOrigin),
          relativeExposureIndex: rei,
          directRei: rei,
          indirectRei: 0,
          costPressureIndex: cpi,
          severityBand: getSeverityBand(rei),
          dominantUpstreamNodeId,
          dominantEdgeId,
        };
        continue;
      }

      // Downstream / non-origin node calculation
      const rawDeficit =
        ATTENUATION_GAMMA *
        clamp(
          (1 - 0.5 * cBar) * weightedAvgShortfall +
            0.5 * cBar * bottleneckShortfall,
          0,
          1,
        );

      const maxSubPotential = clamp(node.substitutionPotential.value, 0, 1);
      const effectiveSub =
        rawDeficit > 0
          ? clamp(maxSubPotential * rhoSub * subRamp, 0, 0.65)
          : 0;

      const netDeficit = (1 - effectiveSub) * rawDeficit;

      const coverageRatio =
        bMaxWeeks > 0
          ? prevInvWeeks / (prevInvWeeks + CUSHION_CONSTANT_WEEKS)
          : 0;

      const drawWeeks = coverageRatio * netDeficit;
      const unbufferedShortfall = clamp(netDeficit - drawWeeks, 0, 1);
      const repWeeks =
        (1 - alphaActive) *
        INVENTORY_REPLENISHMENT_WEEKS_PER_WEEK *
        Math.max(0, 1 - netDeficit / 0.04);
      const nextInvWeeks = clamp(
        prevInvWeeks - drawWeeks + repWeeks,
        0,
        bMaxWeeks,
      );

      weekInventoryWeeks[node.id] = nextInvWeeks;
      weekShortfall[node.id] = unbufferedShortfall;

      const rei = round1(100 * unbufferedShortfall);
      let directRei = 0;
      let indirectRei = 0;
      if (rei > 0 && weightedAvgShortfall > 0) {
        const directShare = clamp(
          directWeightedShortfall / weightedAvgShortfall,
          0,
          1,
        );
        directRei = round1(directShare * rei);
        indirectRei = round1(Math.max(0, rei - directRei));
      }

      const bufferDepletionFactor =
        bMaxWeeks > 0 && rawDeficit > 0
          ? (1 - nextInvWeeks / bMaxWeeks) * Math.min(1.0, 5.0 * rawDeficit)
          : 0;

      const importDep = clamp(node.baselineImportDependency.value, 0, 1);
      const freightSignal = (0.5 + 0.5 * importDep) * weightedFreightSignal;
      const elasticity = clamp(node.pricePassThroughElasticity.value, 0, 1);

      const rawCpi =
        (0.5 + 0.5 * elasticity) *
        (0.65 * unbufferedShortfall +
          0.2 * bufferDepletionFactor +
          0.35 * freightSignal);
      const cpi = round1(100 * clamp(rawCpi, 0, 1));

      weekNodeStates[node.id] = {
        nodeId: node.id,
        week,
        rawInputShortfall: round4(rawDeficit),
        remainingInventoryDays: round1(nextInvWeeks * 7.0),
        inventoryCoverageRatio: round4(coverageRatio),
        effectiveSubstitution: round4(effectiveSub),
        unbufferedShortfall: round4(unbufferedShortfall),
        relativeExposureIndex: rei,
        directRei,
        indirectRei,
        costPressureIndex: cpi,
        severityBand: getSeverityBand(rei),
        dominantUpstreamNodeId,
        dominantEdgeId,
      };
    }
  }

  // Compute weekly and overall peak summary metrics
  let overallPeakRei = 0;
  let overallPeakWeek = 0;
  let firstConsumerImpactWeek: number | null = null;

  const industryNodes = nodes.filter((n) => n.category === 'industry');
  const consumerNodes = nodes.filter((n) => n.category === 'consumer_category');

  const defaultIndustryId = industryNodes[0]?.id ?? 'ind_refining';
  const defaultConsumerId = consumerNodes[0]?.id ?? 'con_groceries';

  for (let week = 0; week <= SIMULATION_HORIZON_WEEKS; week += 1) {
    const states = nodeStatesByWeek[week]!;
    let weekPeakRei = 0;
    let severelyExposedCount = 0;
    let elevatedOrWorseCount = 0;

    let bestIndustryId = defaultIndustryId;
    let bestIndustryRei = -1;

    let bestConsumerId = defaultConsumerId;
    let bestConsumerScore = -1;

    for (const node of nodes) {
      const st = states[node.id];
      if (!st) continue;

      if (st.relativeExposureIndex > weekPeakRei) {
        weekPeakRei = st.relativeExposureIndex;
      }
      if (st.relativeExposureIndex >= 65) {
        severelyExposedCount += 1;
      }
      if (st.relativeExposureIndex >= 40) {
        elevatedOrWorseCount += 1;
      }

      if (node.category === 'industry' && st.relativeExposureIndex > bestIndustryRei) {
        bestIndustryRei = st.relativeExposureIndex;
        bestIndustryId = node.id;
      }

      if (node.category === 'consumer_category') {
        const consumerCombined =
          st.relativeExposureIndex + 0.5 * st.costPressureIndex;
        if (consumerCombined > bestConsumerScore) {
          bestConsumerScore = consumerCombined;
          bestConsumerId = node.id;
        }
        if (
          firstConsumerImpactWeek === null &&
          (st.relativeExposureIndex >= 5 || st.costPressureIndex >= 5)
        ) {
          firstConsumerImpactWeek = week;
        }
      }
    }

    if (weekPeakRei > overallPeakRei) {
      overallPeakRei = weekPeakRei;
      overallPeakWeek = week;
    }

    summaryByWeek[week] = {
      peakNetworkRei: weekPeakRei,
      peakWeek: week,
      severelyExposedCount,
      elevatedOrWorseCount,
      mostExposedIndustryId: bestIndustryId,
      mostExposedConsumerId: bestConsumerId,
      firstConsumerImpactWeek,
    };
  }

  // Compute overall peak summary across all 27 weeks
  let maxSeverelyExposed = 0;
  let maxElevatedOrWorse = 0;
  let peakIndustryId = defaultIndustryId;
  let peakIndustryRei = -1;
  let peakConsumerId = defaultConsumerId;
  let peakConsumerScore = -1;

  for (let week = 0; week <= SIMULATION_HORIZON_WEEKS; week += 1) {
    const summary = summaryByWeek[week]!;
    const states = nodeStatesByWeek[week]!;
    if (summary.severelyExposedCount > maxSeverelyExposed) {
      maxSeverelyExposed = summary.severelyExposedCount;
    }
    if (summary.elevatedOrWorseCount > maxElevatedOrWorse) {
      maxElevatedOrWorse = summary.elevatedOrWorseCount;
    }
    for (const ind of industryNodes) {
      const r = states[ind.id]?.relativeExposureIndex ?? 0;
      if (r > peakIndustryRei) {
        peakIndustryRei = r;
        peakIndustryId = ind.id;
      }
    }
    for (const con of consumerNodes) {
      const st = states[con.id];
      const score = (st?.relativeExposureIndex ?? 0) + 0.5 * (st?.costPressureIndex ?? 0);
      if (score > peakConsumerScore) {
        peakConsumerScore = score;
        peakConsumerId = con.id;
      }
    }
  }

  const overallPeakSummary: SimulationSummaryMetrics = {
    peakNetworkRei: overallPeakRei,
    peakWeek: overallPeakWeek,
    severelyExposedCount: maxSeverelyExposed,
    elevatedOrWorseCount: maxElevatedOrWorse,
    mostExposedIndustryId: peakIndustryId,
    mostExposedConsumerId: peakConsumerId,
    firstConsumerImpactWeek,
  };

  // Pre-discover all simple directed paths (<= 8 edges) from shockOriginNodeIds once, then score per week
  const topPathwaysByTargetAndWeek: Record<
    number,
    Record<string, CausalPathway[]>
  > = {};

  const lookupMaps = buildNetworkLookupMaps(dataset);
  const validOrigins = Array.from(originSet);
  const rawPathsByTargetId = discoverAllDirectedPathsFromOrigins(
    validOrigins,
    lookupMaps.nodeMap,
    lookupMaps.outgoingEdgesByNodeId,
  );

  for (let week = 0; week <= SIMULATION_HORIZON_WEEKS; week += 1) {
    const weekPathways: Record<string, CausalPathway[]> = {};
    topPathwaysByTargetAndWeek[week] = weekPathways;
    const nodeStatesAtWeek = nodeStatesByWeek[week]!;
    const edgeStatesAtWeek = edgeStatesByWeek[week]!;

    for (const node of nodes) {
      if (originSet.has(node.id)) {
        weekPathways[node.id] = [
          buildOriginSelfPathway(node, week, nodeStatesAtWeek, S),
        ];
        continue;
      }

      const rawPaths = rawPathsByTargetId.get(node.id);
      if (!rawPaths || rawPaths.length === 0) {
        weekPathways[node.id] = [];
        continue;
      }

      weekPathways[node.id] = scoreAndRankPathways(
        rawPaths,
        node,
        week,
        lookupMaps.nodeMap,
        lookupMaps.normalizedWeightByEdgeId,
        nodeStatesAtWeek,
        edgeStatesAtWeek,
        S,
        3,
      );
    }
  }

  return {
    presetId: preset.id,
    computedAtIso,
    horizonWeeks: SIMULATION_HORIZON_WEEKS + 1,
    nodeStatesByWeek,
    edgeStatesByWeek,
    topPathwaysByTargetAndWeek,
    summaryByWeek,
    overallPeakSummary,
  };
}
