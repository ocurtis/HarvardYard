// One-shot sim events for the audio layer. Plain data on GameState.events;
// the sim prunes them after EVENT_KEEP_TICKS. Kept in its own module so every
// sim file can emit without importing sim.ts.
import type { GameState, SimEvent } from './types';

export function emit(state: GameState, e: Omit<SimEvent, 'tick'>): void {
  state.events.push({ ...e, tick: state.tick });
}
