// Two-stage load: the atlas JSON first, then every sheet it names, plus the
// shared HUD font. With no atlas yet (before `npm run art nochs`) the game
// still runs with rectangles.

import Phaser from 'phaser';
import { atlasUrl, FONT_URL, queueSheets, registerAnims, registerFont, type Atlas } from '@shared/assets';
import { SLUG } from '../config/game';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload(): void {
    this.load.json('atlas', atlasUrl(SLUG));
    this.load.image('font', FONT_URL);
  }

  create(): void {
    const atlas = (this.cache.json.get('atlas') as Atlas | undefined) ?? {};
    queueSheets(this.load, atlas, SLUG);
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      registerAnims(this.anims, atlas);
      registerFont(this);
      this.registry.set('atlas', atlas);
      this.scene.start('main');
    });
    this.load.start();
  }
}
