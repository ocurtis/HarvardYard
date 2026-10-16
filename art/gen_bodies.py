#!/usr/bin/env python3
"""Writes the derived bro bodies: longshot_body.txt (bro body with a beer funnel held
high instead of a cup) and chucker_body.txt (a fat bro cradling a big cup).

Both share bro_heads through COMPOSITES in build.py. Edit here, not the .txt files.
"""
import os
import re

HERE = os.path.join(os.path.dirname(__file__), "sprites")
BRO = os.path.join(HERE, "bro_body.txt")


def read_frames(path):
    header, frames, cur = [], [], None
    for line in open(path).read().split("\n"):
        if line.startswith("# frame"):
            cur = {"meta": [line], "rows": []}
            frames.append(cur)
        elif cur is None:
            header.append(line)
        elif line.startswith("#"):
            cur["meta"].append(line)
        elif line.strip():
            cur["rows"].append(list(line))
    return header, frames


def write(path, header, frames):
    out = list(header)
    for f in frames:
        out.extend(f["meta"])
        out.extend("".join(r) for r in f["rows"])
    open(path, "w").write("\n".join(out) + "\n")


def longshot():
    header, frames = read_frames(BRO)
    header = [h.replace("# name: bro_body", "# name: longshot_body") for h in header]
    # Funnel colors: O orange, F funnel rim, T tube.
    header = [h + " O=#fe7000 F=#ffffff T=#58f5b1" if h.startswith("# K=") else h for h in header]
    for f in frames:
        rows = f["rows"]
        top = next((y for y, r in enumerate(rows) if "".join(r[12:16]) == "WWWW"), None)
        if top is None:
            continue  # stagger/sober frames: no cup to replace
        # Clear the cup (cols 12-15, the W/R block), keep the hand.
        for y in range(top, min(top + 6, 24)):
            for x in range(12, 16):
                if rows[y][x] in "WR":
                    rows[y][x] = "."
        # The funnel, held up at head height, tube running down into the hand.
        fy = top - 5
        for x, ch in zip(range(12, 16), "FFFF"):
            rows[fy][x] = ch
        for x, ch in zip(range(12, 16), "OOOO"):
            rows[fy + 1][x] = ch
        rows[fy + 2][13] = "O"
        rows[fy + 2][14] = "O"
        rows[fy + 3][13] = "T"
        rows[fy + 4][13] = "T"
        rows[top][12] = "T"
    write(os.path.join(HERE, "longshot_body.txt"), header, frames)


CHUCKER_BASE = """
................
................
................
................
................
................
................
................
................
....KLLLLLLK....
..KKQLLLLLLLKK..
.KQQLLLLLLLLLLK.
KQQLLLLLLLLLLLLK
KQQLLLLLLLLLLLLK
KQQLLLLLLLLLLLLK
.KQLLLLLLLLLLLK.
.KQQLLLLLLLLLQK.
..KQQLLLLLLLQK..
...KKQQQQQQKK...
...KBSSKKSSBK...
...KBSSK.KSSBK..
....KSSK.KSSK...
....KSSK.KSSK...
....KKKK.KKKK...
""".strip("\n").split("\n")


def stamp(rows, x0, y0, art):
    for dy, line in enumerate(art):
        for dx, ch in enumerate(line):
            if ch != "." and 0 <= y0 + dy < 24 and 0 <= x0 + dx < 16:
                rows[y0 + dy][x0 + dx] = ch


CUP = ["WWWW", "RRRR", "RRRR", "RRRR", ".RR."]  # a big solo cup, rim up


def chucker():
    def base():
        return [list(r) for r in CHUCKER_BASE]

    def legs_up(rows, side):
        # Lift one leg: drop its lowest row and shorten it by one.
        xs = range(4, 8) if side == "l" else range(9, 13)
        for x in xs:
            rows[23][x] = "."
            rows[22][x] = "K" if rows[22][x] != "." else "."

    def bob(rows):
        # Raise the whole figure by one pixel (the head override follows).
        return rows[1:] + [list("................")]

    def cradle(rows):
        stamp(rows, 6, 12, CUP)
        for y in (13, 14):
            rows[y][5] = "S"
            rows[y][10] = "S"

    frames = []

    def add(meta, rows, head=(4, 2)):
        frames.append({"meta": [f"# frame {len(frames)}  ({meta})", f"# head: {head[0]},{head[1]}"], "rows": rows})

    # walk 0-3: waddle. Cup cradled on the belly.
    r = base(); cradle(r); add("walk contact", r)
    r = base(); legs_up(r, "r"); cradle(r); r = bob(r); add("walk right leg up", r, (4, 1))
    r = base(); cradle(r); add("walk contact", r)
    r = base(); legs_up(r, "l"); cradle(r); r = bob(r); add("walk left leg up", r, (4, 1))
    # windup 4-5: cup raised over the right shoulder, arm up.
    for shake in (0, 1):
        r = base()
        stamp(r, 12, 6 + shake, CUP)
        r[11][12] = "S"
        r[12][12] = "S"
        r[12][11] = "S"
        add("windup", r)
    # piss 6-7 (the throw): arm straight out, cup gone.
    for i in (0, 1):
        r = base()
        for x in range(12, 16):
            r[11 + i][x] = "S"
        add("throw", r)
    # stagger 8: cup knocked loose, flying up-right.
    r = base()
    stamp(r, 11, 4, CUP)
    r[13][5] = "S"
    r[13][10] = "S"
    add("stagger", r)
    # sober 9-10: hands up, no cup.
    for i in (0, 1):
        r = base()
        for y in (9 + i, 10 + i):
            r[y][2] = "S"
            r[y][13] = "S"
        add("sober", r)
    header = [
        "# name: chucker_body",
        "# size: 16x24",
        "# K=#202040 S=#feb854 B=#8a6042 L=#9600dc Q=#340058 R=#e03c32 W=#ffffff",
        "# head: 4,2",
        "# anim walk: 0 1 2 3 @5",
        "# anim windup: 4 5 @4",
        "# anim piss: 6 7 @6",
        "# anim stagger: 8",
        "# anim sober: 9 10 @4",
    ]
    write(os.path.join(HERE, "chucker_body.txt"), header, frames)


if __name__ == "__main__":
    longshot()
    chucker()
    print("wrote longshot_body.txt, chucker_body.txt")
