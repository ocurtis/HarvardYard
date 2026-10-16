// All tuning lives in src/config. No magic numbers in sim code.

export const TICK_RATE = 60; // sim ticks per second
export const TICK_MS = 1000 / TICK_RATE;

// Logical resolution, integer-scaled by the renderer. 4:3 like the NES
// (UFO 50 is 384x216; we trade its 16:9 for a taller map).
export const TILE = 16;
export const HUD_W = 2 * TILE; // left sidebar, Rock On! style
export const GRID_W = 24;
export const GRID_H = 18;
export const LOGICAL_W = HUD_W + GRID_W * TILE; // 416
export const LOGICAL_H = GRID_H * TILE; // 288

export const PLAYER_COUNT_DEFAULT = 1;
export const PLAYER_COUNT_MAX = 4;

export const PLAYER = {
  speedPxPerTick: 1.25, // 75 px/s; Rock On! feel is brisk but not twitchy
  // Collision box is smaller than the 16px sprite so corners don't snag.
  hitboxW: 10,
  hitboxH: 10,
};
