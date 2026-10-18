// The whole game, as a pure function of state and commands, stepped at 60Hz.
// No Phaser, no DOM, no timers, no Date, no Math.random (use @shared/rng).

import { seedRng } from '@shared/rng';
import { LOGICAL_H, LOGICAL_W, PLAYER } from '../config/game';
import type { Command, GameState, SimConfig } from './types';

const EVENT_KEEP_TICKS = 12;

export function createState(config: SimConfig): GameState {
  const players = [];
  for (let i = 0; i < config.playerCount; i++) {
    players.push({ id: i, pos: { x: LOGICAL_W / 2 + i * 24, y: LOGICAL_H / 2 }, facing: { x: 0, y: 1 } });
  }
  return { tick: 0, seed: config.seed, rng: seedRng(config.seed), playerCount: config.playerCount, phase: 'playing', players, events: [] };
}

export function step(state: GameState, commands: Command[]): void {
  for (const cmd of commands) {
    const p = state.players[cmd.playerId];
    if (!p || cmd.tick !== state.tick) continue;
    if (cmd.type === 'move') {
      p.pos.x = Math.max(0, Math.min(LOGICAL_W, p.pos.x + cmd.dx * PLAYER.speedPxPerTick));
      p.pos.y = Math.max(0, Math.min(LOGICAL_H, p.pos.y + cmd.dy * PLAYER.speedPxPerTick));
      if (cmd.dx !== 0 || cmd.dy !== 0) p.facing = { x: cmd.dx, y: cmd.dy };
    }
    if (cmd.type === 'action') state.events.push({ type: 'started', tick: state.tick, pos: { ...p.pos } });
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
