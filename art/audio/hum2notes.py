#!/usr/bin/env python3
"""Turn a hummed take into notes. Autocorrelation pitch tracking in 40 ms frames,
median-smoothed, snapped to semitones, grouped into notes with a minimum length,
and quantized to a beat grid guessed from the note onsets.

  python3 art/audio/hum2notes.py art/audio/voice/music_loop_attempt.wav [bpm]

Prints the note list (name, start beat, length beats) and writes <name>.notes.json
next to the take. The chip renderer reads that file.
"""
import json
import os
import sys
import wave

import numpy as np

NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]


def read_wav(path):
    w = wave.open(path)
    sr = w.getframerate()
    d = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768
    return sr, d


def pitch_track(d, sr, frame_ms=40, hop_ms=10, fmin=70, fmax=600):
    n = int(sr * frame_ms / 1000)
    hop = int(sr * hop_ms / 1000)
    peak = np.abs(d).max() + 1e-9
    out = []
    for i in range(0, len(d) - n, hop):
        x = d[i : i + n]
        x = x - x.mean()
        rms = np.sqrt((x**2).mean())
        if rms < 0.03 * peak:
            out.append(0.0)
            continue
        x = x * np.hanning(n)
        ac = np.correlate(x, x, mode="full")[n - 1 :]
        ac /= ac[0] + 1e-12
        lo, hi = int(sr / fmax), int(sr / fmin)
        seg = ac[lo:hi]
        k = np.argmax(seg) + lo
        if ac[k] < 0.22:
            out.append(0.0)
            continue
        # Parabolic refinement.
        if 1 <= k < len(ac) - 1:
            a, b, c = ac[k - 1], ac[k], ac[k + 1]
            k = k + 0.5 * (a - c) / (a - 2 * b + c + 1e-12)
        out.append(sr / k)
    return np.array(out), hop / sr


def to_midi(f):
    return 69 + 12 * np.log2(f / 440.0)


def notes_from_track(f0, dt, min_len_s=0.09):
    midi = np.where(f0 > 0, np.round(to_midi(np.where(f0 > 0, f0, 1))), -1)
    # Median smooth over 5 frames to kill octave flickers.
    sm = midi.copy()
    for i in range(len(midi)):
        w = midi[max(0, i - 2) : i + 3]
        w = w[w >= 0]
        sm[i] = np.median(w) if len(w) >= 3 else -1
    notes = []
    cur, start = -1, 0
    for i, m in enumerate(list(sm) + [-1]):
        if m != cur:
            if cur >= 0 and (i - start) * dt >= min_len_s:
                notes.append({"midi": int(cur), "t": start * dt, "len": (i - start) * dt})
            cur, start = m, i
    return notes


def guess_bpm(notes, lo=70, hi=160):
    onsets = np.array([n["t"] for n in notes])
    if len(onsets) < 4:
        return 100
    best, best_score = 100, -1
    for bpm in range(lo, hi + 1):
        beat = 60 / bpm
        # How close onsets fall to an eighth-note grid.
        phase = (onsets / (beat / 2)) % 1.0
        score = np.mean(np.cos(2 * np.pi * phase))
        if score > best_score:
            best, best_score = bpm, score
    return best


def quantize(notes, bpm, grid=0.5):
    beat = 60 / bpm
    out = []
    for n in notes:
        s = round(n["t"] / beat / grid) * grid
        l = max(grid, round(n["len"] / beat / grid) * grid)
        out.append({"note": NAMES[n["midi"] % 12] + str(n["midi"] // 12 - 1), "midi": n["midi"], "start": s, "len": l})
    # Drop overlaps: a note ends where the next begins.
    for a, b in zip(out, out[1:]):
        if a["start"] + a["len"] > b["start"]:
            a["len"] = max(grid, b["start"] - a["start"])
    return out


if __name__ == "__main__":
    path = sys.argv[1]
    sr, d = read_wav(path)
    f0, dt = pitch_track(d, sr)
    raw = notes_from_track(f0, dt)
    bpm = int(sys.argv[2]) if len(sys.argv) > 2 else guess_bpm(raw)
    notes = quantize(raw, bpm)
    voiced = f0[f0 > 0]
    print(f"{len(raw)} notes, {len(voiced) * dt:.1f}s voiced of {len(d) / sr:.1f}s, bpm {bpm}, range {NAMES[int(min(n['midi'] for n in raw)) % 12]}..{NAMES[int(max(n['midi'] for n in raw)) % 12]}")
    for n in notes:
        print(f"  {n['note']:4} @ {n['start']:5.1f}  x{n['len']}")
    out = os.path.splitext(path)[0] + ".notes.json"
    json.dump({"bpm": bpm, "notes": notes}, open(out, "w"), indent=1)
    print("wrote", out)
