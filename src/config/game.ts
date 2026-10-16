// All tuning lives in src/config. No magic numbers in sim code.

export const TICK_RATE = 60; // sim ticks per second
export const TICK_MS = 1000 / TICK_RATE;

// UFO 50's logical resolution, integer-scaled by the renderer.
export const LOGICAL_W = 384;
export const LOGICAL_H = 216;

export const TILE = 16;
export const GRID_W = 24; // 24 * 16 = 384
export const GRID_H = 13; // 13 * 16 = 208; the remaining 8px is the HUD strip
export const HUD_H = LOGICAL_H - GRID_H * TILE; // 8

export const PLAYER_COUNT_DEFAULT = 1;
export const PLAYER_COUNT_MAX = 4;

export const PLAYER = {
  speedPxPerTick: 1.25, // 75 px/s; Rock On! feel is brisk but not twitchy
  // Collision box is smaller than the 16px sprite so corners don't snag.
  hitboxW: 10,
  hitboxH: 10,
};
