// The HUD: an NES-style side panel. Black, double-framed, bitmap font, a
// segmented meter for the statue, the bank, the round, and a shop of boxed
// keys with tower icons and prices that go grey when you can't afford them.
// Reads state; never writes it. Layout numbers here are cosmetic (render-only).

import Phaser from 'phaser';
import { HUD_W, LOGICAL_H, STATUE, TILE } from '../config/game';
import { PALETTE } from '../config/palette';
import { SELF_UPGRADE, TOWERS, type TowerKind } from '../config/towers';
import { WAVES } from '../config/waves';
import { playerTile, towerAt } from '../sim/towers';
import type { GameState } from '../sim/types';
import { canStartWave } from '../sim/waves';
import { FONT_KEY, type Atlas } from './assets';

const FRAME = 0xffffff; // outer frame
const FRAME_IN = 0x202040; // inner frame, UFO 50 navy
const DIM = 0x707070; // can't afford / inactive
const GOLD = 0xe8ea4a;
const RED = 0xe03c32;
const MINT = 0x58f5b1;
const PIPS = 3; // self-upgrade levels

interface ShopRow {
  kind: TowerKind;
  key: string;
  icon: Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle;
  price: Phaser.GameObjects.BitmapText;
  keyText: Phaser.GameObjects.BitmapText;
}

export class Hud {
  private g: Phaser.GameObjects.Graphics; // static chrome, drawn once
  private dyn: Phaser.GameObjects.Graphics; // meter, pips, blink
  private money: Phaser.GameObjects.BitmapText;
  private round: Phaser.GameObjects.BitmapText;
  private prompt1: Phaser.GameObjects.BitmapText;
  private prompt2: Phaser.GameObjects.BitmapText;
  private shop: ShopRow[] = [];
  private upgrLabel: Phaser.GameObjects.BitmapText;
  private upgrPrice: Phaser.GameObjects.BitmapText;
  private selfLabels: Phaser.GameObjects.BitmapText[] = [];
  private selfPrices: Phaser.GameObjects.BitmapText[] = [];
  private fps: Phaser.GameObjects.BitmapText;

  // Vertical layout, top to bottom.
  private static Y = { title: 5, meter: 14, money: 24, round: 34, prompt: 46, shop: 70, shopRow: 26, upgr: 150, self: 166, selfRow: 20, fps: LOGICAL_H - 10 };

  constructor(private scene: Phaser.Scene, atlas: Atlas) {
    const Y = Hud.Y;
    const text = (x: number, y: number, s = '', tint = FRAME) => scene.add.bitmapText(x, y, FONT_KEY, s).setTint(tint).setDepth(2000);
    this.g = scene.add.graphics().setDepth(1999);
    this.dyn = scene.add.graphics().setDepth(2001);
    this.drawChrome();

    text(6, Y.title, 'STATUE');
    this.money = text(4, Y.money, '$0', GOLD);
    this.round = text(4, Y.round, '');
    this.prompt1 = text(6, Y.prompt, '', GOLD);
    this.prompt2 = text(6, Y.prompt + 9, '', GOLD);

    const rows: { kind: TowerKind; key: string }[] = [
      { kind: 'dig', key: '1' },
      { kind: 'sprinkler', key: '2' },
      { kind: 'amp', key: '3' },
    ];
    rows.forEach((r, i) => {
      const y = Y.shop + i * Y.shopRow;
      const keyText = text(4, y + 9, r.key);
      let icon: ShopRow['icon'];
      if (atlas[r.kind]) {
        const sp = scene.add.sprite(12, y + 24, r.kind, 0).setOrigin(0, 1).setDepth(2000);
        if ((atlas[r.kind]?.w ?? TILE) > TILE) sp.setCrop(0, 0, TILE, atlas[r.kind]!.h); // the Amp: just the man
        icon = sp;
      } else {
        icon = scene.add.rectangle(12, y + 24, TILE - 2, TILE - 2, PALETTE[r.kind]).setOrigin(0, 1).setDepth(2000);
      }
      const price = text(29, y + 9, `$${TOWERS[r.kind].cost}`);
      this.shop.push({ kind: r.kind, key: r.key, icon, price, keyText });
    });

    this.upgrLabel = text(4, Y.upgr, 'U UPGR', MINT);
    this.upgrPrice = text(4, Y.upgr + 8, '', MINT);

    const self = ['4 SERM', '5 RNGE', '6 SPD'];
    self.forEach((label, i) => {
      const y = Y.self + i * Y.selfRow;
      this.selfLabels.push(text(4, y, label));
      this.selfPrices.push(text(22, y + 9, ''));
    });
    this.fps = text(4, Y.fps, '', DIM);
  }

  private drawChrome(): void {
    const Y = Hud.Y;
    const g = this.g;
    g.fillStyle(PALETTE.hud, 1);
    g.fillRect(0, 0, HUD_W, LOGICAL_H);
    // Double frame: white outside, navy inside.
    g.lineStyle(1, FRAME, 1);
    g.strokeRect(0.5, 0.5, HUD_W - 1, LOGICAL_H - 1);
    g.lineStyle(1, FRAME_IN, 1);
    g.strokeRect(2.5, 2.5, HUD_W - 5, LOGICAL_H - 5);
    // Section rules.
    for (const y of [Y.shop - 6, Y.upgr - 4, Y.self - 4]) {
      g.fillStyle(FRAME_IN, 1);
      g.fillRect(3, y, HUD_W - 6, 1);
    }
    // Meter frame.
    g.lineStyle(1, FRAME, 1);
    g.strokeRect(3.5, Y.meter - 0.5, HUD_W - 7, 7);
    // Key boxes in the shop and the self-upgrade rows.
    for (let i = 0; i < 3; i++) {
      const y = Y.shop + i * Y.shopRow;
      g.strokeRect(2.5, y + 7.5, 9, 10);
    }
  }

  sync(s: GameState, fpsAvg: number): void {
    const Y = Hud.Y;
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
      d.fillRect(4 + i * 4, Y.meter, 3, 6);
    }

    this.money.setText(`$${s.money}`);
    const r = s.wave.index < 0 ? 'R--/' + WAVES.length : `R${s.wave.index + 1}/${WAVES.length}`; // 6 chars max: the column is 48px
    this.round.setText(r);

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
    for (const row of this.shop) {
      const ok = s.money >= TOWERS[row.kind].cost;
      row.price.setTint(ok ? FRAME : DIM);
      row.keyText.setTint(ok ? FRAME : DIM);
      row.icon.setAlpha(ok ? 1 : 0.4);
    }

    const here = towerAt(s, playerTile(p0));
    const up = here ? TOWERS[here.kind].levels[here.level]!.upgradeCost : null;
    this.upgrLabel.setVisible(!!here);
    this.upgrPrice.setVisible(!!here);
    if (here) {
      const okUp = up !== null && s.money >= up;
      this.upgrPrice.setText(up === null ? 'MAX' : `$${up}`).setTint(okUp ? MINT : DIM);
      this.upgrLabel.setTint(okUp ? MINT : DIM);
    }

    const levels = [p0.upgrades.shout, p0.upgrades.range, p0.upgrades.speed];
    levels.forEach((lvl, i) => {
      const y = Y.self + i * Y.selfRow;
      const cost = SELF_UPGRADE.costs[lvl];
      const ok = cost !== undefined && s.money >= cost;
      this.selfPrices[i]!.setText(cost === undefined ? 'MAX' : `$${cost}`).setTint(cost === undefined ? MINT : ok ? FRAME : DIM);
      this.selfLabels[i]!.setTint(cost === undefined ? MINT : ok ? FRAME : DIM);
      for (let k = 0; k < PIPS; k++) {
        d.fillStyle(k < lvl ? MINT : FRAME_IN, 1);
        d.fillRect(5 + k * 5, y + 10, 4, 4);
      }
    });

    this.fps.setText(`${fpsAvg.toFixed(0)}FPS`);
  }
}
