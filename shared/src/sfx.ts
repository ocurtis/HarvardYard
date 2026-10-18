// Sound effects layer. Reads state.events (one-shots) and a few state flags
// (loops). Never mutates state: it remembers the last tick it handled and plays
// any event newer than that, which also covers frames where the sim ran several
// ticks. Missing files fail quietly.

import Phaser from 'phaser';

export interface SfxEvent {
  type: string;
  tick: number;
}

export interface SfxConfig<S extends { tick: number; events: E[] }, E extends SfxEvent> {
  // One-shot keys for an event (several = pick one at random per play); null for none.
  oneShot(e: E): string[] | null;
  // Loops that follow state: which should be on right now, with their keys and volumes.
  loops: Record<string, { key: string; volume: number }>;
  loopsOn(state: S): Record<string, boolean>;
  volume: number;
  gain: Record<string, number>; // per-key gain on top of volume
  minGapMs: number; // between plays of the same key, so a crowd doesn't stack it
}

export class Sfx<S extends { tick: number; events: E[] }, E extends SfxEvent> {
  private lastTick = -1;
  private lastPlayed = new Map<string, number>();
  private loops = new Map<string, Phaser.Sound.BaseSound>();

  constructor(private scene: Phaser.Scene, private cfg: SfxConfig<S, E>) {}

  sync(state: S): void {
    for (const e of state.events) {
      if (e.tick < this.lastTick) continue; // a step on tick N stamps N then advances to N+1, so N itself is new
      this.oneShot(e);
    }
    this.lastTick = state.tick;
    const on = this.cfg.loopsOn(state);
    for (const name of Object.keys(this.cfg.loops)) this.loop(name, !!on[name]);
  }

  private oneShot(e: E): void {
    const keys = this.cfg.oneShot(e);
    if (!keys || keys.length === 0) return;
    const key = keys[Math.floor(Math.random() * keys.length)]!; // render-side choice; the sim stays deterministic
    const now = this.scene.time.now;
    if (now - (this.lastPlayed.get(key) ?? -1e9) < this.cfg.minGapMs) return;
    this.lastPlayed.set(key, now);
    if (!this.scene.cache.audio.exists(key) || this.scene.sound.locked) return;
    try {
      this.scene.sound.play(key, { volume: this.cfg.volume * (this.cfg.gain[key] ?? 1) });
    } catch {
      /* audio unavailable */
    }
  }

  private loop(name: string, on: boolean): void {
    const def = this.cfg.loops[name]!;
    const cur = this.loops.get(name);
    if (on && !cur) {
      if (!this.scene.cache.audio.exists(def.key) || this.scene.sound.locked) return;
      try {
        const s = this.scene.sound.add(def.key, { loop: true, volume: def.volume * this.cfg.volume });
        s.play();
        this.loops.set(name, s);
      } catch {
        /* audio unavailable */
      }
    } else if (!on && cur) {
      cur.stop();
      cur.destroy();
      this.loops.delete(name);
    }
  }
}
