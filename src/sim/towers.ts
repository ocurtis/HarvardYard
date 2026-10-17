// Towers. The Dig lobs bones at the nearest bro in range. The Sprinkler
// soaks everything in range: bros slow and sober a little; tourists just
// walk slower for a moment, nothing worse. Towers never cost you a tourist;
// only the player's own shout can do that. The player builds by standing
// on a grass tile and paying.

import { BRO, TILE } from '../config/game';
import { AMP, BONE, SELF_UPGRADE, SPRINKLER, TOWERS, type SelfStat, type TowerKind } from '../config/towers';
import { discipline, sober, tileCenter } from './bros';
import { emit } from './events';
import { isBuildable, tileAt } from './map';
import { retreatTile } from './path';
import type { BoneState, BroState, GameState, PlayerState, TowerState, Vec } from './types';
import { computeBroField, inWind, recomputeBroField, snapCardinal, windObjection } from './wind';

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
  if (kind === 'amp') {
    const why = windObjection(state, computeBroField(state, { tower: proposedAmp(state, player), level: 0 }));
    if (why) return { ok: false, why };
  }
  return { ok: true, why: '' };
}

// The amp the player is about to build: on his tile, blowing the way he faces.
function proposedAmp(state: GameState, player: PlayerState): TowerState {
  return { id: -1, kind: 'amp', tile: playerTile(player), level: 0, cooldown: 0, facing: snapCardinal(player.facing) };
}

export function build(state: GameState, player: PlayerState, kind: TowerKind): boolean {
  if (!canBuild(state, player, kind).ok) return false;
  state.money -= TOWERS[kind].cost;
  const t: TowerState = { ...proposedAmp(state, player), id: state.nextEntityId++, kind };
  if (kind !== 'amp') t.facing = { x: 0, y: 1 };
  state.towers.push(t);
  emit(state, { type: 'towerBuilt', tower: kind, pos: tileCenter(t.tile) });
  if (kind === 'amp') recomputeBroField(state);
  return true;
}

export function upgradeTower(state: GameState, player: PlayerState): boolean {
  const t = towerAt(state, playerTile(player));
  if (!t) return false;
  const cost = TOWERS[t.kind].levels[t.level]!.upgradeCost;
  if (cost === null || state.money < cost) return false;
  if (t.kind === 'amp' && windObjection(state, computeBroField(state, { tower: t, level: t.level + 1 }))) return false;
  state.money -= cost;
  t.level++;
  if (t.kind === 'amp') recomputeBroField(state);
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
    else if (t.kind === 'sprinkler') updateSprinkler(state, t);
  }
  updateAmps(state);
  updateBones(state);
}

// The wind. Every bro in any amp's cone loses his footing the tick he enters,
// sobers a little per second, and slides back along the lane toward the gate
// while he is in it. A chucker is a tower-immune wall of meat and ignores it. A bro
// the wind would only push toward the statue is past the amp and is left alone.
function updateAmps(state: GameState): void {
  const amps = state.towers.filter((t) => t.kind === 'amp');
  for (const b of state.bros) {
    if (b.phase === 'leaving' || towerImmune(b)) continue; // a chucker is too heavy for the wind
    const amp = amps.find((t) => inWind(t, t.level, b.pos));
    if (!amp) {
      b.inWind = false;
      if (b.windTo) slide(b, b.windTo); // finish the shove he was given
      continue;
    }
    const lvl = TOWERS.amp.levels[amp.level]!;
    const here = { x: Math.floor(b.pos.x / TILE), y: Math.floor(b.pos.y / TILE) };
    const back = retreatTile(state.map, state.distToStatue, here, amp.facing);
    if (!b.inWind) {
      b.inWind = true;
      if (back === null) continue; // past it: the wind is at his back
      emit(state, { type: 'windEnter', kind: b.kind, pos: { ...b.pos } });
      if (AMP.entryStagger) {
        // Even a walker loses his footing here (discipline only slows a walker).
        if (b.phase !== 'stagger') emit(state, { type: 'stagger', kind: b.kind, pos: { ...b.pos }, by: 'amp' });
        b.phase = 'stagger';
        b.timer = BRO.staggerTicks;
      }
    }
    if (back === null) continue;
    sober(b, lvl.sober / 60);
    b.windTo = back;
    b.facing = { x: -amp.facing.x, y: -amp.facing.y }; // braced against the wind
    slide(b, back);
  }
}

// One tick of being shoved toward a tile. He stays off balance while sliding so the
// walker logic doesn't fight the push, and resumes from wherever he lands.
function slide(b: BroState, to: Vec): void {
  const c = tileCenter(to);
  const dx = c.x - b.pos.x;
  const dy = c.y - b.pos.y;
  const d = Math.hypot(dx, dy);
  const step = Math.min(AMP.pushPxPerTick, d);
  if (d > 0) {
    b.pos.x += (dx / d) * step;
    b.pos.y += (dy / d) * step;
  }
  b.tile = to;
  b.phase = 'stagger';
  b.timer = Math.max(b.timer, AMP.windStaggerTicks);
  if (d - step < 0.01) {
    b.pos = c;
    b.windTo = null;
  }
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
  emit(state, { type: 'boneThrow', pos: { ...c } });
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
      emit(state, { type: 'boneHit', kind: target.kind, pos: { ...target.pos } });
      discipline(state, target, 'bone');
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
