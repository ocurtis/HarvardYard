// Two-stage load: the atlas JSON first, then every sheet it names.
// If there is no atlas (fresh checkout before `npm run art yard`),
// the game still runs with rectangles.

import Phaser from 'phaser';
import { MUSIC, MUSIC_FORMATS, SFX_FILES } from '../config/audio';
import { assetRoot, atlasUrl, FONT_URL, queueSheets, registerAnims, registerFont, type Atlas } from '@shared/assets';
import { SLUG } from '../config/game';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload(): void {
    this.load.json('atlas', atlasUrl(SLUG));
    this.load.image('font', FONT_URL);
    for (const t of MUSIC) this.load.audio(t.key, MUSIC_FORMATS.map((ext) => `${assetRoot(SLUG)}audio/${t.key}.${ext}`));
    for (const k of SFX_FILES) this.load.audio(k, MUSIC_FORMATS.map((ext) => `${assetRoot(SLUG)}audio/sfx/${k}.${ext}`));
  }

  create(): void {
    const atlas = (this.cache.json.get('atlas') as Atlas | undefined) ?? {};
    queueSheets(this.load, atlas, SLUG);
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      registerAnims(this.anims, atlas);
      registerFont(this);
      this.registry.set('atlas', atlas);
      this.scene.start('yard');
    });
    this.load.start();
  }
}
