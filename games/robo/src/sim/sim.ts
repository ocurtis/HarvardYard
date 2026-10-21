// The stage select, as a pure function of state and commands at 60Hz.
// No Phaser, no DOM, no timers, no Date, no Math.random.

import { seedRng } from '@shared/rng';
import { EVENT_KEEP_TICKS, HOME, MAP, STAGES } from '../config/game';
import type { Command, GameState, SimConfig, SimEvent, Vec } from './types';

export const HOME_SPOT = -1;

export function spotPos(spot: number): Vec {
  return spot === HOME_SPOT ? { x: HOME.x, y: HOME.y } : { x: STAGES[spot]!.x, y: STAGES[spot]!.y };
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
  for (let i = 0; i < config.playerCount; i++) s.players.push({ id: i, spot: HOME_SPOT, pos: spotPos(HOME_SPOT), walking: false });
  return s;
}

function emit(s: GameState, type: SimEvent['type']): void {
  s.events.push({ type, tick: s.tick });
}

// The nearest spot in roughly the pressed direction: within a 90-degree wedge,
// closest first. Home counts as a spot. Nothing that way means the press does nothing.
export function spotToward(from: number, dx: number, dy: number): number {
  const a = spotPos(from);
  let best = -2;
  let bestD = Infinity;
  for (let i = HOME_SPOT; i < STAGES.length; i++) {
    if (i === from) continue;
    const b = spotPos(i);
    const vx = b.x - a.x;
    const vy = b.y - a.y;
    const along = vx * dx + vy * dy;
    if (along <= 0) continue;
    const d = Math.hypot(vx, vy);
    if (along / d < Math.cos(Math.PI / 4)) continue; // outside the wedge
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best; // -2 = nothing that way
}

export function step(state: GameState, commands: Command[]): void {
  for (const cmd of commands) {
    const p = state.players.find((q) => q.id === cmd.playerId);
    if (!p || cmd.tick !== state.tick) continue;
    if (state.phase === 'select') {
      if (cmd.type === 'move' && (cmd.dx !== 0 || cmd.dy !== 0) && !p.walking) {
        const to = spotToward(p.spot, cmd.dx, cmd.dy);
        if (to !== -2) {
          p.spot = to;
          p.walking = true;
          emit(state, 'move');
        } else emit(state, 'nope');
      }
      if (cmd.type === 'confirm' && !p.walking) {
        if (p.spot === HOME_SPOT) emit(state, 'nope'); // home isn't a stage
        else {
          state.chosen = p.spot;
          state.startTick = state.tick;
          state.phase = 'starting';
          emit(state, 'select');
        }
      }
    } else if (state.phase === 'starting' && cmd.type === 'back') {
      // There's no stage to go to yet: back returns to the map.
      state.phase = 'select';
      state.chosen = -1;
    }
  }

  // The cursor walks toward its spot.
  for (const p of state.players) {
    if (!p.walking) continue;
    const b = spotPos(p.spot);
    const dx = b.x - p.pos.x;
    const dy = b.y - p.pos.y;
    const d = Math.hypot(dx, dy);
    if (d <= MAP.cursorSpeedPxPerTick) {
      p.pos = b;
      p.walking = false;
      emit(state, 'arrive');
    } else {
      p.pos.x += (dx / d) * MAP.cursorSpeedPxPerTick;
      p.pos.y += (dy / d) * MAP.cursorSpeedPxPerTick;
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
