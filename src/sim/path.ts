// Flow field for bros and tourists: BFS distance from the statue over
// walkable path tiles, 4-connected. Entities move to the neighbor with the
// lowest distance. The field is computed once per map and stored on state.

import { tileAt } from './map';
import type { MapData, TileKind, Vec } from './types';

// Tiles that bros and tourists may walk on. Grass is for the player and towers.
export function isLaneTile(kind: TileKind | null): boolean {
  return kind === 'path' || kind === 'foot' || kind === 'gate' || kind === 'exit' || kind === 'guide';
}

export function isStatueTile(kind: TileKind | null): boolean {
  return kind === 'statue';
}

const DIRS: Vec[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

// Lane tiles that touch the statue. A bro standing on one can piss.
export function statueAdjacentLaneTiles(map: MapData): Vec[] {
  const out: Vec[] = [];
  for (let y = 0; y < map.h; y++) {
    for (let x = 0; x < map.w; x++) {
      if (!isLaneTile(tileAt(map, x, y))) continue;
      if (DIRS.some((d) => isStatueTile(tileAt(map, x + d.x, y + d.y)))) out.push({ x, y });
    }
  }
  return out;
}

export function computeDistToStatue(map: MapData): number[] {
  return computeDistField(map, statueAdjacentLaneTiles(map));
}

export function computeDistToFoot(map: MapData): number[] {
  return computeDistField(map, [map.foot]);
}

export function computeDistToExit(map: MapData): number[] {
  return computeDistField(map, [...map.gates, ...map.exits]);
}

// BFS distance over lane tiles from a set of source tiles.
export function computeDistField(map: MapData, sources: Vec[], blocked?: Set<number>): number[] {
  const dist = new Array<number>(map.w * map.h).fill(-1);
  const queue: Vec[] = [];
  for (const t of sources) {
    if (!isLaneTile(tileAt(map, t.x, t.y))) continue;
    if (blocked?.has(t.y * map.w + t.x)) continue;
    dist[t.y * map.w + t.x] = 0;
    queue.push(t);
  }
  let head = 0;
  while (head < queue.length) {
    const cur = queue[head++]!;
    const d = dist[cur.y * map.w + cur.x]!;
    for (const dir of DIRS) {
      const nx = cur.x + dir.x;
      const ny = cur.y + dir.y;
      if (!isLaneTile(tileAt(map, nx, ny))) continue;
      const i = ny * map.w + nx;
      if (dist[i] !== -1 || blocked?.has(i)) continue;
      dist[i] = d + 1;
      queue.push({ x: nx, y: ny });
    }
  }
  return dist;
}

// The neighbor lane tile farther from the statue, preferring the one most in
// line with `dir`: where the wind sends a bro. Null when the only way back is
// straight into the wind (it is at his back; he is past the amp).
export function retreatTile(map: MapData, dist: number[], from: Vec, dir: Vec): Vec | null {
  const here = dist[from.y * map.w + from.x] ?? -1;
  let best: Vec | null = null;
  let bestScore = -Infinity;
  for (const d of DIRS) {
    const nx = from.x + d.x;
    const ny = from.y + d.y;
    if (!isLaneTile(tileAt(map, nx, ny))) continue;
    const nd = dist[ny * map.w + nx] ?? -1;
    if (nd === -1 || nd <= here) continue;
    const along = d.x * dir.x + d.y * dir.y;
    if (along < 0) continue; // only straight into the wind counts as "past it"; across it is fine
    const score = along * 10 + nd;
    if (score > bestScore) {
      bestScore = score;
      best = { x: nx, y: ny };
    }
  }
  return best;
}

// Next tile toward the statue from `from`, or null if already adjacent or stuck.
// Standing on a tile the field walls off (an amp's wind came up under him) still
// steps to the best reachable neighbor. Ties break in DIRS order, so the choice
// is deterministic.
export function nextTileToward(map: MapData, dist: number[], from: Vec): Vec | null {
  const here = dist[from.y * map.w + from.x] ?? -1;
  if (here === 0) return null;
  let best: Vec | null = null;
  let bestD = here === -1 ? Infinity : here;
  for (const dir of DIRS) {
    const nx = from.x + dir.x;
    const ny = from.y + dir.y;
    if (nx < 0 || ny < 0 || nx >= map.w || ny >= map.h) continue;
    const d = dist[ny * map.w + nx] ?? -1;
    if (d !== -1 && d < bestD) {
      bestD = d;
      best = { x: nx, y: ny };
    }
  }
  return best;
}
