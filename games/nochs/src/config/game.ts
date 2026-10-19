// Every tunable number for Noch's Rush lives in src/config/. No magic numbers in the sim.

export const SLUG = 'nochs'; // games/nochs, public/nochs
export const TICK_RATE = 60;
export const TICK_MS = 1000 / TICK_RATE;
export const PLAYER_COUNT_DEFAULT = 1;

export const TILE = 16; // a pizza square
export const LOGICAL_W = 384;
export const LOGICAL_H = 288;

// Which placement mode the game is (DESIGN.md: both built, Owen picks by playing).
// 'cells': pick the box and the cell. 'boxOnly': pick the box; it fills in reading order.
export type Placement = 'cells' | 'boxOnly';
export const PLACEMENT: Placement = 'cells';

export const KINDS = ['cheese', 'pepperoni', 'tomato', 'veggie'] as const;
export type Kind = (typeof KINDS)[number];

export const BOXES = 4; // open boxes on the counter
export const BOX_CELLS = 4; // 2x2

export const CONVEYOR = {
  slots: 6, // squares waiting; the 7th hits the floor
  preview: 3, // how many beyond the one in hand the player can see
};

export const RACK = {
  slots: 3, // day-old squares you can park; a 4th is a strike
  sellTicks: 600, // a racked square sells as a day-old slice after this long and frees the slot (no tip)
};

export const ARRIVAL = {
  // Ticks between squares, by wave. The cutter speeds up through the shift.
  ticksByWave: [150, 120, 100, 85, 70],
  // Chance the next square is a kind some open order still needs (else uniform random).
  needBias: 0.7,
  firstDelayTicks: 60,
};

export const ORDERS = {
  // Max distinct kinds in a 2x2 order, by wave: orders get fussier.
  kindsByWave: [1, 2, 2, 3, 3],
  // Chance a cell is a wildcard ("any"), by wave.
  wildByWave: [0.35, 0.25, 0.15, 0.1, 0.05],
  // Ticks before a fresh box replaces a closed one.
  refillTicks: 45,
};

export const SCORING = {
  clean: 3, // 4/4
  messy: 1, // 3/4
  sentBackBelow: 3, // fewer matches than this is sent back: a strike
  streakBonusEvery: 3, // every N clean boxes in a row, +1 tip
};

export const SHIFT = {
  strikesToLose: 3,
  // Boxes closed to advance a wave; the last wave is bar close.
  boxesPerWave: [6, 8, 8, 10, 10],
  waveNames: ['OPEN', 'LUNCH', 'AFTERNOON', 'DINNER', 'BAR CLOSE'],
};

export const EVENT_KEEP_TICKS = 12;
