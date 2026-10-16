// Fixed-timestep driver. Owns the GameState and the command queue.
// The renderer calls advance(dtMs) once per frame and then reads .state.
// This file knows nothing about Phaser either; it's the seam where a
// network relay would plug in later.

import { TICK_MS } from './config/game';
import { createState, step } from './sim/sim';
import type { Command, GameState, SimConfig } from './sim/types';

export interface InputSource {
  // Return the commands this source wants applied on the given tick.
  commandsFor(tick: number): Command[];
}

export class GameLoop {
  state: GameState;
  private accumulator = 0;
  private sources: InputSource[] = [];

  // Cap how many ticks we run in one frame so a background tab doesn't
  // fast-forward the whole game when it comes back.
  private readonly maxTicksPerFrame = 5;

  constructor(config: SimConfig) {
    this.state = createState(config);
  }

  addInput(source: InputSource): void {
    this.sources.push(source);
  }

  advance(dtMs: number): void {
    this.accumulator += dtMs;
    let ran = 0;
    while (this.accumulator >= TICK_MS && ran < this.maxTicksPerFrame) {
      const tick = this.state.tick;
      const commands: Command[] = [];
      for (const s of this.sources) commands.push(...s.commandsFor(tick));
      step(this.state, commands);
      this.accumulator -= TICK_MS;
      ran++;
    }
    if (ran === this.maxTicksPerFrame) this.accumulator = 0;
  }
}
