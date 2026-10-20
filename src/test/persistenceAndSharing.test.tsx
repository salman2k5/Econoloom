import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from '../App';
import { PRESETS } from '../data';
import {
  buildShareableScenarioUrl,
  createScenarioSnapshotExport,
  resolveInitialScenarioState,
  SCENARIO_SNAPSHOT_SCHEMA_VERSION,
  SCENARIO_STORAGE_KEY,
  ScenarioSnapshotExportSchema,
  syncScenarioStateToBrowserUrl,
  writePersistedScenarioToStorage,
} from '../state/scenarioPersistence';

describe('Milestone 6 — Schema-Validated Persistence, Shareable URLs & Snapshot Export', () => {
  it('1. Valid persisted state restoration: restores preset, parameters, node, week, and tab from localStorage across reload', () => {
    const savedState = {
      schemaVersion: SCENARIO_SNAPSHOT_SCHEMA_VERSION,
      activePresetId: 'preset_taiwan_semi',
      scenarioParams: {
        shockSeverityPct: 0.75,
        durationDays: 112,
        inventoryBufferScale: 1.5,
        rerouteCapacityShare: 0.4,
        substitutionFlexibility: 0.35,
        shippingCostMultiplier: 2.6,
      },
      selectedNodeId: 'ind_automotive',
      currentWeek: 14,
      activeWorkspaceTab: 'pathway_explorer' as const,
    };

    window.localStorage.setItem(SCENARIO_STORAGE_KEY, JSON.stringify(savedState));

    render(<App />);

    // Confirm active preset is Taiwan Semiconductor
    const presetBtn = screen.getByRole('button', {
      name: /Taiwan Semiconductor Foundry/i,
    });
    expect(presetBtn).toHaveAttribute('aria-pressed', 'true');

    // Confirm Shock Severity numeric input shows 75% and Duration shows 112d
    const sevInput = screen.getByRole('spinbutton', {
      name: /Shock Severity numeric input/i,
    }) as HTMLInputElement;
    expect(sevInput.value).toBe('75');

    const durInput = screen.getByRole('spinbutton', {
      name: /Disruption Duration numeric input/i,
    }) as HTMLInputElement;
    expect(durInput.value).toBe('112');

    // Confirm timeline week restored to Week 14
    const weekScrubber = screen.getByRole('slider', {
      name: /Simulation week scrubber/i,
    }) as HTMLInputElement;
    expect(weekScrubber.value).toBe('14');

    // Confirm active workspace tab is Impact Pathway Explorer
    const nav = screen.getByRole('navigation', {
      name: /Primary Workbench Views/i,
    });
    const pathwayTab = within(nav).getByRole('button', {
      name: /Impact Pathway Explorer/i,
    });
    expect(pathwayTab).toHaveAttribute('aria-current', 'page');

    // Confirm selected node in Pathway Explorer is Automotive Manufacturing (ind_automotive)
    const targetSelect = screen.getByTestId(
      'pathway-target-select',
    ) as HTMLSelectElement;
    expect(targetSelect.value).toBe('ind_automotive');
  });

  it('2. Malformed or outdated storage: gracefully falls back without crashing or discarding sibling valid fields', () => {
    // Case A: Completely corrupted JSON string
    window.localStorage.setItem(SCENARIO_STORAGE_KEY, '{corrupted_json: true');
    const fallbackFromCorrupt = resolveInitialScenarioState();
    expect(fallbackFromCorrupt.activePresetId).toBe(PRESETS[0]!.id);
    expect(fallbackFromCorrupt.currentWeek).toBe(8);
    expect(fallbackFromCorrupt.activeWorkspaceTab).toBe('overview');

    // Case B: Partially malformed object (unknown preset, invalid week, one NaN parameter, but valid node and valid durationDays)
    window.localStorage.setItem(
      SCENARIO_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 'econoloom.outdated.v0',
        activePresetId: 'unknown_preset_xyz',
        scenarioParams: {
          shockSeverityPct: 'not-a-number',
          durationDays: 126,
          inventoryBufferScale: 1.7,
        },
        selectedNodeId: 'con_groceries',
        currentWeek: 'invalid_week',
        activeWorkspaceTab: 'non_existent_tab',
      }),
    );

    const partialRecovery = resolveInitialScenarioState();
    // Invalid preset falls back to default preset (Hormuz)
    expect(partialRecovery.activePresetId).toBe('preset_hormuz_energy');
    // Invalid shockSeverityPct falls back to Hormuz default (0.6), while valid sibling fields (126d, 1.7x) are preserved!
    expect(partialRecovery.scenarioParams.shockSeverityPct).toBe(0.6);
    expect(partialRecovery.scenarioParams.durationDays).toBe(126);
    expect(partialRecovery.scenarioParams.inventoryBufferScale).toBe(1.7);
    // Valid selectedNodeId is preserved
    expect(partialRecovery.selectedNodeId).toBe('con_groceries');
    // Invalid week & tab fall back to defaults
    expect(partialRecovery.currentWeek).toBe(8);
    expect(partialRecovery.activeWorkspaceTab).toBe('overview');
  });

  it('3. Valid URL state overrides localStorage state according to documented precedence', () => {
    // Save Panama preset & Week 5 in localStorage
    window.localStorage.setItem(
      SCENARIO_STORAGE_KEY,
      JSON.stringify({
        activePresetId: 'preset_panama_canal',
        scenarioParams: {
          shockSeverityPct: 0.45,
          durationDays: 63,
          inventoryBufferScale: 1.0,
          rerouteCapacityShare: 0.3,
          substitutionFlexibility: 0.25,
          shippingCostMultiplier: 1.9,
        },
        selectedNodeId: 'chk_panama',
        currentWeek: 5,
        activeWorkspaceTab: 'overview',
      }),
    );

    // URL specifies Taiwan preset, Week 19, node con_vehicles, and scenario_comparison tab
    window.history.replaceState(
      null,
      '',
      '/?preset=preset_taiwan_semi&sev=0.85&dur=140&node=con_vehicles&week=19&tab=scenario_comparison',
    );

    const resolved = resolveInitialScenarioState();
    expect(resolved.activePresetId).toBe('preset_taiwan_semi');
    expect(resolved.scenarioParams.shockSeverityPct).toBe(0.85);
    expect(resolved.scenarioParams.durationDays).toBe(140);
    expect(resolved.selectedNodeId).toBe('con_vehicles');
    expect(resolved.currentWeek).toBe(19);
    expect(resolved.activeWorkspaceTab).toBe('scenario_comparison');
  });

  it('4 & 5. Invalid query parameters fall back safely while out-of-range parameters and weeks are clamped to domain bounds', () => {
    // Store valid baseline in localStorage
    window.localStorage.setItem(
      SCENARIO_STORAGE_KEY,
      JSON.stringify({
        activePresetId: 'preset_hormuz_energy',
        selectedNodeId: 'com_crude',
        currentWeek: 11,
        activeWorkspaceTab: 'pathway_explorer',
      }),
    );

    // URL has invalid preset, invalid node, invalid tab, but extreme numeric bounds for sev, dur, inv, ship, and week
    const resolved = resolveInitialScenarioState({
      search:
        '?preset=bogus&node=bogus_node&tab=bogus_tab&sev=9.99&dur=999&inv=0.05&reroute=-0.5&sub=4.2&ship=99.0&week=88',
    });

    // Invalid URL preset, node, and tab fall back to valid localStorage values
    expect(resolved.activePresetId).toBe('preset_hormuz_energy');
    expect(resolved.selectedNodeId).toBe('com_crude');
    expect(resolved.activeWorkspaceTab).toBe('pathway_explorer');

    // Out-of-bounds numeric query params are clamped strictly to SCENARIO_PARAMETER_BOUNDS and [0, 26]
    expect(resolved.scenarioParams.shockSeverityPct).toBe(1.0);
    expect(resolved.scenarioParams.durationDays).toBe(180);
    expect(resolved.scenarioParams.inventoryBufferScale).toBe(0.5);
    expect(resolved.scenarioParams.rerouteCapacityShare).toBe(0.0);
    expect(resolved.scenarioParams.substitutionFlexibility).toBe(1.0);
    expect(resolved.scenarioParams.shippingCostMultiplier).toBe(4.0);
    expect(resolved.currentWeek).toBe(26);
  });

  it('6. URL updates via history.replaceState without reloading or creating duplicate calls when state is unchanged', () => {
    const replaceSpy = vi.spyOn(window.history, 'replaceState');

    const sampleState = resolveInitialScenarioState();
    const firstUpdated = syncScenarioStateToBrowserUrl(sampleState);
    expect(firstUpdated).toBe(true);
    expect(replaceSpy).toHaveBeenCalledTimes(1);

    // Calling sync again with the exact same state does not call replaceState a second time
    const secondUpdated = syncScenarioStateToBrowserUrl(sampleState);
    expect(secondUpdated).toBe(false);
    expect(replaceSpy).toHaveBeenCalledTimes(1);

    replaceSpy.mockRestore();
  });

  it('7. Shareable links restore the exact scenario, parameters, selected node, week, and workspace tab when loaded', async () => {
    const customState = {
      activePresetId: 'preset_panama_canal',
      scenarioParams: {
        shockSeverityPct: 0.7,
        durationDays: 105,
        inventoryBufferScale: 1.6,
        rerouteCapacityShare: 0.55,
        substitutionFlexibility: 0.45,
        shippingCostMultiplier: 2.4,
      },
      selectedNodeId: 'com_lng',
      currentWeek: 16,
      activeWorkspaceTab: 'pathway_explorer' as const,
    };

    const shareUrl = buildShareableScenarioUrl(
      customState,
      'http://localhost:5173/',
    );
    const parsedUrl = new URL(shareUrl);

    // Simulate opening the shareable link in a fresh browser session (empty localStorage)
    window.localStorage.clear();
    window.history.replaceState(null, '', parsedUrl.search);

    render(<App />);

    expect(
      screen.getByRole('button', {
        name: /Panama Canal Hydrological Draft/i,
      }),
    ).toHaveAttribute('aria-pressed', 'true');

    const sevInput = screen.getByRole('spinbutton', {
      name: /Shock Severity numeric input/i,
    }) as HTMLInputElement;
    expect(sevInput.value).toBe('70');

    const weekScrubber = screen.getByRole('slider', {
      name: /Simulation week scrubber/i,
    }) as HTMLInputElement;
    expect(weekScrubber.value).toBe('16');

    const targetSelect = screen.getByTestId(
      'pathway-target-select',
    ) as HTMLSelectElement;
    expect(targetSelect.value).toBe('com_lng');
  });

  it('8. JSON snapshot export conforms strictly to ScenarioSnapshotExportSchema with no extraneous or private fields', () => {
    const state = {
      activePresetId: 'preset_hormuz_energy',
      scenarioParams: {
        shockSeverityPct: 0.65,
        durationDays: 98,
        inventoryBufferScale: 1.2,
        rerouteCapacityShare: 0.3,
        substitutionFlexibility: 0.4,
        shippingCostMultiplier: 2.5,
      },
      selectedNodeId: 'con_groceries',
      currentWeek: 12,
      activeWorkspaceTab: 'scenario_comparison' as const,
    };

    const snapshot = createScenarioSnapshotExport(
      state,
      '2026-10-20T03:45:00.000Z',
    );

    const parsed = ScenarioSnapshotExportSchema.safeParse(snapshot);
    expect(parsed.success).toBe(true);
    expect(Object.keys(snapshot).sort()).toEqual(
      [
        'activePresetId',
        'activeWorkspaceTab',
        'currentWeek',
        'exportedAt',
        'schemaVersion',
        'scenarioParams',
        'selectedNodeId',
      ].sort(),
    );
    expect(snapshot.schemaVersion).toBe('econoloom.scenario_snapshot.v1');
    expect(snapshot.exportedAt).toBe('2026-10-20T03:45:00.000Z');
  });

  it('9. Handles inaccessible localStorage and clipboard/export failures gracefully with clear user feedback', async () => {
    // Simulate throwing storage
    const brokenStorage = {
      getItem: () => {
        throw new Error('SecurityError: storage disabled');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };

    expect(() =>
      resolveInitialScenarioState({ storage: brokenStorage }),
    ).not.toThrow();
    expect(
      writePersistedScenarioToStorage(
        resolveInitialScenarioState({ storage: brokenStorage }),
        brokenStorage,
      ),
    ).toBe(false);

    // Render App and test Copy Share Link both when clipboard succeeds and when it fails
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });

    render(<App />);

    const copyBtn = screen.getByTestId('copy-share-link-btn');
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(
        screen.getByTestId('scenario-action-feedback'),
      ).toHaveTextContent(/Shareable scenario link copied to clipboard/i);
    });
    expect(writeTextMock).toHaveBeenCalledTimes(1);
    expect(writeTextMock.mock.calls[0]?.[0]).toContain('preset=preset_hormuz_energy');

    // Now simulate clipboard failure
    writeTextMock.mockRejectedValueOnce(new Error('Clipboard permission denied'));
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(
        screen.getByTestId('scenario-action-feedback'),
      ).toHaveTextContent(/Could not access clipboard/i);
    });
  });
});
