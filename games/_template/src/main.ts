import Phaser from 'phaser';
import { GameLoop } from '@shared/loop';
import { LOGICAL_H, LOGICAL_W, PLAYER_COUNT_DEFAULT, TICK_MS } from './config/game';
import { BootScene } from './render/BootScene';
import { KeyboardInput } from './render/keyboard';
import { MainScene } from './render/MainScene';
import { createState, step } from './sim/sim';
import type { Command, GameState } from './sim/types';

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') ?? Date.now() % 1_000_000);
const playerCount = Number(params.get('players') ?? PLAYER_COUNT_DEFAULT);

const loop = new GameLoop<GameState, Command>(createState({ seed, playerCount }), { tickMs: TICK_MS, step });
const keys = new KeyboardInput(0);
loop.addInput(keys);

function integerZoom(): number {
  return Math.max(1, Math.floor(Math.min(innerWidth / LOGICAL_W, innerHeight / LOGICAL_H)));
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: LOGICAL_W,
  height: LOGICAL_H,
  pixelArt: true,
  antialias: false,
  roundPixels: true,
  backgroundColor: '#000000',
  scale: { mode: Phaser.Scale.NONE, autoCenter: Phaser.Scale.CENTER_BOTH, zoom: integerZoom() },
  fps: { target: 60 },
  scene: [new BootScene(), new MainScene(loop)],
});
addEventListener('resize', () => game.scale.setZoom(integerZoom()));

// Handy in the console while tuning.
const dbg = window as unknown as { loop: GameLoop<GameState, Command>; game: Phaser.Game };
dbg.loop = loop;
dbg.game = game;
