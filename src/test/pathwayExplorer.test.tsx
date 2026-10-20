import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../App';
import { ImpactPathwayExplorer } from '../components/pathway/ImpactPathwayExplorer';
import { ScenarioStoreProvider } from '../state/useScenarioStore';
import type { PathwayAnalysisReport } from '../types/simulation';

describe('Milestone 5B: Interactive Impact Pathway Explorer & Synchronization', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('1. renders the Impact Pathway Explorer by default for the flagship Hormuz preset and exposed downstream targets', () => {
    render(<App />);

    const explorer = screen.getByTestId('impact-pathway-explorer');
    expect(explorer).toBeInTheDocument();

    // Target select starts on the preset origin (chk_hormuz) and can switch to Household Groceries (con_groceries)
    const targetSelect = screen.getByTestId(
      'pathway-target-select',
    ) as HTMLSelectElement;
    expect(targetSelect.value).toBe('chk_hormuz');

    fireEvent.change(targetSelect, { target: { value: 'con_groceries' } });
    expect(targetSelect.value).toBe('con_groceries');

    // Displays ranked pathway cards (up to 5)
    const rankCard0 = screen.getByTestId('pathway-rank-card-0');
    expect(rankCard0).toBeInTheDocument();
    expect(rankCard0).toHaveAttribute('aria-pressed', 'true');

    // Displays hop-by-hop chain, primary bottleneck callout, and methodology note
    expect(screen.getByTestId('pathway-hop-chain')).toBeInTheDocument();
    expect(screen.getByTestId('pathway-bottleneck-callout')).toBeInTheDocument();
    expect(screen.getByTestId('pathway-methodology-note')).toBeInTheDocument();
  });

  it('2. switching target nodes updates ranked pathways, hop details, and synchronizes with the node inspector and dependency graph', () => {
    render(<App />);

    const targetSelect = screen.getByTestId(
      'pathway-target-select',
    ) as HTMLSelectElement;

    // Switch target node to Nitrogen & Phosphate Fertilizers (ind_fertilizer)
    fireEvent.change(targetSelect, { target: { value: 'ind_fertilizer' } });

    expect(targetSelect.value).toBe('ind_fertilizer');

    // Hop chain should now include Nitrogen & Phosphate Fertilizers step node card
    expect(
      screen.getByTestId('pathway-step-node-ind_fertilizer'),
    ).toBeInTheDocument();

    // Inspector and dependency graph should both reflect ind_fertilizer as selected
    const inspector = screen.getByLabelText(
      'Selected Node Baseline & Provenance Inspector',
    );
    expect(
      within(inspector).getByRole('heading', {
        name: /Fertilizer/i,
      }),
    ).toBeInTheDocument();

    const graphNode = screen.getByTestId('graph-node-ind_fertilizer');
    expect(graphNode).toHaveAttribute('data-selected', 'true');
  });

  it('3. selecting a different ranked pathway updates the active hop chain and switches active vs alternate pathway highlighting in the dependency graph', () => {
    render(<App />);

    const targetSelect = screen.getByTestId(
      'pathway-target-select',
    ) as HTMLSelectElement;
    fireEvent.change(targetSelect, { target: { value: 'con_groceries' } });

    const rankCard0 = screen.getByTestId('pathway-rank-card-0');
    const rankCard1 = screen.getByTestId('pathway-rank-card-1');

    expect(rankCard0).toHaveAttribute('aria-pressed', 'true');
    expect(rankCard1).toHaveAttribute('aria-pressed', 'false');

    // Capture active pathway edges before switching
    const edgesLayer = screen.getByTestId('graph-edges-layer');
    const initialActiveEdges = Array.from(
      edgesLayer.querySelectorAll('[data-active-pathway="true"]'),
    ).map((el) => el.getAttribute('data-testid'));
    expect(initialActiveEdges.length).toBeGreaterThan(0);

    // Click rank card #2 (index 1)
    fireEvent.click(rankCard1);

    expect(rankCard1).toHaveAttribute('aria-pressed', 'true');
    expect(rankCard0).toHaveAttribute('aria-pressed', 'false');

    // Graph active pathway edges should update to reflect pathway #2
    const updatedActiveEdges = Array.from(
      edgesLayer.querySelectorAll('[data-active-pathway="true"]'),
    ).map((el) => el.getAttribute('data-testid'));
    expect(updatedActiveEdges.length).toBeGreaterThan(0);
    expect(updatedActiveEdges).not.toEqual(initialActiveEdges);

    // Alternate pathways should be marked with data-alternate-pathway="true"
    const alternateEdges = Array.from(
      edgesLayer.querySelectorAll('[data-alternate-pathway="true"]'),
    );
    expect(alternateEdges.length).toBeGreaterThan(0);
  });

  it('4. clicking a node or edge inside a pathway step updates the shared selection and inspector state', () => {
    render(<App />);

    const targetSelect = screen.getByTestId(
      'pathway-target-select',
    ) as HTMLSelectElement;
    // Select Petroleum Refining (ind_refining), whose top path from chk_hormuz traverses com_crude via e_02
    fireEvent.change(targetSelect, { target: { value: 'ind_refining' } });

    const edgeStepCard = screen.getByTestId('pathway-step-edge-e_02');
    fireEvent.click(edgeStepCard);

    // Clicking the edge step card selects the edge in the store, opening graph-edge-inspector
    const edgeInspector = screen.getByTestId('graph-edge-inspector');
    expect(edgeInspector).toHaveTextContent('e_02');

    // Clicking an intermediate node step button (com_crude) selects that node across the app
    const nodeStepButton = screen.getByTestId(
      'pathway-select-node-btn-com_crude',
    );
    fireEvent.click(nodeStepButton);

    expect(targetSelect.value).toBe('com_crude');
  });

  it('5. scrubbing or changing the simulation week updates hop-level transmitted disruption and exposure values', () => {
    render(<App />);

    const targetSelect = screen.getByTestId(
      'pathway-target-select',
    ) as HTMLSelectElement;
    fireEvent.change(targetSelect, { target: { value: 'con_groceries' } });

    // Scrub timeline to Week 1 (early shock before downstream lags arrive at con_groceries)
    const weekScrubber = screen.getByLabelText('Simulation week scrubber');
    fireEvent.change(weekScrubber, { target: { value: '1' } });

    const groceriesStepW1 = screen.getByTestId(
      'pathway-step-node-con_groceries',
    );
    expect(groceriesStepW1.textContent).toContain('In Transit');

    // Scrub timeline to Week 10 (after downstream lags have arrived)
    fireEvent.change(weekScrubber, { target: { value: '10' } });

    const groceriesStepW10 = screen.getByTestId(
      'pathway-step-node-con_groceries',
    );
    expect(groceriesStepW10.textContent).not.toContain('In Transit');
  });

  it('6. zero-shock state shows structural pathway connectivity with zero active disruption', () => {
    render(<App />);

    const targetSelect = screen.getByTestId(
      'pathway-target-select',
    ) as HTMLSelectElement;
    fireEvent.change(targetSelect, { target: { value: 'con_groceries' } });

    // Click Zero Shock (0%) button in the scenario control bar
    const zeroShockBtn = screen.getByRole('button', {
      name: /Zero Shock \(0%\)/i,
    });
    fireEvent.click(zeroShockBtn);

    const zeroShockBanner = screen.getByTestId('pathway-zero-shock-banner');
    expect(zeroShockBanner).toBeInTheDocument();
    expect(zeroShockBanner).toHaveTextContent(
      /Zero-Shock Baseline Active/i,
    );

    // Structural pathways remain visible with 0.0 score
    const rankCard0 = screen.getByTestId('pathway-rank-card-0');
    expect(rankCard0).toHaveTextContent('0.0 pts');
    expect(screen.getByTestId('pathway-hop-chain')).toBeInTheDocument();
  });

  it('7. unreachable target node state shows a clear structural independence explanation and recovery actions without crashing', () => {
    render(<App />);

    const targetSelect = screen.getByTestId(
      'pathway-target-select',
    ) as HTMLSelectElement;

    // Select Persian Gulf Hub (geo_gulf, which is upstream of chk_hormuz) while in Hormuz preset
    fireEvent.change(targetSelect, { target: { value: 'geo_gulf' } });

    const unreachableState = screen.getByTestId('pathway-unreachable-state');
    expect(unreachableState).toBeInTheDocument();
    expect(unreachableState).toHaveTextContent(
      /No Directed Causal Pathway Connects Active Shock Origin/i,
    );
  });

  it('8 & 9. displays ordinary truncation disclosure (truncatedPathCount > 0) and stronger search-limit disclosure (searchLimitReached)', () => {
    const baseReport: PathwayAnalysisReport = {
      targetNodeId: 'con_groceries',
      week: 6,
      reachabilityStatus: 'reachable',
      reachabilityReason: 'Reachable with active transmitted exposure.',
      totalDiscoveredPaths: 7,
      truncatedPathCount: 6,
      searchLimitReached: false,
      pathways: [
        {
          targetNodeId: 'con_groceries',
          week: 6,
          pathScore: 42.5,
          totalLagWeeks: 4,
          bottleneckNodeId: 'geo_persian_gulf',
          bottleneckEdgeId: 'edge_hormuz_gulf_oil',
          bottleneckSummary:
            'Strait of Hormuz -> Persian Gulf Oil & Gas Export Hub',
          narrativeSummary: 'Strait of Hormuz -> Household Groceries.',
          steps: [
            {
              nodeId: 'chk_hormuz',
              nodeName: 'Strait of Hormuz',
              reiAtWeek: 75.2,
              targetRei: 75.2,
              cpiAtWeek: 60.0,
              severityBand: 'Severe',
              lagWeeksFromOrigin: 0,
              cumulativeLagWeeks: 0,
              sourceInventoryDays: 5,
              targetInventoryDays: 5,
              edgeActiveBypassShare: 0,
              classification: 'observed',
              confidence: 'high',
            },
            {
              nodeId: 'con_groceries',
              nodeName: 'Household Groceries & Staples',
              edgeId: 'edge_hormuz_gulf_oil',
              dependencyWeight: 0.65,
              inputCriticality: 0.9,
              reiAtWeek: 28.4,
              targetRei: 28.4,
              cpiAtWeek: 24.1,
              severityBand: 'Moderate',
              lagWeeksFromOrigin: 4,
              cumulativeLagWeeks: 4,
              sourceInventoryDays: 5,
              targetInventoryDays: 18,
              edgeActiveBypassShare: 0,
              classification: 'observed',
              confidence: 'high',
            },
          ],
        },
      ],
    };

    const { rerender } = render(
      <ScenarioStoreProvider>
        <ImpactPathwayExplorer reportOverride={baseReport} />
      </ScenarioStoreProvider>,
    );

    const truncationBanner = screen.getByTestId('pathway-truncation-banner');
    expect(truncationBanner).toHaveTextContent(
      'Showing 1 of 7 discovered pathways',
    );

    // Re-render with searchLimitReached: true
    rerender(
      <ScenarioStoreProvider>
        <ImpactPathwayExplorer
          reportOverride={{
            ...baseReport,
            searchLimitReached: true,
          }}
        />
      </ScenarioStoreProvider>,
    );

    expect(screen.getByTestId('pathway-truncation-banner')).toHaveTextContent(
      'Showing 1 of at least 7 discovered pathways (search limit reached)',
    );
  });

  it('10. renders a clean "Unavailable" fallback when optional step metrics are missing or non-finite rather than NaN or undefined', () => {
    const partialMetricsReport: PathwayAnalysisReport = {
      targetNodeId: 'con_groceries',
      week: 6,
      reachabilityStatus: 'reachable',
      reachabilityReason: 'Reachable with partial metrics.',
      totalDiscoveredPaths: 1,
      truncatedPathCount: 0,
      searchLimitReached: false,
      pathways: [
        {
          targetNodeId: 'con_groceries',
          week: 6,
          pathScore: 15.0,
          totalLagWeeks: 2,
          bottleneckNodeId: 'con_groceries',
          bottleneckEdgeId: 'edge_test_partial',
          bottleneckSummary: 'Test bottleneck link',
          narrativeSummary: 'Test narrative summary.',
          steps: [
            {
              nodeId: 'chk_hormuz',
              nodeName: 'Strait of Hormuz',
              reiAtWeek: Number.NaN,
              targetRei: Number.NaN,
              cpiAtWeek: Number.NaN,
              severityBand: 'Baseline',
              lagWeeksFromOrigin: Number.NaN,
              cumulativeLagWeeks: Number.NaN,
              sourceInventoryDays: Number.NaN,
              targetInventoryDays: Number.NaN,
              edgeActiveBypassShare: Number.NaN,
              classification: 'observed',
              confidence: 'high',
            },
            {
              nodeId: 'con_groceries',
              nodeName: 'Household Groceries & Staples',
              edgeId: 'edge_test_partial',
              dependencyWeight: Number.NaN,
              inputCriticality: undefined,
              reiAtWeek: Number.NaN,
              targetRei: Number.NaN,
              cpiAtWeek: Number.NaN,
              severityBand: 'Baseline',
              lagWeeksFromOrigin: Number.NaN,
              cumulativeLagWeeks: Number.NaN,
              sourceInventoryDays: Number.NaN,
              targetInventoryDays: Number.NaN,
              edgeActiveBypassShare: Number.POSITIVE_INFINITY,
              classification: 'observed',
              confidence: 'high',
            },
          ],
        },
      ],
    };

    render(
      <ScenarioStoreProvider>
        <ImpactPathwayExplorer reportOverride={partialMetricsReport} />
      </ScenarioStoreProvider>,
    );

    const hopChain = screen.getByTestId('pathway-hop-chain');
    expect(hopChain.textContent).not.toContain('NaN');
    expect(hopChain.textContent).not.toContain('undefined');
    expect(hopChain.textContent).toContain('Unavailable');
  });
});
