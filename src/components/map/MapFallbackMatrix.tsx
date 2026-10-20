import React from 'react';
import { Globe, MapPin, Navigation } from 'lucide-react';
import { CORRIDORS, EDGES, NODE_BY_ID } from '../../data';
import { hasValidCoordinates } from '../../data/geo/worldLandmarks';
import type { NetworkNode } from '../../types/domain';
import type { NodeWeeklyState } from '../../types/simulation';
import { SeverityBadge } from '../common/SeverityBadge';

interface MapFallbackMatrixProps {
  physicalNodes: readonly NetworkNode[];
  currentWeek: number;
  currentWeekNodeStates: Record<string, NodeWeeklyState>;
  selectedNodeId: string;
  activeCorridorId: string;
  onSelectNode: (nodeId: string) => void;
}

export const MapFallbackMatrix: React.FC<MapFallbackMatrixProps> = ({
  physicalNodes,
  currentWeek,
  currentWeekNodeStates,
  selectedNodeId,
  activeCorridorId,
  onSelectNode,
}) => {
  return (
    <div
      data-testid="map-fallback-matrix"
      className="space-y-4 bg-recess/90 p-4"
    >
      {/* Corridors Table */}
      <div className="rounded-sm border border-border-subtle bg-panel p-3">
        <div className="mb-2 flex items-center gap-2">
          <Navigation className="h-4 w-4 text-[#D5A653]" aria-hidden="true" />
          <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-text-primary">
            Audited Physical Trade Corridors ({CORRIDORS.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border-subtle font-mono text-[11px] uppercase text-text-muted">
                <th className="py-1.5 pr-3">Corridor</th>
                <th className="py-1.5 px-3">Transit Baseline / Bypass</th>
                <th className="py-1.5 px-3">Waypoints</th>
                <th className="py-1.5 pl-3">Connected Physical Nodes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/60">
              {CORRIDORS.map((corridor) => {
                const isActive = corridor.id === activeCorridorId;
                const connectedNodeIds = Array.from(
                  new Set([
                    corridor.chokepointNodeId,
                    ...EDGES.filter((e) => e.corridorId === corridor.id).flatMap(
                      (e) => [e.sourceNodeId, e.targetNodeId],
                    ),
                  ]),
                ).filter((nId) => hasValidCoordinates(NODE_BY_ID.get(nId)?.coordinates));

                return (
                  <tr
                    key={corridor.id}
                    className={isActive ? 'bg-[#D5A653]/12' : ''}
                  >
                    <td className="py-2 pr-3 font-medium text-text-primary">
                      <div className="flex items-center gap-1.5">
                        <span className="font-display font-semibold">{corridor.name}</span>
                        {isActive && (
                          <span className="rounded-sm bg-[#D5A653]/20 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#E6C27A]">
                            ACTIVE SCENARIO
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] text-text-secondary">
                        {corridor.description}
                      </p>
                    </td>
                    <td className="py-2 px-3 font-mono text-[11px] text-text-secondary tabular-nums">
                      {corridor.baselineTransitDays}d primary
                      {corridor.bypassTransitDays
                        ? ` · ${corridor.bypassTransitDays}d bypass`
                        : ''}
                    </td>
                    <td className="py-2 px-3 font-mono text-[11px] text-text-secondary">
                      {corridor.primaryWaypoints.length} primary ·{' '}
                      {corridor.bypassWaypoints?.length ?? 0} bypass
                    </td>
                    <td className="py-2 pl-3">
                      <div className="flex flex-wrap gap-1">
                        {connectedNodeIds.map((nId) => (
                          <button
                            key={nId}
                            type="button"
                            onClick={() => onSelectNode(nId)}
                            className="rounded-sm border border-border-subtle bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-[#E6C27A] hover:border-[#D5A653]"
                          >
                            {NODE_BY_ID.get(nId)?.shortLabel ?? nId}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Physical Nodes Table */}
      <div className="rounded-sm border border-border-subtle bg-panel p-3">
        <div className="mb-2 flex items-center gap-2">
          <Globe className="h-4 w-4 text-[#D5A653]" aria-hidden="true" />
          <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-text-primary">
            Verified Physical Locations ({physicalNodes.length} Nodes · Week{' '}
            {currentWeek})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border-subtle font-mono text-[11px] uppercase text-text-muted">
                <th className="py-1.5 pr-3">Node</th>
                <th className="py-1.5 px-3">Category</th>
                <th className="py-1.5 px-3">Region</th>
                <th className="py-1.5 px-3">Coordinates [Lon, Lat]</th>
                <th className="py-1.5 px-3">Week {currentWeek} REI</th>
                <th className="py-1.5 px-3">Week {currentWeek} CPI</th>
                <th className="py-1.5 pl-3">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/60">
              {physicalNodes.map((node) => {
                const state = currentWeekNodeStates[node.id];
                const rei = state?.relativeExposureIndex ?? 0;
                const cpi = state?.costPressureIndex ?? 0;
                const band = state?.severityBand ?? 'Baseline';
                const isSelected = node.id === selectedNodeId;
                const coords = hasValidCoordinates(node.coordinates)
                  ? node.coordinates
                  : null;

                return (
                  <tr
                    key={node.id}
                    onClick={() => onSelectNode(node.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#D5A653]/15'
                        : 'hover:bg-elevated/60'
                    }`}
                  >
                    <td className="py-2 pr-3 font-medium text-text-primary">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin
                          className={`h-3.5 w-3.5 ${
                            node.category === 'chokepoint'
                              ? 'text-[#E05A6D]'
                              : 'text-[#7CA3C7]'
                          }`}
                          aria-hidden="true"
                        />
                        <span className="font-display font-semibold">{node.name}</span>
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono text-[11px] text-text-secondary">
                      {node.category === 'chokepoint'
                        ? 'Chokepoint'
                        : 'Regional Hub'}
                    </td>
                    <td className="py-2 px-3 font-mono text-[11px] text-text-secondary">
                      {node.regionCode}
                    </td>
                    <td className="py-2 px-3 font-mono text-[11px] text-text-secondary tabular-nums">
                      {coords
                        ? `[${coords[0].toFixed(2)}°, ${coords[1].toFixed(2)}°]`
                        : 'N/A'}
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-text-primary tabular-nums">
                      {rei.toFixed(1)}
                    </td>
                    <td className="py-2 px-3 font-mono text-text-secondary tabular-nums">
                      {cpi.toFixed(1)}
                    </td>
                    <td className="py-2 pl-3">
                      <SeverityBadge band={band} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
