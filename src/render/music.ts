// Music layer. Reads state (the wave index), never mutates it. Picks the track
// for the current wave from config and crossfades when it changes. The browser
// won't start audio until the player has interacted, so the first play waits
// for that and nothing here throws if sound is unavailable.

import Phaser from 'phaser';
import { MUSIC, MUSIC_CROSSFADE_MS, MUSIC_VOLUME } from '../config/audio';
import type { GameState } from '../sim/types';
import type { MusicTrack } from '../config/audio';

export class Music {
  private current: Phaser.Sound.BaseSound | null = null;
  private currentKey = '';
  private muted = false;

  constructor(private scene: Phaser.Scene) {}

  // Call every frame. Before the first wave the first track plays; after a win
  // or loss the music fades out.
  sync(state: GameState): void {
    if (state.phase !== 'playing') {
      if (this.current) this.fadeOut(this.current);
      this.current = null;
      this.currentKey = '';
      return;
    }
    const wave = Math.max(1, state.wave.index + 1);
    let pick: MusicTrack | undefined;
    for (const t of MUSIC) if (t.fromWave <= wave && (!pick || t.fromWave > pick.fromWave)) pick = t;
    if (pick && pick.key !== this.currentKey) this.switchTo(pick.key);
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
        this.scene.tweens.add({ targets: next, volume: MUSIC_VOLUME, duration: MUSIC_CROSSFADE_MS });
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
      duration: MUSIC_CROSSFADE_MS,
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
