// Headless runner. Session 6 turns this into the balance tool
// (N games, scripted policy, win rate by wave). For now it proves the sim
// runs without a browser and reports how fast it goes.
//
//   npm run sim            # 10 games x 3600 ticks
//   npm run sim -- 100     # 100 games

import { createState, step } from '../src/sim/sim';
import type { Command } from '../src/sim/types';
import { nextInt } from '../src/sim/rng';

const games = Number(process.argv[2] ?? 10);
const ticksPerGame = 60 * 60; // one minute of play

const t0 = performance.now();
let totalTicks = 0;

for (let g = 0; g < games; g++) {
  const state = createState({ seed: 1000 + g, playerCount: 1 });
  let dx: -1 | 0 | 1 = 1;
  let dy: -1 | 0 | 1 = 0;
  for (let i = 0; i < ticksPerGame; i++) {
    // Random walk that changes direction every half second.
    if (state.tick % 30 === 0) {
      dx = (nextInt(state, 3) - 1) as -1 | 0 | 1;
      dy = (nextInt(state, 3) - 1) as -1 | 0 | 1;
    }
    const cmds: Command[] = [{ playerId: 0, tick: state.tick, type: 'move', dx, dy }];
    step(state, cmds);
    totalTicks++;
  }
  const p = state.players[0]!;
  console.log(`game ${g} seed ${state.seed}: player ended at ${p.pos.x.toFixed(0)},${p.pos.y.toFixed(0)}`);
}

const ms = performance.now() - t0;
console.log(`\n${games} games, ${totalTicks} ticks in ${ms.toFixed(0)}ms (${(totalTicks / ms * 1000).toFixed(0)} ticks/s)`);
