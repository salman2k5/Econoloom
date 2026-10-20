/**
 * EconoLoom Maritime & Air Trade Corridor Geometries
 *
 * Provides waypoint sequences ([longitude, latitude]) and transit-time baselines
 * for the three flagship chokepoint corridors and their physical bypass routes.
 */

import type { CorridorGeometry } from '../types/domain';

export const CORRIDORS: CorridorGeometry[] = [
  {
    id: 'cor_hormuz_asia_europe',
    name: 'Persian Gulf — Strait of Hormuz — East Asia & Europe Energy/Chemical Corridor',
    chokepointNodeId: 'chk_hormuz',
    primaryWaypoints: [
      [50.1, 26.3],   // Persian Gulf loading terminals (Ras Tanura / Ras Laffan)
      [56.25, 26.56], // Strait of Hormuz narrows
      [62.0, 22.5],   // Arabian Sea
      [79.8, 5.9],    // Southern Sri Lanka / Indian Ocean lane
      [103.8, 1.25],  // Strait of Malacca
      [121.5, 25.0],  // East China Sea / Northeast Asia
    ],
    bypassName: 'Saudi Petroline (East-West Pipeline to Yanbu) & Habshan-Fujairah Pipeline',
    bypassWaypoints: [
      [49.6, 25.9],   // Abqaiq / Eastern Province
      [38.06, 24.08], // Yanbu Red Sea terminal
      [43.3, 12.6],   // Bab el-Mandeb
      [62.0, 22.5],   // Arabian Sea
    ],
    baselineTransitDays: 18,
    bypassTransitDays: 25,
    description:
      'Carries ~20% of global petroleum liquids, ~20% of global LNG, and >45% of global seaborne elemental sulfur. Pipeline bypass is physically capped at ~22% of total Strait throughput and cannot carry LNG or bulk sulfur.',
  },
  {
    id: 'cor_taiwan_transpacific',
    name: 'Taiwan Foundry Cluster — Trans-Pacific & Intra-Asian High-Tech Air/Sea Corridor',
    chokepointNodeId: 'chk_taiwan_fabs',
    primaryWaypoints: [
      [120.97, 24.78], // Hsinchu / Tainan Science Parks & Taiwan Strait
      [126.9, 37.5],   // South Korea OSAT & Memory hub
      [139.7, 35.6],   // Japan wafer & specialty chemical hub
      [-122.4, 37.7],  // US West Coast / North American tech & automotive assembly
    ],
    bypassName: 'East-of-Taiwan Philippine Sea Reroute & Legacy Node Reallocation',
    bypassWaypoints: [
      [121.6, 24.0],   // East Coast Taiwan air/sea diversion
      [140.0, 30.0],   // Philippine Sea lane
      [-122.4, 37.7],  // Trans-Pacific arrival
    ],
    baselineTransitDays: 7,
    bypassTransitDays: 18,
    description:
      'Connects Taiwan sub-7nm logic and automotive microcontroller fabrication with packaging/testing hubs in Asia and electronics/automotive assembly in North America, Europe, and China.',
  },
  {
    id: 'cor_panama_canal_americas',
    name: 'Panama Canal Locks — U.S. Gulf/East Coast to Asia & West Coast South America Corridor',
    chokepointNodeId: 'chk_panama',
    primaryWaypoints: [
      [-90.0, 28.5],   // U.S. Gulf Coast (Sabine Pass LNG / New Orleans grain)
      [-79.9, 9.35],   // Panama Canal Atlantic entrance (Gatun Locks)
      [-79.55, 8.95],  // Panama Canal Pacific exit (Cocoli / Miraflores Locks)
      [-71.6, -33.0],  // West Coast South America (Chile/Peru copper ports)
      [139.7, 35.6],   // Northeast Asia LNG & grain discharging ports
    ],
    bypassName: 'Cape Horn / Strait of Magellan & Suez/Cape of Good Hope Long-Haul Reroute',
    bypassWaypoints: [
      [-90.0, 28.5],   // U.S. Gulf Coast
      [-35.0, -5.0],   // Equatorial Atlantic
      [-67.2, -55.9],  // Cape Horn
      [139.7, 35.6],   // Trans-Pacific to East Asia
    ],
    baselineTransitDays: 22,
    bypassTransitDays: 38,
    description:
      'Links U.S. Gulf grain, LNG, and chemical exports to Asia, East Coast North America container imports, and Andean copper concentrate exports to Atlantic smelters. Rerouting via Cape Horn or Cape of Good Hope adds 14–18 days of vessel steaming.',
  },
];
