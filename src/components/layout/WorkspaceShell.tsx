import React, { useMemo } from 'react';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Compass,
  Database,
  ExternalLink,
  Filter,
  Globe2,
  GitBranch,
  History,
  Info,
  Search,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import {
  EDGES,
  MODEL_ASSUMPTIONS,
  NODE_BY_ID,
  NODES,
  SOURCES,
} from '../../data';
import { useScenarioStore } from '../../state/useScenarioStore';
import type { DataClassification, NodeCategory } from '../../types/domain';
import { Button } from '../common/Button';
import { DataTierBadge } from '../common/DataTierBadge';
import { Panel } from '../common/Panel';
import { SeverityBadge } from '../common/SeverityBadge';
import { NodeBaselineInspector } from '../inspector/NodeBaselineInspector';
import { ScenarioComparisonView } from '../comparison/ScenarioComparisonView';
import { WorldMap } from '../map/WorldMap';
import { DependencyNetwork } from '../network/DependencyNetwork';
import { ImpactPathwayExplorer } from '../pathway/ImpactPathwayExplorer';
import { SimulationTimeline } from '../timeline/SimulationTimeline';

const CATEGORY_FILTER_OPTIONS: { value: NodeCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All Nodes (48)' },
  { value: 'chokepoint', label: 'Chokepoints (3)' },
  { value: 'geography', label: 'Geographies (9)' },
  { value: 'commodity', label: 'Commodities (14)' },
  { value: 'industry', label: 'Industries (14)' },
  { value: 'consumer_category', label: 'Consumer Baskets (8)' },
];

const CLASSIFICATION_FILTER_OPTIONS: {
  value: DataClassification | 'all';
  label: string;
}[] = [
  { value: 'all', label: 'All Classifications' },
  { value: 'observed', label: 'Observed' },
  { value: 'derived', label: 'Derived' },
  { value: 'model_parameter', label: 'Model Parameter' },
];

export const WorkspaceShell: React.FC = () => {
  const {
    activePreset,
    selectedNode,
    currentWeek,
    simulationResult,
    currentWeekNodeStates,
    currentWeekEdgeStates,
    currentWeekSummary,
    activeWorkspaceTab,
    canvasViewMode,
    datasetFilter,
    validationReport,
    selectNode,
    setActiveWorkspaceTab,
    setCanvasViewMode,
    setCategoryFilter,
    setClassificationFilter,
    setSearchQuery,
  } = useScenarioStore();

  const filteredNodes = useMemo(() => {
    const query = datasetFilter.searchQuery.trim().toLowerCase();
    return NODES.filter((node) => {
      if (
        datasetFilter.category !== 'all' &&
        node.category !== datasetFilter.category
      ) {
        return false;
      }
      if (datasetFilter.classification !== 'all') {
        const classifications = [
          node.baselineInventoryDays.classification,
          node.substitutionPotential.classification,
          node.pricePassThroughElasticity.classification,
          node.baselineImportDependency.classification,
        ];
        if (!classifications.includes(datasetFilter.classification)) {
          return false;
        }
      }
      if (query.length > 0) {
        const haystack =
          `${node.id} ${node.name} ${node.shortLabel} ${node.regionCode} ${node.isicCode ?? ''} ${node.description}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [datasetFilter]);

  const topIndustryNode = NODE_BY_ID.get(currentWeekSummary.mostExposedIndustryId);
  const topConsumerNode = NODE_BY_ID.get(currentWeekSummary.mostExposedConsumerId);

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left/Center Main Workbench Area (8 columns on desktop) */}
        <div className="space-y-6 lg:col-span-8">
          {activeWorkspaceTab === 'overview' && (
            <>
              {/* Week-t Network Simulation Summary Telemetry Strip */}
              <div
                className="grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-border-subtle border-t-2 border-t-[#D5A653]/75 bg-border-subtle shadow-panel sm:grid-cols-4"
                aria-label="Current week network simulation summary"
              >
                <div className="bg-panel p-3.5">
                  <div className="flex items-center justify-between font-mono text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    <span>Week {currentWeek} Peak REI</span>
                    <Activity
                      className="h-3.5 w-3.5 text-[#D5A653]"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="mt-1 font-mono text-lg font-bold text-[#F3EFE5] tabular-nums">
                    {currentWeekSummary.peakNetworkRei.toFixed(1)}{' '}
                    <span className="text-xs font-normal text-text-muted">/ 100</span>
                  </div>
                  <div className="mt-0.5 font-mono text-xs text-text-secondary tabular-nums">
                    Horizon Peak:{' '}
                    <span className="text-[#E6C27A]">
                      {simulationResult.overallPeakSummary.peakNetworkRei.toFixed(1)}
                    </span>{' '}
                    (W{simulationResult.overallPeakSummary.peakWeek})
                  </div>
                </div>

                <div className="bg-panel p-3.5">
                  <div className="font-mono text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    Severely Exposed Nodes
                  </div>
                  <div className="mt-1 font-mono text-lg font-bold text-[#F598A6] tabular-nums">
                    {currentWeekSummary.severelyExposedCount}{' '}
                    <span className="text-xs font-normal text-text-muted">
                      / 48 nodes
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-text-secondary">
                    REI ≥ 65 at Week {currentWeek}
                  </div>
                </div>

                <div className="bg-panel p-3.5">
                  <div className="font-mono text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    Most Exposed Industry (W{currentWeek})
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      selectNode(currentWeekSummary.mostExposedIndustryId)
                    }
                    className="mt-1 truncate text-left font-display text-sm font-semibold text-[#E6C27A] hover:underline"
                  >
                    {topIndustryNode?.shortLabel ??
                      currentWeekSummary.mostExposedIndustryId}
                  </button>
                  <div className="mt-0.5 font-mono text-xs text-text-secondary tabular-nums">
                    REI{' '}
                    {(
                      currentWeekNodeStates[
                        currentWeekSummary.mostExposedIndustryId
                      ]?.relativeExposureIndex ?? 0
                    ).toFixed(1)}{' '}
                    · CPI{' '}
                    {(
                      currentWeekNodeStates[
                        currentWeekSummary.mostExposedIndustryId
                      ]?.costPressureIndex ?? 0
                    ).toFixed(1)}
                  </div>
                </div>

                <div className="bg-panel p-3.5">
                  <div className="font-mono text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    Top Consumer Basket (W{currentWeek})
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      selectNode(currentWeekSummary.mostExposedConsumerId)
                    }
                    className="mt-1 truncate text-left font-display text-sm font-semibold text-[#80D8B6] hover:underline"
                  >
                    {topConsumerNode?.shortLabel ??
                      currentWeekSummary.mostExposedConsumerId}
                  </button>
                  <div className="mt-0.5 font-mono text-xs text-text-secondary tabular-nums">
                    REI{' '}
                    {(
                      currentWeekNodeStates[
                        currentWeekSummary.mostExposedConsumerId
                      ]?.relativeExposureIndex ?? 0
                    ).toFixed(1)}{' '}
                    · 1st Impact:{' '}
                    {simulationResult.overallPeakSummary.firstConsumerImpactWeek !==
                    null
                      ? `W${simulationResult.overallPeakSummary.firstConsumerImpactWeek}`
                      : 'None'}
                  </div>
                </div>
              </div>

              {/* Zone C: 26-Week Simulation Timeline & Trajectory Explorer */}
              <SimulationTimeline />

              {/* Active Scenario Narrative & Featured Causal Chain */}
              <Panel
                title={activePreset.title}
                subtitle={activePreset.subtitle}
                badge={
                  <span className="rounded-sm border border-[#D5A653]/40 bg-[#D5A653]/12 px-2 py-0.5 font-mono text-xs text-[#E6C27A]">
                    Preset: {activePreset.id}
                  </span>
                }
                actions={
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveWorkspaceTab('dataset_explorer')}
                    icon={<Database className="h-3.5 w-3.5 text-[#D5A653]" />}
                  >
                    Browse All 48 Nodes
                  </Button>
                }
              >
                <div className="space-y-5">
                  {/* Narrative Hook & Historical Precedent */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="border-l-2 border-l-[#D5A653] bg-recess/80 p-4">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#E6C27A]">
                        <Sparkles className="h-3.5 w-3.5 text-[#D5A653]" aria-hidden="true" />
                        <span>Structural Transmission Mechanism</span>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-text-primary/95">
                        {activePreset.narrativeHook}
                      </p>
                    </div>

                    <div className="border-l-2 border-l-[#7CA3C7] bg-recess/80 p-4">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#ACC7E0]">
                        <History className="h-3.5 w-3.5 text-[#7CA3C7]" aria-hidden="true" />
                        <span>Empirical & Historical Calibration Precedent</span>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-text-secondary">
                        {activePreset.historicalPrecedent}
                      </p>
                    </div>
                  </div>

                  {/* Interactive Featured Causal Thread */}
                  <div className="rounded-sm border border-border-subtle bg-recess/90 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle/70 pb-3">
                      <div>
                        <h3 className="font-display text-sm font-semibold tracking-tight text-text-primary">
                          Featured Multi-Tier Causal Pathway (Week {currentWeek} Simulated State)
                        </h3>
                        <p className="mt-0.5 text-xs text-text-secondary">
                          Traces how the shock propagates from origin chokepoint to everyday household products across audited dependency edges.
                        </p>
                      </div>
                      <DataTierBadge classification="observed" confidence="high" compact />
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {activePreset.featuredCausalNodeIds.map((nodeId, idx) => {
                        const node = NODE_BY_ID.get(nodeId);
                        if (!node) return null;
                        const isSelected = selectedNode.id === node.id;
                        const nodeState = currentWeekNodeStates[node.id];
                        const nextNodeId = activePreset.featuredCausalNodeIds[idx + 1];
                        const connectingEdge = nextNodeId
                          ? EDGES.find(
                              (e) =>
                                e.sourceNodeId === node.id &&
                                e.targetNodeId === nextNodeId,
                            )
                          : undefined;
                        const edgeState = connectingEdge
                          ? currentWeekEdgeStates[connectingEdge.id]
                          : undefined;

                        return (
                          <React.Fragment key={node.id}>
                            <button
                              type="button"
                              onClick={() => selectNode(node.id)}
                              className={`flex flex-col rounded-sm border px-3 py-2 text-left transition-all ${
                                isSelected
                                  ? 'border-[#D5A653] bg-elevated text-text-primary shadow-glow'
                                  : 'border-border-subtle bg-panel text-text-secondary hover:border-[#7CA3C7]/50 hover:text-text-primary'
                              }`}
                            >
                              <span className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
                                Tier {node.tierIndex} · {node.category.replace('_', ' ')}
                              </span>
                              <span className="mt-0.5 font-display text-xs font-semibold text-text-primary">
                                {node.shortLabel}
                              </span>
                              <div className="mt-1 flex items-center gap-2 font-mono text-xs tabular-nums">
                                <span className="text-[#E6C27A]">
                                  REI {(nodeState?.relativeExposureIndex ?? 0).toFixed(1)}
                                </span>
                                <span className="text-[#80D8B6]">
                                  Buf:{' '}
                                  {(
                                    nodeState?.remainingInventoryDays ??
                                    node.baselineInventoryDays.value
                                  ).toFixed(0)}
                                  d
                                </span>
                              </div>
                            </button>

                            {nextNodeId && (
                              <div className="flex flex-col items-center px-1 text-text-muted">
                                <ArrowRight
                                  className="h-4 w-4 text-[#D5A653]"
                                  aria-hidden="true"
                                />
                                {connectingEdge && (
                                  <span className="font-mono text-xs text-text-secondary tabular-nums">
                                    {Math.round(
                                      connectingEdge.dependencyWeight.value * 100,
                                    )}
                                    % · +{connectingEdge.transitLagWeeks.value}w
                                  </span>
                                )}
                                {edgeState && edgeState.transmittedDisruption > 0 && (
                                  <span className="font-mono text-xs text-[#E6C27A] tabular-nums">
                                    Flux {Math.round(edgeState.transmittedDisruption * 100)}%
                                  </span>
                                )}
                              </div>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>

                  {/* Epistemic Guardrails: Supported vs Excluded */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-sm border border-border-subtle border-l-2 border-l-[#38B688] bg-recess/70 p-3.5">
                      <div className="flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-[#80D8B6]">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-[#38B688]" aria-hidden="true" />
                        <span>Supported Scenario Exploration Outputs</span>
                      </div>
                      <ul className="mt-2 space-y-1.5 text-xs text-text-secondary">
                        {activePreset.supportedOutputs.map((item, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#38B688]" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-sm border border-border-subtle border-l-2 border-l-[#E05A6D] bg-recess/70 p-3.5">
                      <div className="flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-[#F598A6]">
                        <ShieldAlert className="h-4 w-4 shrink-0 text-[#E05A6D]" aria-hidden="true" />
                        <span>Explicit Epistemic Guardrails (Excluded Claims)</span>
                      </div>
                      <ul className="mt-2 space-y-1.5 text-xs text-text-secondary">
                        {activePreset.excludedClaims.map((item, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#E05A6D]" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </Panel>

              {/* Interactive Visual Stage Mode Switcher (Map + Directed Dependency Graph) */}
              <div
                data-testid="visual-stage-mode-bar"
                className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border-subtle bg-panel px-4 py-2.5 shadow-panel"
              >
                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  <Compass className="h-4 w-4 text-[#D5A653]" aria-hidden="true" />
                  <span className="font-display text-sm font-semibold text-text-primary">
                    Interactive Visual Stage
                  </span>
                  <span className="hidden sm:inline text-text-muted">
                    · Synchronized with Week {currentWeek}, Selected Node ({selectedNode.shortLabel}), and Scenario Controls
                  </span>
                </div>

                <div
                  role="group"
                  aria-label="Canvas visualization mode"
                  className="inline-flex rounded-sm border border-border-subtle bg-recess p-0.5"
                >
                  {(
                    [
                      {
                        id: 'split',
                        label: 'Split View (Map + Graph)',
                        Icon: Compass,
                      },
                      {
                        id: 'network',
                        label: 'Dependency Graph (48 Nodes)',
                        Icon: GitBranch,
                      },
                      {
                        id: 'map',
                        label: 'Geographic Map (12 Locations)',
                        Icon: Globe2,
                      },
                    ] as const
                  ).map(({ id, label, Icon }) => {
                    const isActive = canvasViewMode === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setCanvasViewMode(id)}
                        aria-pressed={isActive}
                        data-testid={`canvas-mode-${id}`}
                        className={`inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-medium transition-colors ${
                          isActive
                            ? 'bg-[#D5A653]/20 text-[#F3EFE5] border border-[#D5A653]/60'
                            : 'text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-[#D5A653]' : ''}`} aria-hidden="true" />
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Deliverable B: Interactive Geographic Chokepoint & Corridor Map */}
              {(canvasViewMode === 'split' || canvasViewMode === 'map') && (
                <WorldMap />
              )}

              {/* Deliverable A: Interactive Directed Supply-Chain Dependency Graph */}
              {(canvasViewMode === 'split' || canvasViewMode === 'network') && (
                <DependencyNetwork />
              )}

              {/* Deliverable C: Interactive Impact Pathway Explorer */}
              <ImpactPathwayExplorer />
            </>
          )}

          {activeWorkspaceTab === 'pathway_explorer' && (
            <>
              <SimulationTimeline />
              <ImpactPathwayExplorer />
              <DependencyNetwork />
            </>
          )}

          {activeWorkspaceTab === 'scenario_comparison' && (
            <>
              <SimulationTimeline />
              <ScenarioComparisonView />
            </>
          )}

          {activeWorkspaceTab === 'dataset_explorer' && (
            <Panel
              title="Audited Supply Network Explorer (48 Nodes · 78 Directed Edges)"
              subtitle="Filter by structural tier, provenance classification, or keyword. Select any row to inspect its Week-t simulated exposure and source citations."
            >
              <div className="space-y-4">
                {/* Filter Bar */}
                <div className="flex flex-col gap-3 rounded-sm border border-border-subtle bg-recess/80 p-3.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Filter
                      className="mr-1 h-3.5 w-3.5 text-[#D5A653]"
                      aria-hidden="true"
                    />
                    {CATEGORY_FILTER_OPTIONS.map((opt) => (
                      <Button
                        key={opt.value}
                        variant="pill"
                        size="sm"
                        active={datasetFilter.category === opt.value}
                        onClick={() => setCategoryFilter(opt.value)}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>

                  <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative flex-1">
                      <Search
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
                        aria-hidden="true"
                      />
                      <input
                        type="search"
                        value={datasetFilter.searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by node name, ID, region code, or ISIC sector..."
                        aria-label="Search network nodes"
                        className="w-full rounded-sm border border-border-subtle bg-panel py-1.5 pl-9 pr-3 text-xs text-text-primary placeholder:text-text-muted focus:border-[#D5A653] focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <label
                        htmlFor="classification-filter"
                        className="text-xs text-text-secondary"
                      >
                        Provenance:
                      </label>
                      <select
                        id="classification-filter"
                        value={datasetFilter.classification}
                        onChange={(e) =>
                          setClassificationFilter(
                            e.target.value as DataClassification | 'all',
                          )
                        }
                        className="rounded-sm border border-border-subtle bg-panel px-2.5 py-1.5 text-xs text-text-primary focus:border-[#D5A653] focus:outline-none"
                      >
                        {CLASSIFICATION_FILTER_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Nodes Table */}
                <div className="overflow-x-auto rounded-sm border border-border-subtle">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-border-subtle bg-elevated/80 font-mono text-[11px] uppercase tracking-wider text-text-secondary">
                        <th className="px-3 py-2.5 font-semibold">Node & ID</th>
                        <th className="px-3 py-2.5 font-semibold">Tier / Category</th>
                        <th className="px-3 py-2.5 font-semibold">
                          Week {currentWeek} Simulated REI
                        </th>
                        <th className="px-3 py-2.5 text-right font-semibold">
                          Week {currentWeek} CPI
                        </th>
                        <th className="px-3 py-2.5 text-right font-semibold">
                          Inventory Buffer
                        </th>
                        <th className="px-3 py-2.5 text-right font-semibold">
                          Max Substitution
                        </th>
                        <th className="px-3 py-2.5 font-semibold">Provenance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle/60 bg-panel">
                      {filteredNodes.map((node) => {
                        const isSelected = selectedNode.id === node.id;
                        const nodeState = currentWeekNodeStates[node.id];
                        return (
                          <tr
                            key={node.id}
                            onClick={() => selectNode(node.id)}
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                selectNode(node.id);
                              }
                            }}
                            aria-selected={isSelected}
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-[#D5A653]/15 text-text-primary'
                                : 'hover:bg-elevated/60'
                            }`}
                          >
                            <td className="px-3 py-2.5">
                              <div className="font-display font-semibold text-text-primary">
                                {node.name}
                              </div>
                              <div className="font-mono text-xs text-text-muted">
                                {node.id} · {node.regionCode}
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="font-mono text-xs text-[#E6C27A]">
                                T{node.tierIndex}
                              </span>{' '}
                              <span className="text-text-secondary">
                                · {node.category.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              {nodeState && (
                                <SeverityBadge
                                  band={nodeState.severityBand}
                                  score={nodeState.relativeExposureIndex}
                                />
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono font-semibold text-[#E6C27A] tabular-nums">
                              {(nodeState?.costPressureIndex ?? 0).toFixed(1)}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono font-semibold text-[#80D8B6] tabular-nums">
                              {(
                                nodeState?.remainingInventoryDays ??
                                node.baselineInventoryDays.value
                              ).toFixed(1)}
                              d / {node.baselineInventoryDays.value}d
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-text-primary tabular-nums">
                              {Math.round(node.substitutionPotential.value * 100)}%
                            </td>
                            <td className="px-3 py-2.5">
                              <DataTierBadge
                                classification={
                                  node.baselineInventoryDays.classification
                                }
                                compact
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filteredNodes.length === 0 && (
                    <div className="p-6 text-center text-xs text-text-muted">
                      No nodes match the current filter criteria.
                    </div>
                  )}
                </div>
              </div>
            </Panel>
          )}

          {activeWorkspaceTab === 'evidence_sources' && (
            <div className="space-y-6">
              {/* Automated Validation Report Card */}
              <Panel
                title="Automated Network & Provenance Validation Report"
                subtitle="Live verification executed by src/engine/validateNetwork.ts"
                badge={
                  <span className="rounded-sm border border-[#38B688]/45 bg-[#38B688]/15 px-2 py-0.5 font-mono text-xs font-semibold text-[#80D8B6]">
                    {validationReport.isValid
                      ? 'PASS · 0 Errors'
                      : `${validationReport.issues.length} Issues`}
                  </span>
                }
              >
                <div className="grid grid-cols-2 gap-px border border-border-subtle bg-border-subtle sm:grid-cols-4">
                  <div className="bg-recess/90 p-3.5">
                    <div className="font-mono text-[11px] uppercase tracking-wider text-text-muted">Audited Nodes</div>
                    <div className="mt-1 font-mono text-lg font-bold text-text-primary tabular-nums">
                      {validationReport.nodeCount}
                    </div>
                    <div className="text-xs text-[#80D8B6]">
                      3 Chk · 9 Geo · 14 Com · 14 Ind · 8 Con
                    </div>
                  </div>
                  <div className="bg-recess/90 p-3.5">
                    <div className="font-mono text-[11px] uppercase tracking-wider text-text-muted">Directed DAG Edges</div>
                    <div className="mt-1 font-mono text-lg font-bold text-text-primary tabular-nums">
                      {validationReport.edgeCount}
                    </div>
                    <div className="text-xs text-[#80D8B6]">
                      Topological Sort Acyclic
                    </div>
                  </div>
                  <div className="bg-recess/90 p-3.5">
                    <div className="font-mono text-[11px] uppercase tracking-wider text-text-muted">Observed & Derived</div>
                    <div className="mt-1 font-mono text-lg font-bold text-[#E6C27A] tabular-nums">
                      {validationReport.classificationCounts.observed +
                        validationReport.classificationCounts.derived}
                    </div>
                    <div className="text-xs text-text-secondary">
                      TraceableValue metrics
                    </div>
                  </div>
                  <div className="bg-recess/90 p-3.5">
                    <div className="font-mono text-[11px] uppercase tracking-wider text-text-muted">Primary Sources</div>
                    <div className="mt-1 font-mono text-lg font-bold text-[#80D8B6] tabular-nums">
                      {validationReport.sourceCount}
                    </div>
                    <div className="text-xs text-text-secondary">
                      100% Citation Linked
                    </div>
                  </div>
                </div>
              </Panel>

              {/* Primary Source Registry */}
              <Panel
                title="Primary Empirical Data Sources & Attribution Registry"
                subtitle="Official datasets, statistical releases, and peer-reviewed briefs backing EconoLoom parameters"
              >
                <div className="grid gap-px border border-border-subtle bg-border-subtle sm:grid-cols-2">
                  {SOURCES.map((src) => (
                    <div
                      key={src.id}
                      className="flex flex-col justify-between bg-recess/95 p-4"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs text-[#E6C27A]">
                            {src.id}
                          </span>
                          <span className="rounded-sm border border-border-subtle bg-panel px-2 py-0.5 font-mono text-[11px] text-text-muted">
                            {src.publicationDate}
                          </span>
                        </div>
                        <h3 className="mt-1.5 font-display text-sm font-semibold text-text-primary">
                          {src.title}
                        </h3>
                        <p className="mt-0.5 text-xs font-medium text-text-secondary">
                          {src.organization}
                        </p>
                        <p className="mt-2 text-xs leading-relaxed text-text-muted">
                          {src.usageScope}
                        </p>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle/60 pt-2.5 text-xs">
                        <span className="text-text-muted">{src.license}</span>
                        {src.url.startsWith('http') && (
                          <a
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-medium text-[#E6C27A] hover:underline"
                          >
                            <span>Official Source</span>
                            <ExternalLink className="h-3 w-3" aria-hidden="true" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              {/* Model Assumptions */}
              <Panel
                title="Documented Structural Model Assumptions"
                subtitle="Explicit mathematical and domain assumptions recorded per DATA_STRATEGY.md and SIMULATION_METHODOLOGY.md"
              >
                <div className="grid gap-px border border-border-subtle bg-border-subtle sm:grid-cols-2">
                  {MODEL_ASSUMPTIONS.map((asm) => (
                    <div
                      key={asm.id}
                      className="bg-recess/95 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 font-display text-sm font-semibold text-text-primary">
                          <Compass
                            className="h-3.5 w-3.5 text-[#D5A653]"
                            aria-hidden="true"
                          />
                          {asm.title}
                        </span>
                        <DataTierBadge
                          classification={asm.classification}
                          confidence={asm.confidence}
                          compact
                        />
                      </div>
                      <p className="mt-1.5 text-xs text-text-primary/90">
                        {asm.valueSummary}
                      </p>
                      <p className="mt-2 text-xs text-text-secondary">
                        <strong className="text-text-primary">Rationale:</strong>{' '}
                        {asm.rationale}
                      </p>
                      <p className="mt-1.5 text-xs text-text-muted">
                        <strong className="text-text-secondary">Limitation:</strong>{' '}
                        {asm.limitation}
                      </p>
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-[#80D8B6]">
                        <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>{asm.validationCheck}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          )}
        </div>

        {/* Right Docked Node Provenance & Baseline Inspector (4 columns on desktop) */}
        <div className="lg:col-span-4">
          <NodeBaselineInspector />
        </div>
      </div>
    </main>
  );
};
