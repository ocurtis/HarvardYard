// The stage select screen. Reads state and draws; never mutates it. Everything is
// placeholder geometry in the UFO 50 palette: the map is Harvard Square as
// blocks and streets, the spots are beacons, the portraits are shapes with the
// boss's color. See DESIGN.md for what each becomes.

import Phaser from 'phaser';
import { FONT_KEY, type Atlas } from '@shared/assets';
import type { GameLoop } from '@shared/loop';
import { UFO50 } from '@shared/palette';
import { HOME, LOGICAL_H, LOGICAL_W, MAP, STAGES, type StageDef } from '../config/game';
import { COMMON, LANDMARKS, project, RIVER, STREETS, YARD, type LatLon } from '../config/map';
import { HOME_SPOT } from '../sim/sim';
import type { Command, GameState } from '../sim/types';

// The map is projected from real coordinates (config/map.ts). Buildings are small
// blocks at each landmark; streets are the traced polylines; the Yard, the Common
// and the river are polygons.
const px = (pts: LatLon[]) => pts.map((p) => project(p));
const STREET_PX = STREETS.map((s) => ({ ...s, pts: px(s.pts) }));
const YARD_PX = px(YARD);
const COMMON_PX = px(COMMON);
const RIVER_PX = px(RIVER);
const BUILDING_W = 22;
const BUILDING_H = 12;

export class MainScene extends Phaser.Scene {
  private atlas: Atlas = {};
  private g!: Phaser.GameObjects.Graphics;
  private top!: Phaser.GameObjects.Graphics; // cursor and selection, above the base sprites
  private name!: Phaser.GameObjects.BitmapText;
  private stage!: Phaser.GameObjects.BitmapText;
  private prompt!: Phaser.GameObjects.BitmapText;
  private labels: Phaser.GameObjects.BitmapText[] = [];
  private bases = new Map<string, Phaser.GameObjects.Sprite>(); // base icons, when the sheets exist
  private title!: Phaser.GameObjects.BitmapText;

  constructor(private readonly loop: GameLoop<GameState, Command>) {
    super('main');
  }

  create(): void {
    this.atlas = (this.registry.get('atlas') as Atlas | undefined) ?? {};
    this.g = this.add.graphics();
    this.top = this.add.graphics().setDepth(5);
    // Base icons: a 48x40 sheet per stage (art/sprites/base_<id>.txt), anchored bottom-center
    // a little below the spot so the beacon point is the building's door. Lights blink via `idle`.
    for (const st of STAGES) {
      const key = `base_${st.id}`;
      if (!this.atlas[key]) continue;
      const sp = this.add.sprite(st.x, st.y + 6, key, 0).setOrigin(0.5, 1).setDepth(1);
      if (this.anims.exists(`${key}:idle`)) sp.play(`${key}:idle`);
      this.bases.set(st.id, sp);
    }
    const text = (x: number, y: number, s = '', tint: number = UFO50.white) => this.add.bitmapText(x, y, FONT_KEY, s).setTint(tint).setDepth(10);
    this.title = text(MAP.w + 8, 6, 'SELECT STAGE', UFO50.gold);
    this.name = text(MAP.w + 8, 96, '');
    this.stage = text(MAP.w + 8, 106, '', UFO50.lightGrey);
    this.prompt = text(MAP.w + 8, LOGICAL_H - 20, '', UFO50.gold);
    // Spot labels on the map, short, under each beacon.
    for (const s of STAGES) {
      const w = 6 * s.short.length;
      const pos = s.label === 's' ? { x: s.x - w / 2, y: s.y + 10 } : s.label === 'n' ? { x: s.x - w / 2, y: s.y - 20 } : s.label === 'e' ? { x: s.x + 14, y: s.y - 4 } : { x: s.x - 14 - w, y: s.y - 4 };
      this.labels.push(text(Math.max(1, Math.min(MAP.w - w - 1, pos.x)), pos.y, s.short, UFO50.white));
    }
    this.labels.push(text(HOME.x - 12, HOME.y + 8, 'YARD', UFO50.mint));
  }

  override update(_time: number, delta: number): void {
    this.loop.advance(delta);
    const s = this.loop.state;
    const g = this.g;
    const p = s.players[0]!;
    const blink = Math.floor(s.tick / 10) % 2 === 0;
    g.clear();

    // Map panel: ground, the river, the Common, the Yard, streets, then a block per landmark.
    g.fillStyle(UFO50.navy, 1);
    g.fillRect(0, 0, MAP.w, LOGICAL_H);
    g.fillStyle(UFO50.blue, 1);
    g.fillPoints([...RIVER_PX, { x: MAP.w, y: LOGICAL_H }, { x: 0, y: LOGICAL_H }], true);
    g.fillStyle(UFO50.darkGreen, 1);
    g.fillPoints(COMMON_PX, true);
    g.fillStyle(UFO50.green, 1);
    g.fillPoints(YARD_PX, true);
    for (const st of STREET_PX) {
      g.lineStyle(st.major ? 3 : 2, st.major ? UFO50.lightGrey : UFO50.grey, 1);
      g.beginPath();
      st.pts.forEach((pt, i) => (i === 0 ? g.moveTo(pt.x, pt.y) : g.lineTo(pt.x, pt.y)));
      g.strokePath();
    }
    for (const st of STAGES) {
      if (this.bases.has(st.id)) continue; // drawn as a sprite
      g.fillStyle(st.color, 1);
      g.fillRect(st.x - BUILDING_W / 2, st.y - BUILDING_H / 2 - 4, BUILDING_W, BUILDING_H);
      g.lineStyle(1, UFO50.black, 1);
      g.strokeRect(st.x - BUILDING_W / 2 + 0.5, st.y - BUILDING_H / 2 - 3.5, BUILDING_W - 1, BUILDING_H - 1);
    }
    // The Square itself: the T entrance, a small marker.
    const sq = project(LANDMARKS.harvardSquare);
    g.fillStyle(UFO50.red, 1);
    g.fillRect(sq.x - 2, sq.y - 2, 5, 5);

    // The statue at home.
    g.fillStyle(UFO50.brown, 1);
    g.fillRect(HOME.x - 3, HOME.y - 6, 6, 8);
    g.fillStyle(UFO50.lightGrey, 1);
    g.fillRect(HOME.x - 5, HOME.y + 2, 10, 3);

    // Beacons: a diamond per stage where there's no base sprite yet; the boss color, dimmed if cleared.
    STAGES.forEach((st, i) => {
      if (this.bases.has(st.id)) return;
      const c = s.cleared[i] ? UFO50.grey : st.color;
      g.fillStyle(UFO50.black, 1);
      g.fillPoints([{ x: st.x, y: st.y - 7 }, { x: st.x + 7, y: st.y }, { x: st.x, y: st.y + 7 }, { x: st.x - 7, y: st.y }], true);
      g.fillStyle(c, 1);
      g.fillPoints([{ x: st.x, y: st.y - 5 }, { x: st.x + 5, y: st.y }, { x: st.x, y: st.y + 5 }, { x: st.x - 5, y: st.y }], true);
    });

    // Cleared stages go grey.
    STAGES.forEach((st, i) => {
      const sp = this.bases.get(st.id);
      if (sp) s.cleared[i] ? sp.setTintFill(UFO50.grey) : sp.clearTint();
    });

    // The cursor: a little figure (the hero, TBD) walking the map; blinks when parked. Drawn on
    // the top layer so it walks in front of the bases.
    const t = this.top;
    t.clear();
    const cx = Math.round(p.pos.x);
    const cy = Math.round(p.pos.y) - 10;
    const bob = p.walking ? (Math.floor(s.tick / 6) % 2) : 0;
    t.fillStyle(UFO50.black, 1);
    t.fillRect(cx - 4, cy - 9 - bob, 8, 12);
    t.fillStyle(p.walking || blink ? UFO50.cyan : UFO50.white, 1);
    t.fillRect(cx - 3, cy - 8 - bob, 6, 10);
    t.fillStyle(UFO50.skin, 1);
    t.fillRect(cx - 2, cy - 7 - bob, 4, 3);
    if (!p.walking) {
      t.lineStyle(1, blink ? UFO50.white : UFO50.gold, 1);
      const sp = p.spot === HOME_SPOT ? HOME : STAGES[p.spot]!;
      t.strokeRect(sp.x - 9.5, sp.y - 9.5, 19, 19);
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
