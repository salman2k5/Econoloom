import React from 'react';
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpLeft,
  ExternalLink,
  GitCommit,
  Layers,
  MapPin,
  Package,
  ShieldCheck,
} from 'lucide-react';
import { NODE_BY_ID, SOURCE_BY_ID } from '../../data';
import { useScenarioStore } from '../../state/useScenarioStore';
import type { NodeCategory } from '../../types/domain';
import { DataTierBadge } from '../common/DataTierBadge';
import { Panel } from '../common/Panel';
import { SeverityBadge } from '../common/SeverityBadge';

const CATEGORY_LABELS: Record<NodeCategory, { label: string; badgeClass: string }> = {
  chokepoint: {
    label: 'Maritime / Fab Chokepoint',
    badgeClass: 'bg-[#E05A6D]/15 text-[#F598A6] border-[#E05A6D]/45',
  },
  geography: {
    label: 'Regional Trade Hub',
    badgeClass: 'bg-[#7CA3C7]/15 text-[#ACC7E0] border-[#7CA3C7]/45',
  },
  commodity: {
    label: 'Primary / Intermediate Commodity',
    badgeClass: 'bg-[#D5A653]/15 text-[#E6C27A] border-[#D5A653]/45',
  },
  industry: {
    label: 'Processing / Manufacturing Industry',
    badgeClass: 'bg-[#6BA3BE]/15 text-[#A5C4E0] border-[#6BA3BE]/45',
  },
  consumer_category: {
    label: 'Everyday Consumer Category',
    badgeClass: 'bg-[#38B688]/15 text-[#80D8B6] border-[#38B688]/45',
  },
};

export const NodeBaselineInspector: React.FC = () => {
  const {
    selectedNode,
    selectedNodeState,
    selectedNodePathways,
    selectedPathwayIndex,
    currentWeek,
    scenarioParams,
    currentWeekEdgeStates,
    incomingEdgesForSelectedNode,
    outgoingEdgesForSelectedNode,
    selectNode,
    setSelectedPathwayIndex,
    setActiveWorkspaceTab,
  } = useScenarioStore();

  const categoryMeta = CATEGORY_LABELS[selectedNode.category];

  // Collect all unique sourceIds referenced by this node's baseline parameters and BOM
  const referencedSourceIds = Array.from(
    new Set([
      ...selectedNode.baselineInventoryDays.sourceIds,
      ...selectedNode.substitutionPotential.sourceIds,
      ...selectedNode.pricePassThroughElasticity.sourceIds,
      ...selectedNode.baselineImportDependency.sourceIds,
      ...(selectedNode.consumerBomBreakdown?.flatMap((b) => b.sourceIds) ?? []),
    ]),
  );

  const scaledMaxInventoryDays =
    Math.round(
      selectedNode.baselineInventoryDays.value *
        scenarioParams.inventoryBufferScale *
        10,
    ) / 10;

  const remainingBufferPct =
    scaledMaxInventoryDays > 0
      ? Math.min(
          100,
          Math.max(
            0,
            Math.round(
              (selectedNodeState.remainingInventoryDays /
                scaledMaxInventoryDays) *
                100,
            ),
          ),
        )
      : 0;

  const isZeroExposureAtCurrentWeek =
    selectedNodeState.relativeExposureIndex === 0 &&
    selectedNodeState.costPressureIndex === 0 &&
    selectedNodeState.rawInputShortfall === 0;

  const baselineMetrics = [
    {
      title: 'Baseline Inventory Buffer',
      tv: selectedNode.baselineInventoryDays,
      formatValue: (v: number) => `${v} days of stock`,
    },
    {
      title: 'Medium-Term Substitution Potential',
      tv: selectedNode.substitutionPotential,
      formatValue: (v: number) => `${Math.round(v * 100)}% max replaceable`,
    },
    {
      title: 'Cost Pass-Through Elasticity',
      tv: selectedNode.pricePassThroughElasticity,
      formatValue: (v: number) => `${(v * 100).toFixed(0)}% transmission`,
    },
    {
      title: 'Cross-Border Import Dependency',
      tv: selectedNode.baselineImportDependency,
      formatValue: (v: number) => `${Math.round(v * 100)}% imported share`,
    },
  ];

  return (
    <Panel
      as="aside"
      ariaLabel="Selected Node Baseline & Provenance Inspector"
      title="Node Simulation & Provenance Inspector"
      subtitle="Inspect calculated Week-t exposure alongside audited baseline parameters and citations."
      className="h-fit lg:sticky lg:top-20"
    >
      <div className="space-y-4">
        {/* Node Identity Dossier */}
        <div className="rounded-sm border border-border-subtle border-l-2 border-l-[#D5A653] bg-recess/85 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span
              className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium ${categoryMeta.badgeClass}`}
            >
              {categoryMeta.label}
            </span>
            <span className="font-mono text-xs text-text-muted">
              Tier {selectedNode.tierIndex} · {selectedNode.regionCode}
              {selectedNode.isicCode ? ` · ISIC ${selectedNode.isicCode}` : ''}
            </span>
          </div>

          <h3 className="mt-2 font-display text-lg font-bold tracking-tight text-text-primary">
            {selectedNode.name}
          </h3>
          <div className="mt-0.5 flex flex-wrap items-center gap-3 font-mono text-xs text-text-muted">
            <span>ID: {selectedNode.id}</span>
            {selectedNode.coordinates && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3 text-[#D5A653]" aria-hidden="true" />
                {selectedNode.coordinates[1].toFixed(1)}°,{' '}
                {selectedNode.coordinates[0].toFixed(1)}°
              </span>
            )}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-text-secondary">
            {selectedNode.description}
          </p>
        </div>

        {/* Simulated Output Section (Clearly Separated from Audited Baseline Data) */}
        <div
          className="space-y-3 rounded-sm border border-border-subtle border-t-2 border-t-[#D5A653] bg-recess/90 p-3.5"
          aria-label="Simulated node state for current week"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#E6C27A]">
              <Activity className="h-3.5 w-3.5 text-[#D5A653]" aria-hidden="true" />
              <span>Week {currentWeek} Simulated Output</span>
            </div>
            <span className="rounded-sm border border-[#D5A653]/40 bg-[#D5A653]/12 px-2 py-0.5 font-mono text-[11px] font-medium text-[#E6C27A]">
              Simulated Output — Model-Derived
            </span>
          </div>

          {/* Severity Badge & Core Indices */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-border-subtle bg-panel p-2.5">
            <span className="text-xs font-medium text-text-secondary">
              Exposure Severity Band
            </span>
            <SeverityBadge
              band={selectedNodeState.severityBand}
              score={selectedNodeState.relativeExposureIndex}
            />
          </div>

          <div className="grid grid-cols-2 gap-px border border-border-subtle bg-border-subtle">
            {/* Relative Exposure Index (REI) with Direct vs Indirect Breakdown */}
            <div className="bg-panel p-2.5">
              <div className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
                Relative Exposure (REI)
              </div>
              <div
                className="mt-0.5 font-mono text-base font-bold text-[#F3EFE5] tabular-nums"
                data-testid="inspector-rei-value"
              >
                {selectedNodeState.relativeExposureIndex.toFixed(1)}{' '}
                <span className="text-xs font-normal text-text-muted">/ 100</span>
              </div>
              <div
                className="mt-1 space-y-0.5 border-t border-border-subtle/60 pt-1 font-mono text-xs text-text-secondary tabular-nums"
                data-testid="inspector-rei-breakdown"
              >
                <div className="flex justify-between">
                  <span className="text-text-muted">Direct:</span>
                  <span>{selectedNodeState.directRei.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Indirect:</span>
                  <span>{selectedNodeState.indirectRei.toFixed(1)}</span>
                </div>
              </div>
            </div>

            {/* Cost-Pressure Index (CPI) */}
            <div className="bg-panel p-2.5">
              <div className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
                Cost-Pressure Index (CPI)
              </div>
              <div
                className="mt-0.5 font-mono text-base font-bold text-[#E6C27A] tabular-nums"
                data-testid="inspector-cpi-value"
              >
                {selectedNodeState.costPressureIndex.toFixed(1)}{' '}
                <span className="text-xs font-normal text-text-muted">/ 100</span>
              </div>
              <div className="mt-1 space-y-0.5 border-t border-border-subtle/60 pt-1 font-mono text-xs text-text-secondary tabular-nums">
                <div className="flex justify-between">
                  <span className="text-text-muted">Unbuffered:</span>
                  <span>
                    {(selectedNodeState.unbufferedShortfall * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Substitution:</span>
                  <span>
                    {(selectedNodeState.effectiveSubstitution * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Remaining Inventory Buffer Bar */}
          <div className="rounded-sm border border-border-subtle bg-panel p-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-text-secondary">
                Remaining Inventory Buffer
              </span>
              <span
                className="font-mono font-bold text-[#80D8B6] tabular-nums"
                data-testid="inspector-inventory-value"
              >
                {selectedNodeState.remainingInventoryDays.toFixed(1)}d /{' '}
                {scaledMaxInventoryDays.toFixed(1)}d ({remainingBufferPct}% stock ·{' '}
                {Math.round(selectedNodeState.inventoryCoverageRatio * 100)}%
                cushion)
              </span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-sm bg-elevated">
              <div
                className="h-full rounded-sm bg-[#38B688] transition-all"
                style={{
                  width: `${remainingBufferPct}%`,
                }}
              />
            </div>
          </div>

          {/* Zero-Shock or Unconnected Node Status Notice */}
          {isZeroExposureAtCurrentWeek && (
            <div className="flex items-start gap-2 rounded-sm border border-[#38B688]/35 bg-[#38B688]/10 p-2.5 text-xs text-[#80D8B6]">
              <ShieldCheck
                className="mt-0.5 h-4 w-4 shrink-0 text-[#38B688]"
                aria-hidden="true"
              />
              <div>
                {scenarioParams.shockSeverityPct === 0 ? (
                  <span>
                    <strong>Zero Shock Baseline Active:</strong> All shock
                    curtailments are 0%. Node operates at full baseline inventory (
                    {scaledMaxInventoryDays.toFixed(1)} days) with 0.0 REI and 0.0 CPI.
                  </span>
                ) : currentWeek === 0 ? (
                  <span>
                    <strong>Week 0 Pre-Shock Baseline:</strong> Shock disruption begins
                    at Week 1. Scrub or play the timeline forward to observe downstream
                    propagation.
                  </span>
                ) : selectedNodePathways.length === 0 ? (
                  <span>
                    <strong>No Active Upstream Exposure:</strong> This node is
                    structurally independent of the active shock origin.
                  </span>
                ) : (
                  <span>
                    <strong>Propagation In Transit / Absorbed:</strong> Upstream shock
                    is still in transit along lagged corridors or fully recovered at Week{' '}
                    {currentWeek}.
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Leading Upstream Causal Pathways & Bottlenecks */}
          <div className="space-y-2 border-t border-border-subtle pt-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-text-primary">
              <span className="inline-flex items-center gap-1.5">
                <GitCommit className="h-3.5 w-3.5 text-[#D5A653]" aria-hidden="true" />
                <span>Leading Upstream Causal Pathways</span>
              </span>
              <button
                type="button"
                onClick={() => setActiveWorkspaceTab('pathway_explorer')}
                data-testid="inspector-open-pathway-explorer-btn"
                className="font-mono text-[11px] font-medium text-[#E6C27A] hover:underline"
              >
                Open Pathway Explorer →
              </button>
            </div>

            {selectedNodePathways.length === 0 ? (
              <p className="rounded-sm border border-border-subtle/70 bg-panel p-2.5 text-xs text-text-muted">
                No directed upstream path connects the active shock origin to this node.
              </p>
            ) : (
              <div className="space-y-2">
                {selectedNodePathways.map((pathway, idx) => {
                  const isActivePath =
                    idx ===
                    Math.min(
                      Math.max(0, selectedPathwayIndex),
                      selectedNodePathways.length - 1,
                    );
                  return (
                    <div
                      key={`${pathway.targetNodeId}-${pathway.bottleneckEdgeId}-${idx}`}
                      data-testid={`inspector-pathway-card-${idx}`}
                      className={`rounded-sm border p-2.5 text-xs transition-colors ${
                        isActivePath
                          ? 'border-[#D5A653]/65 bg-[#D5A653]/12'
                          : 'border-border-subtle bg-panel'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedPathwayIndex(idx)}
                          data-testid={`inspector-select-pathway-${idx}`}
                          className="inline-flex items-center gap-1.5 font-mono font-semibold text-[#E6C27A] hover:text-text-primary"
                        >
                          <span>
                            #{idx + 1} · Score {pathway.pathScore.toFixed(1)} pts
                          </span>
                          {isActivePath && (
                            <span className="rounded-sm bg-[#D5A653]/25 px-1.5 py-0.5 text-[10px] font-bold text-[#F3EFE5]">
                              ACTIVE
                            </span>
                          )}
                        </button>
                        <span className="font-mono text-text-muted tabular-nums">
                          Cumulative Lag: {pathway.totalLagWeeks}w
                        </span>
                      </div>

                      {/* Clickable Node Steps along Pathway */}
                      <div className="mt-1.5 flex flex-wrap items-center gap-1">
                        {pathway.steps.map((step, stepIdx) => {
                          const n = NODE_BY_ID.get(step.nodeId);
                          return (
                            <React.Fragment key={step.nodeId}>
                              <button
                                type="button"
                                onClick={() => selectNode(step.nodeId)}
                                className={`rounded-sm border px-1.5 py-0.5 text-xs transition-colors ${
                                  step.nodeId === selectedNode.id
                                    ? 'border-[#D5A653] bg-[#D5A653]/20 font-semibold text-[#F3EFE5]'
                                    : 'border-border-subtle bg-recess text-text-secondary hover:border-[#7CA3C7] hover:text-text-primary'
                                }`}
                              >
                                {n?.shortLabel ?? step.nodeName}
                              </button>
                              {stepIdx < pathway.steps.length - 1 && (
                                <ArrowRight
                                  className="h-3 w-3 shrink-0 text-text-muted"
                                  aria-hidden="true"
                                />
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>

                      {pathway.bottleneckSummary && (
                        <div className="mt-1.5 text-xs text-text-secondary">
                          <strong className="text-[#E6C27A]">Bottleneck:</strong>{' '}
                          {pathway.bottleneckSummary}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Audited TraceableValue Parameters */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
            <span className="inline-flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-[#D5A653]" aria-hidden="true" />
              <span>Audited Structural Parameters</span>
            </span>
            <span className="font-mono text-xs font-normal text-[#80D8B6]">
              Static Baseline
            </span>
          </div>
          <div className="divide-y divide-border-subtle rounded-sm border border-border-subtle bg-recess/85">
            {baselineMetrics.map(({ title, tv, formatValue }) => (
              <div
                key={title}
                className="p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium text-text-secondary">
                    {title}
                  </span>
                  <DataTierBadge
                    classification={tv.classification}
                    confidence={tv.confidence}
                    compact
                  />
                </div>
                <div className="mt-1 flex items-baseline justify-between gap-2">
                  <span className="font-mono text-sm font-bold text-text-primary tabular-nums">
                    {formatValue(tv.value)}
                  </span>
                  {tv.uncertaintyRange && (
                    <span className="font-mono text-xs text-text-muted tabular-nums">
                      Range: [{tv.uncertaintyRange[0]}–{tv.uncertaintyRange[1]}]
                    </span>
                  )}
                </div>
                {tv.derivationNote && (
                  <p className="mt-1 text-xs leading-relaxed text-text-muted">
                    {tv.derivationNote}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Consumer Basket Bill-of-Materials Breakdown (if consumer_category) */}
        {selectedNode.consumerBomBreakdown &&
          selectedNode.consumerBomBreakdown.length > 0 && (
            <div className="space-y-2 rounded-sm border border-border-subtle border-l-2 border-l-[#38B688] bg-recess/85 p-3">
              <div className="flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-[#80D8B6]">
                <Package className="h-3.5 w-3.5 text-[#38B688]" aria-hidden="true" />
                <span>Consumer Basket Upstream Cost Breakdown</span>
              </div>
              <div className="space-y-2">
                {selectedNode.consumerBomBreakdown.map((item) => (
                  <div key={item.upstreamNodeId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <button
                        type="button"
                        onClick={() => selectNode(item.upstreamNodeId)}
                        className="text-left font-medium text-[#E6C27A] underline-offset-2 hover:underline"
                      >
                        {item.upstreamLabel}
                      </button>
                      <span className="font-mono font-semibold text-text-primary tabular-nums">
                        {item.costSharePct}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-sm bg-canvas">
                      <div
                        className="h-full rounded-sm bg-[#38B688]"
                        style={{ width: `${item.costSharePct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        {/* Connected Upstream & Downstream Dependency Edges */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {/* Upstream Suppliers */}
          <div className="rounded-sm border border-border-subtle bg-recess/70 p-3">
            <div className="flex items-center justify-between text-xs font-semibold text-text-primary">
              <span className="inline-flex items-center gap-1">
                <ArrowUpLeft
                  className="h-3.5 w-3.5 text-[#D5A653]"
                  aria-hidden="true"
                />
                Upstream Inputs ({incomingEdgesForSelectedNode.length})
              </span>
              <span className="font-mono text-xs font-normal text-text-muted">
                Weight · Lag · W{currentWeek} Flux
              </span>
            </div>
            {incomingEdgesForSelectedNode.length === 0 ? (
              <p className="mt-2 text-xs text-text-muted">
                Primary origin node (no upstream edges in DAG).
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {incomingEdgesForSelectedNode.map((edge) => {
                  const srcNode = NODE_BY_ID.get(edge.sourceNodeId);
                  const edgeState = currentWeekEdgeStates[edge.id];
                  const fluxPct = Math.round(
                    (edgeState?.transmittedDisruption ?? 0) * 100,
                  );
                  return (
                    <li
                      key={edge.id}
                      className="flex items-center justify-between gap-2 rounded-sm border border-border-subtle/70 bg-panel px-2.5 py-1.5 text-xs"
                    >
                      <button
                        type="button"
                        onClick={() => selectNode(edge.sourceNodeId)}
                        className="truncate text-left font-medium text-[#E6C27A] hover:underline"
                      >
                        {srcNode?.shortLabel ?? edge.sourceNodeId}
                      </button>
                      <span className="shrink-0 font-mono text-xs text-text-secondary tabular-nums">
                        {Math.round(edge.dependencyWeight.value * 100)}% ·{' '}
                        {edge.transitLagWeeks.value}w ·{' '}
                        <span
                          className={
                            fluxPct > 0 ? 'text-[#E6C27A]' : 'text-text-muted'
                          }
                        >
                          {fluxPct}% shock
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Downstream Dependents */}
          <div className="rounded-sm border border-border-subtle bg-recess/70 p-3">
            <div className="flex items-center justify-between text-xs font-semibold text-text-primary">
              <span className="inline-flex items-center gap-1">
                <ArrowDownRight
                  className="h-3.5 w-3.5 text-[#38B688]"
                  aria-hidden="true"
                />
                Downstream Dependents ({outgoingEdgesForSelectedNode.length})
              </span>
              <span className="font-mono text-xs font-normal text-text-muted">
                Weight · Crit · W{currentWeek} Flux
              </span>
            </div>
            {outgoingEdgesForSelectedNode.length === 0 ? (
              <p className="mt-2 text-xs text-text-muted">
                Terminal consumer basket (end of causal chain).
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {outgoingEdgesForSelectedNode.map((edge) => {
                  const tgtNode = NODE_BY_ID.get(edge.targetNodeId);
                  const edgeState = currentWeekEdgeStates[edge.id];
                  const fluxPct = Math.round(
                    (edgeState?.transmittedDisruption ?? 0) * 100,
                  );
                  return (
                    <li
                      key={edge.id}
                      className="flex items-center justify-between gap-2 rounded-sm border border-border-subtle/70 bg-panel px-2.5 py-1.5 text-xs"
                    >
                      <button
                        type="button"
                        onClick={() => selectNode(edge.targetNodeId)}
                        className="truncate text-left font-medium text-[#E6C27A] hover:underline"
                      >
                        {tgtNode?.shortLabel ?? edge.targetNodeId}
                      </button>
                      <span className="shrink-0 font-mono text-xs text-text-secondary tabular-nums">
                        {Math.round(edge.dependencyWeight.value * 100)}% · c=
                        {edge.inputCriticality.value.toFixed(2)} ·{' '}
                        <span
                          className={
                            fluxPct > 0 ? 'text-[#E6C27A]' : 'text-text-muted'
                          }
                        >
                          {fluxPct}%
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Caveats */}
        {selectedNode.caveats.length > 0 && (
          <div className="rounded-sm border border-border-subtle border-l-2 border-l-[#D5A653] bg-recess/80 p-3">
            <div className="flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-[#E6C27A]">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 text-[#D5A653]" aria-hidden="true" />
              <span>Domain Caveats & Structural Notes</span>
            </div>
            <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs text-text-secondary">
              {selectedNode.caveats.map((caveat, idx) => (
                <li key={idx}>{caveat}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Linked Sources */}
        <div className="space-y-1.5 border-t border-border-subtle pt-3">
          <div className="font-mono text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
            Verified Source Citations ({referencedSourceIds.length})
          </div>
          <ul className="space-y-1.5">
            {referencedSourceIds.map((sid) => {
              const src = SOURCE_BY_ID.get(sid);
              if (!src) return null;
              return (
                <li
                  key={sid}
                  className="rounded-sm border border-border-subtle/70 bg-recess/80 p-2 text-xs"
                >
                  <div className="font-display font-medium text-text-primary">{src.title}</div>
                  <div className="mt-0.5 flex flex-wrap items-center justify-between gap-1 text-text-muted">
                    <span>
                      {src.organization} ({src.publicationDate})
                    </span>
                    {src.url.startsWith('http') && (
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#E6C27A] hover:underline"
                      >
                        <span>Source</span>
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </Panel>
  );
};
