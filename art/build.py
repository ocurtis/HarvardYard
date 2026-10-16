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
    head_default = None
    head_overrides = {}
    expressions = None
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
                elif body.startswith("head:"):
                    x, y = (int(v) for v in body[5:].strip().split(","))
                    if cur is None and not frames:
                        head_default = (x, y)
                    else:
                        head_overrides[len(frames) - 1] = (x, y)
                elif body.startswith("expressions:"):
                    expressions = body[len("expressions:"):].split()
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
    if h == 24:
        check_waist(path, frames)
    return {
        "name": name, "w": w, "h": h, "colors": colors, "anims": anims, "frames": frames,
        "head": head_default, "head_overrides": head_overrides, "expressions": expressions,
    }


def check_waist(path, frames):
    """A character's torso and legs must share a center in every walk frame. A 1px
    'sway' drawn as a shear reads as a broken waist at 1x; refuse it at build time."""
    def center(rows):
        xs = [x for r in rows for x, ch in enumerate(r) if ch != "."]
        return (min(xs) + max(xs)) / 2 if xs else None
    ref = None
    for i, fr in enumerate(frames[:4]):  # the walk cycle is frames 0-3 by convention
        legs = center(fr[19:23])
        if legs is None:
            continue
        if ref is None:
            ref = legs
        elif abs(legs - ref) > 1.0:
            raise ValueError(f"{path}: frame {i} legs are offset {legs - ref:+.1f}px from frame 0; keep the waist aligned")


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


# Shirt swaps for part-built characters: (fill, shade) pairs replacing keys L and Q.
# Director's cut: cyan/magenta collide with the bro's shirts, green with the grass.
TOURIST_GROUP_COLORS = [("#fe7000", "#ca4a00"), ("#e8ea4a", "#a3a324"), ("#9600dc", "#340058")]
# Extra characters composed from another character's parts with their own shirts.
# name -> (body sprite name, heads sprite name, shirts)
COMPOSITES = {
    "longshot": ("longshot_body", "bro_heads", [("#d10f4c", "#991515")]),  # the Longshot Bro: crimson, beer funnel held high
    "chucker": ("chucker_body", "bro_heads", [("#9600dc", "#340058")]),  # the Cup Chucker: fat, purple, cradling a big cup
}

SHIRTS = {
    "bro": [("#27badb", "#006ab4"), ("#ffffff", "#c8c8c8"), ("#fe626e", "#d10f4c")],
    "tourist": TOURIST_GROUP_COLORS,
    "tourist_a": TOURIST_GROUP_COLORS,
    "tourist_b": TOURIST_GROUP_COLORS,
}


def compose_variants(body, heads, shirts):
    """Body + each head x each shirt -> list of (variant_name, sprite dict)."""
    exprs = heads["expressions"] or ["neutral"]
    n_expr = len(exprs)
    n_heads = len(heads["frames"]) // n_expr
    # Which expression each body frame wants: by anim membership.
    def expr_for(frame_idx):
        for an, d in body["anims"].items():
            if frame_idx in d["frames"] and an in exprs:
                return exprs.index(an)
        return 0
    out = []
    for hi in range(n_heads):
        for si, (fill, shade) in enumerate(shirts):
            frames = []
            for fi, fr in enumerate(body["frames"]):
                grid = [list(row) for row in fr]
                hx, hy = body["head_overrides"].get(fi, body["head"])
                stamp = heads["frames"][hi * n_expr + expr_for(fi)]
                for y, row in enumerate(stamp):
                    for x, ch in enumerate(row):
                        if ch == ".":
                            continue
                        gy, gx = hy + y, hx + x
                        if 0 <= gy < body["h"] and 0 <= gx < body["w"]:
                            grid[gy][gx] = "h" + ch  # namespace head keys
                frames.append(grid)
            colors = dict(body["colors"])
            colors["L"], colors["Q"] = fill, shade
            for k, v in heads["colors"].items():
                colors["h" + k] = v
            sp = {"name": f"{body['name'].removesuffix('_body')}_v{hi}{si}", "w": body["w"], "h": body["h"],
                  "colors": colors, "anims": body["anims"], "frames": frames}
            out.append(sp)
    return out


def render_grid(sprite):
    # Like render() but frames are lists of lists and keys may be multi-char.
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
    parsed = {}
    for fn in sorted(os.listdir(src_dir)):
        if not fn.endswith(".txt"):
            continue
        sp = parse(os.path.join(src_dir, fn))
        parsed[sp["name"]] = sp
    for cname, (body_name, heads_name, shirts) in COMPOSITES.items():
        if body_name in parsed and heads_name in parsed:
            body = dict(parsed[body_name])
            body["name"] = cname + "_body"
            variants = compose_variants(body, parsed[heads_name], shirts)
            names = []
            for v in variants:
                png = f"{v['name']}.png"
                render_grid(v).save(os.path.join(out_dir, png))
                atlas[v["name"]] = {"file": png, "w": v["w"], "h": v["h"], "frames": len(v["frames"]), "anims": v["anims"]}
                names.append(v["name"])
            atlas[cname] = {"variants": names, "w": body["w"], "h": body["h"], "frames": len(body["frames"]), "anims": body["anims"]}
    for name, sp in parsed.items():
        if name.endswith("_heads") or name in {b for b, _, _ in COMPOSITES.values()}:
            continue  # only used through composition
        if name.endswith("_body") and f"{name.removesuffix('_body')}_heads" in parsed:
            base = name.removesuffix("_body")
            heads = parsed[f"{base}_heads"]
            variants = compose_variants(sp, heads, SHIRTS.get(base, [(sp["colors"]["L"], sp["colors"]["Q"])]))
            names = []
            for v in variants:
                png = f"{v['name']}.png"
                render_grid(v).save(os.path.join(out_dir, png))
                atlas[v["name"]] = {"file": png, "w": v["w"], "h": v["h"], "frames": len(v["frames"]), "anims": v["anims"]}
                names.append(v["name"])
            atlas[base] = {"variants": names, "w": sp["w"], "h": sp["h"], "frames": len(sp["frames"]), "anims": sp["anims"]}
            continue
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
        if "variants" in a:
            print(f"{name}: {len(a['variants'])} variants of {a['frames']} frames {a['w']}x{a['h']}")
        else:
            print(f"{name}: {a['frames']} frames {a['w']}x{a['h']}  anims={list(a['anims'])}")
    print(f"-> {out}")
