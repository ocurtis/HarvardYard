#!/usr/bin/env python3
"""Chip-crush the voice takes in art/audio/voice into public/audio/sfx/voice_<name>.(ogg|mp3).

NES-style sample playback: normalize, gate the room noise, resample to a low rate,
quantize to a few bits, add a little drive. Pass a sampler path to also write every
crushed cue in one file with gaps.

  python3 art/audio/crush.py
  python3 art/audio/crush.py sampler.wav
"""
import glob
import os
import subprocess
import sys
import wave

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
VOICE = os.path.join(HERE, "voice")
OUT = os.path.join(HERE, "..", "..", "public", "audio", "sfx")
SR_OUT = 22050  # file rate; the crushed content lives at RATE below

# The dials. Everything the ear calls "chip" is here.
RATE = 9000  # effective sample rate: the DPCM crunch
BITS = 5  # quantization depth
DRIVE = 1.4  # soft clip gain before quantizing
GATE_DB = -30  # below this (relative to peak) is treated as silence
PAD_MS = 15
SPEED = 1.3  # playback speed: faster and higher, the classic "chipmunk the sample" trick (+4.5 semitones)


def read_wav(path):
    w = wave.open(path)
    sr = w.getframerate()
    d = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768
    if w.getnchannels() == 2:
        d = d.reshape(-1, 2).mean(axis=1)
    return sr, d


def write_wav(path, buf, sr):
    buf = np.clip(buf, -1, 1)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((buf * 32767).astype(np.int16).tobytes())


def resample(d, sr_in, sr_out):
    n = int(len(d) * sr_out / sr_in)
    x = np.linspace(0, len(d) - 1, n)
    return np.interp(x, np.arange(len(d)), d)


def highpass(d, sr, fc=140):
    # One-pole high-pass: kills rumble and mic handling noise.
    a = np.exp(-2 * np.pi * fc / sr)
    out = np.zeros_like(d)
    prev_x = prev_y = 0.0
    for i, x in enumerate(d):
        y = a * (prev_y + x - prev_x)
        out[i] = y
        prev_x, prev_y = x, y
    return out


def lowpass(d, k):
    # Moving average before decimation so the drop in rate doesn't alias into static.
    return np.convolve(d, np.ones(k) / k, mode="same")


def crush(d, sr, rate=RATE, bits=BITS, drive=DRIVE, gate_db=GATE_DB, speed=SPEED):
    d = d - d.mean()
    d = highpass(d, sr)
    d = d / (np.abs(d).max() + 1e-9)
    if speed != 1.0:
        n = int(len(d) / speed)
        d = np.interp(np.linspace(0, len(d) - 1, n), np.arange(len(d)), d)
    # Gate: zero anything quieter than the threshold in 10 ms blocks, keep a little pad.
    blk = sr // 100
    env = np.array([np.abs(d[i : i + blk]).max() for i in range(0, len(d), blk)])
    thr = 10 ** (gate_db / 20)
    keep = np.repeat(env > thr, blk)[: len(d)]
    pad = int(sr * PAD_MS / 1000)
    keep = np.convolve(keep.astype(float), np.ones(2 * pad + 1), mode="same") > 0
    d = d * keep
    # Drive, anti-alias, then down to the chip rate with sample-and-hold, then quantize.
    d = np.tanh(d * drive) / np.tanh(drive)
    step = max(1, int(round(sr / rate)))
    d = lowpass(d, step)
    held = d[::step]
    d = np.repeat(held, step)[: len(d)]
    levels = 2 ** (bits - 1)
    d = np.round(d * levels) / levels
    d = d * keep[: len(d)] if len(keep) >= len(d) else d
    # Trim silence at both ends.
    nz = np.nonzero(np.abs(d) > 1e-6)[0]
    if len(nz):
        d = d[max(0, nz[0] - pad) : nz[-1] + pad]
    return d


def encode(path_wav, name):
    for ext, args in (("ogg", ["-c:a", "libvorbis", "-q:a", "4"]), ("mp3", ["-b:a", "96k"])):
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", path_wav, *args, os.path.join(OUT, f"{name}.{ext}")], check=True)


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    rendered = []
    for path in sorted(glob.glob(os.path.join(VOICE, "*.wav"))):
        name = os.path.splitext(os.path.basename(path))[0]
        if name.startswith("music") or name.startswith("melody"):
            continue  # tunes go through the pitch tracker, not the crusher
        sr, d = read_wav(path)
        c = crush(d, sr)
        out = resample(c, sr, SR_OUT) * 0.9
        tmp = os.path.join(OUT, f"voice_{name}.wav")
        write_wav(tmp, out, SR_OUT)
        encode(tmp, f"voice_{name}")
        os.remove(tmp)
        rendered.append((name, out))
        print(f"voice_{name}: {len(out) / SR_OUT:.2f}s")
    if len(sys.argv) > 1:
        gap = np.zeros(int(0.6 * SR_OUT))
        write_wav(sys.argv[1], np.concatenate([x for _, b in rendered for x in (b, gap)]), SR_OUT)
        print("sampler order:", [n for n, _ in rendered])
