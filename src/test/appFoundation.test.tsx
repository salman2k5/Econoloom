import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../App';

describe('EconoLoom Stage 1 & Stage 3 Application UI & Simulation Synchronization', () => {
  it('renders branding, core promise, and verified network status', () => {
    render(<App />);
    expect(screen.getByText('EconoLoom')).toBeInTheDocument();
    expect(
      screen.getByText(/Pull one thread of the global economy/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/48 Nodes · 78 Edges · DAG Verified/i),
    ).toBeInTheDocument();
  });

  it('switches flagship presets and updates both the scenario brief and docked node inspector', () => {
    render(<App />);

    // Default preset is Strait of Hormuz
    const inspector = screen.getByLabelText(
      'Selected Node Baseline & Provenance Inspector',
    );
    expect(
      within(inspector).getAllByText('Strait of Hormuz').length,
    ).toBeGreaterThan(0);

    // Switch to Taiwan Semiconductor preset
    const taiwanPresetBtn = screen.getByRole('button', {
      name: /Taiwan Semiconductor Foundry & Strait Disruption/i,
    });
    fireEvent.click(taiwanPresetBtn);

    expect(
      within(inspector).getAllByText('Taiwan Foundry Cluster & Strait').length,
    ).toBeGreaterThan(0);

    // Click a downstream node in the featured causal pathway (Vehicles & Auto Parts)
    const vehiclesStepBtn = screen.getAllByRole('button', {
      name: /Vehicles & Auto Parts/i,
    })[0]!;
    fireEvent.click(vehiclesStepBtn);

    expect(
      within(inspector).getByText('Passenger Vehicles, EVs & Replacement Parts'),
    ).toBeInTheDocument();
    expect(
      within(inspector).getByText('Consumer Basket Upstream Cost Breakdown'),
    ).toBeInTheDocument();
  });

  it('filters the 48-node dataset table by category and search query', () => {
    render(<App />);

    // Navigate to Audited Network tab
    const datasetTabBtn = screen.getByRole('button', {
      name: /Audited Network \(48 Nodes \/ 78 Edges\)/i,
    });
    fireEvent.click(datasetTabBtn);

    // Filter to Chokepoints (3)
    const chokepointFilterBtn = screen.getByRole('button', {
      name: /Chokepoints \(3\)/i,
    });
    fireEvent.click(chokepointFilterBtn);

    const rowsAfterCategory = screen.getAllByRole('row');
    // 1 header row + 3 chokepoint rows
    expect(rowsAfterCategory.length).toBe(4);

    // Reset to All Nodes (48) and search for "Sulfuric"
    fireEvent.click(screen.getByRole('button', { name: /All Nodes \(48\)/i }));
    const searchInput = screen.getByLabelText('Search network nodes');
    fireEvent.change(searchInput, { target: { value: 'com_sulfuric_acid' } });

    const rowsAfterSearch = screen.getAllByRole('row');
    expect(rowsAfterSearch.length).toBe(2);
    expect(
      screen.getByText('Industrial Sulfuric Acid (H₂SO₄)'),
    ).toBeInTheDocument();
  });

  it('opens and closes the Methodology & Guardrails modal dialog', () => {
    render(<App />);

    const openModalBtn = screen.getByRole('button', {
      name: /Methodology & Guardrails/i,
    });
    fireEvent.click(openModalBtn);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        /Non-Negotiable Epistemic Guardrail: Exploration, Never Price Prediction/i,
      ),
    ).toBeInTheDocument();

    const closeBtn = within(dialog).getByRole('button', {
      name: /Close methodology dialog/i,
    });
    fireEvent.click(closeBtn);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('synchronizes interactive scenario sliders, numeric inputs, Zero Shock (0%), Reset to Preset, and timeline week scrubber with inspector outputs', () => {
    render(<App />);

    const inspector = screen.getByLabelText(
      'Selected Node Baseline & Provenance Inspector',
    );

    // Select a downstream node (Petroleum Refining) to observe propagation & buffers
    const refiningChip = screen.getAllByRole('button', {
      name: /Petroleum Refining/i,
    })[0]!;
    fireEvent.click(refiningChip);

    expect(
      within(inspector).getByText(
        'Petroleum Refining & Distillate Processing',
      ),
    ).toBeInTheDocument();

    // At default Week 8 on Hormuz (60% severity), refining has positive REI
    const initialReiText = within(inspector).getByTestId(
      'inspector-rei-value',
    ).textContent;
    expect(initialReiText).not.toContain('0.0');

    // Increase Shock Severity slider to 95%
    const severitySlider = screen.getByLabelText('Shock Severity slider');
    fireEvent.change(severitySlider, { target: { value: '95' } });

    const severityNumberInput = screen.getByLabelText(
      'Shock Severity numeric input',
    ) as HTMLInputElement;
    expect(severityNumberInput.value).toBe('95');

    const higherReiText = within(inspector).getByTestId(
      'inspector-rei-value',
    ).textContent;
    expect(
      Number.parseFloat(higherReiText ?? '0'),
    ).toBeGreaterThanOrEqual(Number.parseFloat(initialReiText ?? '0'));

    // Click Zero Shock (0%) button and verify REI and CPI drop to 0.0
    const zeroShockBtn = screen.getByRole('button', {
      name: /Zero Shock \(0%\)/i,
    });
    fireEvent.click(zeroShockBtn);

    expect(severityNumberInput.value).toBe('0');
    expect(
      within(inspector).getByTestId('inspector-rei-value').textContent,
    ).toContain('0.0');
    expect(
      within(inspector).getByTestId('inspector-cpi-value').textContent,
    ).toContain('0.0');
    expect(
      within(inspector).getByText(/Zero Shock Baseline Active/i),
    ).toBeInTheDocument();

    // Click Reset to Preset button and verify default parameters & exposure are restored
    const resetPresetBtn = screen.getByRole('button', {
      name: /Reset to Preset/i,
    });
    fireEvent.click(resetPresetBtn);

    expect(severityNumberInput.value).toBe('60');
    expect(
      within(inspector).getByTestId('inspector-rei-value').textContent,
    ).toBe(initialReiText);

    // Scrub timeline to Week 0 and verify pre-shock baseline state
    const weekScrubber = screen.getByLabelText('Simulation week scrubber');
    fireEvent.change(weekScrubber, { target: { value: '0' } });

    expect(
      within(inspector).getByText(/Week 0 Simulated Output/i),
    ).toBeInTheDocument();
    expect(
      within(inspector).getByTestId('inspector-rei-value').textContent,
    ).toContain('0.0');

    // Step forward +1w twice to Week 2
    const nextWeekBtn = screen.getByRole('button', { name: /Next week/i });
    fireEvent.click(nextWeekBtn);
    fireEvent.click(nextWeekBtn);

    expect(
      within(inspector).getByText(/Week 2 Simulated Output/i),
    ).toBeInTheDocument();
  });
});
