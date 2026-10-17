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
    "d": "#008456",  # grass dark
    "y": "#707070",  # path: asphalt
    "o": "#202040",  # path speck dark / rim
    "e": "#c8c8c8",  # path speck light
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


# Dots stay off the outer row/column of a tile: a dot on the edge lines up with
# its neighbor's into a dotted seam the eye reads as a grid.
INNER = range(1, 15)


def grass(seed, dots=0):
    """Grass is a dense three-tone mosaic (Owen's reference): mostly mid green, with
    light and dark pixels and short 2px runs scattered everywhere, including the
    edges. Uniform noise has no seams; a flat fill with dots has nothing but."""
    rng = random.Random(seed)
    g = grid("g")
    for y in range(16):
        x = 0
        while x < 16:
            r = rng.random()
            run = 2 if rng.random() < 0.35 else 1
            ch = "l" if r < 0.26 else ("d" if r < 0.44 else "g")
            for i in range(run):
                put(g, x + i, y, ch)
            x += run
    return g


def path(seed):
    rng = random.Random(seed)
    g = grid("y")
    for _ in range(5):
        put(g, rng.choice(INNER), rng.choice(INNER), "o")
    for _ in range(3):
        put(g, rng.choice(INNER), rng.choice(INNER), "e")
    return g


def edge(side):
    """A transparent tile with a 1px shade line on one side. Overlaid on a lane
    tile wherever it borders grass, so a path reads as one surface with a rim."""
    g = grid(".")
    for i in range(16):
        if side == "n":
            put(g, i, 0, "o")
        elif side == "s":
            put(g, i, 15, "o")
        elif side == "w":
            put(g, 0, i, "o")
        else:
            put(g, 15, i, "o")
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


def cobble(seed):
    """Cobblestones: rounded 4x4 setts in offset courses, dark joints."""
    rng = random.Random(seed)
    g = grid("o")
    for cy in range(0, 16, 4):
        off = 2 if (cy // 4) % 2 else 0
        for cx in range(-2, 16, 4):
            x0 = cx + off
            for y in range(cy, cy + 3):
                for x in range(x0, x0 + 3):
                    put(g, x, y, "y")
            put(g, x0, cy, "e" if rng.random() < 0.6 else "y")
    return g


def gate(side):
    """A real gate: cobbles underfoot, brick posts on both flanks, iron bars across
    the outer edge. `side` is the map edge the gate sits on."""
    g = cobble(3)

    def rot(x, y):
        # Draw in 'north' orientation, then rotate into place.
        if side == "n":
            return x, y
        if side == "s":
            return 15 - x, 15 - y
        if side == "w":
            return y, x
        return 15 - y, x  # e

    # Posts: 3px brick on the left and right flanks, full depth.
    for y in range(16):
        for x in list(range(0, 3)) + list(range(13, 16)):
            ch = "m" if y % 4 == 3 else ("r" if x in (0, 13) else "b")
            put(g, *rot(x, y), ch)
    # Caps on the posts at the outer edge.
    for x in list(range(0, 3)) + list(range(13, 16)):
        put(g, *rot(x, 0), "c")
    # Iron bars across the outer 6 rows between the posts, a rail along the top and bottom.
    for x in range(3, 13):
        put(g, *rot(x, 1), "n")
        put(g, *rot(x, 5), "n")
        if x % 2 == 1:
            for y in range(1, 6):
                put(g, *rot(x, y), "n")
            put(g, *rot(x, 0), "p")  # gilded finials
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
    ("grass_c", grass(3, 6)),
    ("grass_d", grass(4, 4)),
    ("path", path(1)),
    ("path_b", path(2)),
    ("path_c", path(3)),
    ("path_d", path(4)),
    ("edge_n", edge("n")),
    ("edge_e", edge("e")),
    ("edge_s", edge("s")),
    ("edge_w", edge("w")),
    ("bush_a", bush(1)),
    ("bush_b", bush(2)),
    ("bush_c", bush(3)),
    ("stone", stone()),
    ("granite", granite()),
    ("granite_window", window(granite)),
    ("brick", brick()),
    ("brick_window", window(brick)),
    ("foot", foot()),
    ("cobble", cobble(1)),
    ("gate_n", gate("n")),
    ("gate_e", gate("e")),
    ("gate_s", gate("s")),
    ("gate_w", gate("w")),
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
