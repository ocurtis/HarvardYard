// Every tunable number for __TITLE__ lives in src/config/. No magic numbers in the sim.

export const SLUG = '__SLUG__'; // games/__SLUG__, public/__SLUG__
export const TICK_RATE = 60;
export const TICK_MS = 1000 / TICK_RATE;
export const PLAYER_COUNT_DEFAULT = 1;

export const TILE = 16;
export const GRID_W = 24;
export const GRID_H = 18;
export const LOGICAL_W = GRID_W * TILE; // 384
export const LOGICAL_H = GRID_H * TILE; // 288

export const PLAYER = {
  speedPxPerTick: 1.0,
  sizePx: 12,
};
