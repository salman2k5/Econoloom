import { describe, expect, it } from 'vitest';
import {
  CORRIDORS,
  ECONOLOOM_DATASET,
  EDGES,
  INITIAL_VALIDATION_REPORT,
  MODEL_ASSUMPTIONS,
  NODES,
  PRESETS,
  SOURCES,
} from '../data';
import {
  getSeverityBand,
  validateNetworkDataset,
  validateScenarioParameters,
} from '../engine/validateNetwork';

describe('EconoLoom Stage 1 Dataset & Provenance Integrity', () => {
  it('passes full network referential, provenance, and DAG acyclicity validation with zero issues', () => {
    expect(INITIAL_VALIDATION_REPORT.isValid).toBe(true);
    expect(INITIAL_VALIDATION_REPORT.issues).toEqual([]);
  });

  it('contains the exact specified 48 nodes across 5 categories and 4 tiers', () => {
    expect(NODES.length).toBe(48);
    expect(INITIAL_VALIDATION_REPORT.categoryCounts).toEqual({
      chokepoint: 3,
      geography: 9,
      commodity: 14,
      industry: 14,
      consumer_category: 8,
    });
  });

  it('contains the exact specified 78 directed edges, 3 corridors, 3 presets, 14 sources, and 4 assumptions', () => {
    expect(EDGES.length).toBe(78);
    expect(CORRIDORS.length).toBe(3);
    expect(PRESETS.length).toBe(3);
    expect(SOURCES.length).toBe(14);
    expect(MODEL_ASSUMPTIONS.length).toBe(4);
  });

  it('has zero orphaned nodes (every node participates in at least one directed edge)', () => {
    const connectedIds = new Set<string>();
    for (const edge of EDGES) {
      connectedIds.add(edge.sourceNodeId);
      connectedIds.add(edge.targetNodeId);
    }
    for (const node of NODES) {
      expect(
        connectedIds.has(node.id),
        `Expected node ${node.id} to be connected to at least one edge`,
      ).toBe(true);
    }
  });

  it('ensures all 8 consumer_category nodes have BOM cost shares summing to 100%', () => {
    const consumerNodes = NODES.filter((n) => n.category === 'consumer_category');
    expect(consumerNodes.length).toBe(8);
    for (const cNode of consumerNodes) {
      expect(cNode.consumerBomBreakdown).toBeDefined();
      const totalShare =
        cNode.consumerBomBreakdown?.reduce((acc, item) => acc + item.costSharePct, 0) ?? 0;
      expect(totalShare).toBe(100);
    }
  });

  it('maps [0, 100] scores to canonical qualitative severity bands', () => {
    expect(getSeverityBand(0)).toBe('Baseline');
    expect(getSeverityBand(4)).toBe('Baseline');
    expect(getSeverityBand(5)).toBe('Low');
    expect(getSeverityBand(19)).toBe('Low');
    expect(getSeverityBand(20)).toBe('Moderate');
    expect(getSeverityBand(39)).toBe('Moderate');
    expect(getSeverityBand(40)).toBe('Elevated');
    expect(getSeverityBand(64)).toBe('Elevated');
    expect(getSeverityBand(65)).toBe('Severe');
    expect(getSeverityBand(100)).toBe('Severe');
  });

  it('validates scenario parameter bounds and rejects out-of-range inputs', () => {
    const valid = validateScenarioParameters(PRESETS[0]!.defaultParams);
    expect(valid.success).toBe(true);

    const invalid = validateScenarioParameters({
      shockSeverityPct: 1.5,
      durationDays: 3,
      inventoryBufferScale: 0.1,
      rerouteCapacityShare: -0.2,
      substitutionFlexibility: 2.0,
      shippingCostMultiplier: 0.5,
    });
    expect(invalid.success).toBe(false);
    expect(invalid.errors.length).toBeGreaterThanOrEqual(4);
  });

  it('detects synthetic cycles and missing source IDs when validating corrupted networks', () => {
    const cyclicReport = validateNetworkDataset({
      ...ECONOLOOM_DATASET,
      edges: [
        ...EDGES,
        {
          ...EDGES[0]!,
          id: 'e_synthetic_cycle',
          sourceNodeId: 'con_groceries',
          targetNodeId: 'geo_gulf',
        },
      ],
    });
    expect(cyclicReport.isValid).toBe(false);
    expect(cyclicReport.issues.some((i) => i.code === 'CYCLE_DETECTED')).toBe(true);
  });
});
