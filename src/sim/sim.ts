// The simulation. Pure TypeScript: no Phaser, no DOM, no timers.
// Advance it only through step(). Mutates state in place for speed;
// snapshot() gives you an exact copy.

import { EVENT_KEEP_TICKS, GRID_H, GRID_W, PLAYER, PLAYER_COUNT_MAX, POPUP_TICKS, STATUE, STATUE_LOW_HP, TILE } from '../config/game';
import { BUILDINGS, YARD_MAP } from '../config/maps/yard';
import { updateBros, updateCups } from './bros';
import { applyShout } from './shout';
import { blocksMovement, parseMap, tileAt } from './map';
import { computeDistField, computeDistToExit, computeDistToFoot, computeDistToStatue } from './path';
import { seedRng } from './rng';
import type { Command, GamePhase, GameState, MapData, PlayerState, SimConfig, Vec } from './types';
import { emit } from './events';
import { build, canBuild, speedAdd, updateTowers, upgradeSelf, upgradeTower } from './towers';
import { updateTourists } from './tourists';
import { startWave, updateWave } from './waves';

export function createState(config: SimConfig): GameState {
  const playerCount = Math.max(1, Math.min(PLAYER_COUNT_MAX, config.playerCount));
  const map = parseMap(YARD_MAP, GRID_W, GRID_H, BUILDINGS);
  const players: PlayerState[] = [];
  for (let i = 0; i < playerCount; i++) {
    players.push({
      id: i,
      pos: spawnPoint(map, i),
      facing: { x: 0, y: 1 },
      moving: false,
      shouting: false,
      upgrades: { shout: 0, range: 0, speed: 0 },
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
    distToStatueBros: computeDistToStatue(map),
    distToFoot: computeDistToFoot(map),
    distToExit: computeDistToExit(map),
    distToSpot: map.buildings.map((b) => (b.spot ? computeDistField(map, [b.spot]) : [])),
    players,
    bros: [],
    tourists: [],
    groups: {},
    towers: [],
    bones: [],
    cups: [],
    nextGroupId: 1,
    nextEntityId: 1,
    statueHp: STATUE.hp,
    money: 0,
    notice: null,
    popups: [],
    events: [],
    wave: { index: -1, toSpawn: 0, longshotsToSpawn: 0, chuckersToSpawn: 0, finalsToSpawn: 0, nextSpawnTick: 0, groupsToSpawn: 0, nextTouristTick: 0, active: false },
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
  for (const p of state.players) {
    p.moving = false;
    p.shouting = false;
  }

  for (const cmd of commands) {
    if (cmd.tick !== state.tick) continue; // stale or early command; ignore
    const player = state.players[cmd.playerId];
    if (!player) continue;
    if (cmd.type === 'move') applyMove(state.map, player, cmd.dx, cmd.dy);
    if (cmd.type === 'startWave') {
      const before = state.wave.index;
      startWave(state);
      if (state.wave.index !== before) emit(state, { type: 'waveStart' });
    }
    if (cmd.type === 'shout') applyShout(state, player);
    if (cmd.type === 'build') {
      const r = canBuild(state, player, cmd.kind);
      state.notice = { text: r.ok ? `built ${cmd.kind}` : `no: ${r.why}`, tick: state.tick };
      if (r.ok) build(state, player, cmd.kind);
    }
    if (cmd.type === 'upgradeTower') {
      const ok = upgradeTower(state, player);
      state.notice = { text: ok ? 'upgraded' : 'no: not on a tower, maxed, or too poor', tick: state.tick };
    }
    if (cmd.type === 'upgradeSelf') {
      const ok = upgradeSelf(state, player, cmd.stat);
      state.notice = { text: ok ? `${cmd.stat} up` : 'no: maxed or too poor', tick: state.tick };
    }
  }

  if (state.phase === 'playing') {
    const hpBefore = state.statueHp;
    updateWave(state);
    updateBros(state);
    updateCups(state);
    updateTourists(state);
    updateTowers(state);
    if (hpBefore >= STATUE_LOW_HP && state.statueHp < STATUE_LOW_HP) emit(state, { type: 'statueLow' });
    const after = state.phase as GamePhase;
    if (after === 'lost') emit(state, { type: 'lost' });
    if (after === 'won') emit(state, { type: 'won' });
    state.popups = state.popups.filter((p) => state.tick - p.tick < POPUP_TICKS);
  }
  state.events = state.events.filter((e) => state.tick - e.tick < EVENT_KEEP_TICKS);

  state.tick++;
}

function applyMove(map: MapData, p: PlayerState, dx: number, dy: number): void {
  if (dx === 0 && dy === 0) return;

  // Normalize diagonals so they aren't faster than cardinals.
  const len = Math.hypot(dx, dy);
  const speed = PLAYER.speedPxPerTick + speedAdd(p);
  const vx = (dx / len) * speed;
  const vy = (dy / len) * speed;

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
