import Phaser from 'phaser';
import { LOGICAL_H, LOGICAL_W, PLAYER_COUNT_DEFAULT } from './config/game';
import { GameLoop } from './loop';
import { KeyboardInput } from './render/keyboard';
import { YardScene } from './render/YardScene';

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') ?? Date.now() % 1_000_000);
const playerCount = Number(params.get('players') ?? PLAYER_COUNT_DEFAULT);

const loop = new GameLoop({ seed, playerCount });
loop.addInput(new KeyboardInput(0));

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
  scale: {
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    zoom: integerZoom(),
  },
  fps: { target: 60 },
  scene: [new YardScene(loop)],
});

addEventListener('resize', () => game.scale.setZoom(integerZoom()));

// Handy in the console while tuning.
(window as unknown as { loop: GameLoop }).loop = loop;
