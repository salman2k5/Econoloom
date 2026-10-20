/**
 * EconoLoom Canonical Local Dataset & Pre-Validated Network Bundle
 */

import { validateNetworkDataset } from '../engine/validateNetwork';
import { CORRIDORS } from './corridors';
import { EDGES } from './edges';
import { NODES } from './nodes';
import { PRESETS } from './presets';
import { MODEL_ASSUMPTIONS, SOURCES } from './sources';

export { CORRIDORS, EDGES, MODEL_ASSUMPTIONS, NODES, PRESETS, SOURCES };

export const ECONOLOOM_DATASET = {
  sources: SOURCES,
  assumptions: MODEL_ASSUMPTIONS,
  corridors: CORRIDORS,
  nodes: NODES,
  edges: EDGES,
  presets: PRESETS,
};

export const INITIAL_VALIDATION_REPORT = validateNetworkDataset(ECONOLOOM_DATASET);

export const NODE_BY_ID = new Map(NODES.map((n) => [n.id, n]));
export const EDGE_BY_ID = new Map(EDGES.map((e) => [e.id, e]));
export const SOURCE_BY_ID = new Map(SOURCES.map((s) => [s.id, s]));
export const CORRIDOR_BY_ID = new Map(CORRIDORS.map((c) => [c.id, c]));
export const PRESET_BY_ID = new Map(PRESETS.map((p) => [p.id, p]));
