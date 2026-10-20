import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../App';
import { CORRIDORS, EDGES, NODES } from '../data';
import {
  buildDatelineSafePolylineSegments,
  hasValidCoordinates,
} from '../data/geo/worldLandmarks';
import {
  computeGraphLayout,
  computeGraphNeighborhood,
} from '../engine/graphLayout';

describe('Deliverable A: Graph Layout Engine (src/engine/graphLayout.ts)', () => {
  it('assigns finite, deterministic coordinates to all 48 nodes and 78 directed edges', () => {
    const layoutA = computeGraphLayout(NODES, EDGES);
    const layoutB = computeGraphLayout(NODES, EDGES);

    expect(layoutA.nodes.length).toBe(NODES.length);
    expect(layoutA.edges.length).toBe(EDGES.length);
    expect(layoutA.width).toBeGreaterThan(800);
    expect(layoutA.height).toBeGreaterThan(300);

    for (const posNode of layoutA.nodes) {
      expect(Number.isFinite(posNode.x)).toBe(true);
      expect(Number.isFinite(posNode.y)).toBe(true);
      expect(Number.isFinite(posNode.centerX)).toBe(true);
      expect(Number.isFinite(posNode.centerY)).toBe(true);

      const repeatNode = layoutB.nodeById[posNode.id];
      expect(repeatNode).toBeDefined();
      expect(posNode.x).toBe(repeatNode!.x);
      expect(posNode.y).toBe(repeatNode!.y);
    }

    for (const posEdge of layoutA.edges) {
      expect(Number.isFinite(posEdge.sourcePoint.x)).toBe(true);
      expect(Number.isFinite(posEdge.sourcePoint.y)).toBe(true);
      expect(Number.isFinite(posEdge.targetPoint.x)).toBe(true);
      expect(Number.isFinite(posEdge.targetPoint.y)).toBe(true);
      expect(posEdge.pathD).toMatch(/^M /);
    }
  });

  it('orders supply-chain tiers and intra-tier dependencies strictly left-to-right with zero node overlaps', () => {
    const layout = computeGraphLayout(NODES, EDGES);

    // Every directed edge u -> v must flow strictly left-to-right (x_u < x_v)
    for (const posEdge of layout.edges) {
      const src = layout.nodeById[posEdge.sourceNodeId]!;
      const tgt = layout.nodeById[posEdge.targetNodeId]!;
      expect(src.x).toBeLessThan(tgt.x);
      expect(posEdge.isForward).toBe(true);
    }

    // Consumer categories (Tier 3) must sit strictly to the right of upstream origins & commodities (Tier 0 and Tier 1)
    for (const nodeA of layout.nodes) {
      for (const nodeB of layout.nodes) {
        if (nodeA.tierIndex <= 1 && nodeB.tierIndex === 3) {
          expect(nodeA.x).toBeLessThan(nodeB.x);
        }
      }
    }

    // No two node cards may overlap
    for (let i = 0; i < layout.nodes.length; i += 1) {
      for (let j = i + 1; j < layout.nodes.length; j += 1) {
        const a = layout.nodes[i]!;
        const b = layout.nodes[j]!;
        const overlapX = a.x < b.x + b.width && a.x + a.width > b.x;
        const overlapY = a.y < b.y + b.height && a.y + a.height > b.y;
        expect(overlapX && overlapY).toBe(false);
      }
    }
  });

  it('computes upstream and downstream neighborhoods around a selected node', () => {
    const neighborhood = computeGraphNeighborhood('com_crude', EDGES, [], 2);
    expect(neighborhood.selectedNodeId).toBe('com_crude');
    expect(neighborhood.upstreamNodeIds.has('chk_hormuz')).toBe(true);
    expect(neighborhood.downstreamNodeIds.has('ind_refining')).toBe(true);
    expect(neighborhood.directIncidentEdgeIds.size).toBeGreaterThan(0);
  });
});

describe('Deliverable A & B: Interactive Dependency Graph and Geographic Map Synchronization', () => {
  it('renders all 48 nodes and 78 directed edges in DependencyNetwork and only 12 verified physical markers on WorldMap', () => {
    render(<App />);

    const graphPanel = screen.getByTestId('dependency-network-panel');
    expect(
      within(graphPanel).getByTestId('graph-node-edge-counts'),
    ).toHaveTextContent('48/48 Nodes · 78/78 Directed Edges');

    const nodesLayer = within(graphPanel).getByTestId('graph-nodes-layer');
    const renderedGraphNodes = within(nodesLayer).getAllByRole('button');
    expect(renderedGraphNodes.length).toBe(NODES.length);

    const edgesLayer = within(graphPanel).getByTestId('graph-edges-layer');
    expect(edgesLayer.children.length).toBe(EDGES.length);

    // Verify Geographic Map only renders markers for nodes with valid physical coordinates (12 of 48)
    const mapPanel = screen.getByTestId('world-map-panel');
    const expectedPhysicalNodes = NODES.filter((n) =>
      hasValidCoordinates(n.coordinates),
    );
    expect(expectedPhysicalNodes.length).toBe(12);

    expect(
      within(mapPanel).getByTestId('map-coordinate-coverage-badge'),
    ).toHaveTextContent('12 Physical Nodes Mapped · 36 Non-Geographic Nodes');

    const mapMarkersLayer = within(mapPanel).getByTestId('map-markers-layer');
    const renderedMarkers = within(mapMarkersLayer).getAllByRole('button');
    expect(renderedMarkers.length).toBe(12);

    // Ensure non-geographic nodes (e.g. com_crude, ind_refining, con_groceries) have no fabricated map markers
    expect(
      within(mapPanel).queryByTestId('map-marker-com_crude'),
    ).not.toBeInTheDocument();
    expect(
      within(mapPanel).queryByTestId('map-marker-ind_refining'),
    ).not.toBeInTheDocument();

    // Ensure all 3 audited corridors are rendered
    const mapCorridorsLayer = within(mapPanel).getByTestId('map-corridors-layer');
    expect(mapCorridorsLayer.children.length).toBe(CORRIDORS.length);

    // Verify dateline-safe splitting for trans-Pacific corridor
    const taiwanCorridor = CORRIDORS.find(
      (c) => c.id === 'cor_taiwan_transpacific',
    )!;
    const segments = buildDatelineSafePolylineSegments(
      taiwanCorridor.primaryWaypoints,
    );
    expect(segments.length).toBe(2);
  });

  it('synchronizes node selection across DependencyNetwork, WorldMap, and NodeBaselineInspector', () => {
    render(<App />);

    const inspector = screen.getByLabelText(
      'Selected Node Baseline & Provenance Inspector',
    );

    // 1. Click a physical regional hub marker on the Geographic Map (Japan)
    const japanMarker = screen.getByTestId('map-marker-geo_jpn');
    fireEvent.click(japanMarker);

    expect(japanMarker).toHaveAttribute('data-selected', 'true');
    expect(screen.getByTestId('graph-node-geo_jpn')).toHaveAttribute(
      'data-selected',
      'true',
    );
    expect(
      within(inspector).getByText('Japan Wafer, Chemical & Precision Hub'),
    ).toBeInTheDocument();

    // 2. Click a non-geographic commodity node in the Dependency Graph (com_naphtha)
    const naphthaGraphNode = screen.getByTestId('graph-node-com_naphtha');
    fireEvent.click(naphthaGraphNode);

    expect(naphthaGraphNode).toHaveAttribute('data-selected', 'true');
    expect(
      within(inspector).getByText('Naphtha & LPG Chemical Feedstocks'),
    ).toBeInTheDocument();

    // WorldMap must display the non-geographic node banner and upstream physical feeders
    const nonGeoBanner = screen.getByTestId('map-non-geographic-banner');
    expect(nonGeoBanner).toHaveTextContent(
      /Naphtha & LPG Chemical Feedstocks.*is a distributed supply-chain tier node/i,
    );
  });

  it('updates graph and map severity styling when scrubbing the timeline week or changing scenario parameters', () => {
    render(<App />);

    // Select Elemental Sulfur (com_sulfur) in the graph
    fireEvent.click(screen.getByTestId('graph-node-com_sulfur'));

    const sulfurGraphNode = screen.getByTestId('graph-node-com_sulfur');
    const hormuzMarker = screen.getByTestId('map-marker-chk_hormuz');

    // At Week 8 under 60% Hormuz shock, both Hormuz and Sulfur are stressed above Baseline
    expect(hormuzMarker.getAttribute('data-severity-band')).not.toBe('Baseline');
    expect(sulfurGraphNode.getAttribute('data-severity-band')).not.toBe(
      'Baseline',
    );

    // Scrub timeline back to Week 0 (pre-shock baseline)
    const weekScrubber = screen.getByLabelText('Simulation week scrubber');
    fireEvent.change(weekScrubber, { target: { value: '0' } });

    expect(hormuzMarker).toHaveAttribute('data-severity-band', 'Baseline');
    expect(sulfurGraphNode).toHaveAttribute('data-severity-band', 'Baseline');
  });

  it('supports graph search, category/neighborhood filtering, edge inspection, fit-to-view, and empty-filter reset', () => {
    render(<App />);

    const graphPanel = screen.getByTestId('dependency-network-panel');

    // Click an edge to inspect its causal transmission parameters (e_02: chk_hormuz -> com_crude)
    const crudeEdge = within(graphPanel).getByTestId('graph-edge-e_02');
    fireEvent.click(crudeEdge);

    const edgeInspector = within(graphPanel).getByTestId('graph-edge-inspector');
    expect(edgeInspector).toHaveTextContent('e_02');
    expect(edgeInspector).toHaveTextContent('Share w_uv:');
    expect(edgeInspector).toHaveTextContent('Criticality c_uv:');

    // Filter graph by category to Chokepoints (3)
    const categorySelect = within(graphPanel).getByTestId(
      'graph-category-filter',
    );
    fireEvent.change(categorySelect, { target: { value: 'chokepoint' } });
    expect(
      within(graphPanel).getByTestId('graph-node-edge-counts'),
    ).toHaveTextContent('3/48 Nodes');

    // Search for a non-existent node to trigger empty state
    const searchInput = within(graphPanel).getByTestId('graph-search-input');
    fireEvent.change(searchInput, {
      target: { value: 'non_existent_node_xyz' },
    });

    const emptyState = within(graphPanel).getByTestId('graph-empty-state');
    expect(emptyState).toBeInTheDocument();

    // Reset filters and verify all 48 nodes & 78 edges return
    const resetBtn = within(emptyState).getByRole('button', {
      name: /Reset Graph Filters/i,
    });
    fireEvent.click(resetBtn);

    expect(
      within(graphPanel).getByTestId('graph-node-edge-counts'),
    ).toHaveTextContent('48/48 Nodes · 78/78 Directed Edges');

    // Test zoom and fit-to-view
    const zoomInBtn = within(graphPanel).getByRole('button', {
      name: /Zoom in graph/i,
    });
    fireEvent.click(zoomInBtn);
    expect(
      within(graphPanel).getByTestId('graph-zoom-readout'),
    ).toHaveTextContent('120%');

    fireEvent.click(within(graphPanel).getByTestId('graph-fit-to-view-btn'));
    expect(
      within(graphPanel).getByTestId('graph-zoom-readout'),
    ).toHaveTextContent('100%');
  });

  it('supports map corridor focus, tabular matrix fallback toggle, and visible basemap attribution', () => {
    render(<App />);

    const mapPanel = screen.getByTestId('world-map-panel');
    expect(
      within(mapPanel).getByTestId('map-basemap-attribution'),
    ).toHaveTextContent(/Natural Earth 110m.*OpenStreetMap.*CARTO/i);

    // Focus Active Corridor zooms in
    fireEvent.click(within(mapPanel).getByTestId('map-focus-corridor-btn'));
    expect(within(mapPanel).getByTestId('map-zoom-readout')).toHaveTextContent(
      '160%',
    );

    // Fit World resets zoom to 100%
    fireEvent.click(within(mapPanel).getByTestId('map-fit-all-btn'));
    expect(within(mapPanel).getByTestId('map-zoom-readout')).toHaveTextContent(
      '100%',
    );

    // Toggle Tabular Matrix Fallback View
    fireEvent.click(within(mapPanel).getByTestId('map-toggle-matrix-btn'));
    expect(
      within(mapPanel).getByTestId('map-fallback-matrix'),
    ).toBeInTheDocument();
  });
});
