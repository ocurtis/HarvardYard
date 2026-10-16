// Harvard Yard, 24x13 tiles. Legend in src/sim/map.ts.
//   .  grass (buildable)
//   =  path (walkable, not buildable)
//   T  tree (blocks)
//   S  statue (2x2, blocks)
//   F  foot tile (where tourists pay; walkable)
//   G  gate (spawn / exit)
//   Y  tour guide tile (adjacency buff, walkable, not buildable)
//
// Rows are top to bottom. Every row must be exactly 24 characters.
export const YARD_MAP = `
TTTTTT..TT......TT..TTTT
T......==.......==.....T
T.TT...==..TTT..==..TT.T
G======================G
T.TT...==..T....==..TT.T
T......==..T....==.....T
T..T...====.SS..===....T
T......==.T.SS..==..T..T
T.TT...==...F...==..TT.T
T......==...Y...==.....T
T.TT...==.......==..TT.T
T......==.......==.....T
TTTTTT..TT......TT..TTTT
`;
