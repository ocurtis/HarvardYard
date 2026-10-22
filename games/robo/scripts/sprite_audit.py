#!/usr/bin/env python3
"""Mechanical checks for a boss sprite text grid. Usage:
    python3 games/robo/scripts/sprite_audit.py games/robo/art/sprites/boss_pipette.txt [--head-rows N]
Reports palette violations, color count, left/right asymmetry below the head,
isolated stray pixels, and unoutlined part edges. Exit code 1 on any hard failure.
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / 'shared' / 'art'))
try:
    from palette import PALETTE  # type: ignore
    PAL = {v.lower() for v in (PALETTE.values() if isinstance(PALETTE, dict) else PALETTE)}
except Exception:  # pragma: no cover
    PAL = None


def parse(path: str):
    legend: dict[str, str] = {}
    frames: list[list[str]] = []
    cur: list[str] | None = None
    for line in Path(path).read_text().split('\n'):
        s = line.rstrip()
        if s.startswith('# frame'):
            cur = []
            frames.append(cur)
            continue
        if cur is None:
            for ch, hx in re.findall(r'(\S)=(#[0-9a-fA-F]{6})', s):
                legend[ch] = hx.lower()
        if s.startswith('#') or not s:
            continue
        if cur is not None:
            cur.append(s)
    return legend, frames


def audit(path: str, head_rows: int) -> int:
    legend, frames = parse(path)
    fails = 0
    print(f'{path}: {len(frames)} frame(s), {len(legend)} colors')
    if PAL is not None:
        bad = {ch: hx for ch, hx in legend.items() if hx not in PAL}
        if bad:
            print('  PALETTE VIOLATION:', bad)
            fails += 1
    if len(legend) > 7:
        print(f'  TOO MANY COLORS: {len(legend)} (max 7)')
        fails += 1
    for fi, rows in enumerate(frames):
        w = len(rows[0])
        h = len(rows)
        if any(len(r) != w for r in rows):
            print(f'  frame {fi}: ragged rows')
            fails += 1
            continue
        # Symmetry below the head: find the mirror axis (sum = x + x') with the fewest
        # mismatches, then report mismatches against it.
        best = None
        for axis in range(w - 4, w + 4):
            m = []
            for y in range(head_rows, h):
                for x in range(w):
                    xm = axis - x
                    if xm <= x or not (0 <= xm < w):
                        continue
                    a, b = rows[y][x], rows[y][xm]
                    if a != b:
                        m.append((x, y, a, b))
            if best is None or len(m) < len(best[1]):
                best = (axis, m)
        axis, asym = best
        print(f'  frame {fi}: mirror axis x+x\'={axis}; asymmetric pixels below row {head_rows}: {len(asym)}' + (f' e.g. {asym[:8]}' if asym else ''))
        # Stray pixels: a non-background pixel with no 4-neighbour of the same color and not black.
        strays = []
        for y in range(h):
            for x in range(w):
                c = rows[y][x]
                if c in '.K':
                    continue
                same = 0
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and rows[ny][nx] == c:
                        same += 1
                if same == 0:
                    strays.append((x, y, c))
        print(f'  frame {fi}: isolated non-black pixels: {len(strays)}' + (f' {strays[:10]}' if strays else ''))
        # Unoutlined edges: a colored pixel directly next to background without a K between.
        open_edges = 0
        samples = []
        for y in range(h):
            for x in range(w):
                c = rows[y][x]
                if c in '.K':
                    continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if not (0 <= nx < w and 0 <= ny < h) or rows[ny][nx] == '.':
                        open_edges += 1
                        if len(samples) < 6:
                            samples.append((x, y, c))
        print(f'  frame {fi}: colored pixels touching background with no outline: {open_edges}' + (f' e.g. {samples}' if samples else ''))
        if asym:
            fails += 1
    return 1 if fails else 0


if __name__ == '__main__':
    args = sys.argv[1:]
    head = 12
    if '--head-rows' in args:
        i = args.index('--head-rows')
        head = int(args[i + 1])
        del args[i:i + 2]
    if not args:
        print(__doc__)
        sys.exit(2)
    sys.exit(max(audit(p, head) for p in args))
