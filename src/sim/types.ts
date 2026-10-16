// Pure data. Everything here must survive JSON.stringify / JSON.parse unchanged.

export interface Vec {
  x: number;
  y: number;
}

export type TileKind = 'grass' | 'path' | 'tree' | 'building' | 'stone' | 'statue' | 'foot' | 'gate' | 'exit' | 'guide';

export interface MapData {
  w: number;
  h: number;
  tiles: TileKind[]; // row-major, length w*h
  gates: Vec[]; // tile coords; bros and tourists spawn here
  exits: Vec[]; // tile coords; tourists may leave here (gates also count as exits)
  statue: Vec; // top-left tile of the 2x2
  foot: Vec; // tile coord
  guide: Vec | null; // tile coord
}

export interface PlayerState {
  id: number;
  pos: Vec; // pixel coords, center of the player
  facing: Vec; // unit-ish direction, last non-zero move
  moving: boolean;
  shouting: boolean; // true on ticks a shout command was applied (for render)
}

export type BroPhase = 'walking' | 'windup' | 'pissing' | 'stagger' | 'leaving';

export interface BroState {
  id: number;
  pos: Vec; // pixel center
  tile: Vec; // the tile he is walking toward (or standing on when arrived)
  drunk: number; // health bar; 0 = sober = removed
  phase: BroPhase;
  timer: number; // ticks left in windup/stagger
  slow: number; // ticks of slow remaining (shout on a walker)
  facing: Vec;
}

export interface WaveState {
  index: number; // 0-based; -1 before the first wave is called
  toSpawn: number; // bros still to spawn in this wave
  nextSpawnTick: number;
  active: boolean; // true from call until every bro of the wave is gone
}

export type GamePhase = 'playing' | 'lost' | 'won';

export interface GameState {
  tick: number;
  seed: number;
  rng: number; // mulberry32 internal state; lives in GameState so snapshots are exact
  playerCount: number;
  phase: GamePhase;
  map: MapData;
  // Distance (in tiles) from every tile to the nearest statue-adjacent
  // walkable tile, over walkable tiles only; -1 = unreachable. Derived from
  // the map at creation; kept on state so snapshots are self-contained.
  distToStatue: number[];
  players: PlayerState[];
  bros: BroState[];
  nextEntityId: number;
  statueHp: number;
  wave: WaveState;
}

// Input enters the sim only as commands. Keyboard produces these locally;
// a relay will produce them later for online play.
export type Command =
  | { playerId: number; tick: number; type: 'move'; dx: -1 | 0 | 1; dy: -1 | 0 | 1 }
  | { playerId: number; tick: number; type: 'startWave' }
  | { playerId: number; tick: number; type: 'shout' };

export interface SimConfig {
  playerCount: number;
  seed: number;
}
