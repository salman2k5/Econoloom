import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Compass,
  Filter,
  GitBranch,
  Info,
  Lock,
  Maximize2,
  RotateCcw,
  Search,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { EDGES, NODE_BY_ID, NODES } from '../../data';
import {
  computeGraphLayout,
  computeGraphNeighborhood,
  type NeighborhoodFocusMode,
  type PositionedGraphEdge,
  type PositionedGraphNode,
} from '../../engine/graphLayout';
import { analyzeNodePathways } from '../../engine/pathwayTracer';
import { useScenarioStore } from '../../state/useScenarioStore';
import type { NodeCategory } from '../../types/domain';
import type { SeverityBand } from '../../types/simulation';
import { DataTierBadge } from '../common/DataTierBadge';
import { SeverityBadge } from '../common/SeverityBadge';

interface CategoryVisualMeta {
  code: string;
  label: string;
  accentHex: string;
  pillBg: string;
  pillText: string;
  pillBorder: string;
}

const CATEGORY_VISUALS: Record<NodeCategory, CategoryVisualMeta> = {
  chokepoint: {
    code: 'CHK',
    label: 'Chokepoint',
    accentHex: '#E05A6D',
    pillBg: '#3D141F',
    pillText: '#F598A6',
    pillBorder: '#E05A6D',
  },
  geography: {
    code: 'GEO',
    label: 'Regional Hub',
    accentHex: '#7CA3C7',
    pillBg: '#16283B',
    pillText: '#ACC7E0',
    pillBorder: '#7CA3C7',
  },
  commodity: {
    code: 'COM',
    label: 'Commodity',
    accentHex: '#D5A653',
    pillBg: '#352712',
    pillText: '#E6C27A',
    pillBorder: '#D5A653',
  },
  industry: {
    code: 'IND',
    label: 'Industry',
    accentHex: '#6BA3BE',
    pillBg: '#122938',
    pillText: '#A5C4E0',
    pillBorder: '#6BA3BE',
  },
  consumer_category: {
    code: 'CON',
    label: 'Consumer Good',
    accentHex: '#38B688',
    pillBg: '#0E2E24',
    pillText: '#80D8B6',
    pillBorder: '#38B688',
  },
};

const SEVERITY_STYLES: Record<
  SeverityBand,
  {
    stroke: string;
    fill: string;
    badgeBg: string;
    badgeText: string;
    dashArray?: string;
    symbol: string;
  }
> = {
  Baseline: {
    stroke: '#2C3E52',
    fill: '#14202E',
    badgeBg: '#1B2A3C',
    badgeText: '#9EADBE',
    symbol: '—',
  },
  Low: {
    stroke: '#7CA3C7',
    fill: '#142334',
    badgeBg: '#183247',
    badgeText: '#ACC7E0',
    symbol: '•',
  },
  Moderate: {
    stroke: '#D5A653',
    fill: '#1F1E1A',
    badgeBg: '#3A2B14',
    badgeText: '#E6C27A',
    dashArray: '5 3',
    symbol: '◆',
  },
  Elevated: {
    stroke: '#D97742',
    fill: '#231A18',
    badgeBg: '#422214',
    badgeText: '#F2A679',
    symbol: '▲',
  },
  Severe: {
    stroke: '#E05A6D',
    fill: '#26141D',
    badgeBg: '#471521',
    badgeText: '#F598A6',
    symbol: '■',
  },
};

export const DependencyNetwork: React.FC = () => {
  const {
    activePreset,
    currentWeek,
    scenarioParams,
    simulationResult,
    currentWeekNodeStates,
    currentWeekEdgeStates,
    selectedNode,
    selectedPathwayIndex,
    selectedEdgeId,
    selectedEdge,
    selectedEdgeState,
    selectNode,
    selectEdge,
  } = useScenarioStore();

  // Graph filter & focus state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<NodeCategory | 'all'>('all');
  const [neighborhoodMode, setNeighborhoodMode] =
    useState<NeighborhoodFocusMode>('all');
  const [minReiThreshold, setMinReiThreshold] = useState<number>(0);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);

  // Viewport transform state (zoom & pan)
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(
    null,
  );

  // Compute full ranked pathways report for the selected target node (up to 5 paths)
  const pathwayReport = useMemo(
    () =>
      analyzeNodePathways(
        activePreset,
        simulationResult,
        selectedNode.id,
        currentWeek,
        5,
        { shockSeverityPct: scenarioParams.shockSeverityPct },
      ),
    [
      activePreset,
      simulationResult,
      selectedNode.id,
      currentWeek,
      scenarioParams.shockSeverityPct,
    ],
  );

  const activePathwayIndex =
    pathwayReport.pathways.length > 0
      ? Math.min(
          Math.max(0, selectedPathwayIndex),
          pathwayReport.pathways.length - 1,
        )
      : 0;
  const activePathway = pathwayReport.pathways[activePathwayIndex] ?? null;

  const activePathwayNodeIds = useMemo(() => {
    const s = new Set<string>();
    if (activePathway) {
      for (const step of activePathway.steps) {
        s.add(step.nodeId);
      }
    }
    return s;
  }, [activePathway]);

  const activePathwayEdgeIds = useMemo(() => {
    const s = new Set<string>();
    if (activePathway) {
      for (const step of activePathway.steps) {
        if (step.edgeId) {
          s.add(step.edgeId);
        }
      }
    }
    return s;
  }, [activePathway]);

  const alternatePathwayNodeIds = useMemo(() => {
    const s = new Set<string>();
    pathwayReport.pathways.forEach((p, idx) => {
      if (idx !== activePathwayIndex) {
        for (const step of p.steps) {
          if (!activePathwayNodeIds.has(step.nodeId)) {
            s.add(step.nodeId);
          }
        }
      }
    });
    return s;
  }, [pathwayReport.pathways, activePathwayIndex, activePathwayNodeIds]);

  const alternatePathwayEdgeIds = useMemo(() => {
    const s = new Set<string>();
    pathwayReport.pathways.forEach((p, idx) => {
      if (idx !== activePathwayIndex) {
        for (const step of p.steps) {
          if (step.edgeId && !activePathwayEdgeIds.has(step.edgeId)) {
            s.add(step.edgeId);
          }
        }
      }
    });
    return s;
  }, [pathwayReport.pathways, activePathwayIndex, activePathwayEdgeIds]);

  // Compute neighborhood sets around the selected node
  const neighborhood = useMemo(() => {
    const hops = neighborhoodMode === '1-hop' ? 1 : 2;
    return computeGraphNeighborhood(
      selectedNode.id,
      EDGES,
      pathwayReport.pathways,
      hops,
    );
  }, [selectedNode.id, pathwayReport.pathways, neighborhoodMode]);

  // Filter nodes based on active search, category, neighborhood focus, and min REI threshold
  const filteredNodes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return NODES.filter((node) => {
      if (categoryFilter !== 'all' && node.category !== categoryFilter) {
        return false;
      }

      if (neighborhoodMode === '1-hop') {
        const isOneHop =
          node.id === selectedNode.id ||
          neighborhood.directNeighborNodeIds.has(node.id);
        if (!isOneHop) return false;
      } else if (neighborhoodMode === '2-hop') {
        const isTwoHop =
          node.id === selectedNode.id ||
          neighborhood.upstreamNodeIds.has(node.id) ||
          neighborhood.downstreamNodeIds.has(node.id);
        if (!isTwoHop) return false;
      } else if (neighborhoodMode === 'pathways') {
        const inPathway =
          node.id === selectedNode.id ||
          neighborhood.pathwayNodeIds.has(node.id) ||
          neighborhood.directNeighborNodeIds.has(node.id);
        if (!inPathway) return false;
      }

      const state = currentWeekNodeStates[node.id];
      const rei = state?.relativeExposureIndex ?? 0;
      if (minReiThreshold > 0 && rei < minReiThreshold) {
        return false;
      }

      if (q.length > 0) {
        const matchesQuery =
          node.name.toLowerCase().includes(q) ||
          node.shortLabel.toLowerCase().includes(q) ||
          node.id.toLowerCase().includes(q) ||
          node.regionCode.toLowerCase().includes(q) ||
          node.description.toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }

      return true;
    });
  }, [
    searchQuery,
    categoryFilter,
    neighborhoodMode,
    minReiThreshold,
    selectedNode.id,
    neighborhood,
    currentWeekNodeStates,
  ]);

  const filteredNodeIdSet = useMemo(
    () => new Set(filteredNodes.map((n) => n.id)),
    [filteredNodes],
  );

  const filteredEdges = useMemo(
    () =>
      EDGES.filter(
        (e) =>
          filteredNodeIdSet.has(e.sourceNodeId) &&
          filteredNodeIdSet.has(e.targetNodeId),
      ),
    [filteredNodeIdSet],
  );

  // Compute deterministic layered DAG layout for the visible network
  const layout = useMemo(
    () => computeGraphLayout(filteredNodes, filteredEdges),
    [filteredNodes, filteredEdges],
  );

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    categoryFilter !== 'all' ||
    neighborhoodMode !== 'all' ||
    minReiThreshold > 0;

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setCategoryFilter('all');
    setNeighborhoodMode('all');
    setMinReiThreshold(0);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleFitToView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(2.2, Math.round((prev + 0.2) * 10) / 10));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(0.55, Math.round((prev - 0.2) * 10) / 10));
  }, []);

  const handleCenterOnSelectedNode = useCallback(() => {
    const pos = layout.nodeById[selectedNode.id];
    if (!pos) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }
    const targetPanX = Math.round(layout.width / 2 - pos.centerX);
    const targetPanY = Math.round(layout.height / 2 - pos.centerY);
    setZoom(1.25);
    setPan({ x: targetPanX, y: targetPanY });
  }, [layout, selectedNode.id]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if ((e.target as HTMLElement).closest('[data-graph-interactive="true"]')) {
        return;
      }
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        panX: pan.x,
        panY: pan.y,
      };
    },
    [pan.x, pan.y],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!isDragging || !dragStartRef.current) return;
      const dx = (e.clientX - dragStartRef.current.x) / zoom;
      const dy = (e.clientY - dragStartRef.current.y) / zoom;
      setPan({
        x: Math.round(dragStartRef.current.panX + dx),
        y: Math.round(dragStartRef.current.panY + dy),
      });
    },
    [isDragging, zoom],
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  const inspectedEdge = useMemo(() => {
    if (hoveredEdgeId) {
      const hovered = EDGES.find((e) => e.id === hoveredEdgeId);
      if (hovered) return hovered;
    }
    return selectedEdge;
  }, [hoveredEdgeId, selectedEdge]);

  const inspectedEdgeState = useMemo(() => {
    if (!inspectedEdge) return null;
    return currentWeekEdgeStates[inspectedEdge.id] ?? selectedEdgeState;
  }, [inspectedEdge, currentWeekEdgeStates, selectedEdgeState]);

  const shockOriginSet = useMemo(
    () => new Set(activePreset.shockOriginNodeIds),
    [activePreset.shockOriginNodeIds],
  );

  return (
    <section
      aria-label="Directed Dependency Network Graph"
      data-testid="dependency-network-panel"
      className="flex flex-col rounded-md border border-border-subtle bg-panel shadow-panel overflow-hidden"
    >
      {/* Top Header & Status Bar */}
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle bg-elevated/45 px-4 py-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <GitBranch className="h-4 w-4 text-[#D5A653]" aria-hidden="true" />
            <h2 className="font-display text-base font-semibold tracking-tight text-text-primary">
              Directed Supply-Chain Dependency Graph
            </h2>
            <span
              data-testid="graph-node-edge-counts"
              className="rounded-sm border border-[#7CA3C7]/35 bg-[#7CA3C7]/12 px-2 py-0.5 font-mono text-[11px] font-semibold text-[#ACC7E0]"
            >
              {filteredNodes.length}/{NODES.length} Nodes · {filteredEdges.length}/
              {EDGES.length} Directed Edges
            </span>
            <span className="rounded-sm border border-[#D5A653]/40 bg-[#D5A653]/12 px-2 py-0.5 font-mono text-[11px] text-[#E6C27A]">
              Week {currentWeek} · Simulated Output — Model-Derived
            </span>
          </div>
          <p className="mt-0.5 text-xs text-text-secondary">
            4-Tier Directed Acyclic Graph (T0 Chokepoints &amp; Hubs → T1 Commodities → T2 Industries → T3 Consumer Goods). Click any node or edge to inspect causal pathways.
          </p>
        </div>

        {/* Viewport Zoom / Fit Controls */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={handleZoomOut}
            aria-label="Zoom out graph"
            title="Zoom out"
            className="inline-flex items-center gap-1 rounded-sm border border-border-subtle bg-recess px-2 py-1 text-xs font-medium text-text-secondary hover:border-[#D5A653]/50 hover:text-text-primary"
          >
            <ZoomOut className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <span
            data-testid="graph-zoom-readout"
            className="min-w-[46px] text-center font-mono text-xs text-text-secondary tabular-nums"
          >
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            aria-label="Zoom in graph"
            title="Zoom in"
            className="inline-flex items-center gap-1 rounded-sm border border-border-subtle bg-recess px-2 py-1 text-xs font-medium text-text-secondary hover:border-[#D5A653]/50 hover:text-text-primary"
          >
            <ZoomIn className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={handleCenterOnSelectedNode}
            aria-label="Center selected node in graph"
            className="inline-flex items-center gap-1 rounded-sm border border-border-subtle bg-recess px-2.5 py-1 text-xs font-medium text-text-secondary hover:border-[#D5A653]/60 hover:text-[#E6C27A]"
          >
            <Compass className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Focus Selected</span>
          </button>
          <button
            type="button"
            onClick={handleFitToView}
            aria-label="Fit graph to view"
            data-testid="graph-fit-to-view-btn"
            className="inline-flex items-center gap-1 rounded-sm border border-border-subtle bg-recess px-2.5 py-1 text-xs font-medium text-text-secondary hover:border-[#D5A653]/60 hover:text-[#E6C27A]"
          >
            <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Fit to View</span>
          </button>
        </div>
      </header>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle bg-recess/85 px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-text-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search nodes in graph..."
              aria-label="Search nodes in dependency graph"
              data-testid="graph-search-input"
              className="w-48 rounded-sm border border-border-subtle bg-panel py-1 pl-8 pr-2.5 text-xs text-text-primary placeholder:text-text-muted focus:border-[#D5A653] focus:outline-none"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-[#D5A653]" aria-hidden="true" />
            <label htmlFor="graph-category-select" className="sr-only">
              Filter graph by node category
            </label>
            <select
              id="graph-category-select"
              aria-label="Filter graph by node category"
              data-testid="graph-category-filter"
              value={categoryFilter}
              onChange={(e) =>
                setCategoryFilter(e.target.value as NodeCategory | 'all')
              }
              className="rounded-sm border border-border-subtle bg-panel px-2.5 py-1 text-xs text-text-primary focus:border-[#D5A653] focus:outline-none"
            >
              <option value="all">All Categories (48)</option>
              <option value="chokepoint">Chokepoints (3)</option>
              <option value="geography">Regional Hubs (9)</option>
              <option value="commodity">Commodities (14)</option>
              <option value="industry">Industries (14)</option>
              <option value="consumer_category">Consumer Goods (8)</option>
            </select>
          </div>

          {/* Neighborhood Focus Mode */}
          <div
            role="group"
            aria-label="Neighborhood focus filter"
            className="inline-flex rounded-sm border border-border-subtle bg-panel p-0.5"
          >
            {(
              [
                { id: 'all', label: 'All Network' },
                { id: '1-hop', label: '1-Hop' },
                { id: '2-hop', label: '2-Hop' },
                { id: 'pathways', label: 'Causal Pathways' },
              ] as const
            ).map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setNeighborhoodMode(mode.id)}
                aria-pressed={neighborhoodMode === mode.id}
                data-testid={`graph-focus-${mode.id}`}
                className={`rounded-sm px-2 py-0.5 text-[11px] font-medium transition-colors ${
                  neighborhoodMode === mode.id
                    ? 'bg-[#D5A653]/20 text-[#F3EFE5] border border-[#D5A653]/60'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {/* Minimum REI Impact Filter */}
          <div className="flex items-center gap-1.5">
            <label
              htmlFor="graph-min-rei-select"
              className="text-[11px] text-text-secondary"
            >
              Min REI:
            </label>
            <select
              id="graph-min-rei-select"
              aria-label="Filter graph by minimum Relative Exposure Index"
              data-testid="graph-min-rei-filter"
              value={minReiThreshold}
              onChange={(e) => setMinReiThreshold(Number(e.target.value))}
              className="rounded-sm border border-border-subtle bg-panel px-2 py-1 font-mono text-xs text-text-primary focus:border-[#D5A653] focus:outline-none"
            >
              <option value={0}>0+ (All)</option>
              <option value={5}>5+ (Low+)</option>
              <option value={20}>20+ (Moderate+)</option>
              <option value={40}>40+ (Elevated+)</option>
              <option value={65}>65+ (Severe)</option>
            </select>
          </div>
        </div>

        {/* Active Selection & Filter Reset */}
        <div className="flex items-center gap-2">
          <div className="text-xs text-text-secondary">
            Selected:{' '}
            <strong className="font-display font-semibold text-[#E6C27A]">
              {selectedNode.shortLabel}
            </strong>{' '}
            <span className="font-mono text-[11px] text-text-muted">
              ({neighborhood.upstreamNodeIds.size} upstream ·{' '}
              {neighborhood.downstreamNodeIds.size} downstream)
            </span>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              data-testid="graph-reset-filters-btn"
              className="inline-flex items-center gap-1 rounded-sm border border-[#D5A653]/50 bg-[#D5A653]/15 px-2.5 py-1 text-xs font-medium text-[#E6C27A] hover:bg-[#D5A653]/25"
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Interactive SVG Canvas or Empty Filter State */}
      {filteredNodes.length === 0 ? (
        <div
          data-testid="graph-empty-state"
          className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center"
        >
          <p className="font-display text-sm font-semibold text-text-primary">
            No supply-chain nodes match the current graph filters.
          </p>
          <p className="max-w-md text-xs text-text-secondary">
            Try lowering the minimum REI threshold, clearing the search query, or switching back to the full 48-node network view.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1.5 rounded-sm border border-[#D5A653]/50 bg-[#D5A653]/15 px-3 py-1.5 text-xs font-semibold text-[#E6C27A] hover:bg-[#D5A653]/25"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Reset Graph Filters</span>
          </button>
        </div>
      ) : (
        <div className="relative w-full overflow-x-auto bg-[#0A1017]">
          <svg
            data-testid="dependency-network-svg"
            viewBox={`0 0 ${layout.width} ${Math.max(420, layout.height)}`}
            className={`block h-[540px] min-w-[960px] w-full select-none ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            role="img"
            aria-label={`Directed dependency network graph showing ${filteredNodes.length} nodes and ${filteredEdges.length} directed edges at Week ${currentWeek}`}
          >
            <defs>
              {/* Subtle background grid pattern */}
              <pattern
                id="econoloom-graph-grid"
                width="32"
                height="32"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 32 0 L 0 0 0 32"
                  fill="none"
                  stroke="#14202F"
                  strokeWidth="0.75"
                />
              </pattern>

              {/* Directional Arrowhead Markers */}
              <marker
                id="arrow-baseline"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#526275" />
              </marker>
              <marker
                id="arrow-upstream"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6.5"
                markerHeight="6.5"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#7CA3C7" />
              </marker>
              <marker
                id="arrow-downstream"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6.5"
                markerHeight="6.5"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#6BA3BE" />
              </marker>
              <marker
                id="arrow-pathway"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 9.5 5 L 0 9 z" fill="#D5A653" />
              </marker>
              <marker
                id="arrow-severe"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 9.5 5 L 0 9 z" fill="#E05A6D" />
              </marker>
              <marker
                id="arrow-bypass"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6.5"
                markerHeight="6.5"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#38B688" />
              </marker>
            </defs>

            {/* Grid Background */}
            <rect
              x="0"
              y="0"
              width={layout.width}
              height={Math.max(420, layout.height)}
              fill="url(#econoloom-graph-grid)"
            />

            <g
              transform={`translate(${layout.width / 2}, ${
                Math.max(420, layout.height) / 2
              }) scale(${zoom}) translate(${
                -layout.width / 2 + pan.x
              }, ${-Math.max(420, layout.height) / 2 + pan.y})`}
            >
              {/* Tier & Sub-Column Headers */}
              {layout.columns.map((col) => (
                <g
                  key={`col-header-${col.globalColumnIndex}`}
                  transform={`translate(${col.x}, 14)`}
                >
                  <rect
                    x={-8}
                    y={0}
                    width={col.width + 16}
                    height={38}
                    rx={3}
                    fill="#14202E"
                    stroke="#253548"
                    strokeWidth={1}
                  />
                  <line
                    x1={-8}
                    y1={0}
                    x2={col.width + 8}
                    y2={0}
                    stroke="#D5A653"
                    strokeWidth={1.5}
                    strokeOpacity={0.75}
                  />
                  <text
                    x={col.width / 2}
                    y={16}
                    textAnchor="middle"
                    fill="#F3EFE5"
                    fontSize="11"
                    fontWeight="700"
                  >
                    {col.title}
                  </text>
                  <text
                    x={col.width / 2}
                    y={30}
                    textAnchor="middle"
                    fill="#B4BFCC"
                    fontSize="10"
                  >
                    {col.subtitle} ({col.nodeCount})
                  </text>
                </g>
              ))}

              {/* Directed Edges Layer */}
              <g data-testid="graph-edges-layer">
                {layout.edges.map((posEdge: PositionedGraphEdge) => {
                  const { edge } = posEdge;
                  const edgeState = currentWeekEdgeStates[edge.id];
                  const transmitted = edgeState?.transmittedDisruption ?? 0;
                  const activeBypass = edgeState?.activeBypassShare ?? 0;
                  const isSelectedEdge = selectedEdgeId === edge.id;
                  const isHoveredEdge = hoveredEdgeId === edge.id;
                  const isActivePathwayEdge = activePathwayEdgeIds.has(edge.id);
                  const isAlternatePathwayEdge = alternatePathwayEdgeIds.has(
                    edge.id,
                  );
                  const isDirectIncident =
                    neighborhood.directIncidentEdgeIds.has(edge.id);
                  const isUpstreamEdge = neighborhood.upstreamEdgeIds.has(
                    edge.id,
                  );
                  const isDownstreamEdge = neighborhood.downstreamEdgeIds.has(
                    edge.id,
                  );

                  // Stroke width scales with dependencyWeight.value
                  const baseWidth = 1.4 + edge.dependencyWeight.value * 4.2;
                  const strokeWidth =
                    isSelectedEdge || isHoveredEdge
                      ? baseWidth + 1.6
                      : isActivePathwayEdge
                        ? baseWidth + 1.4
                        : isDirectIncident
                          ? baseWidth + 0.8
                          : isAlternatePathwayEdge
                            ? baseWidth + 0.3
                            : baseWidth;

                  let strokeColor = '#2E4158';
                  let markerId = 'arrow-baseline';
                  if (isSelectedEdge || isHoveredEdge) {
                    strokeColor = '#F3EFE5';
                    markerId = 'arrow-pathway';
                  } else if (isActivePathwayEdge) {
                    strokeColor =
                      transmitted >= 0.25 ? '#E05A6D' : '#D5A653';
                    markerId =
                      transmitted >= 0.25 ? 'arrow-severe' : 'arrow-pathway';
                  } else if (isAlternatePathwayEdge) {
                    strokeColor = '#6B7E94';
                    markerId = 'arrow-baseline';
                  } else if (activeBypass > 0.05 && transmitted > 0.01) {
                    strokeColor = '#38B688';
                    markerId = 'arrow-bypass';
                  } else if (transmitted >= 0.25) {
                    strokeColor = '#E05A6D';
                    markerId = 'arrow-severe';
                  } else if (transmitted >= 0.08) {
                    strokeColor = '#D5A653';
                    markerId = 'arrow-pathway';
                  } else if (isDirectIncident) {
                    strokeColor =
                      edge.targetNodeId === selectedNode.id
                        ? '#7CA3C7'
                        : '#6BA3BE';
                    markerId =
                      edge.targetNodeId === selectedNode.id
                        ? 'arrow-upstream'
                        : 'arrow-downstream';
                  } else if (isUpstreamEdge) {
                    strokeColor = '#5E85A8';
                    markerId = 'arrow-upstream';
                  } else if (isDownstreamEdge) {
                    strokeColor = '#5187A3';
                    markerId = 'arrow-downstream';
                  }

                  const opacity =
                    isSelectedEdge || isHoveredEdge || isActivePathwayEdge
                      ? 0.98
                      : isDirectIncident || isUpstreamEdge || isDownstreamEdge
                        ? 0.85
                        : isAlternatePathwayEdge
                          ? 0.52
                          : transmitted > 0.03
                            ? 0.68
                            : 0.34;

                  const isHighCriticality =
                    edge.inputCriticality.value >= 0.45;

                  return (
                    <g
                      key={edge.id}
                      data-testid={`graph-edge-${edge.id}`}
                      data-active-pathway={isActivePathwayEdge ? 'true' : 'false'}
                      data-alternate-pathway={
                        isAlternatePathwayEdge ? 'true' : 'false'
                      }
                      data-graph-interactive="true"
                      onClick={(e) => {
                        e.stopPropagation();
                        selectEdge(edge.id);
                      }}
                      onMouseEnter={() => setHoveredEdgeId(edge.id)}
                      onMouseLeave={() => setHoveredEdgeId(null)}
                      className="cursor-pointer"
                    >
                      {/* Invisible wider hit target for easy clicking/hovering */}
                      <path
                        d={posEdge.pathD}
                        fill="none"
                        stroke="transparent"
                        strokeWidth={12}
                      />
                      <path
                        d={posEdge.pathD}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        strokeOpacity={opacity}
                        strokeDasharray={
                          isAlternatePathwayEdge && !isActivePathwayEdge
                            ? '4 3'
                            : activeBypass > 0.05
                              ? '6 3'
                              : !isHighCriticality && transmitted < 0.05
                                ? '3 2'
                                : undefined
                        }
                        markerEnd={`url(#${markerId})`}
                      />
                      {/* Edge weight & disruption pill on incident/active-pathway/selected edges */}
                      {(isSelectedEdge ||
                        isHoveredEdge ||
                        isDirectIncident ||
                        isActivePathwayEdge) && (
                        <g
                          transform={`translate(${posEdge.labelPoint.x}, ${posEdge.labelPoint.y})`}
                        >
                          <rect
                            x={-28}
                            y={-9}
                            width={56}
                            height={18}
                            rx={2}
                            fill="#0B1219"
                            stroke={strokeColor}
                            strokeWidth={1}
                          />
                          <text
                            x={0}
                            y={3}
                            textAnchor="middle"
                            fill="#F3EFE5"
                            fontSize="9.5"
                            fontFamily="monospace"
                          >
                            w:{Math.round(edge.dependencyWeight.value * 100)}%
                            {transmitted > 0.005
                              ? ` · -${Math.round(transmitted * 100)}%`
                              : ''}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>

              {/* Positioned Nodes Layer */}
              <g data-testid="graph-nodes-layer">
                {layout.nodes.map((posNode: PositionedGraphNode) => {
                  const { node } = posNode;
                  const state = currentWeekNodeStates[node.id];
                  const rei = state?.relativeExposureIndex ?? 0;
                  const cpi = state?.costPressureIndex ?? 0;
                  const band: SeverityBand = state?.severityBand ?? 'Baseline';
                  const catVisual = CATEGORY_VISUALS[node.category];
                  const sevStyle = SEVERITY_STYLES[band];

                  const isSelected = node.id === selectedNode.id;
                  const isOrigin = shockOriginSet.has(node.id);
                  const isActivePathwayNode = activePathwayNodeIds.has(node.id);
                  const isAlternatePathwayNode = alternatePathwayNodeIds.has(
                    node.id,
                  );
                  const isDirectNeighbor =
                    neighborhood.directNeighborNodeIds.has(node.id);
                  const isUpstream = neighborhood.upstreamNodeIds.has(node.id);
                  const isDownstream = neighborhood.downstreamNodeIds.has(
                    node.id,
                  );

                  const isHighlighted =
                    isSelected ||
                    isOrigin ||
                    isActivePathwayNode ||
                    isDirectNeighbor ||
                    isUpstream ||
                    isDownstream;

                  // Calculate inventory coverage ratio for mini bar
                  const maxDays =
                    node.baselineInventoryDays.value *
                    scenarioParams.inventoryBufferScale;
                  const remDays = state?.remainingInventoryDays ?? maxDays;
                  const invRatio =
                    maxDays > 0
                      ? Math.max(0, Math.min(1, remDays / maxDays))
                      : 1;

                  const borderStroke = isSelected
                    ? '#D5A653'
                    : isActivePathwayNode
                      ? '#E6C27A'
                      : rei >= 5
                        ? sevStyle.stroke
                        : isDirectNeighbor
                          ? '#7CA3C7'
                          : '#253548';

                  const borderWidth = isSelected
                    ? 2.6
                    : isOrigin || isActivePathwayNode || rei >= 40
                      ? 2.2
                      : 1.25;

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${posNode.x}, ${posNode.y})`}
                      data-testid={`graph-node-${node.id}`}
                      data-node-id={node.id}
                      data-selected={isSelected ? 'true' : 'false'}
                      data-active-pathway={isActivePathwayNode ? 'true' : 'false'}
                      data-alternate-pathway={
                        isAlternatePathwayNode ? 'true' : 'false'
                      }
                      data-severity-band={band}
                      data-graph-interactive="true"
                      role="button"
                      tabIndex={0}
                      aria-label={`${node.name} (${catVisual.label}, Tier ${node.tierIndex}) — Week ${currentWeek} REI ${rei.toFixed(1)} (${band}), CPI ${cpi.toFixed(1)}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        selectNode(node.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          selectNode(node.id);
                        }
                      }}
                      opacity={
                        isHighlighted || rei >= 5
                          ? 1
                          : isAlternatePathwayNode
                            ? 0.85
                            : 0.78
                      }
                      className="cursor-pointer focus:outline-none"
                    >
                      {/* Outer Selection Halo */}
                      {isSelected && (
                        <rect
                          x={-4}
                          y={-4}
                          width={posNode.width + 8}
                          height={posNode.height + 8}
                          rx={6}
                          fill="none"
                          stroke="#D5A653"
                          strokeWidth={2}
                          strokeOpacity={0.88}
                        />
                      )}

                      {/* Node Card Body */}
                      <rect
                        x={0}
                        y={0}
                        width={posNode.width}
                        height={posNode.height}
                        rx={4}
                        fill={sevStyle.fill}
                        stroke={borderStroke}
                        strokeWidth={borderWidth}
                        strokeDasharray={
                          !isSelected ? sevStyle.dashArray : undefined
                        }
                      />

                      {/* Left Category Accent Bar */}
                      <rect
                        x={0}
                        y={0}
                        width={5}
                        height={posNode.height}
                        rx={2}
                        fill={catVisual.accentHex}
                      />

                      {/* Top Row: Category Pill + Region + Shock Origin / Neighborhood Tag */}
                      <g transform="translate(11, 8)">
                        <rect
                          x={0}
                          y={0}
                          width={34}
                          height={15}
                          rx={2}
                          fill={catVisual.pillBg}
                          stroke={catVisual.pillBorder}
                          strokeWidth={0.8}
                        />
                        <text
                          x={17}
                          y={10.5}
                          textAnchor="middle"
                          fill={catVisual.pillText}
                          fontSize="9.5"
                          fontWeight="700"
                          fontFamily="monospace"
                        >
                          {catVisual.code}
                        </text>

                        <text
                          x={40}
                          y={10.5}
                          fill="#B4BFCC"
                          fontSize="9.5"
                          fontFamily="monospace"
                        >
                          T{node.tierIndex}·{node.regionCode}
                        </text>

                        {/* Role Tag on Right */}
                        {isOrigin ? (
                          <g transform={`translate(${posNode.width - 66}, 0)`}>
                            <rect
                              x={0}
                              y={0}
                              width={48}
                              height={15}
                              rx={2}
                              fill="#471521"
                              stroke="#E05A6D"
                              strokeWidth={0.8}
                            />
                            <text
                              x={24}
                              y={10.5}
                              textAnchor="middle"
                              fill="#F598A6"
                              fontSize="9"
                              fontWeight="700"
                              fontFamily="monospace"
                            >
                              ORIGIN
                            </text>
                          </g>
                        ) : isSelected ? (
                          <g transform={`translate(${posNode.width - 68}, 0)`}>
                            <rect
                              x={0}
                              y={0}
                              width={50}
                              height={15}
                              rx={2}
                              fill="#3A2B14"
                              stroke="#D5A653"
                              strokeWidth={0.8}
                            />
                            <text
                              x={25}
                              y={10.5}
                              textAnchor="middle"
                              fill="#E6C27A"
                              fontSize="9"
                              fontWeight="700"
                              fontFamily="monospace"
                            >
                              ACTIVE
                            </text>
                          </g>
                        ) : isDirectNeighbor ? (
                          <text
                            x={posNode.width - 18}
                            y={10.5}
                            textAnchor="end"
                            fill={isUpstream ? '#ACC7E0' : '#A5C4E0'}
                            fontSize="9"
                            fontFamily="monospace"
                          >
                            {isUpstream ? '↑ IN' : '↓ OUT'}
                          </text>
                        ) : null}
                      </g>

                      {/* Middle Row: Node Short Label */}
                      <text
                        x={11}
                        y={39}
                        fill="#F3EFE5"
                        fontSize="11.5"
                        fontWeight="600"
                      >
                        {node.shortLabel.length > 23
                          ? `${node.shortLabel.slice(0, 22)}…`
                          : node.shortLabel}
                      </text>

                      {/* Bottom Row: Simulated REI / CPI Readout & Severity Band */}
                      <g transform="translate(11, 47)">
                        <rect
                          x={0}
                          y={0}
                          width={58}
                          height={16}
                          rx={2}
                          fill={sevStyle.badgeBg}
                        />
                        <text
                          x={29}
                          y={11}
                          textAnchor="middle"
                          fill={sevStyle.badgeText}
                          fontSize="9.5"
                          fontWeight="700"
                          fontFamily="monospace"
                        >
                          {sevStyle.symbol} REI {Math.round(rei)}
                        </text>

                        <text
                          x={64}
                          y={11}
                          fill="#C6D0DC"
                          fontSize="9.5"
                          fontFamily="monospace"
                        >
                          CPI {Math.round(cpi)}
                        </text>

                        <text
                          x={posNode.width - 18}
                          y={11}
                          textAnchor="end"
                          fill={sevStyle.badgeText}
                          fontSize="9.5"
                          fontWeight="600"
                        >
                          {band}
                        </text>
                      </g>

                      {/* Bottom Inventory Buffer Strip */}
                      <rect
                        x={8}
                        y={posNode.height - 5}
                        width={posNode.width - 16}
                        height={2.5}
                        rx={1}
                        fill="#1B2A3C"
                      />
                      <rect
                        x={8}
                        y={posNode.height - 5}
                        width={Math.round((posNode.width - 16) * invRatio)}
                        height={2.5}
                        rx={1}
                        fill={
                          invRatio > 0.6
                            ? '#38B688'
                            : invRatio > 0.25
                              ? '#D5A653'
                              : '#E05A6D'
                        }
                      />
                    </g>
                  );
                })}
              </g>
            </g>
          </svg>
        </div>
      )}

      {/* Edge Inspection Callout Drawer (Shown when an edge is clicked/hovered or for dominant incoming edge) */}
      {inspectedEdge && (
        <div
          data-testid="graph-edge-inspector"
          className="border-t border-border-subtle bg-elevated/70 px-4 py-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-sm bg-[#D5A653]/15 border border-[#D5A653]/45 px-2 py-0.5 font-mono text-[11px] font-semibold text-[#E6C27A]">
                Directed Edge · {inspectedEdge.id}
              </span>
              <button
                type="button"
                onClick={() => selectNode(inspectedEdge.sourceNodeId)}
                className="font-display text-xs font-semibold text-[#ACC7E0] hover:underline"
              >
                {NODE_BY_ID.get(inspectedEdge.sourceNodeId)?.name ??
                  inspectedEdge.sourceNodeId}
              </button>
              <ArrowRight className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
              <button
                type="button"
                onClick={() => selectNode(inspectedEdge.targetNodeId)}
                className="font-display text-xs font-semibold text-[#E6C27A] hover:underline"
              >
                {NODE_BY_ID.get(inspectedEdge.targetNodeId)?.name ??
                  inspectedEdge.targetNodeId}
              </button>
              <DataTierBadge
                classification={inspectedEdge.dependencyWeight.classification}
                confidence={inspectedEdge.dependencyWeight.confidence}
                compact
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
              <span className="text-text-secondary">
                Share w_uv:{' '}
                <strong className="text-text-primary">
                  {(inspectedEdge.dependencyWeight.value * 100).toFixed(0)}%
                </strong>
              </span>
              <span className="inline-flex items-center gap-1 text-text-secondary">
                <Lock className="h-3 w-3 text-[#D5A653]" aria-hidden="true" />
                Criticality c_uv:{' '}
                <strong className="text-[#E6C27A]">
                  {(inspectedEdge.inputCriticality.value * 100).toFixed(0)}%
                </strong>
              </span>
              <span className="text-text-secondary">
                Lag:{' '}
                <strong className="text-text-primary">
                  {inspectedEdge.transitLagWeeks.value}w
                </strong>
              </span>
              <span className="rounded-sm border border-[#E05A6D]/35 bg-[#E05A6D]/12 px-2 py-0.5 text-[#F598A6]">
                Week {currentWeek} Disruption:{' '}
                <strong>
                  {((inspectedEdgeState?.transmittedDisruption ?? 0) * 100).toFixed(
                    1,
                  )}
                  %
                </strong>
              </span>
              {(inspectedEdgeState?.activeBypassShare ?? 0) > 0 && (
                <span className="rounded-sm border border-[#38B688]/35 bg-[#38B688]/12 px-2 py-0.5 text-[#80D8B6]">
                  Bypass Offset:{' '}
                  <strong>
                    {((inspectedEdgeState?.activeBypassShare ?? 0) * 100).toFixed(
                      0,
                    )}
                    %
                  </strong>
                </span>
              )}
              {selectedEdgeId && (
                <button
                  type="button"
                  onClick={() => selectEdge(null)}
                  className="text-[11px] text-text-muted hover:text-text-primary"
                >
                  Clear Edge
                </button>
              )}
            </div>
          </div>
          <p className="mt-1 text-xs text-text-secondary">
            {inspectedEdge.mechanismSummary}
          </p>
        </div>
      )}

      {/* Legend Footer Distinguishing Categories, Structural Weights, and Simulated Severity */}
      <footer
        aria-label="Dependency Graph Visual Legend"
        className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle bg-recess/95 px-4 py-2.5 text-[11px] text-text-secondary"
      >
        {/* Node Categories */}
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-mono font-semibold uppercase tracking-wider text-text-muted">
            Node Categories:
          </span>
          {(Object.keys(CATEGORY_VISUALS) as NodeCategory[]).map((cat) => {
            const meta = CATEGORY_VISUALS[cat];
            return (
              <span key={cat} className="inline-flex items-center gap-1">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: meta.accentHex }}
                />
                <span className="font-mono font-semibold text-text-primary">
                  {meta.code}
                </span>
                <span>{meta.label}</span>
              </span>
            );
          })}
        </div>

        {/* Simulated Severity vs Structural Importance */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 font-mono font-semibold uppercase tracking-wider text-text-muted">
            <Info className="h-3 w-3 text-[#D5A653]" aria-hidden="true" />
            Simulated Severity (Week {currentWeek}):
          </span>
          {(
            ['Baseline', 'Low', 'Moderate', 'Elevated', 'Severe'] as SeverityBand[]
          ).map((band) => (
            <SeverityBadge key={band} band={band} />
          ))}
          <span className="ml-1 font-mono text-[11px] text-text-muted">
            · Edge Width = Structural Share (w_uv)
          </span>
        </div>
      </footer>
    </section>
  );
};
