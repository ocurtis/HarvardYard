#!/usr/bin/env node
// Stamp a new game from games/_template:  npm run new-game -- <slug> "<Title>"
// Then add it to the GAMES list in index.html and write games/<slug>/DESIGN.md.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [slug, title] = process.argv.slice(2);
if (!slug || !/^[a-z][a-z0-9-]*$/.test(slug) || !title) {
  console.error('usage: npm run new-game -- <slug> "<Title>"   (slug: lowercase letters, digits, dashes)');
  process.exit(1);
}
const dst = join('games', slug);
if (existsSync(dst)) {
  console.error(`${dst} already exists`);
  process.exit(1);
}
cpSync(join('games', '_template'), dst, { recursive: true });
const fill = (s) => s.replaceAll('__SLUG__', slug).replaceAll('__TITLE_UPPER__', title.toUpperCase()).replaceAll('__TITLE__', title).replaceAll('__DATE__', new Date().toISOString().slice(0, 10));
const walk = (dir) => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(ts|html|md)$/.test(f)) writeFileSync(p, fill(readFileSync(p, 'utf8')));
  }
};
walk(dst);
mkdirSync(join('public', slug, 'sprites'), { recursive: true });
writeFileSync(join('public', slug, 'sprites', 'atlas.json'), '{}\n');
console.log(`games/${slug} stamped from the template.
Next:
  1. Add it to GAMES in index.html: { title: '${title.toUpperCase()}', blurb: '...', cover: 'covers/${slug}.png', play: 'games/${slug}/play.html', manual: 'games/${slug}/index.html' }
  2. Write games/${slug}/DESIGN.md (pitch, pillars, build order) before any code.
  3. npm run dev, open /games/${slug}/play.html; npm test runs its tests.
  4. Sprites: games/${slug}/art/sprites/*.txt, then npm run art ${slug}. Voice: /booth.html?game=${slug}.`);
