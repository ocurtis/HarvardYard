// Loads the sprite atlas produced by art/build.py and registers Phaser
// animations for every sprite and variant. Everything art-related the
// renderer needs to know lives here.

import Phaser from 'phaser';

export interface AtlasAnim {
  frames: number[];
  fps: number;
}
export interface AtlasEntry {
  file?: string;
  variants?: string[];
  w: number;
  h: number;
  frames: number;
  anims: Record<string, AtlasAnim>;
}
export type Atlas = Record<string, AtlasEntry>;

export const ATLAS_URL = 'sprites/atlas.json';

// The HUD font: art/gen_font.py renders these glyphs, in this order, as 6x8 cells.
export const FONT_URL = 'sprites/font.png';
export const FONT_KEY = 'hudfont';
export const FONT_CHARS = ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function registerFont(scene: Phaser.Scene): void {
  if (scene.cache.bitmapFont.exists(FONT_KEY) || !scene.textures.exists('font')) return;
  const data = Phaser.GameObjects.RetroFont.Parse(scene, {
    image: 'font',
    width: 6,
    height: 8,
    chars: FONT_CHARS,
    charsPerRow: FONT_CHARS.length,
    'offset.x': 0,
    'offset.y': 0,
    'spacing.x': 0,
    'spacing.y': 0,
    lineSpacing: 1,
  });
  scene.cache.bitmapFont.add(FONT_KEY, data);
}

// Queue every PNG in the atlas as a spritesheet. Call from a scene's preload
// after the atlas JSON itself has loaded.
export function queueSheets(load: Phaser.Loader.LoaderPlugin, atlas: Atlas): void {
  for (const [name, entry] of Object.entries(atlas)) {
    if (!entry.file) continue;
    load.spritesheet(name, `sprites/${entry.file}`, { frameWidth: entry.w, frameHeight: entry.h });
  }
}

export function registerAnims(anims: Phaser.Animations.AnimationManager, atlas: Atlas): void {
  for (const [name, entry] of Object.entries(atlas)) {
    if (!entry.file) continue;
    for (const [an, def] of Object.entries(entry.anims)) {
      const key = `${name}:${an}`;
      if (anims.exists(key)) continue;
      anims.create({
        key,
        frames: def.frames.map((f) => ({ key: name, frame: f })),
        frameRate: def.fps,
        repeat: -1,
      });
    }
  }
}

// Resolve a logical sprite ("bro") and a variant index to a texture key.
export function variantKey(atlas: Atlas, base: string, variant: number): string | null {
  const entry = atlas[base];
  if (!entry) return null;
  if (entry.variants && entry.variants.length > 0) return entry.variants[variant % entry.variants.length]!;
  return entry.file ? base : null;
}
