// Towers. The Dig lobs bones at the nearest bro in range. The Sprinkler
// soaks everything in range: bros slow and sober a little; tourists just
// walk slower for a moment, nothing worse. Towers never cost you a tourist;
// only the player's own shout can do that. The player builds by standing
// on a grass tile and paying.

import { TILE } from '../config/game';
import { BONE, SELF_UPGRADE, SPRINKLER, TOWERS, type SelfStat, type TowerKind } from '../config/towers';
import { discipline, sober, tileCenter } from './bros';
import { isBuildable, tileAt } from './map';
import type { BoneState, GameState, PlayerState, TowerState, Vec } from './types';

export function playerTile(p: PlayerState): Vec {
  return { x: Math.floor(p.pos.x / TILE), y: Math.floor(p.pos.y / TILE) };
}

export function towerAt(state: GameState, tile: Vec): TowerState | undefined {
  return state.towers.find((t) => t.tile.x === tile.x && t.tile.y === tile.y);
}

export function canBuild(state: GameState, player: PlayerState, kind: TowerKind): { ok: boolean; why: string } {
  const tile = playerTile(player);
  if (!isBuildable(tileAt(state.map, tile.x, tile.y))) return { ok: false, why: 'not grass' };
  if (towerAt(state, tile)) return { ok: false, why: 'occupied' };
  if (state.money < TOWERS[kind].cost) return { ok: false, why: 'too poor' };
  return { ok: true, why: '' };
}

export function build(state: GameState, player: PlayerState, kind: TowerKind): boolean {
  if (!canBuild(state, player, kind).ok) return false;
  state.money -= TOWERS[kind].cost;
  state.towers.push({ id: state.nextEntityId++, kind, tile: playerTile(player), level: 0, cooldown: 0 });
  return true;
}

export function upgradeTower(state: GameState, player: PlayerState): boolean {
  const t = towerAt(state, playerTile(player));
  if (!t) return false;
  const cost = TOWERS[t.kind].levels[t.level]!.upgradeCost;
  if (cost === null || state.money < cost) return false;
  state.money -= cost;
  t.level++;
  return true;
}

export function upgradeSelf(state: GameState, player: PlayerState, stat: SelfStat): boolean {
  const level = player.upgrades[stat];
  const cost = SELF_UPGRADE.costs[level];
  if (cost === undefined || state.money < cost) return false;
  state.money -= cost;
  player.upgrades[stat]++;
  return true;
}

export function towerRange(t: TowerState): number {
  return TOWERS[t.kind].levels[t.level]!.rangePx;
}

export function updateTowers(state: GameState): void {
  for (const t of state.towers) {
    if (t.kind === 'dig') updateDig(state, t);
    else updateSprinkler(state, t);
  }
  updateBones(state);
}

function updateDig(state: GameState, t: TowerState): void {
  if (t.cooldown > 0) {
    t.cooldown--;
    return;
  }
  const lvl = TOWERS.dig.levels[t.level]!;
  const c = tileCenter(t.tile);
  const target = nearestBro(state, c, lvl.rangePx);
  if (!target) return;
  state.bones.push({ id: state.nextEntityId++, pos: { ...c }, target, sober: lvl.sober });
  t.cooldown = lvl.fireTicks;
}

// Towers can't touch a chucker: he's the player's job.
function towerImmune(b: { kind: string }): boolean {
  return b.kind === 'chucker';
}

// Nearest bro within range.
function nearestBro(state: GameState, from: Vec, range: number): BoneState['target'] | null {
  let best: BoneState['target'] | null = null;
  let bestD = range;
  for (const b of state.bros) {
    if (b.phase === 'leaving' || towerImmune(b)) continue;
    const d = Math.hypot(b.pos.x - from.x, b.pos.y - from.y);
    if (d <= bestD) {
      bestD = d;
      best = { kind: 'bro', id: b.id };
    }
  }
  return best;
}

function updateBones(state: GameState): void {
  const keep: BoneState[] = [];
  for (const bone of state.bones) {
    const target = state.bros.find((b) => b.id === bone.target.id);
    if (!target) continue; // target gone; the bone vanishes
    const dx = target.pos.x - bone.pos.x;
    const dy = target.pos.y - bone.pos.y;
    const d = Math.hypot(dx, dy);
    if (d <= BONE.speedPxPerTick) {
      sober(target, bone.sober);
      discipline(target);
      continue;
    }
    bone.pos.x += (dx / d) * BONE.speedPxPerTick;
    bone.pos.y += (dy / d) * BONE.speedPxPerTick;
    keep.push(bone);
  }
  state.bones = keep;
}

function updateSprinkler(state: GameState, t: TowerState): void {
  const lvl = TOWERS.sprinkler.levels[t.level]!;
  const c = tileCenter(t.tile);
  for (const b of state.bros) {
    if (b.phase === 'leaving' || towerImmune(b)) continue;
    if (Math.hypot(b.pos.x - c.x, b.pos.y - c.y) <= lvl.rangePx) {
      sober(b, lvl.sober / 60);
      if (b.phase === 'walking') b.slow = Math.max(b.slow, SPRINKLER.slowTicks);
    }
  }
  for (const tr of state.tourists) {
    if (Math.hypot(tr.pos.x - c.x, tr.pos.y - c.y) <= lvl.rangePx) tr.wet = SPRINKLER.wetTicks;
  }
}

// Player stat helpers used by the shout and movement.
export function shoutMult(p: PlayerState): number {
  return SELF_UPGRADE.shoutMult[p.upgrades.shout] ?? 1;
}
export function shoutRangeAdd(p: PlayerState): number {
  return SELF_UPGRADE.rangeAdd[p.upgrades.range] ?? 0;
}
export function speedAdd(p: PlayerState): number {
  return SELF_UPGRADE.speedAdd[p.upgrades.speed] ?? 0;
}
