// Plain data only. serialize -> restore must round-trip exactly.

export type SimEventType = 'move' | 'select' | 'nope';

export interface SimEvent {
  type: SimEventType;
  tick: number;
}

export type GamePhase = 'select' | 'starting';

export interface PlayerState {
  id: number;
  slot: number; // index into SLOTS; always a boss slot
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
