#!/usr/bin/env python3
"""Cartridge cover art for the collection menu, composed from the game's own
sprites so it can't drift from the game: 64x48, grass, the statue, the ghost
preaching at a bro. -> public/covers/yard.png

  python3 art/gen_cover.py
"""
import json
import os

from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
SPR = os.path.join(ROOT, "public", "sprites")
OUT = os.path.join(ROOT, "public", "covers")
W, H = 64, 48


def frame(sheet, fw, fh, i):
    im = Image.open(os.path.join(SPR, sheet)).convert("RGBA")
    return im.crop((i * fw, 0, (i + 1) * fw, fh))


if __name__ == "__main__":
    atlas = json.load(open(os.path.join(SPR, "atlas.json")))
    os.makedirs(OUT, exist_ok=True)
    cover = Image.new("RGBA", (W, H), (0, 0, 0, 255))
    # Grass, with the four variants scattered.
    grass = [frame("tiles.png", 16, 16, i) for i in range(4)]
    for y in range(0, H, 16):
        for x in range(0, W, 16):
            cover.alpha_composite(grass[(x // 16 + y // 16 * 3) % 4], (x, y))
    # A path row across the bottom third, with the grass lip over it.
    path = frame("tiles.png", 16, 16, 4)
    edge_n = frame("tiles.png", 16, 16, 8)
    for x in range(0, W, 16):
        cover.alpha_composite(path, (x, 32))
        cover.alpha_composite(edge_n, (x, 32))
    # The statue, centered, feet on the path.
    statue = frame("statue.png", 32, 32, 0)
    cover.alpha_composite(statue, (16, 10))
    # The ghost preaching (shout frame) at a bro walking in from the right.
    player = frame("player.png", 16, 24, atlas["player"]["anims"]["shout"]["frames"][0])
    cover.alpha_composite(player, (2, 22))
    bro = frame("bro_v00.png", 16, 24, atlas["bro_v00"]["anims"]["walk"]["frames"][0]).transpose(Image.FLIP_LEFT_RIGHT)
    cover.alpha_composite(bro, (46, 22))
    cover.save(os.path.join(OUT, "yard.png"))
    print("cover: yard.png", cover.size)
