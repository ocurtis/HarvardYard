# Sprite spec

Every pixel in the game follows this. Agents and humans alike.

## Format
- Tiles are 16x16. Characters are 16x16 unless the spec says otherwise (the statue is 32x32).
- Palette: the 32 UFO 50 colors in `palette.py`, nothing else. No alpha except fully transparent.
- No anti-aliasing, no dithering except deliberate 2-color checker on large flat areas.
- Anchor: bottom-center of the cell. Feet sit on the bottom row (row 15) or one above it.
- Characters never fill the full 16 width. 10-12 px wide at the shoulders leaves room for arm frames.

## Style (the Rock On! Island contract)
- Big heads: head is ~6-7 px tall of a 16 px character, with a 1-2 px neck or none.
- Outlines: a dark outline (#202040 navy, or the fill's darkest shade) on the silhouette only.
  Interior edges get a shade change, not a line. Never a pure black ring around everything.
- Shading: flat fill plus one shade step on the lower/left side. No gradients, no three-step ramps on
  something 16 px tall.
- Faces: two 1px eyes, a 1px mouth if any. Expression comes from eyebrows and mouth width.
- Readability over detail. If a feature isn't visible at 1x on the grass tile, cut it.

## Sprite file format (`art/sprites/<name>.txt`)
```
# name: bro
# size: 16x16
# K=#202040 S=#feb854 W=#ffffff B=#8a6042 R=#e03c32 H=#ca4a00
# anim walk: 0 1 2 3 @8      (frame indices, @ frames-per-second)
# anim idle: 0
# frame 0
................
....KKKKKK......
(16 rows)
# frame 1
...
```
`.` is transparent. One character per pixel. Palette keys are per-file. Frames are listed in order;
`anim` lines name sequences by frame index. `art/build.py` compiles every file to a PNG strip in
`public/sprites/` and writes `public/sprites/atlas.json`.

## Asset list, in build order
| asset | size | animations | notes |
|---|---|---|---|
| bro | 16x16 | walk 4, windup 2, piss 2 (loop), stagger 1, sober 2 | the golden sprite; everything else matches him |
| tourist | 16x16 | walk 4, confused 2, brochure-walk 4 | blazer, khakis, rep tie; brochure visible in hand |
| player | 16x16 | walk 4, shout 2 | placeholder "student"; final character undecided |
| statue | 32x32 | clean, wet-1, wet-2, wrecked | seated bronze on plinth, gold toe; foot tile is the front-left cell |
| dig | 16x16 | idle 2, throw 2 | a pit with a student in it; bones fly from the throw frame |
| sprinkler | 16x16 | spin 3 | |
| bone | 8x8 | spin 2 | projectile |
| stream | 8x8 | 2 | the piss arc segment, tiled along the arc |
| tiles | 16x16 | grass a, grass b, path, path-edge, bush a/b/c, stone, granite-wall, window, brick-wall | |
| hud | n/a | | pixel font, HP heart, coin, wave digits |
| vfx | 8x8 | hit flash 2, coin pop 3, stagger stars 2 | |

## Review
Every candidate is judged on the `sprites.html` page at 4x, on the grass tile, animated, next to
the Rock On! reference. Stills lie about motion. The questions, in order:
1. Does it read at 1x? (Is it obviously a bro / a tourist / a statue from across the map?)
2. Does the silhouette hold across frames? (Volume doesn't swim; the head doesn't change size.)
3. Does it match the contract above and the other approved sprites?
4. Is it funny?
