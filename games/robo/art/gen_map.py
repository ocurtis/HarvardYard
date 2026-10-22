#!/usr/bin/env python3
"""The painted stage-select map, Mega Man X style: a 168x168 landscape of Harvard
Square in the UFO 50 palette. Not a street map: the Yard in the middle with the
dig painted into it, the Common and Garden St up-left, Mass Ave running along the
south, the Square's plaza down-left, the Charles along the bottom with a bridge.
The base sprites are placed on it by the game (STAGES[].map, bottom-center); their
drop shadows are painted here. -> public/robo/map.png

  python3 games/robo/art/gen_map.py
"""
import math
import os
import random
import re
import sys

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..", "..", "..")
OUT = os.path.join(ROOT, "public", "robo", "map.png")
GAME_TS = os.path.join(HERE, "..", "src", "config", "game.ts")
SPRITES = os.path.join(ROOT, "public", "robo", "sprites")
sys.path.insert(0, os.path.join(ROOT, "shared", "art"))
from palette import RGB as PALETTE, hex_to_rgb  # noqa: E402

S = 168
K = S / 128.0  # the layout below was drawn at 128; scale it
BASE_W, BASE_H = 48, 40  # a base sprite's frame; its feet sit at STAGES[].map

HEX = {
    "grass": "#63b31d", "grass2": "#a4f022", "grassD": "#008456", "forest": "#003d10",
    "road": "#707070", "roadL": "#c8c8c8", "roadD": "#202040",
    "water": "#006ab4", "waterL": "#27badb", "waterD": "#202040",
    "sand": "#feb854", "clay": "#ca4a00", "reed": "#a3a324",
    "brick": "#991515", "brickD": "#4c0000", "stone": "#c8c8c8", "stoneD": "#707070",
    "black": "#000000", "earth": "#8a6042", "plaza": "#a48080", "plazaD": "#783450",
    "deep": "#340058", "lamp": "#e8ea4a", "bronze": "#a3a324", "tee": "#e03c32",
}
P = {k: hex_to_rgb(v) for k, v in HEX.items()}
GRASSY = {P["grass"], P["grass2"], P["grassD"], P["plaza"], P["plazaD"]}  # what a shadow may fall on


def kx(v):
    return int(v * K)


def stage_feet():
    """STAGES[].map from game.ts (id -> (x, y)); the shadows must follow the sprites."""
    feet = {"science": (64, 56), "annenberg": (134, 58), "kong": (138, 120), "felipes": (34, 122)}
    try:
        src = open(GAME_TS).read()
        for m in re.finditer(r"id:\s*'(\w+)'.*?map:\s*\{\s*x:\s*(\d+),\s*y:\s*(\d+)\s*\}", src):
            if m.group(1) in feet:
                feet[m.group(1)] = (int(m.group(2)), int(m.group(3)))
    except OSError:
        pass
    return feet


def footprint(stage_id):
    """Opaque x-extent of the sprite's bottom rows (frame 0), local to the 48-wide frame."""
    try:
        im = Image.open(os.path.join(SPRITES, f"base_{stage_id}.png")).convert("RGBA")
        bb = im.split()[3].crop((0, BASE_H - 10, BASE_W, BASE_H)).getbbox()
        if bb:
            return bb[0], bb[2] - 1
    except OSError:
        pass
    return 0, BASE_W - 1


def main():
    rng = random.Random(7)
    im = Image.new("RGBA", (S, S), P["grass"] + (255,))
    d = ImageDraw.Draw(im)
    px = im.load()

    def put(x, y, c):
        if 0 <= x < S and 0 <= y < S:
            px[x, y] = c + (255,)

    def get(x, y):
        if 0 <= x < S and 0 <= y < S:
            return px[x, y][:3]
        return None

    # ---------------------------------------------------------------- grass
    # Clustered patches instead of single flecks, and a few soft light regions so
    # the field has light and dark areas.
    for (ex, ey, ew, eh) in [(30, 12, 14, 8), (24, 28, 10, 6), (60, 8, 12, 6), (100, 8, 10, 6),
                             (104, 36, 10, 8), (124, 72, 14, 8), (150, 72, 12, 6)]:
        for y in range(ey - eh // 2, ey + eh // 2 + 1):
            for x in range(ex - ew // 2, ex + ew // 2 + 1):
                nx, ny = (x - ex) / (ew / 2.0), (y - ey) / (eh / 2.0)
                r2 = nx * nx + ny * ny
                if r2 <= 0.55 or (r2 <= 1.0 and (x + y) % 2 == 0):
                    put(x, y, P["grass2"])
    for _ in range(500):
        x, y = rng.randrange(S - 1), rng.randrange(S - 1)
        for dx in (0, 1):
            for dy in (0, 1):
                put(x + dx, y + dy, P["grass2"])
    for _ in range(120):
        x, y = rng.randrange(S - 1), rng.randrange(S)
        put(x, y, P["grassD"])
        put(x + 1, y, P["grassD"])

    # ---------------------------------------------------------------- the Common
    # A darker green up-left with ragged edges, dapples, a path, an obelisk.
    common = [(16, 40), (38, 44), (42, 60), (18, 64)]
    def poly_row(poly, y):
        xs = []
        n = len(poly)
        for i in range(n):
            (x1, y1), (x2, y2) = poly[i], poly[(i + 1) % n]
            if (y1 <= y < y2) or (y2 <= y < y1):
                xs.append(x1 + (x2 - x1) * (y - y1) / float(y2 - y1))
        return sorted(xs)
    for y in range(40, 65):
        xs = poly_row(common, y)
        if len(xs) >= 2:
            x0 = int(xs[0]) + rng.randint(-2, 1)
            x1 = int(xs[-1]) + rng.randint(-1, 2)
            for x in range(x0, x1 + 1):
                put(x, y, P["grassD"])
    for (dx, dy) in [(20, 46), (24, 52), (34, 46), (38, 54), (22, 58), (32, 61), (36, 49)]:
        d.rectangle((dx, dy, dx + 1, dy + 1), fill=P["forest"])
    d.line([(17, 60), (26, 55), (35, 56), (41, 50)], fill=P["sand"], width=1)
    d.rectangle((29, 50, 31, 54), fill=P["stone"])  # the obelisk
    put(31, 54, P["stoneD"])
    put(30, 54, P["stoneD"])

    # ---------------------------------------------------------------- the plaza
    # The Square, bottom-left: a checker of paving under Felipe's, with the T kiosk.
    plaza = [(8, 113), (50, 113), (58, 118), (68, 121), (70, 127), (8, 127)]
    for y in range(113, 128):
        xs = poly_row(plaza, y)
        if len(xs) >= 2:
            for x in range(int(xs[0]), int(xs[-1]) + 1):
                put(x, y, P["plaza"] if ((x // 2) + (y // 2)) % 2 == 0 else P["plazaD"])
    d.rectangle((60, 121, 66, 125), fill=P["stone"])  # the T kiosk
    d.rectangle((62, 119, 64, 120), fill=P["tee"])

    # ---------------------------------------------------------------- the river
    def bank_y(x):
        return 138 + int(round(2 * math.sin(x / 14.0))) + int(4 * x / float(S - 1))
    for x in range(S):
        top = bank_y(x)
        for y in range(top + 2, S):
            put(x, y, P["water"])
        put(x, top, P["sand"])
        put(x, top + 1, P["clay"])
    for (rx0, rw) in [(14, 5), (78, 4), (118, 6), (152, 4)]:  # reedy breaks in the bank
        for x in range(rx0, rx0 + rw):
            put(x, bank_y(x), P["reed"])
            put(x, bank_y(x) + 1, P["reed"])
    for _ in range(30):  # ripples near the bank
        x = rng.randrange(0, S - 4)
        y = bank_y(x) + 2 + rng.choice((1, 2, 2, 3, 4, 5, 6, 7))
        for i in range(rng.choice((3, 4))):
            put(x + i, y, P["waterL"])
    for _ in range(12):  # troughs further out
        x = rng.randrange(0, S - 2)
        y = bank_y(x) + 2 + rng.randrange(8, 24)
        put(x, y, P["waterD"])
        put(x + 1, y, P["waterD"])

    # ---------------------------------------------------------------- roads
    def paint_road(pts, hw, dashes=False):
        """A ribbon: light top edge, grey body, dark bottom edge, a shadow right/below."""
        segs = []
        for i in range(len(pts) - 1):
            (ax, ay), (bx, by) = pts[i], pts[i + 1]
            dx, dy = bx - ax, by - ay
            L = math.hypot(dx, dy)
            nx, ny = -dy / L, dx / L
            if ny > 0 or (ny == 0 and nx > 0):
                nx, ny = -nx, -ny  # normal points up (or left for a vertical)
            segs.append((ax, ay, bx, by, dx, dy, L, nx, ny))
        mask = {}
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        for y in range(int(min(ys) - hw - 2), int(max(ys) + hw + 3)):
            for x in range(int(min(xs) - hw - 2), int(max(xs) + hw + 3)):
                best = None
                for (ax, ay, bx, by, dx, dy, L, nx, ny) in segs:
                    t = ((x - ax) * dx + (y - ay) * dy) / (L * L)
                    t = max(0.0, min(1.0, t))
                    cx_, cy_ = ax + dx * t, ay + dy * t
                    dist = math.hypot(x - cx_, y - cy_)
                    if best is None or dist < best[0]:
                        best = (dist, (x - ax) * nx + (y - ay) * ny)
                if best and best[0] <= hw:
                    mask[(x, y)] = best
        for (x, y) in mask:
            for (sx, sy) in ((x + 1, y), (x, y + 1)):
                if (sx, sy) not in mask and get(sx, sy) in GRASSY:
                    put(sx, sy, P["forest"])
        for (x, y), (dist, side) in mask.items():
            c = P["road"]
            if dist > hw - 1.0:
                c = P["roadL"] if side > 0 else P["roadD"]
            put(x, y, c)
        if dashes:
            walked = 0.0
            for (ax, ay, bx, by, dx, dy, L, nx, ny) in segs:
                n = int(L)
                for i in range(n):
                    if int(walked) % 6 < 2:
                        put(int(round(ax + dx * i / L)), int(round(ay + dy * i / L)), P["roadL"])
                    walked += 1

    garden = [(10.5, 130.5), (10.5, 104.5), (12.5, 74.5), (15.5, 44.5), (12.5, 18.5), (9.5, -1)]
    cambridge = [(13.5, 69.5), (40.5, 66.5), (73.5, 62.5), (110.5, 65.5), (147.5, 63.5), (S, 61.5)]
    oxford = [(94.5, 62.5), (95.5, 30.5), (97.5, -1)]
    massave = [(-1, 130), (30, 130), (55, 131), (84, 124), (112, 125), (S, 127)]
    paint_road(garden, 1.6)
    paint_road(cambridge, 1.6)
    paint_road(oxford, 1.6)
    paint_road(massave, 3.0, dashes=True)

    # The bridge (the Anderson Bridge) down from the Square, meeting Mass Ave.
    bx0, bx1 = 50, 59
    by0 = 128
    d.rectangle((bx0, by0, bx1, S - 1), fill=P["stone"])
    d.line((bx0, by0, bx0, S - 1), fill=P["stoneD"])
    d.line((bx1, by0, bx1, S - 1), fill=P["stoneD"])
    d.line((bx0 - 1, by0, bx0 - 1, S - 1), fill=P["black"])  # railings
    d.line((bx1 + 1, by0, bx1 + 1, S - 1), fill=P["black"])
    wl = bank_y((bx0 + bx1) // 2)
    d.rectangle((bx0, wl + 1, bx0 + 1, wl + 6), fill=P["stoneD"])  # piers
    d.rectangle((bx1 - 1, wl + 1, bx1, wl + 6), fill=P["stoneD"])
    for y in range(wl + 2, wl + 6):  # the arch between them, a half-ellipse
        for x in range(bx0 + 2, bx1 - 1):
            nx, ny = (x - (bx0 + bx1) / 2.0) / 3.5, (y - (wl + 6)) / 4.0
            if nx * nx + ny * ny <= 1.0:
                put(x, y, P["waterD"])

    # ---------------------------------------------------------------- base shadows
    # A drop shadow along the right and bottom of each base's footprint.
    for sid, (fx, fy) in stage_feet().items():
        if sid == "yard":
            continue
        lx0, lx1 = footprint(sid)
        x0, x1 = fx - BASE_W // 2 + lx0, fx - BASE_W // 2 + lx1
        y0, y1 = fy - BASE_H, fy - 1
        for y in range(y0 + 4, y1 + 3):
            for x in (x1 + 1, x1 + 2):
                if get(x, y) in GRASSY:
                    put(x, y, P["forest"])
        for x in range(x0 + 2, x1 + 3):
            for y in (y1 + 1, y1 + 2):
                if get(x, y) in GRASSY:
                    put(x, y, P["forest"])

    # ---------------------------------------------------------------- THE DIG
    # A 3/4-view hole in the Yard: an earth rim, a tall far wall with strata, dark
    # bands stepping down to a black floor lit by the derrick's lamp. A ramp from
    # the south-west rim, planks over the east edge, a skull and bones on the floor,
    # spoil heaps, and the John Harvard statue tipping in at the north-west rim.
    cx, cy = kx(64), kx(76)
    rx, ry = kx(22), kx(13)

    def rim(t, k=1.0, ox=0, oy=0, sx=1.0, sy=1.0):
        r = 1 + 0.12 * math.sin(3 * t) + 0.08 * math.cos(5 * t + 1)
        return (cx + ox + int(round(rx * r * k * sx * math.cos(t))),
                cy + oy + int(round(ry * r * k * sy * math.sin(t))))

    def ring(k=1.0, ox=0, oy=0, sx=1.0, sy=1.0, n=160):
        return [rim(i / float(n) * 2 * math.pi, k, ox, oy, sx, sy) for i in range(n)]

    # spoil heaps first, so the pit overdraws their inner edge
    for (hx, hy, hw) in [(cx - rx - 6, cy + 9, 9), (cx + rx, cy + 8, 10), (cx + 4, cy - ry - 7, 12)]:
        d.ellipse((hx, hy, hx + hw, hy + 5), fill=P["brickD"])
        d.ellipse((hx + 1, hy, hx + hw - 1, hy + 3), fill=P["earth"])
        put(hx + 2, hy + 1, P["sand"])
        put(hx + 3, hy, P["sand"])
        put(hx + 1, hy + 5, P["grass"])
        put(hx + hw - 1, hy + 5, P["grass2"])

    d.polygon(ring(1.0), fill=P["earth"])                       # A: the far-wall earth, full rim
    d.polygon(ring(1.0, 0, 3, 0.86, 0.72), fill=P["brickD"])   # B
    d.polygon(ring(1.0, 0, 5, 0.72, 0.52), fill=P["deep"])     # C
    floor = ring(1.0, 0, 7, 0.56, 0.36)
    d.polygon(floor, fill=P["black"])                          # the floor
    # strata on the far (top) wall: two solid lines following the rim
    for (k, col) in ((0.9, P["plazaD"]), (0.8, P["stoneD"])):
        pts = [rim(1.05 * math.pi + (0.9 * math.pi) * i / 80.0, k) for i in range(81)]
        d.line(pts, fill=col, width=1)
    # lit lip top-left, shadowed lip bottom-right, just outside the earth
    for i in range(0, 161):
        t = math.pi + 0.5 * math.pi * i / 160.0
        x, y = rim(t)
        put(int(round(x + math.cos(t))), int(round(y + math.sin(t))), P["grass2"])
    for i in range(0, 161):
        t = 0.5 * math.pi * i / 160.0
        x, y = rim(t)
        put(int(round(x + math.cos(t))), int(round(y + math.sin(t))), P["forest"])
    # a dark crescent along the floor's upper-left edge
    for k in (0.97, 0.84):
        pts = [rim(math.pi + 0.55 * math.pi * i / 60.0, k, 0, 7, 0.56, 0.36) for i in range(61)]
        d.line(pts, fill=P["waterD"], width=1)
    # the ramp from the south-west rim down to the floor
    ax, ay = cx - rx + 2, cy + 4
    bx, by = cx - 12, cy + 8
    vx, vy = bx - ax, by - ay
    L = math.hypot(vx, vy)
    nx, ny = -vy / L, vx / L
    quad = [(ax + nx * 2, ay + ny * 2), (bx + nx * 1.5, by + ny * 1.5), (bx - nx * 1.5, by - ny * 1.5), (ax - nx * 2, ay - ny * 2)]
    d.polygon(quad, fill=P["earth"])
    d.line([(ax - nx * 2, ay - ny * 2), (bx - nx * 1.5, by - ny * 1.5)], fill=P["sand"], width=1)
    d.line([(ax + nx * 2, ay + ny * 2), (bx + nx * 1.5, by + ny * 1.5)], fill=P["brickD"], width=1)
    # planks over the east edge, from the grass across the rim
    ex = cx + rx
    for i in range(3):
        y = cy - 4 + i * 4
        d.line((ex - 5, y, ex + 6, y), fill=P["sand"])
        d.line((ex - 5, y + 1, ex + 6, y + 1), fill=P["brickD"])
    # the skull and bones on the floor
    sk = (cx - 2, cy + 8)
    d.rectangle((sk[0], sk[1], sk[0] + 5, sk[1] + 4), fill=P["stone"])
    put(sk[0] + 1, sk[1] + 2, P["black"])
    put(sk[0] + 4, sk[1] + 2, P["black"])
    put(sk[0] + 2, sk[1] + 4, P["black"])
    d.line([(cx + 5, cy + 12), (cx + 11, cy + 10)], fill=P["stone"])
    d.line([(cx - 9, cy + 5), (cx - 4, cy + 3)], fill=P["stone"])
    # the derrick: off the road on the north-west rim, a beam out over the pit, a
    # cable down to the lamp lighting the floor, a winch drum at one foot
    f1, f2 = (cx - 14, cy - ry + 2), (cx - 4, cy - ry + 2)
    apex = ((f1[0] + f2[0]) // 2, f1[1] - 10)
    d.line([f1, (apex[0] - 1, apex[1])], fill=P["black"])
    d.line([f2, (apex[0] + 1, apex[1])], fill=P["black"])
    d.line([(f1[0] + 1, f1[1]), apex], fill=P["earth"])
    d.line([(f2[0] - 1, f2[1]), apex], fill=P["earth"])
    beam_end = apex[0] + 12
    d.line((apex[0] - 1, apex[1], beam_end, apex[1]), fill=P["black"])
    d.line((apex[0] - 1, apex[1] - 1, beam_end, apex[1] - 1), fill=P["earth"])
    lamp_y = cy + 3
    d.line((beam_end, apex[1] + 1, beam_end, lamp_y), fill=P["stone"])
    d.rectangle((beam_end - 1, lamp_y, beam_end + 1, lamp_y + 2), fill=P["lamp"])
    d.rectangle((f2[0] + 1, f2[1] - 2, f2[0] + 3, f2[1]), fill=P["stoneD"])
    put(f2[0] + 2, f2[1] - 1, P["black"])
    # the statue at the north-west rim: a tipping plinth and the seated bronze
    sx, sy = cx - rx + 6, cy - ry + 4
    for i in range(7):  # plinth 7x3, right end 1px lower
        y = sy + (1 if i >= 4 else 0)
        put(sx - 3 + i, y, P["stone"])
        put(sx - 3 + i, y + 1, P["stone"])
        put(sx - 3 + i, y + 2, P["stoneD"])
    # seated facing the hole: head over the shoulders, torso, knees out to the right
    d.rectangle((sx - 1, sy - 8, sx + 1, sy - 6), fill=P["bronze"])  # head 3x3
    d.rectangle((sx - 2, sy - 5, sx + 2, sy - 4), fill=P["bronze"])  # shoulders 5x2
    d.rectangle((sx - 1, sy - 3, sx + 1, sy - 1), fill=P["bronze"])  # lap 3x3
    put(sx + 2, sy - 2, P["bronze"])  # knees forward
    put(sx + 2, sy - 1, P["bronze"])
    for (x, y) in [(sx + 1, sy - 8), (sx + 1, sy - 7), (sx + 1, sy - 6), (sx + 2, sy - 5), (sx + 2, sy - 4),
                   (sx + 1, sy - 3), (sx + 2, sy - 2), (sx + 2, sy - 1), (sx, sy - 1)]:
        put(x, y, P["forest"])  # the shadow side, away from the lit lip
    put(sx + 3, sy - 1, P["sand"])  # the shoe tip
    # a 1px black outline where the bronze meets grass, so the figure separates from the field
    for y in range(sy - 9, sy):
        for x in range(sx - 3, sx + 5):
            if get(x, y) in GRASSY and any(get(x + ox, y + oy) in (P["bronze"], P["forest"], P["sand"])
                                           for (ox, oy) in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                put(x, y, P["black"])

    # ---------------------------------------------------------------- trees
    def shadow(x, y):
        if get(x, y) in GRASSY:
            put(x, y, P["forest"])

    def tree(x, y, r=3):
        d.ellipse((x - r, y - r, x + r, y + r), fill=P["forest"])
        d.ellipse((x - r, y - r, x + r, y + r - 1), fill=P["grassD"])
        d.ellipse((x - r + 1, y - r, x + r - 1, y), fill=P["grass2"])
        put(x, y + r, P["earth"])
        shadow(x + r, y + r)

    def tall(x, y):
        """A column 3x7 with its feet at y."""
        d.rectangle((x - 1, y - 6, x + 1, y), fill=P["forest"])
        d.rectangle((x - 1, y - 5, x - 1, y - 2), fill=P["grassD"])
        d.rectangle((x, y - 5, x, y - 4), fill=P["grassD"])
        put(x, y - 7, P["grass2"])
        put(x, y + 1, P["earth"])
        shadow(x + 2, y + 1)

    def bushy(x, y):
        tree(x, y, 3)
        tree(x + 3, y + 1, 3)

    # a ring around the Common, and five around the obelisk
    for (x, y, r) in [(14, 37, 3), (23, 36, 3), (32, 38, 2), (41, 41, 3), (48, 50, 2), (48, 59, 3), (40, 61, 2), (24, 62, 2)]:
        tree(x, y, r)
    for (x, y) in [(25, 50), (29, 46), (35, 49), (36, 56), (26, 58)]:
        tree(x, y, 3)
    # the row along Garden St, north of the Common
    for y in (10, 20, 30):
        tall(17, y)
    # a grove top-right behind Annenberg
    for (x, y) in [(118, 8), (132, 6), (146, 9), (158, 5)]:
        bushy(x, y)
    for (x, y, r) in [(126, 13, 2), (140, 13, 2), (152, 13, 2)]:
        tree(x, y, r)
    # the row along the river bank, right
    for x in (126, 134, 142, 150, 158):
        tall(x, bank_y(x) - 2)
    # lines along Oxford St, and clumps in the open ground
    for (x, y, r) in [(101, 28, 2), (100, 42, 2), (34, 14, 3), (44, 8, 2), (26, 24, 3), (36, 26, 2), (52, 72, 2),
                      (104, 74, 3), (118, 74, 3), (108, 81, 2), (158, 70, 3), (163, 75, 2)]:
        tree(x, y, r)
    bushy(136, 72)

    # ---------------------------------------------------------------- frame
    # A recessed screen: a dark inset with a black line along the top and left.
    d.rectangle((0, 0, S - 1, S - 1), outline=P["roadD"])
    d.rectangle((1, 1, S - 2, S - 2), outline=P["roadD"])
    d.line((2, 2, S - 3, 2), fill=P["black"])
    d.line((2, 2, 2, S - 3), fill=P["black"])

    bad = {px[x, y][:3] for x in range(S) for y in range(S)} - set(PALETTE)
    assert not bad, f"off-palette colors: {bad}"
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    im.save(OUT)
    print("map:", OUT, im.size)


if __name__ == "__main__":
    main()
