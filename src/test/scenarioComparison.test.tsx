import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../App';
import { PRESET_BY_ID, PRESETS } from '../data';
import { compareScenarios } from '../engine/compareScenarios';

describe('Milestone 5C — Pure Scenario Comparison Engine & Counterfactual Workbench', () => {
  const hormuzPreset = PRESET_BY_ID.get('preset_hormuz_energy') ?? PRESETS[0]!;
  const taiwanPreset = PRESET_BY_ID.get('preset_taiwan_semi') ?? PRESETS[1]!;

  it('produces exact zero deltas across all 48 nodes and 27 weeks when Scenario A and Scenario B are identical', () => {
    const report = compareScenarios(
      {
        label: 'Scenario A (Baseline)',
        preset: hormuzPreset,
        params: hormuzPreset.defaultParams,
      },
      {
        label: 'Scenario B (Identical)',
        preset: hormuzPreset,
        params: { ...hormuzPreset.defaultParams },
      },
      6,
    );

    expect(report.isSamePreset).toBe(true);
    expect(report.isIdenticalConfiguration).toBe(true);
    expect(report.parameterDiffs.every((d) => d.delta === 0)).toBe(true);
    expect(report.networkSummary.peakNetworkReiDelta).toBe(0);
    expect(report.networkSummary.meanNetworkReiDelta).toBe(0);
    expect(report.networkSummary.currentWeekSeverelyExposedDelta).toBe(0);
    expect(report.orderedNodeComparisons).toHaveLength(48);

    for (const nodeComp of report.orderedNodeComparisons) {
      expect(nodeComp.peakReiDelta).toBe(0);
      expect(nodeComp.cumulativeReiWeeksDelta).toBe(0);
      expect(nodeComp.meanReiDelta).toBe(0);
      expect(nodeComp.currentWeekReiDelta).toBe(0);
      expect(nodeComp.currentWeekCpiDelta).toBe(0);
      expect(nodeComp.currentWeekInventoryDaysDelta).toBe(0);
      expect(nodeComp.weeklySeries).toHaveLength(27);
      for (const pt of nodeComp.weeklySeries) {
        expect(pt.reiDelta).toBe(0);
        expect(pt.cpiDelta).toBe(0);
        expect(pt.inventoryDaysDelta).toBe(0);
      }
    }
  });

  it('monotonicity of mitigation counterfactuals: higher inventory buffering, rerouting, and substitution reduce cumulative exposure', () => {
    const baseParams = {
      ...hormuzPreset.defaultParams,
      inventoryBufferScale: 1.0,
    };

    // 1. Increased Inventory Buffering (1.0x -> 1.8x)
    const invReport = compareScenarios(
      { label: 'Baseline 1.0x', preset: hormuzPreset, params: baseParams },
      {
        label: 'Buffered 1.8x',
        preset: hormuzPreset,
        params: { ...baseParams, inventoryBufferScale: 1.8 },
      },
      6,
    );

    expect(invReport.networkSummary.meanNetworkReiDelta).toBeLessThan(0);
    const groceriesInv = invReport.nodeComparisons['con_groceries'];
    expect(groceriesInv).toBeDefined();
    expect(groceriesInv!.cumulativeReiWeeksDelta).toBeLessThan(0);
    expect(groceriesInv!.peakReiDelta).toBeLessThanOrEqual(0);

    // 2. Increased Rerouting Capacity (baseline -> 0.80)
    const rerouteReport = compareScenarios(
      { label: 'Baseline Reroute', preset: hormuzPreset, params: baseParams },
      {
        label: '80% Reroute',
        preset: hormuzPreset,
        params: { ...baseParams, rerouteCapacityShare: 0.8 },
      },
      6,
    );

    expect(rerouteReport.networkSummary.meanNetworkReiDelta).toBeLessThan(0);
    const crudeNodeReroute = rerouteReport.nodeComparisons['com_crude'];
    expect(crudeNodeReroute).toBeDefined();
    expect(crudeNodeReroute!.cumulativeReiWeeksDelta).toBeLessThan(0);

    // 3. Increased Substitution Flexibility (baseline -> 0.75)
    const subReport = compareScenarios(
      {
        label: 'Baseline Substitution',
        preset: hormuzPreset,
        params: baseParams,
      },
      {
        label: '75% Substitution',
        preset: hormuzPreset,
        params: { ...baseParams, substitutionFlexibility: 0.75 },
      },
      6,
    );

    expect(subReport.networkSummary.meanNetworkReiDelta).toBeLessThan(0);
    expect(
      subReport.nodeComparisons['con_groceries']!.cumulativeReiWeeksDelta,
    ).toBeLessThan(0);
  });

  it('computes onset, recovery week, and unexposed node flags accurately across short vs. prolonged shocks', () => {
    const report = compareScenarios(
      {
        label: 'Short 21d Shock',
        preset: taiwanPreset,
        params: {
          ...taiwanPreset.defaultParams,
          shockSeverityPct: 0.65,
          durationDays: 21,
        },
      },
      {
        label: 'Severe 175d Shock',
        preset: taiwanPreset,
        params: {
          ...taiwanPreset.defaultParams,
          shockSeverityPct: 0.95,
          durationDays: 175,
        },
      },
      10,
    );

    // Unreachable chokepoint node (chk_hormuz under Taiwan shock) is flagged neverDisrupted
    const hormuzComp = report.nodeComparisons['chk_hormuz']!;
    expect(hormuzComp.neverDisruptedA).toBe(true);
    expect(hormuzComp.firstOnsetWeekA).toBeNull();
    expect(hormuzComp.recoveryWeekA).toBeNull();

    // Origin node (chk_taiwan_fabs) recovers within 26 weeks under 21-day shock,
    // but remains unrecovered (recoveryWeekB === null) under 175-day (25-week) shock
    const taiwanOriginComp = report.nodeComparisons['chk_taiwan_fabs']!;
    expect(taiwanOriginComp.neverDisruptedA).toBe(false);
    expect(taiwanOriginComp.recoveryWeekA).not.toBeNull();
    expect(taiwanOriginComp.recoveryWeekB).toBeNull();
    expect(taiwanOriginComp.cumulativeReiWeeksDelta).toBeGreaterThan(0);
  });

  it('renders ScenarioComparisonView, switches all 4 templates, supports zero-delta check, and preserves main workspace parameter isolation', () => {
    render(<App />);

    // Navigate to Scenario Comparison tab
    const nav = screen.getByRole('navigation', {
      name: /Primary Workbench Views/i,
    });
    const compareTabBtn = within(nav).getByRole('button', {
      name: /Scenario Comparison/i,
    });
    fireEvent.click(compareTabBtn);

    const compView = screen.getByTestId('scenario-comparison-view');
    expect(compView).toBeInTheDocument();

    // Verify all 4 one-click templates are rendered and clickable
    const tpl1 = screen.getByTestId('template-preset_vs_working');
    const tpl2 = screen.getByTestId('template-inventory_buffering');
    const tpl3 = screen.getByTestId('template-rerouting_capacity');
    const tpl4 = screen.getByTestId('template-substitution_flexibility');

    fireEvent.click(tpl3);
    expect(
      screen.getByTestId('param-diff-rerouteCapacityShare'),
    ).toHaveTextContent('+58% pts');

    fireEvent.click(tpl4);
    expect(
      screen.getByTestId('param-diff-substitutionFlexibility'),
    ).toHaveTextContent('+50% pts');

    fireEvent.click(tpl2);
    expect(
      screen.getByTestId('param-diff-inventoryBufferScale'),
    ).toHaveTextContent('+0.80×');

    // Click "Set B = A (Zero-Delta Check)" and verify identical badge
    fireEvent.click(screen.getByTestId('comparison-match-b-to-a-btn'));
    expect(
      screen.getByTestId('identical-scenario-badge'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('network-peak-rei-delta')).toHaveTextContent(
      '0.0 pts',
    );

    // Modify Scenario B Shock Severity slider inside the comparison sandbox
    const sliderB = screen.getByTestId('param-b-shockSeverityPct');
    fireEvent.change(sliderB, { target: { value: '0.95' } });
    expect(
      screen.getByTestId('param-diff-shockSeverityPct'),
    ).toHaveTextContent('+35% pts');

    // Verify main workspace ScenarioSelectorBar parameter was NOT mutated by Scenario B edits
    // Template 1 compares Preset Default (60%) against Live Workspace (still 60%)
    fireEvent.click(tpl1);
    expect(
      screen.getByTestId('identical-scenario-badge'),
    ).toBeInTheDocument();

    // Clicking a row in the 48-node comparison table updates selectedNode across the app
    const groceriesRow = screen.getByTestId('comparison-row-con_groceries');
    fireEvent.click(groceriesRow);
    expect(groceriesRow).toHaveAttribute('aria-selected', 'true');
  });
});
