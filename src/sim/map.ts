import type { MapData, TileKind, Vec } from './types';

const LEGEND: Record<string, TileKind> = {
  '.': 'grass',
  '=': 'path',
  T: 'tree',
  B: 'building',
  X: 'stone',
  S: 'statue',
  F: 'foot',
  G: 'gate',
  E: 'exit',
  Y: 'guide',
};

export function parseMap(text: string, expectedW: number, expectedH: number): MapData {
  const rows = text
    .split('\n')
    .map((r) => r.trimEnd())
    .filter((r) => r.length > 0);

  if (rows.length !== expectedH) {
    throw new Error(`map has ${rows.length} rows, expected ${expectedH}`);
  }

  const tiles: TileKind[] = [];
  const gates: Vec[] = [];
  const exits: Vec[] = [];
  let statue: Vec | null = null;
  let foot: Vec | null = null;
  let guide: Vec | null = null;

  rows.forEach((row, y) => {
    if (row.length !== expectedW) {
      throw new Error(`map row ${y} has ${row.length} chars, expected ${expectedW}: "${row}"`);
    }
    for (let x = 0; x < row.length; x++) {
      const ch = row[x]!;
      const kind = LEGEND[ch];
      if (!kind) throw new Error(`unknown map char "${ch}" at ${x},${y}`);
      tiles.push(kind);
      if (kind === 'gate') gates.push({ x, y });
      if (kind === 'exit') exits.push({ x, y });
      if (kind === 'statue' && statue === null) statue = { x, y };
      if (kind === 'foot') foot = { x, y };
      if (kind === 'guide') guide = { x, y };
    }
  });

  if (!statue) throw new Error('map has no statue');
  if (!foot) throw new Error('map has no foot tile');
  if (gates.length === 0) throw new Error('map has no gates');

  return { w: expectedW, h: expectedH, tiles, gates, exits, statue, foot, guide };
}

export function tileAt(map: MapData, tx: number, ty: number): TileKind | null {
  if (tx < 0 || ty < 0 || tx >= map.w || ty >= map.h) return null;
  return map.tiles[ty * map.w + tx] ?? null;
}

export function blocksMovement(kind: TileKind | null): boolean {
  // Off-map blocks. Gates are walkable so entities can enter and leave.
  if (kind === null) return true;
  return kind === 'tree' || kind === 'building' || kind === 'statue';
}

export function isBuildable(kind: TileKind | null): boolean {
  return kind === 'grass';
}
