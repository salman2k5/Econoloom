import type {
  DependencyEdge,
  NetworkNode,
  NodeCategory,
} from '../types/domain';
import type { CausalPathway } from '../types/simulation';

export type SupplyChainTier = NetworkNode['tierIndex'];

export interface GraphLayoutOptions {
  nodeWidth?: number;
  nodeHeight?: number;
  columnGap?: number;
  tierExtraGap?: number;
  rowGap?: number;
  paddingX?: number;
  paddingY?: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface PositionedGraphNode {
  node: NetworkNode;
  id: string;
  tierIndex: SupplyChainTier;
  subColumnIndex: number;
  globalColumnIndex: number;
  rankInColumn: number;
  /** Top-left X coordinate of the node card */
  x: number;
  /** Top-left Y coordinate of the node card */
  y: number;
  /** Center X coordinate of the node card */
  centerX: number;
  /** Center Y coordinate of the node card */
  centerY: number;
  width: number;
  height: number;
}

export interface PositionedGraphEdge {
  edge: DependencyEdge;
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourcePoint: Point2D;
  targetPoint: Point2D;
  controlPoint1: Point2D;
  controlPoint2: Point2D;
  labelPoint: Point2D;
  pathD: string;
  isForward: boolean;
}

export interface GraphColumnHeader {
  globalColumnIndex: number;
  tierIndex: SupplyChainTier;
  subColumnIndex: number;
  title: string;
  subtitle: string;
  x: number;
  width: number;
  nodeCount: number;
}

export interface GraphLayoutResult {
  nodes: PositionedGraphNode[];
  nodeById: Record<string, PositionedGraphNode>;
  edges: PositionedGraphEdge[];
  edgeById: Record<string, PositionedGraphEdge>;
  columns: GraphColumnHeader[];
  width: number;
  height: number;
}

export type NeighborhoodFocusMode = 'all' | '1-hop' | '2-hop' | 'pathways';

export interface GraphNeighborhood {
  selectedNodeId: string;
  upstreamNodeIds: Set<string>;
  downstreamNodeIds: Set<string>;
  pathwayNodeIds: Set<string>;
  directNeighborNodeIds: Set<string>;
  upstreamEdgeIds: Set<string>;
  downstreamEdgeIds: Set<string>;
  pathwayEdgeIds: Set<string>;
  directIncidentEdgeIds: Set<string>;
}

const DEFAULT_OPTIONS: Required<GraphLayoutOptions> = {
  nodeWidth: 204,
  nodeHeight: 74,
  columnGap: 88,
  tierExtraGap: 36,
  rowGap: 18,
  paddingX: 40,
  paddingY: 68,
};

const TIER_TITLES: Record<SupplyChainTier, { title: string; subtitle: string }> = {
  0: {
    title: 'Tier 0 · Chokepoints & Hubs',
    subtitle: 'Physical Origins & Trade Gateways',
  },
  1: {
    title: 'Tier 1 · Primary Commodities',
    subtitle: 'Energy, Minerals, Wafer & Chemical Feedstocks',
  },
  2: {
    title: 'Tier 2 · Industrial Processing',
    subtitle: 'Manufacturing, Refining & Logistics Sectors',
  },
  3: {
    title: 'Tier 3 · Everyday Consumer Goods',
    subtitle: 'Household & End-Market Categories',
  },
};

const CATEGORY_ORDER: Record<NodeCategory, number> = {
  chokepoint: 0,
  geography: 1,
  commodity: 2,
  industry: 3,
  consumer_category: 4,
};

/**
 * Computes a deterministic, layered left-to-right DAG layout for the EconoLoom
 * supply-chain network. Respects both semantic `tierIndex` (0..3) and intra-tier
 * directed dependencies so that forward edges flow cleanly from left to right
 * without node overlaps.
 */
export function computeGraphLayout(
  nodes: readonly NetworkNode[],
  edges: readonly DependencyEdge[],
  options?: GraphLayoutOptions,
): GraphLayoutResult {
  const cfg: Required<GraphLayoutOptions> = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  if (nodes.length === 0) {
    return {
      nodes: [],
      nodeById: {},
      edges: [],
      edgeById: {},
      columns: [],
      width: cfg.paddingX * 2,
      height: cfg.paddingY * 2,
    };
  }

  const nodeMap = new Map<string, NetworkNode>();
  for (const node of nodes) {
    nodeMap.set(node.id, node);
  }

  const validEdges = edges.filter(
    (edge) => nodeMap.has(edge.sourceNodeId) && nodeMap.has(edge.targetNodeId),
  );

  // 1. Compute topological column depth seeded by semantic tierIndex so every
  // directed edge (u -> v) in the DAG flows strictly left-to-right (col(u) < col(v)).
  const topologicalCol = new Map<string, number>();
  for (const node of nodes) {
    topologicalCol.set(node.id, node.tierIndex);
  }

  const maxRelaxIterations = nodes.length + 2;
  for (let iter = 0; iter < maxRelaxIterations; iter += 1) {
    let changed = false;
    for (const edge of validEdges) {
      const src = nodeMap.get(edge.sourceNodeId)!;
      const tgt = nodeMap.get(edge.targetNodeId)!;
      if (src.id !== tgt.id) {
        const srcCol = topologicalCol.get(src.id) ?? 0;
        const tgtCol = topologicalCol.get(tgt.id) ?? 0;
        if (tgtCol <= srcCol) {
          topologicalCol.set(tgt.id, srcCol + 1);
          changed = true;
        }
      }
    }
    if (!changed) break;
  }

  // Ensure Tier 3 (Consumer Category) sink nodes always occupy the rightmost column
  let maxUpstreamCol = 0;
  for (const node of nodes) {
    if (node.tierIndex < 3) {
      const c = topologicalCol.get(node.id) ?? 0;
      if (c > maxUpstreamCol) maxUpstreamCol = c;
    }
  }
  const hasUpstreamNodes = nodes.some((n) => n.tierIndex < 3);
  if (hasUpstreamNodes) {
    for (const node of nodes) {
      if (node.tierIndex === 3) {
        const currentCol = topologicalCol.get(node.id) ?? 3;
        if (currentCol <= maxUpstreamCol) {
          topologicalCol.set(node.id, maxUpstreamCol + 1);
        }
      }
    }
  }

  // 2. Group nodes by topological column index and assign sequential globalColumnIndex
  const distinctCols = Array.from(new Set(topologicalCol.values())).sort(
    (a, b) => a - b,
  );

  const colToGlobalCol = new Map<number, number>();
  distinctCols.forEach((cVal, idx) => {
    colToGlobalCol.set(cVal, idx);
  });

  const columnsNodes: NetworkNode[][] = distinctCols.map(() => []);
  const nodeGlobalCol = new Map<string, number>();

  for (const node of nodes) {
    const rawCol = topologicalCol.get(node.id) ?? 0;
    const gCol = colToGlobalCol.get(rawCol) ?? 0;
    nodeGlobalCol.set(node.id, gCol);
    columnsNodes[gCol]!.push(node);
  }

  const sortedColumnPairs = distinctCols.map((rawCol, idx) => {
    const colList = columnsNodes[idx]!;
    // Dominant semantic tier in this column
    const dominantTier = (colList[0]?.tierIndex ??
      Math.min(3, rawCol)) as SupplyChainTier;
    return {
      key: `${dominantTier}:${idx}`,
      tierIndex: dominantTier,
      subColumnIndex: idx,
    };
  });

  // Initial canonical sort within each column
  for (const colList of columnsNodes) {
    colList.sort((a, b) => {
      const catDiff = CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category];
      if (catDiff !== 0) return catDiff;
      return a.id.localeCompare(b.id);
    });
  }

  // Build incoming and outgoing adjacency lists for barycentric crossing minimization
  const incomingByNode = new Map<string, string[]>();
  const outgoingByNode = new Map<string, string[]>();
  for (const node of nodes) {
    incomingByNode.set(node.id, []);
    outgoingByNode.set(node.id, []);
  }
  for (const edge of validEdges) {
    incomingByNode.get(edge.targetNodeId)?.push(edge.sourceNodeId);
    outgoingByNode.get(edge.sourceNodeId)?.push(edge.targetNodeId);
  }

  // Helper to obtain normalized [0, 1] vertical rank of each node in its current column
  const getNormalizedRanks = (): Map<string, number> => {
    const ranks = new Map<string, number>();
    for (const colList of columnsNodes) {
      const count = colList.length;
      colList.forEach((node, index) => {
        ranks.set(node.id, count <= 1 ? 0.5 : index / (count - 1));
      });
    }
    return ranks;
  };

  // 3. Perform 4 deterministic sweeps (forward + backward) of barycentric ordering
  for (let sweep = 0; sweep < 4; sweep += 1) {
    // Left-to-right sweep
    for (let colIdx = 1; colIdx < columnsNodes.length; colIdx += 1) {
      const currentRanks = getNormalizedRanks();
      const colList = columnsNodes[colIdx]!;
      const barycenters = new Map<string, number>();

      colList.forEach((node, idx) => {
        const predecessors = (incomingByNode.get(node.id) ?? []).filter(
          (predId) => (nodeGlobalCol.get(predId) ?? 0) < colIdx,
        );
        if (predecessors.length === 0) {
          barycenters.set(
            node.id,
            colList.length <= 1 ? 0.5 : idx / (colList.length - 1),
          );
        } else {
          const sum = predecessors.reduce(
            (acc, predId) => acc + (currentRanks.get(predId) ?? 0.5),
            0,
          );
          barycenters.set(node.id, sum / predecessors.length);
        }
      });

      colList.sort((a, b) => {
        const diff = (barycenters.get(a.id) ?? 0) - (barycenters.get(b.id) ?? 0);
        if (Math.abs(diff) > 1e-5) return diff;
        return a.id.localeCompare(b.id);
      });
    }

    // Right-to-left sweep
    for (let colIdx = columnsNodes.length - 2; colIdx >= 0; colIdx -= 1) {
      const currentRanks = getNormalizedRanks();
      const colList = columnsNodes[colIdx]!;
      const barycenters = new Map<string, number>();

      colList.forEach((node, idx) => {
        const successors = (outgoingByNode.get(node.id) ?? []).filter(
          (succId) => (nodeGlobalCol.get(succId) ?? 0) > colIdx,
        );
        if (successors.length === 0) {
          barycenters.set(
            node.id,
            colList.length <= 1 ? 0.5 : idx / (colList.length - 1),
          );
        } else {
          const sum = successors.reduce(
            (acc, succId) => acc + (currentRanks.get(succId) ?? 0.5),
            0,
          );
          barycenters.set(node.id, sum / successors.length);
        }
      });

      colList.sort((a, b) => {
        const diff = (barycenters.get(a.id) ?? 0) - (barycenters.get(b.id) ?? 0);
        if (Math.abs(diff) > 1e-5) return diff;
        return a.id.localeCompare(b.id);
      });
    }
  }

  // 4. Compute exact X and Y coordinates for columns and nodes
  const maxNodesInAnyColumn = Math.max(
    1,
    ...columnsNodes.map((col) => col.length),
  );
  const contentHeight =
    maxNodesInAnyColumn * cfg.nodeHeight +
    Math.max(0, maxNodesInAnyColumn - 1) * cfg.rowGap;
  const totalHeight = cfg.paddingY * 2 + contentHeight;

  const columnXPositions: number[] = [];
  let runningX = cfg.paddingX;
  for (let colIdx = 0; colIdx < sortedColumnPairs.length; colIdx += 1) {
    if (colIdx > 0) {
      const prevTier = sortedColumnPairs[colIdx - 1]!.tierIndex;
      const currTier = sortedColumnPairs[colIdx]!.tierIndex;
      runningX +=
        cfg.nodeWidth +
        cfg.columnGap +
        (currTier !== prevTier ? cfg.tierExtraGap : 0);
    }
    columnXPositions.push(runningX);
  }

  const totalWidth =
    (columnXPositions[columnXPositions.length - 1] ?? cfg.paddingX) +
    cfg.nodeWidth +
    cfg.paddingX;

  const positionedNodes: PositionedGraphNode[] = [];
  const nodeById: Record<string, PositionedGraphNode> = {};
  const columns: GraphColumnHeader[] = [];

  sortedColumnPairs.forEach((colMeta, colIdx) => {
    const colList = columnsNodes[colIdx]!;
    const colX = columnXPositions[colIdx]!;
    const colStackHeight =
      colList.length * cfg.nodeHeight +
      Math.max(0, colList.length - 1) * cfg.rowGap;
    const startY = cfg.paddingY + (contentHeight - colStackHeight) / 2;

    const tierInfo = TIER_TITLES[colMeta.tierIndex];
    const hasChokepointsInCol = colList.some((n) => n.category === 'chokepoint');
    const subStageLabel =
      colMeta.tierIndex === 0
        ? hasChokepointsInCol
          ? 'Maritime & Fab Chokepoints'
          : 'Regional Trade Hubs & Origins'
        : tierInfo.subtitle;

    columns.push({
      globalColumnIndex: colIdx,
      tierIndex: colMeta.tierIndex,
      subColumnIndex: colMeta.subColumnIndex,
      title: `Stage ${colIdx + 1} · ${tierInfo.title.split('·')[1]?.trim() ?? tierInfo.title}`,
      subtitle: subStageLabel,
      x: colX,
      width: cfg.nodeWidth,
      nodeCount: colList.length,
    });

    colList.forEach((node, rankIdx) => {
      const y = Math.round(startY + rankIdx * (cfg.nodeHeight + cfg.rowGap));
      const x = Math.round(colX);
      const positioned: PositionedGraphNode = {
        node,
        id: node.id,
        tierIndex: node.tierIndex,
        subColumnIndex: colMeta.subColumnIndex,
        globalColumnIndex: colIdx,
        rankInColumn: rankIdx,
        x,
        y,
        centerX: x + cfg.nodeWidth / 2,
        centerY: y + cfg.nodeHeight / 2,
        width: cfg.nodeWidth,
        height: cfg.nodeHeight,
      };
      positionedNodes.push(positioned);
      nodeById[node.id] = positioned;
    });
  });

  // 5. Compute smooth cubic Bézier curves for all valid edges with port fan-out
  const outgoingEdgesByNode = new Map<string, DependencyEdge[]>();
  const incomingEdgesByNode = new Map<string, DependencyEdge[]>();

  for (const edge of validEdges) {
    const outList = outgoingEdgesByNode.get(edge.sourceNodeId) ?? [];
    outList.push(edge);
    outgoingEdgesByNode.set(edge.sourceNodeId, outList);

    const inList = incomingEdgesByNode.get(edge.targetNodeId) ?? [];
    inList.push(edge);
    incomingEdgesByNode.set(edge.targetNodeId, inList);
  }

  for (const outList of outgoingEdgesByNode.values()) {
    outList.sort((a, b) => {
      const tgtA = nodeById[a.targetNodeId];
      const tgtB = nodeById[b.targetNodeId];
      return (tgtA?.centerY ?? 0) - (tgtB?.centerY ?? 0);
    });
  }

  for (const inList of incomingEdgesByNode.values()) {
    inList.sort((a, b) => {
      const srcA = nodeById[a.sourceNodeId];
      const srcB = nodeById[b.sourceNodeId];
      return (srcA?.centerY ?? 0) - (srcB?.centerY ?? 0);
    });
  }

  const positionedEdges: PositionedGraphEdge[] = [];
  const edgeById: Record<string, PositionedGraphEdge> = {};

  for (const edge of validEdges) {
    const srcNode = nodeById[edge.sourceNodeId]!;
    const tgtNode = nodeById[edge.targetNodeId]!;

    const outSiblings = outgoingEdgesByNode.get(edge.sourceNodeId) ?? [edge];
    const outIndex = outSiblings.findIndex((e) => e.id === edge.id);
    const outOffset =
      outSiblings.length <= 1
        ? 0
        : ((outIndex / (outSiblings.length - 1)) - 0.5) *
          Math.min(34, srcNode.height * 0.48);

    const inSiblings = incomingEdgesByNode.get(edge.targetNodeId) ?? [edge];
    const inIndex = inSiblings.findIndex((e) => e.id === edge.id);
    const inOffset =
      inSiblings.length <= 1
        ? 0
        : ((inIndex / (inSiblings.length - 1)) - 0.5) *
          Math.min(34, tgtNode.height * 0.48);

    const isForward = srcNode.x < tgtNode.x;
    const sourcePoint: Point2D = {
      x: isForward ? srcNode.x + srcNode.width : srcNode.x,
      y: Math.round((srcNode.centerY + outOffset) * 10) / 10,
    };
    const targetPoint: Point2D = {
      x: isForward ? tgtNode.x : tgtNode.x + tgtNode.width,
      y: Math.round((tgtNode.centerY + inOffset) * 10) / 10,
    };

    const dx = Math.abs(targetPoint.x - sourcePoint.x);
    const controlOffset = Math.max(36, Math.round(dx * 0.46));

    const controlPoint1: Point2D = {
      x: isForward
        ? sourcePoint.x + controlOffset
        : sourcePoint.x - controlOffset,
      y: sourcePoint.y,
    };
    const controlPoint2: Point2D = {
      x: isForward
        ? targetPoint.x - controlOffset
        : targetPoint.x + controlOffset,
      y: targetPoint.y,
    };

    // Cubic Bézier midpoint at t = 0.5
    const labelPoint: Point2D = {
      x: Math.round(
        0.125 * sourcePoint.x +
          0.375 * controlPoint1.x +
          0.375 * controlPoint2.x +
          0.125 * targetPoint.x,
      ),
      y: Math.round(
        0.125 * sourcePoint.y +
          0.375 * controlPoint1.y +
          0.375 * controlPoint2.y +
          0.125 * targetPoint.y,
      ),
    };

    const pathD = `M ${sourcePoint.x} ${sourcePoint.y} C ${controlPoint1.x} ${controlPoint1.y}, ${controlPoint2.x} ${controlPoint2.y}, ${targetPoint.x} ${targetPoint.y}`;

    const positionedEdge: PositionedGraphEdge = {
      edge,
      id: edge.id,
      sourceNodeId: edge.sourceNodeId,
      targetNodeId: edge.targetNodeId,
      sourcePoint,
      targetPoint,
      controlPoint1,
      controlPoint2,
      labelPoint,
      pathD,
      isForward,
    };

    positionedEdges.push(positionedEdge);
    edgeById[edge.id] = positionedEdge;
  }

  return {
    nodes: positionedNodes,
    nodeById,
    edges: positionedEdges,
    edgeById,
    columns,
    width: totalWidth,
    height: totalHeight,
  };
}

/**
 * Computes upstream, downstream, 1-hop, and active causal-pathway sets around
 * the selected node for deterministic graph highlighting and filtering.
 */
export function computeGraphNeighborhood(
  selectedNodeId: string,
  edges: readonly DependencyEdge[],
  pathways: readonly CausalPathway[] = [],
  maxHops: number = 2,
): GraphNeighborhood {
  const upstreamNodeIds = new Set<string>();
  const downstreamNodeIds = new Set<string>();
  const directNeighborNodeIds = new Set<string>();
  const upstreamEdgeIds = new Set<string>();
  const downstreamEdgeIds = new Set<string>();
  const directIncidentEdgeIds = new Set<string>();

  // 1-hop incident edges & neighbors
  for (const edge of edges) {
    if (edge.targetNodeId === selectedNodeId) {
      directIncidentEdgeIds.add(edge.id);
      directNeighborNodeIds.add(edge.sourceNodeId);
    }
    if (edge.sourceNodeId === selectedNodeId) {
      directIncidentEdgeIds.add(edge.id);
      directNeighborNodeIds.add(edge.targetNodeId);
    }
  }

  // Upstream BFS up to maxHops
  let frontier = new Set<string>([selectedNodeId]);
  for (let hop = 0; hop < maxHops; hop += 1) {
    const nextFrontier = new Set<string>();
    for (const edge of edges) {
      if (frontier.has(edge.targetNodeId)) {
        upstreamEdgeIds.add(edge.id);
        if (
          edge.sourceNodeId !== selectedNodeId &&
          !upstreamNodeIds.has(edge.sourceNodeId)
        ) {
          upstreamNodeIds.add(edge.sourceNodeId);
          nextFrontier.add(edge.sourceNodeId);
        }
      }
    }
    if (nextFrontier.size === 0) break;
    frontier = nextFrontier;
  }

  // Downstream BFS up to maxHops
  frontier = new Set<string>([selectedNodeId]);
  for (let hop = 0; hop < maxHops; hop += 1) {
    const nextFrontier = new Set<string>();
    for (const edge of edges) {
      if (frontier.has(edge.sourceNodeId)) {
        downstreamEdgeIds.add(edge.id);
        if (
          edge.targetNodeId !== selectedNodeId &&
          !downstreamNodeIds.has(edge.targetNodeId)
        ) {
          downstreamNodeIds.add(edge.targetNodeId);
          nextFrontier.add(edge.targetNodeId);
        }
      }
    }
    if (nextFrontier.size === 0) break;
    frontier = nextFrontier;
  }

  const pathwayNodeIds = new Set<string>();
  const pathwayEdgeIds = new Set<string>();
  for (const pathway of pathways) {
    for (const step of pathway.steps) {
      pathwayNodeIds.add(step.nodeId);
      if (step.edgeId) {
        pathwayEdgeIds.add(step.edgeId);
      }
    }
  }

  return {
    selectedNodeId,
    upstreamNodeIds,
    downstreamNodeIds,
    pathwayNodeIds,
    directNeighborNodeIds,
    upstreamEdgeIds,
    downstreamEdgeIds,
    pathwayEdgeIds,
    directIncidentEdgeIds,
  };
}
