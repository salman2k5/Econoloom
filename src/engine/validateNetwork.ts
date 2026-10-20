/**
 * EconoLoom Pure Network & Provenance Validator
 *
 * Pure TypeScript validation module with zero React or DOM imports.
 * Verifies referential integrity, numeric parameter bounds, DAG acyclicity,
 * and 100% citation traceability across all nodes, edges, corridors, and presets.
 */

import { z } from 'zod';
import type {
  CorridorGeometry,
  DataClassification,
  DependencyEdge,
  ModelAssumption,
  NetworkNode,
  ScenarioParameters,
  ScenarioPreset,
  SourceRecord,
  TraceableValue,
} from '../types/domain';
import type {
  NetworkValidationIssue,
  NetworkValidationReport,
  SeverityBand,
} from '../types/simulation';

export const ScenarioParametersSchema = z.object({
  shockSeverityPct: z.number().min(0).max(1),
  durationDays: z.number().int().min(7).max(180),
  inventoryBufferScale: z.number().min(0.5).max(2.0),
  rerouteCapacityShare: z.number().min(0).max(1),
  substitutionFlexibility: z.number().min(0).max(1),
  shippingCostMultiplier: z.number().min(1.0).max(4.0),
});

export function validateScenarioParameters(params: ScenarioParameters): {
  success: boolean;
  errors: string[];
} {
  const result = ScenarioParametersSchema.safeParse(params);
  if (result.success) {
    return { success: true, errors: [] };
  }
  return {
    success: false,
    errors: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
  };
}

/**
 * Maps a bounded [0, 100] index score (REI or CPI) to its canonical qualitative band
 * as specified in SIMULATION_METHODOLOGY.md Section 5.
 */
export function getSeverityBand(score: number): SeverityBand {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  if (clamped <= 4) return 'Baseline';
  if (clamped <= 19) return 'Low';
  if (clamped <= 39) return 'Moderate';
  if (clamped <= 64) return 'Elevated';
  return 'Severe';
}

export interface NetworkDatasetInput {
  sources: SourceRecord[];
  assumptions: ModelAssumption[];
  corridors: CorridorGeometry[];
  nodes: NetworkNode[];
  edges: DependencyEdge[];
  presets: ScenarioPreset[];
}

export function validateNetworkDataset(
  dataset: NetworkDatasetInput,
): NetworkValidationReport {
  const issues: NetworkValidationIssue[] = [];

  const sourceMap = new Set<string>();
  for (const src of dataset.sources) {
    if (sourceMap.has(src.id)) {
      issues.push({
        code: 'DUPLICATE_ID',
        severity: 'error',
        entityId: src.id,
        message: `Duplicate SourceRecord ID "${src.id}".`,
      });
    }
    sourceMap.add(src.id);
  }

  const corridorMap = new Set<string>();
  for (const corridor of dataset.corridors) {
    if (corridorMap.has(corridor.id)) {
      issues.push({
        code: 'DUPLICATE_ID',
        severity: 'error',
        entityId: corridor.id,
        message: `Duplicate CorridorGeometry ID "${corridor.id}".`,
      });
    }
    corridorMap.add(corridor.id);
  }

  const nodeMap = new Map<string, NetworkNode>();
  const categoryCounts: Record<string, number> = {
    chokepoint: 0,
    geography: 0,
    commodity: 0,
    industry: 0,
    consumer_category: 0,
  };

  const classificationCounts: Record<DataClassification, number> = {
    observed: 0,
    derived: 0,
    model_parameter: 0,
    user_input: 0,
    illustrative: 0,
  };

  const checkTraceableValue = (
    entityId: string,
    fieldName: string,
    tv: TraceableValue<number>,
    min: number,
    max: number,
  ) => {
    classificationCounts[tv.classification] =
      (classificationCounts[tv.classification] ?? 0) + 1;

    if (!tv.sourceIds || tv.sourceIds.length === 0) {
      issues.push({
        code: 'EMPTY_PROVENANCE_SOURCES',
        severity: 'error',
        entityId,
        message: `${fieldName} on "${entityId}" has an empty sourceIds array.`,
      });
    } else {
      for (const sid of tv.sourceIds) {
        if (!sourceMap.has(sid)) {
          issues.push({
            code: 'MISSING_SOURCE_ID',
            severity: 'error',
            entityId,
            message: `${fieldName} on "${entityId}" references unknown sourceId "${sid}".`,
          });
        }
      }
    }

    if (
      typeof tv.value !== 'number' ||
      Number.isNaN(tv.value) ||
      tv.value < min ||
      tv.value > max
    ) {
      issues.push({
        code: 'INVALID_PARAMETER_BOUNDS',
        severity: 'error',
        entityId,
        message: `${fieldName} on "${entityId}" has value ${String(tv.value)} outside valid bounds [${min}, ${max}].`,
      });
    }
  };

  for (const node of dataset.nodes) {
    if (nodeMap.has(node.id)) {
      issues.push({
        code: 'DUPLICATE_ID',
        severity: 'error',
        entityId: node.id,
        message: `Duplicate NetworkNode ID "${node.id}".`,
      });
    }
    nodeMap.set(node.id, node);
    categoryCounts[node.category] = (categoryCounts[node.category] ?? 0) + 1;

    checkTraceableValue(
      node.id,
      'baselineInventoryDays',
      node.baselineInventoryDays,
      0,
      365,
    );
    checkTraceableValue(
      node.id,
      'substitutionPotential',
      node.substitutionPotential,
      0,
      1,
    );
    checkTraceableValue(
      node.id,
      'pricePassThroughElasticity',
      node.pricePassThroughElasticity,
      0,
      1,
    );
    checkTraceableValue(
      node.id,
      'baselineImportDependency',
      node.baselineImportDependency,
      0,
      1,
    );
  }

  // Second pass on nodes for consumerBomBreakdown references
  for (const node of dataset.nodes) {
    if (node.consumerBomBreakdown) {
      for (const bom of node.consumerBomBreakdown) {
        if (!nodeMap.has(bom.upstreamNodeId)) {
          issues.push({
            code: 'DANGLING_EDGE_NODE',
            severity: 'error',
            entityId: node.id,
            message: `Consumer BOM on "${node.id}" references unknown upstreamNodeId "${bom.upstreamNodeId}".`,
          });
        }
        if (!bom.sourceIds || bom.sourceIds.length === 0) {
          issues.push({
            code: 'EMPTY_PROVENANCE_SOURCES',
            severity: 'error',
            entityId: node.id,
            message: `Consumer BOM item "${bom.upstreamNodeId}" on "${node.id}" has empty sourceIds.`,
          });
        } else {
          for (const sid of bom.sourceIds) {
            if (!sourceMap.has(sid)) {
              issues.push({
                code: 'MISSING_SOURCE_ID',
                severity: 'error',
                entityId: node.id,
                message: `Consumer BOM on "${node.id}" references unknown sourceId "${sid}".`,
              });
            }
          }
        }
      }
    }
  }

  // Validate corridors reference valid chokepoint nodes
  for (const corridor of dataset.corridors) {
    if (!nodeMap.has(corridor.chokepointNodeId)) {
      issues.push({
        code: 'INVALID_CORRIDOR_REF',
        severity: 'error',
        entityId: corridor.id,
        message: `Corridor "${corridor.id}" references unknown chokepointNodeId "${corridor.chokepointNodeId}".`,
      });
    }
  }

  // Validate edges
  const edgeIds = new Set<string>();
  const adjacency = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const nodeId of nodeMap.keys()) {
    adjacency.set(nodeId, []);
    inDegree.set(nodeId, 0);
  }

  for (const edge of dataset.edges) {
    if (edgeIds.has(edge.id)) {
      issues.push({
        code: 'DUPLICATE_ID',
        severity: 'error',
        entityId: edge.id,
        message: `Duplicate DependencyEdge ID "${edge.id}".`,
      });
    }
    edgeIds.add(edge.id);

    if (!nodeMap.has(edge.sourceNodeId)) {
      issues.push({
        code: 'DANGLING_EDGE_NODE',
        severity: 'error',
        entityId: edge.id,
        message: `Edge "${edge.id}" references unknown sourceNodeId "${edge.sourceNodeId}".`,
      });
    }
    if (!nodeMap.has(edge.targetNodeId)) {
      issues.push({
        code: 'DANGLING_EDGE_NODE',
        severity: 'error',
        entityId: edge.id,
        message: `Edge "${edge.id}" references unknown targetNodeId "${edge.targetNodeId}".`,
      });
    }

    if (edge.corridorId && !corridorMap.has(edge.corridorId)) {
      issues.push({
        code: 'INVALID_CORRIDOR_REF',
        severity: 'error',
        entityId: edge.id,
        message: `Edge "${edge.id}" references unknown corridorId "${edge.corridorId}".`,
      });
    }

    checkTraceableValue(
      edge.id,
      'dependencyWeight',
      edge.dependencyWeight,
      0.01,
      1.0,
    );
    checkTraceableValue(
      edge.id,
      'inputCriticality',
      edge.inputCriticality,
      0.0,
      1.0,
    );
    checkTraceableValue(
      edge.id,
      'transitLagWeeks',
      edge.transitLagWeeks,
      0,
      8,
    );
    checkTraceableValue(
      edge.id,
      'maxBypassShare',
      edge.maxBypassShare,
      0.0,
      1.0,
    );

    if (nodeMap.has(edge.sourceNodeId) && nodeMap.has(edge.targetNodeId)) {
      adjacency.get(edge.sourceNodeId)?.push(edge.targetNodeId);
      inDegree.set(
        edge.targetNodeId,
        (inDegree.get(edge.targetNodeId) ?? 0) + 1,
      );
    }
  }

  // Kahn's topological sort to guarantee DAG acyclicity
  const queue: string[] = [];
  for (const [nodeId, deg] of inDegree.entries()) {
    if (deg === 0) {
      queue.push(nodeId);
    }
  }

  let visitedCount = 0;
  while (queue.length > 0) {
    const current = queue.shift()!;
    visitedCount += 1;
    const neighbors = adjacency.get(current) ?? [];
    for (const next of neighbors) {
      const nextDeg = (inDegree.get(next) ?? 1) - 1;
      inDegree.set(next, nextDeg);
      if (nextDeg === 0) {
        queue.push(next);
      }
    }
  }

  if (visitedCount !== nodeMap.size) {
    issues.push({
      code: 'CYCLE_DETECTED',
      severity: 'error',
      entityId: 'network_dag',
      message: `Cycle detected in dependency graph: topological sort visited ${visitedCount} of ${nodeMap.size} nodes.`,
    });
  }

  // Validate model assumptions
  for (const assumption of dataset.assumptions) {
    if (!assumption.sourceIds || assumption.sourceIds.length === 0) {
      issues.push({
        code: 'EMPTY_PROVENANCE_SOURCES',
        severity: 'error',
        entityId: assumption.id,
        message: `ModelAssumption "${assumption.id}" has empty sourceIds.`,
      });
    } else {
      for (const sid of assumption.sourceIds) {
        if (!sourceMap.has(sid)) {
          issues.push({
            code: 'MISSING_SOURCE_ID',
            severity: 'error',
            entityId: assumption.id,
            message: `ModelAssumption "${assumption.id}" references unknown sourceId "${sid}".`,
          });
        }
      }
    }
  }

  // Validate scenario presets
  for (const preset of dataset.presets) {
    const paramValidation = validateScenarioParameters(preset.defaultParams);
    if (!paramValidation.success) {
      issues.push({
        code: 'INVALID_PARAMETER_BOUNDS',
        severity: 'error',
        entityId: preset.id,
        message: `Preset "${preset.id}" has invalid defaultParams: ${paramValidation.errors.join('; ')}`,
      });
    }

    if (!corridorMap.has(preset.affectedCorridorId)) {
      issues.push({
        code: 'INVALID_PRESET_REF',
        severity: 'error',
        entityId: preset.id,
        message: `Preset "${preset.id}" references unknown affectedCorridorId "${preset.affectedCorridorId}".`,
      });
    }

    for (const originId of preset.shockOriginNodeIds) {
      if (!nodeMap.has(originId)) {
        issues.push({
          code: 'INVALID_PRESET_REF',
          severity: 'error',
          entityId: preset.id,
          message: `Preset "${preset.id}" references unknown shockOriginNodeId "${originId}".`,
        });
      }
    }

    if (!nodeMap.has(preset.featuredConsumerNodeId)) {
      issues.push({
        code: 'INVALID_PRESET_REF',
        severity: 'error',
        entityId: preset.id,
        message: `Preset "${preset.id}" references unknown featuredConsumerNodeId "${preset.featuredConsumerNodeId}".`,
      });
    }

    for (const causalId of preset.featuredCausalNodeIds) {
      if (!nodeMap.has(causalId)) {
        issues.push({
          code: 'INVALID_PRESET_REF',
          severity: 'error',
          entityId: preset.id,
          message: `Preset "${preset.id}" references unknown featuredCausalNodeId "${causalId}".`,
        });
      }
    }

    for (const sid of preset.sourceIds) {
      if (!sourceMap.has(sid)) {
        issues.push({
          code: 'MISSING_SOURCE_ID',
          severity: 'error',
          entityId: preset.id,
          message: `Preset "${preset.id}" references unknown sourceId "${sid}".`,
        });
      }
    }
  }

  return {
    isValid: issues.filter((i) => i.severity === 'error').length === 0,
    nodeCount: dataset.nodes.length,
    edgeCount: dataset.edges.length,
    sourceCount: dataset.sources.length,
    corridorCount: dataset.corridors.length,
    presetCount: dataset.presets.length,
    categoryCounts,
    classificationCounts,
    issues,
  };
}
