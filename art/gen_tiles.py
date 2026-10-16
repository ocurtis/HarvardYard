#!/usr/bin/env python3
"""Writes art/sprites/tiles.txt: the ground and wall tiles, 16x16, as named frames.

Patterns are generated so the three bush variants, the two grasses, and the
brick/granite courses share one hand. Edit here, not in tiles.txt.
"""
import os
import random

OUT = os.path.join(os.path.dirname(__file__), "sprites", "tiles.txt")

KEY = {
    "g": "#63b31d",  # grass
    "l": "#a4f022",  # grass light dot
    "d": "#008456",  # grass dark dot
    "y": "#e8ea4a",  # path
    "o": "#a3a324",  # path dot
    "t": "#008456",  # bush
    "k": "#003d10",  # bush dark
    "h": "#58f5b1",  # bush highlight
    "w": "#ffffff",  # stone light
    "c": "#c8c8c8",  # stone / granite
    "s": "#707070",  # granite shade
    "n": "#202040",  # outline / window frame
    "b": "#991515",  # brick
    "r": "#ca4a00",  # brick light
    "m": "#4c0000",  # mortar / brick dark
    "p": "#e8ea4a",  # gold (foot)
    "q": "#a3a324",  # gold shade
    "f": "#fe48de",  # flag pink (guide tile marker)
    "u": "#4430ba",  # exit arrow
}


def grid(fill):
    return [[fill] * 16 for _ in range(16)]


def put(g, x, y, ch):
    if 0 <= x < 16 and 0 <= y < 16:
        g[y][x] = ch


def grass(seed, dots):
    rng = random.Random(seed)
    g = grid("g")
    for _ in range(dots):
        x, y = rng.randrange(16), rng.randrange(16)
        put(g, x, y, "l")
        if rng.random() < 0.35:
            put(g, x + 1, y, "l")
    for _ in range(2):
        put(g, rng.randrange(16), rng.randrange(16), "d")
    return g


def path(seed):
    rng = random.Random(seed)
    g = grid("y")
    for _ in range(9):
        put(g, rng.randrange(16), rng.randrange(16), "o")
    return g


def bush(seed):
    rng = random.Random(seed)
    g = grid("k")
    # Three or four round blobs with a highlight on the upper-left of each.
    blobs = [(4, 4, 4), (11, 5, 4), (7, 11, 4), (13, 12, 3)] if seed % 2 else [(5, 5, 5), (12, 4, 3), (9, 11, 4), (3, 12, 3)]
    for cx, cy, r in blobs:
        for y in range(16):
            for x in range(16):
                if (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
                    put(g, x, y, "t")
        for y in range(16):
            for x in range(16):
                if (x - cx + 1) ** 2 + (y - cy + 1) ** 2 <= (r - 2) ** 2 and (x - cx + 1) ** 2 + (y - cy + 1) ** 2 >= (r - 3) ** 2 and x < cx and y < cy:
                    put(g, x, y, "h")
    for _ in range(3):
        put(g, rng.randrange(16), rng.randrange(16), "k")
    return g


def stone():
    g = grid("g")
    for cx, cy, r in [(4, 3, 3), (11, 4, 3), (7, 10, 3), (13, 12, 2)]:
        for y in range(16):
            for x in range(16):
                if (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
                    put(g, x, y, "w" if (x - cx) + (y - cy) < 1 else "c")
    return g


def granite():
    g = grid("c")
    for y in range(16):
        for x in range(16):
            course = y // 4
            if y % 4 == 3:
                put(g, x, y, "s")
            elif (x + (course % 2) * 4) % 8 == 7:
                put(g, x, y, "s")
    return g


def window(base):
    g = base()
    # A tall two-pane window with a navy frame and a dark glass.
    for y in range(2, 14):
        for x in range(4, 12):
            put(g, x, y, "n" if x in (4, 11) or y in (2, 13) or x == 7 or y == 8 else "s")
    put(g, 5, 3, "c")
    put(g, 8, 3, "c")
    return g


def brick():
    g = grid("b")
    for y in range(16):
        for x in range(16):
            course = y // 3
            if y % 3 == 2:
                put(g, x, y, "m")
            elif (x + (course % 2) * 3) % 6 == 5:
                put(g, x, y, "m")
            elif y % 3 == 0 and (x + course) % 6 == 1:
                put(g, x, y, "r")
    return g


def foot():
    g = path(7)
    # A worn gold patch where everyone rubs the toe.
    for cx, cy, r in [(8, 8, 4)]:
        for y in range(16):
            for x in range(16):
                dd = (x - cx) ** 2 + (y - cy) ** 2
                if dd <= r * r:
                    put(g, x, y, "p" if dd <= (r - 2) ** 2 else "q")
    return g


def gate():
    g = path(3)
    for x in range(16):
        put(g, x, 0, "s")
        put(g, x, 15, "s")
    return g


def exit_tile():
    g = path(5)
    for i in range(4):
        put(g, 8, 10 + i, "u")
        put(g, 7, 10 + i, "u")
    for i in range(3):
        put(g, 5 + i, 10 - i, "u")
        put(g, 10 - i, 10 - i, "u")
    return g


def guide_tile():
    g = path(9)
    for y in range(3, 13):
        put(g, 7, y, "n")
    for y in range(3, 8):
        for x in range(8, 13 - (y - 3)):
            put(g, x, y, "f")
    return g


TILES = [
    ("grass_a", grass(1, 6)),
    ("grass_b", grass(2, 5)),
    ("path", path(1)),
    ("bush_a", bush(1)),
    ("bush_b", bush(2)),
    ("bush_c", bush(3)),
    ("stone", stone()),
    ("granite", granite()),
    ("granite_window", window(granite)),
    ("brick", brick()),
    ("brick_window", window(brick)),
    ("foot", foot()),
    ("gate", gate()),
    ("exit", exit_tile()),
    ("guide", guide_tile()),
]


def main():
    lines = ["# name: tiles", "# size: 16x16", "# " + " ".join(f"{k}={v}" for k, v in KEY.items())]
    for i, (name, _) in enumerate(TILES):
        lines.append(f"# anim {name}: {i}")
    for name, g in TILES:
        lines.append(f"# frame ({name})")
        lines.extend("".join(row) for row in g)
    with open(OUT, "w") as f:
        f.write("\n".join(lines) + "\n")
    print("wrote", OUT, len(TILES), "tiles")


if __name__ == "__main__":
    main()
