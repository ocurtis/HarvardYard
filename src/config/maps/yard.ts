// Harvard Yard (the Old Yard), 24x18 tiles, rotated so the John Harvard
// statue sits at the bottom facing up into the Yard. University Hall is the
// bottom wall. Johnston Gate is the top entrance; a north gate is on the right.
//
// Buildings, clockwise from top-left: Massachusetts Hall, [Johnston Gate],
// Harvard Hall, Stoughton, Hollis, Thayer, [University Hall], Weld, Matthews.
//
// Legend (src/sim/map.ts):
//   .  grass (buildable)
//   =  path (enemies and tourists walk only on these)
//   T  tree (blocks)
//   B  building (blocks)
//   S  statue (2x2, blocks)
//   F  foot tile (where tourists pay; walkable path)
//   G  gate (spawn / exit)
//   Y  tour guide tile (adjacency buff, walkable, not buildable)
//
// Rows are top to bottom. Every row must be exactly 24 characters.
// Paths are 4-connected on purpose; pathing never cuts corners through grass.
export const YARD_MAP = `
TBBBBBT...G...TBBBBBT.TT
TBBBBBT..===..TBBBBBT..T
T.....====.==.........BT
T.....==...==.......BBBT
TBBB.==.....==......BBBT
TBBB.=.......==========G
TBBB.=........==.......T
T....==........==..BBB.T
T.BBB.=.........=..BBB.T
T.BBB.=.........=..BBB.T
T.BBB.=.........=..BBB.T
T.....=.........=....T.T
T.....=.........=......T
T.....=.........=.....TT
T.....=======F===..BBB.T
T..........=SS=..Y.BBB.T
T..........=SS=....BBB.T
TTTTTBBBBBBBBBBBBBBTTTTT
`;
