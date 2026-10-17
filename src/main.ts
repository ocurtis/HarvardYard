import Phaser from 'phaser';
import { LOGICAL_H, LOGICAL_W, PLAYER_COUNT_DEFAULT } from './config/game';
import { GameLoop } from './loop';
import { KeyboardInput } from './render/keyboard';
import { BootScene } from './render/BootScene';
import { YardScene } from './render/YardScene';
import type { Music } from './render/music';

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') ?? Date.now() % 1_000_000);
const playerCount = Number(params.get('players') ?? PLAYER_COUNT_DEFAULT);

const loop = new GameLoop({ seed, playerCount });
const keys = new KeyboardInput(0);
loop.addInput(keys);

function integerZoom(): number {
  return Math.max(1, Math.floor(Math.min(innerWidth / LOGICAL_W, innerHeight / LOGICAL_H)));
}

// M mutes: a render-only key, wired through the one keyboard module once the scene has its music.
const yard = new YardScene(loop, (m: Music) => keys.onRenderKey('m', () => m.toggleMute()));

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: LOGICAL_W,
  height: LOGICAL_H,
  pixelArt: true,
  antialias: false,
  roundPixels: true,
  backgroundColor: '#000000',
  scale: {
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    zoom: integerZoom(),
  },
  fps: { target: 60 },
  scene: [new BootScene(), yard],
});

addEventListener('resize', () => game.scale.setZoom(integerZoom()));

// Handy in the console while tuning.
const dbg = window as unknown as { loop: GameLoop; game: Phaser.Game };
dbg.loop = loop;
dbg.game = game;
