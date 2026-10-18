// Music layer. Reads state (the wave index), never mutates it. Picks the track
// for the current wave from config and crossfades when it changes. The browser
// won't start audio until the player has interacted, so the first play waits
// for that and nothing here throws if sound is unavailable.

import Phaser from 'phaser';

export interface MusicConfig<S> {
  // Which track key should be playing for this state, or null for silence (fade out).
  pick(state: S): string | null;
  volume: number;
  crossfadeMs: number;
}

export class Music<S> {
  private current: Phaser.Sound.BaseSound | null = null;
  private currentKey = '';
  private muted = false;

  constructor(private scene: Phaser.Scene, private cfg: MusicConfig<S>) {}

  // Call every frame. The game's `pick` decides the track; null fades it out.
  sync(state: S): void {
    const key = this.cfg.pick(state);
    if (key === null) {
      if (this.current) this.fadeOut(this.current);
      this.current = null;
      this.currentKey = '';
      return;
    }
    if (key !== this.currentKey) this.switchTo(key);
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    this.scene.sound.mute = this.muted;
    return this.muted;
  }

  private switchTo(key: string): void {
    this.currentKey = key; // even if the file is missing: don't retry every frame
    if (!this.scene.cache.audio.exists(key)) return;
    const next = this.scene.sound.add(key, { loop: true, volume: 0 });
    const old = this.current;
    this.current = next;
    const start = () => {
      if (this.current !== next) {
        next.destroy(); // superseded before audio unlocked
        return;
      }
      try {
        next.play();
        this.scene.tweens.add({ targets: next, volume: this.cfg.volume, duration: this.cfg.crossfadeMs });
      } catch {
        /* audio unavailable; stay silent */
      }
      if (old) this.fadeOut(old);
    };
    if (this.scene.sound.locked) this.scene.sound.once(Phaser.Sound.Events.UNLOCKED, start);
    else start();
  }

  private fadeOut(snd: Phaser.Sound.BaseSound): void {
    this.scene.tweens.killTweensOf(snd);
    if (!snd.isPlaying) {
      snd.destroy();
      return;
    }
    this.scene.tweens.add({
      targets: snd,
      volume: 0,
      duration: this.cfg.crossfadeMs,
      onComplete: () => {
        try {
          snd.destroy();
        } catch {
          /* already gone */
        }
      },
    });
  }
}
