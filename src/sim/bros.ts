// Bro behavior. A bro walks the lane toward the statue, winds up, then
// pisses until he's staggered or sober. Sobering to 0 is the kill: he
// leaves the map embarrassed. A Longshot does the same but stops as soon
// as the statue is in range and arcs it from there. Nothing here touches
// the player or towers.

import { BOUNTY, BRO, CHUCKER, CUP, LONGSHOT, TILE } from '../config/game';
import { drunkMultiplier } from '../config/waves';
import { nextTileToward } from './path';
import { nextInt } from './rng';
import type { BroKind, BroState, GameState, Vec } from './types';

// Per-kind numbers. Everything else about the two kinds is shared.
function stats(kind: BroKind) {
  switch (kind) {
    case 'longshot':
      return { speed: LONGSHOT.speedPxPerTick, drunk: LONGSHOT.drunk, windup: LONGSHOT.windupTicks, piss: LONGSHOT.pissPerTick, range: LONGSHOT.rangePx };
    case 'chucker':
      return { speed: CHUCKER.speedPxPerTick, drunk: CHUCKER.drunk, windup: CHUCKER.windupTicks, piss: 0, range: CHUCKER.rangePx };
    default:
      return { speed: BRO.speedPxPerTick, drunk: BRO.drunk, windup: BRO.windupTicks, piss: BRO.pissPerTick, range: 0 };
  }
}

export function statueCenter(state: GameState): Vec {
  return { x: (state.map.statue.x + 1) * TILE, y: (state.map.statue.y + 1) * TILE };
}

// A ranged bro (longshot, chucker) stops at the first lane tile within his range of the statue.
function rangedInRange(state: GameState, kind: BroKind, tile: Vec): boolean {
  const range = stats(kind).range;
  if (range <= 0) return false;
  const c = tileCenter(tile);
  const s = statueCenter(state);
  return Math.hypot(c.x - s.x, c.y - s.y) <= range;
}

export function tileCenter(t: Vec): Vec {
  return { x: t.x * TILE + TILE / 2, y: t.y * TILE + TILE / 2 };
}

export function spawnBro(state: GameState, kind: BroKind = 'bro'): BroState {
  const gate = state.map.gates[nextInt(state, state.map.gates.length)]!;
  const bro: BroState = {
    id: state.nextEntityId++,
    kind,
    pos: tileCenter(gate),
    tile: { ...gate },
    drunk: stats(kind).drunk * drunkMultiplier(state.wave.index),
    maxDrunk: stats(kind).drunk * drunkMultiplier(state.wave.index),
    phase: 'walking',
    timer: 0,
    slow: 0,
    facing: { x: 0, y: 1 },
    variant: nextInt(state, BRO.variants),
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
    const bounty = BOUNTY[b.kind];
    state.money += bounty;
    state.popups.push({ id: state.nextEntityId++, text: `+$${bounty}`, pos: { ...b.pos }, tick: state.tick, kind: 'gain' });
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
        const inRange = rangedInRange(state, b.kind, b.tile);
        if (next === null || inRange) {
          // Adjacent to the statue (or a longshot with it in range): start the wind-up.
          b.phase = 'windup';
          b.timer = stats(b.kind).windup;
          b.facing = faceStatue(state, b.tile);
        } else {
          b.facing = { x: Math.sign(next.x - b.tile.x), y: Math.sign(next.y - b.tile.y) };
          b.tile = next;
        }
      } else {
        const base = stats(b.kind).speed;
        const speed = b.slow > 0 ? base * BRO.slowFactor : base;
        const step = Math.min(speed, d);
        b.pos.x += (dx / d) * step;
        b.pos.y += (dy / d) * step;
      }
      if (b.slow > 0) b.slow--;
      return;
    }
    case 'windup': {
      b.timer--;
      if (b.timer <= 0) b.phase = 'pissing';
      return;
    }
    case 'pissing': {
      if (b.kind === 'chucker') {
        // One throw, then back to winding up for the next one.
        const to = statueCenter(state);
        state.cups.push({ id: state.nextEntityId++, from: { ...b.pos }, to, pos: { ...b.pos }, progress: 0 });
        b.phase = 'windup';
        b.timer = CHUCKER.reloadTicks;
        return;
      }
      state.statueHp = Math.max(0, state.statueHp - stats(b.kind).piss);
      if (state.statueHp <= 0 && state.phase === 'playing') state.phase = 'lost';
      return;
    }
    case 'stagger': {
      b.timer--;
      if (b.timer <= 0) {
        // Resume. If he's adjacent to the statue, wind up again; otherwise keep walking.
        const arrived = Math.hypot(tileCenter(b.tile).x - b.pos.x, tileCenter(b.tile).y - b.pos.y) <= BRO.arriveEpsilon;
        const atStatue =
          arrived &&
          (nextTileToward(state.map, state.distToStatue, b.tile) === null || rangedInRange(state, b.kind, b.tile));
        if (atStatue) {
          b.phase = 'windup';
          b.timer = stats(b.kind).windup;
        } else {
          b.phase = 'walking';
        }
      }
      return;
    }
    case 'leaving':
      return;
  }
}

// Cups in flight. Straight line from the thrower to the statue; the arc is the
// renderer's business. A player standing at the shadow catches it. Landing hurts.
export function updateCups(state: GameState): void {
  const kept: typeof state.cups = [];
  for (const c of state.cups) {
    const len = Math.hypot(c.to.x - c.from.x, c.to.y - c.from.y) || 1;
    c.progress = Math.min(1, c.progress + CUP.speedPxPerTick / len);
    c.pos = { x: c.from.x + (c.to.x - c.from.x) * c.progress, y: c.from.y + (c.to.y - c.from.y) * c.progress };
    const caught = state.players.some((p) => Math.hypot(p.pos.x - c.pos.x, p.pos.y - c.pos.y) <= CUP.catchRadiusPx);
    if (caught) {
      state.popups.push({ id: state.nextEntityId++, text: 'caught!', pos: { ...c.pos }, tick: state.tick, kind: 'info' });
      continue;
    }
    if (c.progress >= 1) {
      state.statueHp = Math.max(0, state.statueHp - CUP.damage);
      state.popups.push({ id: state.nextEntityId++, text: `-${CUP.damage}`, pos: { ...c.pos }, tick: state.tick, kind: 'loss' });
      if (state.statueHp <= 0 && state.phase === 'playing') state.phase = 'lost';
      continue;
    }
    kept.push(c);
  }
  state.cups = kept;
}

// Called by the shout (session 3) and towers (session 5).
export function sober(b: BroState, amount: number): void {
  b.drunk = Math.max(0, b.drunk - amount);
}

// The shout's effect on him: a walker slows but keeps going; a bro at the
// statue (winding up or pissing) is interrupted and has to start over.
export function discipline(b: BroState): void {
  if (b.phase === 'leaving') return;
  if (b.phase === 'walking') {
    b.slow = BRO.slowTicks;
    return;
  }
  b.phase = 'stagger';
  b.timer = BRO.staggerTicks;
}

function faceStatue(state: GameState, tile: Vec): Vec {
  const s = state.map.statue;
  const cx = s.x + 0.5; // center of the 2x2 in tile units
  const cy = s.y + 0.5;
  return { x: Math.sign(cx - tile.x), y: Math.sign(cy - tile.y) };
}
