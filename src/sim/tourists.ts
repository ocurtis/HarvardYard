// Tourists are the economy. They enter from a random gate, walk a few tiles
// in, then stop confused with a patience timer. If a player reaches them in
// time they take a brochure and walk to the foot, pay, and leave by the
// nearest exit. If not, they turn around and leave the way they came.

import { TILE, TOURIST } from '../config/game';
import { tileCenter } from './bros';
import { nextTileToward } from './path';
import { nextInt } from './rng';
import type { GameState, TouristState, Vec } from './types';

export function spawnTourist(state: GameState): TouristState {
  const gate = state.map.gates[nextInt(state, state.map.gates.length)]!;
  const t: TouristState = {
    id: state.nextEntityId++,
    pos: tileCenter(gate),
    tile: { ...gate },
    phase: 'entering',
    timer: 0,
    stepsLeft: TOURIST.wanderTiles,
    facing: { x: 0, y: 1 },
  };
  state.tourists.push(t);
  return t;
}

export function updateTourists(state: GameState): void {
  // Brochures: any player close enough to a confused (or still entering)
  // tourist hands one over. No button; proximity is the verb.
  for (const t of state.tourists) {
    if (t.phase !== 'entering' && t.phase !== 'confused') continue;
    for (const p of state.players) {
      if (Math.hypot(p.pos.x - t.pos.x, p.pos.y - t.pos.y) <= TOURIST.touchRadiusPx) {
        t.phase = 'pamphleted';
        break;
      }
    }
  }

  const keep: TouristState[] = [];
  for (const t of state.tourists) {
    if (updateTourist(state, t)) keep.push(t);
  }
  state.tourists = keep;
}

// Returns false when the tourist has left the map.
function updateTourist(state: GameState, t: TouristState): boolean {
  switch (t.phase) {
    case 'entering': {
      const arrived = walkToward(t, tileCenter(t.tile));
      if (!arrived) return true;
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
      face(t, next);
      t.tile = next;
      t.stepsLeft--;
      return true;
    }
    case 'confused': {
      t.timer--;
      if (t.timer <= 0) t.phase = 'leaving';
      return true;
    }
    case 'pamphleted': {
      const arrived = walkToward(t, tileCenter(t.tile));
      if (!arrived) return true;
      if (t.tile.x === state.map.foot.x && t.tile.y === state.map.foot.y) {
        state.money += TOURIST.payout;
        t.phase = 'leaving';
        return true;
      }
      const next = nextTileToward(state.map, state.distToFoot, t.tile);
      if (next === null) {
        // Shouldn't happen on a valid map; give up rather than stand forever.
        t.phase = 'leaving';
        return true;
      }
      face(t, next);
      t.tile = next;
      return true;
    }
    case 'leaving': {
      const arrived = walkToward(t, tileCenter(t.tile));
      if (!arrived) return true;
      const here = state.distToExit[t.tile.y * state.map.w + t.tile.x] ?? -1;
      if (here === 0) return false; // on a gate or exit: gone
      const next = nextTileToward(state.map, state.distToExit, t.tile);
      if (next === null) return false;
      face(t, next);
      t.tile = next;
      return true;
    }
  }
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

function face(t: TouristState, next: Vec): void {
  t.facing = { x: Math.sign(next.x - t.tile.x), y: Math.sign(next.y - t.tile.y) };
}
