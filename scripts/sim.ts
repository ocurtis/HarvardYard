// Headless runner. Plays N games with a scripted policy and reports how far
// each got. Session 6 turns the policy into real placement strategies; for
// now the policy is "call the next wave as soon as allowed, wander randomly",
// which measures how long an undefended statue lasts.
//
//   npm run sim            # 10 games
//   npm run sim -- 100     # 100 games

import { WAVES } from '../src/config/waves';
import { nextInt } from '../src/sim/rng';
import { createState, step } from '../src/sim/sim';
import type { Command } from '../src/sim/types';
import { canStartWave } from '../src/sim/waves';

const games = Number(process.argv[2] ?? 10);
const maxTicks = 60 * 60 * 20; // 20 minutes of play, hard stop

const t0 = performance.now();
let totalTicks = 0;
const results: { seed: number; phase: string; wave: number; ticks: number }[] = [];

for (let g = 0; g < games; g++) {
  const state = createState({ seed: 1000 + g, playerCount: 1 });
  let dx: -1 | 0 | 1 = 1;
  let dy: -1 | 0 | 1 = 0;
  while (state.phase === 'playing' && state.tick < maxTicks) {
    const cmds: Command[] = [];
    if (canStartWave(state)) cmds.push({ playerId: 0, tick: state.tick, type: 'startWave' });
    if (state.tick % 30 === 0) {
      dx = (nextInt(state, 3) - 1) as -1 | 0 | 1;
      dy = (nextInt(state, 3) - 1) as -1 | 0 | 1;
    }
    cmds.push({ playerId: 0, tick: state.tick, type: 'move', dx, dy });
    step(state, cmds);
    totalTicks++;
  }
  results.push({ seed: state.seed, phase: state.phase, wave: state.wave.index + 1, ticks: state.tick });
}

for (const r of results) {
  console.log(`seed ${r.seed}: ${r.phase} on wave ${r.wave} at ${(r.ticks / 60).toFixed(1)}s`);
}
const ms = performance.now() - t0;
const won = results.filter((r) => r.phase === 'won').length;
console.log(`\n${games} games, win rate ${((won / games) * 100).toFixed(0)}% of ${WAVES.length} waves`);
console.log(`${totalTicks} ticks in ${ms.toFixed(0)}ms (${((totalTicks / ms) * 1000).toFixed(0)} ticks/s)`);
