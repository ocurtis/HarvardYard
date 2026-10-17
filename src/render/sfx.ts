// Sound effects layer. Reads state.events (one-shots) and a few state flags
// (loops). Never mutates state: it remembers the last tick it handled and plays
// any event newer than that, which also covers frames where the sim ran several
// ticks. Missing files fail quietly.

import Phaser from 'phaser';
import { SFX_GAIN, SFX_LOOPS, SFX_MIN_GAP_MS, SFX_ONESHOT, SFX_VOLUME } from '../config/audio';
import type { GameState, SimEvent } from '../sim/types';

export class Sfx {
  private lastTick = -1;
  private lastPlayed = new Map<string, number>();
  private loops = new Map<string, Phaser.Sound.BaseSound>();

  constructor(private scene: Phaser.Scene) {}

  sync(state: GameState): void {
    for (const e of state.events) {
      if (e.tick < this.lastTick) continue; // a step on tick N stamps N then advances to N+1, so N itself is new
      this.oneShot(e);
    }
    this.lastTick = state.tick;

    const p = state.players[0];
    this.loop('shout', !!p && p.shouting && state.phase === 'playing');
    this.loop('walk', !!p && p.moving && !p.shouting && state.phase === 'playing');
    this.loop('stream', state.phase === 'playing' && state.bros.some((b) => b.phase === 'pissing' && b.kind !== 'chucker'));
    this.loop('cupFlying', state.phase === 'playing' && state.cups.length > 0);
    const hasAmp = state.towers.some((t) => t.kind === 'amp');
    const blowing = hasAmp && state.bros.some((b) => b.inWind || b.windTo !== null);
    this.loop('ampRiff', state.phase === 'playing' && blowing);
    this.loop('ampHum', state.phase === 'playing' && hasAmp && !blowing);
  }

  private oneShot(e: SimEvent): void {
    const entry = SFX_ONESHOT[e.type];
    if (!entry) return;
    const keys = typeof entry === 'function' ? entry(e) : entry;
    if (!keys || keys.length === 0) return;
    const key = keys[Math.floor(Math.random() * keys.length)]!; // render-side choice; the sim stays deterministic
    const now = this.scene.time.now;
    if (now - (this.lastPlayed.get(key) ?? -1e9) < SFX_MIN_GAP_MS) return;
    this.lastPlayed.set(key, now);
    if (!this.scene.cache.audio.exists(key) || this.scene.sound.locked) return;
    try {
      this.scene.sound.play(key, { volume: SFX_VOLUME * (SFX_GAIN[key] ?? 1) });
    } catch {
      /* audio unavailable */
    }
  }

  private loop(name: keyof typeof SFX_LOOPS, on: boolean): void {
    const def = SFX_LOOPS[name];
    const cur = this.loops.get(name);
    if (on && !cur) {
      if (!this.scene.cache.audio.exists(def.key) || this.scene.sound.locked) return;
      try {
        const s = this.scene.sound.add(def.key, { loop: true, volume: def.volume * SFX_VOLUME });
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
