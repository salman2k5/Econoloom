import { describe, expect, it } from 'vitest';
import { EDGES, NODES, PRESETS } from '../data';
import {
  DEFAULT_SCENARIO_PARAMETERS,
  normalizeScenarioParameters,
  normalizeWeekIndex,
  SCENARIO_PARAMETER_BOUNDS,
} from '../engine/normalizeInputs';
import { traceCausalPathways } from '../engine/pathwayTracer';
import {
  SIMULATION_HORIZON_WEEKS,
  simulateScenario,
} from '../engine/simulateScenario';
import type { DependencyEdge, NetworkNode, ScenarioPreset } from '../types/domain';

describe('EconoLoom Stage 3 Deterministic Simulation Engine', () => {
  it('1. Zero-shock identity: shockSeverityPct = 0 yields 0 REI, 0 CPI, and full baseline inventory across all 48 nodes and 27 weeks', () => {
    for (const preset of PRESETS) {
      const zeroSeverityRun = simulateScenario(preset, {
        ...preset.defaultParams,
        shockSeverityPct: 0,
      });

      expect(zeroSeverityRun.overallPeakSummary.peakNetworkRei).toBe(0);
      expect(zeroSeverityRun.overallPeakSummary.firstConsumerImpactWeek).toBeNull();
      expect(zeroSeverityRun.horizonWeeks).toBe(27);

      for (let w = 0; w <= SIMULATION_HORIZON_WEEKS; w += 1) {
        const summary = zeroSeverityRun.summaryByWeek[w]!;
        expect(summary.peakNetworkRei).toBe(0);
        expect(summary.severelyExposedCount).toBe(0);

        const nodeStates = zeroSeverityRun.nodeStatesByWeek[w]!;
        for (const node of NODES) {
          const state = nodeStates[node.id]!;
          expect(state.relativeExposureIndex).toBe(0);
          expect(state.directRei).toBe(0);
          expect(state.indirectRei).toBe(0);
          expect(state.costPressureIndex).toBe(0);
          expect(state.rawInputShortfall).toBe(0);
          expect(state.unbufferedShortfall).toBe(0);
          expect(state.severityBand).toBe('Baseline');
          const expectedDays =
            Math.round(
              node.baselineInventoryDays.value *
                preset.defaultParams.inventoryBufferScale *
                10,
            ) / 10;
          expect(state.remainingInventoryDays).toBe(expectedDays);
        }
      }
    }
  });

  it('2. Repeatability: running the same preset and parameters twice yields deeply equal output', () => {
    for (const preset of PRESETS) {
      const first = simulateScenario(preset, preset.defaultParams);
      const second = simulateScenario(preset, { ...preset.defaultParams });
      expect(first).toEqual(second);
    }
  });

  it('3. Bounds and finiteness: across all presets and extreme parameter combinations, no node or edge metric is NaN, infinite, or out of bounds', () => {
    const extremeConfigs = [
      {
        shockSeverityPct: 0,
        durationDays: 7,
        inventoryBufferScale: 0.5,
        rerouteCapacityShare: 0,
        substitutionFlexibility: 0,
        shippingCostMultiplier: 1.0,
      },
      {
        shockSeverityPct: 1.0,
        durationDays: 180,
        inventoryBufferScale: 0.5,
        rerouteCapacityShare: 0,
        substitutionFlexibility: 0,
        shippingCostMultiplier: 4.0,
      },
      {
        shockSeverityPct: 1.0,
        durationDays: 180,
        inventoryBufferScale: 2.0,
        rerouteCapacityShare: 1.0,
        substitutionFlexibility: 1.0,
        shippingCostMultiplier: 4.0,
      },
    ];

    for (const preset of PRESETS) {
      for (const params of [preset.defaultParams, ...extremeConfigs]) {
        const result = simulateScenario(preset, params);

        expect(Number.isFinite(result.overallPeakSummary.peakNetworkRei)).toBe(true);
        expect(result.overallPeakSummary.peakNetworkRei).toBeGreaterThanOrEqual(0);
        expect(result.overallPeakSummary.peakNetworkRei).toBeLessThanOrEqual(100);

        for (let w = 0; w <= SIMULATION_HORIZON_WEEKS; w += 1) {
          const nodeStates = result.nodeStatesByWeek[w]!;
          const edgeStates = result.edgeStatesByWeek[w]!;

          for (const node of NODES) {
            const ns = nodeStates[node.id]!;
            expect(Number.isFinite(ns.relativeExposureIndex)).toBe(true);
            expect(ns.relativeExposureIndex).toBeGreaterThanOrEqual(0);
            expect(ns.relativeExposureIndex).toBeLessThanOrEqual(100);

            expect(Number.isFinite(ns.costPressureIndex)).toBe(true);
            expect(ns.costPressureIndex).toBeGreaterThanOrEqual(0);
            expect(ns.costPressureIndex).toBeLessThanOrEqual(100);

            expect(ns.rawInputShortfall).toBeGreaterThanOrEqual(0);
            expect(ns.rawInputShortfall).toBeLessThanOrEqual(1);
            expect(ns.unbufferedShortfall).toBeGreaterThanOrEqual(0);
            expect(ns.unbufferedShortfall).toBeLessThanOrEqual(1);
            expect(ns.inventoryCoverageRatio).toBeGreaterThanOrEqual(0);
            expect(ns.inventoryCoverageRatio).toBeLessThanOrEqual(1);
            expect(ns.effectiveSubstitution).toBeGreaterThanOrEqual(0);
            expect(ns.effectiveSubstitution).toBeLessThanOrEqual(1);
            expect(ns.remainingInventoryDays).toBeGreaterThanOrEqual(0);
          }

          for (const edge of EDGES) {
            const es = edgeStates[edge.id]!;
            expect(Number.isFinite(es.transmittedDisruption)).toBe(true);
            expect(es.transmittedDisruption).toBeGreaterThanOrEqual(0);
            expect(es.transmittedDisruption).toBeLessThanOrEqual(1);
            expect(es.activeBypassShare).toBeGreaterThanOrEqual(0);
            expect(es.activeBypassShare).toBeLessThanOrEqual(1);
          }
        }
      }
    }
  });

  it('4. Directionality: upstream parents or unconnected origins never receive backward shock transmission', () => {
    const basePreset = PRESETS[1]!;
    const midStreamPreset: ScenarioPreset = {
      ...basePreset,
      shockOriginNodeIds: ['ind_automotive'],
    };

    const result = simulateScenario(midStreamPreset, {
      shockSeverityPct: 0.8,
      durationDays: 90,
      inventoryBufferScale: 1.0,
      rerouteCapacityShare: 0,
      substitutionFlexibility: 0,
      shippingCostMultiplier: 2.0,
    });

    const upstreamParentIds = [
      'com_auto_mcu',
      'ind_foundry',
      'chk_taiwan_fabs',
      'chk_hormuz',
      'chk_panama',
    ];

    for (let w = 0; w <= SIMULATION_HORIZON_WEEKS; w += 1) {
      const nodeStates = result.nodeStatesByWeek[w]!;
      for (const parentId of upstreamParentIds) {
        const state = nodeStates[parentId]!;
        expect(state.relativeExposureIndex).toBe(0);
        expect(state.costPressureIndex).toBe(0);
        expect(state.rawInputShortfall).toBe(0);
      }
    }

    // Meanwhile downstream consumer basket con_vehicles must become exposed
    const week10Vehicles = result.nodeStatesByWeek[10]!['con_vehicles']!;
    expect(week10Vehicles.relativeExposureIndex).toBeGreaterThan(0);
  });

  it('5. Transit lags: downstream nodes do not show transmitted disruption before cumulative path lag has elapsed', () => {
    const taiwanPreset = PRESETS.find((p) => p.id === 'preset_taiwan_semi')!;
    const result = simulateScenario(taiwanPreset, taiwanPreset.defaultParams);

    for (const node of NODES) {
      if (taiwanPreset.shockOriginNodeIds.includes(node.id)) continue;
      const pathways = result.topPathwaysByTargetAndWeek[12]?.[node.id] ?? [];

      if (pathways.length === 0) {
        for (let w = 0; w <= SIMULATION_HORIZON_WEEKS; w += 1) {
          expect(result.nodeStatesByWeek[w]![node.id]!.rawInputShortfall).toBe(0);
          expect(
            result.nodeStatesByWeek[w]![node.id]!.relativeExposureIndex,
          ).toBe(0);
        }
      } else {
        const minLagWeeks = Math.min(...pathways.map((p) => p.totalLagWeeks));
        // Shock starts at Week 1 at origin, so a path with cumulative lag L cannot arrive before Week 1 + L
        for (let w = 0; w < 1 + minLagWeeks && w <= SIMULATION_HORIZON_WEEKS; w += 1) {
          expect(result.nodeStatesByWeek[w]![node.id]!.rawInputShortfall).toBe(0);
          expect(
            result.nodeStatesByWeek[w]![node.id]!.relativeExposureIndex,
          ).toBe(0);
        }
      }
    }
  });

  it('6. Inventory effects: increasing inventoryBufferScale delays or reduces downstream shortfall and REI during the shock', () => {
    const hormuzPreset = PRESETS.find((p) => p.id === 'preset_hormuz_energy')!;

    const lowBufferResult = simulateScenario(hormuzPreset, {
      ...hormuzPreset.defaultParams,
      inventoryBufferScale: 0.5,
    });

    const highBufferResult = simulateScenario(hormuzPreset, {
      ...hormuzPreset.defaultParams,
      inventoryBufferScale: 2.0,
    });

    for (const nodeId of ['ind_refining', 'ind_fertilizer', 'con_fuel_heat']) {
      for (const week of [4, 6, 8, 10]) {
        const lowState = lowBufferResult.nodeStatesByWeek[week]![nodeId]!;
        const highState = highBufferResult.nodeStatesByWeek[week]![nodeId]!;
        expect(highState.unbufferedShortfall).toBeLessThan(
          lowState.unbufferedShortfall,
        );
        expect(highState.relativeExposureIndex).toBeLessThan(
          lowState.relativeExposureIndex,
        );
      }
    }
  });

  it('7. Rerouting and substitution specificity: rerouting only affects bypass-capable corridors after penalty lag, and substitution reduces exposure after ramp', () => {
    const hormuzPreset = PRESETS.find((p) => p.id === 'preset_hormuz_energy')!;
    const noRerouteHormuz = simulateScenario(hormuzPreset, {
      ...hormuzPreset.defaultParams,
      rerouteCapacityShare: 0,
    });
    const fullRerouteHormuz = simulateScenario(hormuzPreset, {
      ...hormuzPreset.defaultParams,
      rerouteCapacityShare: 1.0,
    });

    // Edge e_02 (chk_hormuz -> com_crude) has bypassAvailable: true, bypassTransitPenaltyWeeks: 1
    // Edge e_03 (chk_hormuz -> com_lng) has bypassAvailable: false
    const week6Edge02NoReroute = noRerouteHormuz.edgeStatesByWeek[6]!['e_02']!;
    const week6Edge02FullReroute = fullRerouteHormuz.edgeStatesByWeek[6]!['e_02']!;
    expect(week6Edge02FullReroute.activeBypassShare).toBeGreaterThan(0);
    expect(week6Edge02FullReroute.transmittedDisruption).toBeLessThan(
      week6Edge02NoReroute.transmittedDisruption,
    );

    const week6Edge03NoReroute = noRerouteHormuz.edgeStatesByWeek[6]!['e_03']!;
    const week6Edge03FullReroute = fullRerouteHormuz.edgeStatesByWeek[6]!['e_03']!;
    expect(week6Edge03FullReroute.activeBypassShare).toBe(0);
    expect(week6Edge03FullReroute.transmittedDisruption).toBe(
      week6Edge03NoReroute.transmittedDisruption,
    );

    // Substitution flexibility on Taiwan preset
    const taiwanPreset = PRESETS.find((p) => p.id === 'preset_taiwan_semi')!;
    const noSubTaiwan = simulateScenario(taiwanPreset, {
      ...taiwanPreset.defaultParams,
      substitutionFlexibility: 0,
    });
    const highSubTaiwan = simulateScenario(taiwanPreset, {
      ...taiwanPreset.defaultParams,
      substitutionFlexibility: 1.0,
    });

    const w8NoSub = noSubTaiwan.nodeStatesByWeek[8]!['ind_automotive']!;
    const w8HighSub = highSubTaiwan.nodeStatesByWeek[8]!['ind_automotive']!;
    expect(w8HighSub.effectiveSubstitution).toBeGreaterThan(0);
    expect(w8HighSub.relativeExposureIndex).toBeLessThan(
      w8NoSub.relativeExposureIndex,
    );
  });

  it('8. Severity and duration monotonicity: increasing shockSeverityPct or durationDays monotonically increases or maintains exposure across all nodes and weeks', () => {
    for (const preset of PRESETS) {
      const mildSeverity = simulateScenario(preset, {
        ...preset.defaultParams,
        shockSeverityPct: 0.3,
      });
      const severeSeverity = simulateScenario(preset, {
        ...preset.defaultParams,
        shockSeverityPct: 0.85,
      });

      expect(severeSeverity.overallPeakSummary.peakNetworkRei).toBeGreaterThanOrEqual(
        mildSeverity.overallPeakSummary.peakNetworkRei,
      );

      for (let w = 0; w <= SIMULATION_HORIZON_WEEKS; w += 1) {
        for (const node of NODES) {
          const mildRei =
            mildSeverity.nodeStatesByWeek[w]![node.id]!.relativeExposureIndex;
          const severeRei =
            severeSeverity.nodeStatesByWeek[w]![node.id]!.relativeExposureIndex;
          expect(severeRei).toBeGreaterThanOrEqual(mildRei);
        }
      }

      const shortDuration = simulateScenario(preset, {
        ...preset.defaultParams,
        durationDays: 28,
      });
      const longDuration = simulateScenario(preset, {
        ...preset.defaultParams,
        durationDays: 120,
      });

      expect(longDuration.overallPeakSummary.peakNetworkRei).toBeGreaterThanOrEqual(
        shortDuration.overallPeakSummary.peakNetworkRei,
      );

      for (let w = 0; w <= SIMULATION_HORIZON_WEEKS; w += 1) {
        for (const node of NODES) {
          const shortRei =
            shortDuration.nodeStatesByWeek[w]![node.id]!.relativeExposureIndex;
          const longRei =
            longDuration.nodeStatesByWeek[w]![node.id]!.relativeExposureIndex;
          expect(longRei).toBeGreaterThanOrEqual(shortRei);
        }
      }
    }
  });

  it('9. Direct and indirect reconciliation: directRei and indirectRei are non-negative and sum exactly to relativeExposureIndex', () => {
    for (const preset of PRESETS) {
      const result = simulateScenario(preset, preset.defaultParams);

      for (let w = 0; w <= SIMULATION_HORIZON_WEEKS; w += 1) {
        const nodeStates = result.nodeStatesByWeek[w]!;
        for (const node of NODES) {
          const state = nodeStates[node.id]!;
          expect(state.directRei).toBeGreaterThanOrEqual(0);
          expect(state.indirectRei).toBeGreaterThanOrEqual(0);
          const sum = Math.round((state.directRei + state.indirectRei) * 10) / 10;
          expect(sum).toBe(state.relativeExposureIndex);

          const hasDirectOriginEdge = EDGES.some(
            (e) =>
              e.targetNodeId === node.id &&
              preset.shockOriginNodeIds.includes(e.sourceNodeId),
          );

          if (preset.shockOriginNodeIds.includes(node.id)) {
            expect(state.directRei).toBe(state.relativeExposureIndex);
            expect(state.indirectRei).toBe(0);
          } else if (!hasDirectOriginEdge) {
            expect(state.directRei).toBe(0);
            expect(state.indirectRei).toBe(state.relativeExposureIndex);
          }
        }
      }
    }
  });

  it('10. Pathway tracing: valid connected edges, accurate cumulative lag sums, bottleneck metadata, deterministic ranking, and cycle/unreachable safety', () => {
    const hormuzPreset = PRESETS.find((p) => p.id === 'preset_hormuz_energy')!;
    const result = simulateScenario(hormuzPreset, hormuzPreset.defaultParams);
    const pathways =
      result.topPathwaysByTargetAndWeek[10]?.['con_groceries'] ?? [];

    expect(pathways.length).toBeGreaterThan(0);
    expect(pathways.length).toBeLessThanOrEqual(3);

    for (let i = 0; i < pathways.length; i += 1) {
      const p = pathways[i]!;
      expect(p.steps[0]!.nodeId).toBe('chk_hormuz');
      expect(p.steps[p.steps.length - 1]!.nodeId).toBe('con_groceries');
      expect(p.bottleneckSummary.length).toBeGreaterThan(0);
      expect(p.bottleneckEdgeId.length).toBeGreaterThan(0);

      const finalStep = p.steps[p.steps.length - 1]!;
      expect(p.totalLagWeeks).toBe(finalStep.lagWeeksFromOrigin);

      if (i > 0) {
        expect(pathways[i - 1]!.pathScore).toBeGreaterThanOrEqual(p.pathScore);
      }
    }

    // Build helper maps for direct traceCausalPathways calls (unreachable & cyclic tests)
    const nodeMap = new Map<string, NetworkNode>(NODES.map((n) => [n.id, n]));
    const outgoingEdgesByNodeId = new Map<string, DependencyEdge[]>();
    const normalizedWeightByEdgeId = new Map<string, number>();
    for (const n of NODES) outgoingEdgesByNodeId.set(n.id, []);
    for (const e of EDGES) {
      outgoingEdgesByNodeId.get(e.sourceNodeId)?.push(e);
      normalizedWeightByEdgeId.set(e.id, e.dependencyWeight.value);
    }

    const unreachable = traceCausalPathways({
      shockOriginNodeIds: ['con_vehicles'],
      targetNodeId: 'chk_hormuz',
      week: 8,
      nodeMap,
      outgoingEdgesByNodeId,
      normalizedWeightByEdgeId,
      nodeStatesAtWeek: result.nodeStatesByWeek[8]!,
      edgeStatesAtWeek: result.edgeStatesByWeek[8]!,
      shockSeverityPct: 0.65,
    });
    expect(unreachable).toEqual([]);

    // Synthetic cyclic graph does not infinite-loop
    const cyclicNodes = NODES.slice(0, 3);
    const cyclicNodeMap = new Map<string, NetworkNode>(
      cyclicNodes.map((n) => [n.id, n]),
    );
    const baseEdge = EDGES[0]!;
    const c1: DependencyEdge = {
      ...baseEdge,
      id: 'cyc_1',
      sourceNodeId: cyclicNodes[0]!.id,
      targetNodeId: cyclicNodes[1]!.id,
    };
    const c2: DependencyEdge = {
      ...baseEdge,
      id: 'cyc_2',
      sourceNodeId: cyclicNodes[1]!.id,
      targetNodeId: cyclicNodes[2]!.id,
    };
    const c3: DependencyEdge = {
      ...baseEdge,
      id: 'cyc_3',
      sourceNodeId: cyclicNodes[2]!.id,
      targetNodeId: cyclicNodes[0]!.id,
    };
    const cyclicOutgoing = new Map<string, DependencyEdge[]>([
      [cyclicNodes[0]!.id, [c1]],
      [cyclicNodes[1]!.id, [c2]],
      [cyclicNodes[2]!.id, [c3]],
    ]);
    const cyclicPaths = traceCausalPathways({
      shockOriginNodeIds: [cyclicNodes[0]!.id],
      targetNodeId: cyclicNodes[2]!.id,
      week: 4,
      nodeMap: cyclicNodeMap,
      outgoingEdgesByNodeId: cyclicOutgoing,
      normalizedWeightByEdgeId: new Map([
        ['cyc_1', 0.5],
        ['cyc_2', 0.5],
        ['cyc_3', 0.5],
      ]),
      nodeStatesAtWeek: {},
      edgeStatesAtWeek: {},
      shockSeverityPct: 0.7,
    });
    expect(cyclicPaths).toHaveLength(1);
  });

  it('11. Post-shock recovery: after shock duration ends, origin disruption decays and downstream inventories replenish toward baseline', () => {
    const hormuzPreset = PRESETS.find((p) => p.id === 'preset_hormuz_energy')!;
    const shortShockResult = simulateScenario(hormuzPreset, {
      shockSeverityPct: 0.8,
      durationDays: 21, // 3 weeks active
      inventoryBufferScale: 1.0,
      rerouteCapacityShare: 0.2,
      substitutionFlexibility: 0.3,
      shippingCostMultiplier: 2.0,
    });

    const originW3 =
      shortShockResult.nodeStatesByWeek[3]!['chk_hormuz']!.relativeExposureIndex;
    const originW12 =
      shortShockResult.nodeStatesByWeek[12]!['chk_hormuz']!.relativeExposureIndex;
    const originW26 =
      shortShockResult.nodeStatesByWeek[26]!['chk_hormuz']!.relativeExposureIndex;

    expect(originW3).toBeGreaterThan(50);
    expect(originW12).toBeLessThan(originW3);
    expect(originW26).toBeLessThan(1);

    const refiningW4 = shortShockResult.nodeStatesByWeek[4]!['ind_refining']!;
    const refiningW26 = shortShockResult.nodeStatesByWeek[26]!['ind_refining']!;

    expect(refiningW4.relativeExposureIndex).toBeGreaterThan(0);
    expect(refiningW26.relativeExposureIndex).toBeLessThan(
      refiningW4.relativeExposureIndex,
    );
    expect(refiningW26.remainingInventoryDays).toBeGreaterThan(
      refiningW4.remainingInventoryDays,
    );
  });

  it('12. Input normalization: clamps out-of-range inputs, handles NaN/Infinity, and strictly preserves valid 0.0 values', () => {
    const zeroParams = normalizeScenarioParameters({
      shockSeverityPct: 0,
      durationDays: 7,
      inventoryBufferScale: 0.5,
      rerouteCapacityShare: 0,
      substitutionFlexibility: 0,
      shippingCostMultiplier: 1.0,
    });
    expect(zeroParams.shockSeverityPct).toBe(0);
    expect(zeroParams.rerouteCapacityShare).toBe(0);
    expect(zeroParams.substitutionFlexibility).toBe(0);

    const invalidParams = normalizeScenarioParameters({
      shockSeverityPct: Number.NaN,
      durationDays: Number.POSITIVE_INFINITY,
      inventoryBufferScale: -10,
      rerouteCapacityShare: 99,
      substitutionFlexibility: Number.NEGATIVE_INFINITY,
      shippingCostMultiplier: 999,
    });
    expect(invalidParams.shockSeverityPct).toBe(
      DEFAULT_SCENARIO_PARAMETERS.shockSeverityPct,
    );
    expect(invalidParams.durationDays).toBe(
      DEFAULT_SCENARIO_PARAMETERS.durationDays,
    );
    expect(invalidParams.inventoryBufferScale).toBe(
      SCENARIO_PARAMETER_BOUNDS.inventoryBufferScale.min,
    );
    expect(invalidParams.rerouteCapacityShare).toBe(
      SCENARIO_PARAMETER_BOUNDS.rerouteCapacityShare.max,
    );
    expect(invalidParams.substitutionFlexibility).toBe(
      DEFAULT_SCENARIO_PARAMETERS.substitutionFlexibility,
    );
    expect(invalidParams.shippingCostMultiplier).toBe(
      SCENARIO_PARAMETER_BOUNDS.shippingCostMultiplier.max,
    );

    expect(normalizeWeekIndex(-5)).toBe(0);
    expect(normalizeWeekIndex(99)).toBe(26);
    expect(normalizeWeekIndex(Number.NaN, 8)).toBe(8);
    expect(normalizeWeekIndex(12.6)).toBe(13);
  });

  it('13. Performance benchmark: full 48-node, 78-edge, 26-week simulation completes well under interactive threshold', () => {
    const iterations = 20;
    const start = performance.now();
    for (let i = 0; i < iterations; i += 1) {
      const preset = PRESETS[i % PRESETS.length]!;
      simulateScenario(preset, preset.defaultParams);
    }
    const elapsedMs = performance.now() - start;
    const avgMsPerRun = elapsedMs / iterations;
    expect(avgMsPerRun).toBeLessThan(25);
  });
});
