/**
 * EconoLoom Deterministic Causal Pathway Tracer & Diagnostics Engine
 *
 * Pure TypeScript module (zero React/DOM imports, zero Math.random() calls, zero side effects)
 * that discovers, scores, ranks, and diagnoses directed supply-chain propagation paths
 * from active shock origin(s) to any downstream node in the validated network.
 */

import { ECONOLOOM_DATASET } from '../data';
import type {
  DependencyEdge,
  NetworkNode,
  ScenarioPreset,
} from '../types/domain';
import type {
  CausalPathStep,
  CausalPathway,
  EdgeWeeklyState,
  NodeWeeklyState,
  PathwayAnalysisReport,
  SimulationResult,
} from '../types/simulation';
import {
  DEFAULT_MAX_PATHS,
  normalizeMaxPaths,
  normalizeWeekIndex,
} from './normalizeInputs';
import { getSeverityBand, type NetworkDatasetInput } from './validateNetwork';

/** Maximum number of directed edges allowed in a traced simple causal pathway. */
export const MAX_PATH_HOPS = 8;

/**
 * Deterministic search-safety cap on candidate simple paths enumerated per target node.
 * Prevents unbounded combinatorial blowup on dense or cyclic synthetic graphs while
 * remaining well above the total path count of the 48-node, 78-edge canonical DAG.
 */
export const DEFAULT_MAX_SEARCH_PATHS = 250;
const MAX_ALLOWED_SEARCH_PATHS = 5000;

export interface StaticHopDescriptor {
  edge: DependencyEdge;
  sourceNode: NetworkNode;
  stepNode: NetworkNode;
  cumulativeLagWeeks: number;
  baseConductance: number;
  baseBottleneck: number;
}

export interface RawDirectedPath {
  originNodeId: string;
  edges: DependencyEdge[];
  totalLagWeeks?: number;
  sortKey?: string;
  chainLabels?: string;
  tieBreakRank?: number;
  originNode?: NetworkNode;
  hopDiscount?: number;
  invHopCount?: number;
  staticHops?: StaticHopDescriptor[];
}

export interface NetworkLookupMaps {
  nodeMap: Map<string, NetworkNode>;
  outgoingEdgesByNodeId: Map<string, DependencyEdge[]>;
  normalizedWeightByEdgeId: Map<string, number>;
}

export interface TracePathwaysInput {
  shockOriginNodeIds: string[];
  targetNodeId: string;
  week: number;
  nodeMap: Map<string, NetworkNode>;
  outgoingEdgesByNodeId: Map<string, DependencyEdge[]>;
  normalizedWeightByEdgeId: Map<string, number>;
  nodeStatesAtWeek: Record<string, NodeWeeklyState>;
  edgeStatesAtWeek: Record<string, EdgeWeeklyState>;
  shockSeverityPct: number;
  maxPaths?: number;
  maxSearchPaths?: number;
}

export interface AnalyzePathwaysOptions {
  /** Optional custom node/edge dataset for isolated unit testing. Defaults to ECONOLOOM_DATASET. */
  dataset?: Pick<NetworkDatasetInput, 'nodes' | 'edges'>;
  /** Optional explicit shock severity override in [0, 1]. If omitted, inferred from simulationResult / preset. */
  shockSeverityPct?: number;
  /** Optional search-safety cap override for testing search-limit truncation. Defaults to 250. */
  maxSearchPaths?: number;
}

function round1(val: number): number {
  return Math.round(val * 10) / 10;
}

function round4(val: number): number {
  return Math.round(val * 10000) / 10000;
}

function clamp01(val: number): number {
  if (!Number.isFinite(val)) return 0;
  return Math.min(1, Math.max(0, val));
}

function normalizeSearchLimit(rawLimit: unknown): number {
  const num = typeof rawLimit === 'number' ? rawLimit : Number.NaN;
  if (!Number.isFinite(num)) {
    return DEFAULT_MAX_SEARCH_PATHS;
  }
  return Math.min(MAX_ALLOWED_SEARCH_PATHS, Math.max(1, Math.round(num)));
}

let cachedCanonicalLookupMaps: NetworkLookupMaps | null = null;
const cachedCanonicalAllPathsByOriginKey = new Map<
  string,
  Map<string, RawDirectedPath[]>
>();

function isCanonicalDataset(
  dataset: Pick<NetworkDatasetInput, 'nodes' | 'edges'>,
): boolean {
  return (
    dataset === ECONOLOOM_DATASET ||
    (dataset.nodes === ECONOLOOM_DATASET.nodes &&
      dataset.edges === ECONOLOOM_DATASET.edges)
  );
}

/**
 * Builds deterministic node, outgoing-edge, and normalized incoming-weight lookup maps
 * matching the exact anti-double-counting normalization rule in simulateScenario.ts.
 */
export function buildNetworkLookupMaps(
  dataset: Pick<NetworkDatasetInput, 'nodes' | 'edges'> = ECONOLOOM_DATASET,
): NetworkLookupMaps {
  const isCanonical = isCanonicalDataset(dataset);
  if (isCanonical && cachedCanonicalLookupMaps !== null) {
    return cachedCanonicalLookupMaps;
  }

  const nodeMap = new Map<string, NetworkNode>();
  const incomingEdgesByNodeId = new Map<string, DependencyEdge[]>();
  const outgoingEdgesByNodeId = new Map<string, DependencyEdge[]>();
  const normalizedWeightByEdgeId = new Map<string, number>();

  for (const node of dataset.nodes) {
    nodeMap.set(node.id, node);
    incomingEdgesByNodeId.set(node.id, []);
    outgoingEdgesByNodeId.set(node.id, []);
  }

  for (const edge of dataset.edges) {
    if (nodeMap.has(edge.sourceNodeId) && nodeMap.has(edge.targetNodeId)) {
      incomingEdgesByNodeId.get(edge.targetNodeId)!.push(edge);
      outgoingEdgesByNodeId.get(edge.sourceNodeId)!.push(edge);
    }
  }

  for (const node of dataset.nodes) {
    const incoming = incomingEdgesByNodeId.get(node.id) ?? [];
    let weightSum = 0;
    for (const edge of incoming) {
      const w = Math.min(1.0, Math.max(0.01, edge.dependencyWeight.value));
      weightSum += w;
    }
    const normDenom = Math.max(1.0, weightSum);
    for (const edge of incoming) {
      const w = Math.min(1.0, Math.max(0.01, edge.dependencyWeight.value));
      normalizedWeightByEdgeId.set(edge.id, w / normDenom);
    }
  }

  const maps: NetworkLookupMaps = {
    nodeMap,
    outgoingEdgesByNodeId,
    normalizedWeightByEdgeId,
  };

  if (isCanonical) {
    cachedCanonicalLookupMaps = maps;
  }

  return maps;
}

function getNodeInventoryDaysAtWeek(
  node: NetworkNode,
  nodeStatesAtWeek: Record<string, NodeWeeklyState>,
): number {
  const state = nodeStatesAtWeek[node.id];
  if (state && Number.isFinite(state.remainingInventoryDays)) {
    return round1(Math.max(0, state.remainingInventoryDays));
  }
  return round1(Math.max(0, node.baselineInventoryDays.value));
}

/**
 * Builds the 0-hop self-origin pathway when the queried target node is itself
 * an active shock origin.
 */
export function buildOriginSelfPathway(
  targetNode: NetworkNode,
  week: number,
  nodeStatesAtWeek: Record<string, NodeWeeklyState>,
  shockSeverityPct: number,
): CausalPathway {
  const originState = nodeStatesAtWeek[targetNode.id];
  const rei = originState?.relativeExposureIndex ?? 0;
  const cpi = originState?.costPressureIndex ?? 0;
  const band = originState?.severityBand ?? getSeverityBand(rei);
  const invDays = getNodeInventoryDaysAtWeek(targetNode, nodeStatesAtWeek);
  const clampedSeverity = clamp01(shockSeverityPct);

  const step: CausalPathStep = {
    nodeId: targetNode.id,
    nodeName: targetNode.name,
    reiAtWeek: rei,
    targetRei: rei,
    cpiAtWeek: cpi,
    severityBand: band,
    lagWeeksFromOrigin: 0,
    cumulativeLagWeeks: 0,
    sourceInventoryDays: invDays,
    targetInventoryDays: invDays,
    edgeActiveBypassShare: 0,
    classification: targetNode.baselineInventoryDays.classification,
    confidence: targetNode.baselineInventoryDays.confidence,
  };

  return {
    targetNodeId: targetNode.id,
    week,
    pathScore: round1(clampedSeverity * 100),
    totalLagWeeks: 0,
    bottleneckNodeId: targetNode.id,
    bottleneckEdgeId: 'origin_direct',
    bottleneckSummary: `${targetNode.shortLabel} is the primary shock origin (${Math.round(clampedSeverity * 100)}% configured capacity curtailment).`,
    steps: [step],
    narrativeSummary: `${targetNode.name} is directly disrupted as the scenario origin with 0-week transit lag (Week ${week} REI: ${rei.toFixed(1)}, CPI: ${cpi.toFixed(1)}).`,
  };
}

function buildRawDirectedPath(
  originNodeId: string,
  edges: DependencyEdge[],
  nodeMap: Map<string, NetworkNode>,
): RawDirectedPath {
  const originLabel = nodeMap.get(originNodeId)?.shortLabel ?? originNodeId;
  const labels: string[] = [originLabel];
  const keys: string[] = [originNodeId];
  let totalLagWeeks = 0;

  for (const edge of edges) {
    const stepLabel =
      nodeMap.get(edge.targetNodeId)?.shortLabel ?? edge.targetNodeId;
    labels.push(stepLabel);
    keys.push(edge.id);
    totalLagWeeks += Math.max(0, Math.round(edge.transitLagWeeks.value));
  }

  return {
    originNodeId,
    edges,
    totalLagWeeks,
    sortKey: keys.join('>'),
    chainLabels: labels.join(' → '),
  };
}

/**
 * Enumerates simple directed paths from validOrigins to targetNodeId up to MAX_PATH_HOPS (8) edges.
 * Uses path-local visitedNodeIds tracking to guarantee cycle safety and prevent repeated nodes,
 * and stops deterministically if maxSearchPaths is reached.
 */
export function discoverDirectedPathsToTarget(
  validOrigins: string[],
  targetNodeId: string,
  nodeMap: Map<string, NetworkNode>,
  outgoingEdgesByNodeId: Map<string, DependencyEdge[]>,
  maxSearchPaths: number = DEFAULT_MAX_SEARCH_PATHS,
): {
  paths: RawDirectedPath[];
  searchLimitReached: boolean;
} {
  // Fast path: if using the canonical network and default search limit, reuse cached all-origin discovery
  if (
    cachedCanonicalLookupMaps &&
    nodeMap === cachedCanonicalLookupMaps.nodeMap &&
    outgoingEdgesByNodeId === cachedCanonicalLookupMaps.outgoingEdgesByNodeId &&
    maxSearchPaths === DEFAULT_MAX_SEARCH_PATHS
  ) {
    const allPaths = discoverAllDirectedPathsFromOrigins(
      validOrigins,
      nodeMap,
      outgoingEdgesByNodeId,
      maxSearchPaths,
    );
    return {
      paths: allPaths.get(targetNodeId) ?? [],
      searchLimitReached: false,
    };
  }

  const discoveredPaths: RawDirectedPath[] = [];
  let searchLimitReached = false;

  const dfs = (
    currentNodeId: string,
    originNodeId: string,
    currentEdges: DependencyEdge[],
    visitedNodeIds: Set<string>,
  ) => {
    if (searchLimitReached || currentEdges.length >= MAX_PATH_HOPS) {
      return;
    }

    const outgoing = outgoingEdgesByNodeId.get(currentNodeId) ?? [];
    for (const edge of outgoing) {
      if (searchLimitReached) {
        return;
      }
      // Strictly enforce edge directionality (edge must originate at currentNodeId)
      if (edge.sourceNodeId !== currentNodeId) {
        continue;
      }
      const nextNodeId = edge.targetNodeId;
      if (!nodeMap.has(nextNodeId) || visitedNodeIds.has(nextNodeId)) {
        continue;
      }

      const nextEdges = [...currentEdges, edge];
      if (nextNodeId === targetNodeId) {
        if (discoveredPaths.length < maxSearchPaths) {
          discoveredPaths.push(
            buildRawDirectedPath(originNodeId, nextEdges, nodeMap),
          );
        } else {
          searchLimitReached = true;
          return;
        }
      } else if (nextEdges.length < MAX_PATH_HOPS) {
        visitedNodeIds.add(nextNodeId);
        dfs(nextNodeId, originNodeId, nextEdges, visitedNodeIds);
        visitedNodeIds.delete(nextNodeId);
      }
    }
  };

  for (const originId of validOrigins) {
    if (searchLimitReached) break;
    const visited = new Set<string>([originId]);
    dfs(originId, originId, [], visited);
  }

  return {
    paths: discoveredPaths,
    searchLimitReached,
  };
}

/**
 * Discovers simple directed paths from validOrigins to all reachable target nodes in a single pass.
 * Used by simulateScenario.ts to avoid repeating graph traversal across 27 simulation weeks.
 */
export function discoverAllDirectedPathsFromOrigins(
  validOrigins: string[],
  nodeMap: Map<string, NetworkNode>,
  outgoingEdgesByNodeId: Map<string, DependencyEdge[]>,
  maxSearchPathsPerTarget: number = DEFAULT_MAX_SEARCH_PATHS,
): Map<string, RawDirectedPath[]> {
  const isCanonical =
    cachedCanonicalLookupMaps !== null &&
    nodeMap === cachedCanonicalLookupMaps.nodeMap &&
    outgoingEdgesByNodeId === cachedCanonicalLookupMaps.outgoingEdgesByNodeId;
  const cacheKey = `${validOrigins.join('|')}::${maxSearchPathsPerTarget}`;

  if (isCanonical) {
    const cached = cachedCanonicalAllPathsByOriginKey.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const pathsByTargetId = new Map<string, RawDirectedPath[]>();
  const originSet = new Set(validOrigins);

  const dfsAll = (
    currentNodeId: string,
    originNodeId: string,
    currentEdges: DependencyEdge[],
    visitedNodeIds: Set<string>,
  ) => {
    if (currentEdges.length >= MAX_PATH_HOPS) {
      return;
    }

    const outgoing = outgoingEdgesByNodeId.get(currentNodeId) ?? [];
    for (const edge of outgoing) {
      if (edge.sourceNodeId !== currentNodeId) {
        continue;
      }
      const nextNodeId = edge.targetNodeId;
      if (!nodeMap.has(nextNodeId) || visitedNodeIds.has(nextNodeId)) {
        continue;
      }

      const nextEdges = [...currentEdges, edge];
      if (!originSet.has(nextNodeId)) {
        const list = pathsByTargetId.get(nextNodeId) ?? [];
        if (list.length < maxSearchPathsPerTarget) {
          list.push(buildRawDirectedPath(originNodeId, nextEdges, nodeMap));
          pathsByTargetId.set(nextNodeId, list);
        }
      }

      if (nextEdges.length < MAX_PATH_HOPS) {
        visitedNodeIds.add(nextNodeId);
        dfsAll(nextNodeId, originNodeId, nextEdges, visitedNodeIds);
        visitedNodeIds.delete(nextNodeId);
      }
    }
  };

  for (const originId of validOrigins) {
    const visited = new Set<string>([originId]);
    dfsAll(originId, originId, [], visited);
  }

  // Pre-sort each target's candidate list by deterministic tie-breakers once and assign integer tieBreakRank
  for (const list of pathsByTargetId.values()) {
    list.sort((a, b) => {
      const lagA = a.totalLagWeeks ?? 0;
      const lagB = b.totalLagWeeks ?? 0;
      if (lagA !== lagB) return lagA - lagB;
      if (a.edges.length !== b.edges.length) {
        return a.edges.length - b.edges.length;
      }
      return (a.sortKey ?? '').localeCompare(b.sortKey ?? '');
    });
    for (let i = 0; i < list.length; i += 1) {
      list[i]!.tieBreakRank = i;
    }
  }

  if (isCanonical) {
    cachedCanonicalAllPathsByOriginKey.set(cacheKey, pathsByTargetId);
  }

  return pathsByTargetId;
}

/**
 * Scores, enriches, and deterministically sorts discovered simple directed paths
 * for a specific target node and simulation week.
 */
export function scoreAndRankPathways(
  rawPaths: RawDirectedPath[],
  targetNode: NetworkNode,
  week: number,
  nodeMap: Map<string, NetworkNode>,
  normalizedWeightByEdgeId: Map<string, number>,
  nodeStatesAtWeek: Record<string, NodeWeeklyState>,
  edgeStatesAtWeek: Record<string, EdgeWeeklyState>,
  shockSeverityPct: number,
  limit?: number,
): CausalPathway[] {
  if (rawPaths.length === 0) {
    return [];
  }

  const clampedSeverity = clamp01(shockSeverityPct);

  // Step 1: Compute lightweight score & bottleneck descriptors for all candidate paths
  const scoredDescriptors = rawPaths.map((rawPath) => {
    let originNode = rawPath.originNode;
    let staticHops = rawPath.staticHops;
    const hopCount = rawPath.edges.length;

    if (!originNode || !staticHops) {
      originNode = nodeMap.get(rawPath.originNodeId)!;
      staticHops = [];
      let runningLag = 0;
      let prevNode = originNode;
      for (const edge of rawPath.edges) {
        const stepNode = nodeMap.get(edge.targetNodeId)!;
        const edgeLag = Math.max(0, Math.round(edge.transitLagWeeks.value));
        runningLag += edgeLag;
        const normWeight =
          normalizedWeightByEdgeId.get(edge.id) ??
          clamp01(edge.dependencyWeight.value);
        const crit = clamp01(edge.inputCriticality.value);
        staticHops.push({
          edge,
          sourceNode: prevNode,
          stepNode,
          cumulativeLagWeeks: runningLag,
          baseConductance: 0.5 * normWeight + 0.5 * crit,
          baseBottleneck: crit * (0.5 + 0.5 * normWeight),
        });
        prevNode = stepNode;
      }
      rawPath.originNode = originNode;
      rawPath.staticHops = staticHops;
      rawPath.totalLagWeeks = runningLag;
      rawPath.hopDiscount = Math.pow(0.9, Math.max(0, hopCount - 1));
      rawPath.invHopCount = 1 / hopCount;
    }

    const cumulativeLagWeeks = rawPath.totalLagWeeks ?? 0;
    let conductanceProduct = 1.0;
    let activeDisruptionSum = 0.0;

    let bestBottleneckMetric = -1;
    let bottleneckEdge: DependencyEdge = staticHops[0]!.edge;
    let bottleneckNode: NetworkNode = staticHops[0]!.stepNode;

    for (let i = 0; i < staticHops.length; i += 1) {
      const hop = staticHops[i]!;
      const edgeState = edgeStatesAtWeek[hop.edge.id];
      const activeBypass = round4(clamp01(edgeState?.activeBypassShare ?? 0));
      const transmitted = clamp01(edgeState?.transmittedDisruption ?? 0);

      const hopConductance = hop.baseConductance * (1 - 0.5 * activeBypass);
      conductanceProduct *= hopConductance > 0.05 ? hopConductance : 0.05;
      activeDisruptionSum += transmitted;

      const bottleneckMetric =
        hop.baseBottleneck * (1 - 0.6 * activeBypass) * (1 + transmitted);
      if (bottleneckMetric > bestBottleneckMetric) {
        bestBottleneckMetric = bottleneckMetric;
        bottleneckEdge = hop.edge;
        bottleneckNode = hop.stepNode;
      }
    }

    const invHopCount = rawPath.invHopCount ?? 1 / hopCount;
    const geometricConductance = Math.pow(conductanceProduct, invHopCount);
    const activeDisruptionMean = activeDisruptionSum * invHopCount;
    const hopDiscount =
      rawPath.hopDiscount ?? Math.pow(0.9, Math.max(0, hopCount - 1));

    const pathScore =
      clampedSeverity <= 0
        ? 0
        : round1(
            100 *
              clamp01(
                0.6 * activeDisruptionMean +
                  0.4 * clampedSeverity * geometricConductance * hopDiscount,
              ),
          );

    const sortKey =
      rawPath.sortKey ??
      `${rawPath.originNodeId}>${rawPath.edges.map((e) => e.id).join('>')}`;

    return {
      rawPath,
      originNode,
      pathScore,
      cumulativeLagWeeks,
      hopCount,
      bottleneckEdge,
      bottleneckNode,
      sortKey,
      tieBreakRank: rawPath.tieBreakRank,
    };
  });

  // Step 2: Sort deterministically: highest pathScore first, then shortest totalLagWeeks, then fewest hops, then edge/node IDs
  scoredDescriptors.sort((a, b) => {
    if (b.pathScore !== a.pathScore) {
      return b.pathScore - a.pathScore;
    }
    if (a.tieBreakRank !== undefined && b.tieBreakRank !== undefined) {
      return a.tieBreakRank - b.tieBreakRank;
    }
    if (a.cumulativeLagWeeks !== b.cumulativeLagWeeks) {
      return a.cumulativeLagWeeks - b.cumulativeLagWeeks;
    }
    if (a.hopCount !== b.hopCount) {
      return a.hopCount - b.hopCount;
    }
    return a.sortKey.localeCompare(b.sortKey);
  });

  const selectedDescriptors =
    typeof limit === 'number' && limit > 0
      ? scoredDescriptors.slice(0, limit)
      : scoredDescriptors;

  // Step 3: Materialize full CausalPathStep[] and narratives only for the selected ranked paths
  return selectedDescriptors.map(
    ({
      rawPath,
      originNode,
      pathScore,
      cumulativeLagWeeks,
      bottleneckEdge,
      bottleneckNode,
    }) => {
      const originState = nodeStatesAtWeek[originNode.id];
      const originRei = originState?.relativeExposureIndex ?? 0;
      const originCpi = originState?.costPressureIndex ?? 0;
      const originInvDays = getNodeInventoryDaysAtWeek(
        originNode,
        nodeStatesAtWeek,
      );

      const steps: CausalPathStep[] = [
        {
          nodeId: originNode.id,
          nodeName: originNode.name,
          reiAtWeek: originRei,
          targetRei: originRei,
          cpiAtWeek: originCpi,
          severityBand: originState?.severityBand ?? getSeverityBand(originRei),
          lagWeeksFromOrigin: 0,
          cumulativeLagWeeks: 0,
          sourceInventoryDays: originInvDays,
          targetInventoryDays: originInvDays,
          edgeActiveBypassShare: 0,
          classification: originNode.baselineInventoryDays.classification,
          confidence: originNode.baselineInventoryDays.confidence,
        },
      ];

      const staticHops = rawPath.staticHops ?? [];
      for (let i = 0; i < staticHops.length; i += 1) {
        const hop = staticHops[i]!;
        const edge = hop.edge;
        const sourceNode = hop.sourceNode;
        const stepNode = hop.stepNode;
        const stepState = nodeStatesAtWeek[stepNode.id];
        const edgeState = edgeStatesAtWeek[edge.id];
        const runningLagWeeks = hop.cumulativeLagWeeks;

        const activeBypass = round4(clamp01(edgeState?.activeBypassShare ?? 0));
        const stepRei = stepState?.relativeExposureIndex ?? 0;
        const stepCpi = stepState?.costPressureIndex ?? 0;
        const sourceInvDays = getNodeInventoryDaysAtWeek(
          sourceNode,
          nodeStatesAtWeek,
        );
        const targetInvDays = getNodeInventoryDaysAtWeek(
          stepNode,
          nodeStatesAtWeek,
        );

        steps.push({
          nodeId: stepNode.id,
          nodeName: stepNode.name,
          edgeId: edge.id,
          mechanismSummary: edge.mechanismSummary,
          dependencyWeight: edge.dependencyWeight.value,
          inputCriticality: edge.inputCriticality.value,
          reiAtWeek: stepRei,
          targetRei: stepRei,
          cpiAtWeek: stepCpi,
          severityBand: stepState?.severityBand ?? getSeverityBand(stepRei),
          lagWeeksFromOrigin: runningLagWeeks,
          cumulativeLagWeeks: runningLagWeeks,
          sourceInventoryDays: sourceInvDays,
          targetInventoryDays: targetInvDays,
          edgeActiveBypassShare: activeBypass,
          classification: edge.dependencyWeight.classification,
          confidence: edge.dependencyWeight.confidence,
        });
      }

      const targetStep = steps[steps.length - 1]!;
      const chainLabels =
        rawPath.chainLabels ??
        steps
          .map((s) => nodeMap.get(s.nodeId)?.shortLabel ?? s.nodeName)
          .join(' → ');

      const bottleneckSummary = `Primary bottleneck at ${bottleneckNode.shortLabel} via ${bottleneckEdge.id} (input criticality c=${bottleneckEdge.inputCriticality.value.toFixed(2)}, dependency share ${Math.round(bottleneckEdge.dependencyWeight.value * 100)}%, baseline buffer ${bottleneckNode.baselineInventoryDays.value}d).`;

      const arrivalWeek = 1 + cumulativeLagWeeks;
      const timingNote =
        clampedSeverity <= 0
          ? 'Scenario is at 0% shock severity (baseline operations).'
          : week < arrivalWeek
            ? `Shock wave requires ${cumulativeLagWeeks}w cumulative transit lag and first reaches ${targetNode.shortLabel} at Week ${arrivalWeek}.`
            : `Active at Week ${week} (${cumulativeLagWeeks}w cumulative lag): ${targetNode.shortLabel} registers REI ${targetStep.reiAtWeek.toFixed(1)} (${targetStep.severityBand}) and CPI ${targetStep.cpiAtWeek.toFixed(1)}.`;

      const narrativeSummary = `${chainLabels}. ${bottleneckSummary} ${timingNote}`;

      return {
        targetNodeId: targetNode.id,
        week,
        pathScore,
        totalLagWeeks: cumulativeLagWeeks,
        bottleneckNodeId: bottleneckNode.id,
        bottleneckEdgeId: bottleneckEdge.id,
        bottleneckSummary,
        steps,
        narrativeSummary,
      };
    },
  );
}

/**
 * Traces and ranks the top directed causal pathways from shockOriginNodeIds
 * to targetNodeId at the specified simulation week.
 *
 * Safely handles unreachable targets, self-origin targets, and cyclic graphs
 * (via path-local visited set, MAX_PATH_HOPS bound, and deterministic search-safety cap).
 */
export function traceCausalPathways(input: TracePathwaysInput): CausalPathway[] {
  const {
    shockOriginNodeIds,
    targetNodeId,
    week,
    nodeMap,
    outgoingEdgesByNodeId,
    normalizedWeightByEdgeId,
    nodeStatesAtWeek,
    edgeStatesAtWeek,
    shockSeverityPct,
    maxPaths = 3,
    maxSearchPaths = DEFAULT_MAX_SEARCH_PATHS,
  } = input;

  const normalizedWeek = normalizeWeekIndex(week);
  const normalizedMax = normalizeMaxPaths(maxPaths, 3);
  const safeSearchLimit = normalizeSearchLimit(maxSearchPaths);

  if (typeof targetNodeId !== 'string' || targetNodeId.length === 0) {
    return [];
  }

  const targetNode = nodeMap.get(targetNodeId);
  if (!targetNode) {
    return [];
  }

  const validOrigins = Array.from(
    new Set(
      (shockOriginNodeIds ?? []).filter(
        (id): id is string => typeof id === 'string' && nodeMap.has(id),
      ),
    ),
  );
  if (validOrigins.length === 0) {
    return [];
  }

  const originSet = new Set(validOrigins);

  // Case 1: The target node is itself an active shock origin
  if (originSet.has(targetNodeId)) {
    const originPathway = buildOriginSelfPathway(
      targetNode,
      normalizedWeek,
      nodeStatesAtWeek ?? {},
      shockSeverityPct,
    );
    return [originPathway].slice(0, normalizedMax);
  }

  // Case 2: Discover all simple directed paths from any origin to targetNodeId
  const { paths: discoveredPaths } = discoverDirectedPathsToTarget(
    validOrigins,
    targetNodeId,
    nodeMap,
    outgoingEdgesByNodeId,
    safeSearchLimit,
  );

  if (discoveredPaths.length === 0) {
    return [];
  }

  return scoreAndRankPathways(
    discoveredPaths,
    targetNode,
    normalizedWeek,
    nodeMap,
    normalizedWeightByEdgeId,
    nodeStatesAtWeek ?? {},
    edgeStatesAtWeek ?? {},
    shockSeverityPct,
    normalizedMax,
  );
}

/**
 * Infers the effective scenario shockSeverityPct in [0, 1] from explicit options,
 * Week-1 origin node state in simulationResult, or preset defaults.
 */
function resolveShockSeverityPct(
  preset: ScenarioPreset | null | undefined,
  simulationResult: SimulationResult | null | undefined,
  validOrigins: string[],
  normalizedWeek: number,
  options?: AnalyzePathwaysOptions,
): number {
  if (
    options?.shockSeverityPct !== undefined &&
    Number.isFinite(options.shockSeverityPct)
  ) {
    return clamp01(options.shockSeverityPct);
  }

  const firstOriginId = validOrigins[0];
  if (firstOriginId && simulationResult?.nodeStatesByWeek) {
    const week1Origin = simulationResult.nodeStatesByWeek[1]?.[firstOriginId];
    if (week1Origin && Number.isFinite(week1Origin.unbufferedShortfall)) {
      return clamp01(week1Origin.unbufferedShortfall);
    }

    const reqWeekOrigin =
      simulationResult.nodeStatesByWeek[normalizedWeek]?.[firstOriginId];
    if (
      reqWeekOrigin &&
      normalizedWeek > 0 &&
      Number.isFinite(reqWeekOrigin.unbufferedShortfall)
    ) {
      return clamp01(reqWeekOrigin.unbufferedShortfall);
    }
  }

  if (
    simulationResult?.overallPeakSummary &&
    Number.isFinite(simulationResult.overallPeakSummary.peakNetworkRei) &&
    simulationResult.overallPeakSummary.peakNetworkRei <= 0
  ) {
    return 0;
  }

  return clamp01(preset?.defaultParams?.shockSeverityPct ?? 0);
}

/**
 * Pure diagnostic function that analyzes all simple directed causal pathways
 * from the active scenario's shock origin node(s) to targetNodeId at a specific simulation week.
 *
 * Returns a complete PathwayAnalysisReport including:
 * - targetNodeId
 * - normalized week in [0, 26]
 * - reachabilityStatus: 'origin_node' | 'reachable' | 'unreachable'
 * - reachabilityReason: plain-English diagnostic distinguishing origin status,
 *   unreachable targets, zero-shock baseline, in-transit lag status, ordinary display
 *   truncation, and search-safety-limit truncation
 * - totalDiscoveredPaths: count of simple directed paths (<= 8 edges) discovered
 * - truncatedPathCount: totalDiscoveredPaths - pathways.length
 * - searchLimitReached: true only if candidate enumeration hit maxSearchPaths early
 * - pathways: deterministically ranked CausalPathway[] up to normalized maxPaths (default 5)
 */
export function analyzeNodePathways(
  preset: ScenarioPreset,
  simulationResult: SimulationResult,
  targetNodeId: string,
  week: number,
  maxPaths: number = DEFAULT_MAX_PATHS,
  options?: AnalyzePathwaysOptions,
): PathwayAnalysisReport {
  const normalizedWeek = normalizeWeekIndex(week);
  const normalizedMaxPaths = normalizeMaxPaths(maxPaths, DEFAULT_MAX_PATHS);
  const maxSearchPaths = normalizeSearchLimit(options?.maxSearchPaths);

  const dataset = options?.dataset ?? ECONOLOOM_DATASET;
  const { nodeMap, outgoingEdgesByNodeId, normalizedWeightByEdgeId } =
    buildNetworkLookupMaps(dataset);

  const safeTargetId = typeof targetNodeId === 'string' ? targetNodeId : '';
  const targetNode = nodeMap.get(safeTargetId);

  if (!targetNode) {
    return {
      targetNodeId: safeTargetId,
      week: normalizedWeek,
      reachabilityStatus: 'unreachable',
      reachabilityReason: `Target node "${safeTargetId || String(targetNodeId)}" does not exist in the network dataset.`,
      totalDiscoveredPaths: 0,
      truncatedPathCount: 0,
      searchLimitReached: false,
      pathways: [],
    };
  }

  const validOrigins = Array.from(
    new Set(
      (preset?.shockOriginNodeIds ?? []).filter(
        (id): id is string => typeof id === 'string' && nodeMap.has(id),
      ),
    ),
  );

  if (validOrigins.length === 0) {
    return {
      targetNodeId: targetNode.id,
      week: normalizedWeek,
      reachabilityStatus: 'unreachable',
      reachabilityReason: `No valid shock origin nodes exist in the network dataset for preset "${preset?.id ?? 'unknown'}".`,
      totalDiscoveredPaths: 0,
      truncatedPathCount: 0,
      searchLimitReached: false,
      pathways: [],
    };
  }

  const nodeStatesAtWeek =
    simulationResult?.nodeStatesByWeek?.[normalizedWeek] ?? {};
  const edgeStatesAtWeek =
    simulationResult?.edgeStatesByWeek?.[normalizedWeek] ?? {};
  const shockSeverityPct = resolveShockSeverityPct(
    preset,
    simulationResult,
    validOrigins,
    normalizedWeek,
    options,
  );

  const originSet = new Set(validOrigins);

  // Case 1: Target node is itself an active shock origin
  if (originSet.has(targetNode.id)) {
    const originPathway = buildOriginSelfPathway(
      targetNode,
      normalizedWeek,
      nodeStatesAtWeek,
      shockSeverityPct,
    );
    const totalDiscoveredPaths = 1;
    const pathways = [originPathway].slice(0, normalizedMaxPaths);
    const truncatedPathCount = Math.max(
      0,
      totalDiscoveredPaths - pathways.length,
    );

    const statusDetail =
      shockSeverityPct <= 0
        ? 'Scenario is at 0% shock severity (baseline operations).'
        : normalizedWeek === 0
          ? 'Week 0 represents the pre-shock baseline state prior to Week 1 shock onset.'
          : `Experiencing direct origin curtailment at Week ${normalizedWeek} (0-week transit lag).`;

    return {
      targetNodeId: targetNode.id,
      week: normalizedWeek,
      reachabilityStatus: 'origin_node',
      reachabilityReason: `${targetNode.name} (${targetNode.id}) is a configured primary shock origin node. ${statusDetail}`,
      totalDiscoveredPaths,
      truncatedPathCount,
      searchLimitReached: false,
      pathways,
    };
  }

  // Case 2: Enumerate simple directed paths from validOrigins to targetNode
  const { paths: discoveredPaths, searchLimitReached } =
    discoverDirectedPathsToTarget(
      validOrigins,
      targetNode.id,
      nodeMap,
      outgoingEdgesByNodeId,
      maxSearchPaths,
    );

  if (discoveredPaths.length === 0) {
    return {
      targetNodeId: targetNode.id,
      week: normalizedWeek,
      reachabilityStatus: 'unreachable',
      reachabilityReason: `No directed upstream supply-chain path within ${MAX_PATH_HOPS} edges connects shock origin(s) [${validOrigins.join(', ')}] to ${targetNode.name} (${targetNode.id}).`,
      totalDiscoveredPaths: 0,
      truncatedPathCount: 0,
      searchLimitReached: false,
      pathways: [],
    };
  }

  const scoredPathways = scoreAndRankPathways(
    discoveredPaths,
    targetNode,
    normalizedWeek,
    nodeMap,
    normalizedWeightByEdgeId,
    nodeStatesAtWeek,
    edgeStatesAtWeek,
    shockSeverityPct,
  );

  const totalDiscoveredPaths = scoredPathways.length;
  const pathways = scoredPathways.slice(0, normalizedMaxPaths);
  const truncatedPathCount = Math.max(
    0,
    totalDiscoveredPaths - pathways.length,
  );

  const minLagWeeks = scoredPathways.reduce(
    (minLag, p) => Math.min(minLag, p.totalLagWeeks),
    Number.POSITIVE_INFINITY,
  );
  const minArrivalWeek = 1 + (Number.isFinite(minLagWeeks) ? minLagWeeks : 0);

  let enumerationSummary: string;
  if (searchLimitReached) {
    enumerationSummary = `Search-limit truncation: enumerated ${totalDiscoveredPaths} simple directed pathways (≤ ${MAX_PATH_HOPS} edges) from [${validOrigins.join(', ')}] to ${targetNode.name} before reaching the deterministic search-safety limit (${maxSearchPaths} paths); displaying top ${pathways.length} (${truncatedPathCount} discovered path(s) omitted, and additional paths beyond the search cap were not enumerated).`;
  } else if (truncatedPathCount > 0) {
    enumerationSummary = `Display truncation: exhaustively enumerated all ${totalDiscoveredPaths} simple directed pathways (≤ ${MAX_PATH_HOPS} edges) from [${validOrigins.join(', ')}] to ${targetNode.name}; displaying top ${pathways.length} ranked pathway(s) (${truncatedPathCount} lower-ranked pathway(s) omitted).`;
  } else {
    enumerationSummary = `Exhaustively enumerated all ${totalDiscoveredPaths} simple directed pathway(s) (≤ ${MAX_PATH_HOPS} edges) from [${validOrigins.join(', ')}] to ${targetNode.name}; displaying all ${pathways.length} pathway(s).`;
  }

  const timingSuffix =
    shockSeverityPct <= 0
      ? 'Zero-shock baseline (0% severity): all pathway scores are 0.0.'
      : normalizedWeek < minArrivalWeek
        ? `At Week ${normalizedWeek}, upstream disruption is still in transit (earliest path arrival is Week ${minArrivalWeek} via ${minLagWeeks}w cumulative lag).`
        : `At Week ${normalizedWeek}, at least one pathway has completed its ${minLagWeeks}w transit lag.`;

  return {
    targetNodeId: targetNode.id,
    week: normalizedWeek,
    reachabilityStatus: 'reachable',
    reachabilityReason: `${enumerationSummary} ${timingSuffix}`,
    totalDiscoveredPaths,
    truncatedPathCount,
    searchLimitReached,
    pathways,
  };
}
