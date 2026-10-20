import { describe, expect, it } from 'vitest';
import { EDGES, NODES, PRESETS } from '../data';
import { normalizeMaxPaths, normalizeWeekIndex } from '../engine/normalizeInputs';
import {
  analyzeNodePathways,
  MAX_PATH_HOPS,
  traceCausalPathways,
} from '../engine/pathwayTracer';
import { simulateScenario } from '../engine/simulateScenario';
import type { NetworkDatasetInput } from '../engine/validateNetwork';
import type {
  DependencyEdge,
  NetworkNode,
  ScenarioPreset,
} from '../types/domain';

function makeSyntheticNode(
  id: string,
  tierIndex: number,
  inventoryDays = 21,
): NetworkNode {
  const template = NODES[0]!;
  const clampedTier = Math.min(3, Math.max(0, tierIndex)) as 0 | 1 | 2 | 3;
  return {
    ...template,
    id,
    name: `Node ${id}`,
    shortLabel: id,
    tierIndex: clampedTier,
    baselineInventoryDays: {
      ...template.baselineInventoryDays,
      value: inventoryDays,
    },
  };
}

function makeSyntheticEdge(
  id: string,
  sourceNodeId: string,
  targetNodeId: string,
  opts?: {
    weight?: number;
    criticality?: number;
    lagWeeks?: number;
    bypassAvailable?: boolean;
    maxBypassShare?: number;
    bypassPenaltyWeeks?: number;
  },
): DependencyEdge {
  const template = EDGES[0]!;
  return {
    ...template,
    id,
    sourceNodeId,
    targetNodeId,
    mechanismSummary: `${sourceNodeId} -> ${targetNodeId}`,
    dependencyWeight: {
      ...template.dependencyWeight,
      value: opts?.weight ?? 0.6,
    },
    transitLagWeeks: {
      ...template.transitLagWeeks,
      value: opts?.lagWeeks ?? 1,
    },
    inputCriticality: {
      ...template.inputCriticality,
      value: opts?.criticality ?? 0.7,
    },
    bypassAvailable: opts?.bypassAvailable ?? false,
    maxBypassShare: {
      ...template.maxBypassShare,
      value: opts?.maxBypassShare ?? 0,
    },
    bypassTransitPenaltyWeeks: opts?.bypassPenaltyWeeks ?? 0,
  };
}

function makeSyntheticPreset(shockOriginNodeIds: string[]): ScenarioPreset {
  const template = PRESETS[0]!;
  return {
    ...template,
    id: 'preset_synthetic_test',
    shockOriginNodeIds,
  };
}

function makeSyntheticDataset(
  nodes: NetworkNode[],
  edges: DependencyEdge[],
  presets: ScenarioPreset[],
): NetworkDatasetInput {
  return {
    nodes,
    edges,
    corridors: [],
    presets,
    sources: [],
    assumptions: [],
  };
}

describe('Milestone 5A: Pathway Engine and Diagnostics (analyzeNodePathways)', () => {
  it('1. Valid directed multi-hop paths: traces valid multi-hop chains from shock origin to downstream consumer targets', () => {
    const hormuzPreset = PRESETS.find((p) => p.id === 'preset_hormuz_energy')!;
    const simResult = simulateScenario(hormuzPreset, hormuzPreset.defaultParams);

    const report = analyzeNodePathways(
      hormuzPreset,
      simResult,
      'con_groceries',
      10,
      5,
    );

    expect(report.targetNodeId).toBe('con_groceries');
    expect(report.week).toBe(10);
    expect(report.reachabilityStatus).toBe('reachable');
    expect(report.totalDiscoveredPaths).toBeGreaterThan(0);
    expect(report.pathways.length).toBeGreaterThan(0);
    expect(report.pathways.length).toBeLessThanOrEqual(5);

    for (const pathway of report.pathways) {
      expect(
        hormuzPreset.shockOriginNodeIds.includes(pathway.steps[0]!.nodeId),
      ).toBe(true);
      expect(pathway.steps[pathway.steps.length - 1]!.nodeId).toBe(
        'con_groceries',
      );
      expect(pathway.steps.length).toBeGreaterThanOrEqual(2);

      // Verify every consecutive step is connected by the recorded directed edge
      for (let i = 1; i < pathway.steps.length; i += 1) {
        const prevStep = pathway.steps[i - 1]!;
        const currStep = pathway.steps[i]!;
        const edge = EDGES.find((e) => e.id === currStep.edgeId);
        expect(edge).toBeDefined();
        expect(edge!.sourceNodeId).toBe(prevStep.nodeId);
        expect(edge!.targetNodeId).toBe(currStep.nodeId);
      }
    }
  });

  it('2. Reverse-direction paths: never traverses edges backward against their directed orientation', () => {
    // Graph: A <- B <- C (edges point from C to B and B to A; shock origin is A, target is C)
    const nodes = [
      makeSyntheticNode('N_A', 0),
      makeSyntheticNode('N_B', 1),
      makeSyntheticNode('N_C', 2),
    ];
    const edges = [
      makeSyntheticEdge('E_CB', 'N_C', 'N_B'),
      makeSyntheticEdge('E_BA', 'N_B', 'N_A'),
    ];
    const preset = makeSyntheticPreset(['N_A']);
    const dataset = makeSyntheticDataset(nodes, edges, [preset]);
    const simResult = simulateScenario(preset, preset.defaultParams, { dataset });

    const report = analyzeNodePathways(preset, simResult, 'N_C', 8, 5, {
      dataset,
    });

    expect(report.reachabilityStatus).toBe('unreachable');
    expect(report.totalDiscoveredPaths).toBe(0);
    expect(report.truncatedPathCount).toBe(0);
    expect(report.pathways).toEqual([]);
  });

  it('3. Cycle safety and no repeated nodes: handles cyclic graphs without infinite loops or repeated nodes in any path', () => {
    // Graph with cycle: N0 -> N1 -> N2 -> N0 and N1 -> N2 -> N3, plus self-loop N1 -> N1
    const nodes = [
      makeSyntheticNode('N0', 0),
      makeSyntheticNode('N1', 1),
      makeSyntheticNode('N2', 2),
      makeSyntheticNode('N3', 3),
    ];
    const edges = [
      makeSyntheticEdge('E_0_1', 'N0', 'N1', { lagWeeks: 1 }),
      makeSyntheticEdge('E_1_1', 'N1', 'N1', { lagWeeks: 1 }), // self-loop
      makeSyntheticEdge('E_1_2', 'N1', 'N2', { lagWeeks: 1 }),
      makeSyntheticEdge('E_2_0', 'N2', 'N0', { lagWeeks: 1 }), // cycle back to origin
      makeSyntheticEdge('E_2_1', 'N2', 'N1', { lagWeeks: 1 }), // 2-cycle
      makeSyntheticEdge('E_2_3', 'N2', 'N3', { lagWeeks: 2 }),
      makeSyntheticEdge('E_1_3', 'N1', 'N3', { lagWeeks: 1 }),
    ];
    const preset = makeSyntheticPreset(['N0']);
    const dataset = makeSyntheticDataset(nodes, edges, [preset]);
    const simResult = simulateScenario(preset, preset.defaultParams, { dataset });

    const report = analyzeNodePathways(preset, simResult, 'N3', 8, 10, {
      dataset,
    });

    expect(report.reachabilityStatus).toBe('reachable');
    // Only 2 simple directed paths exist: N0->N1->N3 and N0->N1->N2->N3
    expect(report.totalDiscoveredPaths).toBe(2);
    expect(report.pathways).toHaveLength(2);

    for (const pathway of report.pathways) {
      const nodeIds = pathway.steps.map((s) => s.nodeId);
      const uniqueIds = new Set(nodeIds);
      expect(uniqueIds.size).toBe(nodeIds.length);
    }
  });

  it('4. Deterministic path ranking: orders pathways by pathScore desc, totalLagWeeks asc, hop count asc, and lexicographical key', () => {
    const nodes = [
      makeSyntheticNode('ORIG', 0),
      makeSyntheticNode('HIGH_FAST', 1),
      makeSyntheticNode('LOW_SLOW', 1),
      makeSyntheticNode('TIE_A', 1),
      makeSyntheticNode('TIE_B', 1),
      makeSyntheticNode('TGT', 2),
    ];
    const edges = [
      // Strong, low-lag path
      makeSyntheticEdge('E_O_HF', 'ORIG', 'HIGH_FAST', {
        weight: 0.9,
        criticality: 0.95,
        lagWeeks: 1,
      }),
      makeSyntheticEdge('E_HF_T', 'HIGH_FAST', 'TGT', {
        weight: 0.9,
        criticality: 0.95,
        lagWeeks: 1,
      }),
      // Weak, high-lag path
      makeSyntheticEdge('E_O_LS', 'ORIG', 'LOW_SLOW', {
        weight: 0.15,
        criticality: 0.2,
        lagWeeks: 3,
      }),
      makeSyntheticEdge('E_LS_T', 'LOW_SLOW', 'TGT', {
        weight: 0.15,
        criticality: 0.2,
        lagWeeks: 3,
      }),
      // Two identical-parameter paths to verify deterministic lexicographical tie-breaking
      makeSyntheticEdge('E_O_TA', 'ORIG', 'TIE_A', {
        weight: 0.5,
        criticality: 0.5,
        lagWeeks: 2,
      }),
      makeSyntheticEdge('E_TA_T', 'TIE_A', 'TGT', {
        weight: 0.5,
        criticality: 0.5,
        lagWeeks: 1,
      }),
      makeSyntheticEdge('E_O_TB', 'ORIG', 'TIE_B', {
        weight: 0.5,
        criticality: 0.5,
        lagWeeks: 2,
      }),
      makeSyntheticEdge('E_TB_T', 'TIE_B', 'TGT', {
        weight: 0.5,
        criticality: 0.5,
        lagWeeks: 1,
      }),
    ];
    const preset = makeSyntheticPreset(['ORIG']);
    const dataset = makeSyntheticDataset(nodes, edges, [preset]);
    const simResult = simulateScenario(preset, preset.defaultParams, { dataset });

    const report1 = analyzeNodePathways(preset, simResult, 'TGT', 10, 10, {
      dataset,
    });
    const report2 = analyzeNodePathways(preset, simResult, 'TGT', 10, 10, {
      dataset,
    });

    expect(report1).toEqual(report2);
    expect(report1.pathways).toHaveLength(4);
    expect(report1.pathways[0]!.steps[1]!.nodeId).toBe('HIGH_FAST');
    expect(report1.pathways[1]!.steps[1]!.nodeId).toBe('TIE_A');
    expect(report1.pathways[2]!.steps[1]!.nodeId).toBe('TIE_B');
    expect(report1.pathways[3]!.steps[1]!.nodeId).toBe('LOW_SLOW');
  });

  it('5. Cumulative lag across multiple edges: accurately sums integer transit lags hop-by-hop', () => {
    const nodes = [
      makeSyntheticNode('H0', 0),
      makeSyntheticNode('H1', 1),
      makeSyntheticNode('H2', 2),
      makeSyntheticNode('H3', 3),
    ];
    const edges = [
      makeSyntheticEdge('E1', 'H0', 'H1', { lagWeeks: 2 }),
      makeSyntheticEdge('E2', 'H1', 'H2', { lagWeeks: 0 }),
      makeSyntheticEdge('E3', 'H2', 'H3', { lagWeeks: 3 }),
    ];
    const preset = makeSyntheticPreset(['H0']);
    const dataset = makeSyntheticDataset(nodes, edges, [preset]);
    const simResult = simulateScenario(preset, preset.defaultParams, { dataset });

    const report = analyzeNodePathways(preset, simResult, 'H3', 8, 5, {
      dataset,
    });

    expect(report.pathways).toHaveLength(1);
    const pathway = report.pathways[0]!;
    expect(pathway.totalLagWeeks).toBe(5);
    expect(pathway.steps.map((s) => s.cumulativeLagWeeks)).toEqual([0, 2, 2, 5]);
    expect(pathway.steps.map((s) => s.lagWeeksFromOrigin)).toEqual([0, 2, 2, 5]);
  });

  it('6. Maximum path length of 8 edges: discovers 8-edge paths and rejects 9-edge paths', () => {
    expect(MAX_PATH_HOPS).toBe(8);

    // Build a 10-node linear chain C0 -> C1 -> ... -> C9 (9 edges)
    const nodes: NetworkNode[] = [];
    const edges: DependencyEdge[] = [];
    for (let i = 0; i <= 9; i += 1) {
      nodes.push(makeSyntheticNode(`C${i}`, i));
      if (i > 0) {
        edges.push(
          makeSyntheticEdge(`EC_${i - 1}_${i}`, `C${i - 1}`, `C${i}`, {
            lagWeeks: 1,
          }),
        );
      }
    }
    const preset = makeSyntheticPreset(['C0']);
    const dataset = makeSyntheticDataset(nodes, edges, [preset]);
    const simResult = simulateScenario(preset, preset.defaultParams, { dataset });

    // C8 is exactly 8 edges from C0 -> reachable
    const report8 = analyzeNodePathways(preset, simResult, 'C8', 12, 5, {
      dataset,
    });
    expect(report8.reachabilityStatus).toBe('reachable');
    expect(report8.totalDiscoveredPaths).toBe(1);
    expect(report8.pathways[0]!.steps).toHaveLength(9); // 9 nodes = 8 edges

    // C9 is 9 edges from C0 -> exceeds MAX_PATH_HOPS (8) -> unreachable
    const report9 = analyzeNodePathways(preset, simResult, 'C9', 12, 5, {
      dataset,
    });
    expect(report9.reachabilityStatus).toBe('unreachable');
    expect(report9.totalDiscoveredPaths).toBe(0);
    expect(report9.pathways).toHaveLength(0);
  });

  it('7. Accurate total, displayed, and truncated path counts: distinguishes ordinary display truncation from search-limit truncation', () => {
    // Build a parallel diamond graph with 7 distinct 2-hop paths from O to T
    const nodes: NetworkNode[] = [
      makeSyntheticNode('O', 0),
      makeSyntheticNode('T', 2),
    ];
    const edges: DependencyEdge[] = [];
    for (let i = 1; i <= 7; i += 1) {
      const midId = `M${i}`;
      nodes.push(makeSyntheticNode(midId, 1));
      edges.push(
        makeSyntheticEdge(`E_O_${midId}`, 'O', midId, {
          weight: 0.9 - i * 0.05,
          lagWeeks: 1,
        }),
      );
      edges.push(
        makeSyntheticEdge(`E_${midId}_T`, midId, 'T', {
          weight: 0.9 - i * 0.05,
          lagWeeks: 1,
        }),
      );
    }
    const preset = makeSyntheticPreset(['O']);
    const dataset = makeSyntheticDataset(nodes, edges, [preset]);
    const simResult = simulateScenario(preset, preset.defaultParams, { dataset });

    // Case A: Ordinary display truncation (7 discovered paths, maxPaths = 3 -> 4 truncated, searchLimitReached = false)
    const displayTruncReport = analyzeNodePathways(preset, simResult, 'T', 6, 3, {
      dataset,
    });
    expect(displayTruncReport.totalDiscoveredPaths).toBe(7);
    expect(displayTruncReport.pathways).toHaveLength(3);
    expect(displayTruncReport.truncatedPathCount).toBe(4);
    expect(displayTruncReport.searchLimitReached).toBe(false);
    expect(displayTruncReport.reachabilityReason).toContain(
      'Display truncation: exhaustively enumerated all 7 simple directed pathways',
    );

    // Case B: Search-limit truncation (maxSearchPaths = 4, maxPaths = 2 -> stops at 4, displays 2, searchLimitReached = true)
    const searchTruncReport = analyzeNodePathways(preset, simResult, 'T', 6, 2, {
      dataset,
      maxSearchPaths: 4,
    });
    expect(searchTruncReport.totalDiscoveredPaths).toBe(4);
    expect(searchTruncReport.pathways).toHaveLength(2);
    expect(searchTruncReport.truncatedPathCount).toBe(2);
    expect(searchTruncReport.searchLimitReached).toBe(true);
    expect(searchTruncReport.reachabilityReason).toContain(
      'Search-limit truncation',
    );
    expect(searchTruncReport.reachabilityReason).toContain(
      'additional paths beyond the search cap were not enumerated',
    );
  });

  it('8. Unreachable targets and invalid targets: returns unreachable status and empty pathways without crashing', () => {
    const hormuzPreset = PRESETS.find((p) => p.id === 'preset_hormuz_energy')!;
    const simResult = simulateScenario(hormuzPreset, hormuzPreset.defaultParams);

    // Invalid / unknown target node ID
    const invalidReport = analyzeNodePathways(
      hormuzPreset,
      simResult,
      'non_existent_node_999',
      8,
      5,
    );
    expect(invalidReport.reachabilityStatus).toBe('unreachable');
    expect(invalidReport.totalDiscoveredPaths).toBe(0);
    expect(invalidReport.truncatedPathCount).toBe(0);
    expect(invalidReport.pathways).toEqual([]);
    expect(invalidReport.reachabilityReason).toContain('does not exist');

    // Unreachable valid node (e.g. another chokepoint chk_panama has no incoming edges from chk_hormuz)
    const unreachableReport = analyzeNodePathways(
      hormuzPreset,
      simResult,
      'chk_panama',
      8,
      5,
    );
    expect(unreachableReport.reachabilityStatus).toBe('unreachable');
    expect(unreachableReport.totalDiscoveredPaths).toBe(0);
    expect(unreachableReport.truncatedPathCount).toBe(0);
    expect(unreachableReport.pathways).toEqual([]);
    expect(unreachableReport.reachabilityReason).toContain(
      'No directed upstream supply-chain path',
    );
  });

  it('9. Origin-node and zero-shock behavior: classifies shock origins as origin_node and yields 0 pathScore under zero shock', () => {
    const hormuzPreset = PRESETS.find((p) => p.id === 'preset_hormuz_energy')!;
    const activeResult = simulateScenario(
      hormuzPreset,
      hormuzPreset.defaultParams,
    );

    const originReport = analyzeNodePathways(
      hormuzPreset,
      activeResult,
      'chk_hormuz',
      8,
      5,
    );
    expect(originReport.reachabilityStatus).toBe('origin_node');
    expect(originReport.totalDiscoveredPaths).toBe(1);
    expect(originReport.truncatedPathCount).toBe(0);
    expect(originReport.pathways).toHaveLength(1);
    expect(originReport.pathways[0]!.totalLagWeeks).toBe(0);
    expect(originReport.pathways[0]!.steps).toHaveLength(1);
    expect(originReport.pathways[0]!.steps[0]!.cumulativeLagWeeks).toBe(0);
    expect(originReport.pathways[0]!.pathScore).toBeGreaterThan(0);

    // Zero-shock simulation (shockSeverityPct = 0)
    const zeroShockResult = simulateScenario(hormuzPreset, {
      ...hormuzPreset.defaultParams,
      shockSeverityPct: 0,
    });

    const zeroOriginReport = analyzeNodePathways(
      hormuzPreset,
      zeroShockResult,
      'chk_hormuz',
      8,
      5,
    );
    expect(zeroOriginReport.reachabilityStatus).toBe('origin_node');
    expect(zeroOriginReport.pathways[0]!.pathScore).toBe(0);
    expect(zeroOriginReport.pathways[0]!.steps[0]!.targetRei).toBe(0);

    const zeroDownstreamReport = analyzeNodePathways(
      hormuzPreset,
      zeroShockResult,
      'con_groceries',
      8,
      5,
    );
    expect(zeroDownstreamReport.reachabilityStatus).toBe('reachable');
    expect(zeroDownstreamReport.totalDiscoveredPaths).toBeGreaterThan(0);
    for (const p of zeroDownstreamReport.pathways) {
      expect(p.pathScore).toBe(0);
      for (const step of p.steps) {
        expect(step.targetRei).toBe(0);
        expect(step.reiAtWeek).toBe(0);
        expect(step.edgeActiveBypassShare).toBe(0);
      }
    }
  });

  it('10. Week-specific step metrics and bypass values: exposes accurate sourceInventoryDays, targetInventoryDays, targetRei, and edgeActiveBypassShare', () => {
    const panamaPreset = PRESETS.find((p) => p.id === 'preset_panama_canal')!;
    const simResult = simulateScenario(panamaPreset, {
      ...panamaPreset.defaultParams,
      shockSeverityPct: 0.85,
      rerouteCapacityShare: 0.9,
      inventoryBufferScale: 1.0,
    });

    const week = 10;
    const report = analyzeNodePathways(
      panamaPreset,
      simResult,
      'con_groceries',
      week,
      5,
    );

    expect(report.reachabilityStatus).toBe('reachable');
    expect(report.pathways.length).toBeGreaterThan(0);

    let sawActiveBypass = false;

    for (const pathway of report.pathways) {
      let runningLag = 0;
      for (let i = 0; i < pathway.steps.length; i += 1) {
        const step = pathway.steps[i]!;
        const expectedNodeState = simResult.nodeStatesByWeek[week]![step.nodeId]!;

        expect(step.targetRei).toBe(expectedNodeState.relativeExposureIndex);
        expect(step.reiAtWeek).toBe(expectedNodeState.relativeExposureIndex);
        expect(step.targetInventoryDays).toBe(
          expectedNodeState.remainingInventoryDays,
        );

        if (i === 0) {
          expect(step.cumulativeLagWeeks).toBe(0);
          expect(step.sourceInventoryDays).toBe(
            expectedNodeState.remainingInventoryDays,
          );
          expect(step.edgeActiveBypassShare).toBe(0);
        } else {
          const prevStep = pathway.steps[i - 1]!;
          const edge = EDGES.find((e) => e.id === step.edgeId)!;
          const expectedEdgeState = simResult.edgeStatesByWeek[week]![edge.id]!;
          const expectedSourceState =
            simResult.nodeStatesByWeek[week]![prevStep.nodeId]!;

          runningLag += Math.max(0, Math.round(edge.transitLagWeeks.value));
          expect(step.cumulativeLagWeeks).toBe(runningLag);
          expect(step.lagWeeksFromOrigin).toBe(runningLag);
          expect(step.sourceInventoryDays).toBe(
            expectedSourceState.remainingInventoryDays,
          );
          expect(step.edgeActiveBypassShare).toBe(
            expectedEdgeState.activeBypassShare,
          );

          if (step.edgeActiveBypassShare > 0) {
            sawActiveBypass = true;
          }
        }
      }
    }

    expect(sawActiveBypass).toBe(true);
  });

  it('11. Defensive handling of invalid maxPaths and week inputs: clamps out-of-range weeks/counts and handles NaN/Infinity safely', () => {
    const hormuzPreset = PRESETS.find((p) => p.id === 'preset_hormuz_energy')!;
    const simResult = simulateScenario(hormuzPreset, hormuzPreset.defaultParams);

    expect(normalizeMaxPaths(undefined)).toBe(5);
    expect(normalizeMaxPaths(Number.NaN)).toBe(5);
    expect(normalizeMaxPaths(Number.POSITIVE_INFINITY)).toBe(5);
    expect(normalizeMaxPaths(-4)).toBe(0);
    expect(normalizeMaxPaths(0)).toBe(0);
    expect(normalizeMaxPaths(3.6)).toBe(4);
    expect(normalizeMaxPaths(500)).toBe(50);

    // Negative week clamps to 0; NaN maxPaths defaults to 5
    const negWeekReport = analyzeNodePathways(
      hormuzPreset,
      simResult,
      'con_groceries',
      -15,
      Number.NaN,
    );
    expect(negWeekReport.week).toBe(0);
    expect(negWeekReport.pathways.length).toBeLessThanOrEqual(5);
    expect(negWeekReport.pathways.length).toBeGreaterThan(0);

    // Excessive week clamps to 26; negative maxPaths clamps to 0 displayed pathways
    const highWeekZeroMaxReport = analyzeNodePathways(
      hormuzPreset,
      simResult,
      'con_groceries',
      999,
      -3,
    );
    expect(highWeekZeroMaxReport.week).toBe(26);
    expect(highWeekZeroMaxReport.pathways).toHaveLength(0);
    expect(highWeekZeroMaxReport.truncatedPathCount).toBe(
      highWeekZeroMaxReport.totalDiscoveredPaths,
    );

    // NaN week falls back to default week 8
    const nanWeekReport = analyzeNodePathways(
      hormuzPreset,
      simResult,
      'con_groceries',
      Number.NaN,
      2.2,
    );
    expect(nanWeekReport.week).toBe(normalizeWeekIndex(Number.NaN));
    expect(nanWeekReport.pathways).toHaveLength(2);

    // Direct traceCausalPathways also handles negative maxPaths and out-of-range weeks safely
    const directTrace = traceCausalPathways({
      shockOriginNodeIds: hormuzPreset.shockOriginNodeIds,
      targetNodeId: 'con_groceries',
      week: -5,
      nodeMap: new Map(NODES.map((n) => [n.id, n])),
      outgoingEdgesByNodeId: new Map(),
      normalizedWeightByEdgeId: new Map(),
      nodeStatesAtWeek: {},
      edgeStatesAtWeek: {},
      shockSeverityPct: 0.6,
      maxPaths: -2,
    });
    expect(directTrace).toEqual([]);
  });

  it('12. Existing simulation behavior unchanged: preserves deterministic node/edge weekly states and summary metrics across all presets', () => {
    for (const preset of PRESETS) {
      const run1 = simulateScenario(preset, preset.defaultParams);
      const run2 = simulateScenario(preset, preset.defaultParams);

      expect(run1).toEqual(run2);
      expect(run1.horizonWeeks).toBe(27);
      expect(run1.overallPeakSummary.peakNetworkRei).toBeGreaterThan(0);
      expect(run1.overallPeakSummary.peakNetworkRei).toBeLessThanOrEqual(100);

      // Verify topPathwaysByTargetAndWeek in SimulationResult matches analyzeNodePathways top-3 slice
      const sampleTarget = preset.featuredCausalNodeIds[
        preset.featuredCausalNodeIds.length - 1
      ]!;
      const analyzedTop3 = analyzeNodePathways(
        preset,
        run1,
        sampleTarget,
        10,
        3,
      );
      expect(run1.topPathwaysByTargetAndWeek[10]?.[sampleTarget]).toEqual(
        analyzedTop3.pathways,
      );
    }
  });
});
