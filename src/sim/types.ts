// Pure data. Everything here must survive JSON.stringify / JSON.parse unchanged.

export interface Vec {
  x: number;
  y: number;
}

export type TileKind = 'grass' | 'path' | 'tree' | 'statue' | 'foot' | 'gate' | 'guide';

export interface MapData {
  w: number;
  h: number;
  tiles: TileKind[]; // row-major, length w*h
  gates: Vec[]; // tile coords
  statue: Vec; // top-left tile of the 2x2
  foot: Vec; // tile coord
  guide: Vec | null; // tile coord
}

export interface PlayerState {
  id: number;
  pos: Vec; // pixel coords, center of the player
  facing: Vec; // unit-ish direction, last non-zero move
  moving: boolean;
}

export interface GameState {
  tick: number;
  seed: number;
  rng: number; // mulberry32 internal state; lives in GameState so snapshots are exact
  playerCount: number;
  map: MapData;
  players: PlayerState[];
}

// Input enters the sim only as commands. Keyboard produces these locally;
// a relay will produce them later for online play.
export type Command =
  | { playerId: number; tick: number; type: 'move'; dx: -1 | 0 | 1; dy: -1 | 0 | 1 };

export interface SimConfig {
  playerCount: number;
  seed: number;
}
