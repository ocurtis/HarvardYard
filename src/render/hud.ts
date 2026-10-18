// The HUD: an NES-style side panel. Black, double-framed, bitmap font, a
// segmented meter for the statue, the bank, the round, and one kind of row for
// everything you can buy: an icon in a box on the left, the key and the price
// to its right (self-upgrades add a pip line). Reads state; never writes it.
// Layout numbers here are cosmetic (render-only).

import Phaser from 'phaser';
import { HUD_W, LOGICAL_H, STATUE, TILE } from '../config/game';
import { PALETTE } from '../config/palette';
import { SELF_UPGRADE, TOWERS, type SelfStat, type TowerKind } from '../config/towers';
import { WAVES } from '../config/waves';
import { playerTile, towerAt } from '../sim/towers';
import type { GameState } from '../sim/types';
import { canStartWave } from '../sim/waves';
import { FONT_KEY, type Atlas } from './assets';

const FRAME = 0xffffff; // outer frame, labels
const FRAME_IN = 0x202040; // inner frame, empty pips, rules
const DIM = 0x707070; // can't afford / inactive
const GOLD = 0xe8ea4a; // money, prompts
const RED = 0xe03c32;
const MINT = 0x58f5b1; // maxed, pips

// The grid. One margin (X), one text column (TX), one row shape.
const X = 4; // left margin
const TX = 26; // text column: right of the icon box, with a 4px gap
const BOX_W = 18; // icon box, outer
const BOX_H = 26;
const LINE = 9; // text pitch
const Y = {
  title: 5,
  meter: 14,
  money: 24,
  round: 33,
  prompt: 45, // two lines
  sections: 64, // first section rule; a label sits 2px under each rule, rows 10px under the label
  label: 2,
  rowsAfterLabel: 10,
  row: 27, // row pitch: a 26px box and a 1px gap
  sectionGap: 2,
};

type RowKind = { tower: TowerKind } | { self: SelfStat } | { upgrade: true };

interface Row {
  kind: RowKind;
  y: number;
  icon?: Phaser.GameObjects.Sprite;
  key: Phaser.GameObjects.BitmapText;
  price: Phaser.GameObjects.BitmapText;
}

export class Hud {
  private g: Phaser.GameObjects.Graphics; // static chrome, drawn once
  private dyn: Phaser.GameObjects.Graphics; // meter, pips, blink
  private money: Phaser.GameObjects.BitmapText;
  private round: Phaser.GameObjects.BitmapText;
  private prompt1: Phaser.GameObjects.BitmapText;
  private prompt2: Phaser.GameObjects.BitmapText;
  private rows: Row[] = [];
  private rules: number[] = []; // y of each section rule

  constructor(scene: Phaser.Scene, atlas: Atlas) {
    const text = (x: number, y: number, s = '', tint = FRAME) => scene.add.bitmapText(x, y, FONT_KEY, s).setTint(tint).setDepth(2000);
    this.g = scene.add.graphics().setDepth(1999);
    this.dyn = scene.add.graphics().setDepth(2001);

    text(X, Y.title, 'STATUE');
    this.money = text(X, Y.money, '$0', GOLD);
    this.round = text(X, Y.round, '');
    this.prompt1 = text(X, Y.prompt, '', GOLD);
    this.prompt2 = text(X, Y.prompt + LINE, '', GOLD);

    // Two labeled sections: what you build, and what you buy for the ghost himself.
    const sections: { label: string; rows: { kind: RowKind; key: string }[] }[] = [
      {
        label: 'BUILD',
        rows: [
          { kind: { tower: 'dig' }, key: '1' },
          { kind: { tower: 'sprinkler' }, key: '2' },
          { kind: { tower: 'amp' }, key: '3' },
          { kind: { upgrade: true }, key: 'U' },
        ],
      },
      {
        label: 'GHOST',
        rows: [
          { kind: { self: 'shout' }, key: '4' },
          { kind: { self: 'range' }, key: '5' },
          { kind: { self: 'speed' }, key: '6' },
        ],
      },
    ];
    let y = Y.sections;
    const flat: { kind: RowKind; key: string; y: number }[] = [];
    for (const sec of sections) {
      this.rules.push(y);
      text(X, y + Y.label, sec.label);
      y += Y.label + Y.rowsAfterLabel;
      for (const r of sec.rows) {
        flat.push({ ...r, y });
        y += Y.row;
      }
      y += Y.sectionGap;
    }
    flat.forEach((k) => {
      const y = k.y;
      const row: Row = { kind: k.kind, y, key: text(TX, y + 1, k.key), price: text(TX, y + 1 + LINE, '', GOLD) };
      if ('tower' in k.kind && atlas[k.kind.tower]) {
        // The tower sprite in its box; the Amp's sheet is two tiles wide, show the man.
        const sp = scene.add.sprite(X + 1, y + 1 + (BOX_H - 2), k.kind.tower, 0).setOrigin(0, 1).setDepth(2000);
        if ((atlas[k.kind.tower]?.w ?? TILE) > TILE) sp.setCrop(0, 0, TILE, atlas[k.kind.tower]!.h);
        row.icon = sp;
      }
      this.rows.push(row);
    });
    this.drawChrome();
  }

  private drawChrome(): void {
    const g = this.g;
    g.fillStyle(PALETTE.hud, 1);
    g.fillRect(0, 0, HUD_W, LOGICAL_H);
    // Double frame: white outside, navy inside.
    g.lineStyle(1, FRAME, 1);
    g.strokeRect(0.5, 0.5, HUD_W - 1, LOGICAL_H - 1);
    g.lineStyle(1, FRAME_IN, 1);
    g.strokeRect(2.5, 2.5, HUD_W - 5, LOGICAL_H - 5);
    // A rule over each section label.
    g.fillStyle(FRAME_IN, 1);
    for (const y of this.rules) g.fillRect(3, y, HUD_W - 6, 1);
    // Meter frame: interior 39x6 = ten 3px segments with 1px gaps, flush all round.
    g.lineStyle(1, FRAME, 1);
    g.strokeRect(X - 0.5, Y.meter - 0.5, 40, 7);
    // Every row's icon box, and the drawn icons for the rows without a sprite.
    for (const row of this.rows) {
      g.lineStyle(1, FRAME, 1);
      g.strokeRect(X + 0.5, row.y + 0.5, BOX_W - 1, BOX_H - 1);
    }
  }

  // 16x24 white pictograms, NES item-box style.
  private drawIcon(g: Phaser.GameObjects.Graphics, kind: RowKind, x: number, y: number, color: number): void {
    g.fillStyle(color, 1);
    if ('tower' in kind) return; // towers have sprites
    if ('upgrade' in kind) {
      // Up arrow.
      for (let i = 0; i < 5; i++) g.fillRect(x + 7 - i, y + 5 + i, 1 + i * 2, 1);
      g.fillRect(x + 5, y + 10, 5, 9);
    } else if (kind.self === 'shout') {
      // The sermon: an open book with a spine, and a "!" over it.
      g.fillRect(x + 2, y + 11, 11, 8);
      g.fillStyle(PALETTE.hud, 1);
      g.fillRect(x + 7, y + 11, 1, 8);
      g.fillRect(x + 3, y + 13, 3, 1);
      g.fillRect(x + 9, y + 13, 3, 1);
      g.fillRect(x + 3, y + 15, 3, 1);
      g.fillRect(x + 9, y + 15, 3, 1);
      g.fillStyle(color, 1);
      g.fillRect(x + 7, y + 3, 1, 4);
      g.fillRect(x + 7, y + 8, 1, 1);
    } else if (kind.self === 'range') {
      // Three arcs widening to the right.
      for (let i = 0; i < 3; i++) {
        const r = 3 + i * 3;
        for (let k = -r; k <= r; k++) {
          const dx = Math.round(Math.sqrt(r * r - k * k));
          if (Math.abs(k) <= r * 0.8) g.fillRect(x + 3 + dx, y + 12 + k, 1, 1);
        }
      }
      g.fillRect(x + 2, y + 11, 2, 3);
    } else {
      // Speed: two chevrons.
      for (let c = 0; c < 2; c++) {
        for (let i = 0; i < 4; i++) {
          g.fillRect(x + 3 + c * 5 + i, y + 8 + i, 1, 1);
          g.fillRect(x + 3 + c * 5 + i, y + 16 - i, 1, 1);
        }
      }
    }
  }

  sync(s: GameState): void {
    const d = this.dyn;
    d.clear();

    // Statue meter: ten segments, red while high, flashing when low.
    const segs = 10;
    const lit = Math.ceil((s.statueHp / STATUE.hp) * segs);
    const low = s.statueHp <= STATUE.hp / 4;
    const blink = Math.floor(s.tick / 20) % 2 === 0;
    for (let i = 0; i < segs; i++) {
      const on = i < lit;
      d.fillStyle(on ? (low && blink ? FRAME : RED) : FRAME_IN, 1);
      d.fillRect(X + i * 4, Y.meter, 3, 6);
    }

    this.money.setText(`$${s.money}`);
    this.round.setText(s.wave.index < 0 ? `RD -/${WAVES.length}` : `RD ${s.wave.index + 1}/${WAVES.length}`);

    if (s.phase !== 'playing') {
      this.prompt1.setText('');
      this.prompt2.setText('');
    } else if (canStartWave(s)) {
      const show = Math.floor(s.tick / 30) % 2 === 0;
      this.prompt1.setText(show ? 'PUSH' : '');
      this.prompt2.setText(show ? 'SPACE' : '');
    } else {
      this.prompt1.setText('ROUND');
      this.prompt2.setText('ON!');
    }

    const p0 = s.players[0]!;
    const here = towerAt(s, playerTile(p0));
    for (const row of this.rows) {
      let cost: number | null; // null = maxed
      let active = true;
      let level = -1;
      if ('tower' in row.kind) {
        cost = TOWERS[row.kind.tower].cost;
      } else if ('upgrade' in row.kind) {
        cost = here ? TOWERS[here.kind].levels[here.level]!.upgradeCost : 0;
        active = !!here;
      } else {
        level = p0.upgrades[row.kind.self];
        cost = SELF_UPGRADE.costs[level] ?? null;
      }
      const maxed = cost === null;
      const ok = active && cost !== null && s.money >= cost;
      const tint = !active ? DIM : maxed ? MINT : ok ? FRAME : DIM;
      row.key.setTint(tint);
      row.price.setText(!active ? '--' : maxed ? 'MAX' : `$${cost}`).setTint(!active ? DIM : maxed ? MINT : ok ? GOLD : DIM);
      // Icons stay in full color (Owen); the key and price carry the can't-afford grey.
      if (!row.icon) this.drawIcon(d, row.kind, X + 1, row.y + 1, FRAME);
      if (level >= 0) {
        for (let k = 0; k < SELF_UPGRADE.costs.length; k++) {
          d.fillStyle(k < level ? MINT : FRAME_IN, 1);
          d.fillRect(TX + k * 6, row.y + 1 + LINE * 2 + 1, 4, 4);
        }
      }
    }
  }
}
