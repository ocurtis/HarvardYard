// Tourists are the economy, and they travel in groups. A guide leads; the
// rest follow in a line, replaying the guide's path a tile apart. The guide
// walks a few tiles in, stops confused with a patience timer, and either
// gets a brochure from a player (then leads the group to the foot, where
// the group pays per member and leaves by the nearest exit) or gives up
// and leads them back out.

import { TILE, TOURIST } from '../config/game';
import { tileCenter } from './bros';
import { nextTileToward } from './path';
import { nextInt } from './rng';
import type { GameState, TouristState, Vec } from './types';

export function spawnGroup(state: GameState): TouristState {
  const gate = state.map.gates[nextInt(state, state.map.gates.length)]!;
  const size = TOURIST.groupMin + nextInt(state, TOURIST.groupMax - TOURIST.groupMin + 1);
  const group = state.nextGroupId++;
  const color = nextInt(state, TOURIST.colors);
  state.groups[group] = { path: [{ ...gate }], guideGone: false, color };
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
    timer: 0,
    stepsLeft: 0,
    rank,
    pathIndex: 0,
    facing: { x: 0, y: 1 },
    variant: nextInt(state, TOURIST.heads) * TOURIST.colors + color,
    photo: 0,
  };
}

export function groupSize(state: GameState, group: number): number {
  let n = 0;
  for (const t of state.tourists) if (t.group === group) n++;
  return n;
}

export function updateTourists(state: GameState): void {
  // Brochures: a player close enough to a confused (or still entering) guide
  // hands one over for the whole group. No button; proximity is the verb.
  for (const t of state.tourists) {
    if (!t.guide || (t.phase !== 'entering' && t.phase !== 'confused')) continue;
    for (const p of state.players) {
      if (Math.hypot(p.pos.x - t.pos.x, p.pos.y - t.pos.y) <= TOURIST.touchRadiusPx) {
        t.phase = 'pamphleted';
        break;
      }
    }
  }

  const keep: TouristState[] = [];
  for (const t of state.tourists) {
    if (t.guide ? updateGuide(state, t) : updateFollower(state, t)) keep.push(t);
  }
  state.tourists = keep;

  // Drop paths of groups that have fully left.
  for (const id of Object.keys(state.groups)) {
    const g = Number(id);
    if (!state.tourists.some((t) => t.group === g)) delete state.groups[g];
  }
}

// Returns false when the guide has left the map.
function updateGuide(state: GameState, t: TouristState): boolean {
  const g = state.groups[t.group]!;
  switch (t.phase) {
    case 'entering': {
      if (!walkToward(t, tileCenter(t.tile))) return true;
      if (t.stepsLeft <= 0) {
        t.phase = 'confused';
        t.timer = TOURIST.confusedTicks;
        return true;
      }
      const next = nextTileToward(state.map, state.distToStatue, t.tile);
      if (next === null) {
        t.phase = 'confused';
        t.timer = TOURIST.confusedTicks;
        return true;
      }
      advance(t, next, g.path);
      t.stepsLeft--;
      return true;
    }
    case 'confused': {
      t.timer--;
      if (t.timer <= 0) t.phase = 'leaving';
      return true;
    }
    case 'pamphleted': {
      if (!walkToward(t, tileCenter(t.tile))) return true;
      if (t.tile.x === state.map.foot.x && t.tile.y === state.map.foot.y) {
        state.money += TOURIST.payout * groupSize(state, t.group);
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

// Followers replay the group's path, each staying `rank * spacing` tiles
// behind the guide. When the guide is gone they walk the path to its end.
function updateFollower(state: GameState, t: TouristState): boolean {
  const g = state.groups[t.group];
  if (!g) return false;
  if (!walkToward(t, tileCenter(t.tile))) return true;
  const last = g.path.length - 1;
  const allowed = g.guideGone ? last : last - t.rank * TOURIST.followSpacingTiles;
  if (t.photo > 0) t.photo--;
  if (t.pathIndex >= allowed) {
    // Caught up to the line. If the guide is gone and we're at the end, we're out.
    if (g.guideGone && t.pathIndex >= last) return false;
    // Standing around: snap a photo now and then.
    if (t.photo === 0 && nextInt(state, Math.round(1 / TOURIST.photoChancePerTick)) === 0) t.photo = TOURIST.photoTicks;
    return true;
  }
  t.photo = 0;
  t.pathIndex++;
  const next = g.path[t.pathIndex]!;
  t.facing = { x: Math.sign(next.x - t.tile.x), y: Math.sign(next.y - t.tile.y) };
  t.tile = { ...next };
  return true;
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
  if (d <= TILE / 32) {
    t.pos = target;
    return true;
  }
  const step = Math.min(TOURIST.speedPxPerTick, d);
  t.pos.x += (dx / d) * step;
  t.pos.y += (dy / d) * step;
  return false;
}
