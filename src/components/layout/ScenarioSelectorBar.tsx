import React, { useState } from 'react';
import {
  AlertCircle,
  Anchor,
  Check,
  Cpu,
  Download,
  Flame,
  Link2,
  RotateCcw,
  ShieldOff,
  SlidersHorizontal,
} from 'lucide-react';
import { PRESETS } from '../../data';
import { SCENARIO_PARAMETER_BOUNDS } from '../../engine/normalizeInputs';
import { useScenarioStore } from '../../state/useScenarioStore';
import type { ScenarioParameters } from '../../types/domain';
import { Button } from '../common/Button';
import { DataTierBadge } from '../common/DataTierBadge';
import { Tooltip } from '../common/Tooltip';

const PRESET_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  preset_hormuz_energy: Flame,
  preset_taiwan_semi: Cpu,
  preset_panama_canal: Anchor,
};

interface ControlDescriptor {
  key: keyof ScenarioParameters;
  title: string;
  boundsText: string;
  unitSuffix: string;
  isPercentage: boolean;
  sliderMin: number;
  sliderMax: number;
  sliderStep: number;
  accentClass: string;
}

const PARAMETER_CONTROLS: ControlDescriptor[] = [
  {
    key: 'shockSeverityPct',
    title: 'Shock Severity',
    boundsText: '0–100%',
    unitSuffix: '%',
    isPercentage: true,
    sliderMin: 0,
    sliderMax: 100,
    sliderStep: 5,
    accentClass: 'text-[#E6C27A]',
  },
  {
    key: 'durationDays',
    title: 'Disruption Duration',
    boundsText: '7–180d',
    unitSuffix: 'd',
    isPercentage: false,
    sliderMin: 7,
    sliderMax: 180,
    sliderStep: 7,
    accentClass: 'text-text-primary',
  },
  {
    key: 'inventoryBufferScale',
    title: 'Inventory Buffer Scale',
    boundsText: '0.5×–2.0×',
    unitSuffix: '×',
    isPercentage: false,
    sliderMin: 0.5,
    sliderMax: 2.0,
    sliderStep: 0.1,
    accentClass: 'text-[#80D8B6]',
  },
  {
    key: 'rerouteCapacityShare',
    title: 'Bypass Utilization',
    boundsText: '0–100%',
    unitSuffix: '%',
    isPercentage: true,
    sliderMin: 0,
    sliderMax: 100,
    sliderStep: 5,
    accentClass: 'text-[#80D8B6]',
  },
  {
    key: 'substitutionFlexibility',
    title: 'Supplier Substitution',
    boundsText: '0–100%',
    unitSuffix: '%',
    isPercentage: true,
    sliderMin: 0,
    sliderMax: 100,
    sliderStep: 5,
    accentClass: 'text-[#ACC7E0]',
  },
  {
    key: 'shippingCostMultiplier',
    title: 'Freight Surcharge',
    boundsText: '1.0×–4.0×',
    unitSuffix: '×',
    isPercentage: false,
    sliderMin: 1.0,
    sliderMax: 4.0,
    sliderStep: 0.1,
    accentClass: 'text-[#F2A679]',
  },
];

function parsePercentageOrFraction(rawVal: number): number {
  if (!Number.isFinite(rawVal)) return Number.NaN;
  if (rawVal < 0) return 0;
  // Support both [0, 1] fractional input (e.g. 0.75) and [0, 100] percentage input (e.g. 75)
  if (rawVal > 0 && rawVal < 1) {
    return rawVal;
  }
  return Math.min(1, rawVal / 100);
}

export const ScenarioSelectorBar: React.FC = () => {
  const {
    activePreset,
    scenarioParams,
    isCustomModified,
    currentWeek,
    selectPreset,
    updateParameter,
    resetToPresetDefaults,
    applyZeroShock,
    getShareableScenarioUrl,
    getScenarioSnapshotExport,
  } = useScenarioStore();

  const [actionFeedback, setActionFeedback] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleControlChange = (
    ctrl: ControlDescriptor,
    rawString: string,
  ) => {
    const parsed = Number.parseFloat(rawString);
    if (Number.isNaN(parsed)) return;
    const normalizedValue = ctrl.isPercentage
      ? parsePercentageOrFraction(parsed)
      : parsed;
    updateParameter(ctrl.key, normalizedValue);
  };

  const handleCopyShareLink = async () => {
    const shareUrl = getShareableScenarioUrl();
    try {
      if (
        typeof navigator !== 'undefined' &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === 'function'
      ) {
        await navigator.clipboard.writeText(shareUrl);
        setActionFeedback({
          tone: 'success',
          message: 'Shareable scenario link copied to clipboard.',
        });
      } else {
        throw new Error('Clipboard API unavailable');
      }
    } catch {
      setActionFeedback({
        tone: 'error',
        message: `Could not access clipboard. Copy URL directly: ${shareUrl}`,
      });
    }
  };

  const handleExportScenarioJson = () => {
    try {
      const snapshot = getScenarioSnapshotExport();
      const jsonContent = JSON.stringify(snapshot, null, 2);

      if (
        typeof URL === 'undefined' ||
        typeof URL.createObjectURL !== 'function'
      ) {
        throw new Error('Blob download unavailable');
      }

      const blob = new Blob([jsonContent], {
        type: 'application/json;charset=utf-8',
      });
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = `econoloom-scenario-${activePreset.id}-w${currentWeek}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      if (typeof URL.revokeObjectURL === 'function') {
        URL.revokeObjectURL(objectUrl);
      }

      setActionFeedback({
        tone: 'success',
        message: `Exported validated JSON snapshot (${anchor.download}).`,
      });
    } catch {
      setActionFeedback({
        tone: 'error',
        message: 'Failed to export scenario JSON snapshot in this environment.',
      });
    }
  };

  return (
    <section
      aria-label="Scenario Preset & Interactive Parameter Controls"
      className="border-b border-border-subtle bg-panel/75"
    >
      <div className="mx-auto max-w-[1600px] space-y-3.5 px-4 py-3.5 sm:px-6">
        {/* Top Row: Preset Switcher & Quick Reset / Zero-Shock / Share & Export Actions */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                Select Flagship Disruption Scenario
              </span>
              <Tooltip content="Each preset configures a researched global supply-chain disruption with historical precedent, affected trade corridors, and baseline parameters." />
              {isCustomModified && (
                <span className="rounded-sm border border-[#D5A653]/50 bg-[#D5A653]/15 px-2 py-0.5 font-mono text-xs font-medium text-[#E6C27A]">
                  Custom Modified Parameters
                </span>
              )}
            </div>
            <div
              role="group"
              aria-label="Flagship Disruption Presets"
              className="flex flex-wrap gap-2"
            >
              {PRESETS.map((preset) => {
                const isSelected = preset.id === activePreset.id;
                const Icon = PRESET_ICONS[preset.id] ?? Anchor;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => selectPreset(preset.id)}
                    aria-pressed={isSelected}
                    className={`group flex items-center gap-2.5 rounded border border-l-2 px-3.5 py-2 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5A653]/75 ${
                      isSelected
                        ? 'border-[#D5A653]/70 border-l-[#D5A653] bg-elevated text-text-primary shadow-glow'
                        : 'border-border-subtle border-l-border-subtle bg-recess/80 text-text-secondary hover:border-[#7CA3C7]/45 hover:bg-elevated/60 hover:text-text-primary'
                    }`}
                  >
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border ${
                        isSelected
                          ? 'border-[#D5A653]/50 bg-[#D5A653]/18 text-[#E6C27A]'
                          : 'border-border-subtle bg-canvas text-text-muted group-hover:text-text-secondary'
                      }`}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div>
                      <div className="font-display text-xs font-semibold leading-tight tracking-tight text-text-primary">
                        {preset.title}
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] text-text-muted tabular-nums">
                        {Math.round(preset.defaultParams.shockSeverityPct * 100)}% capacity loss ·{' '}
                        {preset.defaultParams.durationDays}d duration
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons: Share Link, Export JSON, Zero Shock & Reset to Preset */}
          <div className="flex flex-col items-start gap-1.5 lg:items-end">
            <div className="flex flex-wrap items-center gap-2">
              <DataTierBadge classification="user_input" compact />
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopyShareLink}
                data-testid="copy-share-link-btn"
                icon={<Link2 className="h-3.5 w-3.5 text-[#D5A653]" />}
              >
                Copy Share Link
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExportScenarioJson}
                data-testid="export-scenario-json-btn"
                icon={<Download className="h-3.5 w-3.5 text-[#38B688]" />}
              >
                Export Scenario JSON
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={applyZeroShock}
                disabled={scenarioParams.shockSeverityPct === 0}
                icon={<ShieldOff className="h-3.5 w-3.5 text-[#7CA3C7]" />}
              >
                Zero Shock (0%)
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={resetToPresetDefaults}
                disabled={!isCustomModified}
                icon={<RotateCcw className="h-3.5 w-3.5 text-[#D5A653]" />}
              >
                Reset to Preset
              </Button>
            </div>

            {actionFeedback && (
              <div
                role="status"
                aria-live="polite"
                data-testid="scenario-action-feedback"
                className={`inline-flex max-w-full items-center gap-1.5 rounded-sm border px-2.5 py-1 text-xs ${
                  actionFeedback.tone === 'success'
                    ? 'border-[#38B688]/45 bg-[#38B688]/12 text-[#80D8B6]'
                    : 'border-[#E05A6D]/45 bg-[#E05A6D]/12 text-[#F598A6]'
                }`}
              >
                {actionFeedback.tone === 'success' ? (
                  <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                ) : (
                  <AlertCircle
                    className="h-3.5 w-3.5 shrink-0"
                    aria-hidden="true"
                  />
                )}
                <span className="truncate">{actionFeedback.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Row: 6 Interactive Synchronized Parameter Sliders + Numeric Inputs */}
        <div className="rounded-sm border border-border-subtle bg-recess/90">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle bg-panel/80 px-3.5 py-2">
            <div className="flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-wider text-text-secondary">
              <SlidersHorizontal
                className="h-3.5 w-3.5 text-[#D5A653]"
                aria-hidden="true"
              />
              <span>
                Interactive Scenario Levers (Synchronized Sliders & Numeric Inputs · Instant 26-Week Recalculation)
              </span>
            </div>
            <span className="font-mono text-xs text-[#E6C27A] tabular-nums">
              Active: {Math.round(scenarioParams.shockSeverityPct * 100)}% severity ·{' '}
              {scenarioParams.durationDays}d ({(scenarioParams.durationDays / 7).toFixed(1)}w)
            </span>
          </div>

          <div className="grid grid-cols-1 gap-px bg-border-subtle sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {PARAMETER_CONTROLS.map((ctrl) => {
              const spec = SCENARIO_PARAMETER_BOUNDS[ctrl.key];
              const rawValue = scenarioParams[ctrl.key];
              const displayValue = ctrl.isPercentage
                ? Math.round(rawValue * 100)
                : ctrl.key === 'durationDays'
                  ? Math.round(rawValue)
                  : Number(rawValue.toFixed(2));

              const sliderId = `param-slider-${ctrl.key}`;
              const numberId = `param-number-${ctrl.key}`;
              const formattedValueText = `${displayValue}${ctrl.unitSuffix}`;

              return (
                <div
                  key={ctrl.key}
                  className="flex flex-col justify-between bg-recess/95 p-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <label
                        htmlFor={numberId}
                        className="text-xs font-semibold tracking-tight text-text-primary"
                      >
                        {ctrl.title}
                      </label>
                      <Tooltip
                        label={`How ${ctrl.title} affects the simulation`}
                        content={`${spec.calculationRole} Valid range: ${ctrl.boundsText}.`}
                      />
                    </div>
                    <div className="mt-0.5 flex items-center justify-between text-xs text-text-muted">
                      <span>Bounds: {ctrl.boundsText}</span>
                      <span className={`font-mono font-semibold tabular-nums ${ctrl.accentClass}`}>
                        {displayValue}
                        {ctrl.unitSuffix}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center gap-2">
                    <input
                      id={sliderId}
                      type="range"
                      aria-label={`${ctrl.title} slider`}
                      aria-valuetext={formattedValueText}
                      min={ctrl.sliderMin}
                      max={ctrl.sliderMax}
                      step={ctrl.sliderStep}
                      value={displayValue}
                      onChange={(e) => handleControlChange(ctrl, e.target.value)}
                      className="h-1.5 w-full cursor-pointer appearance-none rounded-sm bg-elevated accent-[#D5A653] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5A653]/75"
                    />
                    <input
                      id={numberId}
                      type="number"
                      aria-label={`${ctrl.title} numeric input`}
                      min={ctrl.sliderMin}
                      max={ctrl.sliderMax}
                      step={ctrl.sliderStep}
                      value={displayValue}
                      onChange={(e) => handleControlChange(ctrl, e.target.value)}
                      className="w-16 shrink-0 rounded-sm border border-border-subtle bg-panel px-1.5 py-1 text-right font-mono text-xs font-semibold text-text-primary tabular-nums focus:border-[#D5A653] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D5A653]/75"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
