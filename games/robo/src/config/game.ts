// Every tunable number for Robo (working title) lives in src/config/. No magic numbers in the sim.

export const SLUG = 'robo'; // games/robo, public/robo
export const TICK_RATE = 60;
export const TICK_MS = 1000 / TICK_RATE;
export const PLAYER_COUNT_DEFAULT = 1;

export const LOGICAL_W = 384;
export const LOGICAL_H = 288;

// The stage select: Harvard Square as a map, five stages on it, the cursor walks
// between spots. Positions come from real coordinates (config/map.ts). Boss
// names and faces are placeholders until the hero is decided.
import { LANDMARKS, project } from './map';

export interface StageDef {
  id: string;
  stage: string; // the place
  short: string; // the map label
  label: 'n' | 's' | 'e' | 'w'; // which side of the beacon the label sits
  nudge?: { x: number; y: number }; // label pixel nudge for the crowded cluster
  boss: string; // placeholder boss name
  x: number;
  y: number;
  color: number; // placeholder portrait color (UFO 50)
  shape: 'round' | 'square' | 'spike' | 'tall' | 'wide' | 'diamond';
}

const at = (k: keyof typeof LANDMARKS) => project(LANDMARKS[k]);

export const STAGES: StageDef[] = [
  { id: 'felipes', stage: "FELIPE'S TAQUERIA", short: "FELIPE'S", label: 's', nudge: { x: -8, y: 4 }, boss: 'EL JEFE', ...at('felipes'), color: 0xfe7000, shape: 'wide' },
  { id: 'science', stage: 'SCIENCE CENTER', short: 'SCIENCE', label: 's', boss: 'PROF. TESLA', ...at('scienceCenter'), color: 0x27badb, shape: 'spike' },
  { id: 'annenberg', stage: 'ANNENBERG HALL', short: 'ANNENBERG', label: 's', nudge: { x: 0, y: 6 }, boss: 'THE HEADMASTER', ...at('memorialHall'), color: 0xe8ea4a, shape: 'tall' },
  { id: 'dig', stage: 'THE DIG', short: 'DIG', label: 'e', nudge: { x: 10, y: -8 }, boss: 'BONES', ...at('peabody'), color: 0x8a6042, shape: 'round' },
  { id: 'observatory', stage: 'THE OBSERVATORY', short: 'OBSERVATORY', label: 's', boss: 'STARGAZER', ...at('observatory'), color: 0x9600dc, shape: 'diamond' },
];

// Home on the map: the statue in the Yard. The cursor starts here; it isn't a stage.
export const HOME = at('universityHall');

export const MAP = {
  w: 256, // map panel width; the portrait panel takes the rest
  cursorSpeedPxPerTick: 2.5, // the cursor walks spot to spot, so it reads as a map
  selectTicks: 50, // flash on confirm before the (future) stage starts
};

export const EVENT_KEEP_TICKS = 12;
