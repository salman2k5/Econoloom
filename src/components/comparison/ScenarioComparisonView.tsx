import React, { useMemo, useState } from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowUpDown,
  ArrowUpRight,
  CopyCheck,
  Equal,
  Filter,
  GitCompare,
  Info,
  Layers,
  RefreshCw,
  Search,
  ShieldCheck,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { NODES, PRESET_BY_ID, PRESETS } from '../../data';
import { compareScenarios } from '../../engine/compareScenarios';
import { SIMULATION_HORIZON_WEEKS } from '../../engine/simulateScenario';
import { useScenarioStore } from '../../state/useScenarioStore';
import type {
  NodeCategory,
  ScenarioParameters,
  ScenarioPreset,
} from '../../types/domain';
import type { NodeScenarioComparison } from '../../types/simulation';
import { Button } from '../common/Button';
import { Panel } from '../common/Panel';
import { SeverityBadge } from '../common/SeverityBadge';

export type ComparisonTemplateId =
  | 'preset_vs_working'
  | 'inventory_buffering'
  | 'rerouting_capacity'
  | 'substitution_flexibility';

type TrajectoryMetricMode = 'rei' | 'cpi' | 'inventory';

type TableSortField =
  | 'peakReiDelta'
  | 'cumulativeReiWeeksDelta'
  | 'currentWeekReiDelta'
  | 'peakReiB'
  | 'tierIndex';

interface ParameterControlMeta {
  key: keyof ScenarioParameters;
  label: string;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
}

const PARAMETER_CONTROLS: ParameterControlMeta[] = [
  {
    key: 'shockSeverityPct',
    label: 'Shock Severity',
    min: 0,
    max: 1,
    step: 0.05,
    format: (v) => `${Math.round(v * 100)}%`,
  },
  {
    key: 'durationDays',
    label: 'Duration (Days)',
    min: 7,
    max: 180,
    step: 7,
    format: (v) => `${Math.round(v)}d`,
  },
  {
    key: 'inventoryBufferScale',
    label: 'Inventory Buffer Scale',
    min: 0.5,
    max: 2.0,
    step: 0.1,
    format: (v) => `${v.toFixed(2)}×`,
  },
  {
    key: 'rerouteCapacityShare',
    label: 'Rerouting Capacity Share',
    min: 0,
    max: 1,
    step: 0.05,
    format: (v) => `${Math.round(v * 100)}%`,
  },
  {
    key: 'substitutionFlexibility',
    label: 'Substitution Flexibility',
    min: 0,
    max: 1,
    step: 0.05,
    format: (v) => `${Math.round(v * 100)}%`,
  },
  {
    key: 'shippingCostMultiplier',
    label: 'Shipping Cost Multiplier',
    min: 1.0,
    max: 4.0,
    step: 0.1,
    format: (v) => `${v.toFixed(2)}×`,
  },
];

const CATEGORY_OPTIONS: { value: NodeCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All Nodes (48)' },
  { value: 'industry', label: 'Industries (14)' },
  { value: 'consumer_category', label: 'Consumer Baskets (8)' },
  { value: 'commodity', label: 'Commodities (14)' },
  { value: 'geography', label: 'Geographies (9)' },
  { value: 'chokepoint', label: 'Chokepoints (3)' },
];

function formatDeltaText(
  delta: number,
  decimals = 1,
  unit = '',
): { text: string; toneClass: string; badgeBgClass: string } {
  if (Math.abs(delta) < 1e-6) {
    return {
      text: `0.${'0'.repeat(decimals)}${unit}`,
      toneClass: 'text-text-secondary',
      badgeBgClass: 'border-border-subtle bg-elevated/60 text-text-secondary',
    };
  }
  const sign = delta > 0 ? '+' : '';
  const text = `${sign}${delta.toFixed(decimals)}${unit}`;
  // For exposure/cost metrics, negative delta (Scenario B < Scenario A) is relief (sage),
  // positive delta (Scenario B > Scenario A) is intensification (crimson).
  if (delta < 0) {
    return {
      text,
      toneClass: 'text-[#9CE2C6]',
      badgeBgClass: 'border-[#38B688]/45 bg-[#38B688]/12 text-[#9CE2C6]',
    };
  }
  return {
    text,
    toneClass: 'text-[#F4A5B0]',
    badgeBgClass: 'border-[#E05A6D]/45 bg-[#E05A6D]/12 text-[#F4A5B0]',
  };
}

function formatRecoveryCell(
  recoveryWeek: number | null,
  neverDisrupted: boolean,
): string {
  if (neverDisrupted) return 'Unexposed (<5)';
  if (recoveryWeek === null) return '> W26 (Unrecovered)';
  return `Week ${recoveryWeek}`;
}

export const ScenarioComparisonView: React.FC = () => {
  const {
    activePreset,
    scenarioParams,
    selectedNode,
    currentWeek,
    selectNode,
    setCurrentWeek,
    setActiveWorkspaceTab,
  } = useScenarioStore();

  // Isolated Scenario A & Scenario B state (never mutates main workspace scenarioParams)
  const [activeTemplate, setActiveTemplate] = useState<
    ComparisonTemplateId | 'custom'
  >('inventory_buffering');

  const [presetIdA, setPresetIdA] = useState<string>(activePreset.id);
  const [paramsA, setParamsA] = useState<ScenarioParameters>(() => ({
    ...activePreset.defaultParams,
    inventoryBufferScale: 1.0,
  }));
  const [labelA, setLabelA] = useState<string>(
    'Scenario A: Baseline Disruption (1.00× Inventory)',
  );

  const [presetIdB, setPresetIdB] = useState<string>(activePreset.id);
  const [paramsB, setParamsB] = useState<ScenarioParameters>(() => ({
    ...activePreset.defaultParams,
    inventoryBufferScale: 1.8,
  }));
  const [labelB, setLabelB] = useState<string>(
    'Scenario B: Increased Inventory Buffering (1.80× Stock)',
  );

  const [trajectoryMetric, setTrajectoryMetric] =
    useState<TrajectoryMetricMode>('rei');
  const [categoryFilter, setCategoryFilter] = useState<NodeCategory | 'all'>(
    'all',
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<TableSortField>('peakReiDelta');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const presetA: ScenarioPreset =
    PRESET_BY_ID.get(presetIdA) ?? activePreset ?? PRESETS[0]!;
  const presetB: ScenarioPreset =
    PRESET_BY_ID.get(presetIdB) ?? activePreset ?? PRESETS[0]!;

  // Apply one of the 4 required comparison templates
  const applyTemplate = (templateId: ComparisonTemplateId) => {
    setActiveTemplate(templateId);
    const basePreset = activePreset;
    const baseDefaults = { ...basePreset.defaultParams };

    setPresetIdA(basePreset.id);
    setPresetIdB(basePreset.id);

    if (templateId === 'preset_vs_working') {
      setLabelA(`Scenario A: ${basePreset.title} (Preset Default)`);
      setLabelB(`Scenario B: Current Working Workspace Scenario`);
      setParamsA({ ...baseDefaults });
      setParamsB({ ...scenarioParams });
      return;
    }

    if (templateId === 'inventory_buffering') {
      setLabelA('Scenario A: Baseline Disruption (1.00× Inventory)');
      setLabelB('Scenario B: Increased Inventory Buffering (1.80× Stock)');
      setParamsA({ ...baseDefaults, inventoryBufferScale: 1.0 });
      setParamsB({ ...baseDefaults, inventoryBufferScale: 1.8 });
      return;
    }

    if (templateId === 'rerouting_capacity') {
      setLabelA(
        `Scenario A: Baseline Disruption (${Math.round(baseDefaults.rerouteCapacityShare * 100)}% Rerouting)`,
      );
      setLabelB('Scenario B: Increased Rerouting Capacity (80% Bypass)');
      setParamsA({ ...baseDefaults });
      setParamsB({ ...baseDefaults, rerouteCapacityShare: 0.8 });
      return;
    }

    if (templateId === 'substitution_flexibility') {
      setLabelA(
        `Scenario A: Baseline Disruption (${Math.round(baseDefaults.substitutionFlexibility * 100)}% Substitution)`,
      );
      setLabelB('Scenario B: Increased Substitution Flexibility (75%)');
      setParamsA({ ...baseDefaults });
      setParamsB({ ...baseDefaults, substitutionFlexibility: 0.75 });
    }
  };

  const handleSyncBFromWorkspace = () => {
    setActiveTemplate('preset_vs_working');
    setPresetIdB(activePreset.id);
    setParamsB({ ...scenarioParams });
    setLabelB(`Scenario B: Live Workspace (${activePreset.title})`);
  };

  const handleMatchBToA = () => {
    setActiveTemplate('custom');
    setPresetIdB(presetIdA);
    setParamsB({ ...paramsA });
    setLabelB(`${labelA} (Identical Copy)`);
  };

  const handlePresetChangeA = (newPresetId: string) => {
    const found = PRESET_BY_ID.get(newPresetId);
    if (!found) return;
    setActiveTemplate('custom');
    setPresetIdA(found.id);
    setParamsA({ ...found.defaultParams });
    setLabelA(`Scenario A: ${found.title}`);
  };

  const handlePresetChangeB = (newPresetId: string) => {
    const found = PRESET_BY_ID.get(newPresetId);
    if (!found) return;
    setActiveTemplate('custom');
    setPresetIdB(found.id);
    setParamsB({ ...found.defaultParams });
    setLabelB(`Scenario B: ${found.title}`);
  };

  const handleParamChangeA = (key: keyof ScenarioParameters, value: number) => {
    setActiveTemplate('custom');
    setParamsA((prev) => ({ ...prev, [key]: value }));
  };

  const handleParamChangeB = (key: keyof ScenarioParameters, value: number) => {
    setActiveTemplate('custom');
    setParamsB((prev) => ({ ...prev, [key]: value }));
  };

  // Pure deterministic comparison report
  const comparisonReport = useMemo(
    () =>
      compareScenarios(
        { label: labelA, preset: presetA, params: paramsA },
        { label: labelB, preset: presetB, params: paramsB },
        currentWeek,
      ),
    [labelA, presetA, paramsA, labelB, presetB, paramsB, currentWeek],
  );

  const selectedNodeComparison: NodeScenarioComparison =
    comparisonReport.nodeComparisons[selectedNode.id] ??
    comparisonReport.orderedNodeComparisons[0]!;

  // Filtered and sorted 48-node comparison rows
  const filteredAndSortedRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = comparisonReport.orderedNodeComparisons.filter((row) => {
      if (categoryFilter !== 'all' && row.category !== categoryFilter) {
        return false;
      }
      if (q.length > 0) {
        const hay =
          `${row.nodeId} ${row.nodeName} ${row.shortLabel} ${row.regionCode}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      if (valA !== valB) {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      return a.nodeId.localeCompare(b.nodeId);
    });
  }, [
    comparisonReport.orderedNodeComparisons,
    categoryFilter,
    searchQuery,
    sortField,
    sortDirection,
  ]);

  const toggleSort = (field: TableSortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // SVG Dual-Trajectory Chart geometry
  const svgWidth = 720;
  const svgHeight = 230;
  const padLeft = 44;
  const padRight = 20;
  const padTop = 18;
  const padBottom = 30;
  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;

  const maxMetricValue = useMemo(() => {
    if (trajectoryMetric === 'rei' || trajectoryMetric === 'cpi') {
      return 100;
    }
    let maxInv = 30;
    for (const pt of selectedNodeComparison.weeklySeries) {
      maxInv = Math.max(maxInv, pt.inventoryDaysA, pt.inventoryDaysB);
    }
    return Math.ceil(maxInv / 10) * 10;
  }, [trajectoryMetric, selectedNodeComparison.weeklySeries]);

  const getWeekX = (w: number) =>
    padLeft + (w / SIMULATION_HORIZON_WEEKS) * plotW;
  const getValY = (v: number) =>
    padTop + plotH - Math.min(1, Math.max(0, v / maxMetricValue)) * plotH;

  const polylineA = selectedNodeComparison.weeklySeries
    .map((pt) => {
      const val =
        trajectoryMetric === 'rei'
          ? pt.reiA
          : trajectoryMetric === 'cpi'
            ? pt.cpiA
            : pt.inventoryDaysA;
      return `${getWeekX(pt.week).toFixed(1)},${getValY(val).toFixed(1)}`;
    })
    .join(' ');

  const polylineB = selectedNodeComparison.weeklySeries
    .map((pt) => {
      const val =
        trajectoryMetric === 'rei'
          ? pt.reiB
          : trajectoryMetric === 'cpi'
            ? pt.cpiB
            : pt.inventoryDaysB;
      return `${getWeekX(pt.week).toFixed(1)},${getValY(val).toFixed(1)}`;
    })
    .join(' ');

  const currentPoint =
    selectedNodeComparison.weeklySeries[currentWeek] ??
    selectedNodeComparison.weeklySeries[0]!;

  const peakNetDeltaFmt = formatDeltaText(
    comparisonReport.networkSummary.peakNetworkReiDelta,
    1,
    ' pts',
  );
  const meanNetDeltaFmt = formatDeltaText(
    comparisonReport.networkSummary.meanNetworkReiDelta,
    1,
    ' pts',
  );
  const selectedPeakDeltaFmt = formatDeltaText(
    selectedNodeComparison.peakReiDelta,
    1,
    ' pts',
  );
  const selectedCumDeltaFmt = formatDeltaText(
    selectedNodeComparison.cumulativeReiWeeksDelta,
    1,
    ' REI-wks',
  );

  return (
    <section
      aria-label="Scenario Comparison Counterfactual Workbench"
      data-testid="scenario-comparison-view"
      className="space-y-6"
    >
      {/* Top Panel: 4 One-Click Counterfactual Templates & Isolation Controls */}
      <Panel
        title="Counterfactual Scenario Comparison Workbench (Scenario A vs. Scenario B)"
        subtitle="Compare baseline shocks against inventory buffering, corridor rerouting, or supplier substitution counterfactuals across all 48 nodes and 26 weeks without overwriting your active workspace scenario."
        badge={
          <span className="inline-flex items-center gap-1.5 rounded-sm border border-[#D5A653]/40 bg-[#D5A653]/12 px-2.5 py-0.5 font-mono text-xs text-[#E6C27A]">
            <GitCompare className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Isolated A/B Sandbox</span>
          </span>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSyncBFromWorkspace}
              data-testid="comparison-sync-b-workspace-btn"
              icon={<RefreshCw className="h-3.5 w-3.5 text-[#D5A653]" />}
            >
              Sync B from Live Workspace
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMatchBToA}
              data-testid="comparison-match-b-to-a-btn"
              icon={<CopyCheck className="h-3.5 w-3.5 text-[#38B688]" />}
            >
              Set B = A (Zero-Delta Check)
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          {/* 4 Required One-Click Comparison Templates */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#E6C27A]">
                One-Click Counterfactual Comparison Templates
              </span>
              <span className="font-mono text-xs text-text-muted">
                Active Base Preset: {activePreset.title}
              </span>
            </div>
            <div
              className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4"
              role="group"
              aria-label="One-click scenario comparison templates"
            >
              <button
                type="button"
                data-testid="template-preset_vs_working"
                onClick={() => applyTemplate('preset_vs_working')}
                className={`flex flex-col justify-between rounded-sm border p-3 text-left transition-all ${
                  activeTemplate === 'preset_vs_working'
                    ? 'border-[#D5A653] border-l-2 border-l-[#D5A653] bg-elevated/90 shadow-glow'
                    : 'border-border-subtle bg-recess/80 hover:border-[#354B66] hover:bg-elevated/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-text-primary">
                    1. Preset Default vs. Working Scenario
                  </span>
                  <Sparkles
                    className="h-3.5 w-3.5 shrink-0 text-[#D5A653]"
                    aria-hidden="true"
                  />
                </div>
                <p className="mt-1.5 text-xs text-text-secondary">
                  Compares canonical preset defaults (A) against your live
                  workspace parameter sliders (B).
                </p>
              </button>

              <button
                type="button"
                data-testid="template-inventory_buffering"
                onClick={() => applyTemplate('inventory_buffering')}
                className={`flex flex-col justify-between rounded-sm border p-3 text-left transition-all ${
                  activeTemplate === 'inventory_buffering'
                    ? 'border-[#D5A653] border-l-2 border-l-[#D5A653] bg-elevated/90 shadow-glow'
                    : 'border-border-subtle bg-recess/80 hover:border-[#354B66] hover:bg-elevated/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-text-primary">
                    2. Baseline vs. Inventory Buffering
                  </span>
                  <ShieldCheck
                    className="h-3.5 w-3.5 shrink-0 text-[#38B688]"
                    aria-hidden="true"
                  />
                </div>
                <p className="mt-1.5 text-xs text-text-secondary">
                  Tests strategic stockpiling: scales initial inventory buffers
                  from <span className="font-mono text-[#B8D0E8]">1.00×</span> to{' '}
                  <span className="font-mono text-[#9CE2C6]">1.80×</span>.
                </p>
              </button>

              <button
                type="button"
                data-testid="template-rerouting_capacity"
                onClick={() => applyTemplate('rerouting_capacity')}
                className={`flex flex-col justify-between rounded-sm border p-3 text-left transition-all ${
                  activeTemplate === 'rerouting_capacity'
                    ? 'border-[#D5A653] border-l-2 border-l-[#D5A653] bg-elevated/90 shadow-glow'
                    : 'border-border-subtle bg-recess/80 hover:border-[#354B66] hover:bg-elevated/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-text-primary">
                    3. Baseline vs. Rerouting Capacity
                  </span>
                  <Layers
                    className="h-3.5 w-3.5 shrink-0 text-[#D5A653]"
                    aria-hidden="true"
                  />
                </div>
                <p className="mt-1.5 text-xs text-text-secondary">
                  Tests alternative corridor activation: expands bypass
                  utilization to{' '}
                  <span className="font-mono text-[#9CE2C6]">80%</span> on
                  reroutable edges.
                </p>
              </button>

              <button
                type="button"
                data-testid="template-substitution_flexibility"
                onClick={() => applyTemplate('substitution_flexibility')}
                className={`flex flex-col justify-between rounded-sm border p-3 text-left transition-all ${
                  activeTemplate === 'substitution_flexibility'
                    ? 'border-[#D5A653] border-l-2 border-l-[#D5A653] bg-elevated/90 shadow-glow'
                    : 'border-border-subtle bg-recess/80 hover:border-[#354B66] hover:bg-elevated/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-text-primary">
                    4. Baseline vs. Substitution Flexibility
                  </span>
                  <Sliders
                    className="h-3.5 w-3.5 shrink-0 text-[#B8D0E8]"
                    aria-hidden="true"
                  />
                </div>
                <p className="mt-1.5 text-xs text-text-secondary">
                  Tests rapid multi-sourcing: raises post-Week-2 supplier
                  substitution flexibility to{' '}
                  <span className="font-mono text-[#9CE2C6]">75%</span>.
                </p>
              </button>
            </div>
          </div>

          {/* Side-by-Side Scenario A & Scenario B Editors */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Scenario A Card */}
            <div
              className="rounded-sm border border-border-subtle border-t-2 border-t-[#7CA3C7] bg-recess/85 p-4"
              data-testid="scenario-a-editor"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle pb-3">
                <div>
                  <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-[#B8D0E8]">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#7CA3C7]" />
                    <span>Reference Scenario A</span>
                  </span>
                  <h3 className="mt-0.5 font-display text-sm font-semibold text-text-primary">
                    {labelA}
                  </h3>
                </div>
                <select
                  aria-label="Select Preset for Scenario A"
                  data-testid="scenario-a-preset-select"
                  value={presetA.id}
                  onChange={(e) => handlePresetChangeA(e.target.value)}
                  className="rounded-sm border border-border-subtle bg-panel px-2.5 py-1.5 text-xs text-text-primary focus:border-[#7CA3C7] focus:outline-none"
                >
                  {PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-3 grid gap-px border border-border-subtle bg-border-subtle sm:grid-cols-2">
                {PARAMETER_CONTROLS.map((ctrl) => {
                  const val = paramsA[ctrl.key];
                  return (
                    <div
                      key={ctrl.key}
                      className="bg-panel p-2.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <label
                          htmlFor={`param-a-${ctrl.key}`}
                          className="font-medium text-text-secondary"
                        >
                          {ctrl.label}
                        </label>
                        <span className="font-mono font-bold text-[#B8D0E8] tabular-nums">
                          {ctrl.format(val)}
                        </span>
                      </div>
                      <input
                        id={`param-a-${ctrl.key}`}
                        data-testid={`param-a-${ctrl.key}`}
                        type="range"
                        aria-label={`Scenario A ${ctrl.label}`}
                        aria-valuetext={ctrl.format(val)}
                        min={ctrl.min}
                        max={ctrl.max}
                        step={ctrl.step}
                        value={val}
                        onChange={(e) =>
                          handleParamChangeA(
                            ctrl.key,
                             Number(e.target.value),
                          )
                        }
                        className="mt-1.5 h-1.5 w-full cursor-pointer accent-[#7CA3C7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7CA3C7]/70"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Scenario B Card */}
            <div
              className="rounded-sm border border-border-subtle border-t-2 border-t-[#D5A653] bg-recess/85 p-4"
              data-testid="scenario-b-editor"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle pb-3">
                <div>
                  <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-[#E6C27A]">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#D5A653]" />
                    <span>Counterfactual Scenario B</span>
                  </span>
                  <h3 className="mt-0.5 font-display text-sm font-semibold text-text-primary">
                    {labelB}
                  </h3>
                </div>
                <select
                  aria-label="Select Preset for Scenario B"
                  data-testid="scenario-b-preset-select"
                  value={presetB.id}
                  onChange={(e) => handlePresetChangeB(e.target.value)}
                  className="rounded-sm border border-border-subtle bg-panel px-2.5 py-1.5 text-xs text-text-primary focus:border-[#D5A653] focus:outline-none"
                >
                  {PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-3 grid gap-px border border-border-subtle bg-border-subtle sm:grid-cols-2">
                {PARAMETER_CONTROLS.map((ctrl) => {
                  const val = paramsB[ctrl.key];
                  return (
                    <div
                      key={ctrl.key}
                      className="bg-panel p-2.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <label
                          htmlFor={`param-b-${ctrl.key}`}
                          className="font-medium text-text-secondary"
                        >
                          {ctrl.label}
                        </label>
                        <span className="font-mono font-bold text-[#E6C27A] tabular-nums">
                          {ctrl.format(val)}
                        </span>
                      </div>
                      <input
                        id={`param-b-${ctrl.key}`}
                        data-testid={`param-b-${ctrl.key}`}
                        type="range"
                        aria-label={`Scenario B ${ctrl.label}`}
                        aria-valuetext={ctrl.format(val)}
                        min={ctrl.min}
                        max={ctrl.max}
                        step={ctrl.step}
                        value={val}
                        onChange={(e) =>
                          handleParamChangeB(
                            ctrl.key,
                            Number(e.target.value),
                          )
                        }
                        className="mt-1.5 h-1.5 w-full cursor-pointer accent-[#D5A653] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5A653]/70"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Parameter Diff Summary Banner */}
          <div
            className="rounded-sm border border-border-subtle bg-recess/80 p-3.5"
            data-testid="parameter-diff-banner"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                Parameter Differences (Δ = Scenario B − Scenario A)
              </span>
              {comparisonReport.isIdenticalConfiguration ? (
                <span
                  data-testid="identical-scenario-badge"
                  className="inline-flex items-center gap-1.5 rounded-sm border border-[#38B688]/40 bg-[#38B688]/12 px-2.5 py-0.5 font-mono text-xs font-medium text-[#9CE2C6]"
                >
                  <Equal className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Identical Configuration (All Δ = 0.0)</span>
                </span>
              ) : (
                <span className="font-mono text-xs text-text-muted">
                  {comparisonReport.isSamePreset
                    ? `Same Origin Preset (${presetA.id})`
                    : `Cross-Preset Comparison (${presetA.id} vs. ${presetB.id})`}
                </span>
              )}
            </div>

            <div className="mt-2.5 grid grid-cols-2 gap-px border border-border-subtle bg-border-subtle sm:grid-cols-3 lg:grid-cols-6">
              {comparisonReport.parameterDiffs.map((diff) => {
                const isChanged = diff.direction !== 'unchanged';
                return (
                  <div
                    key={diff.key}
                    data-testid={`param-diff-${diff.key}`}
                    className={`p-2.5 text-xs ${
                      isChanged
                        ? 'bg-elevated/90'
                        : 'bg-panel'
                    }`}
                  >
                    <div className="truncate font-medium text-text-secondary">
                      {diff.label}
                    </div>
                    <div className="mt-1 flex items-baseline justify-between gap-1 font-mono tabular-nums">
                      <span className="text-text-muted">
                        {diff.formattedA} → {diff.formattedB}
                      </span>
                      <span
                        className={`font-bold ${
                          isChanged ? 'text-[#E6C27A]' : 'text-text-muted'
                        }`}
                      >
                        {diff.formattedDelta}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Network-Wide Summary Delta Cards */}
          <div
            className="grid grid-cols-1 gap-px border border-border-subtle bg-border-subtle sm:grid-cols-2 xl:grid-cols-4"
            data-testid="network-comparison-summary-cards"
          >
            <div className="bg-recess/90 p-3.5">
              <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-text-muted">
                <span>Horizon Peak Network REI</span>
                <Activity
                  className="h-3.5 w-3.5 text-[#D5A653]"
                  aria-hidden="true"
                />
              </div>
              <div className="mt-1.5 flex items-baseline justify-between gap-2 font-mono tabular-nums">
                <span className="text-sm font-bold text-text-primary">
                  A: {comparisonReport.networkSummary.peakNetworkReiA.toFixed(1)}{' '}
                  <span className="text-xs font-normal text-text-muted">
                    (W{comparisonReport.networkSummary.peakWeekA})
                  </span>{' '}
                  → B:{' '}
                  {comparisonReport.networkSummary.peakNetworkReiB.toFixed(1)}{' '}
                  <span className="text-xs font-normal text-text-muted">
                    (W{comparisonReport.networkSummary.peakWeekB})
                  </span>
                </span>
                <span
                  data-testid="network-peak-rei-delta"
                  className={`rounded-sm border px-1.5 py-0.5 text-xs font-bold ${peakNetDeltaFmt.badgeBgClass}`}
                >
                  {peakNetDeltaFmt.text}
                </span>
              </div>
              <p className="mt-1 text-xs text-text-secondary">
                Max Relative Exposure Index (0–100 scale) across all 48 nodes.
              </p>
            </div>

            <div className="bg-recess/90 p-3.5">
              <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-text-muted">
                <span>Mean Network REI (W0–W26)</span>
                {comparisonReport.networkSummary.meanNetworkReiDelta < 0 ? (
                  <ArrowDownRight
                    className="h-3.5 w-3.5 text-[#38B688]"
                    aria-hidden="true"
                  />
                ) : (
                  <ArrowUpRight
                    className="h-3.5 w-3.5 text-[#E05A6D]"
                    aria-hidden="true"
                  />
                )}
              </div>
              <div className="mt-1.5 flex items-baseline justify-between gap-2 font-mono tabular-nums">
                <span className="text-sm font-bold text-text-primary">
                  A: {comparisonReport.networkSummary.meanNetworkReiA.toFixed(1)}{' '}
                  → B:{' '}
                  {comparisonReport.networkSummary.meanNetworkReiB.toFixed(1)}
                </span>
                <span
                  data-testid="network-mean-rei-delta"
                  className={`rounded-sm border px-1.5 py-0.5 text-xs font-bold ${meanNetDeltaFmt.badgeBgClass}`}
                >
                  {meanNetDeltaFmt.text}
                </span>
              </div>
              <p className="mt-1 text-xs text-text-secondary">
                Average weekly index points across all 48 nodes & 27 steps.
              </p>
            </div>

            <div className="bg-recess/90 p-3.5">
              <div className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
                Severely Exposed Nodes (REI ≥ 65 at W{currentWeek})
              </div>
              <div className="mt-1.5 flex items-baseline justify-between gap-2 font-mono tabular-nums">
                <span className="text-sm font-bold text-text-primary">
                  A:{' '}
                  {
                    comparisonReport.networkSummary
                      .currentWeekSeverelyExposedCountA
                  }{' '}
                  → B:{' '}
                  {
                    comparisonReport.networkSummary
                      .currentWeekSeverelyExposedCountB
                  }{' '}
                  <span className="text-xs font-normal text-text-muted">
                    / 48
                  </span>
                </span>
                <span
                  data-testid="network-severe-count-delta"
                  className="rounded-sm border border-border-subtle bg-elevated px-1.5 py-0.5 text-xs font-bold text-[#E6C27A]"
                >
                  {comparisonReport.networkSummary
                    .currentWeekSeverelyExposedDelta > 0
                    ? `+${comparisonReport.networkSummary.currentWeekSeverelyExposedDelta}`
                    : comparisonReport.networkSummary
                        .currentWeekSeverelyExposedDelta}{' '}
                  nodes
                </span>
              </div>
              <p className="mt-1 text-xs text-text-secondary">
                Horizon Peak Severe Count: A{' '}
                {comparisonReport.networkSummary.horizonSeverelyExposedCountA}{' '}
                vs. B{' '}
                {comparisonReport.networkSummary.horizonSeverelyExposedCountB}
              </p>
            </div>

            <div className="bg-recess/90 p-3.5">
              <div className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
                First Consumer Impact Week (REI ≥ 5)
              </div>
              <div className="mt-1.5 flex items-baseline justify-between gap-2 font-mono tabular-nums">
                <span className="text-sm font-bold text-text-primary">
                  A:{' '}
                  {comparisonReport.networkSummary.firstConsumerImpactWeekA !==
                  null
                    ? `Week ${comparisonReport.networkSummary.firstConsumerImpactWeekA}`
                    : 'None'}{' '}
                  → B:{' '}
                  {comparisonReport.networkSummary.firstConsumerImpactWeekB !==
                  null
                    ? `Week ${comparisonReport.networkSummary.firstConsumerImpactWeekB}`
                    : 'None'}
                </span>
              </div>
              <p className="mt-1 text-xs text-text-secondary">
                Later onset week indicates stronger upstream buffer absorption.
              </p>
            </div>
          </div>
        </div>
      </Panel>

      {/* Middle Panel: Selected Node Weeks 0–26 Dual-Trajectory Chart & Summary */}
      <Panel
        title={`Selected Node Trajectory Comparison: ${selectedNodeComparison.nodeName} (${selectedNodeComparison.nodeId})`}
        subtitle={`Weeks 0–26 counterfactual trajectory for Tier ${selectedNodeComparison.tierIndex} (${selectedNodeComparison.category.replace('_', ' ')}). Click any week on the chart to scrub the workspace timeline (currently Week ${currentWeek}).`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Select node for trajectory comparison"
              data-testid="comparison-node-select"
              value={selectedNode.id}
              onChange={(e) => selectNode(e.target.value)}
              className="rounded-sm border border-border-subtle bg-recess px-2.5 py-1.5 text-xs text-text-primary focus:border-[#D5A653] focus:outline-none"
            >
              {NODES.map((n) => (
                <option key={n.id} value={n.id}>
                  T{n.tierIndex} · {n.name} ({n.id})
                </option>
              ))}
            </select>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveWorkspaceTab('pathway_explorer')}
            >
              Inspect Node Pathways
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Selected Node Key Comparison Metrics */}
          <div className="grid grid-cols-2 gap-px border border-border-subtle bg-border-subtle sm:grid-cols-4">
            <div className="bg-recess/90 p-3">
              <div className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
                Node Peak REI (Index Points 0–100)
              </div>
              <div className="mt-1 flex items-baseline justify-between gap-1 font-mono tabular-nums">
                <span className="text-sm font-bold text-text-primary">
                  {selectedNodeComparison.peakReiA.toFixed(1)} (W
                  {selectedNodeComparison.peakWeekA}) →{' '}
                  {selectedNodeComparison.peakReiB.toFixed(1)} (W
                  {selectedNodeComparison.peakWeekB})
                </span>
                <span
                  data-testid="selected-node-peak-rei-delta"
                  className={`rounded-sm border px-1.5 py-0.5 text-xs font-bold ${selectedPeakDeltaFmt.badgeBgClass}`}
                >
                  {selectedPeakDeltaFmt.text}
                </span>
              </div>
            </div>

            <div className="bg-recess/90 p-3">
              <div className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
                Cumulative Exposure (REI-weeks, W0–W26)
              </div>
              <div className="mt-1 flex items-baseline justify-between gap-1 font-mono tabular-nums">
                <span className="text-sm font-bold text-text-primary">
                  {selectedNodeComparison.cumulativeReiWeeksA.toFixed(1)} →{' '}
                  {selectedNodeComparison.cumulativeReiWeeksB.toFixed(1)}
                </span>
                <span
                  data-testid="selected-node-cum-rei-delta"
                  className={`rounded-sm border px-1.5 py-0.5 text-xs font-bold ${selectedCumDeltaFmt.badgeBgClass}`}
                >
                  {selectedCumDeltaFmt.text}
                </span>
              </div>
              <div className="mt-0.5 font-mono text-xs text-text-muted">
                Mean Weekly REI: {selectedNodeComparison.meanReiA.toFixed(1)} →{' '}
                {selectedNodeComparison.meanReiB.toFixed(1)} pts
              </div>
            </div>

            <div className="bg-recess/90 p-3">
              <div className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
                Week {currentWeek} Snapshot (REI / Inv. Buffer)
              </div>
              <div className="mt-1 font-mono text-sm font-bold text-text-primary tabular-nums">
                REI: { currentPoint.reiA.toFixed(1)} →{' '}
                {currentPoint.reiB.toFixed(1)}{' '}
                <span className="text-xs text-[#E6C27A]">
                  ({currentPoint.reiDelta >= 0 ? '+' : ''}
                  {currentPoint.reiDelta.toFixed(1)})
                </span>
              </div>
              <div className="mt-0.5 font-mono text-xs text-text-secondary tabular-nums">
                Stock: {currentPoint.inventoryDaysA.toFixed(1)}d →{' '}
                {currentPoint.inventoryDaysB.toFixed(1)}d
              </div>
            </div>

            <div className="bg-recess/90 p-3">
              <div className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
                Recovery Week (Return to REI &lt; 5.0)
              </div>
              <div
                className="mt-1 font-mono text-xs font-bold text-text-primary"
                data-testid="selected-node-recovery-summary"
              >
                A:{' '}
                {formatRecoveryCell(
                  selectedNodeComparison.recoveryWeekA,
                  selectedNodeComparison.neverDisruptedA,
                )}{' '}
                → B:{' '}
                {formatRecoveryCell(
                  selectedNodeComparison.recoveryWeekB,
                  selectedNodeComparison.neverDisruptedB,
                )}
              </div>
              <div className="mt-0.5 font-mono text-xs text-text-muted">
                W26 Residual REI:{' '}
                {selectedNodeComparison.week26ResidualReiA.toFixed(1)} →{' '}
                {selectedNodeComparison.week26ResidualReiB.toFixed(1)}
              </div>
            </div>
          </div>

          {/* Metric Selector Tabs for Dual-Trajectory SVG Chart */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div
              className="inline-flex rounded-sm border border-border-subtle bg-recess p-1"
              role="group"
              aria-label="Trajectory comparison metric"
            >
              {(
                [
                  {
                    id: 'rei',
                    label: 'Relative Exposure Index (REI 0–100)',
                  },
                  {
                    id: 'cpi',
                    label: 'Cost-Pressure Index (CPI 0–100)',
                  },
                  {
                    id: 'inventory',
                    label: 'Remaining Inventory Buffer (Days)',
                  },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  data-testid={`trajectory-metric-${tab.id}`}
                  onClick={() => setTrajectoryMetric(tab.id)}
                  className={`rounded-sm px-2.5 py-1 text-xs font-medium transition-colors ${
                    trajectoryMetric === tab.id
                      ? 'bg-[#D5A653]/15 border border-[#D5A653]/50 text-[#F3EFE5]'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4 text-xs">
              <span className="inline-flex items-center gap-1.5 font-mono text-[#B8D0E8]">
                <span className="h-0.5 w-4 bg-[#7CA3C7]" />
                <span>Scenario A (Reference)</span>
              </span>
              <span className="inline-flex items-center gap-1.5 font-mono text-[#E6C27A]">
                <span className="h-0.5 w-4 border-b-2 border-dashed border-[#D5A653]" />
                <span>Scenario B (Counterfactual)</span>
              </span>
            </div>
          </div>

          {/* Dual-Trajectory SVG Chart */}
          <div className="overflow-x-auto rounded-sm border border-border-subtle bg-recess p-3">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="h-56 w-full min-w-[540px]"
              role="img"
              aria-label={`Dual trajectory chart comparing Scenario A and Scenario B ${trajectoryMetric.toUpperCase()} for ${selectedNodeComparison.nodeName} across Weeks 0 to 26`}
              data-testid="dual-trajectory-svg"
            >
              {/* Horizontal grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
                const val = Math.round(frac * maxMetricValue);
                const y = getValY(val);
                return (
                  <g key={frac}>
                    <line
                      x1={padLeft}
                      y1={y}
                      x2={svgWidth - padRight}
                      y2={y}
                      stroke="#253548"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={padLeft - 8}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-[#7E8D9E] font-mono text-[11px]"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Week ticks and interactive click targets */}
              {selectedNodeComparison.weeklySeries.map((pt) => {
                const x = getWeekX(pt.week);
                const isSelectedWeek = pt.week === currentWeek;
                return (
                  <g
                    key={pt.week}
                    onClick={() => setCurrentWeek(pt.week)}
                    className="cursor-pointer"
                  >
                    {pt.week % 2 === 0 && (
                      <text
                        x={x}
                        y={svgHeight - 8}
                        textAnchor="middle"
                        className={`font-mono text-[11px] ${
                          isSelectedWeek
                            ? 'fill-[#E6C27A] font-bold'
                            : 'fill-[#7E8D9E]'
                        }`}
                      >
                        W{pt.week}
                      </text>
                    )}
                    <rect
                      x={x - plotW / 54}
                      y={padTop}
                      width={plotW / 27}
                      height={plotH}
                      fill="transparent"
                    />
                  </g>
                );
              })}

              {/* Current Week vertical cursor */}
              <line
                x1={getWeekX(currentWeek)}
                y1={padTop}
                x2={getWeekX(currentWeek)}
                y2={padTop + plotH}
                stroke="#D5A653"
                strokeWidth={1.5}
                strokeDasharray="4 2"
              />

              {/* Scenario A Solid Line */}
              <polyline
                fill="none"
                stroke="#7CA3C7"
                strokeWidth={2.5}
                points={polylineA}
              />

              {/* Scenario B Dashed Line */}
              <polyline
                fill="none"
                stroke="#D5A653"
                strokeWidth={2.5}
                strokeDasharray="6 4"
                points={polylineB}
              />

              {/* Current week markers */}
              {(() => {
                const valA =
                  trajectoryMetric === 'rei'
                    ? currentPoint.reiA
                    : trajectoryMetric === 'cpi'
                      ? currentPoint.cpiA
                      : currentPoint.inventoryDaysA;
                const valB =
                  trajectoryMetric === 'rei'
                    ? currentPoint.reiB
                    : trajectoryMetric === 'cpi'
                      ? currentPoint.cpiB
                      : currentPoint.inventoryDaysB;
                return (
                  <>
                    <circle
                      cx={getWeekX(currentWeek)}
                      cy={getValY(valA)}
                      r={4.5}
                      fill="#7CA3C7"
                      stroke="#0B1219"
                      strokeWidth={1.5}
                    />
                    <circle
                      cx={getWeekX(currentWeek)}
                      cy={getValY(valB)}
                      r={4.5}
                      fill="#D5A653"
                      stroke="#0B1219"
                      strokeWidth={1.5}
                    />
                  </>
                );
              })()}
            </svg>
          </div>
        </div>
      </Panel>

      {/* Bottom Panel: Sortable 48-Node Counterfactual Delta Table */}
      <Panel
        title="All 48 Network Nodes — Side-by-Side Scenario Delta Table"
        subtitle="Click any column header to sort by Peak REI Δ, Cumulative Exposure Δ (REI-weeks), or Week-t REI Δ. Select any row to inspect its dual trajectory above."
      >
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="flex flex-col gap-3 rounded-sm border border-border-subtle bg-recess/80 p-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-1.5">
              <Filter
                className="mr-1 h-3.5 w-3.5 text-[#D5A653]"
                aria-hidden="true"
              />
              {CATEGORY_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant="pill"
                  size="sm"
                  active={categoryFilter === opt.value}
                  onClick={() => setCategoryFilter(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter nodes by name or ID..."
                aria-label="Filter scenario comparison table"
                className="w-full rounded-sm border border-border-subtle bg-panel py-1.5 pl-8 pr-3 text-xs text-text-primary placeholder:text-text-muted focus:border-[#D5A653] focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-sm border border-border-subtle">
            <table
              className="w-full border-collapse text-left text-xs"
              data-testid="scenario-comparison-table"
            >
              <thead>
                <tr className="border-b border-border-subtle bg-recess font-mono text-[11px] uppercase tracking-wider text-text-secondary">
                  <th className="px-3 py-2.5 font-semibold">
                    <button
                      type="button"
                      onClick={() => toggleSort('tierIndex')}
                      className="inline-flex items-center gap-1 hover:text-text-primary"
                    >
                      <span>Node & Tier</span>
                      <ArrowUpDown className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </th>
                  <th className="px-3 py-2.5 text-right font-semibold">
                    <button
                      type="button"
                      onClick={() => toggleSort('currentWeekReiDelta')}
                      className="inline-flex items-center justify-end gap-1 hover:text-text-primary"
                    >
                      <span>W{currentWeek} REI (A → B / Δ)</span>
                      <ArrowUpDown className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </th>
                  <th className="px-3 py-2.5 text-right font-semibold">
                    <button
                      type="button"
                      onClick={() => toggleSort('peakReiDelta')}
                      className="inline-flex items-center justify-end gap-1 hover:text-text-primary"
                    >
                      <span>Peak REI (A → B / Δ pts)</span>
                      <ArrowUpDown className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </th>
                  <th className="px-3 py-2.5 text-right font-semibold">
                    <button
                      type="button"
                      onClick={() => toggleSort('cumulativeReiWeeksDelta')}
                      className="inline-flex items-center justify-end gap-1 hover:text-text-primary"
                    >
                      <span>Cumulative Exposure (Δ REI-wks)</span>
                      <ArrowUpDown className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </th>
                  <th className="px-3 py-2.5 font-semibold">
                    Recovery Week (A → B)
                  </th>
                  <th className="px-3 py-2.5 font-semibold">
                    W{currentWeek} Band (B)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/60 bg-panel">
                {filteredAndSortedRows.map((row) => {
                  const isSelected = row.nodeId === selectedNode.id;
                  const wkDeltaFmt = formatDeltaText(
                    row.currentWeekReiDelta,
                    1,
                  );
                  const pkDeltaFmt = formatDeltaText(row.peakReiDelta, 1);
                  const cumDeltaFmt = formatDeltaText(
                    row.cumulativeReiWeeksDelta,
                    1,
                  );
                  const weekPoint =
                    row.weeklySeries[currentWeek] ?? row.weeklySeries[0]!;

                  return (
                    <tr
                      key={row.nodeId}
                      data-testid={`comparison-row-${row.nodeId}`}
                      onClick={() => selectNode(row.nodeId)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          selectNode(row.nodeId);
                        }
                      }}
                      aria-selected={isSelected}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[#D5A653]/12 text-text-primary'
                          : 'hover:bg-elevated/50'
                      }`}
                    >
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-text-primary">
                          {row.nodeName}
                        </div>
                        <div className="font-mono text-xs text-text-muted">
                          T{row.tierIndex} · {row.nodeId} · {row.regionCode}
                        </div>
                      </td>

                      <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                        <span className="text-text-secondary">
                          {row.currentWeekReiA.toFixed(1)} →{' '}
                          {row.currentWeekReiB.toFixed(1)}
                        </span>{' '}
                        <span className={`font-bold ${wkDeltaFmt.toneClass}`}>
                          ({wkDeltaFmt.text})
                        </span>
                      </td>

                      <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                        <span className="text-text-secondary">
                          {row.peakReiA.toFixed(1)} → {row.peakReiB.toFixed(1)}
                        </span>{' '}
                        <span className={`font-bold ${pkDeltaFmt.toneClass}`}>
                          ({pkDeltaFmt.text})
                        </span>
                      </td>

                      <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                        <span className="text-text-secondary">
                          {row.cumulativeReiWeeksA.toFixed(1)} →{' '}
                          {row.cumulativeReiWeeksB.toFixed(1)}
                        </span>{' '}
                        <span className={`font-bold ${cumDeltaFmt.toneClass}`}>
                          ({cumDeltaFmt.text})
                        </span>
                      </td>

                      <td className="px-3 py-2.5 font-mono text-xs text-text-secondary">
                        {formatRecoveryCell(
                          row.recoveryWeekA,
                          row.neverDisruptedA,
                        )}{' '}
                        →{' '}
                        {formatRecoveryCell(
                          row.recoveryWeekB,
                          row.neverDisruptedB,
                        )}
                      </td>

                      <td className="px-3 py-2.5">
                        <SeverityBadge
                          band={weekPoint.severityBandB}
                          score={row.currentWeekReiB}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Epistemic & Unit Semantics Disclosure */}
          <div className="flex items-start gap-2.5 rounded-sm border border-border-subtle border-l-2 border-l-[#D5A653] bg-recess/85 p-3 text-xs text-text-secondary">
            <Info
              className="mt-0.5 h-4 w-4 shrink-0 text-[#D5A653]"
              aria-hidden="true"
            />
            <div>
              <strong className="text-text-primary">
                Counterfactual Unit & Epistemic Guardrail:
              </strong>{' '}
              All differences (<span className="font-mono text-text-primary">Δ = B − A</span>) are
              expressed in bounded Relative Exposure Index points (
              <span className="font-mono text-text-primary">0–100</span>), cumulative{' '}
              <span className="font-mono text-text-primary">REI-weeks</span> across the 27-step
              horizon (<span className="font-mono text-text-primary">Weeks 0..26</span>), or
              inventory buffer days. Negative exposure deltas (
              <span className="font-mono text-[#9CE2C6]">-Δ</span>) indicate
              structural mitigation relief; they do not represent retail price
              or national CPI inflation percentage forecasts.
            </div>
          </div>
        </div>
      </Panel>
    </section>
  );
};
