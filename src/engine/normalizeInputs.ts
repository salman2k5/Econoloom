/**
 * EconoLoom Scenario Parameter Normalization & Bounds Registry
 *
 * Pure TypeScript module (zero React/DOM imports) that sanitizes and clamps
 * user-supplied ScenarioParameters. Handles NaN, +/-Infinity, undefined/null,
 * and out-of-range numbers while strictly preserving valid 0.0 values.
 */

import type { ScenarioParameters } from '../types/domain';

export interface ParameterBoundSpec {
  key: keyof ScenarioParameters;
  label: string;
  shortLabel: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit: string;
  isInteger: boolean;
  calculationRole: string;
}

export const SCENARIO_PARAMETER_BOUNDS: Record<
  keyof ScenarioParameters,
  ParameterBoundSpec
> = {
  shockSeverityPct: {
    key: 'shockSeverityPct',
    label: 'Shock Severity',
    shortLabel: 'Severity',
    min: 0.0,
    max: 1.0,
    step: 0.05,
    defaultValue: 0.6,
    unit: 'fraction (0–100%)',
    isInteger: false,
    calculationRole:
      'Sets the fraction of baseline capacity lost at the origin chokepoint(s) during the active disruption window.',
  },
  durationDays: {
    key: 'durationDays',
    label: 'Disruption Duration',
    shortLabel: 'Duration',
    min: 7,
    max: 180,
    step: 7,
    defaultValue: 90,
    unit: 'days (7–180d)',
    isInteger: true,
    calculationRole:
      'Determines how many weeks the primary curtailment remains active before exponential operational recovery begins.',
  },
  inventoryBufferScale: {
    key: 'inventoryBufferScale',
    label: 'Inventory Buffer Scale',
    shortLabel: 'Buffer Scale',
    min: 0.5,
    max: 2.0,
    step: 0.1,
    defaultValue: 1.0,
    unit: 'multiplier (0.5x–2.0x)',
    isInteger: false,
    calculationRole:
      'Multiplies each node’s baseline working inventory days (e.g., 0.5x lean just-in-time vs. 2.0x strategic stockpiling).',
  },
  rerouteCapacityShare: {
    key: 'rerouteCapacityShare',
    label: 'Bypass & Reroute Utilization',
    shortLabel: 'Bypass Share',
    min: 0.0,
    max: 1.0,
    step: 0.05,
    defaultValue: 0.25,
    unit: 'fraction (0–100%)',
    isInteger: false,
    calculationRole:
      'Scales how much of an edge’s physical bypass capacity (e.g., pipelines or Cape Horn/Good Hope rerouting) is activated after the bypass transit penalty elapses.',
  },
  substitutionFlexibility: {
    key: 'substitutionFlexibility',
    label: 'Supplier Substitution Flexibility',
    shortLabel: 'Substitution',
    min: 0.0,
    max: 1.0,
    step: 0.05,
    defaultValue: 0.25,
    unit: 'fraction (0–100%)',
    isInteger: false,
    calculationRole:
      'Scales each downstream node’s ability to switch to non-disrupted suppliers over a 4-week qualification ramp up to its structural substitutionPotential.',
  },
  shippingCostMultiplier: {
    key: 'shippingCostMultiplier',
    label: 'Freight & Insurance Surcharge',
    shortLabel: 'Freight Multiplier',
    min: 1.0,
    max: 4.0,
    step: 0.1,
    defaultValue: 1.8,
    unit: 'multiplier (1.0x–4.0x)',
    isInteger: false,
    calculationRole:
      'Amplifies the maritime freight, bunker, and war-risk insurance friction component in the downstream Cost-Pressure Index (CPI) when a shock is active.',
  },
};

export const DEFAULT_SCENARIO_PARAMETERS: ScenarioParameters = {
  shockSeverityPct: SCENARIO_PARAMETER_BOUNDS.shockSeverityPct.defaultValue,
  durationDays: SCENARIO_PARAMETER_BOUNDS.durationDays.defaultValue,
  inventoryBufferScale: SCENARIO_PARAMETER_BOUNDS.inventoryBufferScale.defaultValue,
  rerouteCapacityShare: SCENARIO_PARAMETER_BOUNDS.rerouteCapacityShare.defaultValue,
  substitutionFlexibility:
    SCENARIO_PARAMETER_BOUNDS.substitutionFlexibility.defaultValue,
  shippingCostMultiplier:
    SCENARIO_PARAMETER_BOUNDS.shippingCostMultiplier.defaultValue,
};

function sanitizeField(
  raw: unknown,
  spec: ParameterBoundSpec,
  fallbackValue: number,
): number {
  const num = typeof raw === 'number' ? raw : Number.NaN;
  if (!Number.isFinite(num)) {
    const safeFallback = Number.isFinite(fallbackValue)
      ? fallbackValue
      : spec.defaultValue;
    return clampAndRound(safeFallback, spec);
  }
  return clampAndRound(num, spec);
}

function clampAndRound(val: number, spec: ParameterBoundSpec): number {
  const clamped = Math.min(spec.max, Math.max(spec.min, val));
  if (spec.isInteger) {
    return Math.round(clamped);
  }
  // Round to 4 decimal places to avoid IEEE-754 floating-point slider drift (e.g. 0.30000000000000004)
  return Math.round(clamped * 10000) / 10000;
}

/**
 * Normalizes a partial or potentially invalid ScenarioParameters object into a
 * guaranteed-finite, bounds-compliant ScenarioParameters record.
 * Strictly preserves valid 0.0 values.
 */
export function normalizeScenarioParameters(
  input: Partial<Record<keyof ScenarioParameters, unknown>> | null | undefined,
  fallbackDefaults: ScenarioParameters = DEFAULT_SCENARIO_PARAMETERS,
): ScenarioParameters {
  const source = input ?? {};
  return {
    shockSeverityPct: sanitizeField(
      source.shockSeverityPct,
      SCENARIO_PARAMETER_BOUNDS.shockSeverityPct,
      fallbackDefaults.shockSeverityPct,
    ),
    durationDays: sanitizeField(
      source.durationDays,
      SCENARIO_PARAMETER_BOUNDS.durationDays,
      fallbackDefaults.durationDays,
    ),
    inventoryBufferScale: sanitizeField(
      source.inventoryBufferScale,
      SCENARIO_PARAMETER_BOUNDS.inventoryBufferScale,
      fallbackDefaults.inventoryBufferScale,
    ),
    rerouteCapacityShare: sanitizeField(
      source.rerouteCapacityShare,
      SCENARIO_PARAMETER_BOUNDS.rerouteCapacityShare,
      fallbackDefaults.rerouteCapacityShare,
    ),
    substitutionFlexibility: sanitizeField(
      source.substitutionFlexibility,
      SCENARIO_PARAMETER_BOUNDS.substitutionFlexibility,
      fallbackDefaults.substitutionFlexibility,
    ),
    shippingCostMultiplier: sanitizeField(
      source.shippingCostMultiplier,
      SCENARIO_PARAMETER_BOUNDS.shippingCostMultiplier,
      fallbackDefaults.shippingCostMultiplier,
    ),
  };
}

/**
 * Clamps a simulation week index to an integer in [0, 26].
 */
export function normalizeWeekIndex(week: unknown, fallbackWeek = 8): number {
  const num = typeof week === 'number' ? week : Number.NaN;
  if (!Number.isFinite(num)) {
    return Math.min(26, Math.max(0, Math.round(fallbackWeek)));
  }
  return Math.min(26, Math.max(0, Math.round(num)));
}

export const DEFAULT_MAX_PATHS = 5;
export const MAX_ALLOWED_PATHS = 50;

/**
 * Clamps a requested maximum pathway count to an integer in [0, MAX_ALLOWED_PATHS].
 * Non-finite inputs (NaN, +/-Infinity, undefined, null) fall back to fallbackMaxPaths (default 5).
 */
export function normalizeMaxPaths(
  maxPaths: unknown,
  fallbackMaxPaths = DEFAULT_MAX_PATHS,
): number {
  const num = typeof maxPaths === 'number' ? maxPaths : Number.NaN;
  const safeFallback = Number.isFinite(fallbackMaxPaths)
    ? Math.min(MAX_ALLOWED_PATHS, Math.max(0, Math.round(fallbackMaxPaths)))
    : DEFAULT_MAX_PATHS;
  if (!Number.isFinite(num)) {
    return safeFallback;
  }
  return Math.min(MAX_ALLOWED_PATHS, Math.max(0, Math.round(num)));
}

