#!/usr/bin/env python3
"""Promo edit 3, the Cradle, fourth cut: a cut on every half beat, and nothing that bounces.

His words on the third cut (2026-11-25): "that certain "bounce" (that very first bounce in that repeats) techniche is
very vibe coded. and the pacing is very slow and the text bouncing in has the same bounce effect that is very
vibecoded (strict rule)". So: nothing pops and settles (CLAUDE.md, "No bounce"); every move runs at a steady speed;
pace comes from cuts, one on every half beat (about 0.3 s), as reference 3 swaps its faces.
  I, the night (reference 1): black and white in a widescreen band, film grain; a cut on every half beat, each bar
     line inside a strike of light; in the dark breaks each half beat is a strike that shows a face and gives it back.
  The drop: white, and the band opens to the full screen on her eye.
  II, the Mother (reference 2): a cut on every half beat, each bar's first shot wider than the last, a flash of white
     on each bar line; crush and strobe on the song's stops; after the stop the whole icon in steps, closer each half beat.
  III, the light (reference 3): the words in ink on white, a line on each beat and the question a word on each beat,
     a picture beside them changing on every half beat; the faces cut on every half beat; a whip at a steady speed into
     the question; a fade; the cross and the name typed under it.
Never: rays, sparkle, glow behind words or the mark, parchment, bounce.

Run from the repository root, with a Python that has numpy, opencv-python-headless and pillow:
  python edit.py <work> still <seconds> [...]   stills into <work>/stills/
  python edit.py <work> sheet [seconds ...]     stills in one picture
  python edit.py <work> render <sound.mp3>      every frame, then <work>/out/the-cradle.mp4
  python edit.py <work> check                   the words against data/bible, and an event for every half beat
<work> holds raw/ (the pictures, out of git) and font/ (DM Sans 400, 500, 700).
"""
import json, math, os, subprocess, sys
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont

W, H, FPS = 1080, 1920, 60
N = 3400  # 56.667 s: the sound is 56.66 s
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
BAND_Y, BAND_H = 580, 760          # the night's widescreen band (reference 1: a 1080 by 740 picture in a 9:16 frame)

SRC = {
    "elgreco": "raw/met_436570.jpg",       # El Greco, The Adoration of the Shepherds, about 1605 to 1610. The Met, 05.42
    "vladimir": "raw/vladimir_rm302.jpg",  # Our Lady of Vladimir, Moscow, mid 16th century, in its silver cover. Russian Museum, DRZh-302
    "berlinghiero": "raw/met_435658.jpg",  # Berlinghiero, Madonna and Child, 1230s. The Met
    "hodegetria14": "raw/rm_3124.jpg",     # Hodegetria of Smolensk, end of the 14th century. Russian Museum, DRZh-3124
    "bellini65": "raw/met_459023.jpg",     # Giovanni Bellini, Madonna and Child, about 1465. The Met (Robert Lehman Collection)
    "hodegetria15": "raw/rm_987.jpg",      # Hodegetria, Suzdal, end of the 15th century. Russian Museum, DRZh-987
    "bellini": "raw/met_435641.jpg",       # Giovanni Bellini, Madonna and Child, late 1480s. The Met
    "smolensk16": "raw/rm_1871.jpg",       # Hodegetria of Smolensk, mid to late 16th century. Russian Museum, DRZh-1871
    "kazan": "raw/rm_623.jpg",             # Our Lady of Kazan, 17th century. Russian Museum, DRZh-623
}

# The words, in capitals as reference 3 sets them; asserted against data/bible without regard to case.
WORDS = {
    "isaiah92": ("O PEOPLE\nWALKING IN\nDARKNESS,\nBEHOLD A\nGREAT LIGHT", "Isaiah 9:2", ("isaiah", 9, 2)),
    "isaiah96": ("FOR A CHILD\nIS BORN TO US,\nAND A SON IS\nGIVEN TO US", "Isaiah 9:6", ("isaiah", 9, 6)),
    "matthew1615": ("BUT WHOM\nSAY YE THAT\nI AM?", "Matthew 16:15", ("matthew", 16, 15)),
}


def check_words():
    for key, (line, cite, (book, ch, v)) in WORDS.items():
        verse = next(x["text"] for x in json.load(open(f"{ROOT}/data/bible/{book}/{ch}.json"))["verses"] if x["n"] == v)
        flat = " ".join(line.split()).lower()
        assert flat in verse.lower(), f"{key}: {flat!r} is not in {book} {ch}:{v}: {verse!r}"
    return True


# ---------------------------------------------------------------- easing and time
def bezier(x1, y1, x2, y2):
    def f(t):
        if t <= 0: return 0.0
        if t >= 1: return 1.0
        u = t
        for _ in range(12):
            bx = 3 * (1 - u) ** 2 * u * x1 + 3 * (1 - u) * u ** 2 * x2 + u ** 3 - t
            dx = 3 * (1 - u) ** 2 * x1 + 6 * (1 - u) * u * (x2 - x1) + 3 * u ** 2 * (1 - x2)
            if abs(dx) < 1e-6: break
            u = min(1.0, max(0.0, u - bx / dx))
        return 3 * (1 - u) ** 2 * u * y1 + 3 * (1 - u) * u ** 2 * y2 + u ** 3
    return f

SYM = bezier(0.37, 0, 0.63, 1)     # a drift inside a shot
HOUSE = bezier(0.22, 1, 0.36, 1)   # --ease-house: an arrival that lands


def first(t):
    """The frame that holds time t: a cut lands on its beat's frame, never after it."""
    return math.floor(t * FPS + 1e-6)


def ramp(t, segs, v0):
    """segs: (t0, t1, a, b, ease). The value holds the first a before the first t0, and b after each t1."""
    v = segs[0][2] if segs else v0
    for (t0, t1, a, b, e) in segs:
        if t >= t1: v = b
        elif t >= t0: v = a + (b - a) * e((t - t0) / (t1 - t0))
        else: break
    return v


# ---------------------------------------------------------------- the beats
# Every beat of the song, tracked from its own drums and snapped to its onset (librosa, about 6 ms): 94 beats, the bar
# lines falling on the drop (18.53 s). His word (2026-11-25): "I wanted every beat to have a retention point (image
# switch, movement, transition or something etc, image cut)". So each beat below starts something.
BEATS_ALL = [0.209, 0.795, 1.393, 1.985, 2.572, 3.17, 3.756, 4.342, 4.934, 5.526, 6.118, 6.716, 7.303, 7.895, 8.487,
             9.085, 9.665, 10.257, 10.855, 11.436, 12.028, 12.626, 13.212, 13.804, 14.396, 14.988, 15.581, 16.167,
             16.765, 17.357, 18.007, 18.53, 19.18, 19.72, 20.312, 20.904, 21.496, 22.082, 22.674, 23.266, 23.853,
             24.433, 25.037, 25.629, 26.221, 26.807, 27.44, 27.992, 28.543, 29.176, 29.739, 30.36, 30.952, 31.539,
             32.148, 32.705, 33.315, 33.907, 34.458, 35.045, 35.683, 36.27, 36.879, 37.448, 38.04, 38.609, 39.259,
             39.816, 40.414, 41.001, 41.593, 42.179, 42.818, 43.328, 43.961, 44.577, 45.134, 45.708, 46.301, 46.881,
             47.502, 48.094, 48.686, 49.238, 49.865, 50.457, 51.072, 51.635, 52.233, 52.808, 53.418, 54.004, 54.596,
             55.107]
BASS_IN = [2.281, 11.738]   # the bass comes in off the beat, twice in the build: each gets its own strike

# ---------------------------------------------------------------- the looks
NIGHT = dict(band=True, sat=0.06, soft=0.6, floor=0.18, gain=1.55, gamma=0.66, grain=0.050, vignette=True, r=0.56)
MOTHER = dict(sat=0.88, soft=0.0, floor=0.30, gain=1.18, gamma=0.95, grain=0.020, r=0.70)
LIGHT = dict(sat=1.0, soft=0.0, floor=0.42, gain=1.20, gamma=0.85, grain=0.018, r=0.80)   # colour inserts in Chapter III

# The details each chapter cuts between: centre and width in source pixels.
NIGHT_CROPS = {  # El Greco, in the widescreen band
    "W": (1250, 1900, 2200), "SK": (1100, 720, 1350), "CH": (1050, 640, 700), "SA": (430, 1320, 800),
    "SP": (880, 1450, 620), "SY": (1060, 1480, 600), "KF": (450, 3200, 820), "MJ": (1650, 1630, 1000),
    "JF": (1790, 1650, 600), "MF": (1530, 1585, 600), "LB": (1100, 3050, 850), "MH": (1310, 2200, 1000),
    "CC": (1250, 2310, 760), "CX": (1150, 2320, 480),
}
NIGHT_GAIN = {"CC": 1.05, "CX": 0.92, "LB": 0.80, "MH": 1.30, "KF": 1.75}   # the Child and the lamb are the brightest paint
MOTHER_CROPS = {  # the Vladimir in its silver cover, full screen
    "E1": (2330, 1960, 700), "E2": (2380, 1900, 520), "CF": (2250, 2230, 560), "FF": (2420, 2100, 1150),
    "EN": (1650, 1600, 800), "MD": (1200, 1250, 700), "EM": (2700, 2600, 1100), "HN": (2980, 2850, 800),
    "TS": (2650, 3500, 1800), "GM": (2640, 3800, 700), "FT": (2900, 4560, 900), "SH": (2640, 2700, 2600),
    "HD": (1650, 3900, 900), "SV": (600, 3000, 1000), "FH": (2635, 3000, 3375),
}

# ---------------------------------------------------------------- the half beats
HALF = []
for k, b in enumerate(BEATS_ALL):
    HALF.append(b)
    if k + 1 < len(BEATS_ALL):
        HALF.append(round((b + BEATS_ALL[k + 1]) / 2, 3))
BARS_NIGHT = [1.985, 4.342, 6.716, 9.085, 13.804, 16.167]   # bar lines of the build (the bars fall on the drop)
BASS_IN_SLOT = [2.278, 11.732]                              # the two bass entries fall on half beats
BARS_MOTHER = [18.530, 20.904, 23.266, 25.629, 27.992, 30.360]

# The night cuts through El Greco's picture in this order, again and again; a jump is the same detail, closer.
NIGHT_SEQ = ["W", "SK", "SA", "SP", "SY", "CH", "KF", "MJ", "JF", "MF", "MH", "LB", "CC", "CX",
             "SA", "W", "SP", "MF", "JF", "SY", "SK", "CC", "MH", "CH", "KF", "MJ", "CX", "LB"]
NIGHT_REVEALS = ["JF", "SA", "MF", "SP", "SY", "MJ", "CH"]
NIGHT_CLOSING = [("CX", 0.80), ("MF", 0.66), ("CC", 0.52), ("JF", 0.40), ("CX", 0.30)]
# The Mother: each bar's first shot wider than the last bar's; the half beats between cut to details.
MOTHER_BAR = ["E1", "FF", "EM", "TS", "SH", "FH"]
MOTHER_SEQ = ["E2", "CF", "EN", "MD", "HN", "GM", "FT", "HD", "SV", "E2", "CF", "MD", "EN", "GM", "HN", "HD", "FT", "SV",
              "CF", "E2", "EN", "GM", "MD", "HD", "SV", "HN", "FT", "CF", "E2", "EN", "MD", "GM", "HN", "HD", "FT", "SV"]
WHOLE_STEP = 1.06

# The light: pictures that stand beside the words on white, changing on every half beat. (src, centre and width.)
WINDOW = (110, 960, 790, 540)    # x, y, width, height of the picture on the white page (clear of the buttons on the right)
WINDOW_SEQ = [
    ("vladimir", (2330, 1960, 900)), ("berlinghiero", (1886, 1578, 900)), ("elgreco", (1250, 2310, 820)),
    ("hodegetria14", (1917, 1640, 830)), ("vladimir", (1650, 1600, 900)), ("bellini65", (1708, 1500, 1000)),
    ("kazan", (1918, 1660, 700)), ("vladimir", (1200, 1250, 760)), ("bellini", (2243, 1430, 920)),
    ("smolensk16", (3020, 2030, 800)), ("vladimir", (2258, 2228, 640)), ("hodegetria15", (2098, 1700, 460)),
    ("vladimir", (2640, 3800, 900)), ("elgreco", (1530, 1590, 700)),
]
QUESTION_SEQ = [   # for the question: faces that look out at the one asked
    ("vladimir", (2330, 1960, 760)), ("kazan", (1918, 1660, 640)), ("hodegetria14", (1917, 1640, 760)),
    ("bellini65", (1708, 1500, 900)), ("smolensk16", (3020, 2030, 760)), ("berlinghiero", (1886, 1578, 820)),
    ("vladimir", (2258, 2228, 600)),
]
LIGHT_LINES = {   # the beats on which each line, or each word of the question, arrives
    "isaiah92": [37.448, 38.040, 38.609, 39.259, 39.816],
    "isaiah96": [46.881, 47.502, 48.094, 48.686],
    "matthew1615": [51.635, 52.233, 52.808, 53.418, 54.004],
}
END_T = N / FPS + 1


def slots(a, b):
    return [h for h in HALF if a - 1e-6 <= h < b - 1e-6]


def build():
    """Every segment of the film, one for each half beat, in order; and the strikes and flashes of light."""
    segs, flashes = [], []

    def pic(t0, t1, srcname, crop, look, push=0.05, **kw):
        cx, cy, cw = crop
        sg = dict(t0=t0, t1=t1, kind="pic", src=srcname, a=(cx, cy, cw), b=(cx + 0.012 * cw, cy - 0.006 * cw, cw * (1 - push)),
                  whole=False, **look)
        sg["pool"] = (cx, cy, look["r"])
        sg.update(kw)
        segs.append(sg)
        return sg

    # ---- I, the night
    times = [0.0] + slots(0.2, 18.53)
    n = 0
    for k, t0 in enumerate(times):
        t1 = times[k + 1] if k + 1 < len(times) else 18.53
        if 9.66 <= t0 < 11.73:        # the dark break: a strike shows a face, the dark takes it back
            key = NIGHT_REVEALS[(k) % len(NIGHT_REVEALS)]
            sg = pic(t0, t1, "elgreco", NIGHT_CROPS[key], NIGHT, gain=NIGHT_GAIN.get(key, NIGHT["gain"]))
            sg["light"] = [(t0, t0 + 0.26, 0.95, 0.0, lambda u: 1 - (1 - u) ** 2.2)]
            flashes.append((t0, 0.55, 0, 0.05, 0, "strike"))
            continue
        if t0 >= 16.62:               # the closing before the drop: each strike dimmer, then black for the pause
            idx = len([x for x in times if 16.62 <= x < t0])
            if idx < len(NIGHT_CLOSING) and t0 < 18.24:
                key, pk = NIGHT_CLOSING[idx]
                sg = pic(t0, t1, "elgreco", NIGHT_CROPS[key], NIGHT, gain=NIGHT_GAIN.get(key, NIGHT["gain"]))
                sg["light"] = [(t0, t0 + 0.26, pk, 0.0, lambda u: 1 - (1 - u) ** 2.2)]
                flashes.append((t0, 0.5 * pk, 0, 0.05, 0, "strike"))
            else:
                segs.append(dict(t0=t0, t1=t1, kind="black"))
            continue
        key = NIGHT_SEQ[n % len(NIGHT_SEQ)]
        n += 1
        crop = NIGHT_CROPS[key]
        if n % 4 == 0:                # a jump: the detail before it, closer, cut straight in
            px, py, pw = segs[-1]["b"]
            crop = (px, py, pw / 1.3)
            key = None
        sg = pic(t0, t1, "elgreco", crop, NIGHT, gain=NIGHT_GAIN.get(key, NIGHT["gain"]) if key else segs[-1]["gain"])
        if any(abs(t0 - b) < 0.02 for b in BARS_NIGHT + BASS_IN_SLOT):
            flashes.append((t0, 0.95, 2, 0.10, 0, "strike"))
        if 9.0 <= t0 < 9.66:          # the bass leaves: the light closes
            sg["light"] = [(9.665, 9.90, 1.0, 0.0, SYM)]
    flashes.append((0.0, 0.85, 0, 0.12, 0, "strike"))          # the film opens on a strike
    for t in (0.502, 3.47, 5.82, 7.6, 12.93, 15.28):           # flickers between the bar lines
        flashes.append((t + 0.05, 0.45, 0, 0.05, 0, "strike"))

    # ---- the drop, and II, the Mother
    flashes.append((18.530, 1.00, 0, 0.10, 2, "white"))
    times = slots(18.53, 32.0)
    m = 0
    for k, t0 in enumerate(times):
        t1 = times[k + 1] if k + 1 < len(times) else 32.0
        bar = [j for j, b in enumerate(BARS_MOTHER) if abs(t0 - b) < 0.02]
        if bar:
            key = MOTHER_BAR[bar[0]]
            if t0 > 18.6:
                flashes.append((t0, 0.55, 0, 0.06, 1, "white"))
        else:
            key = MOTHER_SEQ[m % len(MOTHER_SEQ)]
            m += 1
        pic(t0, t1, "vladimir", MOTHER_CROPS[key], MOTHER)
    # the stop: the last shot is crushed under a strobe
    pic(32.0, 32.705, "vladimir", MOTHER_CROPS["E1"], MOTHER, crush=[(32.00, 32.12, 0.0, 0.52, SYM)], strobe=(32.00, 32.705))
    # after the stop: the whole icon, closer on each half beat, cut straight
    times = slots(32.705, 35.683)
    for k, t0 in enumerate(times):
        t1 = times[k + 1] if k + 1 < len(times) else 35.683
        z = WHOLE_STEP ** k
        sg = pic(t0, t1, "vladimir", (2635, 3000 - 60 * k, 5728 / z), MOTHER, push=0.015, whole=True)
        sg["pool"] = (2500, 2600, 0.95)
        if k == 0:
            sg["crush"] = [(32.705, 33.0, 0.55, 0.0, SYM)]
    z = WHOLE_STEP ** len(times)
    sg = pic(35.683, 36.25, "vladimir", (2635, 3000 - 60 * len(times), 5728 / z), MOTHER, push=0.015, whole=True,
             crush=[(35.683, 36.20, 0.0, 1.0, SYM)], strobe=(35.683, 36.25))
    sg["pool"] = (2500, 2600, 0.95)
    segs.append(dict(t0=36.25, t1=36.27, kind="black"))
    for (t0, t1, k, pk) in ((36.270, 36.879, 4, 0.85), (36.879, 37.448, 3, 0.45)):   # two glimpses in the silence
        sg = pic(t0, t1, "vladimir", (2635, 3000, 5728 / WHOLE_STEP ** k), MOTHER, push=0.0, whole=True)
        sg["pool"] = (2500, 2600, 0.95)
        sg["light"] = [(t0, t0 + 0.36, pk, 0.0, lambda u: 1 - (1 - u) ** 2.4)]

    # ---- III, the light
    def page(key, t0, t1, seq, offset, big=False, entry=None):
        lines = LIGHT_LINES[key]
        for k, ts in enumerate(slots(t0, t1)):
            te = slots(t0, t1)[k + 1] if k + 1 < len(slots(t0, t1)) else t1
            shown = len([x for x in lines if x <= ts + 1e-6])
            segs.append(dict(t0=ts, t1=te, kind="panel", key=key, shown=max(1, shown), big=big,
                             entry=entry if k == 0 else None, window=seq[(offset + k) % len(seq)]))
    page("isaiah92", 37.448, 42.179, WINDOW_SEQ, 0, entry="bloom")
    segs.append(dict(t0=42.179, t1=46.881, kind="faces"))
    page("isaiah96", 46.881, 51.635, WINDOW_SEQ, 6, entry="flash")
    page("matthew1615", 51.635, 54.805, QUESTION_SEQ, 0, big=True)
    segs.append(dict(t0=54.805, t1=END_T, kind="end", mark_at=55.107))
    segs.sort(key=lambda sg: sg["t0"])
    return segs, flashes


SEGS, FLASHES = build()

# The faces of reference 3: swapped fast in place, the Child's eyes held still. (src, eye one, eye two) in source pixels.
FACES = [
    ("berlinghiero", (1821, 1573), (1952, 1583)),   # 1230s
    ("hodegetria14", (1858, 1625), (1977, 1627)),   # end of the 14th century
    ("bellini65", (1640, 1512), (1776, 1467)),      # about 1465
    ("hodegetria15", (2071, 1693), (2125, 1693)),   # end of the 15th century
    ("bellini", (2183, 1392), (2304, 1444)),        # late 1480s
    ("vladimir", (2232, 2254), (2284, 2202)),       # mid 16th century
    ("smolensk16", (2965, 2012), (3075, 2012)),     # mid to late 16th century
    ("kazan", (1871, 1644), (1965, 1644)),          # 17th century
]
BEATS = [42.179, 42.818, 43.328, 43.961, 44.577, 45.134, 45.708, 46.301]
SWAPS = []
for k, b in enumerate(BEATS):
    SWAPS.append(b)
    nb = BEATS[k + 1] if k + 1 < len(BEATS) else 46.881
    SWAPS.append((b + nb) / 2)
SWAPS = SWAPS[:16]          # one face on each half beat, the eight twice over
EYES_AT = (540, 790)
EYE_GAP = 112

# ---------------------------------------------------------------- loading
_cache = {}
GROUND = {"vladimir"}


def black_ground(im):
    """The photograph's light ground, reached from the picture's edge, becomes black; the icon is not touched."""
    h, w = im.shape[:2]
    light = (im.min(axis=2) > 200) & ((im.max(axis=2).astype(int) - im.min(axis=2)) < 28)
    mask = np.zeros((h + 2, w + 2), np.uint8)
    fill = light.astype(np.uint8)
    seeds = [(x, 0) for x in range(0, w, 7)] + [(x, h - 1) for x in range(0, w, 7)] + [(0, y) for y in range(0, h, 7)] + [(w - 1, y) for y in range(0, h, 7)]
    for (x, y) in seeds:
        if fill[y, x] == 1 and mask[y + 1, x + 1] == 0:
            cv2.floodFill(fill, mask, (x, y), 2, flags=4 | (1 << 8))
    ground = cv2.dilate((fill == 2).astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
    out = im.copy()
    out[ground] = 0
    return out


def src(name, level=0):
    key = (name, level)
    if key not in _cache:
        if level == 0:
            im = cv2.cvtColor(cv2.imread(os.path.join(WORK, SRC[name]), cv2.IMREAD_COLOR), cv2.COLOR_BGR2RGB)
            if name in GROUND:
                im = black_ground(im)
            _cache[key] = im
        else:
            a = src(name, level - 1)
            _cache[key] = cv2.resize(a, (a.shape[1] // 2, a.shape[0] // 2), interpolation=cv2.INTER_AREA)
    return _cache[key]


def font(weight, size):
    return ImageFont.truetype(os.path.join(WORK, "font", f"DMSans-{weight}.ttf"), size)


_grids = {}
def grid(w, h):
    if (w, h) not in _grids:
        _grids[(w, h)] = np.meshgrid(np.arange(w, dtype=np.float32), np.arange(h, dtype=np.float32))
    return _grids[(w, h)]

_grain = None
def grain(i, w, h):
    global _grain
    if _grain is None:
        rng = np.random.default_rng(7)
        _grain = [cv2.GaussianBlur(rng.standard_normal((H, W)).astype(np.float32), (0, 0), 0.7) * 1.6 for _ in range(6)]
    return _grain[i % 6][:h, :w]

_vig = {}
def vignette(w, h):
    if (w, h) not in _vig:
        u, v = grid(w, h)
        r2 = ((u - w / 2) / (w / 2)) ** 2 + ((v - h / 2) / (h / 2)) ** 2
        _vig[(w, h)] = np.clip(1 - 0.30 * r2, 0.55, 1).astype(np.float32)
    return _vig[(w, h)]


# ---------------------------------------------------------------- a picture through the camera
def view(name, cx, cy, cw, ow, oh, whole=False):
    a0 = src(name)
    sh, sw = a0.shape[:2]
    s = cw / ow
    if not whole:
        hw, hh = s * ow / 2, s * oh / 2
        cx = sw / 2 if 2 * hw >= sw else min(max(cx, hw), sw - hw)
        cy = sh / 2 if 2 * hh >= sh else min(max(cy, hh), sh - hh)
    lvl = 0
    while s / 2 ** (lvl + 1) >= 1.0 and lvl < 5:
        lvl += 1
    a = src(name, lvl)
    f = 1 / 2 ** lvl
    ss = s * f
    M = np.float32([[ss, 0, cx * f - ss * ow / 2], [0, ss, cy * f - ss * oh / 2]])
    out = cv2.warpAffine(a, M, (ow, oh), flags=cv2.INTER_CUBIC | cv2.WARP_INVERSE_MAP,
                         borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0))
    return out.astype(np.float32) / 255.0, (cx, cy, s)


def camera(sh, t):
    """The crop at time t: a move at a steady speed from the shot's start to its end."""
    p = min(1.0, max(0.0, (t - sh["t0"]) / (sh["t1"] - sh["t0"])))
    (ax, ay, aw), (bx, by, bw) = sh["a"], sh["b"]
    return ax + (bx - ax) * p, ay + (by - ay) * p, aw + (bw - aw) * p


def picture(sh, t):
    ow, oh = (W, BAND_H) if sh.get("band") else (W, H)
    cx, cy, cw = camera(sh, t)
    img, geo = view(sh["src"], cx, cy, cw, ow, oh, sh.get("whole", False))
    return img, geo, ow, oh


def grade(x, sh, t, geo, ow, oh):
    if sh.get("gamma", 1.0) != 1.0:
        x = np.power(x, sh["gamma"])
    if sh.get("soft", 0) > 0:
        x = cv2.GaussianBlur(x, (0, 0), sh["soft"])
    sat = sh.get("sat", 1.0)
    if sat != 1.0:
        lum = x @ np.float32([0.2126, 0.7152, 0.0722])
        x = lum[..., None] + sat * (x - lum[..., None])
    px, py, r = sh["pool"]
    r = ramp(t, sh.get("radius", []), r)
    cx, cy, s = geo
    u0 = (px - cx) / s + ow / 2
    v0 = (py - cy) / s + oh / 2
    uu, vv = grid(ow, oh)
    d2 = ((uu - u0) ** 2 + (vv - v0) ** 2) / ((r * W) ** 2)
    m = sh["floor"] + (1 - sh["floor"]) * np.exp(-d2)
    if sh.get("vignette"):
        m = m * vignette(ow, oh)
    x = np.clip(x * (m * sh["gain"] * ramp(t, sh.get("light", []), 1.0))[..., None], 0, 1)
    crush = ramp(t, sh.get("crush", []), 0.0)
    if crush >= 0.999:
        return np.zeros_like(x)
    if crush > 0:
        lum = x @ np.float32([0.2126, 0.7152, 0.0722])
        k = np.clip((lum - crush) / max(1e-3, 1 - crush), 0, 1) / np.maximum(lum, 1e-4)
        x = x * np.minimum(k, 1.0)[..., None]
    return x


def flash_at(i):
    """The light of the strikes (lightning, reference 1) and of the drop's white flash at frame i."""
    v = {"strike": 0.0, "white": 0.0}
    for (te, peak, pre, decay, hold, kind) in FLASHES:
        fe = first(te)
        if fe - pre <= i < fe:
            x = peak * (0.35 + 0.65 * (i - (fe - pre) + 1) / (pre + 1))
        elif fe <= i < fe + hold + 1:
            x = peak
        elif i >= fe + hold + 1:
            x = peak * math.exp(-(i - fe - hold) / (decay * FPS))
        else:
            x = 0.0
        v[kind] = max(v[kind], x)
    return v["strike"], v["white"]


def light_strike(x, L, top_bias=True, white=False):
    """Lightning (reference 1) blows out the lights and keeps the shadows; the drop's flash goes to white."""
    if L <= 0.003: return x
    h = x.shape[0]
    if top_bias:
        g = (0.72 + 0.28 * (1 - np.arange(h, dtype=np.float32) / h))[:, None, None]
        L = L * g
    if white:
        return np.clip(x + (1 - x) * np.minimum(1.0, L) * 0.96 + 0.03 * L, 0, 1)
    return np.clip(x * (1 + 3.2 * L) + 0.06 * L, 0, 1)


def picture_frame(sh, i):
    t = i / FPS
    img, geo, ow, oh = picture(sh, t)
    x = grade(img, sh, t, geo, ow, oh)
    if sh.get("strobe"):
        a, b = sh["strobe"]
        if first(a) <= i < first(b) and ((i - first(a)) // 3) % 2 == 1:
            x = x * 0.0
    Ls, Lw = flash_at(i)
    if sh.get("band"):
        x = light_strike(x, Ls, top_bias=True)
    x = light_strike(x, Lw, top_bias=False, white=True)
    if sh.get("grain", 0) > 0 and x.max() > 0:
        x = np.clip(x + (grain(i, ow, oh) * sh["grain"])[..., None] * (0.35 + 0.65 * x), 0, 1)
    out = (x * 255 + 0.5).astype(np.uint8)
    if sh.get("band"):
        canvas = np.zeros((H, W, 3), np.uint8)
        canvas[BAND_Y:BAND_Y + BAND_H] = out
        return canvas
    return out


# ---------------------------------------------------------------- the white panels (reference 3)
_panels = {}

TOKENS = {   # what appears on each beat: (line, first character, last character)
    "isaiah92": [(0, 0, 8), (1, 0, 10), (2, 0, 9), (3, 0, 8), (4, 0, 11)],
    "isaiah96": [(0, 0, 11), (1, 0, 14), (2, 0, 12), (3, 0, 11)],
    "matthew1615": [(0, 0, 3), (0, 4, 8), (1, 0, 6), (1, 7, 11), (2, 0, 5)],
}


def panel(key, big=False, shown=99):
    """The white page and its words, set from the top; the picture beside them is laid on per half beat."""
    ck = (key, big, shown)
    if ck in _panels: return _panels[ck]
    line, cite, _ = WORDS[key]
    a = np.full((H, W, 3), 250 / 255, np.float32)
    u, v = grid(W, H)
    r2 = ((u - W / 2) / (W / 2)) ** 2 + ((v - H * 0.42) / (H / 2)) ** 2
    a = a * np.clip(1 - 0.07 * r2, 0.86, 1)[..., None]   # reference 3's white is not flat
    im = Image.fromarray((a * 255 + 0.5).astype(np.uint8))
    d = ImageDraw.Draw(im)
    size = 112 if big else 96
    f, fc = font(700, size), font(500, 40)
    lines = line.split("\n")
    lh = round(size * 1.04)
    y0 = 300
    for ln in lines:
        assert d.textlength(ln, font=f) <= 860, f"{ln!r} is wider than 860 px"
    for (li, c0, c1) in TOKENS[key][:shown]:
        ln = lines[li]
        x = 110 + d.textlength(ln[:c0], font=f)
        d.text((x, y0 + li * lh), ln[c0:c1], font=f, fill=(14, 14, 14))
    if shown >= len(TOKENS[key]):
        d.text((114, y0 + len(lines) * lh + 30), cite, font=fc, fill=(88, 88, 88))
    _panels[ck] = np.array(im)
    return _panels[ck]


def zoom_about(img, z, centre, bg):
    if abs(z - 1) < 1e-6: return img
    cx, cy = centre
    M = np.float32([[1 / z, 0, cx - cx / z], [0, 1 / z, cy - cy / z]])
    return cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_CUBIC | cv2.WARP_INVERSE_MAP,
                          borderMode=cv2.BORDER_CONSTANT, borderValue=bg)





def window_picture(sh, i):
    """The picture that stands beside the words: a detail at full colour, moving at a steady speed."""
    name, (cx, cy, cw) = sh["window"]
    x0, y0, ww, wh = WINDOW
    t = i / FPS
    p = min(1.0, max(0.0, (t - sh["t0"]) / max(1e-3, sh["t1"] - sh["t0"])))
    cw2 = cw * (1 - 0.05 * p)
    img, geo = view(name, cx, cy, cw2, ww, wh, whole=False)
    look = dict(pool=(cx, cy, LIGHT["r"]), floor=LIGHT["floor"], gain=LIGHT["gain"], gamma=LIGHT["gamma"], sat=1.0)
    g = grade(img, look, t, geo, ww, wh)
    return (np.clip(g, 0, 1) * 255 + 0.5).astype(np.uint8)


def panel_frame(sh, i):
    page = panel(sh["key"], sh["big"], sh["shown"]).copy()
    x0, y0, ww, wh = WINDOW
    page[y0:y0 + wh, x0:x0 + ww] = window_picture(sh, i)
    img = page.astype(np.float32) / 255
    k = i - first(sh["t0"])
    if sh.get("entry") in ("bloom", "flash"):   # reference 3's white flash: white, then the page
        if k < 3:
            img = np.ones_like(img)
        elif k < 11:
            a = (k - 2) / 9
            img = 1 - (1 - img) * a
    return (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8)


# ---------------------------------------------------------------- the faces (reference 3)
_faces = {}

def face(k):
    if k in _faces: return _faces[k]
    name, e1, e2 = FACES[k]
    mx, my = (e1[0] + e2[0]) / 2, (e1[1] + e2[1]) / 2
    gap = math.hypot(e2[0] - e1[0], e2[1] - e1[1])
    cw = W * gap / EYE_GAP
    s = cw / W
    cx = mx - (EYES_AT[0] - W / 2) * s
    cy = my - (EYES_AT[1] - H / 2) * s
    img, geo = view(name, cx, cy, cw, W, H, whole=True)
    sh = dict(pool=(mx, my + 40 * s, 0.78), floor=0.45, gain=1.08, sat=1.0)
    _faces[k] = (np.clip(grade(img, sh, 0.0, geo, W, H), 0, 1) * 255 + 0.5).astype(np.uint8)   # kept small: eight of them
    return _faces[k]





def faces_frame(sh, i):
    """The faces cut straight, one on each half beat, the Child's eyes held in one place; white for three frames first."""
    j = max(n for n, st in enumerate(SWAPS) if i >= first(st) or n == 0)
    x = face(j % len(FACES)).astype(np.float32) / 255
    if i - first(sh["t0"]) < 3:
        x = np.ones_like(x)
    x = np.clip(x + (grain(i, W, H) * 0.018)[..., None] * (0.35 + 0.65 * x), 0, 1)
    return (x * 255 + 0.5).astype(np.uint8)


# ---------------------------------------------------------------- the whip into the question (reference 3)
WHIP_OUT, WHIP_IN = 0.10, 0.10
DIRX, DIRY = 0.87, -0.50

def whip_frame(i):
    """Reference 3's whip, at a steady speed: the page leaves along one line and the question arrives along it."""
    t = i / FPS
    cut = 51.635
    acc = None
    K = 48
    speed = 1500 / WHIP_IN
    for k in range(K):
        tk = t + (k / (K - 1) - 0.5) * (2.0 / FPS)
        if tk < cut:
            d = speed * max(0.0, tk - (cut - WHIP_OUT))
            img = panel("isaiah96", False, 4)
        else:
            d = -speed * max(0.0, (cut + WHIP_IN) - tk)
            img = panel("matthew1615", True, 1)
        M = np.float32([[1, 0, -DIRX * d], [0, 1, -DIRY * d]])
        f = cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP,
                           borderMode=cv2.BORDER_CONSTANT, borderValue=(250, 250, 250)).astype(np.float32)
        acc = f if acc is None else acc + f
    return np.clip(acc / K + 0.5, 0, 255).astype(np.uint8)


def in_whip(i):
    return first(51.635 - WHIP_OUT) <= i < first(51.635 + WHIP_IN)


# ---------------------------------------------------------------- the end (reference 3's signature, without its glow)
_mark = None

def end_frame(sh, i):
    global _mark
    t = i / FPS
    fade_end = 55.10
    if t < fade_end:     # the question fades to black
        base = panel("matthew1615", True, 5).astype(np.float32)
        a = max(0.0, 1 - (t - sh["t0"]) / (fade_end - sh["t0"]))
        return (base * a).astype(np.uint8)
    out = np.zeros((H, W, 3), np.uint8)
    if i < first(sh["mark_at"]):
        return out
    if _mark is None:
        _mark = np.array(Image.open(os.path.join(ROOT, "public", "purify-cross-mark.png")).convert("RGBA")).astype(np.float32) / 255
    mh, mw = _mark.shape[:2]
    x0, y0 = W // 2 - mw // 2, 860 - mh // 2
    a = _mark[..., 3:4]
    region = out[y0:y0 + mh, x0:x0 + mw].astype(np.float32) / 255
    out[y0:y0 + mh, x0:x0 + mw] = np.clip((region * (1 - a) + _mark[..., :3] * a) * 255 + 0.5, 0, 255).astype(np.uint8)
    word = "Purify"
    shown = int(max(0, (t - 55.25) / 0.06)) + 1 if t >= 55.25 else 0
    if shown:
        im = Image.fromarray(out)
        d = ImageDraw.Draw(im)
        f = font(500, 50)
        total = d.textlength(word, font=f)
        d.text((W / 2 - total / 2, y0 + mh + 46), word[:min(len(word), shown)], font=f, fill=(244, 244, 240))
        out = np.array(im)
    return out


# ---------------------------------------------------------------- one frame
def shot_at(i):
    for sh in SEGS:
        if first(sh["t0"]) <= i < first(sh["t1"]):
            return sh
    return SEGS[-1]


def frame(i):
    if in_whip(i):
        return whip_frame(i)
    sh = shot_at(i)
    k = sh["kind"]
    if k == "pic": return picture_frame(sh, i)
    if k == "panel": return panel_frame(sh, i)
    if k == "faces": return faces_frame(sh, i)
    if k == "black": return np.zeros((H, W, 3), np.uint8)
    return end_frame(sh, i)


# ---------------------------------------------------------------- commands
def cmd_still(times):
    os.makedirs(os.path.join(WORK, "stills"), exist_ok=True)
    for ts in times:
        i = first(float(ts))
        p = os.path.join(WORK, "stills", f"{float(ts):06.2f}.jpg")
        Image.fromarray(frame(i)).save(p, quality=92)
        print(p)


def cmd_sheet(times=None):
    times = times or [0.10, 2.30, 5.00, 8.13, 15.00, 18.55, 18.70, 26.00, 32.30, 37.50, 42.30, 44.00, 51.66, 55.50]
    tw, th = 216, 384
    cols = 7
    rows = (len(times) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * (tw + 6), rows * (th + 30)), (12, 12, 12))
    d = ImageDraw.Draw(sheet)
    f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 16)
    for k, ts in enumerate(times):
        im = Image.fromarray(frame(first(ts))).resize((tw, th), Image.LANCZOS)
        x, y = (k % cols) * (tw + 6), (k // cols) * (th + 30)
        sheet.paste(im, (x, y + 26))
        d.text((x + 4, y + 4), f"{ts:.2f} s", fill=(255, 220, 0), font=f)
    p = os.path.join(WORK, "stills", "sheet.jpg")
    os.makedirs(os.path.dirname(p), exist_ok=True)
    sheet.save(p, quality=90)
    print(p)


def _render_chunk(args):
    a, b = args
    return [frame(i).tobytes() for i in range(a, b)]


def cmd_render(sound):
    import multiprocessing as mp
    check_words()
    out = os.path.join(WORK, "out")
    os.makedirs(out, exist_ok=True)
    path = os.path.join(out, "the-cradle.mp4")
    ff = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
                           "-i", "-", "-i", sound, "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-preset", "slow",
                           "-crf", "16", "-profile:v", "high", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
                           "-c:a", "aac", "-b:a", "256k", "-t", f"{N / FPS:.4f}", path], stdin=subprocess.PIPE)
    # the workers draw faster than the encoder takes frames: hand out a few runs at a time, so finished frames never
    # pile up waiting (a whole film of them filled the machine's memory on 2026-11-25)
    chunks = [(a, min(N, a + 20)) for a in range(0, N, 20)]
    with mp.Pool(4) as pool:
        for k in range(0, len(chunks), 8):
            for frames in pool.map(_render_chunk, chunks[k:k + 8]):
                for fb in frames:
                    ff.stdin.write(fb)
    ff.stdin.close()
    ff.wait()
    print(path)


def cmd_check():
    check_words()
    print("words: every line is in data/bible")
    starts = sorted(set(first(sg["t0"]) for sg in SEGS)) + [first(x) for x in SWAPS] + [first(f[0]) for f in FLASHES]
    quiet = [h for h in HALF if not any(abs(first(h) - st) <= 1 for st in starts) and not (32.0 < h < 32.7) and not (35.68 < h < 36.26)]
    print(f"segments: {len(SEGS)}; half beats: {len(HALF)}; half beats with no event: {quiet}")


if __name__ == "__main__":
    WORK = os.path.abspath(sys.argv[1])
    c = sys.argv[2]
    if c == "still": cmd_still(sys.argv[3:])
    elif c == "sheet": cmd_sheet([float(x) for x in sys.argv[3:]] or None)
    elif c == "render": cmd_render(sys.argv[3])
    elif c == "check": cmd_check()
else:
    WORK = os.environ.get("EDIT3_WORK", ".promo/edit-3")
