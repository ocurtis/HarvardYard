// Plain data only. serialize -> restore must round-trip exactly.

export interface Vec {
  x: number;
  y: number;
}

export type SimEventType = 'move' | 'arrive' | 'select' | 'nope';

export interface SimEvent {
  type: SimEventType;
  tick: number;
}

export type GamePhase = 'select' | 'starting';

// Spot -1 is home (the statue); 0.. are STAGES.
export interface PlayerState {
  id: number;
  spot: number;
  pos: Vec; // where the cursor is drawn; walks toward its spot
  walking: boolean;
}

export interface GameState {
  tick: number;
  seed: number;
  rng: number;
  playerCount: number;
  phase: GamePhase;
  players: PlayerState[];
  chosen: number; // stage index once confirmed, else -1
  startTick: number;
  cleared: boolean[]; // one per stage (nothing clears them yet)
  events: SimEvent[];
}

export interface SimConfig {
  seed: number;
  playerCount: number;
}

export type Command =
  | { playerId: number; tick: number; type: 'move'; dx: -1 | 0 | 1; dy: -1 | 0 | 1 }
  | { playerId: number; tick: number; type: 'confirm' }
  | { playerId: number; tick: number; type: 'back' };
