// The stage-select map, from real coordinates. Landmarks and streets are lat/lon
// (Wikipedia / OSM); `project` turns them into pixels on the map panel with a
// single scale so distances are true. Sources: Sears Tower (Observatory)
// 42.38146,-71.12837; Peabody Museum 42.37819,-71.11481; Memorial Hall
// 42.37589,-71.11492; University Hall 42.37444,-71.11706; Felipe's 42.37347,
// -71.12051 (latlong.net); Science Center ~42.3766,-71.1160 (OSM, no Wikipedia figure).

export interface LatLon {
  lat: number;
  lon: number;
}

export const MAP_PANEL = { w: 256, h: 288 };

// Bounds: a hair past the Observatory on the west, Divinity Ave on the east, the
// river on the south, Observatory Hill on the north. One scale for both axes.
const WEST = -71.1305;
const EAST = -71.1115;
const SOUTH = 42.3705;
const NORTH = 42.3830;
const COS_LAT = Math.cos((42.377 * Math.PI) / 180);
const KM_PER_DEG = 111.32;
const SCALE = Math.min(MAP_PANEL.w / ((EAST - WEST) * KM_PER_DEG * COS_LAT), MAP_PANEL.h / ((NORTH - SOUTH) * KM_PER_DEG)); // px per km
export const PX_PER_KM = SCALE;

// Bearings and ordering from the Yard are exact; distance is compressed
// (d -> d^RADIAL_POWER) so the four stages within 400 m of the Yard spread out and
// the Observatory, 1.3 km up Garden St, still fits on the panel. A hand-drawn
// map does the same thing. RADIAL_POWER = 1 is true scale.
export const RADIAL_POWER = 0.62;
const CENTER = { lat: 42.374444, lon: -71.117056 }; // University Hall
const CENTER_PX = { x: 150, y: 190 }; // where the Yard sits on the panel
const RADIAL_SCALE = 118; // px per km^RADIAL_POWER

export function project(p: LatLon): { x: number; y: number } {
  const ex = (p.lon - CENTER.lon) * KM_PER_DEG * COS_LAT; // km east
  const ny = (p.lat - CENTER.lat) * KM_PER_DEG; // km north
  const d = Math.hypot(ex, ny);
  if (d === 0) return { ...CENTER_PX };
  const r = Math.pow(d, RADIAL_POWER) * RADIAL_SCALE;
  return { x: Math.round(CENTER_PX.x + (ex / d) * r), y: Math.round(CENTER_PX.y - (ny / d) * r) };
}

// True-scale projection, kept for reference and tests.
export function projectTrue(p: LatLon): { x: number; y: number } {
  const x = (p.lon - WEST) * KM_PER_DEG * COS_LAT * SCALE;
  const y = (NORTH - p.lat) * KM_PER_DEG * SCALE;
  return { x: Math.round(x), y: Math.round(y) };
}

export const LANDMARKS = {
  universityHall: { lat: 42.374444, lon: -71.117056 }, // the statue: home
  scienceCenter: { lat: 42.3766, lon: -71.116 },
  memorialHall: { lat: 42.375889, lon: -71.114917 }, // Annenberg
  peabody: { lat: 42.378194, lon: -71.114806 }, // the dig
  observatory: { lat: 42.381461, lon: -71.128369 },
  felipes: { lat: 42.373471, lon: -71.120511 },
  harvardSquare: { lat: 42.3733, lon: -71.1190 }, // the T / the Pit
};

// Streets as polylines, roughly traced. Enough to orient, not a survey.
export const STREETS: { name: string; pts: LatLon[]; major?: boolean }[] = [
  { name: 'Mass Ave (SE)', major: true, pts: [{ lat: 42.3733, lon: -71.119 }, { lat: 42.3729, lon: -71.1165 }, { lat: 42.3724, lon: -71.114 }, { lat: 42.3718, lon: -71.1115 }] },
  { name: 'Mass Ave (NW)', major: true, pts: [{ lat: 42.3733, lon: -71.119 }, { lat: 42.3750, lon: -71.1192 }, { lat: 42.3762, lon: -71.1208 }, { lat: 42.3785, lon: -71.1245 }, { lat: 42.3830, lon: -71.1295 }] },
  { name: 'Garden St', pts: [{ lat: 42.3754, lon: -71.1200 }, { lat: 42.3775, lon: -71.1232 }, { lat: 42.3800, lon: -71.1265 }, { lat: 42.3830, lon: -71.1300 }] },
  { name: 'Brattle St', pts: [{ lat: 42.3733, lon: -71.119 }, { lat: 42.3737, lon: -71.1215 }, { lat: 42.3745, lon: -71.1250 }, { lat: 42.3760, lon: -71.1305 }] },
  { name: 'Cambridge St / Broadway', pts: [{ lat: 42.3758, lon: -71.1195 }, { lat: 42.3764, lon: -71.1172 }, { lat: 42.3758, lon: -71.1150 }, { lat: 42.3748, lon: -71.1115 }] },
  { name: 'Kirkland St', pts: [{ lat: 42.3770, lon: -71.1165 }, { lat: 42.3772, lon: -71.1140 }, { lat: 42.3778, lon: -71.1115 }] },
  { name: 'Oxford St', pts: [{ lat: 42.3767, lon: -71.1167 }, { lat: 42.3790, lon: -71.1160 }, { lat: 42.3815, lon: -71.1152 }] },
  { name: 'Divinity Ave', pts: [{ lat: 42.3772, lon: -71.1148 }, { lat: 42.3795, lon: -71.1143 }] },
  { name: 'Quincy St', pts: [{ lat: 42.3733, lon: -71.1148 }, { lat: 42.3755, lon: -71.1146 }] },
  { name: 'JFK St', pts: [{ lat: 42.3733, lon: -71.119 }, { lat: 42.3718, lon: -71.1205 }, { lat: 42.3705, lon: -71.1215 }] },
  { name: 'Mt Auburn St', pts: [{ lat: 42.3725, lon: -71.1230 }, { lat: 42.3728, lon: -71.1195 }, { lat: 42.3727, lon: -71.1165 }, { lat: 42.3722, lon: -71.1130 }] },
];

// Harvard Yard, as a polygon (roughly: Mass Ave south, Peabody St / Broadway north, Quincy east).
export const YARD: LatLon[] = [
  { lat: 42.3737, lon: -71.1190 },
  { lat: 42.3756, lon: -71.1196 },
  { lat: 42.3760, lon: -71.1165 },
  { lat: 42.3752, lon: -71.1147 },
  { lat: 42.3731, lon: -71.1150 },
];

// The Common, north-west of the Yard across Mass Ave.
export const COMMON: LatLon[] = [
  { lat: 42.3752, lon: -71.1200 },
  { lat: 42.3758, lon: -71.1200 },
  { lat: 42.3775, lon: -71.1240 },
  { lat: 42.3768, lon: -71.1250 },
];

// The Charles, along the bottom.
export const RIVER: LatLon[] = [
  { lat: 42.3705, lon: -71.1305 },
  { lat: 42.3700, lon: -71.1230 },
  { lat: 42.3695, lon: -71.1180 },
  { lat: 42.3690, lon: -71.1115 },
];
