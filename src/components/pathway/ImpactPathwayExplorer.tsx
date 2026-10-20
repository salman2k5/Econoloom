import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Compass,
  Filter,
  GitBranch,
  GitCommit,
  Info,
  Layers,
  Lock,
  Search,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { EDGE_BY_ID, NODE_BY_ID, NODES } from '../../data';
import {
  analyzeNodePathways,
  MAX_PATH_HOPS,
} from '../../engine/pathwayTracer';
import { useScenarioStore } from '../../state/useScenarioStore';
import type { NetworkNode, NodeCategory } from '../../types/domain';
import type { PathwayAnalysisReport } from '../../types/simulation';
import { DataTierBadge } from '../common/DataTierBadge';
import { SeverityBadge } from '../common/SeverityBadge';

type TargetFilterMode =
  | 'all'
  | 'industry'
  | 'consumer_category'
  | 'commodity'
  | 'origin_hub';

const TARGET_FILTER_BUTTONS: {
  id: TargetFilterMode;
  label: string;
}[] = [
  { id: 'all', label: 'All Nodes (48)' },
  { id: 'industry', label: 'Industries (14)' },
  { id: 'consumer_category', label: 'Consumer Categories (8)' },
  { id: 'commodity', label: 'Commodities (14)' },
  { id: 'origin_hub', label: 'Chokepoints & Hubs (12)' },
];

const CATEGORY_LABELS: Record<NodeCategory, string> = {
  chokepoint: 'Chokepoint',
  geography: 'Regional Hub',
  commodity: 'Commodity',
  industry: 'Industry',
  consumer_category: 'Consumer Category',
};

export interface ImpactPathwayExplorerProps {
  /** Optional custom report override for controlled testing of synthetic truncation/unreachable states. */
  reportOverride?: PathwayAnalysisReport;
}

export const ImpactPathwayExplorer: React.FC<ImpactPathwayExplorerProps> = ({
  reportOverride,
}) => {
  const {
    activePreset,
    scenarioParams,
    currentWeek,
    simulationResult,
    currentWeekNodeStates,
    currentWeekEdgeStates,
    selectedNode,
    selectedPathwayIndex,
    selectedEdgeId,
    selectNode,
    setSelectedPathwayIndex,
    selectEdge,
  } = useScenarioStore();

  const [targetFilter, setTargetFilter] = useState<TargetFilterMode>('all');
  const [targetSearchQuery, setTargetSearchQuery] = useState<string>('');

  // Compute live PathwayAnalysisReport from Milestone 5A engine unless overridden in a controlled unit test
  const pathwayReport = useMemo<PathwayAnalysisReport>(() => {
    if (reportOverride) {
      return reportOverride;
    }
    return analyzeNodePathways(
      activePreset,
      simulationResult,
      selectedNode.id,
      currentWeek,
      5,
      {
        shockSeverityPct: scenarioParams.shockSeverityPct,
      },
    );
  }, [
    reportOverride,
    activePreset,
    simulationResult,
    selectedNode.id,
    currentWeek,
    scenarioParams.shockSeverityPct,
  ]);

  // Filter target nodes for searchable selector & quick-pick pills
  const filteredTargetNodes = useMemo<NetworkNode[]>(() => {
    const query = targetSearchQuery.trim().toLowerCase();
    return NODES.filter((node) => {
      if (targetFilter === 'industry' && node.category !== 'industry') {
        return false;
      }
      if (
        targetFilter === 'consumer_category' &&
        node.category !== 'consumer_category'
      ) {
        return false;
      }
      if (targetFilter === 'commodity' && node.category !== 'commodity') {
        return false;
      }
      if (
        targetFilter === 'origin_hub' &&
        node.category !== 'chokepoint' &&
        node.category !== 'geography'
      ) {
        return false;
      }
      if (query.length > 0) {
        const haystack =
          `${node.id} ${node.name} ${node.shortLabel} ${node.category} ${node.regionCode}`.toLowerCase();
        if (!haystack.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [targetFilter, targetSearchQuery]);

  // Ensure selectedNode is always available in the <select> options even if current filter excludes it
  const selectOptionsNodes = useMemo<NetworkNode[]>(() => {
    if (filteredTargetNodes.some((n) => n.id === selectedNode.id)) {
      return filteredTargetNodes;
    }
    return [selectedNode, ...filteredTargetNodes];
  }, [filteredTargetNodes, selectedNode]);

  // Clamp active pathway index safely to current report's available pathways
  const activePathwayIndex = useMemo(() => {
    if (pathwayReport.pathways.length === 0) return 0;
    return Math.min(
      Math.max(0, selectedPathwayIndex),
      pathwayReport.pathways.length - 1,
    );
  }, [pathwayReport.pathways.length, selectedPathwayIndex]);

  const activePathway = pathwayReport.pathways[activePathwayIndex] ?? null;

  const isZeroShock = scenarioParams.shockSeverityPct <= 0;

  const bottleneckEdge = useMemo(() => {
    if (!activePathway || activePathway.bottleneckEdgeId === 'origin_direct') {
      return null;
    }
    return EDGE_BY_ID.get(activePathway.bottleneckEdgeId) ?? null;
  }, [activePathway]);

  const bottleneckNode = useMemo(() => {
    if (!activePathway) return null;
    return NODE_BY_ID.get(activePathway.bottleneckNodeId) ?? null;
  }, [activePathway]);

  const bottleneckEdgeState = useMemo(() => {
    if (!bottleneckEdge) return null;
    return currentWeekEdgeStates[bottleneckEdge.id] ?? null;
  }, [bottleneckEdge, currentWeekEdgeStates]);

  return (
    <section
      aria-label="Impact Pathway Explorer"
      data-testid="impact-pathway-explorer"
      className="flex flex-col rounded-md border border-border-subtle bg-panel shadow-panel overflow-hidden"
    >
      {/* Top Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle bg-elevated/45 px-4 py-3.5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <GitCommit className="h-4 w-4 text-[#D5A653]" aria-hidden="true" />
            <h2 className="font-display text-base font-semibold tracking-tight text-text-primary">
              Impact Pathway Explorer · Multi-Hop Causal Chain Diagnostics
            </h2>
            <span
              data-testid="pathway-status-badge"
              className={`rounded-sm border px-2 py-0.5 font-mono text-[11px] font-semibold ${
                pathwayReport.reachabilityStatus === 'reachable'
                  ? 'border-[#D5A653]/45 bg-[#D5A653]/15 text-[#E6C27A]'
                  : pathwayReport.reachabilityStatus === 'origin_node'
                    ? 'border-[#E05A6D]/45 bg-[#E05A6D]/15 text-[#F4A5B0]'
                    : 'border-border-subtle bg-recess text-text-secondary'
              }`}
            >
              Status: {pathwayReport.reachabilityStatus}
            </span>
            <span className="rounded-sm border border-[#7CA3C7]/35 bg-[#7CA3C7]/10 px-2 py-0.5 font-mono text-[11px] text-[#B8D0E8]">
              Week {pathwayReport.week} · Simulated Output — Model-Derived
            </span>
          </div>
          <p className="mt-0.5 text-xs text-text-secondary">
            Investigate how upstream capacity curtailments propagate across directed supply-chain dependencies, transit lags, and inventory buffers to reach{' '}
            <strong className="text-text-primary">{selectedNode.name}</strong>.
          </p>
        </div>

        {/* Discovered vs Displayed Path Counter */}
        <div
          data-testid="pathway-count-summary"
          className="flex items-center gap-2 rounded-sm border border-border-subtle bg-recess px-3 py-1.5 font-mono text-xs"
        >
          <span className="text-text-muted">Paths:</span>
          <strong className="text-[#E6C27A] tabular-nums">
            {pathwayReport.pathways.length} displayed
          </strong>
          <span className="text-text-muted">/</span>
          <span className="text-text-primary tabular-nums">
            {pathwayReport.totalDiscoveredPaths} discovered
          </span>
          {pathwayReport.truncatedPathCount > 0 && (
            <span className="rounded-sm bg-[#D5A653]/15 px-1.5 py-0.5 text-[11px] text-[#E6C27A] tabular-nums">
              +{pathwayReport.truncatedPathCount} truncated
            </span>
          )}
        </div>
      </header>

      <div className="space-y-4 p-4">
        {/* Section A: Target Selection Bar (Search, Quick Category Filters, Synchronized Selector) */}
        <div
          data-testid="pathway-target-selector-panel"
          className="rounded-sm border border-border-subtle bg-recess/80 p-3.5 space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#E6C27A]">
              <Compass className="h-3.5 w-3.5 text-[#D5A653]" aria-hidden="true" />
              <span>1. Select Downstream Target Node</span>
            </div>

            {/* Quick Category Filter Pills */}
            <div
              role="group"
              aria-label="Filter pathway target nodes by category"
              className="flex flex-wrap items-center gap-1"
            >
              <Filter
                className="mr-1 h-3.5 w-3.5 text-text-muted"
                aria-hidden="true"
              />
              {TARGET_FILTER_BUTTONS.map((btn) => {
                const isActive = targetFilter === btn.id;
                return (
                  <button
                    key={btn.id}
                    type="button"
                    onClick={() => setTargetFilter(btn.id)}
                    aria-pressed={isActive}
                    data-testid={`pathway-filter-${btn.id}`}
                    className={`rounded-sm border px-2 py-1 text-[11px] font-medium transition-colors ${
                      isActive
                        ? 'border-[#D5A653]/60 bg-[#D5A653]/15 text-[#F3EFE5]'
                        : 'border-border-subtle bg-panel text-text-secondary hover:border-[#354B66] hover:text-text-primary'
                    }`}
                  >
                    {btn.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-12">
            {/* Searchable Keyword Input */}
            <div className="relative md:col-span-5">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted"
                aria-hidden="true"
              />
              <input
                type="search"
                value={targetSearchQuery}
                onChange={(e) => setTargetSearchQuery(e.target.value)}
                placeholder="Search target by name, ID, or category..."
                aria-label="Search pathway target nodes"
                data-testid="pathway-target-search"
                className="w-full rounded-sm border border-border-subtle bg-panel py-1.5 pl-8 pr-3 text-xs text-text-primary placeholder:text-text-muted focus:border-[#D5A653] focus:outline-none"
              />
            </div>

            {/* Synchronized Target Node Select Dropdown */}
            <div className="flex items-center gap-2 md:col-span-7">
              <label
                htmlFor="pathway-target-node-select"
                className="shrink-0 text-xs font-medium text-text-secondary"
              >
                Active Target:
              </label>
              <select
                id="pathway-target-node-select"
                aria-label="Select pathway target node"
                data-testid="pathway-target-select"
                value={selectedNode.id}
                onChange={(e) => selectNode(e.target.value)}
                className="w-full rounded-sm border border-border-subtle bg-panel px-2.5 py-1.5 text-xs font-medium text-text-primary focus:border-[#D5A653] focus:outline-none"
              >
                {selectOptionsNodes.map((node) => {
                  const st = currentWeekNodeStates[node.id];
                  const rei = st?.relativeExposureIndex ?? 0;
                  return (
                    <option key={node.id} value={node.id}>
                      {node.name} ({CATEGORY_LABELS[node.category]} · T
                      {node.tierIndex}) — Week {currentWeek} REI {rei.toFixed(1)}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Quick-Select Target Pills for Filtered Nodes (up to 10 visible pills for rapid switching) */}
          {filteredTargetNodes.length > 0 ? (
            <div
              data-testid="pathway-target-quick-pills"
              className="flex flex-wrap items-center gap-1.5 pt-1"
            >
              {filteredTargetNodes.slice(0, 10).map((node) => {
                const isSelected = node.id === selectedNode.id;
                const st = currentWeekNodeStates[node.id];
                const rei = st?.relativeExposureIndex ?? 0;
                return (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => selectNode(node.id)}
                    aria-pressed={isSelected}
                    data-testid={`pathway-target-pill-${node.id}`}
                    className={`inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-xs transition-colors ${
                      isSelected
                        ? 'border-[#D5A653] bg-[#D5A653]/15 font-semibold text-[#F3EFE5]'
                        : 'border-border-subtle bg-panel text-text-secondary hover:border-[#354B66] hover:text-text-primary'
                    }`}
                  >
                    <span>{node.shortLabel}</span>
                    <span className="rounded-sm bg-recess px-1 py-0.2 font-mono text-[11px] text-text-muted">
                      {CATEGORY_LABELS[node.category]}
                    </span>
                    <span className="font-mono text-[11px] text-[#E6C27A] tabular-nums">
                      REI {rei.toFixed(1)}
                    </span>
                  </button>
                );
              })}
              {filteredTargetNodes.length > 10 && (
                <span className="px-1.5 text-[11px] text-text-muted">
                  +{filteredTargetNodes.length - 10} more in dropdown
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-sm border border-border-subtle bg-panel px-3 py-2 text-xs text-text-muted">
              <span>No target nodes match filter &ldquo;{targetSearchQuery}&rdquo;.</span>
              <button
                type="button"
                onClick={() => {
                  setTargetFilter('all');
                  setTargetSearchQuery('');
                }}
                className="font-semibold text-[#E6C27A] hover:underline"
              >
                Reset Target Filter
              </button>
            </div>
          )}
        </div>

        {/* Section E: Reachability, Zero-Shock, and Truncation / Search-Safety-Limit Banners */}
        <div className="space-y-2">
          {/* Reachability Diagnostic Banner */}
          <div
            data-testid="pathway-reachability-banner"
            className={`flex items-start gap-2.5 rounded-sm border border-l-2 p-3 text-xs ${
              pathwayReport.reachabilityStatus === 'origin_node'
                ? 'border-border-subtle border-l-[#E05A6D] bg-[#E05A6D]/10 text-[#F4A5B0]'
                : pathwayReport.reachabilityStatus === 'reachable'
                  ? 'border-border-subtle border-l-[#D5A653] bg-recess/85 text-text-primary'
                  : 'border-border-subtle border-l-[#D5A653] bg-[#D5A653]/10 text-[#E6C27A]'
            }`}
          >
            <Info
              className="mt-0.5 h-4 w-4 shrink-0 text-[#D5A653]"
              aria-hidden="true"
            />
            <div className="space-y-1">
              <div className="font-semibold">
                {pathwayReport.reachabilityStatus === 'origin_node'
                  ? `Primary Shock Origin Node (${selectedNode.name} · ${CATEGORY_LABELS[selectedNode.category]})`
                  : pathwayReport.reachabilityStatus === 'reachable'
                    ? `Directed Causal Reachability Confirmed (${selectedNode.name} · ${CATEGORY_LABELS[selectedNode.category]})`
                    : `Unreachable Target Node (${selectedNode.name} · ${CATEGORY_LABELS[selectedNode.category]})`}
              </div>
              <p className="leading-relaxed text-text-secondary">
                {pathwayReport.reachabilityReason}
              </p>
            </div>
          </div>

          {/* Zero-Shock Condition Banner */}
          {isZeroShock && (
            <div
              data-testid="pathway-zero-shock-banner"
              className="flex items-start gap-2.5 rounded-sm border border-border-subtle border-l-2 border-l-[#38B688] bg-[#38B688]/10 p-3 text-xs text-[#9CE2C6]"
            >
              <Sparkles
                className="mt-0.5 h-4 w-4 shrink-0 text-[#38B688]"
                aria-hidden="true"
              />
              <div>
                <strong className="font-semibold text-[#F3EFE5]">
                  Zero-Shock Baseline Active (0% Shock Severity):
                </strong>{' '}
                Structural directed pathways remain traceable below so you can inspect corridor topology and baseline inventory buffers, while all dynamic pathway scores, Relative Exposure Index (REI), and Cost-Pressure Index (CPI) values equal{' '}
                <span className="font-mono font-semibold">0.0</span>.
              </div>
            </div>
          )}

          {/* Truncation / Search-Safety Limit Notice */}
          {(pathwayReport.truncatedPathCount > 0 ||
            pathwayReport.searchLimitReached) && (
            <div
              data-testid="pathway-truncation-banner"
              className="flex items-start gap-2.5 rounded-sm border border-border-subtle border-l-2 border-l-[#D5A653] bg-[#D5A653]/10 p-3 text-xs text-text-secondary"
            >
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0 text-[#D5A653]"
                aria-hidden="true"
              />
              <div>
                {pathwayReport.searchLimitReached ? (
                  <>
                    <strong className="font-semibold text-[#E6C27A]">
                      Search-Safety Limit Truncation — Showing{' '}
                      {pathwayReport.pathways.length} of at least{' '}
                      {pathwayReport.totalDiscoveredPaths} discovered pathways
                      (search limit reached):
                    </strong>{' '}
                    Candidate path enumeration stopped deterministically at{' '}
                    <span className="font-mono font-semibold text-text-primary">
                      {pathwayReport.totalDiscoveredPaths}
                    </span>{' '}
                    discovered paths (≤ {MAX_PATH_HOPS} edges) to prevent unbounded combinatorial traversal. Displaying the top{' '}
                    <span className="font-mono font-semibold text-text-primary">
                      {pathwayReport.pathways.length}
                    </span>{' '}
                    ranked pathways and omitting{' '}
                    <span className="font-mono font-semibold text-text-primary">
                      {pathwayReport.truncatedPathCount}
                    </span>{' '}
                    discovered paths; additional paths beyond the search safety cap were not enumerated.
                  </>
                ) : (
                  <>
                    <strong className="font-semibold text-[#E6C27A]">
                      Display Truncation Notice — Showing{' '}
                      {pathwayReport.pathways.length} of{' '}
                      {pathwayReport.totalDiscoveredPaths} discovered pathways:
                    </strong>{' '}
                    Exhaustively discovered{' '}
                    <span className="font-mono font-semibold text-text-primary">
                      {pathwayReport.totalDiscoveredPaths}
                    </span>{' '}
                    simple directed pathways (≤ {MAX_PATH_HOPS} edges) from{' '}
                    <span className="font-mono text-text-primary">
                      [{activePreset.shockOriginNodeIds.join(', ')}]
                    </span>{' '}
                    to <strong className="text-text-primary">{selectedNode.shortLabel}</strong>. Displaying the top{' '}
                    <span className="font-mono font-semibold text-text-primary">
                      {pathwayReport.pathways.length}
                    </span>{' '}
                    ranked pathways ({pathwayReport.truncatedPathCount} lower-ranked pathway
                    {pathwayReport.truncatedPathCount === 1 ? '' : 's'} omitted).
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Unreachable Empty State */}
        {pathwayReport.reachabilityStatus === 'unreachable' ||
        pathwayReport.pathways.length === 0 ? (
          <div
            data-testid="pathway-unreachable-state"
            className="rounded-sm border border-border-subtle bg-recess/80 p-6 text-center space-y-3"
          >
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-sm border border-[#D5A653]/35 bg-[#D5A653]/10">
              <GitBranch className="h-5 w-5 text-[#E6C27A]" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h3 className="font-display text-sm font-semibold text-text-primary">
                No Directed Causal Pathway Connects Active Shock Origin to{' '}
                {selectedNode.name}
              </h3>
              <p className="mx-auto max-w-2xl text-xs leading-relaxed text-text-secondary">
                In EconoLoom&apos;s directed acyclic supply-chain network, shocks propagate strictly forward along directed edges ($u \to v$) up to {MAX_PATH_HOPS} hops. Because no directed upstream path connects{' '}
                <span className="font-mono text-[#E6C27A]">
                  {activePreset.shockOriginNodeIds.join(', ')}
                </span>{' '}
                to <span className="font-mono text-[#E6C27A]">{selectedNode.id}</span>, this node remains isolated from the active origin curtailment.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <span className="text-xs text-text-muted">
                Inspect a reachable target for {activePreset.title}:
              </span>
              {activePreset.featuredCausalNodeIds.map((nodeId) => {
                const n = NODE_BY_ID.get(nodeId);
                if (!n) return null;
                return (
                  <button
                    key={nodeId}
                    type="button"
                    onClick={() => selectNode(nodeId)}
                    className="inline-flex items-center gap-1 rounded-sm border border-[#D5A653]/45 bg-[#D5A653]/15 px-2.5 py-1 text-xs font-semibold text-[#F3EFE5] hover:bg-[#D5A653]/25"
                  >
                    <span>{n.shortLabel}</span>
                    <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <>
            {/* Section B: Ranked Pathway Selector (Up to 5 Ranked Pathways) */}
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#E6C27A]">
                  <Layers className="h-3.5 w-3.5 text-[#D5A653]" aria-hidden="true" />
                  <span>
                    2. Ranked Causal Pathways (Select a Path to Highlight on Dependency Graph)
                  </span>
                </div>
                <span className="font-mono text-xs text-text-muted">
                  Active Selection: Path #{activePathwayIndex + 1} of{' '}
                  {pathwayReport.pathways.length}
                </span>
              </div>

              <div
                role="listbox"
                aria-label="Ranked causal pathways to selected target"
                data-testid="pathway-ranked-list"
                className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3"
              >
                {pathwayReport.pathways.map((pathway, idx) => {
                  const isSelectedPath = idx === activePathwayIndex;
                  const hopCount = Math.max(0, pathway.steps.length - 1);
                  const originStep = pathway.steps[0]!;
                  const targetStep = pathway.steps[pathway.steps.length - 1]!;
                  const originShort =
                    NODE_BY_ID.get(originStep.nodeId)?.shortLabel ??
                    originStep.nodeName;
                  const targetShort =
                    NODE_BY_ID.get(targetStep.nodeId)?.shortLabel ??
                    targetStep.nodeName;
                  const bNode = NODE_BY_ID.get(pathway.bottleneckNodeId);
                  const chainPreview = pathway.steps
                    .map(
                      (s) => NODE_BY_ID.get(s.nodeId)?.shortLabel ?? s.nodeName,
                    )
                    .join(' → ');

                  return (
                    <button
                      key={`${pathway.targetNodeId}-${pathway.bottleneckEdgeId}-${idx}`}
                      type="button"
                      role="option"
                      aria-selected={isSelectedPath}
                      aria-pressed={isSelectedPath}
                      data-testid={`pathway-rank-card-${idx}`}
                      onClick={() => setSelectedPathwayIndex(idx)}
                      className={`flex flex-col justify-between rounded-sm border p-3 text-left transition-all ${
                        isSelectedPath
                          ? 'border-[#D5A653] border-l-2 border-l-[#D5A653] bg-elevated/90 shadow-glow'
                          : 'border-border-subtle bg-recess/80 hover:border-[#354B66] hover:bg-elevated/50'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 font-mono text-xs font-bold ${
                              isSelectedPath
                                ? 'bg-[#D5A653]/20 text-[#F3EFE5] border border-[#D5A653]/60'
                                : 'bg-panel text-text-secondary border border-border-subtle'
                            }`}
                          >
                            Rank #{idx + 1}
                          </span>
                          <span className="font-mono text-xs font-semibold text-[#E6C27A] tabular-nums">
                            Score {pathway.pathScore.toFixed(1)} pts{' '}
                            <span className="text-[11px] font-normal text-text-muted">
                              (Heuristic)
                            </span>
                          </span>
                        </div>

                        <div className="text-xs font-semibold text-text-primary">
                          {originShort} → {targetShort}
                        </div>
                        <p className="line-clamp-2 font-mono text-[11px] text-text-secondary">
                          {chainPreview}
                        </p>
                      </div>

                      <div className="mt-3 space-y-1.5 border-t border-border-subtle/60 pt-2 text-[11px]">
                        <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-text-secondary">
                          <span>
                            {hopCount === 0
                              ? '0 hops (Origin)'
                              : `${hopCount} ${hopCount === 1 ? 'hop' : 'hops'}`}
                          </span>
                          <span className="text-[#E6C27A] tabular-nums">
                            Lag: {pathway.totalLagWeeks}w (Arrives W
                            {pathway.totalLagWeeks === 0
                              ? 1
                              : 1 + pathway.totalLagWeeks}
                            )
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-text-muted">
                            Bottleneck:{' '}
                            <strong className="text-text-primary">
                              {pathway.bottleneckEdgeId === 'origin_direct'
                                ? `${originShort} (Direct Origin)`
                                : `${bNode?.shortLabel ?? pathway.bottleneckNodeId} (${pathway.bottleneckEdgeId})`}
                            </strong>
                          </span>
                          {isSelectedPath && (
                            <span className="shrink-0 rounded-sm bg-[#D5A653]/20 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[#E6C27A]">
                              Active on Graph
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section D: Primary Bottleneck Callout for the Selected Pathway */}
            {activePathway && (
              <div
                data-testid="pathway-bottleneck-callout"
                className="rounded-sm border border-border-subtle border-t-2 border-t-[#D5A653] bg-recess/85 p-3.5 space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#E6C27A]">
                    <Lock className="h-3.5 w-3.5 text-[#D5A653]" aria-hidden="true" />
                    <span>
                      3. Primary Bottleneck Diagnostic (Path #{activePathwayIndex + 1})
                    </span>
                  </div>
                  <span className="rounded-sm border border-[#D5A653]/40 bg-panel px-2 py-0.5 font-mono text-[11px] text-[#E6C27A]">
                    Bottleneck Heuristic · Model-Derived
                  </span>
                </div>

                {activePathway.bottleneckEdgeId === 'origin_direct' ||
                !bottleneckEdge ? (
                  <p className="text-xs leading-relaxed text-text-primary">
                    <strong className="text-[#E6C27A]">
                      Direct Shock Origin ({selectedNode.name}):
                    </strong>{' '}
                    Because this node is the configured origin of the disruption (0 intermediate edges), curtailment is injected directly at Week 1 without an intermediate upstream edge bottleneck.
                  </p>
                ) : (
                  <div className="space-y-2.5 text-xs">
                    <p className="leading-relaxed text-text-primary">
                      {activePathway.bottleneckSummary}
                    </p>
                    <div className="grid grid-cols-2 gap-px border border-border-subtle bg-border-subtle sm:grid-cols-4 font-mono">
                      <div className="bg-panel p-2.5">
                        <div className="text-[11px] text-text-muted">
                          Bottleneck Edge
                        </div>
                        <div className="mt-0.5 font-semibold text-[#E6C27A]">
                          {bottleneckEdge.id} → {bottleneckNode?.shortLabel}
                        </div>
                      </div>
                      <div className="bg-panel p-2.5">
                        <div className="text-[11px] text-text-muted">
                          Criticality &amp; Weight
                        </div>
                        <div className="mt-0.5 font-semibold text-text-primary tabular-nums">
                          c={bottleneckEdge.inputCriticality.value.toFixed(2)} · w=
                          {Math.round(
                            bottleneckEdge.dependencyWeight.value * 100,
                          )}
                          %
                        </div>
                      </div>
                      <div className="bg-panel p-2.5">
                        <div className="text-[11px] text-text-muted">
                          Week {currentWeek} Active Bypass
                        </div>
                        <div className="mt-0.5 font-semibold text-[#9CE2C6] tabular-nums">
                          {(
                            (bottleneckEdgeState?.activeBypassShare ?? 0) * 100
                          ).toFixed(1)}
                          % (max{' '}
                          {Math.round(bottleneckEdge.maxBypassShare.value * 100)}
                          %)
                        </div>
                      </div>
                      <div className="bg-panel p-2.5">
                        <div className="text-[11px] text-text-muted">
                          Week {currentWeek} Edge Disruption
                        </div>
                        <div className="mt-0.5 font-semibold text-[#F4A5B0] tabular-nums">
                          {bottleneckEdgeState &&
                          Number.isFinite(
                            bottleneckEdgeState.transmittedDisruption,
                          )
                            ? `${(
                                bottleneckEdgeState.transmittedDisruption * 100
                              ).toFixed(1)}%`
                            : 'Unavailable'}
                        </div>
                      </div>
                    </div>
                    <p className="text-[11px] text-text-secondary">
                      <strong>Algorithmic Selection Rule:</strong> Identified as the highest-resistance link along Path #{activePathwayIndex + 1} via the bottleneck resistance score{' '}
                      <span className="font-mono text-text-primary">
                        b_k = c_e · (0.5 + 0.5·w̃_e) · (1 − 0.6·β̃_e(t)) · (1 + δ_e(t))
                      </span>
                      , which weights high Leontief input criticality, high input share, low active rerouting bypass, and active Week-{currentWeek} flow stress. This identifies structural vulnerability within the model rather than proving single-cause empirical attribution.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Section C: Ordered Hop-by-Hop Pathway Breakdown (Nodes & Connecting Directed Edges) */}
            {activePathway && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#E6C27A]">
                    <GitBranch className="h-3.5 w-3.5 text-[#D5A653]" aria-hidden="true" />
                    <span>
                      4. Hop-by-Hop Causal Chain Breakdown (Path #
                      {activePathwayIndex + 1}:{' '}
                      {Math.max(0, activePathway.steps.length - 1)} Hops ·{' '}
                      {activePathway.totalLagWeeks}w Cumulative Lag)
                    </span>
                  </div>
                  <span className="text-xs text-text-muted">
                    Click any node card to inspect it as target · Click any edge card to inspect edge parameters
                  </span>
                </div>

                <div
                  data-testid="pathway-hop-chain"
                  className="space-y-2.5"
                >
                  {activePathway.steps.map((step, stepIdx) => {
                    const nodeMeta = NODE_BY_ID.get(step.nodeId);
                    const incomingEdge = step.edgeId
                      ? EDGE_BY_ID.get(step.edgeId)
                      : undefined;
                    const edgeState = step.edgeId
                      ? currentWeekEdgeStates[step.edgeId]
                      : undefined;
                    const prevStep =
                      stepIdx > 0 ? activePathway.steps[stepIdx - 1] : undefined;
                    const prevNodeMeta = prevStep
                      ? NODE_BY_ID.get(prevStep.nodeId)
                      : undefined;

                    const isOriginStep = stepIdx === 0;
                    const isTargetStep =
                      stepIdx === activePathway.steps.length - 1;
                    const isBottleneckEdge =
                      step.edgeId !== undefined &&
                      step.edgeId === activePathway.bottleneckEdgeId;
                    const isSelectedEdgeCard =
                      step.edgeId !== undefined &&
                      step.edgeId === selectedEdgeId;

                    const hopLagWeeks = incomingEdge
                      ? Math.max(0, Math.round(incomingEdge.transitLagWeeks.value))
                      : null;
                    const hasFiniteCumLag = Number.isFinite(
                      step.cumulativeLagWeeks,
                    );
                    const estArrivalWeek = hasFiniteCumLag
                      ? step.cumulativeLagWeeks === 0
                        ? 1
                        : 1 + step.cumulativeLagWeeks
                      : null;
                    const isWaveInTransitAtWeek =
                      !isZeroShock &&
                      hasFiniteCumLag &&
                      step.cumulativeLagWeeks > 0 &&
                      estArrivalWeek !== null &&
                      currentWeek < estArrivalWeek;

                    return (
                      <React.Fragment
                        key={`${step.nodeId}-${step.edgeId ?? 'origin'}-${stepIdx}`}
                      >
                        {/* Directed Edge Connector Card (for hops k >= 1) */}
                        {stepIdx > 0 && (
                          <div
                            data-testid={`pathway-step-edge-${step.edgeId ?? stepIdx}`}
                            onClick={() => {
                              if (step.edgeId) {
                                selectEdge(step.edgeId);
                              }
                            }}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (
                                (e.key === 'Enter' || e.key === ' ') &&
                                step.edgeId
                              ) {
                                e.preventDefault();
                                selectEdge(step.edgeId);
                              }
                            }}
                            className={`ml-4 rounded-sm border p-3 transition-colors cursor-pointer sm:ml-8 ${
                              isSelectedEdgeCard
                                ? 'border-[#D5A653] bg-[#D5A653]/12'
                                : isBottleneckEdge
                                  ? 'border-[#D5A653]/55 bg-[#D5A653]/8'
                                  : 'border-border-subtle bg-elevated/45 hover:border-[#354B66]'
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className="rounded-sm bg-recess border border-border-subtle px-2 py-0.5 font-mono text-[11px] font-semibold text-[#B8D0E8]">
                                  Hop {stepIdx} Edge · {step.edgeId ?? 'unknown'}
                                </span>
                                <span className="font-semibold text-text-secondary">
                                  {prevNodeMeta?.shortLabel ??
                                    prevStep?.nodeName ??
                                    'Upstream'}{' '}
                                  → {nodeMeta?.shortLabel ?? step.nodeName}
                                </span>
                                {isBottleneckEdge && (
                                  <span className="inline-flex items-center gap-1 rounded-sm border border-[#D5A653]/55 bg-[#D5A653]/15 px-2 py-0.5 font-mono text-[11px] font-bold text-[#E6C27A]">
                                    <Lock
                                      className="h-3 w-3"
                                      aria-hidden="true"
                                    />
                                    PRIMARY BOTTLENECK LINK
                                  </span>
                                )}
                                <DataTierBadge
                                  classification={step.classification}
                                  confidence={step.confidence}
                                  compact
                                />
                              </div>

                              <span className="font-mono text-[11px] text-text-muted">
                                Directed Edge Metrics (Week {currentWeek})
                              </span>
                            </div>

                            {step.mechanismSummary && (
                              <p className="mt-1.5 text-xs text-text-secondary">
                                {step.mechanismSummary}
                              </p>
                            )}

                            {/* Edge-Level Quantitative Metrics Grid */}
                            <div className="mt-2.5 grid grid-cols-2 gap-px border border-border-subtle bg-border-subtle sm:grid-cols-3 lg:grid-cols-6 font-mono text-xs">
                              <div className="bg-recess/95 p-2">
                                <div className="text-[11px] text-text-muted">
                                  Dependency Weight
                                </div>
                                <div className="mt-0.5 font-semibold text-text-primary tabular-nums">
                                  {typeof step.dependencyWeight === 'number' &&
                                  Number.isFinite(step.dependencyWeight)
                                    ? `${(step.dependencyWeight * 100).toFixed(0)}% share`
                                    : incomingEdge
                                      ? `${(
                                          incomingEdge.dependencyWeight.value *
                                          100
                                        ).toFixed(0)}% share`
                                      : 'Unavailable'}
                                </div>
                              </div>

                              <div className="bg-recess/95 p-2">
                                <div className="text-[11px] text-text-muted">
                                  Input Criticality
                                </div>
                                <div className="mt-0.5 font-semibold text-[#E6C27A] tabular-nums">
                                  {typeof step.inputCriticality === 'number' &&
                                  Number.isFinite(step.inputCriticality)
                                    ? `${(step.inputCriticality * 100).toFixed(0)}% (c=${step.inputCriticality.toFixed(2)})`
                                    : incomingEdge
                                      ? `${(
                                          incomingEdge.inputCriticality.value *
                                          100
                                        ).toFixed(0)}%`
                                      : 'Unavailable'}
                                </div>
                              </div>

                              <div className="bg-recess/95 p-2">
                                <div className="text-[11px] text-text-muted">
                                  Hop Transit Lag
                                </div>
                                <div className="mt-0.5 font-semibold text-text-primary tabular-nums">
                                  {hopLagWeeks !== null
                                    ? `+${hopLagWeeks} ${hopLagWeeks === 1 ? 'week' : 'weeks'}`
                                    : 'Unavailable'}
                                </div>
                              </div>

                              <div className="bg-recess/95 p-2">
                                <div className="text-[11px] text-text-muted">
                                  Cumulative Lag
                                </div>
                                <div className="mt-0.5 font-semibold text-[#B8D0E8] tabular-nums">
                                  {hasFiniteCumLag && estArrivalWeek !== null
                                    ? `${step.cumulativeLagWeeks}w (Arrives W${estArrivalWeek})`
                                    : 'Unavailable'}
                                </div>
                              </div>

                              <div className="bg-recess/95 p-2">
                                <div className="text-[11px] text-text-muted">
                                  Active Bypass (W{currentWeek})
                                </div>
                                <div className="mt-0.5 font-semibold text-[#9CE2C6] tabular-nums">
                                  {Number.isFinite(step.edgeActiveBypassShare)
                                    ? `${(
                                        step.edgeActiveBypassShare * 100
                                      ).toFixed(1)}%`
                                    : 'Unavailable'}
                                </div>
                              </div>

                              <div className="bg-recess/95 p-2">
                                <div className="text-[11px] text-text-muted">
                                  Transmitted Disruption (W{currentWeek})
                                </div>
                                <div className="mt-0.5 font-semibold text-[#F4A5B0] tabular-nums">
                                  {edgeState &&
                                  Number.isFinite(
                                    edgeState.transmittedDisruption,
                                  )
                                    ? `${(
                                        edgeState.transmittedDisruption * 100
                                      ).toFixed(1)}%`
                                    : 'Unavailable'}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Node Card along the Pathway */}
                        <div
                          data-testid={`pathway-step-node-${step.nodeId}`}
                          className={`rounded-sm border p-3.5 transition-colors ${
                            step.nodeId === selectedNode.id
                              ? 'border-[#D5A653] border-l-2 border-l-[#D5A653] bg-elevated/85'
                              : isOriginStep
                                ? 'border-[#E05A6D]/45 border-l-2 border-l-[#E05A6D] bg-[#E05A6D]/8'
                                : 'border-border-subtle bg-recess/90'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-sm px-2 py-0.5 font-mono text-[11px] font-bold ${
                                  isOriginStep
                                    ? 'bg-[#E05A6D]/18 text-[#F4A5B0] border border-[#E05A6D]/45'
                                    : isTargetStep
                                      ? 'bg-[#D5A653]/18 text-[#E6C27A] border border-[#D5A653]/50'
                                      : 'bg-elevated text-text-secondary border border-border-subtle'
                                }`}
                              >
                                {isOriginStep
                                  ? 'Origin · Step 1'
                                  : isTargetStep
                                    ? `Target · Step ${stepIdx + 1}`
                                    : `Intermediate · Step ${stepIdx + 1}`}
                              </span>

                              <button
                                type="button"
                                onClick={() => selectNode(step.nodeId)}
                                data-testid={`pathway-select-node-btn-${step.nodeId}`}
                                className="text-left text-xs font-bold text-text-primary hover:text-[#E6C27A] hover:underline"
                              >
                                {step.nodeName}
                              </button>

                              {nodeMeta && (
                                <span className="rounded-sm border border-border-subtle bg-panel px-2 py-0.5 font-mono text-[11px] text-text-secondary">
                                  Tier {nodeMeta.tierIndex} ·{' '}
                                  {CATEGORY_LABELS[nodeMeta.category]} ·{' '}
                                  {nodeMeta.regionCode}
                                </span>
                              )}

                              {isWaveInTransitAtWeek && (
                                <span className="rounded-sm border border-[#D5A653]/40 bg-[#D5A653]/15 px-2 py-0.5 font-mono text-[11px] text-[#E6C27A]">
                                  In Transit at W{currentWeek} (Path Arrives W
                                  {estArrivalWeek})
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <SeverityBadge
                                band={step.severityBand}
                                score={
                                  Number.isFinite(step.targetRei)
                                    ? step.targetRei
                                    : undefined
                                }
                              />
                              {step.nodeId !== selectedNode.id && (
                                <button
                                  type="button"
                                  onClick={() => selectNode(step.nodeId)}
                                  className="rounded-sm border border-[#D5A653]/45 bg-[#D5A653]/15 px-2 py-0.5 text-[11px] font-medium text-[#F3EFE5] hover:bg-[#D5A653]/25"
                                >
                                  Inspect as Target
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Node-Level Quantitative Metrics Grid at Requested Week */}
                          <div className="mt-2.5 grid grid-cols-2 gap-px border border-border-subtle bg-border-subtle sm:grid-cols-4 font-mono text-xs">
                            <div className="bg-panel p-2">
                              <div className="text-[11px] text-text-muted">
                                Week {currentWeek} REI
                              </div>
                              <div className="mt-0.5 font-semibold text-[#F4A5B0] tabular-nums">
                                {Number.isFinite(step.targetRei)
                                  ? `${step.targetRei.toFixed(1)} / 100`
                                  : 'Unavailable'}
                              </div>
                            </div>

                            <div className="bg-panel p-2">
                              <div className="text-[11px] text-text-muted">
                                Week {currentWeek} CPI
                              </div>
                              <div className="mt-0.5 font-semibold text-[#E6C27A] tabular-nums">
                                {Number.isFinite(step.cpiAtWeek)
                                  ? `${step.cpiAtWeek.toFixed(1)} / 100`
                                  : 'Unavailable'}
                              </div>
                            </div>

                            <div className="bg-panel p-2">
                              <div className="text-[11px] text-text-muted">
                                Remaining Inventory (W{currentWeek})
                              </div>
                              <div className="mt-0.5 font-semibold text-[#9CE2C6] tabular-nums">
                                {Number.isFinite(step.targetInventoryDays)
                                  ? `${step.targetInventoryDays.toFixed(1)} days`
                                  : 'Unavailable'}
                              </div>
                            </div>

                            <div className="bg-panel p-2">
                              <div className="text-[11px] text-text-muted">
                                Cumulative Lag from Origin
                              </div>
                              <div className="mt-0.5 font-semibold text-text-primary tabular-nums">
                                {hasFiniteCumLag
                                  ? `${step.cumulativeLagWeeks} ${step.cumulativeLagWeeks === 1 ? 'week' : 'weeks'}`
                                  : 'Unavailable'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* Section F: Visible Scientific & Methodological Guardrail Note */}
        <footer
          data-testid="pathway-methodology-note"
          className="rounded-sm border border-border-subtle border-l-2 border-l-[#D5A653] bg-recess/85 p-3.5 text-xs text-text-secondary"
        >
          <div className="flex items-start gap-2">
            <ShieldAlert
              className="mt-0.5 h-4 w-4 shrink-0 text-[#D5A653]"
              aria-hidden="true"
            />
            <div className="space-y-1">
              <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-[#E6C27A]">
                Methodological Guardrail: Structural Transmission Heuristic vs. Causal Attribution
              </div>
              <p className="leading-relaxed">
                Path scores (<span className="font-mono text-text-primary">0–100</span>) are{' '}
                <strong className="text-text-primary">
                  structural transmission heuristics
                </strong>{' '}
                computed from geometric corridor conductance, hop count, and Week-{currentWeek} edge flow stress. They are{' '}
                <strong className="text-text-primary">
                  not percentages of total Relative Exposure Index (REI)
                </strong>{' '}
                and must not be interpreted as additive causal contributions, because EconoLoom&apos;s simulation engine aggregates upstream shortfalls through a nonlinear hybrid weighted-average and Leontief bottleneck operator coupled with shared node-level inventory buffers (see{' '}
                <span className="font-mono text-text-primary">SIMULATION_METHODOLOGY.md</span>{' '}
                Section 4). All node and edge metrics above reflect the actual simulated state at{' '}
                <strong className="text-text-primary">Week {currentWeek}</strong>.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </section>
  );
};
