// Reads state and draws. Never mutates state. Session one is placeholders: colored
// squares for pizza, white frames for boxes, the shared font. See DESIGN.md art spec
// for what each placeholder becomes.

import Phaser from 'phaser';
import { FONT_KEY, type Atlas } from '@shared/assets';
import type { GameLoop } from '@shared/loop';
import { UFO50 } from '@shared/palette';
import { BOXES, CONVEYOR, LOGICAL_H, LOGICAL_W, RACK, SHIFT, TILE, type Kind } from '../config/game';
import type { Command, GameState } from '../sim/types';

const KIND_COLOR: Record<Kind, number> = { cheese: UFO50.skin, pepperoni: UFO50.rust, tomato: UFO50.red, veggie: UFO50.green };
const L = {
  board: { y: 0, h: 72 }, // chalkboard
  shelf: { y: 72, h: 40 }, // steel shelf: the conveyor
  counter: { y: 112 }, // stone counter: boxes
  boxY: 150,
  boxGap: 88,
  boxX0: 40,
};

export class MainScene extends Phaser.Scene {
  private atlas: Atlas = {};
  private g!: Phaser.GameObjects.Graphics;
  private texts: Phaser.GameObjects.BitmapText[] = [];
  private tipPops: { x: number; y: number; tick: number; text: string; color: number }[] = [];
  private lastEventTick = -1;

  constructor(private readonly loop: GameLoop<GameState, Command>) {
    super('main');
  }

  create(): void {
    this.atlas = (this.registry.get('atlas') as Atlas | undefined) ?? {};
    void this.atlas;
    this.g = this.add.graphics();
    const t = (x: number, y: number, s = '', tint: number = UFO50.white) => {
      const bt = this.add.bitmapText(x, y, FONT_KEY, s).setTint(tint).setDepth(10);
      this.texts.push(bt);
      return bt;
    };
    // Chalk: title, shift, tips, strikes. Indices are fixed; update() fills them in.
    t(6, 6, "NOCH'S RUSH", UFO50.gold); // 0
    t(6, 18, '', UFO50.white); // 1 wave
    t(LOGICAL_W - 90, 6, '', UFO50.gold); // 2 tips
    t(LOGICAL_W - 90, 18, '', UFO50.red); // 3 strikes
    t(6, 60, 'CUTTER', UFO50.lightGrey); // 4
    t(LOGICAL_W - 60, 60, 'RACK R', UFO50.lightGrey); // 5
    for (let i = 0; i < BOXES; i++) t(L.boxX0 + i * L.boxGap + 12, L.boxY + 2 * TILE + 6, `${i + 1}`, UFO50.white); // 6..9
    t(6, LOGICAL_H - 10, this.loop.state.placement === 'cells' ? '1-4 BOX  ARROWS CELL  J DROP  R RACK' : '1-4 BOX  J DROP  R RACK', UFO50.lightGrey);
  }

  override update(_time: number, delta: number): void {
    this.loop.advance(delta);
    const s = this.loop.state;
    const g = this.g;
    g.clear();

    // The room: chalkboard, steel shelf, stone counter.
    g.fillStyle(UFO50.forest, 1);
    g.fillRect(0, L.board.y, LOGICAL_W, L.board.h);
    g.fillStyle(UFO50.lightGrey, 1);
    g.fillRect(0, L.shelf.y, LOGICAL_W, L.shelf.h);
    g.fillStyle(UFO50.grey, 1);
    g.fillRect(0, L.shelf.y + L.shelf.h - 3, LOGICAL_W, 3);
    g.fillStyle(UFO50.brown, 1);
    g.fillRect(0, L.counter.y, LOGICAL_W, LOGICAL_H - L.counter.y);

    // Conveyor: the square in hand at the left (big frame), then the waiting ones.
    const cx0 = 40;
    const cy = L.shelf.y + 12;
    for (let i = 0; i < CONVEYOR.slots; i++) {
      const x = cx0 + i * (TILE + 6);
      g.lineStyle(1, i === 0 ? UFO50.white : UFO50.grey, 1);
      g.strokeRect(x - 1.5, cy - 1.5, TILE + 2, TILE + 2);
      const k = s.conveyor[i];
      if (k && i <= CONVEYOR.preview) this.square(x, cy, k);
      else if (k) {
        g.fillStyle(UFO50.navy, 1); // beyond the preview: a shape, not a kind
        g.fillRect(x, cy, TILE - 1, TILE - 1);
      }
    }
    // Rack, right end of the shelf.
    for (let i = 0; i < RACK.slots; i++) {
      const x = LOGICAL_W - 60 + i * (TILE + 2);
      g.lineStyle(1, UFO50.grey, 1);
      g.strokeRect(x - 0.5, cy - 0.5, TILE, TILE);
      const k = s.rack[i];
      if (k) this.square(x, cy, k);
    }

    // Boxes.
    const p = s.players[0]!;
    s.boxes.forEach((b, i) => {
      const bx = L.boxX0 + i * L.boxGap;
      const by = L.boxY;
      // Order card pinned above the box: a 2x2 mini-picture.
      const cardY = by - 22;
      g.fillStyle(UFO50.white, 1);
      g.fillRect(bx - 1, cardY - 1, 18, 18);
      b.order.forEach((c, ci) => {
        const x = bx + (ci % 2) * 8;
        const y = cardY + Math.floor(ci / 2) * 8;
        if (c === 'any') {
          g.fillStyle(UFO50.lightGrey, 1);
          g.fillRect(x, y, 7, 7);
          g.fillStyle(UFO50.black, 1);
          g.fillRect(x + 3, y + 3, 1, 1);
        } else {
          g.fillStyle(KIND_COLOR[c], 1);
          g.fillRect(x, y, 7, 7);
        }
      });
      // Cardboard frame.
      const closing = b.closing > 0;
      g.fillStyle(closing ? UFO50.rust : UFO50.skin, 1);
      g.fillRect(bx - 4, by - 4, 2 * TILE + 8, 2 * TILE + 8);
      g.fillStyle(UFO50.rust, 1);
      g.fillRect(bx - 2, by - 2, 2 * TILE + 4, 2 * TILE + 4);
      g.fillStyle(UFO50.maroon, 1);
      g.fillRect(bx, by, 2 * TILE, 2 * TILE);
      b.cells.forEach((k, ci) => {
        const x = bx + (ci % 2) * TILE;
        const y = by + Math.floor(ci / 2) * TILE;
        if (k) this.square(x, y, k);
      });
      if (closing) {
        // The lid: a cardboard slab with the verdict chalked on it.
        g.fillStyle(UFO50.skin, 1);
        g.fillRect(bx, by, 2 * TILE, 2 * TILE);
        g.fillStyle(b.result === 'clean' ? UFO50.mint : b.result === 'messy' ? UFO50.gold : UFO50.red, 1);
        g.fillRect(bx + 2, by + 14, 2 * TILE - 4, 4);
      }
      // Selection: white frame on the box; in cells mode a blinking cursor on the cell.
      if (i === p.box) {
        g.lineStyle(1, UFO50.white, 1);
        g.strokeRect(bx - 5.5, by - 5.5, 2 * TILE + 11, 2 * TILE + 11);
        if (s.placement === 'cells' && !closing) {
          const x = bx + (p.cell % 2) * TILE;
          const y = by + Math.floor(p.cell / 2) * TILE;
          g.lineStyle(1, Math.floor(s.tick / 8) % 2 === 0 ? UFO50.gold : UFO50.white, 1);
          g.strokeRect(x + 0.5, y + 0.5, TILE - 2, TILE - 2);
        }
      }
    });

    // Tip popups from close events (render-side memory of events already seen).
    for (const e of s.events) {
      if (e.tick <= this.lastEventTick) continue;
      if (e.type === 'close' && e.box !== undefined) {
        const bx = L.boxX0 + e.box * L.boxGap;
        const text = e.result === 'clean' ? `CLEAN +$${e.tip}` : e.result === 'messy' ? `MESSY +$${e.tip}` : 'SENT BACK';
        const color = e.result === 'clean' ? UFO50.mint : e.result === 'messy' ? UFO50.gold : UFO50.red;
        this.tipPops.push({ x: bx - 8, y: L.boxY - 30, tick: s.tick, text, color });
      }
      if (e.type === 'floor') this.tipPops.push({ x: cx0 + CONVEYOR.slots * (TILE + 6), y: cy, tick: s.tick, text: 'FLOOR!', color: UFO50.red });
      if (e.type === 'rackFull') this.tipPops.push({ x: LOGICAL_W - 70, y: cy - 12, tick: s.tick, text: 'RACK FULL!', color: UFO50.red });
      if (e.type === 'blocked' && e.box !== undefined) this.tipPops.push({ x: L.boxX0 + e.box * L.boxGap - 4, y: L.boxY + 2 * TILE + 16, tick: s.tick, text: 'NO ROOM', color: UFO50.lightGrey });
    }
    this.lastEventTick = s.tick - 1;
    this.tipPops = this.tipPops.filter((t) => s.tick - t.tick < 60);
    // Popups are drawn as bitmap text objects created on demand and destroyed after.
    this.drawPops(s.tick);

    this.texts[1]!.setText(`${SHIFT.waveNames[s.wave] ?? ''}  ${s.boxesThisWave}/${SHIFT.boxesPerWave[s.wave] ?? '-'}`);
    this.texts[2]!.setText(`TIPS $${s.tips}`);
    this.texts[3]!.setText('X'.repeat(s.strikes) + '.'.repeat(Math.max(0, SHIFT.strikesToLose - s.strikes)));
    if (s.phase !== 'playing') {
      g.fillStyle(UFO50.black, 0.6);
      g.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
      this.texts[0]!.setText(s.phase === 'won' ? `CLEAN SHIFT. TIPS $${s.tips}. RELOAD.` : `SHIFT OVER. TIPS $${s.tips}. RELOAD.`);
    }
  }

  private square(x: number, y: number, k: Kind): void {
    const g = this.g;
    g.fillStyle(KIND_COLOR[k], 1);
    g.fillRect(x, y, TILE - 1, TILE - 1);
    g.fillStyle(UFO50.rust, 1);
    g.fillRect(x, y + TILE - 3, TILE - 1, 2); // crust lip
  }

  private pops: Phaser.GameObjects.BitmapText[] = [];
  private drawPops(tick: number): void {
    for (const p of this.pops) p.destroy();
    this.pops = this.tipPops.map((t) => this.add.bitmapText(t.x, t.y - Math.floor((tick - t.tick) / 4), FONT_KEY, t.text).setTint(t.color).setDepth(20));
  }
}
