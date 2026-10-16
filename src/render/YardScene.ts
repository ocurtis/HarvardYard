// Reads GameState and draws it. Never mutates state.

import Phaser from 'phaser';
import { GRID_H, GRID_W, HUD_W, LOGICAL_H, TILE } from '../config/game';
import { PALETTE } from '../config/palette';
import type { GameLoop } from '../loop';
import type { MapData, TileKind } from '../sim/types';

const TILE_COLOR: Record<TileKind, number> = {
  grass: PALETTE.grass,
  path: PALETTE.path,
  tree: PALETTE.tree,
  building: PALETTE.building,
  stone: PALETTE.stone,
  statue: PALETTE.statue,
  foot: PALETTE.foot,
  gate: PALETTE.gate,
  guide: PALETTE.guide,
};

export class YardScene extends Phaser.Scene {
  private players: Phaser.GameObjects.Rectangle[] = [];
  private facingDots: Phaser.GameObjects.Rectangle[] = [];
  private hudText!: Phaser.GameObjects.Text;
  private fpsSamples: number[] = [];
  private world!: Phaser.GameObjects.Container;

  constructor(private readonly loop: GameLoop) {
    super('yard');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(PALETTE.bg);
    // Everything in the map lives in a container offset by the HUD column,
    // so sim coordinates stay map-relative.
    this.world = this.add.container(HUD_W, 0);
    this.drawMap(this.loop.state.map);

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
    this.hudText = this.add
      .text(1, 2, '', { fontFamily: 'monospace', fontSize: '7px', color: '#ffffff', wordWrap: { width: HUD_W - 2 } })
      .setOrigin(0)
      .setResolution(1);
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

    this.fpsSamples.push(delta);
    if (this.fpsSamples.length > 30) this.fpsSamples.shift();
    const avg = this.fpsSamples.reduce((a, b) => a + b, 0) / this.fpsSamples.length;
    const p0 = s.players[0];
    this.hudText.setText(
      `t${s.tick}\n${(1000 / avg).toFixed(0)}fps\n${p0 ? `${p0.pos.x.toFixed(0)}\n${p0.pos.y.toFixed(0)}` : '-'}`,
    );
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
