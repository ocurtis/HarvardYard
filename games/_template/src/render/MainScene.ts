// Reads state and draws. Never mutates state. Placeholders are colored
// rectangles with the final names and dimensions until a mechanic is proven.

import Phaser from 'phaser';
import type { GameLoop } from '@shared/loop';
import { FONT_KEY, type Atlas } from '@shared/assets';
import { UFO50 } from '@shared/palette';
import { LOGICAL_H, LOGICAL_W, PLAYER } from '../config/game';
import type { Command, GameState } from '../sim/types';

export class MainScene extends Phaser.Scene {
  private atlas: Atlas = {};
  private players: Phaser.GameObjects.Rectangle[] = [];
  private fx!: Phaser.GameObjects.Graphics;
  private title!: Phaser.GameObjects.BitmapText;

  constructor(private readonly loop: GameLoop<GameState, Command>) {
    super('main');
  }

  create(): void {
    this.atlas = (this.registry.get('atlas') as Atlas | undefined) ?? {};
    this.add.rectangle(0, 0, LOGICAL_W, LOGICAL_H, UFO50.navy).setOrigin(0);
    for (const p of this.loop.state.players) {
      this.players.push(this.add.rectangle(p.pos.x, p.pos.y, PLAYER.sizePx, PLAYER.sizePx, UFO50.mint));
    }
    this.fx = this.add.graphics();
    this.title = this.add.bitmapText(4, 4, FONT_KEY, '__TITLE_UPPER__').setTint(UFO50.gold);
    this.add.bitmapText(4, LOGICAL_H - 10, FONT_KEY, 'WASD MOVE  J ACTION').setTint(UFO50.grey);
  }

  override update(_time: number, delta: number): void {
    this.loop.advance(delta);
    const s = this.loop.state;
    s.players.forEach((p, i) => this.players[i]?.setPosition(Math.round(p.pos.x), Math.round(p.pos.y)));
    // A ring for each 'started' event still in the event window.
    this.fx.clear();
    for (const e of s.events) {
      if (!e.pos) continue;
      this.fx.lineStyle(1, UFO50.white, 1 - (s.tick - e.tick) / 12);
      this.fx.strokeCircle(e.pos.x, e.pos.y, 8 + (s.tick - e.tick) * 2);
    }
    this.title.setText(`__TITLE_UPPER__  T${s.tick}`);
    void this.atlas;
  }
}
