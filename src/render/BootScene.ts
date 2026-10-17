// Two-stage load: the atlas JSON first, then every sheet it names.
// If there is no atlas (fresh checkout before `python3 art/build.py`),
// the game still runs with rectangles.

import Phaser from 'phaser';
import { MUSIC, MUSIC_FORMATS, SFX_FILES } from '../config/audio';
import { ATLAS_URL, queueSheets, registerAnims, type Atlas } from './assets';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload(): void {
    this.load.json('atlas', ATLAS_URL);
    for (const t of MUSIC) this.load.audio(t.key, MUSIC_FORMATS.map((ext) => `audio/${t.key}.${ext}`));
    for (const k of SFX_FILES) this.load.audio(k, MUSIC_FORMATS.map((ext) => `audio/sfx/${k}.${ext}`));
  }

  create(): void {
    const atlas = (this.cache.json.get('atlas') as Atlas | undefined) ?? {};
    queueSheets(this.load, atlas);
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      registerAnims(this.anims, atlas);
      this.registry.set('atlas', atlas);
      this.scene.start('yard');
    });
    this.load.start();
  }
}
