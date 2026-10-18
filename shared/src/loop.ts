// Fixed-timestep driver, shared by every game. Owns the state and the command
// queue. The renderer calls advance(dtMs) once per frame and then reads .state.
// Knows nothing about Phaser or about any particular game: a game hands it a
// `create` and a `step`, and the command type is whatever the game's sim takes.
// This is also the seam where a network relay would plug in later.

export interface InputSource<C> {
  // Return the commands this source wants applied on the given tick.
  commandsFor(tick: number): C[];
}

export interface SimDriver<S extends { tick: number }, C> {
  tickMs: number;
  step(state: S, commands: C[]): void;
}

export class GameLoop<S extends { tick: number }, C> {
  state: S;
  private accumulator = 0;
  private sources: InputSource<C>[] = [];

  // Cap how many ticks we run in one frame so a background tab doesn't
  // fast-forward the whole game when it comes back.
  private readonly maxTicksPerFrame = 5;

  constructor(initial: S, private readonly driver: SimDriver<S, C>) {
    this.state = initial;
  }

  addInput(source: InputSource<C>): void {
    this.sources.push(source);
  }

  advance(dtMs: number): void {
    this.accumulator += dtMs;
    let ran = 0;
    while (this.accumulator >= this.driver.tickMs && ran < this.maxTicksPerFrame) {
      const tick = this.state.tick;
      const commands: C[] = [];
      for (const s of this.sources) commands.push(...s.commandsFor(tick));
      this.driver.step(this.state, commands);
      this.accumulator -= this.driver.tickMs;
      ran++;
    }
    if (ran === this.maxTicksPerFrame) this.accumulator = 0;
  }
}
