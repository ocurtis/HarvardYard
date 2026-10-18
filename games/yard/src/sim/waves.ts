import { WAVES, scaleWaveForPlayers } from '../config/waves';
import { spawnBro } from './bros';
import { spawnGroup } from './tourists';
import type { GameState } from './types';

export function canStartWave(state: GameState): boolean {
  return state.phase === 'playing' && !state.wave.active && state.wave.index + 1 < WAVES.length;
}

export function startWave(state: GameState): void {
  if (!canStartWave(state)) return;
  state.wave.index++;
  const def = scaleWaveForPlayers(WAVES[state.wave.index]!, state.playerCount);
  state.wave.toSpawn = def.bros + def.longshots + def.chuckers + def.finals;
  state.wave.longshotsToSpawn = def.longshots;
  state.wave.chuckersToSpawn = def.chuckers;
  state.wave.finalsToSpawn = def.finals;
  state.wave.nextSpawnTick = state.tick; // first bro spawns this tick
  state.wave.groupsToSpawn = def.groups;
  // Tourists start half a spacing later so the first thing out of a gate is a bro.
  state.wave.nextTouristTick = state.tick + Math.floor(def.touristSpacingTicks / 2);
  state.wave.active = true;
}

export function updateWave(state: GameState): void {
  const w = state.wave;
  if (!w.active) return;
  const def = scaleWaveForPlayers(WAVES[w.index]!, state.playerCount);
  if (w.toSpawn > 0 && state.tick >= w.nextSpawnTick) {
    // Interleave longshots evenly through the wave: spawn one when the share says so.
    // Specials spawn when their remaining share of the wave says so; chuckers first
    // so they're walking (and throwing) while the regulars are still filing in.
    const total = def.bros + def.longshots + def.chuckers + def.finals;
    // Spawn a chucker whenever his remaining share is at or above the wave's: the first spawn of the wave is one.
    const chucker = w.chuckersToSpawn > 0 && w.chuckersToSpawn * total >= w.toSpawn * def.chuckers;
    // A finals club member walks in mid-wave, when the lane is already busy.
    const finals = !chucker && w.finalsToSpawn > 0 && w.toSpawn * 2 <= total + w.finalsToSpawn;
    const special = w.toSpawn - w.longshotsToSpawn - w.chuckersToSpawn - w.finalsToSpawn;
    const longshot = !chucker && !finals && w.longshotsToSpawn > 0 && w.longshotsToSpawn * 2 >= special;
    spawnBro(state, chucker ? 'chucker' : finals ? 'finals' : longshot ? 'longshot' : 'bro');
    if (chucker) w.chuckersToSpawn--;
    if (finals) w.finalsToSpawn--;
    if (longshot) w.longshotsToSpawn--;
    w.toSpawn--;
    w.nextSpawnTick = state.tick + def.spacingTicks;
  }
  if (w.groupsToSpawn > 0 && state.tick >= w.nextTouristTick) {
    spawnGroup(state);
    w.groupsToSpawn--;
    w.nextTouristTick = state.tick + def.touristSpacingTicks;
  }
  // The wave ends when every bro is gone and all tourists have spawned.
  // Lingering tourists carry over; that's fine, they're money on the table.
  if (w.toSpawn === 0 && w.groupsToSpawn === 0 && state.bros.length === 0 && state.cups.length === 0) {
    w.active = false;
    if (w.index + 1 >= WAVES.length && state.phase === 'playing') state.phase = 'won';
  }
}
