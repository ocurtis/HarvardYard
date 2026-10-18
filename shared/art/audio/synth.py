"""Chip synth for Yard Defense music: 2 pulse + triangle + noise, plus a bell voice
(two detuned pulses + triangle body, long decay). Pure numpy; renders to WAV.
Originally: candidate A "Sunday in the Yard".
Chip-style render: 2 pulse + triangle + noise, plus a bell voice built from the
same parts (two detuned pulses, fast attack, long decay, triangle body).
84 BPM, D major, 8-bar loop played twice (~46s)."""
import numpy as np
import wave

SR = 44100

NOTES = {n: i for i, n in enumerate(["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"])}


def freq(name):
    n, octv = name[:-1], int(name[-1])
    return 440 * 2 ** ((NOTES[n] - 9) / 12 + (octv - 4))


def pulse(f, dur, duty=0.5, vol=0.2, env=(0.005, 0.1, 0.6, 0.1), vib=0.0):
    t = np.arange(int(dur * SR)) / SR
    ph = (t * f + (vib * np.sin(2 * np.pi * 5.5 * t) if vib else 0)) % 1.0
    w = np.where(ph < duty, 1.0, -1.0)
    return w * adsr(len(t), *env) * vol


def tri(f, dur, vol=0.25, env=(0.005, 0.05, 0.8, 0.08)):
    t = np.arange(int(dur * SR)) / SR
    w = 2 * np.abs(2 * ((t * f) % 1.0) - 1) - 1
    # 4-bit staircase like the NES triangle
    w = np.round(w * 7.5) / 7.5
    return w * adsr(len(t), *env) * vol


def noise(dur, vol=0.08, env=(0.001, 0.03, 0.0, 0.02), lo=False):
    n = int(dur * SR)
    rng = np.random.default_rng(7)
    w = rng.choice([-1.0, 1.0], size=n)
    if lo:
        w = np.repeat(w[: n // 8 + 1], 8)[:n]
    return w * adsr(n, *env) * vol


def bell(f, dur, vol=0.22, big=False):
    """Two pulses a few cents apart + triangle body, long decay, tiny clank."""
    t = np.arange(int(dur * SR)) / SR
    decay = 2.8 if big else 1.6
    env = np.exp(-t / decay) * np.minimum(1, t / 0.004)
    a = np.where(((t * f) % 1.0) < 0.5, 1.0, -1.0)
    b = np.where(((t * f * 1.004) % 1.0) < 0.25, 1.0, -1.0)
    body = 2 * np.abs(2 * ((t * f / 2) % 1.0) - 1) - 1
    w = 0.45 * a + 0.3 * b + 0.5 * body
    clank = noise(min(dur, 0.03), vol=0.5)
    w[: len(clank)] += clank
    return w * env * vol


def adsr(n, a, d, s, r):
    t = np.arange(n) / SR
    total = n / SR
    env = np.ones(n) * s
    ai = int(a * SR)
    di = int(d * SR)
    ri = int(r * SR)
    env[:ai] = np.linspace(0, 1, ai) if ai else env[:ai]
    env[ai : ai + di] = np.linspace(1, s, di)[: max(0, min(di, n - ai))]
    if ri and ri < n:
        env[-ri:] *= np.linspace(1, 0, ri)
    return env


def place(buf, sample, at):
    i = int(at * SR)
    j = min(len(buf), i + len(sample))
    buf[i:j] += sample[: j - i]


