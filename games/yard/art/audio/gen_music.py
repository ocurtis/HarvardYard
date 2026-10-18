#!/usr/bin/env python3
"""Renders the music loops to public/audio/*.wav (then ogg/mp3 via ffmpeg).

  chill      waves 1-4   84 BPM, D major, bass + soft arpeggio + hat + low bells (candidate C)
  panic145   waves 5-9   145 BPM, D minor, bells lead over triangle, kick, hat (candidate H family)
  panic160   waves 10+   160 BPM, same, shorter bell ring

Every loop is rendered to its exact length; the bell tails that run past the end are
folded onto the start so the loop point is seamless. Edit here, not the audio files.
"""
import os
import subprocess
import sys
import wave

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "shared", "art", "audio"))
from synth import SR, bell, freq, noise, place, pulse, tri  # noqa: E402

OUT = os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "public", "yard", "audio")


def render(name, bpm, bars, fill, tail=4.0, smooth=6):
    beat = 60 / bpm
    bar = 4 * beat
    length = bars * bar
    buf = np.zeros(int((length + tail) * SR))
    fill(buf, beat, bar, bars)
    n = int(length * SR)
    # Fold the tail onto the start: what rings past the end is heard at the loop point.
    buf[: len(buf) - n] += buf[n:]
    buf = buf[:n]
    if smooth > 1:
        buf = np.convolve(buf, np.ones(smooth) / smooth, mode="same")
    buf = buf / (np.max(np.abs(buf)) + 1e-9) * 0.85
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, f"{name}.wav")
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((buf * 32767).astype(np.int16).tobytes())
    for ext, args in (("ogg", ["-c:a", "libvorbis", "-q:a", "5"]), ("mp3", ["-b:a", "128k"])):
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", path, *args, os.path.join(OUT, f"{name}.{ext}")], check=True)
    os.remove(path)
    print(f"{name}: {length:.1f}s loop at {bpm} BPM")


def chill(buf, beat, bar, bars):
    chords = [
        ("D2", ["D4", "F#4", "A4"]), ("B1", ["B3", "D4", "F#4"]), ("G1", ["G3", "B3", "D4"]), ("A1", ["A3", "C#4", "E4"]),
        ("D2", ["D4", "F#4", "A4"]), ("F#1", ["F#3", "A3", "C#4"]), ("G1", ["G3", "B3", "D4"]), ("A1", ["A3", "C#4", "E4"]),
    ]
    big = ["D3", "A2"]
    mid = ["D3", "F#3", "A3", "B3"]
    for b in range(bars):
        root, chord = chords[b % 8]
        t0 = b * bar
        place(buf, tri(freq(root), beat * 1.4), t0)
        place(buf, tri(freq(root), beat * 0.6), t0 + beat * 1.5)
        place(buf, tri(freq(root) * 1.5, beat * 0.8), t0 + beat * 3)
        for k in range(8):
            n = chord[k % 3] if k % 4 != 3 else chord[1]
            place(buf, pulse(freq(n), beat * 0.45, duty=0.125, vol=0.07, env=(0.002, 0.08, 0.4, 0.05)), t0 + k * beat / 2)
        for k in range(4):
            place(buf, noise(0.06, vol=0.05), t0 + k * beat + beat / 2)
        place(buf, noise(0.08, vol=0.09, lo=True), t0)
        place(buf, noise(0.08, vol=0.07, lo=True), t0 + 2 * beat)
        i = b % 8
        if i in (0, 4):
            place(buf, bell(freq(big[0] if i == 0 else big[1]), 4.0, vol=0.2, big=True), t0)
        if i in (1, 3, 5, 7):
            place(buf, bell(freq(mid[i % 4]), 2.4, vol=0.10, big=True), t0 + beat * 1.5)
            place(buf, bell(freq(mid[(i + 2) % 4]), 2.4, vol=0.08, big=True), t0 + beat * 3)


def panic(ring):
    def fill(buf, beat, bar, bars):
        roots = ["D2", "D2", "G1", "A1", "D2", "A#1", "G1", "A1"]
        bigs = ["D3", "D3", "G2", "A2", "D3", "A#2", "G2", "A2"]
        figure = [
            ["D4", "F4", "A4", "F4", "D4", "A4", "G4", "F4"],
            ["G4", "A#4", "D5", "A#4", "A4", "E4", "C#5", "A4"],
            ["D4", "F4", "A4", "F4", "D4", "F4", "A#4", "A4"],
            ["G4", "A#4", "D5", "G4", "A4", "C#5", "E5", "A4"],
        ]
        for b in range(bars):
            i = b % 8
            rep = b // 8
            t0 = b * bar
            root = roots[i]
            place(buf, bell(freq(bigs[i]), 3.0, vol=0.2, big=True), t0)
            fig = figure[i // 2]
            for k in range(4):
                n = fig[(i % 2) * 4 + k]
                place(buf, bell(freq(n), ring, vol=0.13), t0 + k * beat)
                if rep == 1 and i >= 6:
                    place(buf, bell(freq(n) * 2, 0.8, vol=0.05), t0 + k * beat + beat / 2)
            place(buf, tri(freq(root), beat * 0.9, vol=0.26), t0)
            place(buf, tri(freq(root), beat * 0.9, vol=0.26), t0 + 2 * beat)
            place(buf, tri(freq(root) * 1.5, beat * 0.4, vol=0.2), t0 + 3.5 * beat)
            place(buf, noise(0.1, vol=0.11, lo=True), t0)
            place(buf, noise(0.1, vol=0.09, lo=True), t0 + 2 * beat)
            for k in range(8):
                place(buf, noise(0.03, vol=0.04), t0 + k * beat / 2)
    return fill


if __name__ == "__main__":
    render("chill", 84, 16, chill, smooth=6)
    render("panic145", 145, 16, panic(1.4), smooth=3)
    render("panic160", 160, 16, panic(1.1), smooth=3)
