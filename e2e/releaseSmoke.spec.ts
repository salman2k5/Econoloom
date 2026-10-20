import { expect, test } from '@playwright/test';

test.describe('EconoLoom Final Release Audit — Complete Live Browser Verification', () => {
  test('1. Complete user journey: fresh session, map/graph/timeline/inspector sync, pathway route match, A/B comparison & zero-delta, localStorage + shareable URL persistence, JSON export, invalid URL/storage recovery, mobile layout, and keyboard navigation', async ({
    page,
    context,
  }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const failedRequests: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });
    page.on('response', (res) => {
      if (res.status() >= 400) {
        failedRequests.push(`${res.status()} ${res.url()}`);
      }
    });

    // --- A. Open app in a fresh session at Desktop (1440x900) ---
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.getByText('EconoLoom', { exact: true })).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Strait of Hormuz Energy/i }),
    ).toHaveAttribute('aria-pressed', 'true');

    // Verify Map (12 physical markers) and Dependency Graph (48 nodes, 78 edges) render in lockstep
    await expect(page.getByTestId('world-map-svg')).toBeVisible();
    await expect(page.locator('[data-testid^="map-marker-"]')).toHaveCount(12);
    const networkSvg = page.getByTestId('dependency-network-svg');
    await expect(networkSvg).toBeVisible();
    await expect(networkSvg.locator('[data-testid^="graph-node-"]')).toHaveCount(
      48,
    );
    await expect(networkSvg.locator('[data-testid^="graph-edge-"]')).toHaveCount(
      78,
    );

    // --- B. Trace a causal pathway and verify highlighted route on DependencyNetwork matches explanation ---
    await page
      .getByTestId('pathway-target-select')
      .selectOption('con_groceries');
    await expect(page.getByTestId('pathway-rank-card-0')).toBeVisible();
    await expect(page.getByTestId('pathway-rank-card-1')).toBeVisible();

    // Extract node IDs from the hop-by-hop explanation for Rank #1 pathway
    const hopStepNodesRank0 = await page
      .locator('[data-testid^="pathway-step-node-"]')
      .evaluateAll((els) =>
        els.map((el) =>
          el.getAttribute('data-testid')!.replace('pathway-step-node-', ''),
        ),
      );
    expect(hopStepNodesRank0.length).toBeGreaterThanOrEqual(3);
    expect(hopStepNodesRank0[0]).toBe('chk_hormuz');
    expect(hopStepNodesRank0[hopStepNodesRank0.length - 1]).toBe(
      'con_groceries',
    );

    // Verify every node in the active pathway explanation is highlighted with data-active-pathway="true" on DependencyNetwork
    for (const nodeId of hopStepNodesRank0) {
      await expect(networkSvg.getByTestId(`graph-node-${nodeId}`)).toHaveAttribute(
        'data-active-pathway',
        'true',
      );
    }

    // Switch to Rank #2 pathway and verify the highlighted route updates
    await page.getByTestId('pathway-rank-card-1').click();
    await expect(page.getByTestId('pathway-rank-card-1')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const hopStepNodesRank1 = await page
      .locator('[data-testid^="pathway-step-node-"]')
      .evaluateAll((els) =>
        els.map((el) =>
          el.getAttribute('data-testid')!.replace('pathway-step-node-', ''),
        ),
      );
    for (const nodeId of hopStepNodesRank1) {
      await expect(networkSvg.getByTestId(`graph-node-${nodeId}`)).toHaveAttribute(
        'data-active-pathway',
        'true',
      );
    }

    // --- C. Configure disruption scenario, inspect effects, and verify reload persistence ---
    await page
      .getByRole('button', { name: /Taiwan Semiconductor Foundry/i })
      .click();
    const sevInput = page.getByRole('spinbutton', {
      name: /Shock Severity numeric input/i,
    });
    await sevInput.fill('80');
    await page.getByRole('button', { name: 'Next week' }).click();
    await page.getByRole('button', { name: 'Next week' }).click();
    await page.getByTestId('pathway-target-select').selectOption('con_vehicles');

    // Strip URL query string in-place so reload tests pure localStorage persistence
    await page.evaluate(() => {
      window.history.replaceState(null, '', '/');
    });
    await page.reload();
    await expect(
      page.getByRole('button', { name: /Taiwan Semiconductor Foundry/i }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(
      page.getByRole('spinbutton', { name: /Shock Severity numeric input/i }),
    ).toHaveValue('80');
    await expect(
      page.getByRole('slider', { name: /Simulation week scrubber/i }),
    ).toHaveValue('10');
    await expect(page.getByTestId('pathway-target-select')).toHaveValue(
      'con_vehicles',
    );

    // --- D. Copy shareable URL and confirm restoration in a fresh session ---
    await page
      .getByRole('navigation', { name: /Primary Workbench Views/i })
      .getByRole('button', { name: /Impact Pathway Explorer/i })
      .click();
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.getByTestId('copy-share-link-btn').click();
    await expect(page.getByTestId('scenario-action-feedback')).toContainText(
      /Shareable scenario link copied/i,
    );
    const copiedUrl = await page.evaluate(() => navigator.clipboard.readText());
    expect(copiedUrl).toContain('preset=preset_taiwan_semi');
    expect(copiedUrl).toContain('node=con_vehicles');
    expect(copiedUrl).toContain('week=10');
    expect(copiedUrl).toContain('tab=pathway_explorer');

    const freshPage = await context.newPage();
    await freshPage.goto(copiedUrl);
    await expect(
      freshPage.getByRole('button', { name: /Taiwan Semiconductor Foundry/i }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(freshPage.getByTestId('pathway-target-select')).toHaveValue(
      'con_vehicles',
    );
    await freshPage.close();

    // --- E. Export JSON snapshot and verify schema & contents ---
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('export-scenario-json-btn').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(
      'econoloom-scenario-preset_taiwan_semi-w10.json',
    );
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    const exportedJson = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
    expect(exportedJson.schemaVersion).toBe('econoloom.scenario_snapshot.v1');
    expect(exportedJson.activePresetId).toBe('preset_taiwan_semi');
    expect(exportedJson.selectedNodeId).toBe('con_vehicles');
    expect(exportedJson.currentWeek).toBe(10);
    expect(exportedJson.activeWorkspaceTab).toBe('pathway_explorer');
    expect(exportedJson.scenarioParams.shockSeverityPct).toBe(0.8);

    // --- F. Compare two scenarios, change parameters independently, and verify zero-delta check ---
    await page
      .getByRole('navigation', { name: /Primary Workbench Views/i })
      .getByRole('button', { name: /Scenario Comparison/i })
      .click();
    await expect(page.getByTestId('scenario-comparison-view')).toBeVisible();
    await page.getByTestId('template-rerouting_capacity').click();
    await expect(
      page.getByTestId('param-diff-rerouteCapacityShare'),
    ).toContainText('+70% pts');

    // Click "Set B = A (Zero-Delta Check)" and verify zero delta across parameters and network peak REI
    await page.getByTestId('comparison-match-b-to-a-btn').click();
    await expect(page.getByTestId('identical-scenario-badge')).toBeVisible();
    await expect(page.getByTestId('network-peak-rei-delta')).toContainText(
      '0.0 pts',
    );

    // Confirm live workspace Shock Severity remained isolated at 80%
    await expect(
      page.getByRole('spinbutton', { name: /Shock Severity numeric input/i }),
    ).toHaveValue('80');

    // --- G. Test invalid URL parameters and malformed saved localStorage in live browser ---
    await page.evaluate(() => {
      window.localStorage.setItem(
        'econoloom.scenario_state.v1',
        '{corrupted_json_payload',
      );
    });
    await page.goto(
      '/?preset=invalid_preset&node=invalid_node&week=999&sev=-5&dur=999&tab=invalid_tab',
    );
    // Invalid preset falls back to Hormuz; out-of-range week=999 clamps to 26; sev=-5 clamps to 0%; dur=999 clamps to 180d
    await expect(
      page.getByRole('button', { name: /Strait of Hormuz Energy/i }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(
      page.getByRole('spinbutton', { name: /Shock Severity numeric input/i }),
    ).toHaveValue('0');
    await expect(
      page.getByRole('spinbutton', {
        name: /Disruption Duration numeric input/i,
      }),
    ).toHaveValue('180');
    await expect(
      page.getByRole('slider', { name: /Simulation week scrubber/i }),
    ).toHaveValue('26');

    // --- H. Keyboard navigation (open Methodology & Guardrails modal via Enter, close via Escape) ---
    const methodologyBtn = page.getByRole('button', {
      name: /Methodology & Guardrails/i,
    });
    await methodologyBtn.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // --- I. Narrow mobile viewport (390x844) layout & overflow check ---
    await page.setViewportSize({ width: 390, height: 844 });
    const hasHorizontalOverflow = await page.evaluate(() => {
      return (
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth
      );
    });
    expect(hasHorizontalOverflow).toBe(false);
    await expect(page.getByTestId('dependency-network-svg')).toBeVisible();

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
    expect(failedRequests).toEqual([]);
  });
});
