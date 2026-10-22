#!/usr/bin/env python3
"""The painted stage-select map, Mega Man X style: a 168x168 landscape of Harvard
Square in the UFO 50 palette. Not a street map: the Yard in the middle, the
Common and Garden St up-left, Mass Ave running down-right, the Square's plaza
down-left, the Charles along the bottom with a bridge. The base sprites are
placed on it by the game (STAGES[].map). -> public/robo/map.png

  python3 games/robo/art/gen_map.py
"""
import os
import random

from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(__file__), "..", "..", "..", "public", "robo", "map.png")
S = 168
K = S / 128.0  # the layout below was drawn at 128; scale it
P = {
    "grass": (99, 179, 29), "grass2": (164, 240, 34), "grassD": (0, 132, 86), "forest": (0, 61, 16),
    "road": (112, 112, 112), "roadL": (200, 200, 200), "roadD": (32, 32, 64),
    "water": (0, 106, 180), "waterL": (39, 186, 219), "waterD": (32, 32, 64),
    "sand": (254, 184, 84), "brick": (153, 21, 21), "brickD": (76, 0, 0), "stone": (200, 200, 200), "stoneD": (112, 112, 112),
    "black": (0, 0, 0), "trunk": (76, 0, 0), "plaza": (164, 128, 128), "plazaD": (120, 52, 80),
}


def main():
    rng = random.Random(7)
    im = Image.new("RGBA", (S, S), P["grass"] + (255,))
    d = ImageDraw.Draw(im)
    px = im.load()

    # Grass texture: scattered lighter and darker flecks, a few checker patches.
    for _ in range(int(900 * K * K)):
        x, y = rng.randrange(S), rng.randrange(S)
        px[x, y] = P["grass2"] + (255,) if rng.random() < 0.6 else P["grassD"] + (255,)

    # The river along the bottom, a gentle curve, with wave rows.
    for x in range(S):
        top = int(104 * K) + int(4 * __import__("math").sin(x / (17.0 * K))) + int((x / K) // 32)
        for y in range(top, S):
            px[x, y] = P["water"] + (255,)
        px[x, top] = P["sand"] + (255,)
        if (x + top) % 9 in (0, 1, 2) and top + 4 < S:
            px[x, top + 4] = P["waterL"] + (255,)
        if (x + top) % 11 in (5, 6) and top + 11 < S:
            px[x, top + 11] = P["waterL"] + (255,)
    # A bridge (the Anderson Bridge) down from the Square.
    bx = int(38 * K)
    d.rectangle((bx, int(100 * K), bx + 8, S - 1), fill=P["stoneD"])
    d.rectangle((bx + 1, int(100 * K), bx + 7, S - 1), fill=P["stone"])
    for y in range(int(102 * K), S - 1, 6):
        d.line((bx, y, bx + 8, y), fill=P["stoneD"])

    # Mass Ave: from the Square (down-left) past the Yard's south edge and off down-right.
    road = [(int(20*K), int(96*K)), (int(40*K), int(92*K)), (int(62*K), int(86*K)), (int(84*K), int(88*K)), (int(104*K), int(96*K)), (int(127*K), int(104*K))]
    d.line(road, fill=P["roadD"], width=5)
    d.line(road, fill=P["road"], width=3)
    # Mass Ave north / Garden St: up and to the left from the Square, past the Common.
    road2 = [(int(32*K), int(94*K)), (int(28*K), int(70*K)), (int(20*K), int(46*K)), (int(10*K), int(20*K)), (int(4*K), int(0*K))]
    d.line(road2, fill=P["roadD"], width=4)
    d.line(road2, fill=P["road"], width=2)
    # Cambridge St / Kirkland: across the top of the Yard to the right.
    road3 = [(int(30*K), int(52*K)), (int(56*K), int(50*K)), (int(84*K), int(52*K)), (int(112*K), int(48*K)), (int(127*K), int(44*K))]
    d.line(road3, fill=P["roadD"], width=4)
    d.line(road3, fill=P["road"], width=2)
    # Oxford St north from the Science Center.
    d.line([(int(60*K), int(50*K)), (int(62*K), int(20*K)), (int(64*K), int(0*K))], fill=P["roadD"], width=3)
    d.line([(int(60*K), int(50*K)), (int(62*K), int(20*K)), (int(64*K), int(0*K))], fill=P["road"], width=1)
    # Quincy St east of the Yard.
    d.line([(int(90*K), int(54*K)), (int(92*K), int(86*K))], fill=P["roadD"], width=3)
    d.line([(int(90*K), int(54*K)), (int(92*K), int(86*K))], fill=P["road"], width=1)
    # Dashes on Mass Ave.
    for i in range(0, len(road) - 1):
        (x1, y1), (x2, y2) = road[i], road[i + 1]
        for t in range(0, 10, 3):
            x = int(x1 + (x2 - x1) * t / 10)
            y = int(y1 + (y2 - y1) * t / 10)
            px[x, y] = P["roadL"] + (255,)

    # The Yard: a slightly lighter, tidier green with paths, trees around the edge.
    yard = [(int(38*K), int(56*K)), (int(88*K), int(56*K)), (int(90*K), int(84*K)), (int(36*K), int(84*K))]
    d.polygon(yard, fill=P["grass"])
    d.line([(int(40*K), int(70*K)), (int(88*K), int(70*K))], fill=P["sand"], width=1)
    d.line([(int(64*K), int(58*K)), (int(64*K), int(82*K))], fill=P["sand"], width=1)
    d.line([(int(40*K), int(58*K)), (int(88*K), int(82*K))], fill=P["sand"], width=1)
    d.line([(int(88*K), int(58*K)), (int(40*K), int(82*K))], fill=P["sand"], width=1)

    # The Common: a darker green wedge up-left, with trees.
    d.polygon([(int(8*K), int(40*K)), (int(26*K), int(46*K)), (int(34*K), int(62*K)), (int(10*K), int(66*K))], fill=P["grassD"])

    # The Square's plaza, bottom-left: brick-red paving with the T entrance.
    d.polygon([(int(18*K), int(88*K)), (int(36*K), int(86*K)), (int(38*K), int(98*K)), (int(20*K), int(100*K))], fill=P["plaza"])
    for y in range(int(87*K), int(99*K), 2):
        d.line((int(19*K) + (y % 4) // 2, y, int(37*K), y), fill=P["plazaD"])
    d.rectangle((int(26*K), int(90*K), int(30*K), int(93*K)), fill=P["brick"], outline=P["black"])

    # Trees: round canopies with a dark lower half and a trunk pixel.
    def tree(x, y, r=3):
        d.ellipse((x - r, y - r, x + r, y + r), fill=P["forest"])
        d.ellipse((x - r, y - r, x + r, y + r - 1), fill=P["grassD"])
        d.ellipse((x - r + 1, y - r, x + r - 1, y), fill=P["grass2"])
        px[x, y + r] = P["trunk"] + (255,)

    for (x, y) in [(42, 60), (50, 59), (78, 60), (86, 60), (41, 80), (49, 81), (80, 81), (87, 79), (12, 44), (18, 50), (16, 58), (26, 54)]:
        tree(int(x * K), int(y * K))
    for _ in range(40):
        x, y = rng.randrange(2, S - 2), rng.randrange(2, int(96 * K))
        if 36 * K <= x <= 92 * K and 54 * K <= y <= 86 * K:
            continue  # keep the Yard clear for the bases
        if y > 84 * K and 14 * K <= x <= 48 * K:
            continue  # the Square
        tree(x, y, rng.choice((2, 3)))

    # A few background buildings as small brick blocks so the city reads (no landmarks: the bases do that).
    for (x, y, w, h) in [(8, 76, 8, 6), (98, 70, 8, 6), (112, 60, 10, 6), (6, 10, 8, 7), (100, 12, 8, 6), (116, 80, 8, 5), (46, 96, 7, 5), (70, 98, 8, 5)]:
        x, y = int(x * K), int(y * K)
        d.rectangle((x, y, x + w, y + h), fill=P["brick"], outline=P["black"])
        d.line((x + 1, y + h - 1, x + w - 1, y + h - 1), fill=P["brickD"])
        for wx in range(x + 2, x + w - 1, 3):
            px[wx, y + 2] = P["sand"] + (255,)

    # Frame edge: a 1px dark border so the map sits in its bezel.
    d.rectangle((0, 0, S - 1, S - 1), outline=P["roadD"])
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    im.save(OUT)
    print("map:", OUT, im.size)


if __name__ == "__main__":
    main()
