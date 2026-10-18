// Plain data only. serialize -> restore must round-trip exactly.

export interface Vec {
  x: number;
  y: number;
}

export interface PlayerState {
  id: number;
  pos: Vec;
  facing: Vec;
}

export type SimEventType = 'started';

export interface SimEvent {
  type: SimEventType;
  tick: number;
  pos?: Vec;
}

export type GamePhase = 'playing' | 'won' | 'lost';

export interface GameState {
  tick: number;
  seed: number;
  rng: number; // mulberry32 state; lives here so snapshots are exact
  playerCount: number;
  phase: GamePhase;
  players: PlayerState[];
  events: SimEvent[]; // one-shots this tick, for the audio layer; pruned by the sim
}

export interface SimConfig {
  seed: number;
  playerCount: number;
}

// All input enters the sim as Commands tagged with the player and the tick.
export type Command =
  | { playerId: number; tick: number; type: 'move'; dx: -1 | 0 | 1; dy: -1 | 0 | 1 }
  | { playerId: number; tick: number; type: 'action' };
