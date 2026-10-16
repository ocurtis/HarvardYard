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
  state.wave.toSpawn = def.bros;
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
    spawnBro(state);
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
  if (w.toSpawn === 0 && w.groupsToSpawn === 0 && state.bros.length === 0) {
    w.active = false;
    if (w.index + 1 >= WAVES.length && state.phase === 'playing') state.phase = 'won';
  }
}
