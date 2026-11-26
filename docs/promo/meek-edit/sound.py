"""The edit's sound, from cleared parts only.

Voice: the app's own KJV narration (audio.purifyapp.net/read, voice af_heart),
four fragments of John 18 placed where the reference's four lines fall.
Ambience: wind (CC0) and sea (public domain), as in public/audio/ambience.
Bell: the app's first-party synthesised bell (public/audio/ambience/bell.mp3).
Hits, ticks, rushes and the held note (an ison on D and A): synthesised here.
Mastered to -14 LUFS, true peak under -1 dBTP.

  python sound.py [OUT.wav]          (default .promo/meek-edit/sound.wav)
"""
import json, os, subprocess, sys
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

SR = 48000
DUR = 558 / 30
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
ROOT = os.environ.get("MEEK_WORK") or os.path.join(REPO, ".promo", "meek-edit")  # out of git
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "sound.wav")
rng = np.random.default_rng(11)

def read(path, ss=None, t=None):
    cmd = ["ffmpeg", "-v", "error"]
    if ss is not None:
        cmd += ["-ss", f"{ss:.3f}"]
    if t is not None:
        cmd += ["-t", f"{t:.3f}"]
    cmd += ["-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"]
    return np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, np.float32).copy()

def bp(x, lo, hi, order=4):
    return sosfilt(butter(order, [lo, hi], btype="band", fs=SR, output="sos"), x)

def hp(x, f, order=2):
    return sosfilt(butter(order, f, btype="high", fs=SR, output="sos"), x)

def lp(x, f, order=2):
    return sosfilt(butter(order, f, btype="low", fs=SR, output="sos"), x)

def db(x):
    return 10 ** (x / 20)

def fade(x, a=0.01, b=0.01):
    n = len(x)
    na, nb = int(a * SR), int(b * SR)
    if na:
        x[:na] *= np.linspace(0, 1, na) ** 2
    if nb:
        x[-nb:] *= np.linspace(1, 0, nb) ** 2
    return x

def ir(rt60, length, damp_hz, seed, pre=0.015):
    r = np.random.default_rng(seed)
    n = int(length * SR)
    t = np.arange(n) / SR
    env = np.exp(-6.91 * t / rt60)
    L = lp(r.standard_normal(n) * env, damp_hz)
    R = lp(r.standard_normal(n) * env, damp_hz)
    pad = np.zeros(int(pre * SR))
    L, R = np.concatenate([pad, L]), np.concatenate([pad, R])
    L /= np.sqrt((L ** 2).sum()); R /= np.sqrt((R ** 2).sum())
    return L, R

HALL = ir(2.8, 3.5, 5000, 1)
ROOM = ir(0.7, 1.0, 7000, 2)

def verb(x, which, wet):
    L, R = which
    yl = fftconvolve(x, L)[: len(x)]
    yr = fftconvolve(x, R)[: len(x)]
    return np.stack([x * (1 - wet) + yl * wet, x * (1 - wet) + yr * wet])

N = int(DUR * SR)
voice = np.zeros(N); fx = np.zeros(N); bed = np.zeros(N); amb = np.zeros((2, N))

def put(track, x, at):
    i = int(round(at * SR))
    j = min(len(track), i + len(x))
    if j > i:
        track[i:j] += x[: j - i]

# ---------------------------------------------------------------- voice
john = os.path.join(ROOT, "aud", "john_18.mp3")
lines = json.load(open(os.path.join(HERE, "lines.json")))
for ln in lines:
    seg = read(john, ln["from"], ln["to"] - ln["from"])
    seg = hp(seg, 85)
    seg = fade(seg, 0.012, 0.05)
    put(voice, seg, ln["at"] - (ln["first_word"] - ln["from"]))
vpk = np.abs(voice).max()
voice = voice / vpk * db(-6)

# ---------------------------------------------------------------- the held note (an ison: D and A), first party
# Sung-like, not organ-like: harmonics shaped by an "oo" vowel, a slow vibrato and a few
# detuned voices. It sits from 147 Hz up, where a phone's speaker can play it.
t = np.arange(N) / SR
def voice_tone(f0, amp, seed):
    r = np.random.default_rng(seed)
    out = np.zeros(N)
    for v in range(5):
        cents = r.uniform(-6, 6)
        f = f0 * 2 ** (cents / 1200)
        vib = 1 + 0.003 * np.sin(2 * np.pi * r.uniform(4.6, 5.4) * t + r.uniform(0, 6.28))
        ph = 2 * np.pi * np.cumsum(f * vib) / SR
        for h in range(1, 13):
            fh = f * h
            # "oo": formants near 300 Hz and 870 Hz, a gentle fall above
            w = np.exp(-((fh - 420) / 200) ** 2) + 0.75 * np.exp(-((fh - 1000) / 320) ** 2) + 0.22 * np.exp(-((fh - 2500) / 600) ** 2)
            out += w / (1 + 0.15 * h) * np.sin(h * ph + r.uniform(0, 6.28))
    breath = 1 + 0.08 * np.sin(2 * np.pi * 0.11 * t + seed)
    return amp * out * breath
note = voice_tone(146.83, 1.0, 3) + voice_tone(220.0, 0.6, 4)
note = hp(lp(note, 3200), 110)
envb = np.clip(t / 0.25, 0, 1) ** 2
envb *= 0.75 + 0.25 * np.clip((t - 4.6) / 0.4, 0, 1)        # it opens a little when the wilderness comes
envb *= np.clip((16.95 - t) / 0.45, 0, 1)                    # the dim takes it away
bed = note * envb
bed = bed / np.abs(bed).max() * db(-20)
# a rising breath into the first cut
sw = int(1.3 * SR)
tt = np.arange(sw) / SR
swell = bp(rng.standard_normal(sw), 500, 4000) * (tt / 1.3) ** 3 * db(-30)
# ---------------------------------------------------------------- hits on the big cuts
def boom(level):
    n = int(2.2 * SR)
    tt = np.arange(n) / SR
    f = 44 + 30 * np.exp(-tt / 0.16)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = 0.5 * np.sin(ph) * np.exp(-tt / 0.5) * np.clip(tt / 0.004, 0, 1)
    thump = 0.6 * np.sin(2 * np.pi * 150 * tt) * np.exp(-tt / 0.07) + 0.35 * np.sin(2 * np.pi * 310 * tt) * np.exp(-tt / 0.04)
    click = bp(rng.standard_normal(n), 1500, 6000) * np.exp(-tt / 0.02) * 0.45
    return (body + thump + click) * db(level)

for at in (1.367, 4.633, 7.833, 10.967, 14.100):
    put(fx, boom(-10), at)

# ticks on the ink flashes
def tick(level):
    n = int(0.25 * SR)
    tt = np.arange(n) / SR
    s = bp(rng.standard_normal(n), 1400, 6500) * np.exp(-tt / 0.018)
    s += 0.8 * np.sin(2 * np.pi * 95 * tt) * np.exp(-tt / 0.05)
    return s * db(level)

for at in (1.700, 2.000, 2.300, 3.067, 3.433, 3.700, 3.967):
    put(fx, tick(-17), at)

# whooshes into the warp and the two whips
def whoosh(d, peak_at, level):
    n = int(d * SR)
    tt = np.arange(n) / SR
    noise = rng.standard_normal(n)
    out = np.zeros(n)
    # a band that rises: build it from short filtered blocks
    blk = int(0.02 * SR)
    for i in range(0, n, blk):
        k = i / n
        fc = 350 + 2600 * k ** 1.5
        out[i:i + blk] = bp(noise[max(0, i - 2048):i + blk], fc * 0.6, min(fc * 1.6, 20000))[-len(out[i:i + blk]):]
    env = np.where(tt < peak_at, (tt / peak_at) ** 2, np.exp(-(tt - peak_at) / 0.08))
    return out * env * db(level)

put(fx, swell, 1.367 - 1.3)
put(fx, whoosh(0.45, 0.30, -16), 7.833 - 0.30)
put(fx, whoosh(0.42, 0.27, -14), 10.967 - 0.27)
put(fx, whoosh(0.42, 0.27, -14), 14.100 - 0.27)
put(fx, whoosh(0.30, 0.12, -22), 4.633 - 0.12)

# ---------------------------------------------------------------- ambience (cleared recordings)
def bed_clip(name, start, dur, fi, fo, level):
    x = read(os.path.join(REPO, "public", "audio", "ambience", name), 2.0, dur + 0.2)[: int(dur * SR)]
    x = fade(x.copy(), fi, fo)
    x = x / (np.sqrt((x ** 2).mean()) + 1e-9) * db(level)
    i = int(start * SR)
    amb[0, i:i + len(x)] += x
    amb[1, i:i + len(x)] += np.roll(x, 480)  # a hair of width

bed_clip("wind.mp3", 0.00, 4.75, 0.20, 0.30, -36)
bed_clip("wind.mp3", 4.70, 3.15, 0.25, 0.30, -29)
bed_clip("sea.mp3", 7.80, 3.20, 0.30, 0.25, -26)
bed_clip("wind.mp3", 11.05, 5.75, 0.6, 0.5, -35)

# ---------------------------------------------------------------- the bell under the name
bell = read(os.path.join(REPO, "public", "audio", "ambience", "bell.mp3"), 31.95, 3.0)
bell = fade(bell.copy(), 0.002, 0.6)
bell = bell / np.abs(bell).max() * db(-7)
put(fx, bell, 17.07 - 0.05)

# ---------------------------------------------------------------- mix
V = verb(voice, ROOM, 0.12)
B = verb(bed, HALL, 0.45)
F = verb(fx, HALL, 0.28)
mix = V + 0.9 * B + F + amb
# the voice is never covered: the bed and ambience dip while a line is spoken
venv = np.abs(voice)
k = int(0.05 * SR)
venv = np.convolve(venv, np.ones(k) / k, mode="same")
duck = 1 - 0.45 * np.clip(venv / (venv.max() * 0.25), 0, 1)
mix = V + (0.9 * B + amb) * duck + F
# end: everything gone by the last frame
tail = np.clip((DUR - t) / 0.35, 0, 1)
mix *= tail
pk = np.abs(mix).max()
mix = mix / pk * db(-3)
raw = OUT.replace(".wav", "_raw.wav")
import soundfile as sf
sf.write(raw, mix.T.astype(np.float32), SR, subtype="FLOAT")
print("raw", raw, "peak", pk)
# master: to -14 LUFS integrated, true peak under -1 dBTP (measured: -14.0 LUFS, -1.4 dBTP)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", raw, "-af",
                "volume=6.9dB,alimiter=limit=0.84:attack=2:release=90:level=disabled:asc=1,aresample=48000",
                "-c:a", "pcm_s24le", OUT], check=True)
print("mix", OUT)
