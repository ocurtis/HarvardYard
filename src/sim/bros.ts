// Bro behavior. A bro walks the lane toward the statue, winds up, then
// pisses until he's staggered or sober. Sobering to 0 is the kill: he
// leaves the map embarrassed. Nothing here touches the player or towers.

import { BRO, TILE } from '../config/game';
import { nextTileToward } from './path';
import { nextInt } from './rng';
import type { BroState, GameState, Vec } from './types';

export function tileCenter(t: Vec): Vec {
  return { x: t.x * TILE + TILE / 2, y: t.y * TILE + TILE / 2 };
}

export function spawnBro(state: GameState): BroState {
  const gate = state.map.gates[nextInt(state, state.map.gates.length)]!;
  const bro: BroState = {
    id: state.nextEntityId++,
    pos: tileCenter(gate),
    tile: { ...gate },
    drunk: BRO.drunk,
    phase: 'walking',
    timer: 0,
    facing: { x: 0, y: 1 },
  };
  state.bros.push(bro);
  return bro;
}

export function updateBros(state: GameState): void {
  for (const b of state.bros) updateBro(state, b);
  // Remove bros that have left (sobered up) or are fully drained.
  state.bros = state.bros.filter((b) => b.phase !== 'leaving');
}

function updateBro(state: GameState, b: BroState): void {
  if (b.drunk <= 0 && b.phase !== 'leaving') {
    b.phase = 'leaving';
    return;
  }

  switch (b.phase) {
    case 'walking': {
      const target = tileCenter(b.tile);
      const dx = target.x - b.pos.x;
      const dy = target.y - b.pos.y;
      const d = Math.hypot(dx, dy);
      if (d <= BRO.arriveEpsilon) {
        b.pos = target;
        const next = nextTileToward(state.map, state.distToStatue, b.tile);
        if (next === null) {
          // Adjacent to the statue (or stuck): start the wind-up.
          b.phase = 'windup';
          b.timer = BRO.windupTicks;
          b.facing = faceStatue(state, b.tile);
        } else {
          b.facing = { x: Math.sign(next.x - b.tile.x), y: Math.sign(next.y - b.tile.y) };
          b.tile = next;
        }
      } else {
        const step = Math.min(BRO.speedPxPerTick, d);
        b.pos.x += (dx / d) * step;
        b.pos.y += (dy / d) * step;
      }
      return;
    }
    case 'windup': {
      b.timer--;
      if (b.timer <= 0) b.phase = 'pissing';
      return;
    }
    case 'pissing': {
      state.statueHp = Math.max(0, state.statueHp - BRO.pissPerTick);
      if (state.statueHp <= 0 && state.phase === 'playing') state.phase = 'lost';
      return;
    }
    case 'stagger': {
      b.timer--;
      if (b.timer <= 0) {
        // Resume: he's still adjacent, so wind up again.
        b.phase = 'windup';
        b.timer = BRO.windupTicks;
      }
      return;
    }
    case 'leaving':
      return;
  }
}

// Called by the shout (session 3) and towers (session 5).
export function sober(b: BroState, amount: number): void {
  b.drunk = Math.max(0, b.drunk - amount);
}

export function stagger(b: BroState): void {
  if (b.phase === 'windup' || b.phase === 'pissing' || b.phase === 'stagger') {
    b.phase = 'stagger';
    b.timer = BRO.staggerTicks;
  }
}

function faceStatue(state: GameState, tile: Vec): Vec {
  const s = state.map.statue;
  const cx = s.x + 0.5; // center of the 2x2 in tile units
  const cy = s.y + 0.5;
  return { x: Math.sign(cx - tile.x), y: Math.sign(cy - tile.y) };
}
