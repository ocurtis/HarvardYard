// The Amp's wind. A cone of lane tiles in front of the amp; bros inside it are
// blown back along the lane toward the gate, and the routing field for bros
// treats those tiles as walls so new arrivals take another way in.
//
// Rules (DESIGN.md): the wind can never seal a gate off from the statue (the
// build or upgrade that would do it is refused), nor box a bro in; a bro the
// wind would only push toward the statue is "past it" and is left alone; a
// chucker is tower-immune and ignores the wind entirely (routing still applies).

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

// Is a pixel position inside this amp's wind cone? Used to pick the wind tiles;
// the sim itself goes by tiles (see updateAmps), never by this directly.
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
  return computeDistField(state.map, statueAdjacentLaneTiles(state.map), blockedTiles(state, extra));
}

// Every wind tile on the map, as field indices; `extra` swaps in a what-if amp.
export function blockedTiles(state: GameState, extra?: { tower: TowerState; level: number }): Set<number> {
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
  return blocked;
}

// Every gate still reaches the statue on this field.
export function allGatesReach(state: GameState, field: number[]): boolean {
  return state.map.gates.every((g) => (field[g.y * state.map.w + g.x] ?? -1) >= 0);
}

// Would this field strand a stretch of lane? Walls may only ever remove the wind
// tiles themselves: if any other lane tile that reaches the statue today stops
// reaching it, two winds have boxed a corridor in, and a bro shoved into it
// would bounce there forever (the wave could never end).
export function strandsLane(state: GameState, field: number[], blocked: Set<number>): boolean {
  const w = state.map.w;
  for (let y = 0; y < state.map.h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!isLaneTile(tileAt(state.map, x, y)) || blocked.has(i)) continue;
      if ((state.distToStatue[i] ?? -1) >= 0 && (field[i] ?? -1) < 0) return true;
    }
  }
  return false;
}

// Why an amp can't go here with this field, or '' if it can.
export function windObjection(state: GameState, field: number[], blocked: Set<number>): string {
  if (!allGatesReach(state, field)) return 'would block the Yard';
  if (strandsLane(state, field, blocked)) return 'would box a lane in';
  return '';
}

export function recomputeBroField(state: GameState): void {
  state.distToStatueBros = computeBroField(state);
}
