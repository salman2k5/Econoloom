import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Compass,
  Globe,
  Info,
  Layers,
  MapPin,
  Maximize2,
  Navigation,
  Table,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { CORRIDORS, EDGES, NODE_BY_ID, NODES } from '../../data';
import {
  buildDatelineSafePolylineSegments,
  hasValidCoordinates,
  MAP_HEIGHT,
  MAP_WIDTH,
  OCEAN_WATER_LABELS,
  projectLonLatToMap,
  WORLD_LANDMASS_POLYGONS,
} from '../../data/geo/worldLandmarks';
import { computeGraphNeighborhood } from '../../engine/graphLayout';
import { useScenarioStore } from '../../state/useScenarioStore';
import type { CorridorGeometry, NetworkNode } from '../../types/domain';
import type { SeverityBand } from '../../types/simulation';
import { MapFallbackMatrix } from './MapFallbackMatrix';

const MARKER_SEVERITY_COLORS: Record<
  SeverityBand,
  { fill: string; stroke: string; halo: string; text: string }
> = {
  Baseline: {
    fill: '#172331',
    stroke: '#63768A',
    halo: 'rgba(99, 118, 138, 0.22)',
    text: '#C6D0DC',
  },
  Low: {
    fill: '#162F42',
    stroke: '#7CA3C7',
    halo: 'rgba(124, 163, 199, 0.28)',
    text: '#ACC7E0',
  },
  Moderate: {
    fill: '#3A2B14',
    stroke: '#D5A653',
    halo: 'rgba(213, 166, 83, 0.34)',
    text: '#E6C27A',
  },
  Elevated: {
    fill: '#422214',
    stroke: '#D97742',
    halo: 'rgba(217, 119, 66, 0.38)',
    text: '#F2A679',
  },
  Severe: {
    fill: '#471521',
    stroke: '#E05A6D',
    halo: 'rgba(224, 90, 109, 0.44)',
    text: '#F598A6',
  },
};

export const WorldMap: React.FC = () => {
  const {
    activePreset,
    activeCorridor,
    scenarioParams,
    currentWeek,
    currentWeekNodeStates,
    selectedNode,
    selectedNodePathways,
    selectNode,
  } = useScenarioStore();

  // Separate nodes with verified physical coordinates from abstract non-geographic nodes
  const physicalNodes = useMemo(
    () =>
      NODES.filter(
        (node): node is NetworkNode & { coordinates: readonly [number, number] } =>
          hasValidCoordinates(node.coordinates),
      ),
    [],
  );

  const nonGeographicNodeCount = NODES.length - physicalNodes.length;
  const isSelectedNodePhysical = hasValidCoordinates(selectedNode.coordinates);

  // Compute upstream physical locations feeding the selected node (up to 4 hops across the 4-tier DAG)
  const selectedNeighborhood = useMemo(
    () =>
      computeGraphNeighborhood(
        selectedNode.id,
        EDGES,
        selectedNodePathways,
        4,
      ),
    [selectedNode.id, selectedNodePathways],
  );

  const upstreamPhysicalNodes = useMemo(
    () =>
      physicalNodes.filter(
        (n) =>
          n.id === selectedNode.id ||
          selectedNeighborhood.upstreamNodeIds.has(n.id) ||
          selectedNeighborhood.pathwayNodeIds.has(n.id),
      ),
    [physicalNodes, selectedNode.id, selectedNeighborhood],
  );

  // Map view state
  const [viewMode, setViewMode] = useState<'canvas' | 'matrix'>('canvas');
  const [inspectedCorridorId, setInspectedCorridorId] = useState<string | null>(
    null,
  );
  const [enableRasterTiles, setEnableRasterTiles] = useState<boolean>(false);
  const [tileLoadError, setTileLoadError] = useState<boolean>(false);

  // Viewport zoom & pan
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{
    x: number;
    y: number;
    panX: number;
    panY: number;
  } | null>(null);

  const effectiveCorridor: CorridorGeometry = useMemo(() => {
    if (inspectedCorridorId) {
      const found = CORRIDORS.find((c) => c.id === inspectedCorridorId);
      if (found) return found;
    }
    return activeCorridor;
  }, [inspectedCorridorId, activeCorridor]);

  const handleFitAllLocations = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setInspectedCorridorId(null);
  }, []);

  const handleFocusCorridor = useCallback(
    (corridor: CorridorGeometry = activeCorridor) => {
      const chokepointCoords = NODE_BY_ID.get(corridor.chokepointNodeId)?.coordinates;
      const focusCoord =
        chokepointCoords ?? corridor.primaryWaypoints[0] ?? [0, 20];
      const centerPt = projectLonLatToMap(focusCoord, MAP_WIDTH, MAP_HEIGHT);
      setZoom(1.6);
      setPan({
        x: Math.round(MAP_WIDTH / 2 - centerPt.x),
        y: Math.round(MAP_HEIGHT / 2 - centerPt.y),
      });
      setInspectedCorridorId(corridor.id);
    },
    [activeCorridor],
  );

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(2.8, Math.round((prev + 0.25) * 100) / 100));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(0.8, Math.round((prev - 0.25) * 100) / 100));
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if ((e.target as HTMLElement).closest('[data-map-interactive="true"]')) {
        return;
      }
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        panX: pan.x,
        panY: pan.y,
      };
    },
    [pan.x, pan.y],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!isDragging || !dragStartRef.current) return;
      const dx = (e.clientX - dragStartRef.current.x) / zoom;
      const dy = (e.clientY - dragStartRef.current.y) / zoom;
      setPan({
        x: Math.round(dragStartRef.current.panX + dx),
        y: Math.round(dragStartRef.current.panY + dy),
      });
    },
    [isDragging, zoom],
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  const shockOriginSet = useMemo(
    () => new Set(activePreset.shockOriginNodeIds),
    [activePreset.shockOriginNodeIds],
  );

  // Precompute landmass SVG polygon point strings
  const landmassPolygons = useMemo(
    () =>
      WORLD_LANDMASS_POLYGONS.map((poly) => ({
        ...poly,
        points: poly.coordinates
          .map((coord) => {
            const pt = projectLonLatToMap(coord, MAP_WIDTH, MAP_HEIGHT);
            return `${pt.x},${pt.y}`;
          })
          .join(' '),
      })),
    [],
  );

  // Precompute graticule lines
  const graticuleMeridians = useMemo(
    () =>
      [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map((lon) => {
        const top = projectLonLatToMap([lon, 78], MAP_WIDTH, MAP_HEIGHT);
        const bottom = projectLonLatToMap([lon, -65], MAP_WIDTH, MAP_HEIGHT);
        return { lon, x: top.x, y1: top.y, y2: bottom.y };
      }),
    [],
  );

  const graticuleParallels = useMemo(
    () =>
      [-60, -30, 0, 23.5, 30, 60].map((lat) => {
        const left = projectLonLatToMap([-180, lat], MAP_WIDTH, MAP_HEIGHT);
        const right = projectLonLatToMap([180, lat], MAP_WIDTH, MAP_HEIGHT);
        return {
          lat,
          y: left.y,
          x1: left.x,
          x2: right.x,
          isEquatorOrTropic: lat === 0 || lat === 23.5,
        };
      }),
    [],
  );

  return (
    <section
      aria-label="Global Chokepoint and Trade Corridor Map"
      data-testid="world-map-panel"
      className="flex flex-col rounded-md border border-border-subtle bg-panel shadow-panel overflow-hidden"
    >
      {/* Map Header */}
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle bg-elevated/45 px-4 py-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Globe className="h-4 w-4 text-[#D5A653]" aria-hidden="true" />
            <h2 className="font-display text-base font-semibold tracking-tight text-text-primary">
              Geographic Chokepoints &amp; Maritime/Air Trade Corridors
            </h2>
            <span
              data-testid="map-coordinate-coverage-badge"
              className="rounded-sm border border-[#7CA3C7]/35 bg-[#7CA3C7]/12 px-2 py-0.5 font-mono text-[11px] font-semibold text-[#ACC7E0]"
            >
              {physicalNodes.length} Physical Nodes Mapped ·{' '}
              {nonGeographicNodeCount} Non-Geographic Nodes
            </span>
            <span className="rounded-sm border border-[#D5A653]/40 bg-[#D5A653]/12 px-2 py-0.5 font-mono text-[11px] text-[#E6C27A]">
              Week {currentWeek} · Simulated Output — Model-Derived
            </span>
          </div>
          <p className="mt-0.5 text-xs text-text-secondary">
            Displays verified physical coordinates for 3 Chokepoints, 9 Regional Trade Hubs, and 3 Audited Corridors. Abstract commodity, industry, and consumer nodes are not plotted at synthetic coordinates.
          </p>
        </div>

        {/* Map Controls */}
        <div className="flex flex-wrap items-center gap-1.5">
          {viewMode === 'canvas' && (
            <>
              <button
                type="button"
                onClick={handleZoomOut}
                aria-label="Zoom out map"
                className="inline-flex items-center gap-1 rounded-sm border border-border-subtle bg-recess px-2 py-1 text-xs font-medium text-text-secondary hover:border-[#D5A653]/50 hover:text-text-primary"
              >
                <ZoomOut className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <span
                data-testid="map-zoom-readout"
                className="min-w-[46px] text-center font-mono text-xs text-text-secondary tabular-nums"
              >
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                aria-label="Zoom in map"
                className="inline-flex items-center gap-1 rounded-sm border border-border-subtle bg-recess px-2 py-1 text-xs font-medium text-text-secondary hover:border-[#D5A653]/50 hover:text-text-primary"
              >
                <ZoomIn className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => handleFocusCorridor(activeCorridor)}
                data-testid="map-focus-corridor-btn"
                className="inline-flex items-center gap-1 rounded-sm border border-border-subtle bg-recess px-2.5 py-1 text-xs font-medium text-text-secondary hover:border-[#D5A653]/60 hover:text-[#E6C27A]"
              >
                <Compass className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Focus Active Corridor</span>
              </button>
              <button
                type="button"
                onClick={handleFitAllLocations}
                data-testid="map-fit-all-btn"
                className="inline-flex items-center gap-1 rounded-sm border border-border-subtle bg-recess px-2.5 py-1 text-xs font-medium text-text-secondary hover:border-[#D5A653]/60 hover:text-[#E6C27A]"
              >
                <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Fit World</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTileLoadError(false);
                  setEnableRasterTiles((prev) => !prev);
                }}
                aria-pressed={enableRasterTiles}
                data-testid="map-toggle-tiles-btn"
                className={`inline-flex items-center gap-1 rounded-sm border px-2.5 py-1 text-xs font-medium transition-colors ${
                  enableRasterTiles
                    ? 'border-[#D5A653]/60 bg-[#D5A653]/15 text-[#E6C27A]'
                    : 'border-border-subtle bg-recess text-text-secondary hover:text-text-primary'
                }`}
              >
                <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{enableRasterTiles ? 'OSM Tiles On' : 'Vector Basemap'}</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() =>
              setViewMode((prev) => (prev === 'canvas' ? 'matrix' : 'canvas'))
            }
            data-testid="map-toggle-matrix-btn"
            className="inline-flex items-center gap-1 rounded-sm border border-border-subtle bg-recess px-2.5 py-1 text-xs font-medium text-text-secondary hover:border-[#D5A653]/60 hover:text-[#E6C27A]"
          >
            <Table className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{viewMode === 'canvas' ? 'Tabular Matrix' : 'Map Canvas'}</span>
          </button>
        </div>
      </header>

      {/* Corridor Selector & Status Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle bg-recess/85 px-4 py-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            Corridors:
          </span>
          {CORRIDORS.map((corridor) => {
            const isScenarioCorridor = corridor.id === activeCorridor.id;
            const isInspected = corridor.id === effectiveCorridor.id;
            return (
              <button
                key={corridor.id}
                type="button"
                onClick={() => handleFocusCorridor(corridor)}
                data-testid={`map-corridor-btn-${corridor.id}`}
                className={`inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-xs font-medium transition-colors ${
                  isInspected
                    ? 'border-[#D5A653]/65 bg-[#D5A653]/15 text-[#F3EFE5]'
                    : 'border-border-subtle bg-panel text-text-secondary hover:text-text-primary'
                }`}
              >
                <Navigation
                  className={`h-3 w-3 ${
                    isScenarioCorridor ? 'text-[#E05A6D]' : 'text-[#D5A653]'
                  }`}
                  aria-hidden="true"
                />
                <span>{corridor.name.split(' ')[0]} Corridor</span>
                {isScenarioCorridor && (
                  <span className="rounded-sm bg-[#E05A6D]/20 px-1 py-0.2 font-mono text-[9.5px] font-bold text-[#F598A6]">
                    SHOCKED
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3 font-mono text-xs text-text-secondary">
          <span>
            Reroute Bypass:{' '}
            <strong className="text-[#80D8B6]">
              {Math.round(scenarioParams.rerouteCapacityShare * 100)}%
            </strong>
          </span>
          <span>
            Freight Multiplier:{' '}
            <strong className="text-[#E6C27A]">
              {scenarioParams.shippingCostMultiplier.toFixed(2)}x
            </strong>
          </span>
        </div>
      </div>

      {/* Informative Banner When Selected Node Has No Physical Coordinates */}
      {!isSelectedNodePhysical && (
        <div
          data-testid="map-non-geographic-banner"
          className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D5A653]/35 bg-[#D5A653]/10 px-4 py-2.5 text-xs"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0 text-[#D5A653]"
              aria-hidden="true"
            />
            <div>
              <span className="font-semibold text-[#E6C27A]">
                Selected Node Has No Single-Point Coordinates:{' '}
              </span>
              <span className="text-text-primary">
                <strong>{selectedNode.name}</strong> ({selectedNode.category} ·{' '}
                {selectedNode.regionCode}) is a distributed supply-chain tier node rather than a single geographic location.
              </span>
            </div>
          </div>

          {upstreamPhysicalNodes.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-[#E6C27A]/90">
                Connected Physical Origins/Hubs:
              </span>
              {upstreamPhysicalNodes.map((physNode) => (
                <button
                  key={physNode.id}
                  type="button"
                  onClick={() => selectNode(physNode.id)}
                  data-testid={`map-upstream-physical-${physNode.id}`}
                  className="inline-flex items-center gap-1 rounded-sm border border-[#D5A653]/50 bg-recess px-2 py-0.5 font-mono text-[11px] font-semibold text-[#E6C27A] hover:border-[#F3EFE5] hover:text-text-primary"
                >
                  <MapPin className="h-3 w-3" aria-hidden="true" />
                  <span>{physNode.shortLabel}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tile Fallback Notice if Raster Tiles Failed */}
      {enableRasterTiles && tileLoadError && (
        <div
          data-testid="map-tile-fallback-notice"
          className="flex items-center justify-between border-b border-[#D5A653]/35 bg-[#D5A653]/10 px-4 py-1.5 text-xs text-[#E6C27A]"
        >
          <span>
            External raster map tiles are unreachable offline; automatically displaying the bundled Natural Earth CC0 vector basemap.
          </span>
        </div>
      )}

      {/* Main View: Interactive Cartographic SVG Canvas OR Accessible Tabular Matrix */}
      {viewMode === 'matrix' ? (
        <MapFallbackMatrix
          physicalNodes={physicalNodes}
          currentWeek={currentWeek}
          currentWeekNodeStates={currentWeekNodeStates}
          selectedNodeId={selectedNode.id}
          activeCorridorId={activeCorridor.id}
          onSelectNode={selectNode}
        />
      ) : (
        <div className="relative w-full overflow-x-auto bg-[#080E15]">
          <svg
            data-testid="world-map-svg"
            viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
            className={`block h-[430px] min-w-[780px] w-full select-none ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            role="img"
            aria-label={`Global map displaying ${physicalNodes.length} verified physical locations and ${CORRIDORS.length} trade corridors at Week ${currentWeek}`}
          >
            <defs>
              <radialGradient id="ocean-depth-grad" cx="50%" cy="45%" r="65%">
                <stop offset="0%" stopColor="#0E1824" />
                <stop offset="100%" stopColor="#070C12" />
              </radialGradient>
            </defs>

            {/* Ocean Background */}
            <rect
              x={0}
              y={0}
              width={MAP_WIDTH}
              height={MAP_HEIGHT}
              fill="url(#ocean-depth-grad)"
            />

            <g
              transform={`translate(${MAP_WIDTH / 2}, ${
                MAP_HEIGHT / 2
              }) scale(${zoom}) translate(${
                -MAP_WIDTH / 2 + pan.x
              }, ${-MAP_HEIGHT / 2 + pan.y})`}
            >
              {/* Optional Raster Tile Layer with Automatic Offline Vector Fallback */}
              {enableRasterTiles && !tileLoadError && (
                <image
                  href="https://basemaps.cartocdn.com/dark_nolabels/0/0/0.png"
                  x={0}
                  y={0}
                  width={MAP_WIDTH}
                  height={MAP_HEIGHT}
                  preserveAspectRatio="none"
                  opacity={0.35}
                  onError={() => setTileLoadError(true)}
                />
              )}

              {/* Cartographic Graticule Grid */}
              <g data-testid="map-graticule-layer">
                {graticuleMeridians.map((m) => (
                  <g key={`meridian-${m.lon}`}>
                    <line
                      x1={m.x}
                      y1={m.y1}
                      x2={m.x}
                      y2={m.y2}
                      stroke="#152333"
                      strokeWidth={m.lon === 0 ? 1.1 : 0.7}
                      strokeDasharray={m.lon === 0 ? '4 3' : undefined}
                    />
                    <text
                      x={m.x + 3}
                      y={MAP_HEIGHT - 8}
                      fill="#5A6C80"
                      fontSize="8.5"
                      fontFamily="monospace"
                    >
                      {m.lon > 0 ? `${m.lon}°E` : m.lon < 0 ? `${Math.abs(m.lon)}°W` : '0°'}
                    </text>
                  </g>
                ))}
                {graticuleParallels.map((p) => (
                  <g key={`parallel-${p.lat}`}>
                    <line
                      x1={p.x1}
                      y1={p.y}
                      x2={p.x2}
                      y2={p.y}
                      stroke={p.lat === 0 ? '#203349' : '#152333'}
                      strokeWidth={p.lat === 0 ? 1.1 : 0.7}
                      strokeDasharray={p.isEquatorOrTropic ? '4 3' : undefined}
                    />
                    <text
                      x={8}
                      y={p.y - 3}
                      fill="#5A6C80"
                      fontSize="8.5"
                      fontFamily="monospace"
                    >
                      {p.lat > 0
                        ? `${p.lat}°N`
                        : p.lat < 0
                          ? `${Math.abs(p.lat)}°S`
                          : 'Equator 0°'}
                    </text>
                  </g>
                ))}
              </g>

              {/* Bundled Natural Earth Continent Outlines */}
              <g data-testid="map-landmasses-layer">
                {landmassPolygons.map((poly) => (
                  <polygon
                    key={poly.id}
                    points={poly.points}
                    fill="#14202E"
                    stroke="#283A4F"
                    strokeWidth={1.1}
                    strokeLinejoin="round"
                  />
                ))}
              </g>

              {/* Ocean & Strait Labels */}
              <g>
                {OCEAN_WATER_LABELS.map((lbl) => {
                  const pt = projectLonLatToMap(
                    lbl.coordinates,
                    MAP_WIDTH,
                    MAP_HEIGHT,
                  );
                  const isStrait = !lbl.label.includes('OCEAN');
                  return (
                    <text
                      key={lbl.id}
                      x={pt.x}
                      y={pt.y}
                      textAnchor="middle"
                      fill={isStrait ? '#7E8D9E' : '#1E2F42'}
                      fontSize={isStrait ? '9.5' : '12'}
                      fontStyle={isStrait ? 'italic' : 'normal'}
                      fontWeight={isStrait ? '600' : '700'}
                      letterSpacing={isStrait ? '0.02em' : '0.18em'}
                    >
                      {lbl.label}
                    </text>
                  );
                })}
              </g>

              {/* Audited Maritime / Air Corridors Layer */}
              <g data-testid="map-corridors-layer">
                {CORRIDORS.map((corridor) => {
                  const isActiveScenarioCorridor =
                    corridor.id === activeCorridor.id;
                  const isInspected = corridor.id === effectiveCorridor.id;
                  const primarySegments = buildDatelineSafePolylineSegments(
                    corridor.primaryWaypoints,
                    MAP_WIDTH,
                    MAP_HEIGHT,
                  );
                  const bypassSegments = corridor.bypassWaypoints
                    ? buildDatelineSafePolylineSegments(
                        corridor.bypassWaypoints,
                        MAP_WIDTH,
                        MAP_HEIGHT,
                      )
                    : [];

                  const primaryColor = isActiveScenarioCorridor
                    ? scenarioParams.shockSeverityPct > 0
                      ? '#E05A6D'
                      : '#D5A653'
                    : isInspected
                      ? '#D5A653'
                      : '#526275';

                  const primaryOpacity =
                    isActiveScenarioCorridor || isInspected ? 0.95 : 0.45;

                  return (
                    <g
                      key={corridor.id}
                      data-testid={`map-corridor-${corridor.id}`}
                      data-corridor-id={corridor.id}
                      data-active-corridor={
                        isActiveScenarioCorridor ? 'true' : 'false'
                      }
                      data-map-interactive="true"
                      onClick={(e) => {
                        e.stopPropagation();
                        setInspectedCorridorId(corridor.id);
                      }}
                      className="cursor-pointer"
                    >
                      {/* Bypass Route Segments (if present) */}
                      {bypassSegments.map((pts, idx) => (
                        <polyline
                          key={`${corridor.id}-bypass-${idx}`}
                          data-testid={`map-corridor-bypass-${corridor.id}-${idx}`}
                          points={pts}
                          fill="none"
                          stroke="#38B688"
                          strokeWidth={
                            isActiveScenarioCorridor &&
                            scenarioParams.rerouteCapacityShare > 0
                              ? 2.6
                              : 1.5
                          }
                          strokeDasharray="6 4"
                          strokeOpacity={
                            isActiveScenarioCorridor
                              ? scenarioParams.rerouteCapacityShare > 0
                                ? 0.9
                                : 0.45
                              : 0.3
                          }
                        />
                      ))}

                      {/* Primary Corridor Glow & Polylines */}
                      {primarySegments.map((pts, idx) => (
                        <g key={`${corridor.id}-primary-${idx}`}>
                          {(isActiveScenarioCorridor || isInspected) && (
                            <polyline
                              points={pts}
                              fill="none"
                              stroke={primaryColor}
                              strokeWidth={7}
                              strokeOpacity={0.18}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          )}
                          <polyline
                            points={pts}
                            fill="none"
                            stroke={primaryColor}
                            strokeWidth={
                              isActiveScenarioCorridor
                                ? 3.2
                                : isInspected
                                  ? 2.5
                                  : 1.8
                            }
                            strokeOpacity={primaryOpacity}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </g>
                      ))}

                      {/* Waypoint Dots on Active/Inspected Corridor */}
                      {(isActiveScenarioCorridor || isInspected) &&
                        corridor.primaryWaypoints.map((wp, wpIdx) => {
                          const pt = projectLonLatToMap(
                            wp,
                            MAP_WIDTH,
                            MAP_HEIGHT,
                          );
                          return (
                            <circle
                              key={`${corridor.id}-wp-${wpIdx}`}
                              cx={pt.x}
                              cy={pt.y}
                              r={2.5}
                              fill="#0B1219"
                              stroke={primaryColor}
                              strokeWidth={1.5}
                            />
                          );
                        })}
                    </g>
                  );
                })}
              </g>

              {/* Verified Physical Node Markers (12 Total: 3 Chokepoints + 9 Regional Hubs) */}
              <g data-testid="map-markers-layer">
                {physicalNodes.map((node) => {
                  const pt = projectLonLatToMap(
                    node.coordinates,
                    MAP_WIDTH,
                    MAP_HEIGHT,
                  );
                  const state = currentWeekNodeStates[node.id];
                  const rei = state?.relativeExposureIndex ?? 0;
                  const cpi = state?.costPressureIndex ?? 0;
                  const band: SeverityBand = state?.severityBand ?? 'Baseline';
                  const colors = MARKER_SEVERITY_COLORS[band];

                  const isSelected = node.id === selectedNode.id;
                  const isOrigin = shockOriginSet.has(node.id);
                  const isUpstreamOfSelected =
                    !isSelectedNodePhysical &&
                    upstreamPhysicalNodes.some((n) => n.id === node.id);
                  const isChokepoint = node.category === 'chokepoint';

                  const radius = isChokepoint
                    ? 9 + Math.min(5, rei * 0.05)
                    : 6.5 + Math.min(4.5, rei * 0.045);

                  // Offset label slightly for closely clustered East Asian / Gulf nodes
                  let labelOffsetY = -(radius + 8);
                  let labelOffsetX = 0;
                  if (node.id === 'geo_gulf') {
                    labelOffsetX = -28;
                    labelOffsetY = 16;
                  } else if (node.id === 'chk_hormuz') {
                    labelOffsetX = 28;
                    labelOffsetY = -12;
                  } else if (node.id === 'geo_twn') {
                    labelOffsetX = 28;
                    labelOffsetY = 15;
                  } else if (node.id === 'chk_taiwan_fabs') {
                    labelOffsetX = -32;
                    labelOffsetY = -12;
                  } else if (node.id === 'geo_kor') {
                    labelOffsetX = -22;
                    labelOffsetY = -11;
                  } else if (node.id === 'geo_jpn') {
                    labelOffsetX = 26;
                    labelOffsetY = -8;
                  } else if (node.id === 'geo_chn') {
                    labelOffsetX = -30;
                    labelOffsetY = 4;
                  }

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${pt.x}, ${pt.y})`}
                      data-testid={`map-marker-${node.id}`}
                      data-node-id={node.id}
                      data-node-category={node.category}
                      data-selected={isSelected ? 'true' : 'false'}
                      data-severity-band={band}
                      data-map-interactive="true"
                      role="button"
                      tabIndex={0}
                      aria-label={`${node.name} (${
                        isChokepoint ? 'Chokepoint' : 'Regional Hub'
                      }) [${node.coordinates[0].toFixed(2)}, ${node.coordinates[1].toFixed(
                        2,
                      )}] — Week ${currentWeek} REI ${rei.toFixed(1)} (${band})`}
                      onClick={(e) => {
                        e.stopPropagation();
                        selectNode(node.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          selectNode(node.id);
                        }
                      }}
                      className="cursor-pointer focus:outline-none"
                    >
                      {/* Outer Halo for Shock Origin, Selected Node, or Upstream Feeder */}
                      {(isSelected ||
                        isOrigin ||
                        isUpstreamOfSelected ||
                        rei >= 20) && (
                        <circle
                          cx={0}
                          cy={0}
                          r={radius + (isSelected ? 7 : 5)}
                          fill={colors.halo}
                          stroke={
                            isSelected
                              ? '#D5A653'
                              : isUpstreamOfSelected
                                ? '#E6C27A'
                                : colors.stroke
                          }
                          strokeWidth={isSelected ? 2 : 1.2}
                          strokeDasharray={
                            isUpstreamOfSelected && !isSelected
                              ? '3 2'
                              : undefined
                          }
                        />
                      )}

                      {/* Marker Shape: Diamond for Chokepoints, Circle for Regional Trade Hubs */}
                      {isChokepoint ? (
                        <polygon
                          points={`0,${-radius} ${radius},0 0,${radius} ${-radius},0`}
                          fill={colors.fill}
                          stroke={isSelected ? '#D5A653' : colors.stroke}
                          strokeWidth={isSelected ? 2.5 : 2}
                        />
                      ) : (
                        <circle
                          cx={0}
                          cy={0}
                          r={radius}
                          fill={colors.fill}
                          stroke={isSelected ? '#D5A653' : colors.stroke}
                          strokeWidth={isSelected ? 2.5 : 1.8}
                        />
                      )}

                      {/* Inner Center Dot */}
                      <circle
                        cx={0}
                        cy={0}
                        r={2.2}
                        fill={isSelected ? '#F3EFE5' : colors.text}
                      />

                      {/* Marker Callout Tag */}
                      <g transform={`translate(${labelOffsetX}, ${labelOffsetY})`}>
                        <rect
                          x={-50}
                          y={-10}
                          width={100}
                          height={18}
                          rx={2}
                          fill="rgba(11, 18, 25, 0.93)"
                          stroke={
                            isSelected
                              ? '#D5A653'
                              : isOrigin
                                ? '#E05A6D'
                                : '#253548'
                          }
                          strokeWidth={isSelected ? 1.4 : 0.9}
                        />
                        <text
                          x={0}
                          y={2}
                          textAnchor="middle"
                          fill={isSelected ? '#F3EFE5' : colors.text}
                          fontSize="9.5"
                          fontWeight="600"
                          fontFamily="monospace"
                        >
                          {node.shortLabel.slice(0, 10)} · {Math.round(rei)}
                        </text>
                      </g>

                      {/* Native SVG Tooltip */}
                      <title>
                        {`${node.name} [${node.coordinates[0].toFixed(2)}°, ${node.coordinates[1].toFixed(2)}°] — Week ${currentWeek} REI: ${rei.toFixed(1)} (${band}), CPI: ${cpi.toFixed(1)}`}
                      </title>
                    </g>
                  );
                })}
              </g>
            </g>
          </svg>
        </div>
      )}

      {/* Inspected Corridor Detail Bar */}
      <div
        data-testid="map-corridor-inspector"
        className="border-t border-border-subtle bg-elevated/60 px-4 py-2.5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-sm border border-[#D5A653]/45 bg-[#D5A653]/14 px-2 py-0.5 font-mono text-[11px] font-semibold text-[#E6C27A]">
              Corridor · {effectiveCorridor.id}
            </span>
            <strong className="font-display font-semibold text-text-primary">
              {effectiveCorridor.name}
            </strong>
            <span className="font-mono text-[11px] text-[#80D8B6]">
              ({effectiveCorridor.baselineTransitDays}d primary
              {effectiveCorridor.bypassTransitDays
                ? ` · ${effectiveCorridor.bypassTransitDays}d bypass via ${
                    effectiveCorridor.bypassName ?? 'Alternate Route'
                  }`
                : ''}
              )
            </span>
            <span className="text-text-secondary">
              — {effectiveCorridor.description}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-text-muted">Origin Chokepoint:</span>
            {(() => {
              const chkNode = NODE_BY_ID.get(effectiveCorridor.chokepointNodeId);
              return (
                <button
                  type="button"
                  onClick={() => selectNode(effectiveCorridor.chokepointNodeId)}
                  className={`rounded-sm border px-2 py-0.5 font-mono text-[11px] transition-colors ${
                    selectedNode.id === effectiveCorridor.chokepointNodeId
                      ? 'border-[#D5A653] bg-[#D5A653]/20 text-[#F3EFE5] font-semibold'
                      : 'border-border-subtle bg-recess text-text-secondary hover:border-[#7CA3C7] hover:text-text-primary'
                  }`}
                >
                  {chkNode?.shortLabel ?? effectiveCorridor.chokepointNodeId}
                </button>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Map Legend & Basemap Attribution Footer */}
      <footer
        aria-label="Geographic Map Legend and Attribution"
        className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle bg-recess/95 px-4 py-2.5 text-[11px] text-text-secondary"
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono font-semibold uppercase tracking-wider text-text-muted">
            Map Symbols:
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rotate-45 border border-[#E05A6D] bg-[#471521]" />
            <span>Chokepoint (3)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full border border-[#7CA3C7] bg-[#162F42]" />
            <span>Regional Trade Hub (9)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 bg-[#E05A6D]" />
            <span>Shocked Corridor</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 border-b-2 border-dashed border-[#38B688]" />
            <span>Reroute Bypass Waypoints</span>
          </span>
        </div>

        <div
          data-testid="map-basemap-attribution"
          className="flex flex-wrap items-center gap-2 text-[11px] text-text-muted"
        >
          <Info className="h-3 w-3 text-[#D5A653]" aria-hidden="true" />
          <span>
            Basemap Attribution: Natural Earth 110m (CC0 Public Domain) · © OpenStreetMap contributors · © CARTO
          </span>
        </div>
      </footer>
    </section>
  );
};
