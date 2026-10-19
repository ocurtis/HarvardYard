// Plain data only. serialize -> restore must round-trip exactly.

import type { Kind, Placement } from '../config/game';

export type Cell = Kind | 'any'; // an order cell: a kind, or wildcard

export interface Box {
  id: number;
  order: Cell[]; // 4 cells, reading order: TL TR BL BR
  cells: (Kind | null)[]; // what's packed so far
  closing: number; // ticks left in the close animation before this box is replaced (0 = open)
  result: 'clean' | 'messy' | 'back' | null; // set when it closes
}

export type SimEventType = 'drop' | 'blocked' | 'close' | 'strike' | 'floor' | 'racked' | 'rackFull' | 'rackSold' | 'waveStart' | 'won' | 'lost';

export interface SimEvent {
  type: SimEventType;
  tick: number;
  box?: number; // box index
  result?: 'clean' | 'messy' | 'back';
  tip?: number;
}

export type GamePhase = 'playing' | 'won' | 'lost';

export interface PlayerState {
  id: number;
  box: number; // selected box index
  cell: number; // selected cell (cells mode)
}

export interface GameState {
  tick: number;
  seed: number;
  rng: number;
  playerCount: number;
  placement: Placement; // 'cells' or 'boxOnly' (DESIGN.md: both built, Owen picks)
  phase: GamePhase;
  players: PlayerState[];
  conveyor: Kind[]; // [0] is in hand; the rest are waiting, in order
  nextArrival: number; // tick the next square lands on the conveyor
  boxes: Box[];
  rack: Kind[];
  rackSoldAt: number; // tick the oldest racked square sells
  tips: number;
  strikes: number;
  streak: number; // clean boxes in a row
  wave: number; // index into the wave tables
  boxesThisWave: number;
  closedTotal: number;
  nextBoxId: number;
  events: SimEvent[];
}

export interface SimConfig {
  seed: number;
  playerCount: number;
  placement?: Placement;
}

// All input enters the sim as Commands tagged with the player and the tick.
export type Command =
  | { playerId: number; tick: number; type: 'selectBox'; box: number }
  | { playerId: number; tick: number; type: 'moveCell'; dx: -1 | 0 | 1; dy: -1 | 0 | 1 }
  | { playerId: number; tick: number; type: 'drop' }
  | { playerId: number; tick: number; type: 'rack' };
