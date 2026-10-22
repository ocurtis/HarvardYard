// The stage select, as a pure function of state and commands at 60Hz.
// No Phaser, no DOM, no timers, no Date, no Math.random.

import { seedRng } from '@shared/rng';
import { EVENT_KEEP_TICKS, GRID, SLOTS, STAGES } from '../config/game';
import type { Command, GameState, SimConfig, SimEvent } from './types';

export const BOSS_SLOTS = SLOTS.map((s, i) => (s.kind === 'boss' ? i : -1)).filter((i) => i >= 0);

export function stageOfSlot(slot: number): number {
  const id = SLOTS[slot]?.stage;
  return STAGES.findIndex((s) => s.id === id);
}

export function createState(config: SimConfig): GameState {
  const s: GameState = {
    tick: 0,
    seed: config.seed,
    rng: seedRng(config.seed),
    playerCount: config.playerCount,
    phase: 'select',
    players: [],
    chosen: -1,
    startTick: -1,
    cleared: STAGES.map(() => false),
    events: [],
  };
  for (let i = 0; i < config.playerCount; i++) s.players.push({ id: i, slot: BOSS_SLOTS[0]! });
  return s;
}

function emit(s: GameState, type: SimEvent['type']): void {
  s.events.push({ type, tick: s.tick });
}

// The nearest boss slot in roughly the pressed direction, on the grid: within a
// 90-degree wedge, closest first; wraps around the grid if nothing is that way.
export function slotToward(from: number, dx: number, dy: number): number {
  const a = SLOTS[from]!;
  const pick = (wrap: boolean) => {
    let best = -1;
    let bestD = Infinity;
    for (const i of BOSS_SLOTS) {
      if (i === from) continue;
      const b = SLOTS[i]!;
      let vx = b.col - a.col;
      let vy = b.row - a.row;
      if (wrap) {
        if (dx !== 0) vx = ((vx * dx + GRID.n) % GRID.n) * dx;
        if (dy !== 0) vy = ((vy * dy + GRID.n) % GRID.n) * dy;
      }
      const along = vx * dx + vy * dy;
      if (along <= 0) continue;
      const d = Math.hypot(vx, vy);
      if (along / d < Math.cos(Math.PI / 4) - 1e-9) continue;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  };
  const direct = pick(false);
  return direct >= 0 ? direct : pick(true);
}

export function step(state: GameState, commands: Command[]): void {
  for (const cmd of commands) {
    const p = state.players.find((q) => q.id === cmd.playerId);
    if (!p || cmd.tick !== state.tick) continue;
    if (state.phase === 'select') {
      if (cmd.type === 'move' && (cmd.dx !== 0 || cmd.dy !== 0)) {
        const to = slotToward(p.slot, cmd.dx, cmd.dy);
        if (to >= 0 && to !== p.slot) {
          p.slot = to;
          emit(state, 'move');
        } else emit(state, 'nope');
      }
      if (cmd.type === 'confirm') {
        state.chosen = stageOfSlot(p.slot);
        state.startTick = state.tick;
        state.phase = 'starting';
        emit(state, 'select');
      }
    } else if (state.phase === 'starting' && cmd.type === 'back') {
      state.phase = 'select';
      state.chosen = -1;
    }
  }
  state.events = state.events.filter((e) => state.tick - e.tick < EVENT_KEEP_TICKS);
  state.tick++;
}

export function serialize(state: GameState): string {
  return JSON.stringify(state);
}

export function restore(json: string): GameState {
  return JSON.parse(json) as GameState;
}
