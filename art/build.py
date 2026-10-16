#!/usr/bin/env python3
"""Compile art/sprites/*.txt (and optionally another dir) into PNG strips + atlas.json.

  python3 art/build.py                       # art/sprites -> public/sprites
  python3 art/build.py art/candidates out/   # any dir -> any dir (for contact sheets)

Sprite file format: see art/SPEC.md.
"""
import json
import os
import re
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from palette import UFO50, hex_to_rgb  # noqa: E402

ALLOWED = {h.lower() for h in UFO50}


def parse(path):
    name = os.path.splitext(os.path.basename(path))[0]
    w = h = 16
    colors = {}
    anims = {}
    frames = []
    cur = None
    with open(path) as f:
        for raw in f:
            line = raw.rstrip("\n")
            if line.startswith("#"):
                body = line[1:].strip()
                if body.startswith("name:"):
                    name = body[5:].strip()
                elif body.startswith("size:"):
                    w, h = (int(v) for v in body[5:].strip().lower().split("x"))
                elif body.startswith("anim "):
                    m = re.match(r"anim\s+(\w+):\s*([\d\s]+)(?:@(\d+))?", body)
                    if not m:
                        raise ValueError(f"{path}: bad anim line: {line}")
                    anims[m.group(1)] = {
                        "frames": [int(v) for v in m.group(2).split()],
                        "fps": int(m.group(3) or 6),
                    }
                elif body.startswith("frame"):
                    cur = []
                    frames.append(cur)
                else:
                    for tok in body.split():
                        if "=" in tok:
                            k, v = tok.split("=", 1)
                            v = v.lower()
                            if v not in ALLOWED:
                                raise ValueError(f"{path}: {v} is not in the UFO 50 palette")
                            colors[k] = v
                continue
            if cur is None:
                if line.strip() == "":
                    continue
                cur = []
                frames.append(cur)
            if line.strip() == "":
                continue
            cur.append(line)
    if not frames:
        raise ValueError(f"{path}: no frames")
    for i, fr in enumerate(frames):
        if len(fr) != h:
            raise ValueError(f"{path}: frame {i} has {len(fr)} rows, expected {h}")
        for y, row in enumerate(fr):
            if len(row) != w:
                raise ValueError(f"{path}: frame {i} row {y} has {len(row)} cols, expected {w}: {row!r}")
            for ch in row:
                if ch != "." and ch not in colors:
                    raise ValueError(f"{path}: frame {i} uses undefined key {ch!r}")
    if not anims:
        anims["idle"] = {"frames": list(range(len(frames))), "fps": 6}
    return {"name": name, "w": w, "h": h, "colors": colors, "anims": anims, "frames": frames}


def render(sprite):
    w, h, frames = sprite["w"], sprite["h"], sprite["frames"]
    strip = Image.new("RGBA", (w * len(frames), h), (0, 0, 0, 0))
    px = strip.load()
    for i, fr in enumerate(frames):
        for y, row in enumerate(fr):
            for x, ch in enumerate(row):
                if ch == ".":
                    continue
                px[i * w + x, y] = hex_to_rgb(sprite["colors"][ch]) + (255,)
    return strip


def build(src_dir, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    atlas = {}
    for fn in sorted(os.listdir(src_dir)):
        if not fn.endswith(".txt"):
            continue
        sp = parse(os.path.join(src_dir, fn))
        strip = render(sp)
        png = f"{sp['name']}.png"
        strip.save(os.path.join(out_dir, png))
        atlas[sp["name"]] = {"file": png, "w": sp["w"], "h": sp["h"], "frames": len(sp["frames"]), "anims": sp["anims"]}
    with open(os.path.join(out_dir, "atlas.json"), "w") as f:
        json.dump(atlas, f, indent=2)
    return atlas


if __name__ == "__main__":
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(root, "art", "sprites")
    out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(root, "public", "sprites")
    atlas = build(src, out)
    for name, a in atlas.items():
        print(f"{name}: {a['frames']} frames {a['w']}x{a['h']}  anims={list(a['anims'])}")
    print(f"-> {out}")
