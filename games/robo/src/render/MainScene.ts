// The stage select, Mega Man X style. A 5x5 grid of metal-framed cells: the
// middle 3x3 is the painted map (public/robo/map.png) with the base sprites on
// it; the ring around it holds boss portraits (placeholder shapes until there's a
// hero), STAGE / MAP / SPEC panels, locked slots and the logo. Reads state and
// draws; never mutates it.

import Phaser from 'phaser';
import { FONT_KEY, type Atlas } from '@shared/assets';
import type { GameLoop } from '@shared/loop';
import { UFO50 } from '@shared/palette';
import { GRID, LOGICAL_H, LOGICAL_W, SLOTS, STAGES, type SlotDef, type StageDef } from '../config/game';
import { stageOfSlot } from '../sim/sim';
import type { Command, GameState } from '../sim/types';

const BEZEL = UFO50.grey; // the frame metal
const BEZEL_L = UFO50.lightGrey;
const BEZEL_D = UFO50.navy;
const BOLT = UFO50.royal; // the X screen's blue bolts

function cellRect(s: SlotDef): { x: number; y: number; w: number; h: number } {
  return { x: GRID.x0 + s.col * GRID.cell, y: GRID.y0 + s.row * GRID.cell, w: GRID.cell, h: GRID.cell };
}

export class MainScene extends Phaser.Scene {
  private atlas: Atlas = {};
  private chrome!: Phaser.GameObjects.Graphics; // static frame, drawn once
  private g!: Phaser.GameObjects.Graphics; // per-frame: portraits, cursor
  private top!: Phaser.GameObjects.Graphics; // cursor above the sprites
  private texts = new Map<string, Phaser.GameObjects.BitmapText>();
  private bases = new Map<string, Phaser.GameObjects.Sprite>();
  private mapImage?: Phaser.GameObjects.Image;

  constructor(private readonly loop: GameLoop<GameState, Command>) {
    super('main');
  }

  preload(): void {
    this.load.image('map', '../../robo/map.png');
  }

  create(): void {
    this.atlas = (this.registry.get('atlas') as Atlas | undefined) ?? {};
    this.chrome = this.add.graphics().setDepth(0);
    this.g = this.add.graphics().setDepth(2);
    this.top = this.add.graphics().setDepth(6);
    const text = (key: string, x: number, y: number, s = '', tint: number = UFO50.white, depth = 7) => {
      const t = this.add.bitmapText(x, y, FONT_KEY, s).setTint(tint).setDepth(depth);
      this.texts.set(key, t);
      return t;
    };

    // The map image, centered in the middle 3x3, under the bases.
    const mx = GRID.x0 + GRID.cell;
    const my = GRID.y0 + GRID.cell;
    if (this.textures.exists('map')) this.mapImage = this.add.image(mx, my, 'map').setOrigin(0).setDepth(1);
    for (const st of STAGES) {
      const key = `base_${st.id}`;
      if (!this.atlas[key]) continue;
      const sp = this.add.sprite(mx + st.map.x, my + st.map.y, key, 0).setOrigin(0.5, 1).setDepth(3 + st.map.y / 1000);
      if (this.anims.exists(`${key}:idle`)) sp.play(`${key}:idle`);
      this.bases.set(st.id, sp);
    }

    this.drawChrome();

    // Panel text and the logo.
    for (const s of SLOTS) {
      const r = cellRect(s);
      if (s.kind === 'panel') text(`panel_${s.label}`, r.x + 4, r.y + 10, s.label, UFO50.mint);
      if (s.kind === 'locked') text(`locked_${s.col}_${s.row}`, r.x + GRID.cell / 2 - 6, r.y + GRID.cell / 2 - 4, '??', UFO50.grey);
      if (s.kind === 'logo') {
        text('logo1', r.x + 10, r.y + 18, 'ROBO', UFO50.gold);
        text('logo2', r.x + 10, r.y + 30, 'WORKING', UFO50.lightGrey);
        text('logo3', r.x + 10, r.y + 39, 'TITLE', UFO50.lightGrey);
      }
    }
    // The STAGE panel names the selection; the MAP panel names the place; SPEC the prompt.
    text('stageName', GRID.x0 + 4, GRID.y0 + 26, '', UFO50.white);
    text('placeName', GRID.x0 + 4 * GRID.cell + 4, GRID.y0 + 26, '', UFO50.white);
    text('prompt', GRID.x0 + 4, GRID.y0 + 4 * GRID.cell + 26, '', UFO50.gold);
  }

  // The frame: a metal bezel around every cell with bolts at the corners, X style.
  private drawChrome(): void {
    const c = this.chrome;
    c.fillStyle(UFO50.black, 1);
    c.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
    // Side rails off the grid, like the mousepad: horizontal bars with a hub.
    c.fillStyle(BEZEL_D, 1);
    for (let y = 30; y < LOGICAL_H; y += 48) {
      c.fillRect(0, y, GRID.x0, 10);
      c.fillRect(LOGICAL_W - GRID.x0, y, GRID.x0, 10);
      c.fillStyle(BEZEL, 1);
      c.fillRect(0, y + 2, GRID.x0 - 6, 6);
      c.fillRect(LOGICAL_W - GRID.x0 + 6, y + 2, GRID.x0 - 6, 6);
      c.fillStyle(BEZEL_D, 1);
    }
    // Grid plate.
    c.fillStyle(BEZEL, 1);
    c.fillRect(GRID.x0 - 4, GRID.y0 - 4, GRID.n * GRID.cell + 8, GRID.n * GRID.cell + 8);
    for (const s of SLOTS.concat([{ col: 1, row: 1, kind: 'panel' }])) {
      const r = s.col === 1 && s.row === 1 ? { x: GRID.x0 + GRID.cell, y: GRID.y0 + GRID.cell, w: 3 * GRID.cell, h: 3 * GRID.cell } : cellRect(s);
      // Bezel: light top/left, dark bottom/right, 3px, then a 1px dark inner line.
      c.fillStyle(BEZEL_L, 1);
      c.fillRect(r.x, r.y, r.w, 3);
      c.fillRect(r.x, r.y, 3, r.h);
      c.fillStyle(BEZEL_D, 1);
      c.fillRect(r.x, r.y + r.h - 3, r.w, 3);
      c.fillRect(r.x + r.w - 3, r.y, 3, r.h);
      c.fillRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6);
      // Cell face.
      const face = s.kind === 'boss' ? UFO50.indigo : s.kind === 'locked' ? UFO50.black : UFO50.navy;
      if (!(s.col === 1 && s.row === 1)) {
        c.fillStyle(face, 1);
        c.fillRect(r.x + 4, r.y + 4, r.w - 8, r.h - 8);
      }
      // Bolts.
      c.fillStyle(BOLT, 1);
      const bolts: [number, number][] = [[r.x + 1, r.y + 1], [r.x + r.w - 3, r.y + 1], [r.x + 1, r.y + r.h - 3], [r.x + r.w - 3, r.y + r.h - 3]];
      for (const [bx, by] of bolts) c.fillRect(bx, by, 2, 2);
      if (s.kind === 'panel') {
        // Three red lamps along the bottom of info panels, like the X screen.
        for (let i = 0; i < 3; i++) {
          c.fillStyle(UFO50.pink, 1);
          c.fillRect(r.x + 14 + i * 12, r.y + r.h - 14, 6, 6);
          c.fillStyle(UFO50.white, 1);
          c.fillRect(r.x + 15 + i * 12, r.y + r.h - 13, 2, 2);
        }
      }
    }
  }

  override update(_time: number, delta: number): void {
    this.loop.advance(delta);
    const s = this.loop.state;
    const g = this.g;
    const t = this.top;
    const p = s.players[0]!;
    const blink = Math.floor(s.tick / 10) % 2 === 0;
    g.clear();
    t.clear();

    // Portraits.
    for (const slot of SLOTS) {
      if (slot.kind !== 'boss') continue;
      const r = cellRect(slot);
      const st = STAGES[stageOfSlot(SLOTS.indexOf(slot))]!;
      this.portrait(g, st, r.x + r.w / 2, r.y + r.h / 2 - 2, s.phase === 'starting' && blink && STAGES.indexOf(st) === s.chosen);
    }

    // Cursor: a gold frame on the selected portrait, blinking white; a marker on the map base.
    const sel = SLOTS[p.slot]!;
    const r = cellRect(sel);
    t.lineStyle(2, blink ? UFO50.gold : UFO50.white, 1);
    t.strokeRect(r.x + 4, r.y + 4, r.w - 8, r.h - 8);
    const st = STAGES[stageOfSlot(p.slot)]!;
    const base = this.bases.get(st.id);
    if (base) {
      const bx = base.x;
      const by = base.y - base.height - 4 - (blink ? 0 : 2);
      t.fillStyle(UFO50.gold, 1);
      t.fillPoints([{ x: bx, y: by + 6 }, { x: bx - 4, y: by }, { x: bx + 4, y: by }], true);
    }
    // Cleared stages grey out.
    STAGES.forEach((stg, i) => {
      const sp = this.bases.get(stg.id);
      if (sp) s.cleared[i] ? sp.setTintFill(UFO50.grey) : sp.clearTint();
    });

    this.texts.get('stageName')!.setText(st.boss).setTint(st.color);
    this.texts.get('placeName')!.setText(st.short);
    this.texts.get('prompt')!.setText(s.phase === 'starting' ? (blink ? 'READY' : '') : 'J: GO');
    void this.mapImage;
  }

  // Placeholder faces: one shape per boss in its color, with two eyes.
  private portrait(g: Phaser.GameObjects.Graphics, st: StageDef, x: number, y: number, flash: boolean): void {
    const c = flash ? UFO50.white : st.color;
    g.fillStyle(c, 1);
    switch (st.shape) {
      case 'round':
        g.fillCircle(x, y, 16);
        break;
      case 'square':
        g.fillRect(x - 16, y - 16, 32, 32);
        break;
      case 'spike':
        g.fillPoints([{ x: x - 16, y: y + 16 }, { x, y: y - 18 }, { x: x + 16, y: y + 16 }], true);
        break;
      case 'tall':
        g.fillRect(x - 9, y - 20, 18, 40);
        break;
      case 'wide':
        g.fillRect(x - 20, y - 8, 40, 22);
        break;
      case 'diamond':
        g.fillPoints([{ x, y: y - 18 }, { x: x + 18, y }, { x, y: y + 18 }, { x: x - 18, y }], true);
        break;
    }
    g.fillStyle(UFO50.black, 1);
    g.fillRect(x - 7, y - 2, 4, 4);
    g.fillRect(x + 3, y - 2, 4, 4);
  }
}
