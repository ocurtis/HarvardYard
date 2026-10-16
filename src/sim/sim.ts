// The simulation. Pure TypeScript: no Phaser, no DOM, no timers.
// Advance it only through step(). Mutates state in place for speed;
// snapshot() gives you an exact copy.

import { GRID_H, GRID_W, PLAYER, PLAYER_COUNT_MAX, STATUE, TILE } from '../config/game';
import { YARD_MAP } from '../config/maps/yard';
import { updateBros } from './bros';
import { blocksMovement, parseMap, tileAt } from './map';
import { computeDistToStatue } from './path';
import { seedRng } from './rng';
import type { Command, GameState, MapData, PlayerState, SimConfig, Vec } from './types';
import { startWave, updateWave } from './waves';

export function createState(config: SimConfig): GameState {
  const playerCount = Math.max(1, Math.min(PLAYER_COUNT_MAX, config.playerCount));
  const map = parseMap(YARD_MAP, GRID_W, GRID_H);
  const players: PlayerState[] = [];
  for (let i = 0; i < playerCount; i++) {
    players.push({
      id: i,
      pos: spawnPoint(map, i),
      facing: { x: 0, y: 1 },
      moving: false,
    });
  }
  return {
    tick: 0,
    seed: config.seed,
    rng: seedRng(config.seed),
    playerCount,
    phase: 'playing',
    map,
    distToStatue: computeDistToStatue(map),
    players,
    bros: [],
    nextEntityId: 1,
    statueHp: STATUE.hp,
    wave: { index: -1, toSpawn: 0, nextSpawnTick: 0, active: false },
  };
}

// Players start just above the foot (the Yard side of the statue), fanned out
// so co-op doesn't stack them.
function spawnPoint(map: MapData, index: number): Vec {
  const fx = map.foot.x * TILE + TILE / 2;
  const fy = (map.foot.y - 1) * TILE + TILE / 2;
  const offsets = [0, -1, 1, -2];
  return { x: fx + (offsets[index] ?? 0) * TILE, y: fy };
}

export function step(state: GameState, commands: Command[]): void {
  for (const p of state.players) p.moving = false;

  for (const cmd of commands) {
    if (cmd.tick !== state.tick) continue; // stale or early command; ignore
    const player = state.players[cmd.playerId];
    if (!player) continue;
    if (cmd.type === 'move') applyMove(state.map, player, cmd.dx, cmd.dy);
    if (cmd.type === 'startWave') startWave(state);
  }

  if (state.phase === 'playing') {
    updateWave(state);
    updateBros(state);
  }

  state.tick++;
}

function applyMove(map: MapData, p: PlayerState, dx: number, dy: number): void {
  if (dx === 0 && dy === 0) return;

  // Normalize diagonals so they aren't faster than cardinals.
  const len = Math.hypot(dx, dy);
  const vx = (dx / len) * PLAYER.speedPxPerTick;
  const vy = (dy / len) * PLAYER.speedPxPerTick;

  p.facing = { x: dx, y: dy };
  p.moving = true;

  // Axis-separated collision: try x, then y, so sliding along walls works.
  const nx = p.pos.x + vx;
  if (!collides(map, nx, p.pos.y)) p.pos.x = nx;
  const ny = p.pos.y + vy;
  if (!collides(map, p.pos.x, ny)) p.pos.y = ny;
}

function collides(map: MapData, cx: number, cy: number): boolean {
  const hw = PLAYER.hitboxW / 2;
  const hh = PLAYER.hitboxH / 2;
  const corners: Vec[] = [
    { x: cx - hw, y: cy - hh },
    { x: cx + hw - 1, y: cy - hh },
    { x: cx - hw, y: cy + hh - 1 },
    { x: cx + hw - 1, y: cy + hh - 1 },
  ];
  for (const c of corners) {
    const tx = Math.floor(c.x / TILE);
    const ty = Math.floor(c.y / TILE);
    if (blocksMovement(tileAt(map, tx, ty))) return true;
  }
  return false;
}

export function snapshot(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

export function serialize(state: GameState): string {
  return JSON.stringify(state);
}

export function restore(json: string): GameState {
  return JSON.parse(json) as GameState;
}
