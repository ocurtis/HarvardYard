#!/usr/bin/env python3
"""Render a .notes.json (from hum2notes.py) on the chip: the melody on bells doubled
by a soft pulse, a triangle root under it, kick and hat. Optional cleanup snaps notes
to a scale, folds octave flickers, and merges repeats.

  python3 art/audio/render_notes.py <notes.json> <out.wav> [--clean KEY] [--bpm N]
"""
import json
import os
import sys
import wave

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from synth import SR, bell, noise, pulse, tri  # noqa: E402

NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
SCALES = {"minor": [0, 2, 3, 5, 7, 8, 10], "major": [0, 2, 4, 5, 7, 9, 11]}


def midi_freq(m):
    return 440 * 2 ** ((m - 69) / 12)


def clean(notes, key="D", mode="minor", lo=57, hi=74):
    root = NAMES.index(key)
    scale = [(root + s) % 12 for s in SCALES[mode]]
    out = []
    for n in notes:
        m = n["midi"]
        while m < lo:
            m += 12
        while m > hi:
            m -= 12
        # Snap to the nearest scale tone.
        cands = [m + d for d in range(-2, 3) if (m + d) % 12 in scale]
        m = min(cands, key=lambda c: abs(c - m))
        out.append({**n, "midi": m})
    # Merge a note into the previous one when it's the same pitch and starts where it ends.
    merged = []
    for n in out:
        if merged and merged[-1]["midi"] == n["midi"] and abs(merged[-1]["start"] + merged[-1]["len"] - n["start"]) < 0.26:
            merged[-1]["len"] += n["len"]
        else:
            merged.append(dict(n))
    return merged


def place(buf, s, at):
    i = int(at * SR)
    j = min(len(buf), i + len(s))
    buf[i:j] += s[: j - i]


if __name__ == "__main__":
    src, dst = sys.argv[1], sys.argv[2]
    data = json.load(open(src))
    notes = data["notes"]
    bpm = data["bpm"]
    if "--bpm" in sys.argv:
        bpm = int(sys.argv[sys.argv.index("--bpm") + 1])
    if "--clean" in sys.argv:
        notes = clean(notes, sys.argv[sys.argv.index("--clean") + 1])
    beat = 60 / bpm
    first = min(n["start"] for n in notes)
    for n in notes:
        n["start"] -= first
    total = max(n["start"] + n["len"] for n in notes) * beat + 3
    buf = np.zeros(int(total * SR))
    root_midi = 50  # D3 for the bass; the humming sat around D4
    bars = int(total / (4 * beat)) + 1
    for b in range(bars):
        t0 = b * 4 * beat
        place(buf, tri(midi_freq(root_midi), beat * 0.9, vol=0.22), t0)
        place(buf, tri(midi_freq(root_midi), beat * 0.9, vol=0.22), t0 + 2 * beat)
        place(buf, noise(0.08, vol=0.09, lo=True), t0)
        place(buf, noise(0.08, vol=0.07, lo=True), t0 + 2 * beat)
        for k in range(8):
            place(buf, noise(0.03, vol=0.035), t0 + k * beat / 2)
    for n in notes:
        f = midi_freq(n["midi"])
        at = n["start"] * beat
        dur = n["len"] * beat
        place(buf, bell(f, max(0.6, dur * 1.2), vol=0.18), at)
        place(buf, pulse(f, dur * 0.95, duty=0.25, vol=0.06, env=(0.005, 0.05, 0.6, 0.05)), at)
    buf = buf / (np.abs(buf).max() + 1e-9) * 0.85
    with wave.open(dst, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((buf * 32767).astype(np.int16).tobytes())
    print(f"wrote {dst}: {len(notes)} notes, {total:.1f}s at {bpm} BPM")
    print(" ".join(f"{NAMES[n['midi'] % 12]}{n['midi'] // 12 - 1}" for n in notes))
