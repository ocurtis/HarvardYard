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
