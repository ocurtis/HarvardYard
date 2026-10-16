// Two-stage load: the atlas JSON first, then every sheet it names.
// If there is no atlas (fresh checkout before `python3 art/build.py`),
// the game still runs with rectangles.

import Phaser from 'phaser';
import { ATLAS_URL, queueSheets, registerAnims, type Atlas } from './assets';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload(): void {
    this.load.json('atlas', ATLAS_URL);
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
