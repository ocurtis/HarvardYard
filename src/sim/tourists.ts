// Tourists are the economy, and they travel in groups. A guide leads; the
// rest huddle behind, replaying the guide's path half a tile apart. The guide
// walks a few tiles in and stops, confused. From that moment the group's
// value ($10 a head) ticks down toward $0. A player who touches the guide
// locks the value; the guide then leads the group to the foot, where it pays
// that amount, and out. At $0 the group storms out and costs you a little.

import { TILE, TOURIST } from '../config/game';
import { SPRINKLER } from '../config/towers';
import { tileCenter } from './bros';
import { nextTileToward } from './path';
import { nextInt } from './rng';
import type { GameState, Popup, TouristState, Vec } from './types';

// Groups appear at the gate farthest from the nearest player (ties broken by
// the seeded RNG), so a new group is never where you already are. Bros stay
// random; the squeeze comes from tourists pulling you away from them.
function farthestGate(state: GameState): Vec {
  const gates = state.map.gates;
  let best: Vec[] = [];
  let bestD = -1;
  for (const g of gates) {
    const c = tileCenter(g);
    let d = Infinity;
    for (const p of state.players) d = Math.min(d, Math.hypot(p.pos.x - c.x, p.pos.y - c.y));
    if (d > bestD + 0.5) {
      bestD = d;
      best = [g];
    } else if (Math.abs(d - bestD) <= 0.5) best.push(g);
  }
  return best[nextInt(state, best.length)]!;
}

export function spawnGroup(state: GameState): TouristState {
  const gate = farthestGate(state);
  const size = TOURIST.groupMin + nextInt(state, TOURIST.groupMax - TOURIST.groupMin + 1);
  const group = state.nextGroupId++;
  const color = nextInt(state, TOURIST.colors);
  const value = TOURIST.valuePerHead * size;
  state.groups[group] = { path: [{ ...gate }], guideGone: false, color, value, maxValue: value, locked: false };
  const guide = makeTourist(state, group, gate, true, 0);
  guide.phase = 'entering';
  guide.stepsLeft = TOURIST.wanderTiles;
  state.tourists.push(guide);
  for (let i = 1; i < size; i++) {
    const f = makeTourist(state, group, gate, false, i);
    f.phase = 'following';
    state.tourists.push(f);
  }
  return guide;
}

function makeTourist(state: GameState, group: number, gate: Vec, guide: boolean, rank: number): TouristState {
  const color = state.groups[group]!.color;
  return {
    id: state.nextEntityId++,
    group,
    guide,
    pos: tileCenter(gate),
    tile: { ...gate },
    phase: 'following',
    stepsLeft: 0,
    rank,
    pathIndex: 0,
    facing: { x: 0, y: 1 },
    variant: nextInt(state, TOURIST.heads) * TOURIST.colors + color,
    photo: 0,
    wet: 0,
  };
}

export function groupSize(state: GameState, group: number): number {
  let n = 0;
  for (const t of state.tourists) if (t.group === group) n++;
  return n;
}

export function groupValue(state: GameState, group: number): number {
  return Math.max(0, Math.ceil(state.groups[group]?.value ?? 0));
}

// The shout's effect on a group: dollars off its value. Called by the shout
// for each tick the guide is in the cone. Only unlocked groups care.
export function spook(state: GameState, guide: TouristState, dollars: number): void {
  const g = state.groups[guide.group];
  if (!g || g.locked) return;
  g.value = Math.max(0, g.value - dollars);
}

export function updateTourists(state: GameState): void {
  // Brochures: a player close enough to a confused (or still entering) guide
  // hands one over for the whole group and locks its value. No button.
  for (const t of state.tourists) {
    if (!t.guide || (t.phase !== 'entering' && t.phase !== 'confused')) continue;
    for (const p of state.players) {
      if (Math.hypot(p.pos.x - t.pos.x, p.pos.y - t.pos.y) <= TOURIST.touchRadiusPx) {
        t.phase = 'pamphleted';
        const g = state.groups[t.group];
        if (g) g.locked = true;
        break;
      }
    }
  }

  const keep: TouristState[] = [];
  for (const t of state.tourists) {
    if (t.guide ? updateGuide(state, t) : updateFollower(state, t)) keep.push(t);
  }
  state.tourists = keep;

  // Drop groups that have fully left.
  for (const id of Object.keys(state.groups)) {
    const g = Number(id);
    if (!state.tourists.some((t) => t.group === g)) delete state.groups[g];
  }
}

function pushPopup(state: GameState, text: string, pos: Vec, kind: Popup['kind']): void {
  state.popups.push({ id: state.nextEntityId++, text, pos: { ...pos }, tick: state.tick, kind });
  if (state.popups.length > 32) state.popups.shift();
}

// Returns false when the guide has left the map.
function updateGuide(state: GameState, t: TouristState): boolean {
  const g = state.groups[t.group]!;
  switch (t.phase) {
    case 'entering': {
      if (!walkToward(t, tileCenter(t.tile))) return true;
      const next = t.stepsLeft > 0 ? nextTileToward(state.map, state.distToStatue, t.tile) : null;
      if (next === null) {
        t.phase = 'confused';
        return true;
      }
      advance(t, next, g.path);
      t.stepsLeft--;
      return true;
    }
    case 'confused': {
      // Patience is money: the group's value drains to 0 over confusedTicks.
      g.value = Math.max(0, g.value - g.maxValue / TOURIST.confusedTicks);
      if (g.value <= 0) {
        // Storm out. The penalty pops where the guide stands.
        state.money = Math.max(0, state.money - TOURIST.stormOutPenalty);
        pushPopup(state, `-$${TOURIST.stormOutPenalty}`, t.pos, 'loss');
        t.phase = 'leaving';
      }
      return true;
    }
    case 'pamphleted': {
      if (!walkToward(t, tileCenter(t.tile))) return true;
      if (t.tile.x === state.map.foot.x && t.tile.y === state.map.foot.y) {
        const pay = groupValue(state, t.group);
        state.money += pay;
        if (pay > 0) pushPopup(state, `+$${pay}`, t.pos, 'gain');
        t.phase = 'leaving';
        return true;
      }
      const next = nextTileToward(state.map, state.distToFoot, t.tile);
      if (next === null) {
        t.phase = 'leaving';
        return true;
      }
      advance(t, next, g.path);
      return true;
    }
    case 'leaving': {
      if (!walkToward(t, tileCenter(t.tile))) return true;
      const here = state.distToExit[t.tile.y * state.map.w + t.tile.x] ?? -1;
      if (here === 0) {
        g.guideGone = true;
        return false;
      }
      const next = nextTileToward(state.map, state.distToExit, t.tile);
      if (next === null) {
        g.guideGone = true;
        return false;
      }
      advance(t, next, g.path);
      return true;
    }
    case 'following':
      return true; // a guide is never 'following'; defensive
  }
}

// Followers replay the group's path in half-tile steps, each staying
// `rank * spacing` half-tiles behind the guide. When the guide is gone they
// walk the path to its end.
function updateFollower(state: GameState, t: TouristState): boolean {
  const g = state.groups[t.group];
  if (!g) return false;
  if (!walkToward(t, halfStepPoint(g.path, t.pathIndex))) return true;
  const lastHalf = (g.path.length - 1) * 2;
  const allowed = g.guideGone ? lastHalf : lastHalf - t.rank * TOURIST.followSpacingHalfTiles;
  if (t.photo > 0) t.photo--;
  if (t.pathIndex >= allowed) {
    // Caught up to the line. If the guide is gone and we're at the end, we're out.
    if (g.guideGone && t.pathIndex >= lastHalf) return false;
    // Standing around: snap a photo now and then.
    if (t.photo === 0 && nextInt(state, Math.round(1 / TOURIST.photoChancePerTick)) === 0) t.photo = TOURIST.photoTicks;
    return true;
  }
  t.photo = 0;
  t.pathIndex++;
  const next = halfStepPoint(g.path, t.pathIndex);
  const cur = halfStepPoint(g.path, t.pathIndex - 1);
  t.facing = { x: Math.sign(next.x - cur.x), y: Math.sign(next.y - cur.y) };
  t.tile = { ...g.path[Math.min(g.path.length - 1, Math.round(t.pathIndex / 2))]! };
  return true;
}

// Pixel position for a half-tile index along the path: even = a tile center,
// odd = halfway to the next tile.
function halfStepPoint(path: Vec[], half: number): Vec {
  const i = Math.floor(half / 2);
  const a = tileCenter(path[Math.min(i, path.length - 1)]!);
  if (half % 2 === 0 || i + 1 >= path.length) return a;
  const b = tileCenter(path[i + 1]!);
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function advance(t: TouristState, next: Vec, path: Vec[]): void {
  t.facing = { x: Math.sign(next.x - t.tile.x), y: Math.sign(next.y - t.tile.y) };
  t.tile = { ...next };
  path.push({ ...next });
}

function walkToward(t: TouristState, target: Vec): boolean {
  const dx = target.x - t.pos.x;
  const dy = target.y - t.pos.y;
  const d = Math.hypot(dx, dy);
  if (t.wet > 0) t.wet--;
  if (d <= TILE / 32) {
    t.pos = target;
    return true;
  }
  const speed = t.wet > 0 ? TOURIST.speedPxPerTick * SPRINKLER.wetSpeedFactor : TOURIST.speedPxPerTick;
  const step = Math.min(speed, d);
  t.pos.x += (dx / d) * step;
  t.pos.y += (dy / d) * step;
  return false;
}

