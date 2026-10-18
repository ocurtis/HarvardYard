// Harvard Yard, 24x18 tiles. Owen's draft (2026-10-16): statue at the bottom
// in front of University Hall, main gate at the top, side gates left and right,
// a perimeter route around two inner loops. Claude added G/F/Y tiles.
//
// Legend (src/sim/map.ts):
//   .  grass (buildable)
//   =  path (enemies and tourists walk only on these)
//   T  tree (blocks)
//   B  building (blocks)
//   S  statue (2x2, blocks)
//   F  foot tile (where tourists pay; walkable path)
//   G  gate (bros and tourists spawn here; tourists may also leave here)
//   E  exit (tourists leave here; nothing spawns)
//   Y  tour guide tile (adjacency buff, walkable, not buildable)
//
// Rows are top to bottom. Every row must be exactly 24 characters.
// Paths are 4-connected on purpose; pathing never cuts corners through grass.
// Named buildings as tile boxes (inclusive). Each gets a nameplate and a photo
// spot: the lane tile nearest its center. University Hall is the statue's
// backdrop, not a destination.
export interface BuildingDef {
  name: string; // full, for the nameplate
  short: string; // <= 7 chars, for the guide's label
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  destination: boolean;
}

export const BUILDINGS: BuildingDef[] = [
  { name: 'Mass Hall', short: 'MASS', x0: 0, y0: 0, x1: 9, y1: 1, destination: true },
  { name: 'Harvard Hall', short: 'HARVARD', x0: 13, y0: 0, x1: 23, y1: 1, destination: true },
  { name: 'Weld', short: 'WELD', x0: 0, y0: 5, x1: 0, y1: 13, destination: true },
  { name: 'Thayer', short: 'THAYER', x0: 22, y0: 5, x1: 23, y1: 13, destination: true },
  { name: 'University Hall', short: 'UNIV', x0: 8, y0: 17, x1: 17, y1: 17, destination: false },
];

export const YARD_MAP = `
BBBBBBBBBB.G.BBBBBBBBBBB
BBBBBBBBBB.=.BBBBBBBBBBB
...........=............
G====...======...======G
..=.=...=....=...=..=...
B.=.=...=....=...=..=.BB
B.=.=...=....=...=..=.BB
B.=.=...=....=...=..=.BB
B.=.=...=....=...=..=.BB
B.=.=...=....=...=..=.BB
B.=.=...=....=...=..=.BB
B.=.=====....=====..=.BB
B.=.................=.BB
B.=.................=.BB
B.==========F========...
......=....=SS=.Y..=....
......=....=SS=....=....
......E.BBBBBBBBBB.E....
`;
