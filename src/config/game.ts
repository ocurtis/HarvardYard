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

// The Longshot Bro: faster, less drunk, and he doesn't need to reach the
// statue. He stops the moment it's in range, unzips, and arcs it over
// everything in between. He shakes the whole way in because he has to go.
export const LONGSHOT = {
  speedPxPerTick: 0.95, // 57 px/s, about 1.6x a bro
  drunk: 34, // 25% under the first cut of 45
  rangePx: 104, // 6.5 tiles from the statue's center: the bottoms of both inner loops are in range; he stops on the first lane tile inside it
  windupTicks: 40,
  pissPerTick: 5 / 60, // a little weaker than a bro's point-blank stream
  shakePx: 1, // sprite jitter amplitude while walking and winding up
  shakeEveryTicks: 3,
  firstWave: 3, // 1-based wave on which longshots start appearing
};

// The Cup Chucker: a slow walker who stops almost at the gate and lobs a full
// solo cup at the statue. The cup floats in slowly; the player catches it by
// running under it or shouting it down. If it lands, it's a lot of damage.
export const CHUCKER = {
  speedPxPerTick: 0.4, // a waddle; two-thirds of a bro
  drunk: 50,
  rangePx: 192, // 12 tiles: he stops a few tiles in from any gate
  windupTicks: 90, // 1.5s wind-up before each throw
  reloadTicks: 300, // 5s between throws
  firstWave: 5,
};

export const CUP = {
  speedPxPerTick: 0.4, // about a third of the player's run; ~8s from a far gate
  damage: 15, // statue HP on landing
  arcPx: 24, // how high the arc peaks, for the renderer
  catchRadiusPx: 10, // player-to-cup-shadow distance that counts as a catch
};

// What a bro pays when he sobers out. A dollar, whoever he is: tourists are the
// economy, kills are pocket change.
export const BOUNTY: Record<'bro' | 'longshot' | 'chucker', number> = { bro: 1, longshot: 1, chucker: 1 };

export const SHOUT = {
  rangePx: 30, // just under two tiles
  halfAngleDeg: 40, // cone half-width; 40 = an 80-degree cone
  soberPerTick: 24 / 60, // 24/s: a lone bro takes ~4s of shouting to sober. Towers are the real damage.
  spookPerTick: 30 / 60, // dollars knocked off a group's value per tick its guide is in the cone (30/s)
  // Hold-to-use, no resource. Rock On! throws bones on a cooldown; the shout
  // instead trades burst for needing to stand there, which keeps the player
  // in the lane where towers can't be.
};

export const TOURIST = {
  speedPxPerTick: 0.5, // 30 px/s; slower than a bro, they're looking around
  wanderTiles: 6, // how far in along the route before they stop, confused
  confusedTicks: 420, // 7s to reach them with a brochure before they give up
  valuePerHead: 10, // a group's starting value when it wants the statue; ticks down to 0 over confusedTicks once the guide stops
  buildingValuePerHead: 7, // a group that wants a building is worth less; the statue is the premium stop
  statueShare: 0.45, // fraction of groups that want the statue; the rest pick a building
  poseTicks: 150, // how long a group lingers at its photo spot taking pictures before leaving
  stormOutPenalty: 10, // what a group that reaches $0 costs you on the way out (bank floors at 0)
  touchRadiusPx: 10, // player-to-guide distance that counts as handing over a brochure
  groupMin: 3, // group size including the guide
  groupMax: 5,
  followSpacingHalfTiles: 1, // followers huddle half a tile apart
  heads: 3, // head stamps in the art pipeline
  colors: 3, // group shirt colors; a whole group shares one
  photoChancePerTick: 1 / 90, // a standing follower snaps a photo about every 1.5s
  photoTicks: 24, // how long the photo pose lasts; the flash is the first third
};

export const POPUP_TICKS = 75; // how long a floating "+$40" lives
