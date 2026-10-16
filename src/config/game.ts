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

export const STATUE = {
  hp: 100,
};

export const BRO = {
  speedPxPerTick: 0.6, // 36 px/s; a stumbling drunk, slower than the player
  drunk: 60, // the health bar: sobering it to 0 is the kill
  windupTicks: 60, // 1s from reaching the statue to the stream starting
  pissPerTick: 6 / 60, // statue damage per tick while the stream is on (6/s)
  variants: 9, // how many looks the art pipeline produces (3 heads x 3 shirts); picked at spawn
  staggerTicks: 30, // how long a shout interrupts a wind-up or a piss
  slowFactor: 0.4, // walking speed multiplier while being shouted at
  slowTicks: 12, // how long the slow lingers after the shout stops touching him
  // How close (px) to the center of the next tile before snapping to it.
  arriveEpsilon: 0.75,
};

export const SHOUT = {
  rangePx: 30, // just under two tiles
  halfAngleDeg: 40, // cone half-width; 40 = an 80-degree cone
  soberPerTick: 24 / 60, // 24/s: a lone bro takes ~4s of shouting to sober. Towers are the real damage.
  // Hold-to-use, no resource. Rock On! throws bones on a cooldown; the shout
  // instead trades burst for needing to stand there, which keeps the player
  // in the lane where towers can't be.
};

export const TOURIST = {
  speedPxPerTick: 0.5, // 30 px/s; slower than a bro, they're looking around
  wanderTiles: 6, // how far in along the route before they stop, confused
  confusedTicks: 420, // 7s to reach them with a brochure before they give up
  payout: 10, // currency per group member when the guide reaches the foot
  touchRadiusPx: 10, // player-to-guide distance that counts as handing over a brochure
  groupMin: 3, // group size including the guide
  groupMax: 5,
  followSpacingTiles: 1, // each follower stays this many tiles behind the one ahead
  heads: 3, // head stamps in the art pipeline
  colors: 3, // group shirt colors; a whole group shares one
  photoChancePerTick: 1 / 90, // a standing follower snaps a photo about every 1.5s
  photoTicks: 24, // how long the photo pose lasts; the flash is the first third
};
