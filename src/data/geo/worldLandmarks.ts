export type GeoCoordinates = readonly [number, number];

export interface LandmassPolygon {
  id: string;
  name: string;
  coordinates: readonly GeoCoordinates[];
}

export interface OceanWaterLabel {
  id: string;
  label: string;
  coordinates: GeoCoordinates;
}

/**
 * Simplified Natural Earth (CC0 Public Domain) landmass outlines in [lon, lat]
 * coordinates for 100% offline-capable dark-theme cartographic rendering.
 */
export const WORLD_LANDMASS_POLYGONS: readonly LandmassPolygon[] = [
  {
    id: 'north_america',
    name: 'North America',
    coordinates: [
      [-168, 66],
      [-162, 71],
      [-140, 70],
      [-125, 70],
      [-110, 73],
      [-85, 73],
      [-65, 66],
      [-55, 52],
      [-60, 46],
      [-67, 45],
      [-70, 42],
      [-75, 35],
      [-80, 32],
      [-81, 25],
      [-83, 29],
      [-90, 29],
      [-97, 26],
      [-96, 19],
      [-87, 21],
      [-88, 16],
      [-83, 10],
      [-79.5, 9.1],
      [-85, 11],
      [-92, 14],
      [-105, 20],
      [-110, 24],
      [-114, 31],
      [-117, 32.5],
      [-122.5, 37.8],
      [-124.5, 48],
      [-135, 58],
      [-150, 60],
      [-162, 55],
      [-166, 60],
    ],
  },
  {
    id: 'greenland',
    name: 'Greenland',
    coordinates: [
      [-52, 60],
      [-43, 60],
      [-22, 70],
      [-18, 78],
      [-32, 82],
      [-60, 81],
      [-70, 76],
      [-56, 70],
    ],
  },
  {
    id: 'south_america',
    name: 'South America',
    coordinates: [
      [-79.5, 9.0],
      [-75, 11],
      [-62, 10.5],
      [-50, 2],
      [-35, -6],
      [-38, -13],
      [-40, -22],
      [-48, -28],
      [-54, -34],
      [-62, -40],
      [-66, -48],
      [-68, -55],
      [-74, -52],
      [-73, -40],
      [-71, -30],
      [-70, -18],
      [-77, -12],
      [-81, -5],
      [-78, 4],
    ],
  },
  {
    id: 'europe',
    name: 'Europe',
    coordinates: [
      [-9.5, 37],
      [-9, 43],
      [-2, 43.5],
      [-4.5, 48],
      [2, 51],
      [8.5, 54],
      [10, 58],
      [5, 60],
      [10, 64],
      [18, 70],
      [28, 71],
      [42, 68],
      [58, 69],
      [60, 55],
      [48, 46],
      [38, 45],
      [29, 41],
      [26, 40],
      [23, 37],
      [19, 40],
      [16, 38],
      [12.5, 42],
      [9, 44],
      [5, 43],
      [0, 38],
      [-5.5, 36],
    ],
  },
  {
    id: 'uk_ireland',
    name: 'British Isles',
    coordinates: [
      [-6, 50],
      [1.5, 51],
      [0, 54],
      [-3, 58.5],
      [-6, 58],
      [-5, 54],
    ],
  },
  {
    id: 'africa',
    name: 'Africa',
    coordinates: [
      [-17, 15],
      [-13, 28],
      [-6, 35.8],
      [10, 37],
      [11, 33],
      [25, 32],
      [32.5, 31.2],
      [35, 24],
      [41, 15],
      [43.5, 12],
      [51, 12],
      [49, 4],
      [40, -5],
      [40, -16],
      [35, -24],
      [28, -33],
      [18.5, -34.5],
      [15, -26],
      [12, -16],
      [9, -2],
      [5, 5],
      [-7.5, 4.5],
      [-13, 9],
    ],
  },
  {
    id: 'middle_east_asia',
    name: 'Asia & Arabian Peninsula',
    coordinates: [
      [26, 40],
      [35, 37],
      [34.5, 31.5],
      [39, 22],
      [43.8, 12.6],
      [53, 16.5],
      [59.5, 22.5],
      [56.3, 26.3],
      [51, 24.5],
      [48.5, 29.9],
      [50.5, 30],
      [56.5, 27.1],
      [62, 25.2],
      [67, 24.8],
      [72.8, 19.1],
      [77.5, 8.1],
      [80.3, 13.1],
      [88.5, 22],
      [92, 20],
      [98, 16],
      [100.5, 13.5],
      [103.8, 1.3],
      [104, 4],
      [103, 11],
      [109, 13],
      [108, 17],
      [109, 21.5],
      [114, 22.3],
      [118, 24.5],
      [121.8, 31.2],
      [120, 35],
      [122, 37.5],
      [119, 39.5],
      [124, 40],
      [126.5, 37.5],
      [129, 35.1],
      [129.5, 38],
      [132, 43],
      [140, 51],
      [143, 59],
      [160, 60],
      [178, 66],
      [170, 70],
      [130, 72],
      [95, 74],
      [68, 70],
      [60, 68],
      [58, 55],
      [48, 46],
      [38, 44],
      [30, 41],
    ],
  },
  {
    id: 'japan_archipelago',
    name: 'Japan',
    coordinates: [
      [130.5, 31.5],
      [134, 33.5],
      [136.8, 34.5],
      [139.8, 35.6],
      [141.0, 38.3],
      [141.5, 41.4],
      [145.0, 43.3],
      [141.8, 45.2],
      [139.8, 40.5],
      [136.5, 36.5],
      [131.0, 34.0],
    ],
  },
  {
    id: 'taiwan_island',
    name: 'Taiwan',
    coordinates: [
      [120.1, 22.9],
      [120.8, 21.9],
      [121.6, 23.9],
      [121.9, 25.1],
      [121.0, 24.9],
    ],
  },
  {
    id: 'maritime_se_asia',
    name: 'Maritime Southeast Asia',
    coordinates: [
      [95.5, 5.5],
      [104.5, -2.5],
      [114.5, -7.8],
      [118, -8.5],
      [117, 4.5],
      [112, 1.5],
      [109, -1],
      [101, 2],
    ],
  },
  {
    id: 'australia',
    name: 'Australia',
    coordinates: [
      [114, -22],
      [122, -17],
      [131, -12],
      [136, -12],
      [142, -11],
      [146, -18],
      [153, -27],
      [150, -37],
      [141, -38],
      [135, -35],
      [129, -32],
      [116, -34],
      [114, -28],
    ],
  },
];

export const OCEAN_WATER_LABELS: readonly OceanWaterLabel[] = [
  { id: 'lbl_pacific', label: 'PACIFIC OCEAN', coordinates: [-152, 16] },
  { id: 'lbl_atlantic', label: 'ATLANTIC OCEAN', coordinates: [-36, 24] },
  { id: 'lbl_indian', label: 'INDIAN OCEAN', coordinates: [78, -14] },
  { id: 'lbl_hormuz', label: 'Strait of Hormuz', coordinates: [58.5, 23.2] },
  { id: 'lbl_taiwan_strait', label: 'Taiwan Strait', coordinates: [118.5, 22.5] },
  { id: 'lbl_panama_canal', label: 'Panama Canal', coordinates: [-82.5, 5.8] },
];

export const MAP_WIDTH = 1080;
export const MAP_HEIGHT = 500;

/**
 * Equirectangular cartographic projection mapping [longitude, latitude]
 * in [-180..180, -68..78] onto the [0..MAP_WIDTH, 0..MAP_HEIGHT] viewport.
 */
export function projectLonLatToMap(
  coords: GeoCoordinates,
  width: number = MAP_WIDTH,
  height: number = MAP_HEIGHT,
): { x: number; y: number } {
  const [lon, lat] = coords;
  const clampedLon = Math.max(-180, Math.min(180, lon));
  const minLat = -65;
  const maxLat = 78;
  const clampedLat = Math.max(minLat, Math.min(maxLat, lat));

  const x = ((clampedLon + 180) / 360) * width;
  const y = ((maxLat - clampedLat) / (maxLat - minLat)) * height;
  return {
    x: Math.round(x * 10) / 10,
    y: Math.round(y * 10) / 10,
  };
}

/**
 * Converts a sequence of [lon, lat] corridor waypoints into one or more SVG
 * polyline point strings, automatically splitting segments that cross the
 * International Date Line (±180° longitude) so trans-Pacific corridors render
 * across the Pacific rather than cutting backward across Eurasia.
 */
export function buildDatelineSafePolylineSegments(
  waypoints: readonly GeoCoordinates[],
  width: number = MAP_WIDTH,
  height: number = MAP_HEIGHT,
): string[] {
  if (waypoints.length === 0) return [];
  const segments: GeoCoordinates[][] = [];
  let currentSegment: GeoCoordinates[] = [waypoints[0]!];

  for (let i = 1; i < waypoints.length; i += 1) {
    const prev = waypoints[i - 1]!;
    const curr = waypoints[i]!;
    const [lon1, lat1] = prev;
    const [lon2, lat2] = curr;
    const deltaLon = lon2 - lon1;

    if (Math.abs(deltaLon) > 180) {
      // Segment crosses the ±180° antimeridian
      if (lon1 > 0 && lon2 < 0) {
        const distTo180 = 180 - lon1;
        const distFromNeg180 = lon2 - -180;
        const totalWrappedLon = distTo180 + distFromNeg180;
        const ratio =
          totalWrappedLon > 0 ? distTo180 / totalWrappedLon : 0.5;
        const midLat = lat1 + (lat2 - lat1) * ratio;

        currentSegment.push([180, midLat]);
        segments.push(currentSegment);
        currentSegment = [
          [-180, midLat],
          [lon2, lat2],
        ];
      } else {
        const distToNeg180 = lon1 - -180;
        const distFrom180 = 180 - lon2;
        const totalWrappedLon = distToNeg180 + distFrom180;
        const ratio =
          totalWrappedLon > 0 ? distToNeg180 / totalWrappedLon : 0.5;
        const midLat = lat1 + (lat2 - lat1) * ratio;

        currentSegment.push([-180, midLat]);
        segments.push(currentSegment);
        currentSegment = [
          [180, midLat],
          [lon2, lat2],
        ];
      }
    } else {
      currentSegment.push(curr);
    }
  }

  if (currentSegment.length > 0) {
    segments.push(currentSegment);
  }

  return segments
    .filter((seg) => seg.length >= 2)
    .map((seg) =>
      seg
        .map((pt) => {
          const { x, y } = projectLonLatToMap(pt, width, height);
          return `${x},${y}`;
        })
        .join(' '),
    );
}

/**
 * Type guard verifying whether a network node has valid physical [lon, lat] coordinates.
 */
export function hasValidCoordinates(
  coords: GeoCoordinates | undefined,
): coords is GeoCoordinates {
  if (!coords || !Array.isArray(coords) || coords.length !== 2) return false;
  const [lon, lat] = coords;
  return (
    typeof lon === 'number' &&
    typeof lat === 'number' &&
    Number.isFinite(lon) &&
    Number.isFinite(lat) &&
    lon >= -180 &&
    lon <= 180 &&
    lat >= -90 &&
    lat <= 90
  );
}
