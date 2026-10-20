import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Table2,
} from 'lucide-react';
import { SIMULATION_HORIZON_WEEKS } from '../../engine/simulateScenario';
import { useScenarioStore } from '../../state/useScenarioStore';
import { Button } from '../common/Button';
import { Panel } from '../common/Panel';
import { SeverityBadge } from '../common/SeverityBadge';

const PLAYBACK_INTERVAL_MS = 450;

export const SimulationTimeline: React.FC = () => {
  const {
    scenarioParams,
    currentWeek,
    isPlaying,
    simulationResult,
    selectedNode,
    selectedNodeState,
    setCurrentWeek,
    stepWeek,
    setIsPlaying,
  } = useScenarioStore();

  const [showTableView, setShowTableView] = useState(false);

  // Clean up playback interval on pause or unmount
  useEffect(() => {
    if (!isPlaying) return;
    const timerId = window.setInterval(() => {
      setCurrentWeek((prev) => {
        if (prev >= SIMULATION_HORIZON_WEEKS) {
          setIsPlaying(false);
          return SIMULATION_HORIZON_WEEKS;
        }
        return prev + 1;
      });
    }, PLAYBACK_INTERVAL_MS);

    return () => {
      window.clearInterval(timerId);
    };
  }, [isPlaying, setCurrentWeek, setIsPlaying]);

  const handleTogglePlay = () => {
    if (!isPlaying && currentWeek >= SIMULATION_HORIZON_WEEKS) {
      setCurrentWeek(0);
      setIsPlaying(true);
    } else {
      setIsPlaying((prev) => !prev);
    }
  };

  // Extract 27-week trajectory for the selected node
  const scaledBaselineDays = useMemo(
    () =>
      Math.max(
        0.1,
        scenarioParams.inventoryBufferScale *
          selectedNode.baselineInventoryDays.value,
      ),
    [
      scenarioParams.inventoryBufferScale,
      selectedNode.baselineInventoryDays.value,
    ],
  );

  const trajectory = useMemo(() => {
    const points: {
      week: number;
      rei: number;
      directRei: number;
      indirectRei: number;
      cpi: number;
      remainingDays: number;
      inventoryPct: number;
    }[] = [];

    for (let w = 0; w <= SIMULATION_HORIZON_WEEKS; w += 1) {
      const st = simulationResult.nodeStatesByWeek[w]?.[selectedNode.id];
      const remDays = st?.remainingInventoryDays ?? scaledBaselineDays;
      const invPct = Math.min(
        100,
        Math.max(0, Math.round((remDays / scaledBaselineDays) * 1000) / 10),
      );
      points.push({
        week: w,
        rei: st?.relativeExposureIndex ?? 0,
        directRei: st?.directRei ?? 0,
        indirectRei: st?.indirectRei ?? 0,
        cpi: st?.costPressureIndex ?? 0,
        remainingDays: remDays,
        inventoryPct: invPct,
      });
    }
    return points;
  }, [simulationResult, selectedNode.id, scaledBaselineDays]);

  const shockEndWeekFloat =
    scenarioParams.shockSeverityPct > 0
      ? scenarioParams.durationDays / 7.0
      : 0;
  const shockEndWeekCeil = Math.min(
    SIMULATION_HORIZON_WEEKS,
    Math.ceil(shockEndWeekFloat),
  );

  const phaseLabel = useMemo(() => {
    if (scenarioParams.shockSeverityPct <= 0) {
      return 'Zero-Shock Baseline Equilibrium (0% Severity)';
    }
    if (currentWeek === 0) {
      return 'Pre-Shock Steady-State Baseline (Week 0)';
    }
    if (currentWeek <= shockEndWeekCeil) {
      return `Active Disruption Window (Day ${currentWeek * 7} of ${scenarioParams.durationDays}d shock)`;
    }
    return `Post-Disruption Recovery & Buffer Replenishment Window (+${currentWeek - shockEndWeekCeil}w after reopening)`;
  }, [
    scenarioParams.shockSeverityPct,
    scenarioParams.durationDays,
    currentWeek,
    shockEndWeekCeil,
  ]);

  // SVG Chart coordinate geometry
  const svgWidth = 760;
  const svgHeight = 195;
  const padLeft = 42;
  const padRight = 18;
  const padTop = 18;
  const padBottom = 30;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  const xForWeek = (w: number) =>
    padLeft + (w / SIMULATION_HORIZON_WEEKS) * plotWidth;
  const yForScore = (val: number) =>
    padTop + plotHeight - (Math.min(100, Math.max(0, val)) / 100) * plotHeight;

  const reiPolyline = trajectory
    .map((pt) => `${xForWeek(pt.week).toFixed(1)},${yForScore(pt.rei).toFixed(1)}`)
    .join(' ');
  const cpiPolyline = trajectory
    .map((pt) => `${xForWeek(pt.week).toFixed(1)},${yForScore(pt.cpi).toFixed(1)}`)
    .join(' ');
  const invPolyline = trajectory
    .map(
      (pt) =>
        `${xForWeek(pt.week).toFixed(1)},${yForScore(pt.inventoryPct).toFixed(1)}`,
    )
    .join(' ');

  const shockWindowWidth =
    scenarioParams.shockSeverityPct > 0
      ? Math.max(0, xForWeek(Math.min(26, shockEndWeekFloat)) - xForWeek(0))
      : 0;

  // Key inflection weeks for the accessible tabular summary
  const summaryWeeks = useMemo(() => {
    let peakWeek = 0;
    let maxRei = -1;
    for (const pt of trajectory) {
      if (pt.rei > maxRei) {
        maxRei = pt.rei;
        peakWeek = pt.week;
      }
    }
    const candidateWeeks = new Set<number>([
      0,
      1,
      4,
      8,
      12,
      shockEndWeekCeil,
      peakWeek,
      20,
      26,
    ]);
    return Array.from(candidateWeeks)
      .filter((w) => w >= 0 && w <= 26)
      .sort((a, b) => a - b)
      .map((w) => trajectory[w]!);
  }, [trajectory, shockEndWeekCeil]);

  return (
    <Panel
      title={`26-Week Deterministic Simulation Timeline — ${selectedNode.name}`}
      subtitle="Simulated Output — Model-Derived · Scrub across Weeks 0–26 (Days 0–182) to inspect propagation lags, buffer drawdown, and recovery."
      badge={
        <span className="rounded-sm border border-[#D5A653]/45 bg-[#D5A653]/12 px-2 py-0.5 font-mono text-xs font-medium text-[#E6C27A]">
          Simulated Output — Model-Derived
        </span>
      }
      actions={
        <Button
          variant="ghost"
          size="sm"
          active={showTableView}
          onClick={() => setShowTableView((prev) => !prev)}
          icon={<Table2 className="h-3.5 w-3.5 text-[#D5A653]" />}
        >
          {showTableView ? 'Hide Data Table' : 'Tabular Summary'}
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Top Scrubber Controls & Active Week Readout */}
        <div className="flex flex-col gap-3 rounded-sm border border-border-subtle bg-recess/90 p-3.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleTogglePlay}
              aria-label={
                isPlaying ? 'Pause simulation playback' : 'Play simulation timeline'
              }
              icon={
                isPlaying ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )
              }
            >
              {isPlaying ? 'Pause' : 'Play'}
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => stepWeek(-1)}
              disabled={currentWeek <= 0}
              aria-label="Previous week"
              icon={<ChevronLeft className="h-3.5 w-3.5" />}
            >
              -1w
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => stepWeek(1)}
              disabled={currentWeek >= SIMULATION_HORIZON_WEEKS}
              aria-label="Next week"
              icon={<ChevronRight className="h-3.5 w-3.5" />}
            >
              +1w
            </Button>

            <div className="ml-1 flex items-center gap-2 rounded-sm border border-border-subtle bg-panel px-3 py-1.5">
              <CalendarClock
                className="h-4 w-4 text-[#D5A653]"
                aria-hidden="true"
              />
              <span className="font-mono text-xs font-bold text-text-primary tabular-nums">
                Week {currentWeek} / 26
              </span>
              <span className="font-mono text-xs text-text-muted tabular-nums">
                (Day {currentWeek * 7})
              </span>
            </div>

            <span className="text-xs font-medium text-text-secondary">
              {phaseLabel}
            </span>
          </div>

          {/* Current Week Selected Node Quick Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge
              band={selectedNodeState.severityBand}
              score={selectedNodeState.relativeExposureIndex}
              metricLabel="REI"
            />
            <span className="inline-flex items-center gap-1 rounded-sm border border-[#D5A653]/45 bg-[#D5A653]/12 px-2 py-0.5 font-mono text-xs font-semibold text-[#E6C27A] tabular-nums">
              CPI: {selectedNodeState.costPressureIndex.toFixed(1)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-sm border border-[#38B688]/45 bg-[#38B688]/12 px-2 py-0.5 font-mono text-xs font-semibold text-[#80D8B6] tabular-nums">
              Buffer: {selectedNodeState.remainingInventoryDays.toFixed(1)}d /{' '}
              {scaledBaselineDays.toFixed(1)}d
            </span>
          </div>
        </div>

        {/* Range Scrubber Input */}
        <div className="space-y-1.5 px-1">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <label htmlFor="timeline-week-scrubber" className="font-medium text-text-secondary">
              Scrub Simulation Week (0 to 26)
            </label>
            <span className="font-mono tabular-nums">
              Disruption Window: Weeks 1–{shockEndWeekCeil} ({scenarioParams.durationDays}d)
            </span>
          </div>
          <input
            id="timeline-week-scrubber"
            type="range"
            aria-label="Simulation week scrubber"
            aria-valuetext={`Week ${currentWeek} (Day ${currentWeek * 7})`}
            min={0}
            max={SIMULATION_HORIZON_WEEKS}
            step={1}
            value={currentWeek}
            onChange={(e) => {
              setIsPlaying(false);
              setCurrentWeek(Number.parseInt(e.target.value, 10));
            }}
            className="h-2 w-full cursor-pointer appearance-none rounded-sm bg-elevated accent-[#D5A653] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5A653]/75"
          />
          <div className="flex justify-between font-mono text-xs text-text-muted tabular-nums">
            <span>W0 (Baseline)</span>
            <span>W4</span>
            <span>W8</span>
            <span>W13 (91d)</span>
            <span>W18</span>
            <span>W22</span>
            <span>W26 (182d)</span>
          </div>
        </div>

        {/* Responsive Multi-Series SVG Trajectory Chart */}
        <div className="rounded-sm border border-border-subtle bg-recess p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-1.5 font-medium text-[#F598A6]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#E05A6D]" />
                Relative Exposure Index (REI 0–100)
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium text-[#E6C27A]">
                <span className="h-0.5 w-4 border-b-2 border-dashed border-[#D5A653]" />
                Cost-Pressure Index (CPI 0–100)
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium text-[#80D8B6]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#38B688]" />
                Remaining Inventory Buffer (% of {scaledBaselineDays.toFixed(1)}d max)
              </span>
            </div>
            <span className="font-mono text-xs text-text-muted">
              Click any week point on chart to jump
            </span>
          </div>

          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            role="img"
            aria-label={`26-week simulated trajectory chart for ${selectedNode.name}. At Week ${currentWeek}, Relative Exposure Index is ${selectedNodeState.relativeExposureIndex.toFixed(1)}, Cost-Pressure Index is ${selectedNodeState.costPressureIndex.toFixed(1)}, and remaining inventory is ${selectedNodeState.remainingInventoryDays.toFixed(1)} days.`}
            className="h-auto w-full select-none overflow-visible"
          >
            {/* Shaded Active Disruption Window */}
            {shockWindowWidth > 0 && (
              <g>
                <rect
                  x={xForWeek(0)}
                  y={padTop}
                  width={shockWindowWidth}
                  height={plotHeight}
                  fill="rgba(224, 90, 109, 0.08)"
                  stroke="rgba(224, 90, 109, 0.32)"
                  strokeDasharray="3 3"
                />
                <text
                  x={xForWeek(0) + 6}
                  y={padTop + 13}
                  fill="#F598A6"
                  fontSize="11"
                  fontFamily="monospace"
                >
                  Active Disruption ({scenarioParams.durationDays}d)
                </text>
              </g>
            )}

            {/* Horizontal Grid Lines (0, 25, 50, 75, 100) */}
            {[0, 25, 50, 75, 100].map((tick) => {
              const y = yForScore(tick);
              return (
                <g key={tick}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={svgWidth - padRight}
                    y2={y}
                    stroke="#253548"
                    strokeWidth="1"
                  />
                  <text
                    x={padLeft - 6}
                    y={y + 4}
                    textAnchor="end"
                    fill="#7E8D9E"
                    fontSize="11"
                    fontFamily="monospace"
                  >
                    {tick}
                  </text>
                </g>
              );
            })}

            {/* Inventory Buffer % Curve (Sage Emerald) */}
            <polyline
              fill="none"
              stroke="#38B688"
              strokeWidth="2"
              points={invPolyline}
            />

            {/* Cost-Pressure Index Curve (Muted Amber Dashed) */}
            <polyline
              fill="none"
              stroke="#D5A653"
              strokeWidth="2"
              strokeDasharray="5 3"
              points={cpiPolyline}
            />

            {/* Relative Exposure Index Curve (Crimson Solid) */}
            <polyline
              fill="none"
              stroke="#E05A6D"
              strokeWidth="2.5"
              points={reiPolyline}
            />

            {/* Active Week Crosshair */}
            <line
              x1={xForWeek(currentWeek)}
              y1={padTop}
              x2={xForWeek(currentWeek)}
              y2={padTop + plotHeight}
              stroke="#D5A653"
              strokeWidth="1.5"
            />

            {/* Interactive Week Points */}
            {trajectory.map((pt) => {
              const cx = xForWeek(pt.week);
              const isCurrent = pt.week === currentWeek;
              return (
                <g
                  key={pt.week}
                  className="cursor-pointer"
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentWeek(pt.week);
                  }}
                >
                  <rect
                    x={cx - plotWidth / 54}
                    y={padTop}
                    width={plotWidth / 27}
                    height={plotHeight}
                    fill="transparent"
                  />
                  {isCurrent && (
                    <>
                      <circle
                        cx={cx}
                        cy={yForScore(pt.inventoryPct)}
                        r="4"
                        fill="#38B688"
                        stroke="#0B1219"
                        strokeWidth="1.5"
                      />
                      <circle
                        cx={cx}
                        cy={yForScore(pt.cpi)}
                        r="4"
                        fill="#D5A653"
                        stroke="#0B1219"
                        strokeWidth="1.5"
                      />
                      <circle
                        cx={cx}
                        cy={yForScore(pt.rei)}
                        r="5"
                        fill="#E05A6D"
                        stroke="#F3EFE5"
                        strokeWidth="1.5"
                      />
                    </>
                  )}
                  {pt.week % 2 === 0 && (
                    <text
                      x={cx}
                      y={svgHeight - 8}
                      textAnchor="middle"
                      fill={isCurrent ? '#E6C27A' : '#7E8D9E'}
                      fontWeight={isCurrent ? 'bold' : 'normal'}
                      fontSize="11"
                      fontFamily="monospace"
                    >
                      W{pt.week}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Accessible Tabular Alternative (Visible when toggled, always in DOM for assistive tech via sr-only when collapsed) */}
        <div className={showTableView ? 'block' : 'sr-only'}>
          <div className="overflow-x-auto rounded-sm border border-border-subtle bg-panel">
            <table
              aria-label={`Key weekly simulation values for ${selectedNode.name}`}
              className="w-full border-collapse text-left text-xs"
            >
              <thead>
                <tr className="border-b border-border-subtle bg-elevated/80 font-mono text-[11px] uppercase tracking-wider text-text-secondary">
                  <th className="px-3 py-2 font-semibold">Week (Day)</th>
                  <th className="px-3 py-2 text-right font-semibold">
                    Total REI (0–100)
                  </th>
                  <th className="px-3 py-2 text-right font-semibold">
                    Direct / Indirect REI
                  </th>
                  <th className="px-3 py-2 text-right font-semibold">
                    Cost-Pressure CPI (0–100)
                  </th>
                  <th className="px-3 py-2 text-right font-semibold">
                    Remaining Inventory
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/60 font-mono tabular-nums">
                {summaryWeeks.map((pt) => (
                  <tr
                    key={pt.week}
                    onClick={() => setCurrentWeek(pt.week)}
                    className={`cursor-pointer ${
                      pt.week === currentWeek
                        ? 'bg-[#D5A653]/15 text-text-primary'
                        : 'text-text-secondary hover:bg-elevated/50'
                    }`}
                  >
                    <td className="px-3 py-1.5 font-semibold">
                      Week {pt.week} (Day {pt.week * 7})
                    </td>
                    <td className="px-3 py-1.5 text-right font-bold text-[#F598A6]">
                      {pt.rei.toFixed(1)}
                    </td>
                    <td className="px-3 py-1.5 text-right text-text-secondary">
                      {pt.directRei.toFixed(1)} / {pt.indirectRei.toFixed(1)}
                    </td>
                    <td className="px-3 py-1.5 text-right text-[#E6C27A]">
                      {pt.cpi.toFixed(1)}
                    </td>
                    <td className="px-3 py-1.5 text-right text-[#80D8B6]">
                      {pt.remainingDays.toFixed(1)}d ({pt.inventoryPct.toFixed(0)}%)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Panel>
  );
};
