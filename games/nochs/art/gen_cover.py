#!/usr/bin/env python3
"""Cartridge cover for the menu: 64x48, drawn from the game's placeholder look
(chalkboard, steel shelf, stone counter, a box being packed). -> public/covers/nochs.png

  python3 games/nochs/art/gen_cover.py
"""
import os
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(__file__), "..", "..", "..", "public", "covers", "nochs.png")
P = {"forest": (0,61,16), "steel": (200,200,200), "grey": (112,112,112), "counter": (138,96,66), "rose": (164,128,128),
     "skin": (254,184,84), "rust": (202,74,0), "maroon": (76,0,0), "red": (224,60,50), "green": (99,179,29), "white": (255,255,255), "gold": (232,234,74), "black": (0,0,0)}

if __name__ == "__main__":
    im = Image.new("RGBA", (64, 48), P["forest"] + (255,))
    d = ImageDraw.Draw(im)
    # chalk scribbles on the board
    for y, w, c in ((4, 30, P["white"]), (8, 22, P["gold"]), (12, 26, P["white"]), (16, 18, P["red"])):
        d.line((4, y, 4 + w, y), fill=c)
    # the Slices sign: red/white/green stripes
    d.rectangle((40, 3, 60, 13), fill=P["white"], outline=P["black"])
    d.rectangle((41, 4, 46, 12), fill=P["green"]); d.rectangle((54, 4, 59, 12), fill=P["red"])
    # steel shelf with squares coming along it
    d.rectangle((0, 20, 63, 29), fill=P["steel"]); d.line((0, 29, 63, 29), fill=P["grey"])
    for i, c in enumerate((P["skin"], P["rust"], P["red"], P["green"], P["skin"])):
        x = 4 + i * 9
        d.rectangle((x, 21, x + 6, 27), fill=c); d.line((x, 27, x + 6, 27), fill=P["rust"])
    # stone counter, speckled
    d.rectangle((0, 30, 63, 47), fill=P["counter"])
    for x, y in ((3, 33), (11, 41), (20, 45), (30, 34), (44, 44), (55, 36), (60, 42), (37, 40)):
        d.point((x, y), P["rose"])
    # a box being packed: cardboard frame, 2x2, three in, one open
    bx, by = 22, 31
    d.rectangle((bx - 2, by - 2, bx + 15, by + 15), fill=P["skin"], outline=P["rust"])
    d.rectangle((bx, by, bx + 13, by + 13), fill=P["maroon"])
    for i, c in enumerate((P["skin"], P["skin"], P["rust"], None)):
        x = bx + (i % 2) * 7; y = by + (i // 2) * 7
        if c: d.rectangle((x, y, x + 5, y + 5), fill=c)
    d.rectangle((bx + 7, by + 7, bx + 12, by + 12), outline=P["gold"])
    # the red cap guy's hand (a spatula tip) at the right
    d.rectangle((46, 36, 56, 39), fill=P["steel"], outline=P["black"]); d.rectangle((56, 34, 60, 41), fill=P["rust"])
    im.save(OUT)
    print("cover: nochs.png", im.size)
