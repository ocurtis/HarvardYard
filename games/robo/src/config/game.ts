// Every tunable number for Robo (working title) lives in src/config/. No magic numbers in the sim.

export const SLUG = 'robo'; // games/robo, public/robo
export const TICK_RATE = 60;
export const TICK_MS = 1000 / TICK_RATE;
export const PLAYER_COUNT_DEFAULT = 1;

export const LOGICAL_W = 384;
export const LOGICAL_H = 288;

// The stage select, Mega Man X style: a 5x5 grid of framed cells. The middle 3x3
// is a painted map of Harvard Square (168px, big enough for the 48px bases); the
// 16 cells around it are boss portraits, info panels, locked slots and the logo.
export const GRID = {
  cell: 56,
  n: 5,
  x0: 52, // 5 cells = 280 wide, centered in 384
  y0: 4, // 280 tall, in 288
};

// Which grid cell each thing sits in (col, row). Corners: info/logo. Edges: bosses or locked.
export type SlotKind = 'boss' | 'locked' | 'panel' | 'logo';
export interface SlotDef {
  col: number;
  row: number;
  kind: SlotKind;
  stage?: string; // stage id for bosses
  label?: string; // panel text
}
export const SLOTS: SlotDef[] = [
  { col: 0, row: 0, kind: 'panel', label: 'STAGE' },
  { col: 1, row: 0, kind: 'boss', stage: 'science' },
  { col: 2, row: 0, kind: 'locked' },
  { col: 3, row: 0, kind: 'boss', stage: 'annenberg' },
  { col: 4, row: 0, kind: 'panel', label: 'MAP' },
  { col: 0, row: 1, kind: 'locked' },
  { col: 4, row: 1, kind: 'locked' },
  { col: 0, row: 2, kind: 'boss', stage: 'felipes' },
  { col: 4, row: 2, kind: 'boss', stage: 'kong' },
  { col: 0, row: 3, kind: 'locked' },
  { col: 4, row: 3, kind: 'locked' },
  { col: 0, row: 4, kind: 'panel', label: 'SPEC' },
  { col: 1, row: 4, kind: 'locked' },
  { col: 2, row: 4, kind: 'boss', stage: 'yard' },
  { col: 3, row: 4, kind: 'locked' },
  { col: 4, row: 4, kind: 'logo' },
];

// Stages. `map` is where the base's feet sit on the painted map (pixels within the 168x168 map).
export interface StageDef {
  id: string;
  stage: string; // the place
  boss: string; // placeholder boss name, 8 chars max (the STAGE panel)
  short: string; // the MAP panel, 8 chars max
  map: { x: number; y: number };
  color: number; // placeholder portrait color (UFO 50)
  shape: 'round' | 'square' | 'spike' | 'tall' | 'wide' | 'diamond';
}

// General positioning, not geography: the Yard in the middle, the Science Center
// above it, Annenberg up and to the right, Felipe's down-left by the Square,
// the Kong down-right along Mass Ave, the river along the bottom.
export const STAGES: StageDef[] = [
  { id: 'science', stage: 'SCIENCE CENTER', boss: 'TESLA', short: 'SCIENCE', map: { x: 70, y: 62 }, color: 0x27badb, shape: 'spike' },
  { id: 'annenberg', stage: 'ANNENBERG HALL', boss: 'THE DEAN', short: 'MEM HALL', map: { x: 134, y: 58 }, color: 0xe8ea4a, shape: 'tall' },
  { id: 'kong', stage: 'THE KONG', boss: 'SCORPION', short: 'THE KONG', map: { x: 138, y: 128 }, color: 0xe03c32, shape: 'square' },
  { id: 'felipes', stage: "FELIPE'S TAQUERIA", boss: 'EL JEFE', short: "FELIPE'S", map: { x: 34, y: 130 }, color: 0xfe7000, shape: 'wide' },
  { id: 'yard', stage: 'THE YARD DIG', boss: 'BONES', short: 'THE YARD', map: { x: 86, y: 112 }, color: 0x8a6042, shape: 'round' },
];

export const MAP = {
  size: 168, // the painted map, 3x3 cells
  selectTicks: 50, // flash on confirm before the (future) stage starts
};

export const EVENT_KEEP_TICKS = 12;
