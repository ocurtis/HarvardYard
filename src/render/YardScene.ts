// Reads GameState and draws it. Never mutates state.

import Phaser from 'phaser';
import { CHUCKER, CUP, GHOST, GRID_H, GRID_W, HUD_W, ROUND_BANNER_TICKS, SERMON_FX, LOGICAL_H, LOGICAL_W, LONGSHOT, POPUP_TICKS, SHOUT, STATUE, TILE, TOURIST } from '../config/game';
import { PALETTE } from '../config/palette';
import type { GameLoop } from '../loop';
import type { BroState, MapData, PlayerState, TileKind, TouristState } from '../sim/types';
import { SELF_UPGRADE, TOWERS } from '../config/towers';
import { canBuild, playerTile, towerAt, towerRange } from '../sim/towers';
import { snapCardinal, windTiles } from '../sim/wind';
import { AMP } from '../config/towers';
import { isBuildable, tileAt } from '../sim/map';
import { shoutRange } from '../sim/shout';
import { isLaneTile } from '../sim/path';
import { variantKey, type Atlas } from './assets';
import { destinationShort } from '../sim/tourists';
import { statueCenter } from '../sim/bros';
import { Music } from './music';
import { Sfx } from './sfx';
import { Hud } from './hud';
import { FONT_KEY } from './assets';

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
  // Either an animated sprite (when the atlas has the bro) or placeholder rectangles.
  sprite: Phaser.GameObjects.Sprite | null;
  body: Phaser.GameObjects.Rectangle | null;
  cup: Phaser.GameObjects.Rectangle | null;
  bar: Phaser.GameObjects.Rectangle;
  anim: string;
}

interface TouristView {
  sprite: Phaser.GameObjects.Sprite | null;
  flagSprite: Phaser.GameObjects.Sprite | null;
  flash: Phaser.GameObjects.Sprite | null;
  body: Phaser.GameObjects.Rectangle | null;
  hat: Phaser.GameObjects.Rectangle | null;
  flag: Phaser.GameObjects.Rectangle | null;
  label: Phaser.GameObjects.Text | null; // the guide's "$40", ticking down
  anim: string;
  moving: boolean;
  lastPos: { x: number; y: number };
}

export class YardScene extends Phaser.Scene {
  private players: Phaser.GameObjects.Rectangle[] = [];
  private facingDots: Phaser.GameObjects.Rectangle[] = [];
  private halo!: Phaser.GameObjects.Graphics;
  private sparks: { x: number; y: number; tick: number }[] = [];
  private playerSprites: Phaser.GameObjects.Sprite[] = [];
  private playerAnim: string[] = [];
  private playerFlip: boolean[] = [];
  private hud!: Hud;
  private music!: Music;
  private sfx!: Sfx;
  private noticeBox!: Phaser.GameObjects.Graphics;
  private bannerBox!: Phaser.GameObjects.Graphics;
  private fx!: Phaser.GameObjects.Graphics;
  private overlay!: Phaser.GameObjects.Container;
  private overlayText!: Phaser.GameObjects.BitmapText;
  private banner!: Phaser.GameObjects.BitmapText;
  private bannerTick = -1e9;
  private noticeText!: Phaser.GameObjects.BitmapText;
  private fpsSamples: number[] = [];
  private world!: Phaser.GameObjects.Container;
  private broViews = new Map<number, BroView>();
  private atlas: Atlas = {};
  private touristViews = new Map<number, TouristView>();
  private towerViews = new Map<number, Phaser.GameObjects.Rectangle>();
  private popupViews = new Map<number, Phaser.GameObjects.Text>();
  private boneViews = new Map<number, Phaser.GameObjects.Rectangle>();
  private rings!: Phaser.GameObjects.Graphics;
  private statueSprite: Phaser.GameObjects.Sprite | null = null;
  private overhead!: Phaser.GameObjects.Graphics;
  private towerSprites = new Map<number, { sprite: Phaser.GameObjects.Sprite; anim: string; cooldown: number }>();
  private boneSprites = new Map<number, Phaser.GameObjects.Sprite>();
  private cursor!: Phaser.GameObjects.Graphics;

  constructor(
    private readonly loop: GameLoop,
    private readonly onMusic?: (music: Music) => void,
  ) {
    super('yard');
  }

  create(): void {
    this.atlas = (this.registry.get('atlas') as Atlas | undefined) ?? {};
    this.cameras.main.setBackgroundColor(PALETTE.bg);
    this.music = new Music(this);
    this.sfx = new Sfx(this);
    this.onMusic?.(this.music);
    // Everything in the map lives in a container offset by the HUD column,
    // so sim coordinates stay map-relative.
    this.world = this.add.container(HUD_W, 0);
    this.drawMap(this.loop.state.map);

    // Dynamic per-frame drawing (shout cone, piss streams) goes here, above tiles, below sprites.
    this.rings = this.add.graphics().setDepth(-1.5);
    this.world.add(this.rings);
    this.cursor = this.add.graphics().setDepth(-1.2);
    this.world.add(this.cursor);
    this.fx = this.add.graphics().setDepth(-1);
    this.world.add(this.fx);
    this.halo = this.add.graphics().setDepth(-1.5).setBlendMode(Phaser.BlendModes.ADD);
    this.world.add(this.halo);
    // Overhead layer: the longshot's arc flies over everyone, including the player.
    this.overhead = this.add.graphics().setDepth(9000);
    this.world.add(this.overhead);

    for (const p of this.loop.state.players) {
      if (this.atlas['player']?.file) {
        // John Harvard. Faces right in the sheet; flipped for left. Up/down keep the last horizontal facing.
        const sprite = this.add.sprite(p.pos.x, p.pos.y + TILE / 2, 'player', 0).setOrigin(0.5, 1).setAlpha(GHOST.spriteAlpha);
        this.world.add(sprite);
        this.playerSprites.push(sprite);
        this.playerAnim.push('');
        this.playerFlip.push(false);
        continue;
      }
      // Placeholder until the player has a sprite: a hollow outline, so it never looks like a backdrop.
      const rect = this.add.rectangle(p.pos.x, p.pos.y, TILE - 4, TILE - 4, PALETTE.player, 0.15).setStrokeStyle(1, PALETTE.player);
      rect.setOrigin(0.5);
      rect.setDepth(p.pos.y);
      this.world.add(rect);
      this.players.push(rect);
      const dot = this.add.rectangle(p.pos.x, p.pos.y, 3, 3, PALETTE.playerFacing);
      dot.setOrigin(0.5);
      this.world.add(dot);
      this.facingDots.push(dot);
    }

    // HUD panel on the left (NES-style; see hud.ts).
    this.hud = new Hud(this, this.atlas);

    // Shop feedback, bottom of the map: boxed bitmap text.
    this.noticeBox = this.add.graphics().setDepth(999);
    this.noticeText = this.add.bitmapText(HUD_W + 4, LOGICAL_H - 11, FONT_KEY, '').setTint(PALETTE.money).setDepth(1000);

    // Win/loss overlay.
    this.overlay = this.add.container(0, 0).setVisible(false).setDepth(9600);
    // A 50% checkerboard dither instead of an alpha fade: every pixel stays on the palette.
    if (!this.textures.exists('dither')) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0x000000, 1);
      for (let y = 0; y < LOGICAL_H; y++) for (let x = y % 2; x < LOGICAL_W; x += 2) g.fillRect(x, y, 1, 1);
      g.generateTexture('dither', LOGICAL_W, LOGICAL_H); // baked once; a Graphics would replay 60k rects a frame
      g.destroy();
    }
    this.overlay.add(this.add.image(0, 0, 'dither').setOrigin(0));
    this.overlayText = this.add
      .bitmapText(HUD_W + (GRID_W * TILE) / 2, LOGICAL_H / 2, FONT_KEY, '')
      .setOrigin(0.5)
      .setCenterAlign()
      .setScale(2);
    this.overlay.add(this.overlayText);

    // Round banner: "ROUND X: PROTECT YOUR STATUE!" for a couple of seconds at each wave start.
    this.bannerBox = this.add.graphics().setDepth(9499).setVisible(false);
    this.banner = this.add
      .bitmapText(HUD_W + (GRID_W * TILE) / 2, LOGICAL_H / 3, FONT_KEY, '')
      .setOrigin(0.5)
      .setDepth(9500)
      .setVisible(false);
  }

  override update(_time: number, delta: number): void {
    this.loop.advance(delta);
    const s = this.loop.state;
    this.music.sync(s);
    this.sfx.sync(s);

    s.players.forEach((p, i) => {
      // Round to whole pixels so the sprite sits on the pixel grid.
      const x = Math.round(p.pos.x);
      const y = Math.round(p.pos.y);
      this.players[i]?.setPosition(x, y).setDepth(y + TILE / 2);
      this.facingDots[i]?.setPosition(x + p.facing.x * 5, y + p.facing.y * 5).setDepth(y + TILE / 2 + 0.5);
      const sprite = this.playerSprites[i];
      if (sprite) {
        const feet = y + TILE / 2;
        sprite.setPosition(x, feet).setDepth(feet);
        if (p.facing.x !== 0) this.playerFlip[i] = p.facing.x < 0;
        sprite.setFlipX(this.playerFlip[i]!);
        const anim = p.shouting ? 'shout' : p.moving ? 'walk' : 'idle';
        if (anim !== this.playerAnim[i]) {
          this.playerAnim[i] = anim;
          sprite.play(`player:${anim}`, true);
        }
      }
    });

    this.syncBros(s.bros);
    this.syncTourists(s.tourists);
    this.syncTowers();
    this.syncPopups();
    this.drawFx(s.bros, s.players);
    // Draw order: whoever's feet are lower on screen draws in front. Tiles and fx stay at the back.
    this.world.sort('depth');

    if (this.statueSprite) {
      const frac = s.statueHp / STATUE.hp;
      this.statueSprite.setFrame(frac > 0.75 ? 0 : frac > 0.4 ? 1 : frac > 0.1 ? 2 : 3);
    }

    // HUD.
    this.fpsSamples.push(delta);
    if (this.fpsSamples.length > 30) this.fpsSamples.shift();
    const avg = this.fpsSamples.reduce((a, b) => a + b, 0) / this.fpsSamples.length;
    this.hud.sync(s, 1000 / avg);

    const n = s.notice;
    const showNotice = !!n && s.tick - n.tick < 120;
    this.noticeText.setText(showNotice ? n!.text.toUpperCase() : '');
    this.noticeBox.clear();
    if (showNotice) {
      this.noticeBox.fillStyle(0x000000, 1);
      this.noticeBox.fillRect(HUD_W + 2, LOGICAL_H - 13, this.noticeText.width + 4, 12);
    }

    for (const e of s.events) {
      if (e.type === 'waveStart' && e.tick > this.bannerTick) {
        this.bannerTick = e.tick;
        this.banner.setText(`ROUND ${s.wave.index + 1}: PROTECT YOUR STATUE!`);
        this.bannerBox.clear();
        this.bannerBox.fillStyle(0x202040, 1);
        this.bannerBox.fillRect(this.banner.x - this.banner.width / 2 - 6, this.banner.y - this.banner.height / 2 - 4, this.banner.width + 12, this.banner.height + 8);
        this.bannerBox.lineStyle(1, 0xffffff, 1);
        this.bannerBox.strokeRect(this.banner.x - this.banner.width / 2 - 5.5, this.banner.y - this.banner.height / 2 - 3.5, this.banner.width + 11, this.banner.height + 7);
      }
    }
    const bannerOn = s.tick - this.bannerTick < ROUND_BANNER_TICKS && s.phase === 'playing';
    this.banner.setVisible(bannerOn);
    this.bannerBox.setVisible(bannerOn);

    if (s.phase !== 'playing') {
      this.overlay.setVisible(true);
      this.overlayText.setText(
        s.phase === 'lost'
          ? `JOHN HARVARD\nHAS BEEN PISSED ON\n\nROUND ${s.wave.index + 1}\n\nRELOAD TO TRY AGAIN`
          : `THE YARD IS SAFE\n\nRELOAD TO PLAY AGAIN`,
      );
    }
  }

  private syncBros(bros: BroState[]): void {
    const seen = new Set<number>();
    for (const b of bros) {
      seen.add(b.id);
      let v = this.broViews.get(b.id);
      if (!v) {
        const key = variantKey(this.atlas, b.kind, b.variant) ?? variantKey(this.atlas, 'bro', b.variant);
        const bar = this.add.rectangle(0, 0, TILE - 4, 2, PALETTE.broBar).setOrigin(0, 0.5);
        this.world.add(bar);
        if (key) {
          const sprite = this.add.sprite(0, 0, key, 0).setOrigin(0.5, 1);
          this.world.add(sprite);
          v = { sprite, body: null, cup: null, bar, anim: '' };
        } else {
          const body = this.add.rectangle(0, 0, TILE - 4, TILE - 2, PALETTE.bro).setOrigin(0.5);
          const cup = this.add.rectangle(0, 0, 3, 3, PALETTE.broCup).setOrigin(0.5);
          this.world.add(body);
          this.world.add(cup);
          v = { sprite: null, body, cup, bar, anim: '' };
        }
        this.broViews.set(b.id, v);
      }
      // A longshot shakes the whole way in and through the wind-up: he has to go.
      const shaking = (b.kind === 'longshot' && (b.phase === 'walking' || b.phase === 'windup')) || (b.kind === 'chucker' && b.phase === 'windup' && b.timer <= LONGSHOT.windupTicks);
      const jitter = shaking ? (Math.floor(this.loop.state.tick / LONGSHOT.shakeEveryTicks) % 2 === 0 ? LONGSHOT.shakePx : -LONGSHOT.shakePx) : 0;
      const x = Math.round(b.pos.x) + jitter;
      const y = Math.round(b.pos.y);
      const feet = y + TILE / 2; // sim pos is the tile center; sprites stand on the tile's bottom edge
      if (v.sprite) {
        v.sprite.setPosition(x, feet).setDepth(feet);
        const anim = broAnim(b);
        if (anim !== v.anim) {
          v.anim = anim;
          v.sprite.play(`${v.sprite.texture.key}:${anim}`, true);
        }
        // Stagger: the stagger frame plus a flash so the hit reads.
        v.sprite.setTint(b.phase === 'stagger' && Math.floor(this.time.now / 60) % 2 === 0 ? 0xffffff : 0xffffff);
        v.sprite.setAlpha(b.slow > 0 && Math.floor(this.time.now / 80) % 2 === 0 ? 0.6 : 1);
      } else {
        v.body!.setPosition(x, y).setDepth(feet);
        v.cup!.setPosition(x + b.facing.x * 5, y + b.facing.y * 4).setDepth(feet + 0.1);
        v.bar.setPosition(x - (TILE - 4) / 2, y - TILE / 2 - 1).setDepth(feet + 0.1);
        v.body!.setFillStyle(b.phase === 'stagger' || b.slow > 0 ? PALETTE.broStagger : PALETTE.bro);
      }
      v.bar.width = Math.max(0, (TILE - 4) * (b.drunk / b.maxDrunk));
    }
    for (const [id, v] of this.broViews) {
      if (!seen.has(id)) {
        v.sprite?.destroy();
        v.body?.destroy();
        v.cup?.destroy();
        v.bar.destroy();
        this.broViews.delete(id);
      }
    }
  }

  private syncTourists(tourists: TouristState[]): void {
    const seen = new Set<number>();
    const state = this.loop.state;
    for (const t of tourists) {
      seen.add(t.id);
      let v = this.touristViews.get(t.id);
      if (!v) {
        const key = variantKey(this.atlas, 'tourist', t.variant);
        let label: Phaser.GameObjects.Text | null = null;
        if (t.guide) {
          label = this.add
            .text(0, 0, '', { fontFamily: 'monospace', fontSize: '7px', color: '#e8ea4a', backgroundColor: '#202040' })
            .setOrigin(0.5, 1)
            .setResolution(1);
          this.world.add(label);
        }
        if (key) {
          const sprite = this.add.sprite(0, 0, key, 0).setOrigin(0.5, 1);
          this.world.add(sprite);
          let flagSprite: Phaser.GameObjects.Sprite | null = null;
          if (t.guide && this.atlas['tourist_flag']) {
            flagSprite = this.add.sprite(0, 0, 'tourist_flag', 0).setOrigin(0, 1);
            flagSprite.play('tourist_flag:wave');
            this.world.add(flagSprite);
          }
          let flash: Phaser.GameObjects.Sprite | null = null;
          if (!t.guide && this.atlas['flash']) {
            flash = this.add.sprite(0, 0, 'flash', 0).setOrigin(0.5, 0.5).setVisible(false);
            this.world.add(flash);
          }
          v = { sprite, flagSprite, flash, body: null, hat: null, flag: null, label, anim: '', moving: false, lastPos: { ...t.pos } };
        } else {
          const body = this.add.rectangle(0, 0, TILE - 4, TILE - 2, PALETTE.tourist).setOrigin(0.5);
          const hat = this.add.rectangle(0, 0, TILE - 2, 3, PALETTE.touristPamphlet).setOrigin(0.5);
          const flag = this.add.rectangle(0, 0, 4, 3, PALETTE.touristFlag).setOrigin(0, 1).setVisible(t.guide);
          this.world.add(body);
          this.world.add(hat);
          this.world.add(flag);
          v = { sprite: null, flagSprite: null, flash: null, body, hat, flag, label, anim: '', moving: false, lastPos: { ...t.pos } };
        }
        this.touristViews.set(t.id, v);
      }
      const x = Math.round(t.pos.x);
      const y = Math.round(t.pos.y);
      const feet = y + TILE / 2;
      const guide = t.guide ? t : state.tourists.find((g) => g.group === t.group && g.guide);
      const confused = guide?.phase === 'confused';
      const pamphleted = guide?.phase === 'pamphleted';
      const moving = t.pos.x !== v.lastPos.x || t.pos.y !== v.lastPos.y;
      v.lastPos = { x: t.pos.x, y: t.pos.y };

      if (v.sprite) {
        v.sprite.setPosition(x, feet).setDepth(feet);
        let anim: string;
        if (t.guide) anim = t.phase === 'confused' || t.phase === 'posing' ? 'confused' : pamphleted ? 'brochure' : 'walk';
        else anim = t.photo > 0 ? 'photo' : 'walk';
        const key = v.sprite.texture.key;
        if (anim !== v.anim) {
          v.anim = anim;
          v.sprite.play(`${key}:${anim}`, true);
        }
        // Standing still: freeze the walk on its first frame.
        if (anim === 'walk' || anim === 'brochure') {
          if (!moving && v.moving) v.sprite.anims.pause(v.sprite.anims.currentAnim?.frames[0]);
          if (moving && !v.moving) v.sprite.anims.resume();
        }
        v.moving = moving;
        v.flagSprite?.setPosition(x + 5, feet - 20).setDepth(feet + 0.2);
        if (v.flash) {
          const show = t.photo > TOURIST.photoTicks * (2 / 3);
          v.flash.setVisible(show);
          if (show) {
            v.flash.setPosition(x, feet - 14).setDepth(feet + 0.3);
            if (!v.flash.anims.isPlaying) v.flash.play('flash:flash');
          } else if (v.flash.anims.isPlaying) v.flash.stop();
        }
      } else {
        v.body!.setPosition(x, y).setDepth(feet);
        v.hat!.setPosition(x, y - TILE / 2 + 1).setDepth(feet + 0.1);
        v.body!.setFillStyle(confused ? PALETTE.touristConfused : t.guide ? PALETTE.touristGuide : PALETTE.tourist);
        v.hat!.setVisible(t.guide && pamphleted);
        v.flag!.setPosition(x + 5, y - TILE / 2 - 2).setDepth(feet + 0.2);
      }
      if (v.label) {
        // The group's value, from the moment they're on the map until they leave the foot.
        const g = state.groups[t.group];
        const show = !!g && (t.phase === 'entering' || t.phase === 'confused' || t.phase === 'pamphleted' || t.phase === 'posing');
        v.label.setVisible(show);
        if (show && g) {
          const val = Math.max(0, Math.ceil(g.value));
          v.label.setText(` $${val} ${destinationShort(state, g.dest)} `);
          // Locked (brochure handed over) reads white; draining reads yellow; nearly gone reads red.
          const frac = g.maxValue > 0 ? g.value / g.maxValue : 0;
          v.label.setColor(g.locked ? '#ffffff' : frac < 0.3 ? '#fe626e' : '#e8ea4a');
          const top = v.sprite ? feet - 24 : y - TILE / 2;
          v.label.setPosition(x, top - 1).setDepth(feet + 50);
        }
      }
    }
    for (const [id, v] of this.touristViews) {
      if (!seen.has(id)) {
        v.sprite?.destroy();
        v.flagSprite?.destroy();
        v.flash?.destroy();
        v.body?.destroy();
        v.hat?.destroy();
        v.flag?.destroy();
        v.label?.destroy();
        this.touristViews.delete(id);
      }
    }
  }

  // Floating "+$40" / "-$10" over where it happened, rising and fading.
  private syncPopups(): void {
    const s = this.loop.state;
    const seen = new Set<number>();
    for (const p of s.popups) {
      seen.add(p.id);
      let t = this.popupViews.get(p.id);
      if (!t) {
        t = this.add
          .text(0, 0, p.text, { fontFamily: 'monospace', fontSize: '8px', color: p.kind === 'gain' ? '#a4f022' : p.kind === 'loss' ? '#fe626e' : '#ffffff', backgroundColor: '#202040' })
          .setOrigin(0.5, 1)
          .setResolution(1);
        this.world.add(t);
        this.popupViews.set(p.id, t);
      }
      const age = s.tick - p.tick;
      t.setPosition(Math.round(p.pos.x), Math.round(p.pos.y) - 12 - Math.floor(age / 5)).setDepth(10000);
      t.setAlpha(age > POPUP_TICKS - 20 ? (POPUP_TICKS - age) / 20 : 1);
    }
    for (const [id, t] of this.popupViews) {
      if (!seen.has(id)) {
        t.destroy();
        this.popupViews.delete(id);
      }
    }
  }

  private syncTowers(): void {
    const s = this.loop.state;
    const seen = new Set<number>();
    for (const t of s.towers) {
      seen.add(t.id);
      const c = { x: t.tile.x * TILE + TILE / 2, y: t.tile.y * TILE + TILE };
      const hasArt = !!this.atlas[t.kind]; // a kind without a sheet yet draws as its placeholder rectangle
      if (hasArt) {
        let v = this.towerSprites.get(t.id);
        if (!v) {
          const sprite = this.add.sprite(c.x, c.y, t.kind, 0).setOrigin(0.5, 1);
          this.world.add(sprite);
          v = { sprite, anim: '', cooldown: t.cooldown };
          this.towerSprites.set(t.id, v);
        }
        // A sheet wider than a tile (the Amp: the man on his tile, the stack a tile
        // over) is anchored on its left tile; the stack goes on the wind side.
        const wide = (this.atlas[t.kind]?.w ?? TILE) > TILE;
        const flip = wide && t.kind === 'amp' && t.facing.x < 0;
        v.sprite.setOrigin(wide ? TILE / 2 / (this.atlas[t.kind]!.w) : 0.5, 1).setFlipX(flip);
        v.sprite.setPosition(flip ? c.x - TILE : c.x, c.y).setDepth(c.y); // flip mirrors within the frame box, so shift the box a tile west
        let anim: string;
        if (t.kind === 'dig') {
          // A bone just left when the cooldown jumps up; play the fire frames once, then idle.
          const fired = t.cooldown > v.cooldown;
          v.cooldown = t.cooldown;
          const level = t.level > 0 ? '2' : '';
          if (fired) {
            v.anim = `fire${level}`;
            v.sprite.play(`dig:fire${level}`, true);
            v.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
              v!.anim = '';
            });
            v.sprite.anims.currentAnim!.repeat = 0;
            continue;
          }
          anim = v.anim.startsWith('fire') ? v.anim : `idle${level}`;
        } else if (t.kind === 'amp') {
          const blowing = s.bros.some((b) => b.inWind && this.inWindOf(t, b));
          anim = (blowing ? 'play' : 'idle') + (t.level > 0 ? '2' : '');
        } else {
          anim = t.level > 0 ? 'spin2' : 'spin';
        }
        if (anim !== v.anim) {
          v.anim = anim;
          v.sprite.play(`${t.kind}:${anim}`, true);
        }
      } else {
        let r = this.towerViews.get(t.id);
        if (!r) {
          r = this.add.rectangle(0, 0, TILE - 2, TILE - 2, t.kind === 'dig' ? PALETTE.dig : t.kind === 'amp' ? PALETTE.amp : PALETTE.sprinkler).setOrigin(0.5, 1);
          this.world.add(r);
          this.towerViews.set(t.id, r);
        }
        r.setPosition(c.x, c.y).setDepth(c.y);
        r.setStrokeStyle(t.level > 0 ? 1 : 0, 0xffffff);
      }
    }
    for (const [id, r] of this.towerViews) {
      if (!seen.has(id)) {
        r.destroy();
        this.towerViews.delete(id);
      }
    }
    for (const [id, v] of this.towerSprites) {
      if (!seen.has(id)) {
        v.sprite.destroy();
        this.towerSprites.delete(id);
      }
    }
    // Range rings, always visible: this is the placement tax made legible.
    this.rings.clear();
    for (const t of s.towers) {
      if (t.kind === 'amp') {
        this.drawWindCone(this.rings, t.tile, t.facing, t.level, 0.5);
        continue;
      }
      this.rings.lineStyle(1, t.kind === 'dig' ? PALETTE.dig : PALETTE.sprinkler, 0.5);
      this.rings.strokeCircle(t.tile.x * TILE + TILE / 2, t.tile.y * TILE + TILE / 2, towerRange(t));
    }
    // Bones.
    const seenB = new Set<number>();
    const boneArt = !!this.atlas['bone'];
    for (const b of s.bones) {
      seenB.add(b.id);
      if (boneArt) {
        let sp = this.boneSprites.get(b.id);
        if (!sp) {
          sp = this.add.sprite(0, 0, 'bone', 0).setOrigin(0.5);
          sp.play('bone:spin');
          this.world.add(sp);
          this.boneSprites.set(b.id, sp);
        }
        sp.setPosition(Math.round(b.pos.x), Math.round(b.pos.y) - 6).setDepth(b.pos.y + 100);
      } else {
        let r = this.boneViews.get(b.id);
        if (!r) {
          r = this.add.rectangle(0, 0, 3, 3, PALETTE.bone).setOrigin(0.5);
          this.world.add(r);
          this.boneViews.set(b.id, r);
        }
        r.setPosition(Math.round(b.pos.x), Math.round(b.pos.y)).setDepth(b.pos.y + 100);
      }
    }
    for (const [id, r] of this.boneViews) {
      if (!seenB.has(id)) {
        r.destroy();
        this.boneViews.delete(id);
      }
    }
    for (const [id, sp] of this.boneSprites) {
      if (!seenB.has(id)) {
        sp.destroy();
        this.boneSprites.delete(id);
      }
    }
    // Build cursor: the tile under the player, green if buildable, red if not.
    this.cursor.clear();
    const p0 = s.players[0];
    if (p0) {
      const tile = playerTile(p0);
      const ok = isBuildable(tileAt(s.map, tile.x, tile.y)) && !towerAt(s, tile);
      this.cursor.lineStyle(1, ok ? PALETTE.cursorOk : PALETTE.cursorBad, 0.9);
      this.cursor.strokeRect(tile.x * TILE + 0.5, tile.y * TILE + 0.5, TILE - 1, TILE - 1);
      if (ok && canBuild(s, p0, 'sprinkler').ok) {
        // Preview the cheaper tower's range so placement is a decision, not a guess.
        this.cursor.lineStyle(1, PALETTE.cursorOk, 0.25);
        this.cursor.strokeCircle(tile.x * TILE + TILE / 2, tile.y * TILE + TILE / 2, TOWERS.dig.levels[0]!.rangePx);
      }
      if (ok && s.money >= TOWERS.amp.cost) {
        // And where an Amp would blow: red if it would wall the Yard off.
        const ampOk = canBuild(s, p0, 'amp').ok;
        this.drawWindCone(this.cursor, tile, snapCardinal(p0.facing), 0, ampOk ? 0.25 : 0.6, ampOk ? undefined : PALETTE.cursorBad);
      }
    }
  }

  // Is this bro standing on one of this amp's wind tiles? (Render-side mirror of the sim's test.)
  private inWindOfCache = new Map<string, Set<number>>();
  private inWindOf(t: { tile: { x: number; y: number }; facing: { x: number; y: number }; level: number; id: number }, b: BroState): boolean {
    const key = `${t.id}:${t.level}`;
    let set = this.inWindOfCache.get(key);
    if (!set) {
      const probe = { id: t.id, kind: 'amp' as const, tile: t.tile, level: t.level, cooldown: 0, facing: t.facing };
      set = new Set(windTiles(this.loop.state.map, probe, t.level).map((w) => w.y * this.loop.state.map.w + w.x));
      this.inWindOfCache.set(key, set);
    }
    return set.has(Math.floor(b.pos.y / TILE) * this.loop.state.map.w + Math.floor(b.pos.x / TILE));
  }

  // The Amp's wind cone: two edge lines and an arc, plus a hatch on the lane tiles
  // it walls off (that is the part the player is really buying).
  private drawWindCone(g: Phaser.GameObjects.Graphics, tile: { x: number; y: number }, facing: { x: number; y: number }, level: number, alpha: number, color = PALETTE.amp): void {
    const cx = tile.x * TILE + TILE / 2;
    const cy = tile.y * TILE + TILE / 2;
    const r = TOWERS.amp.levels[level]!.rangePx;
    const half = (AMP.halfAngleDeg[level] ?? AMP.halfAngleDeg[0]!) * (Math.PI / 180);
    const a0 = Math.atan2(facing.y, facing.x);
    g.lineStyle(1, color, alpha);
    g.beginPath();
    g.moveTo(cx + Math.cos(a0 - half) * r, cy + Math.sin(a0 - half) * r);
    g.lineTo(cx, cy);
    g.lineTo(cx + Math.cos(a0 + half) * r, cy + Math.sin(a0 + half) * r);
    g.strokePath();
    g.beginPath();
    g.arc(cx, cy, r, a0 - half, a0 + half, false);
    g.strokePath();
    const probe = { id: -1, kind: 'amp' as const, tile, level, cooldown: 0, facing };
    g.fillStyle(color, alpha * 0.7);
    for (const w of windTiles(this.loop.state.map, probe, level)) {
      for (let i = 0; i < TILE; i += 4) g.fillRect(w.x * TILE + i, w.y * TILE + ((i / 4) % 2) * 2, 2, 1);
      g.fillRect(w.x * TILE, w.y * TILE + TILE - 1, TILE, 1);
    }
  }

  private drawFx(bros: BroState[], players: PlayerState[]): void {
    const g = this.fx;
    g.clear();
    this.overhead.clear();
    if (this.playerSprites.length > 0) {
      // Ghost halo: a pool of light under the player, breathing slowly. Additive so it
      // brightens grass and asphalt alike; a thin cyan rim gives the soft shape an edge.
      const breath = (Math.sin((this.time.now / GHOST.glowPeriodMs) * Math.PI * 2) + 1) / 2;
      const a = GHOST.glowAlpha + GHOST.glowPulse * breath;
      for (const p of players) {
        const gx = Math.round(p.pos.x);
        const gy = Math.round(p.pos.y) + TILE / 2 - 2;
        this.halo.clear();
        this.halo.fillStyle(PALETTE.ghostGlow, a * 0.6);
        this.halo.fillEllipse(gx, gy, GHOST.glowRadiusPx * 3, GHOST.glowRadiusPx * 1.5);
        this.halo.fillStyle(PALETTE.ghostGlow, a);
        this.halo.fillEllipse(gx, gy, GHOST.glowRadiusPx * 2, GHOST.glowRadiusPx);
        this.halo.lineStyle(1, PALETTE.ghostRim, GHOST.rimAlpha);
        this.halo.strokeEllipse(gx, gy, GHOST.glowRadiusPx * 2, GHOST.glowRadiusPx);
      }
    }
    const tick = this.loop.state.tick;
    for (const p of players) {
      if (!p.shouting) continue;
      // The sermon: dashed pixel arcs ripple out from him across the cone. Range and
      // width still read (the arcs stop at the range) without a painted wedge.
      const fl = Math.hypot(p.facing.x, p.facing.y) || 1;
      const a = Math.atan2(p.facing.y / fl, p.facing.x / fl);
      const half = (SHOUT.halfAngleDeg * Math.PI) / 180;
      const range = shoutRange(p);
      const ox = Math.round(p.pos.x);
      const oy = Math.round(p.pos.y) - 4;
      // Shout power adds an arc per level and thickens the dashes at the top level;
      // range shows itself as the arcs reaching further. Paying for an upgrade must be visible.
      const arcs = SERMON_FX.arcs + p.upgrades.shout;
      const px = p.upgrades.shout >= SELF_UPGRADE.costs.length ? 3 : 2;
      for (let i = 0; i < arcs; i++) {
        const r = ((tick * SERMON_FX.speedPxPerTick + (i * range) / arcs) % range) + 4;
        const fade = 1 - r / (range + 4);
        g.fillStyle(i % 2 === 0 ? 0xffffff : PALETTE.ghostGlow, 0.55 + 0.45 * fade);
        const steps = Math.max(6, Math.round(r * 2 * half));
        for (let k = 0; k <= steps; k++) {
          const t = a - half + (2 * half * k) / steps;
          if (Math.floor((k * (r * 2 * half)) / steps / SERMON_FX.dashPx) % 2 === 1) continue;
          g.fillRect(Math.round(ox + Math.cos(t) * r) - 1, Math.round(oy + Math.sin(t) * r) - 1, px, px);
        }
      }
      // The cone's edge, faint, so a range upgrade reads as a bigger fan.
      g.lineStyle(1, PALETTE.ghostGlow, 0.25);
      g.beginPath();
      g.arc(ox, oy, range, a - half, a + half, false);
      g.strokePath();
    }
    // Wind streaks off every Amp: short dashes racing along the cone, dense while it
    // has somebody, sparse while it idles.
    for (const t of this.loop.state.towers) {
      if (t.kind !== 'amp') continue;
      const blowing = this.loop.state.bros.some((b) => b.inWind && this.inWindOf(t, b));
      const r = TOWERS.amp.levels[t.level]!.rangePx;
      const half = (AMP.halfAngleDeg[t.level] ?? AMP.halfAngleDeg[0]!) * (Math.PI / 180);
      const a0 = Math.atan2(t.facing.y, t.facing.x);
      const cx = t.tile.x * TILE + TILE / 2;
      const cy = t.tile.y * TILE + TILE / 2;
      const n = blowing ? 7 : 3;
      const speed = blowing ? 2.2 : 0.9;
      for (let i = 0; i < n; i++) {
        // Each streak has its own lane in the cone and its own phase along it.
        const ang = a0 + half * ((i / Math.max(1, n - 1)) * 2 - 1) * 0.85;
        const d = ((tick * speed + i * 37 + t.id * 11) % (r - 6)) + 6;
        const len = blowing ? 5 : 3;
        const x0 = cx + Math.cos(ang) * d;
        const y0 = cy + Math.sin(ang) * d;
        g.lineStyle(1, PALETTE.wind, (1 - d / r) * (blowing ? 1 : 0.7));
        g.beginPath();
        g.moveTo(Math.round(x0), Math.round(y0));
        g.lineTo(Math.round(x0 + Math.cos(ang) * len), Math.round(y0 + Math.sin(ang) * len));
        g.strokePath();
      }
    }
    // "!" sparks over bros the sermon just staggered (and the wind's).
    for (const e of this.loop.state.events) {
      if (e.type !== 'stagger' || (e.by !== 'shout' && e.by !== 'amp') || !e.pos) continue;
      if (!this.sparks.some((s) => s.tick === e.tick && s.x === e.pos!.x)) this.sparks.push({ x: e.pos.x, y: e.pos.y, tick: e.tick });
    }
    this.sparks = this.sparks.filter((s) => tick - s.tick < SERMON_FX.sparkTicks);
    for (const s of this.sparks) {
      const age = tick - s.tick;
      const y = Math.round(s.y) - TILE - Math.floor(age / 3);
      const x = Math.round(s.x);
      this.overhead.fillStyle(0xffffff, 1);
      this.overhead.fillRect(x - 1, y - 6, 2, 4);
      this.overhead.fillRect(x - 1, y - 1, 2, 2);
    }
    // Cups in flight: a shadow on the ground (that's what you run under) and the
    // cup itself on the overhead layer, arcing up and back down to the statue.
    for (const c of this.loop.state.cups) {
      const gx = Math.round(c.pos.x);
      const gy = Math.round(c.pos.y);
      g.fillStyle(0x202040, 0.45);
      g.fillRect(gx - 3, gy - 1, 6, 3);
      const h = Math.round(Math.sin(c.progress * Math.PI) * CUP.arcPx) + 6;
      const spin = Math.floor(this.loop.state.tick / 8) % 2;
      this.overhead.fillStyle(PALETTE.broCup, 1);
      this.overhead.fillRect(gx - 2, gy - h - 2 + spin, 4, 5);
      this.overhead.fillStyle(0xffffff, 1);
      this.overhead.fillRect(gx - 2, gy - h - 2 + spin, 4, 1);
      this.overhead.fillStyle(PALETTE.piss, 1);
      this.overhead.fillRect(gx - 1, gy - h + 1 + spin, 2, 1);
    }
    for (const b of bros) {
      if (b.phase === 'windup' && !(b.kind === 'chucker' && b.timer > CHUCKER.windupTicks)) {
        // Small exclamation above the head while he unzips.
        g.fillStyle(PALETTE.foot, 1);
        g.fillRect(Math.round(b.pos.x) - 1, Math.round(b.pos.y) - TILE, 2, 5);
        g.fillRect(Math.round(b.pos.x) - 1, Math.round(b.pos.y) - TILE + 6, 2, 2);
      }
      if (b.phase === 'pissing' && b.kind === 'longshot') {
        // The long arc: from the bro's hips up and over to the statue's head.
        const sc = statueCenter(this.loop.state);
        const sx = Math.round(b.pos.x);
        const sy = Math.round(b.pos.y) + 2;
        const ex = sc.x;
        const ey = sc.y - 14;
        const dist = Math.hypot(ex - sx, ey - sy);
        const height = Math.max(10, dist * 0.45);
        const steps = Math.max(10, Math.round(dist / 2));
        const phase = Math.floor(this.loop.state.tick / 2) % 4;
        this.overhead.fillStyle(PALETTE.piss, 1);
        for (let i = 0; i <= steps; i++) {
          if ((i + phase) % 4 === 0) continue; // gaps so it reads as a stream, not a rope
          const t = i / steps;
          const px = Math.round(sx + (ex - sx) * t);
          const py = Math.round(sy + (ey - sy) * t - Math.sin(t * Math.PI) * height);
          this.overhead.fillRect(px - 1, py - 1, 2, 2);
        }
        continue;
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
    const tiles = this.atlas['tiles'];
    const g = this.add.graphics().setDepth(-2);
    this.world.add(g);
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        const kind = map.tiles[y * GRID_W + x]!;
        const frame = tiles ? tileFrame(tiles.anims, kind, x, y, map) : null;
        if (frame !== null) {
          const img = this.add.image(x * TILE, y * TILE, 'tiles', frame).setOrigin(0).setDepth(-2);
          this.world.add(img);
          // Grass is a step above the path: where a lane tile meets grass, the grass lip
          // spills over its edge (dark-green scallop, shadow under the north lip).
          if (isLaneTile(kind)) {
            const sides: Array<[string, number, number]> = [['edge_n', 0, -1], ['edge_e', 1, 0], ['edge_s', 0, 1], ['edge_w', -1, 0]];
            for (const [name, dx, dy] of sides) {
              const n = tileAt(map, x + dx, y + dy);
              if (n === 'grass' || n === 'tree') {
                const ef = tiles!.anims[name]?.frames[0];
                if (ef !== undefined) this.world.add(this.add.image(x * TILE, y * TILE, 'tiles', ef).setOrigin(0).setDepth(-1.99));
              }
            }
          }
        } else {
          let color = TILE_COLOR[kind];
          if (kind === 'grass' && (x + y) % 2 === 0) color = PALETTE.grassAlt;
          g.fillStyle(color, 1);
          g.fillRect(x * TILE, y * TILE, TILE, TILE);
        }
      }
    }
    // The statue: a 32x32 sprite whose frame follows statue HP; rectangles otherwise.
    if (this.atlas['statue']) {
      this.statueSprite = this.add.sprite(map.statue.x * TILE, map.statue.y * TILE, 'statue', 0).setOrigin(0);
      this.statueSprite.setDepth((map.statue.y + 2) * TILE); // its feet are the plinth's bottom edge
      this.world.add(this.statueSprite);
    } else {
      g.lineStyle(1, 0x000000, 1);
      g.strokeRect(map.statue.x * TILE + 0.5, map.statue.y * TILE + 0.5, TILE * 2 - 1, TILE * 2 - 1);
    }
    // Nameplates: every building says what it is, like a campus map.
    for (const b of map.buildings) {
      const cx = ((b.box.x0 + b.box.x1 + 1) / 2) * TILE;
      const cy = ((b.box.y0 + b.box.y1 + 1) / 2) * TILE;
      const tall = b.box.y1 - b.box.y0 > b.box.x1 - b.box.x0;
      const label = this.add
        .text(cx, cy, tall ? b.short.split('').join('\n') : ` ${b.name.toUpperCase()} `, {
          fontFamily: 'monospace',
          fontSize: '7px',
          color: '#ffffff',
          backgroundColor: '#202040',
          align: 'center',
          lineSpacing: -2,
        })
        .setOrigin(0.5)
        .setResolution(1)
        .setDepth(-1.9);
      this.world.add(label);
      if (b.spot) {
        // A small marker on the photo spot so the destination is visible before anyone goes there.
        const m = this.add.rectangle(b.spot.x * TILE + TILE / 2, b.spot.y * TILE + TILE / 2, 4, 4, PALETTE.touristFlag, 0.7).setDepth(-1.8);
        this.world.add(m);
      }
    }
  }
}

function broAnim(b: BroState): string {
  switch (b.phase) {
    case 'walking':
      return 'walk';
    case 'windup':
      return 'windup';
    case 'pissing':
      return 'piss';
    case 'stagger':
      return 'stagger';
    case 'leaving':
      return 'sober';
  }
}

// Which tile frame draws a map cell. Buildings get walls with windows on
// alternate rows; University Hall (the bottom wall) is granite, the dorms brick.
// A cheap integer hash so tile variants don't fall into a visible lattice.
function tileHash(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

function tileFrame(anims: Record<string, { frames: number[] }>, kind: TileKind, x: number, y: number, map: MapData): number | null {
  const f = (name: string) => anims[name]?.frames[0] ?? null;
  switch (kind) {
    case 'grass':
      return f(['grass_a', 'grass_a', 'grass_b', 'grass_c', 'grass_d'][tileHash(x, y) % 5]!);
    case 'path': {
      // Cobbles on the lane tile just inside a gate: the gate is a place, not a line.
      const byGate = [[0, -1], [1, 0], [0, 1], [-1, 0]].some(([dx, dy]) => tileAt(map, x + dx!, y + dy!) === 'gate');
      if (byGate) return f('cobble');
      return f(['path', 'path_b', 'path_c', 'path_d'][tileHash(x, y) % 4]!);
    }
    case 'tree':
      return f(['bush_a', 'bush_b', 'bush_c'][(x * 3 + y * 5) % 3]!);
    case 'stone':
      return f('stone');
    case 'building': {
      const b = map.buildings.find((bb) => x >= bb.box.x0 && x <= bb.box.x1 && y >= bb.box.y0 && y <= bb.box.y1);
      const granite = b ? b.name.toLowerCase().includes('university') : y >= map.h - 2;
      const window = (x + (b ? b.box.x0 : 0)) % 3 === 1 && (y - (b ? b.box.y0 : 0)) % 2 === 0;
      return f(granite ? (window ? 'granite_window' : 'granite') : window ? 'brick_window' : 'brick');
    }
    case 'statue':
      return f('grass_a'); // the statue sprite draws over it
    case 'foot':
      return f('foot');
    case 'gate':
      return f(y === 0 ? 'gate_n' : y === map.h - 1 ? 'gate_s' : x === 0 ? 'gate_w' : 'gate_e');
    case 'exit':
      return f('exit');
    case 'guide':
      return f(['path', 'path_b', 'path_c', 'path_d'][tileHash(x, y) % 4]!); // a lane tile; the old flag marker meant nothing
  }
}
