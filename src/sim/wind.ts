// The Amp's wind. A cone of lane tiles in front of the amp; bros inside it are
// blown back along the lane toward the gate, and the routing field for bros
// treats those tiles as walls so new arrivals take another way in.
//
// Rules (DESIGN.md): the wind can never seal a gate off from the statue (the
// build or upgrade that would do it is refused); a bro the wind would only
// push toward the statue is "past it" and is left alone; a chucker is too fat
// to blow and only loses his footing.

import { TILE } from '../config/game';
import { AMP, TOWERS } from '../config/towers';
import { tileCenter } from './bros';
import { tileAt } from './map';
import { computeDistField, isLaneTile, statueAdjacentLaneTiles } from './path';
import type { GameState, MapData, TowerState, Vec } from './types';

export function snapCardinal(v: Vec): Vec {
  if (v.x === 0 && v.y === 0) return { x: 0, y: 1 };
  if (Math.abs(v.x) >= Math.abs(v.y)) return { x: Math.sign(v.x), y: 0 };
  return { x: 0, y: Math.sign(v.y) };
}

// Is a pixel position inside this amp's wind cone?
export function inWind(t: TowerState, level: number, pos: Vec): boolean {
  const c = tileCenter(t.tile);
  const dx = pos.x - c.x;
  const dy = pos.y - c.y;
  const d = Math.hypot(dx, dy);
  if (d < 1) return false; // the amp's own tile
  if (d > TOWERS.amp.levels[level]!.rangePx) return false;
  const along = (dx * t.facing.x + dy * t.facing.y) / d;
  const half = (AMP.halfAngleDeg[level] ?? AMP.halfAngleDeg[0]!) * (Math.PI / 180);
  return along >= Math.cos(half);
}

// Lane tiles whose centers sit in the cone. These are walls for bro routing.
export function windTiles(map: MapData, t: TowerState, level: number): Vec[] {
  const out: Vec[] = [];
  const r = Math.ceil(TOWERS.amp.levels[level]!.rangePx / TILE) + 1;
  for (let y = t.tile.y - r; y <= t.tile.y + r; y++) {
    for (let x = t.tile.x - r; x <= t.tile.x + r; x++) {
      if (!isLaneTile(tileAt(map, x, y))) continue;
      if (inWind(t, level, tileCenter({ x, y }))) out.push({ x, y });
    }
  }
  return out;
}

// The bro routing field with every amp's wind tiles walled off. `extra` lets a
// build/upgrade ask "what if" before committing.
export function computeBroField(state: GameState, extra?: { tower: TowerState; level: number }): number[] {
  const blocked = new Set<number>();
  const add = (t: TowerState, level: number) => {
    for (const w of windTiles(state.map, t, level)) blocked.add(w.y * state.map.w + w.x);
  };
  for (const t of state.towers) {
    if (t.kind !== 'amp') continue;
    if (extra && extra.tower.id === t.id) continue;
    add(t, t.level);
  }
  if (extra) add(extra.tower, extra.level);
  return computeDistField(state.map, statueAdjacentLaneTiles(state.map), blocked);
}

// Every gate still reaches the statue on this field.
export function allGatesReach(state: GameState, field: number[]): boolean {
  return state.map.gates.every((g) => (field[g.y * state.map.w + g.x] ?? -1) >= 0);
}

// Would this field leave a bro with nowhere to go? A bro whose own tile and every
// lane neighbor are walled off would bounce in the wind forever and the wave
// could never end. (A bro standing on a wind tile with a way out is fine.)
export function trapsBro(state: GameState, field: number[]): boolean {
  const w = state.map.w;
  const at = (x: number, y: number) => (isLaneTile(tileAt(state.map, x, y)) ? (field[y * w + x] ?? -1) : -2);
  return state.bros.some((b) => {
    if (b.phase === 'leaving') return false;
    const { x, y } = b.tile;
    if (at(x, y) >= 0) return false;
    return [at(x + 1, y), at(x - 1, y), at(x, y + 1), at(x, y - 1)].every((d) => d < 0);
  });
}

// Why an amp can't go here with this field, or '' if it can.
export function windObjection(state: GameState, field: number[]): string {
  if (!allGatesReach(state, field)) return 'would block the Yard';
  if (trapsBro(state, field)) return 'a bro is in the way';
  return '';
}

export function recomputeBroField(state: GameState): void {
  state.distToStatueBros = computeBroField(state);
}
