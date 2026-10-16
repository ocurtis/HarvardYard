// Reads GameState and draws it. Never mutates state.

import Phaser from 'phaser';
import { BRO, GRID_H, GRID_W, HUD_W, LOGICAL_H, LOGICAL_W, SHOUT, STATUE, TILE, TOURIST } from '../config/game';
import { PALETTE } from '../config/palette';
import { WAVES } from '../config/waves';
import type { GameLoop } from '../loop';
import type { BroState, MapData, PlayerState, TileKind, TouristState } from '../sim/types';
import { canStartWave } from '../sim/waves';

const TILE_COLOR: Record<TileKind, number> = {
  grass: PALETTE.grass,
  path: PALETTE.path,
  tree: PALETTE.tree,
  building: PALETTE.building,
  stone: PALETTE.stone,
  statue: PALETTE.statue,
  foot: PALETTE.foot,
  gate: PALETTE.gate,
  exit: PALETTE.exit,
  guide: PALETTE.guide,
};

interface BroView {
  body: Phaser.GameObjects.Rectangle;
  cup: Phaser.GameObjects.Rectangle;
  bar: Phaser.GameObjects.Rectangle;
}

interface TouristView {
  body: Phaser.GameObjects.Rectangle;
  hat: Phaser.GameObjects.Rectangle;
  bar: Phaser.GameObjects.Rectangle;
}

export class YardScene extends Phaser.Scene {
  private players: Phaser.GameObjects.Rectangle[] = [];
  private facingDots: Phaser.GameObjects.Rectangle[] = [];
  private hudText!: Phaser.GameObjects.Text;
  private hpFill!: Phaser.GameObjects.Rectangle;
  private fx!: Phaser.GameObjects.Graphics;
  private overlay!: Phaser.GameObjects.Container;
  private overlayText!: Phaser.GameObjects.Text;
  private fpsSamples: number[] = [];
  private world!: Phaser.GameObjects.Container;
  private broViews = new Map<number, BroView>();
  private touristViews = new Map<number, TouristView>();

  constructor(private readonly loop: GameLoop) {
    super('yard');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(PALETTE.bg);
    // Everything in the map lives in a container offset by the HUD column,
    // so sim coordinates stay map-relative.
    this.world = this.add.container(HUD_W, 0);
    this.drawMap(this.loop.state.map);

    // Dynamic per-frame drawing (shout cone, piss streams) goes here, above tiles, below sprites.
    this.fx = this.add.graphics();
    this.world.add(this.fx);

    for (const p of this.loop.state.players) {
      const rect = this.add.rectangle(p.pos.x, p.pos.y, TILE - 2, TILE - 2, PALETTE.player);
      rect.setOrigin(0.5);
      this.world.add(rect);
      this.players.push(rect);
      const dot = this.add.rectangle(p.pos.x, p.pos.y, 3, 3, PALETTE.playerFacing);
      dot.setOrigin(0.5);
      this.world.add(dot);
      this.facingDots.push(dot);
    }

    // HUD column on the left. Placeholder until the real HUD in session 5.
    this.add.rectangle(0, 0, HUD_W, LOGICAL_H, PALETTE.hud).setOrigin(0);
    this.add.rectangle(2, 2, HUD_W - 4, 6, 0x333333).setOrigin(0);
    this.hpFill = this.add.rectangle(2, 2, HUD_W - 4, 6, PALETTE.playerFacing).setOrigin(0);
    this.hudText = this.add
      .text(1, 10, '', { fontFamily: 'monospace', fontSize: '7px', color: '#ffffff', wordWrap: { width: HUD_W - 2 } })
      .setOrigin(0)
      .setResolution(1);

    // Win/loss overlay.
    this.overlay = this.add.container(0, 0).setVisible(false);
    this.overlay.add(this.add.rectangle(0, 0, LOGICAL_W, LOGICAL_H, 0x000000, 0.6).setOrigin(0));
    this.overlayText = this.add
      .text(HUD_W + (GRID_W * TILE) / 2, LOGICAL_H / 2, '', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5)
      .setResolution(1);
    this.overlay.add(this.overlayText);
  }

  override update(_time: number, delta: number): void {
    this.loop.advance(delta);
    const s = this.loop.state;

    s.players.forEach((p, i) => {
      // Round to whole pixels so the sprite sits on the pixel grid.
      const x = Math.round(p.pos.x);
      const y = Math.round(p.pos.y);
      this.players[i]?.setPosition(x, y);
      this.facingDots[i]?.setPosition(x + p.facing.x * 5, y + p.facing.y * 5);
    });

    this.syncBros(s.bros);
    this.syncTourists(s.tourists);
    this.drawFx(s.bros, s.players);

    // HUD.
    this.hpFill.width = Math.max(0, (HUD_W - 4) * (s.statueHp / STATUE.hp));
    this.fpsSamples.push(delta);
    if (this.fpsSamples.length > 30) this.fpsSamples.shift();
    const avg = this.fpsSamples.reduce((a, b) => a + b, 0) / this.fpsSamples.length;
    const waveLabel = s.wave.index < 0 ? '-' : `${s.wave.index + 1}/${WAVES.length}`;
    const prompt = canStartWave(s) ? '\nSPACE\nnext\nwave' : '\nJ/X\nshout';
    this.hudText.setText(
      `HP\n${Math.ceil(s.statueHp)}\n\n$${s.money}\n\nWAVE\n${waveLabel}\n\nbros\n${s.bros.length}${prompt}\n\n${(1000 / avg).toFixed(0)}fps`,
    );

    if (s.phase !== 'playing') {
      this.overlay.setVisible(true);
      this.overlayText.setText(
        s.phase === 'lost'
          ? `JOHN HARVARD\nHAS BEEN PISSED ON\n\nwave ${s.wave.index + 1}\n\nreload to try again`
          : `THE YARD IS SAFE\n\nreload to play again`,
      );
    }
  }

  private syncBros(bros: BroState[]): void {
    const seen = new Set<number>();
    for (const b of bros) {
      seen.add(b.id);
      let v = this.broViews.get(b.id);
      if (!v) {
        const body = this.add.rectangle(0, 0, TILE - 4, TILE - 2, PALETTE.bro).setOrigin(0.5);
        const cup = this.add.rectangle(0, 0, 3, 3, PALETTE.broCup).setOrigin(0.5);
        const bar = this.add.rectangle(0, 0, TILE - 4, 2, PALETTE.broBar).setOrigin(0, 0.5);
        this.world.add(body);
        this.world.add(cup);
        this.world.add(bar);
        v = { body, cup, bar };
        this.broViews.set(b.id, v);
      }
      const x = Math.round(b.pos.x);
      const y = Math.round(b.pos.y);
      v.body.setPosition(x, y);
      v.cup.setPosition(x + b.facing.x * 5, y + b.facing.y * 4);
      v.bar.setPosition(x - (TILE - 4) / 2, y - TILE / 2 - 1);
      v.bar.width = Math.max(0, (TILE - 4) * (b.drunk / BRO.drunk));
      v.body.setFillStyle(b.phase === 'stagger' || b.slow > 0 ? PALETTE.broStagger : PALETTE.bro);
    }
    for (const [id, v] of this.broViews) {
      if (!seen.has(id)) {
        v.body.destroy();
        v.cup.destroy();
        v.bar.destroy();
        this.broViews.delete(id);
      }
    }
  }

  private syncTourists(tourists: TouristState[]): void {
    const seen = new Set<number>();
    for (const t of tourists) {
      seen.add(t.id);
      let v = this.touristViews.get(t.id);
      if (!v) {
        const body = this.add.rectangle(0, 0, TILE - 4, TILE - 2, PALETTE.tourist).setOrigin(0.5);
        const hat = this.add.rectangle(0, 0, TILE - 2, 3, PALETTE.touristPamphlet).setOrigin(0.5);
        const bar = this.add.rectangle(0, 0, TILE - 4, 2, PALETTE.touristTimer).setOrigin(0, 0.5);
        this.world.add(body);
        this.world.add(hat);
        this.world.add(bar);
        v = { body, hat, bar };
        this.touristViews.set(t.id, v);
      }
      const x = Math.round(t.pos.x);
      const y = Math.round(t.pos.y);
      v.body.setPosition(x, y);
      v.hat.setPosition(x, y - TILE / 2 + 1);
      v.body.setFillStyle(t.phase === 'confused' ? PALETTE.touristConfused : PALETTE.tourist);
      // Pamphleted tourists carry a white brochure (the hat stripe turns solid); the
      // patience bar only shows while confused.
      v.hat.setVisible(t.phase === 'pamphleted');
      v.bar.setVisible(t.phase === 'confused');
      v.bar.setPosition(x - (TILE - 4) / 2, y - TILE / 2 - 1);
      v.bar.width = Math.max(0, (TILE - 4) * (t.timer / TOURIST.confusedTicks));
    }
    for (const [id, v] of this.touristViews) {
      if (!seen.has(id)) {
        v.body.destroy();
        v.hat.destroy();
        v.bar.destroy();
        this.touristViews.delete(id);
      }
    }
  }

  private drawFx(bros: BroState[], players: PlayerState[]): void {
    const g = this.fx;
    g.clear();
    for (const p of players) {
      if (!p.shouting) continue;
      // The shout cone, drawn as a translucent wedge so range and width are readable.
      const fl = Math.hypot(p.facing.x, p.facing.y) || 1;
      const a = Math.atan2(p.facing.y / fl, p.facing.x / fl);
      const half = (SHOUT.halfAngleDeg * Math.PI) / 180;
      g.fillStyle(PALETTE.shout, 0.35);
      g.slice(Math.round(p.pos.x), Math.round(p.pos.y), SHOUT.rangePx, a - half, a + half, false);
      g.fillPath();
    }
    for (const t of this.loop.state.tourists) {
      if (t.phase !== 'confused') continue;
      // A question mark: a 2px stroke, pixel-font style, above the head.
      const x = Math.round(t.pos.x);
      const y = Math.round(t.pos.y) - TILE;
      g.fillStyle(PALETTE.touristTimer, 1);
      g.fillRect(x - 2, y - 4, 4, 1);
      g.fillRect(x + 2, y - 3, 1, 2);
      g.fillRect(x, y - 1, 2, 1);
      g.fillRect(x, y, 1, 1);
      g.fillRect(x, y + 2, 1, 1);
    }
    for (const b of bros) {
      if (b.phase === 'windup') {
        // Small exclamation above the head while he unzips.
        g.fillStyle(PALETTE.foot, 1);
        g.fillRect(Math.round(b.pos.x) - 1, Math.round(b.pos.y) - TILE, 2, 5);
        g.fillRect(Math.round(b.pos.x) - 1, Math.round(b.pos.y) - TILE + 6, 2, 2);
      }
      if (b.phase === 'pissing') {
        // The stream: an arc of yellow pixels from the bro toward the statue.
        const sx = Math.round(b.pos.x) + b.facing.x * 4;
        const sy = Math.round(b.pos.y) + b.facing.y * 2;
        g.fillStyle(PALETTE.piss, 1);
        for (let i = 0; i < 6; i++) {
          const t = i / 5;
          const px = sx + b.facing.x * i * 2;
          const py = sy + b.facing.y * i * 2 - Math.round(Math.sin(t * Math.PI) * 4) + (b.facing.y === 0 ? 0 : 0);
          g.fillRect(px, py, 2, 2);
        }
      }
    }
  }

  private drawMap(map: MapData): void {
    const g = this.add.graphics();
    this.world.add(g);
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        const kind = map.tiles[y * GRID_W + x]!;
        let color = TILE_COLOR[kind];
        if (kind === 'grass' && (x + y) % 2 === 0) color = PALETTE.grassAlt;
        g.fillStyle(color, 1);
        g.fillRect(x * TILE, y * TILE, TILE, TILE);
      }
    }
    // Statue outline so the 2x2 reads as one object.
    g.lineStyle(1, 0x000000, 1);
    g.strokeRect(map.statue.x * TILE + 0.5, map.statue.y * TILE + 0.5, TILE * 2 - 1, TILE * 2 - 1);
  }
}
