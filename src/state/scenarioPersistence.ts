/**
 * EconoLoom Schema-Validated Scenario Persistence & Shareable Snapshot Module
 *
 * Manages deterministic, loop-free state restoration and synchronization across:
 * 1. URL query parameters (shareable links)
 * 2. Browser localStorage (reload persistence)
 * 3. Canonical preset defaults
 *
 * Precedence Order (per validated field):
 *   Valid URL Query Parameter > Valid LocalStorage Value > Canonical Preset Default
 */

import { z } from 'zod';
import { NODE_BY_ID, PRESET_BY_ID, PRESETS } from '../data';
import {
  normalizeScenarioParameters,
  normalizeWeekIndex,
  SCENARIO_PARAMETER_BOUNDS,
} from '../engine/normalizeInputs';
import type { ScenarioParameters } from '../types/domain';
import type { WorkspaceTab } from '../types/ui';

export const SCENARIO_STORAGE_KEY = 'econoloom.scenario_state.v1';
export const SCENARIO_SNAPSHOT_SCHEMA_VERSION =
  'econoloom.scenario_snapshot.v1' as const;
export const DEFAULT_INITIAL_WEEK = 8;

export const VALID_WORKSPACE_TABS: readonly WorkspaceTab[] = [
  'overview',
  'pathway_explorer',
  'scenario_comparison',
  'dataset_explorer',
  'evidence_sources',
] as const;

export interface PersistedScenarioState {
  activePresetId: string;
  scenarioParams: ScenarioParameters;
  selectedNodeId: string;
  currentWeek: number;
  activeWorkspaceTab: WorkspaceTab;
}

export interface PartialPersistedScenarioInput {
  activePresetId?: string;
  scenarioParams?: Partial<ScenarioParameters>;
  selectedNodeId?: string;
  currentWeek?: number;
  activeWorkspaceTab?: WorkspaceTab;
}

export interface ScenarioSnapshotExport {
  schemaVersion: typeof SCENARIO_SNAPSHOT_SCHEMA_VERSION;
  exportedAt: string;
  activePresetId: string;
  scenarioParams: ScenarioParameters;
  selectedNodeId: string;
  currentWeek: number;
  activeWorkspaceTab: WorkspaceTab;
}

export const ScenarioParametersExportSchema = z
  .object({
    shockSeverityPct: z
      .number()
      .finite()
      .min(SCENARIO_PARAMETER_BOUNDS.shockSeverityPct.min)
      .max(SCENARIO_PARAMETER_BOUNDS.shockSeverityPct.max),
    durationDays: z
      .number()
      .int()
      .min(SCENARIO_PARAMETER_BOUNDS.durationDays.min)
      .max(SCENARIO_PARAMETER_BOUNDS.durationDays.max),
    inventoryBufferScale: z
      .number()
      .finite()
      .min(SCENARIO_PARAMETER_BOUNDS.inventoryBufferScale.min)
      .max(SCENARIO_PARAMETER_BOUNDS.inventoryBufferScale.max),
    rerouteCapacityShare: z
      .number()
      .finite()
      .min(SCENARIO_PARAMETER_BOUNDS.rerouteCapacityShare.min)
      .max(SCENARIO_PARAMETER_BOUNDS.rerouteCapacityShare.max),
    substitutionFlexibility: z
      .number()
      .finite()
      .min(SCENARIO_PARAMETER_BOUNDS.substitutionFlexibility.min)
      .max(SCENARIO_PARAMETER_BOUNDS.substitutionFlexibility.max),
    shippingCostMultiplier: z
      .number()
      .finite()
      .min(SCENARIO_PARAMETER_BOUNDS.shippingCostMultiplier.min)
      .max(SCENARIO_PARAMETER_BOUNDS.shippingCostMultiplier.max),
  })
  .strict();

export const ScenarioSnapshotExportSchema = z
  .object({
    schemaVersion: z.literal(SCENARIO_SNAPSHOT_SCHEMA_VERSION),
    exportedAt: z.string().min(10),
    activePresetId: z
      .string()
      .refine((id) => PRESET_BY_ID.has(id), 'Unknown preset ID'),
    scenarioParams: ScenarioParametersExportSchema,
    selectedNodeId: z
      .string()
      .refine((id) => NODE_BY_ID.has(id), 'Unknown node ID'),
    currentWeek: z.number().int().min(0).max(26),
    activeWorkspaceTab: z.enum([
      'overview',
      'pathway_explorer',
      'scenario_comparison',
      'dataset_explorer',
      'evidence_sources',
    ]),
  })
  .strict();

const URL_PARAM_ALIASES: Record<
  keyof ScenarioParameters,
  readonly [compactKey: string, fullKey: string]
> = {
  shockSeverityPct: ['sev', 'shockSeverityPct'],
  durationDays: ['dur', 'durationDays'],
  inventoryBufferScale: ['inv', 'inventoryBufferScale'],
  rerouteCapacityShare: ['reroute', 'rerouteCapacityShare'],
  substitutionFlexibility: ['sub', 'substitutionFlexibility'],
  shippingCostMultiplier: ['ship', 'shippingCostMultiplier'],
};

function parseFiniteNumber(raw: unknown): number | null {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : null;
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.length === 0) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function parseValidPresetId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return PRESET_BY_ID.has(trimmed) ? trimmed : null;
}

export function parseValidNodeId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return NODE_BY_ID.has(trimmed) ? trimmed : null;
}

export function parseValidWorkspaceTab(raw: unknown): WorkspaceTab | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim() as WorkspaceTab;
  return VALID_WORKSPACE_TABS.includes(trimmed) ? trimmed : null;
}

export function parseValidWeek(raw: unknown): number | null {
  const num = parseFiniteNumber(raw);
  if (num === null) return null;
  return normalizeWeekIndex(num, DEFAULT_INITIAL_WEEK);
}

/**
 * Extracts only finite numeric parameter fields from an untrusted object so that
 * a single malformed field falls back safely without discarding sibling valid fields.
 */
export function extractPartialScenarioParamsFromObject(
  rawObj: unknown,
): Partial<ScenarioParameters> {
  if (!rawObj || typeof rawObj !== 'object' || Array.isArray(rawObj)) {
    return {};
  }
  const record = rawObj as Record<string, unknown>;
  const partial: Partial<ScenarioParameters> = {};

  (Object.keys(SCENARIO_PARAMETER_BOUNDS) as (keyof ScenarioParameters)[]).forEach(
    (key) => {
      const num = parseFiniteNumber(record[key]);
      if (num !== null) {
        partial[key] = num;
      }
    },
  );

  return partial;
}

/**
 * Reads and validates scenario fields from localStorage.
 * Never throws on malformed JSON, unknown IDs, or inaccessible storage.
 */
export function readPersistedScenarioFromStorage(
  storage?: Pick<Storage, 'getItem'> | null,
): PartialPersistedScenarioInput {
  const targetStorage =
    storage !== undefined
      ? storage
      : typeof window !== 'undefined'
        ? (() => {
            try {
              return window.localStorage;
            } catch {
              return null;
            }
          })()
        : null;

  if (!targetStorage) return {};

  try {
    const rawJson = targetStorage.getItem(SCENARIO_STORAGE_KEY);
    if (!rawJson) return {};
    const parsed: unknown = JSON.parse(rawJson);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    const record = parsed as Record<string, unknown>;
    const result: PartialPersistedScenarioInput = {};

    const validPresetId = parseValidPresetId(record.activePresetId);
    if (validPresetId) {
      result.activePresetId = validPresetId;
    }

    const partialParams = extractPartialScenarioParamsFromObject(
      record.scenarioParams,
    );
    if (Object.keys(partialParams).length > 0) {
      result.scenarioParams = partialParams;
    }

    const validNodeId = parseValidNodeId(record.selectedNodeId);
    if (validNodeId) {
      result.selectedNodeId = validNodeId;
    }

    const validWeek = parseValidWeek(record.currentWeek);
    if (validWeek !== null) {
      result.currentWeek = validWeek;
    }

    const validTab = parseValidWorkspaceTab(record.activeWorkspaceTab);
    if (validTab) {
      result.activeWorkspaceTab = validTab;
    }

    return result;
  } catch {
    return {};
  }
}

/**
 * Reads and validates scenario fields from a URL query string.
 * Supports both compact keys (preset, sev, dur, inv, reroute, sub, ship, node, week, tab)
 * and full property names.
 */
export function readScenarioFromUrlSearch(
  search?: string,
): PartialPersistedScenarioInput {
  const rawSearch =
    search !== undefined
      ? search
      : typeof window !== 'undefined'
        ? window.location.search
        : '';

  if (!rawSearch || rawSearch.trim().length === 0) {
    return {};
  }

  try {
    const params = new URLSearchParams(rawSearch);
    const result: PartialPersistedScenarioInput = {};

    const rawPreset = params.get('preset') ?? params.get('activePresetId');
    const validPresetId = parseValidPresetId(rawPreset);
    if (validPresetId) {
      result.activePresetId = validPresetId;
    }

    const partialParams: Partial<ScenarioParameters> = {};
    (
      Object.keys(URL_PARAM_ALIASES) as (keyof ScenarioParameters)[]
    ).forEach((paramKey) => {
      const [compactKey, fullKey] = URL_PARAM_ALIASES[paramKey];
      const rawVal = params.get(compactKey) ?? params.get(fullKey);
      const num = parseFiniteNumber(rawVal);
      if (num !== null) {
        partialParams[paramKey] = num;
      }
    });

    if (Object.keys(partialParams).length > 0) {
      result.scenarioParams = partialParams;
    }

    const rawNode = params.get('node') ?? params.get('selectedNodeId');
    const validNodeId = parseValidNodeId(rawNode);
    if (validNodeId) {
      result.selectedNodeId = validNodeId;
    }

    const rawWeek = params.get('week') ?? params.get('currentWeek');
    const validWeek = parseValidWeek(rawWeek);
    if (validWeek !== null) {
      result.currentWeek = validWeek;
    }

    const rawTab = params.get('tab') ?? params.get('activeWorkspaceTab');
    const validTab = parseValidWorkspaceTab(rawTab);
    if (validTab) {
      result.activeWorkspaceTab = validTab;
    }

    return result;
  } catch {
    return {};
  }
}

/**
 * Resolves the complete initial scenario state by applying the strict precedence chain:
 *   Valid URL Query Parameter > Valid LocalStorage Value > Canonical Preset Default
 */
export function resolveInitialScenarioState(options?: {
  search?: string;
  storage?: Pick<Storage, 'getItem'> | null;
}): PersistedScenarioState {
  const defaultPreset = PRESETS[0]!;
  const fromStorage = readPersistedScenarioFromStorage(options?.storage);
  const fromUrl = readScenarioFromUrlSearch(options?.search);

  const activePresetId =
    fromUrl.activePresetId ?? fromStorage.activePresetId ?? defaultPreset.id;
  const activePreset = PRESET_BY_ID.get(activePresetId) ?? defaultPreset;

  // If the URL explicitly selects a DIFFERENT preset than localStorage, start parameter
  // and node defaults from the URL preset rather than mixing another preset's stored params.
  const urlChangedPreset =
    fromUrl.activePresetId !== undefined &&
    fromStorage.activePresetId !== undefined &&
    fromUrl.activePresetId !== fromStorage.activePresetId;

  const baseParams: Partial<ScenarioParameters> = {
    ...activePreset.defaultParams,
    ...(urlChangedPreset ? {} : fromStorage.scenarioParams),
    ...fromUrl.scenarioParams,
  };

  const scenarioParams = normalizeScenarioParameters(
    baseParams,
    activePreset.defaultParams,
  );

  const defaultOriginNodeId =
    activePreset.shockOriginNodeIds[0] ?? 'chk_hormuz';
  const selectedNodeId =
    fromUrl.selectedNodeId ??
    (urlChangedPreset ? undefined : fromStorage.selectedNodeId) ??
    defaultOriginNodeId;

  const currentWeek = normalizeWeekIndex(
    fromUrl.currentWeek ?? fromStorage.currentWeek ?? DEFAULT_INITIAL_WEEK,
    DEFAULT_INITIAL_WEEK,
  );

  const activeWorkspaceTab: WorkspaceTab =
    fromUrl.activeWorkspaceTab ?? fromStorage.activeWorkspaceTab ?? 'overview';

  return {
    activePresetId: activePreset.id,
    scenarioParams,
    selectedNodeId: NODE_BY_ID.has(selectedNodeId)
      ? selectedNodeId
      : defaultOriginNodeId,
    currentWeek,
    activeWorkspaceTab,
  };
}

/**
 * Sanitizes and validates a PersistedScenarioState object against all domain bounds.
 */
export function sanitizePersistedScenarioState(
  state: PersistedScenarioState,
): PersistedScenarioState {
  const defaultPreset = PRESETS[0]!;
  const preset =
    PRESET_BY_ID.get(state.activePresetId) ?? defaultPreset;
  const scenarioParams = normalizeScenarioParameters(
    state.scenarioParams,
    preset.defaultParams,
  );
  const defaultOrigin = preset.shockOriginNodeIds[0] ?? 'chk_hormuz';
  const selectedNodeId = NODE_BY_ID.has(state.selectedNodeId)
    ? state.selectedNodeId
    : defaultOrigin;
  const currentWeek = normalizeWeekIndex(
    state.currentWeek,
    DEFAULT_INITIAL_WEEK,
  );
  const activeWorkspaceTab = VALID_WORKSPACE_TABS.includes(
    state.activeWorkspaceTab,
  )
    ? state.activeWorkspaceTab
    : 'overview';

  return {
    activePresetId: preset.id,
    scenarioParams,
    selectedNodeId,
    currentWeek,
    activeWorkspaceTab,
  };
}

/**
 * Persists the current scenario state to localStorage safely.
 * Returns true if saved, false if storage is inaccessible or quota-limited.
 */
export function writePersistedScenarioToStorage(
  state: PersistedScenarioState,
  storage?: Pick<Storage, 'setItem'> | null,
): boolean {
  const targetStorage =
    storage !== undefined
      ? storage
      : typeof window !== 'undefined'
        ? (() => {
            try {
              return window.localStorage;
            } catch {
              return null;
            }
          })()
        : null;

  if (!targetStorage) return false;

  try {
    const clean = sanitizePersistedScenarioState(state);
    const payload = {
      schemaVersion: SCENARIO_SNAPSHOT_SCHEMA_VERSION,
      ...clean,
    };
    targetStorage.setItem(SCENARIO_STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

/**
 * Builds a compact, deterministic query string representing the complete scenario state.
 */
export function buildScenarioQueryString(
  state: PersistedScenarioState,
): string {
  const clean = sanitizePersistedScenarioState(state);
  const params = new URLSearchParams();
  params.set('preset', clean.activePresetId);
  params.set('sev', Number(clean.scenarioParams.shockSeverityPct.toFixed(4)).toString());
  params.set('dur', Math.round(clean.scenarioParams.durationDays).toString());
  params.set('inv', Number(clean.scenarioParams.inventoryBufferScale.toFixed(4)).toString());
  params.set('reroute', Number(clean.scenarioParams.rerouteCapacityShare.toFixed(4)).toString());
  params.set('sub', Number(clean.scenarioParams.substitutionFlexibility.toFixed(4)).toString());
  params.set('ship', Number(clean.scenarioParams.shippingCostMultiplier.toFixed(4)).toString());
  params.set('node', clean.selectedNodeId);
  params.set('week', clean.currentWeek.toString());
  params.set('tab', clean.activeWorkspaceTab);
  return `?${params.toString()}`;
}

/**
 * Builds a full shareable URL that reproduces the active workspace state.
 */
export function buildShareableScenarioUrl(
  state: PersistedScenarioState,
  currentHref?: string,
): string {
  const query = buildScenarioQueryString(state);
  const baseHref =
    currentHref ??
    (typeof window !== 'undefined'
      ? window.location.href
      : 'http://localhost:5173/');

  try {
    const url = new URL(baseHref, 'http://localhost:5173');
    url.search = query;
    return url.toString();
  } catch {
    return query;
  }
}

/**
 * Synchronizes the browser URL bar in-place via history.replaceState without reloading
 * or creating duplicate history entries when the query string has not changed.
 */
export function syncScenarioStateToBrowserUrl(
  state: PersistedScenarioState,
): boolean {
  if (typeof window === 'undefined' || !window.history?.replaceState) {
    return false;
  }
  try {
    const nextSearch = buildScenarioQueryString(state);
    if (window.location.search === nextSearch) {
      return false;
    }
    const nextUrl = `${window.location.pathname}${nextSearch}${window.location.hash}`;
    window.history.replaceState(null, '', nextUrl);
    return true;
  } catch {
    return false;
  }
}

/**
 * Creates a schema-validated JSON snapshot object for download/export.
 */
export function createScenarioSnapshotExport(
  state: PersistedScenarioState,
  exportedAtIso?: string,
): ScenarioSnapshotExport {
  const clean = sanitizePersistedScenarioState(state);
  const candidate: ScenarioSnapshotExport = {
    schemaVersion: SCENARIO_SNAPSHOT_SCHEMA_VERSION,
    exportedAt: exportedAtIso ?? new Date().toISOString(),
    activePresetId: clean.activePresetId,
    scenarioParams: clean.scenarioParams,
    selectedNodeId: clean.selectedNodeId,
    currentWeek: clean.currentWeek,
    activeWorkspaceTab: clean.activeWorkspaceTab,
  };
  return ScenarioSnapshotExportSchema.parse(candidate);
}
