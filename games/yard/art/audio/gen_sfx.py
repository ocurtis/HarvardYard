#!/usr/bin/env python3
"""Sound effects, synthesized on the chip voices. Renders each cue to
public/audio/sfx/<name>.(ogg|mp3) and a sampler to the scratch dir if asked.

  python3 games/yard/art/audio/gen_sfx.py              # render all cues
  python3 games/yard/art/audio/gen_sfx.py sampler.wav  # also write one file with every cue in order
"""
import os
import subprocess
import sys
import wave

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "shared", "art", "audio"))
from synth import SR, adsr, bell, freq, noise  # noqa: E402

OUT = os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "public", "yard", "audio", "sfx")


def sweep(f0, f1, dur, duty=0.5, vol=0.3, env=(0.002, 0.02, 0.8, 0.03), curve="lin"):
    """A pulse whose pitch slides from f0 to f1 over dur."""
    t = np.arange(int(dur * SR)) / SR
    if curve == "exp":
        f = f0 * (f1 / f0) ** (t / dur)
    else:
        f = f0 + (f1 - f0) * t / dur
    ph = np.cumsum(f) / SR
    w = np.where((ph % 1.0) < duty, 1.0, -1.0)
    return w * adsr(len(t), *env) * vol


def tone(f, dur, duty=0.5, vol=0.3, env=(0.002, 0.03, 0.7, 0.04)):
    return sweep(f, f, dur, duty, vol, env)


def seq(parts):
    """Concatenate (sample, gap_seconds) pairs."""
    out = []
    for s, gap in parts:
        out.append(s)
        out.append(np.zeros(int(gap * SR)))
    return np.concatenate(out)


def mix(*samples):
    n = max(len(s) for s in samples)
    out = np.zeros(n)
    for s in samples:
        out[: len(s)] += s
    return out


def tri_thud(f, dur, vol=0.4):
    t = np.arange(int(dur * SR)) / SR
    fr = f * np.exp(-t * 18) + 30
    ph = np.cumsum(fr) / SR
    w = 2 * np.abs(2 * (ph % 1.0) - 1) - 1
    return w * np.exp(-t * 9) * vol


CUES = {}


def cue(name):
    def deco(fn):
        CUES[name] = fn
        return fn
    return deco


@cue("shout")
def shout():
    # Held sermon, candidate A: a low 25% pulse, two octaves under the old one, with a
    # slow vibrato and a soft noise breath on top. 0.8s loop.
    t = np.arange(int(0.8 * SR)) / SR
    f = 110 * (1 + 0.012 * np.sin(2 * np.pi * 5 * t))
    ph = np.cumsum(f) / SR
    w = np.where((ph % 1.0) < 0.25, 1.0, -1.0)
    body = w * adsr(len(t), 0.03, 0.1, 0.9, 0.05) * 0.09
    breath = noise(0.8, vol=0.03, env=(0.05, 0.2, 0.8, 0.05))
    return body + breath


@cue("shout_b")
def shout_b():
    # Candidate B: triangle drone (soft) with a quiet pulse ticking every 1/8s, like a
    # preacher's cadence. 1.0s loop.
    t = np.arange(int(1.0 * SR)) / SR
    tri_w = 2 * np.abs(2 * ((t * 147) % 1.0) - 1) - 1
    drone = tri_w * adsr(len(t), 0.05, 0.1, 0.9, 0.05) * 0.08
    out = drone.copy()
    for k in range(8):
        tick = tone(220 if k % 2 == 0 else 196, 0.06, duty=0.125, vol=0.05, env=(0.002, 0.02, 0.5, 0.03))
        i = int(k * 0.125 * SR)
        out[i : i + len(tick)] += tick[: max(0, len(out) - i)]
    return out


@cue("shout_c")
def shout_c():
    # Candidate C: low-passed noise "shh" with a slow swell, almost no pitch. 0.9s loop.
    n = int(0.9 * SR)
    rng = np.random.default_rng(11)
    w = rng.normal(0, 1, n)
    w = np.convolve(w, np.ones(24) / 24, mode="same")
    t = np.arange(n) / SR
    return w * (0.6 + 0.4 * np.sin(2 * np.pi * 1.1 * t)) * 0.25


@cue("brochure")
def brochure():
    return seq([(tone(freq("E5"), 0.07, vol=0.25), 0.0), (tone(freq("A5"), 0.12, vol=0.25, env=(0.002, 0.04, 0.6, 0.06)), 0)])


@cue("paid")
def paid():
    # Coin arpeggio: four rising notes, 12.5% duty, bright.
    return seq([(tone(freq(n), 0.06, duty=0.125, vol=0.25), 0.0) for n in ("A5", "C#6", "E6")] + [(tone(freq("A6"), 0.16, duty=0.125, vol=0.25, env=(0.002, 0.05, 0.6, 0.08)), 0)])


@cue("stormout")
def stormout():
    # Descending raspberry: a 50% pulse sliding down with noise on top.
    return mix(sweep(freq("A4"), freq("A2"), 0.35, duty=0.5, vol=0.25, curve="exp"), noise(0.35, vol=0.08, env=(0.01, 0.1, 0.5, 0.1), lo=True))


@cue("bounty")
def bounty():
    return tone(freq("E6"), 0.04, duty=0.125, vol=0.18, env=(0.001, 0.01, 0.6, 0.02))


@cue("zipper")
def zipper():
    # A fast downward buzz: the windup.
    return sweep(1800, 300, 0.18, duty=0.125, vol=0.2, env=(0.002, 0.02, 0.8, 0.02), curve="exp")


@cue("stream")
def stream():
    # Filtered hiss, 0.5s loop. Low-passed noise with a slight warble.
    n = int(0.5 * SR)
    rng = np.random.default_rng(3)
    w = rng.normal(0, 1, n)
    k = 12
    w = np.convolve(w, np.ones(k) / k, mode="same")
    t = np.arange(n) / SR
    return w * (0.9 + 0.1 * np.sin(2 * np.pi * 7 * t)) * 0.35


@cue("stagger")
def stagger():
    return mix(tri_thud(160, 0.18, vol=0.4), noise(0.05, vol=0.15))


@cue("sober")
def sober():
    # The sad slide: a 50% pulse drooping down, then a low thud.
    return seq([(sweep(freq("E4"), freq("A3"), 0.3, vol=0.2, curve="exp"), 0.0), (tri_thud(90, 0.2, vol=0.3), 0)])


@cue("cup_throw")
def cup_throw():
    # Whoosh: noise swept by a rising filter, approximated with a rising sweep under noise.
    return mix(noise(0.25, vol=0.12, env=(0.02, 0.1, 0.5, 0.1)), sweep(200, 900, 0.25, duty=0.5, vol=0.06, env=(0.02, 0.05, 0.6, 0.1)))


@cue("cup_catch")
def cup_catch():
    return seq([(tone(freq("C5"), 0.04, vol=0.22), 0.0), (tone(freq("G5"), 0.08, vol=0.22, env=(0.002, 0.03, 0.5, 0.04)), 0)])


@cue("cup_land")
def cup_land():
    # Splat: noise burst plus a low thud, then a short dribble.
    return seq([(mix(noise(0.12, vol=0.3, env=(0.001, 0.05, 0.3, 0.06)), tri_thud(120, 0.25, vol=0.45)), 0.02), (noise(0.2, vol=0.08, env=(0.01, 0.1, 0.3, 0.1), lo=True), 0)])


@cue("wave_start")
def wave_start():
    # The tower tolls the wave in: the same big bell, three times, quiet.
    n, gap, vol = 3, 0.55, 0.16
    out = np.zeros(int((gap * (n - 1) + 2.4) * SR))
    for i in range(n):
        b = bell(freq("D3"), 2.2, vol=vol, big=True)
        at = int(i * gap * SR)
        out[at : at + len(b)] += b[: max(0, len(out) - at)]
    return out


@cue("finals")
def finals():
    # The big bell alone, once, with a long ring.
    return bell(freq("D2"), 2.2, vol=0.4, big=True)


@cue("statue_low")
def statue_low():
    # Alarm pulse: two short low pulses.
    return seq([(tone(freq("A2"), 0.09, duty=0.25, vol=0.2), 0.08), (tone(freq("A2"), 0.09, duty=0.25, vol=0.2), 0)])


@cue("lose")
def lose():
    return seq([(bell(freq("D2"), 2.5, vol=0.4, big=True), 0.6), (sweep(freq("D3"), freq("D2"), 0.6, vol=0.15, curve="exp"), 0)])


@cue("win")
def win():
    # A full peal: bass bell, then the mid figure fast, then a high ring.
    parts = [(bell(freq("D3"), 1.5, vol=0.3, big=True), 0.25)]
    for n in ("D4", "F#4", "A4", "D5", "A4", "F#4", "A4", "D5"):
        parts.append((bell(freq(n), 0.9, vol=0.18), 0.11))
    parts.append((bell(freq("D5"), 2.0, vol=0.2), 0))
    return seq(parts)


def chug(f, dur, vol=0.3):
    """One palm-muted power-chord stab: a 50% pulse and its fifth, hard clipped,
    with a fast decay and a noise click on the pick attack."""
    t = np.arange(int(dur * SR)) / SR
    w = np.where(((t * f) % 1.0) < 0.5, 1.0, -1.0) + 0.7 * np.where(((t * f * 1.5) % 1.0) < 0.5, 1.0, -1.0)
    w = np.tanh(w * 2.2)
    env = np.exp(-t * 22) * (t < dur)
    body = w * env * vol
    return mix(body, noise(min(0.02, dur), vol=0.12))


@cue("amp_riff")
def amp_riff():
    # The Amp at work: a death-metal blast beat under a tremolo-picked low riff on the
    # chip. 180 BPM, one bar of 4/4 = 1.333s, loops. Kick on every 8th, snare (noise
    # burst) on the off-8ths, chugs on 16ths walking E1 - F1 - E1 - D#1 (a tritone's
    # worth of menace, on the chip's lowest usable pulse).
    bpm = 180
    beat = 60 / bpm
    bar = 4 * beat
    out = np.zeros(int(bar * SR))

    def put(sample, at):
        i = int(at * SR)
        j = min(len(out), i + len(sample))
        out[i:j] += sample[: j - i]

    riff = ["E2", "E2", "F2", "E2", "E2", "E2", "D#2", "E2", "E2", "E2", "F2", "F#2", "E2", "E2", "D#2", "D2"]
    for k, n in enumerate(riff):
        put(chug(freq(n) / 2, beat / 4 * 0.95, vol=0.22), k * beat / 4)
    for k in range(8):
        put(tri_thud(70, 0.09, vol=0.5), k * beat / 2)  # kick, every 8th
        if k % 2 == 1:
            put(noise(0.07, vol=0.22, env=(0.001, 0.03, 0.2, 0.03)), k * beat / 2)  # snare
    for k in range(16):
        put(noise(0.02, vol=0.05), k * beat / 4)  # hat on 16ths
    return np.clip(out, -1, 1)


@cue("amp_hum")
def amp_hum():
    # The Amp idling: a 60-cycle hum with a faint feedback whine riding on it, 1.2s loop.
    t = np.arange(int(1.2 * SR)) / SR
    hum = np.sin(2 * np.pi * 60 * t) * 0.5 + np.sin(2 * np.pi * 120 * t) * 0.25
    hum = np.tanh(hum * 1.5) * 0.12
    whine_f = freq("E5") * (1 + 0.004 * np.sin(2 * np.pi * 0.8 * t))
    whine = np.sin(2 * np.pi * np.cumsum(whine_f) / SR) * 0.03 * (0.7 + 0.3 * np.sin(2 * np.pi * 1.7 * t))
    return hum + whine


@cue("amp_build")
def amp_build():
    # Plugging in: a pop, the hum rising, and one open low E ringing out.
    pop = mix(noise(0.03, vol=0.3), tri_thud(90, 0.08, vol=0.4))
    rise = sweep(40, 60, 0.3, duty=0.5, vol=0.08, env=(0.05, 0.05, 0.9, 0.05))
    ring = chug(freq("E2") / 2, 1.1, vol=0.3)
    t = np.arange(len(ring)) / SR
    ring = ring / (np.exp(-t * 22) + 1e-6) * np.exp(-t * 2.2)  # swap the chug's fast decay for a long ring
    return seq([(pop, 0.0), (rise, 0.0), (np.clip(ring, -1, 1), 0)])


def write_wav(path, buf):
    buf = np.clip(buf, -1, 1)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((buf * 32767).astype(np.int16).tobytes())


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    rendered = {}
    for name, fn in CUES.items():
        buf = fn()
        rendered[name] = buf
        path = os.path.join(OUT, f"{name}.wav")
        write_wav(path, buf)
        for ext, args in (("ogg", ["-c:a", "libvorbis", "-q:a", "4"]), ("mp3", ["-b:a", "96k"])):
            subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", path, *args, os.path.join(OUT, f"{name}.{ext}")], check=True)
        os.remove(path)
        print(f"{name}: {len(buf) / SR:.2f}s")
    if len(sys.argv) > 1:
        sampler = seq([(rendered[n], 0.7) for n in CUES])
        write_wav(sys.argv[1], sampler)
        print("sampler:", list(CUES))
