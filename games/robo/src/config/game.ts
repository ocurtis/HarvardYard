// Every tunable number for Robo (working title) lives in src/config/. No magic numbers in the sim.

export const SLUG = 'robo'; // games/robo, public/robo
export const TICK_RATE = 60;
export const TICK_MS = 1000 / TICK_RATE;
export const PLAYER_COUNT_DEFAULT = 1;

export const LOGICAL_W = 384;
export const LOGICAL_H = 288;

// The stage select: Harvard Square as a map, five stages on it, the cursor walks
// between spots. Positions are logical pixels on the map panel (the left 256px);
// the portrait panel is the right 128px. The map is roughly to the real
// geography: the Square at the bottom, the Yard in the middle, the Science
// Center and Memorial Hall just north, the dig off Divinity Ave, the
// Observatory up Garden Street. Boss names and faces are placeholders until the
// hero is decided.
export interface StageDef {
  id: string;
  stage: string; // the place
  short: string; // the map label
  boss: string; // placeholder boss name
  x: number;
  y: number;
  color: number; // placeholder portrait color (UFO 50)
  shape: 'round' | 'square' | 'spike' | 'tall' | 'wide' | 'diamond';
}

export const STAGES: StageDef[] = [
  { id: 'felipes', stage: "FELIPE'S TAQUERIA", short: "FELIPE'S", boss: 'EL JEFE', x: 100, y: 236, color: 0xfe7000, shape: 'wide' },
  { id: 'science', stage: 'SCIENCE CENTER', short: 'SCIENCE', boss: 'PROF. TESLA', x: 104, y: 118, color: 0x27badb, shape: 'spike' },
  { id: 'annenberg', stage: 'ANNENBERG HALL', short: 'ANNENBERG', boss: 'THE HEADMASTER', x: 176, y: 98, color: 0xe8ea4a, shape: 'tall' },
  { id: 'dig', stage: 'THE DIG', short: 'DIG', boss: 'BONES', x: 196, y: 54, color: 0x8a6042, shape: 'round' },
  { id: 'observatory', stage: 'THE OBSERVATORY', short: 'OBSERVATORY', boss: 'STARGAZER', x: 48, y: 42, color: 0x9600dc, shape: 'diamond' },
];

// Home on the map: the statue in the Yard. The cursor starts here; it isn't a stage.
export const HOME = { x: 132, y: 164 };

export const MAP = {
  w: 256, // map panel width; the portrait panel takes the rest
  cursorSpeedPxPerTick: 2.5, // the cursor walks spot to spot, so it reads as a map
  selectTicks: 50, // flash on confirm before the (future) stage starts
};

export const EVENT_KEEP_TICKS = 12;
