// The stage select screen. Reads state and draws; never mutates it. Everything is
// placeholder geometry in the UFO 50 palette: the map is Harvard Square as
// blocks and streets, the spots are beacons, the portraits are shapes with the
// boss's color. See DESIGN.md for what each becomes.

import Phaser from 'phaser';
import { FONT_KEY, type Atlas } from '@shared/assets';
import type { GameLoop } from '@shared/loop';
import { UFO50 } from '@shared/palette';
import { HOME, LOGICAL_H, LOGICAL_W, MAP, STAGES, type StageDef } from '../config/game';
import { HOME_SPOT } from '../sim/sim';
import type { Command, GameState } from '../sim/types';

// Placeholder map: streets as lines, the Yard as a green block, buildings as
// blocks near their spots, the river at the bottom. Logical pixels on the map panel.
const STREETS: [number, number, number, number][] = [
  [100, 256, 100, 20], // Garden St / Mass Ave going north
  [0, 236, 256, 236], // Mt Auburn / the Square
  [0, 160, 256, 160], // the Yard's south edge (Mass Ave bend)
  [60, 20, 60, 236], // Garden St
  [196, 20, 196, 236], // Oxford St / Divinity Ave
  [60, 54, 256, 54], // Kirkland
  [100, 118, 196, 118], // between the Science Center and Memorial Hall
];
const YARD = { x: 84, y: 128, w: 96, h: 60 };
const BUILDINGS: { x: number; y: number; w: number; h: number; c: number }[] = [
  { x: 84, y: 100, w: 40, h: 20, c: UFO50.lightGrey }, // Science Center
  { x: 156, y: 84, w: 40, h: 26, c: UFO50.darkRed }, // Memorial Hall
  { x: 180, y: 40, w: 36, h: 18, c: UFO50.brown }, // the Peabody / the dig
  { x: 30, y: 30, w: 36, h: 20, c: UFO50.indigo }, // the Observatory
  { x: 80, y: 222, w: 44, h: 16, c: UFO50.orange }, // Felipe's
];

export class MainScene extends Phaser.Scene {
  private atlas: Atlas = {};
  private g!: Phaser.GameObjects.Graphics;
  private name!: Phaser.GameObjects.BitmapText;
  private stage!: Phaser.GameObjects.BitmapText;
  private prompt!: Phaser.GameObjects.BitmapText;
  private labels: Phaser.GameObjects.BitmapText[] = [];
  private title!: Phaser.GameObjects.BitmapText;

  constructor(private readonly loop: GameLoop<GameState, Command>) {
    super('main');
  }

  create(): void {
    this.atlas = (this.registry.get('atlas') as Atlas | undefined) ?? {};
    void this.atlas;
    this.g = this.add.graphics();
    const text = (x: number, y: number, s = '', tint: number = UFO50.white) => this.add.bitmapText(x, y, FONT_KEY, s).setTint(tint).setDepth(10);
    this.title = text(MAP.w + 8, 6, 'SELECT STAGE', UFO50.gold);
    this.name = text(MAP.w + 8, 96, '');
    this.stage = text(MAP.w + 8, 106, '', UFO50.lightGrey);
    this.prompt = text(MAP.w + 8, LOGICAL_H - 20, '', UFO50.gold);
    // Spot labels on the map, short, under each beacon.
    for (const s of STAGES) this.labels.push(text(s.x - 3 * s.short.length, s.y + 9, s.short, UFO50.white));
    this.labels.push(text(HOME.x - 12, HOME.y + 8, 'YARD', UFO50.mint));
  }

  override update(_time: number, delta: number): void {
    this.loop.advance(delta);
    const s = this.loop.state;
    const g = this.g;
    const p = s.players[0]!;
    const blink = Math.floor(s.tick / 10) % 2 === 0;
    g.clear();

    // Map panel.
    g.fillStyle(UFO50.navy, 1);
    g.fillRect(0, 0, MAP.w, LOGICAL_H);
    g.fillStyle(UFO50.blue, 1);
    g.fillRect(0, LOGICAL_H - 16, MAP.w, 16); // the river
    g.fillStyle(UFO50.green, 1);
    g.fillRect(YARD.x, YARD.y, YARD.w, YARD.h);
    g.lineStyle(3, UFO50.grey, 1);
    for (const [x1, y1, x2, y2] of STREETS) g.lineBetween(x1, y1, x2, y2);
    for (const b of BUILDINGS) {
      g.fillStyle(b.c, 1);
      g.fillRect(b.x, b.y, b.w, b.h);
      g.lineStyle(1, UFO50.black, 1);
      g.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
    }
    // The statue at home.
    g.fillStyle(UFO50.brown, 1);
    g.fillRect(HOME.x - 3, HOME.y - 6, 6, 8);
    g.fillStyle(UFO50.lightGrey, 1);
    g.fillRect(HOME.x - 5, HOME.y + 2, 10, 3);

    // Beacons: a diamond per stage, the boss color, dimmed if cleared.
    STAGES.forEach((st, i) => {
      const c = s.cleared[i] ? UFO50.grey : st.color;
      g.fillStyle(UFO50.black, 1);
      g.fillPoints([{ x: st.x, y: st.y - 7 }, { x: st.x + 7, y: st.y }, { x: st.x, y: st.y + 7 }, { x: st.x - 7, y: st.y }], true);
      g.fillStyle(c, 1);
      g.fillPoints([{ x: st.x, y: st.y - 5 }, { x: st.x + 5, y: st.y }, { x: st.x, y: st.y + 5 }, { x: st.x - 5, y: st.y }], true);
    });

    // The cursor: a little figure (the hero, TBD) walking the map; blinks when parked.
    const cx = Math.round(p.pos.x);
    const cy = Math.round(p.pos.y) - 10;
    const bob = p.walking ? (Math.floor(s.tick / 6) % 2) : 0;
    g.fillStyle(UFO50.black, 1);
    g.fillRect(cx - 4, cy - 9 - bob, 8, 12);
    g.fillStyle(p.walking || blink ? UFO50.cyan : UFO50.white, 1);
    g.fillRect(cx - 3, cy - 8 - bob, 6, 10);
    g.fillStyle(UFO50.skin, 1);
    g.fillRect(cx - 2, cy - 7 - bob, 4, 3);
    if (!p.walking) {
      g.lineStyle(1, blink ? UFO50.white : UFO50.gold, 1);
      const sp = p.spot === HOME_SPOT ? HOME : STAGES[p.spot]!;
      g.strokeRect(sp.x - 9.5, sp.y - 9.5, 19, 19);
    }

    // Portrait panel.
    g.fillStyle(UFO50.black, 1);
    g.fillRect(MAP.w, 0, LOGICAL_W - MAP.w, LOGICAL_H);
    g.lineStyle(1, UFO50.white, 1);
    g.strokeRect(MAP.w + 0.5, 0.5, LOGICAL_W - MAP.w - 1, LOGICAL_H - 1);
    const st: StageDef | null = p.spot === HOME_SPOT ? null : STAGES[p.spot]!;
    const px = MAP.w + 64;
    const py = 56;
    g.lineStyle(1, UFO50.grey, 1);
    g.strokeRect(px - 24.5, py - 24.5, 49, 49);
    if (st && !p.walking) {
      this.portrait(g, st, px, py, s.phase === 'starting' && blink);
      this.name.setText(st.boss).setTint(st.color);
      this.stage.setText(st.stage);
      this.prompt.setText(s.phase === 'starting' ? (blink ? 'STAGE START' : '') : 'J: GO');
    } else {
      // Home or mid-walk: static.
      for (let i = 0; i < 6; i++) {
        g.fillStyle(UFO50.navy, 1);
        g.fillRect(px - 20, py - 20 + i * 7 + (s.tick % 7 > 3 ? 1 : 0), 40, 3);
      }
      this.name.setText(st ? '' : 'THE YARD').setTint(UFO50.mint);
      this.stage.setText(st ? '' : 'HOME. PICK A STAGE.');
      this.prompt.setText('');
    }
    this.title.setText(s.phase === 'starting' ? 'GET READY' : 'SELECT STAGE');
    void this.labels;
  }

  // Placeholder faces: one shape per boss in its color, with two eyes.
  private portrait(g: Phaser.GameObjects.Graphics, st: StageDef, x: number, y: number, flash: boolean): void {
    const c = flash ? UFO50.white : st.color;
    g.fillStyle(c, 1);
    switch (st.shape) {
      case 'round':
        g.fillCircle(x, y, 18);
        break;
      case 'square':
        g.fillRect(x - 18, y - 18, 36, 36);
        break;
      case 'spike':
        g.fillPoints([{ x: x - 18, y: y + 18 }, { x, y: y - 20 }, { x: x + 18, y: y + 18 }], true);
        break;
      case 'tall':
        g.fillRect(x - 10, y - 22, 20, 44);
        break;
      case 'wide':
        g.fillRect(x - 22, y - 8, 44, 24);
        break;
      case 'diamond':
        g.fillPoints([{ x, y: y - 20 }, { x: x + 20, y }, { x, y: y + 20 }, { x: x - 20, y }], true);
        break;
    }
    g.fillStyle(UFO50.black, 1);
    g.fillRect(x - 8, y - 2, 4, 4);
    g.fillRect(x + 4, y - 2, 4, 4);
  }
}
