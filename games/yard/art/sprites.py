# Sprites as 16x16 character grids. One character per pixel, mapped to a
# palette color per sprite. "." is transparent. This is the art test: can
# code-authored sprites in the UFO 50 palette sit next to Rock On! Island?
#
# python3 games/yard/art/sprites.py  -> art/out/test_sheet.png (4x) for judging

import os
from PIL import Image
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', 'shared', 'art'))
from palette import hex_to_rgb

OUT = os.path.join(os.path.dirname(__file__), "out")

# Shared color keys. Letters are stable across sprites so the spec is readable.
K = "#202040"  # outline (UFO 50 navy, not pure black)
S = "#feb854"  # skin
H = "#ca4a00"  # skin shadow / hair
W = "#ffffff"
R = "#e03c32"
B = "#8a6042"  # khaki
Y = "#e8ea4a"
O = "#fe7000"
C = "#c8c8c8"
G = "#707070"
P = "#fe48de"

BRO_COLORS = {"K": K, "S": S, "R": R, "W": W, "B": B, "H": H, "C": C}
BRO = [
    "................",
    ".....KKKKK......",
    "....KRRRRRKK....",
    "....KRRRRRRRK...",
    "....KSSSSSKK....",
    "....KSKSSKK.....",
    "....KSSSSSK.....",
    ".....KSSSK......",
    "...KKWWWWWKK....",
    "..KSKWWWWWKSKK..",
    "..KSKWWWWWKKRRK.",
    "...KKWWWWWK.KRK.",
    "....KBBBBBK..K..",
    "....KBBKBBK.....",
    "....KSSKSSK.....",
    "....KKK.KKK.....",
]

TOURIST_COLORS = {"K": K, "S": S, "Y": Y, "O": O, "W": W, "C": C, "G": G, "H": H}
TOURIST = [
    "................",
    "....KKKKKKK.....",
    "...KYYYYYYYK....",
    "..KYYYYYYYYYK...",
    "..KKKKKKKKKKK...",
    "....KSSSSSK.....",
    "....KSKSSKK.....",
    "....KSSSSSK.....",
    ".....KSSSK......",
    "...KKOOWOOKK....",
    "..KSKOKKKOOKSK..",
    "..KSKOKGKOWKSK..",
    "...KKOOKOOOKK...",
    "....KCCCCCK.....",
    "....KSSKSSK.....",
    "....KKK.KKK.....",
]

# Tiles are full 16x16, no transparency.
GRASS_COLORS = {"g": "#63b31d", "l": "#a4f022"}
GRASS = [
    "gggggggggggggggg",
    "gggglggggggggggg",
    "gggggggggggglggg",
    "gggggggggggggggg",
    "glgggggggggggggg",
    "gggggggglgggggggg"[:16],
    "gggggggggggggggg",
    "gggggggggggggglg",
    "gggggglggggggggg",
    "gggggggggggggggg",
    "gggggggggggggggg",
    "gglggggggggglggg",
    "gggggggggggggggg",
    "ggggggggglgggggg",
    "gggggggggggggggg",
    "gggglggggggggggg",
]

PATH_COLORS = {"y": "#e8ea4a", "d": "#a3a324"}
PATH = [
    "yyyyyyyyyyyyyyyy",
    "yyydyyyyyyyydyyy",
    "yyyyyyyyyyyyyyyy",
    "yyyyyyydyyyyyyyy",
    "yyyyyyyyyyyyyyyy",
    "ydyyyyyyyyyyyydy",
    "yyyyyyyyyyyyyyyy",
    "yyyyyyyyydyyyyyy",
    "yyyyyyyyyyyyyyyy",
    "yyyydyyyyyyyyyyy",
    "yyyyyyyyyyyydyyy",
    "yyyyyyyyyyyyyyyy",
    "yydyyyyyydyyyyyy",
    "yyyyyyyyyyyyyyyy",
    "yyyyyyyyyyyyyyyy",
    "yyyyyydyyyyyyydy",
]

TREE_COLORS = {"t": "#008456", "d": "#003d10", "h": "#58f5b1"}
TREE = [
    "ddtttddddtttdddd",
    "dthhttdddthhtddd",
    "thtttttdtttttdd",
    "ttttttttdttttttd",
    "dtttttdddttttttd",
    "ddtttdddddtttddd",
    "dddddtttddddddtt",
    "ddddthhttddddthh",
    "dddtttttttdddttt",
    "dddttttttttddttt",
    "ddddtttttttddddt",
    "dddddttttdddddtt",
    "tttddddddddtttdd",
    "thhtddddddthhttd",
    "tttttdddddtttttd",
    "dtttdddddddtttdd",
]

STONE_COLORS = {"w": "#ffffff", "c": "#c8c8c8", "g": "#63b31d", "k": "#707070"}
STONE = [
    "ggwwwggggwwwwggg",
    "gwwwwwggwwwwwwgg",
    "gwwcwwggwwwcwwgg",
    "ggwwwggggwwwwggg",
    "ggggggwwwgggggg",
    "gggggwwwwwgggggg",
    "gggggwwcwwgggggg",
    "ggggggwwwggggggg",
    "gwwwggggggwwwggg",
    "wwwwwgggggwwwwwg",
    "wwcwwgggggwwcwwg",
    "gwwwggggggwwwwgg",
    "gggggggwwwgggggg",
    "ggggggwwwwwggggg",
    "ggggggwwcwwggggg",
    "gggggggwwwgggggg",
]


def draw(img, grid, colors, ox, oy):
    px = img.load()
    for y, row in enumerate(grid):
        row = row.ljust(16, ".")[:16]
        for x, ch in enumerate(row):
            if ch == ".":
                continue
            px[ox + x, oy + y] = hex_to_rgb(colors[ch])


def main():
    os.makedirs(OUT, exist_ok=True)
    # A 6x3 tile scene: grass field, a path row, trees, stone, bro and tourist on it.
    w, h = 16 * 6, 16 * 3
    img = Image.new("RGB", (w, h))
    for ty in range(3):
        for tx in range(6):
            draw(img, GRASS, GRASS_COLORS, tx * 16, ty * 16)
    for tx in range(6):
        draw(img, PATH, PATH_COLORS, tx * 16, 16)
    draw(img, TREE, TREE_COLORS, 0, 0)
    draw(img, TREE, TREE_COLORS, 16, 0)
    draw(img, STONE, STONE_COLORS, 80, 32)
    draw(img, BRO, BRO_COLORS, 32, 16)
    draw(img, TOURIST, TOURIST_COLORS, 64, 16)
    img.resize((w * 4, h * 4), Image.NEAREST).save(os.path.join(OUT, "test_sheet.png"))

    # Also save each sprite alone at 1x for the spec.
    for name, grid, colors in [("bro", BRO, BRO_COLORS), ("tourist", TOURIST, TOURIST_COLORS)]:
        s = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
        px = s.load()
        for y, row in enumerate(grid):
            for x, ch in enumerate(row.ljust(16, ".")[:16]):
                if ch != ".":
                    px[x, y] = hex_to_rgb(colors[ch]) + (255,)
        s.save(os.path.join(OUT, f"{name}.png"))
    print("wrote", OUT)


if __name__ == "__main__":
    main()
