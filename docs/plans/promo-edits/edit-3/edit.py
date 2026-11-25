#!/usr/bin/env python3
"""Promo edit 3, the Cradle, second cut: one look, the three references' editing styles, one per chapter.

His word on the first cut (2026-11-25): "you barely even edited it. no effects. and not a single edit style used
from our references". So each chapter now carries its reference's own devices (docs/plans/promo-edits/study-2026-11-25.md):
  I, the night (reference 1, the storm): black and white in a widescreen band, film grain, cuts hidden inside flashes
     of light, flickers inside shots, cuts into darkness at the breaks.
  The drop: a white flash, and the band opens to the full screen on her eye.
  II, the Mother (reference 2, the whisper): every cut enters on a fast blurred zoom or pan that settles into a drift;
     coverage of one picture, wider each cut; crush and strobe on the song's stops.
  III, the light (reference 3, Musashi): white flash entries, bold words that pulse on the beat, a page-bend warp into
     the faces, the faces swapped fast in place, a motion-blur whip into the question, the name typed at the end.
Never: rays, sparkle, glow behind words or the mark, parchment.

Run from the repository root, with a Python that has numpy, opencv-python-headless and pillow:
  python edit.py <work> still <seconds> [...]   stills into <work>/stills/
  python edit.py <work> sheet                   eleven stills in one picture
  python edit.py <work> render <sound.mp3>      every frame, then <work>/out/the-cradle.mp4
  python edit.py <work> check                   the words against data/bible, and the light of each shot
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

# The night (reference 1). cut: a new detail; punch: the same picture, a jump closer; reveal: in the dark, a strike of
# lightning shows a detail and the dark takes it back. strike: a cut inside a flash; flick: a flicker inside the shot.
NIGHT_SCRIPT = [
    (0.000, "cut", "W", dict(whoosh=dict(A=0.32, ox=0, oy=0, D=0.50), light=[(0.00, 0.60, 0.70, 1.0)])),
    (0.209, "punch", None, {}),
    (0.795, "cut", "SK", dict(flick=0.50)),
    (1.393, "punch", None, {}),
    (1.985, "cut", "CH", dict(flick=0.60)),
    (2.281, "cut", "SA", dict(strike=0.95)),
    (2.572, "punch", None, {}),
    (3.170, "cut", "SP", {}),
    (3.756, "punch", None, dict(flick=0.40)),
    (4.342, "cut", "SY", dict(strike=0.95)),
    (4.934, "punch", None, {}),
    (5.526, "cut", "KF", {}),
    (6.118, "punch", None, dict(flick=0.50)),
    (6.716, "cut", "MJ", dict(strike=0.95)),
    (7.303, "punch", None, {}),
    (7.895, "cut", "JF", dict(flick=0.50)),
    (8.487, "cut", "MF", {}),
    (9.085, "cut", "LB", dict(strike=0.95, light=[(9.665, 9.95, 1.0, 0.0)])),
    (10.257, "reveal", "JF", dict(peak=0.95)),
    (10.855, "reveal", "SA", dict(peak=0.95)),
    (11.436, "reveal", "MF", dict(peak=0.95)),
    (11.738, "cut", "MH", dict(strike=0.95)),
    (12.028, "punch", None, {}),
    (12.626, "cut", "CC", {}),
    (13.212, "punch", None, {}),
    (13.804, "cut", "CX", dict(strike=0.95)),
    (14.396, "punch", None, {}),
    (14.988, "cut", "MF", {}),
    (15.581, "cut", "CC", dict(flick=0.55)),
    (16.167, "cut", "CX", dict(strike=0.95, light=[(16.63, 16.76, 1.0, 0.0)])),
    (16.765, "reveal", "CX", dict(peak=0.75)),
    (17.357, "reveal", "MF", dict(peak=0.55)),
    (18.007, "reveal", "CC", dict(peak=0.42)),
]
# The Mother (reference 2): each bar a whoosh cut, wider each bar; a punch; two quick inserts.
MOTHER_SCRIPT = [
    (18.530, "cut", "E1", dict(whoosh=dict(A=0.24, ox=0, oy=0, D=0.42))),
    (19.180, "punch", None, {}),
    (19.720, "cut", "E2", {}),
    (20.312, "cut", "CF", {}),
    (20.904, "cut", "FF", dict(whoosh=dict(A=0.10, ox=260, oy=0, D=0.34))),
    (21.496, "punch", None, {}),
    (22.082, "cut", "EN", {}),
    (22.674, "cut", "MD", {}),
    (23.266, "cut", "EM", dict(whoosh=dict(A=0.14, ox=0, oy=-220, D=0.34))),
    (23.853, "punch", None, {}),
    (24.433, "cut", "HN", {}),
    (25.037, "cut", "CF", {}),
    (25.629, "cut", "TS", dict(whoosh=dict(A=0.12, ox=-260, oy=0, D=0.34))),
    (26.221, "punch", None, {}),
    (26.807, "cut", "GM", {}),
    (27.440, "cut", "FT", {}),
    (27.992, "cut", "SH", dict(whoosh=dict(A=0.18, ox=0, oy=0, D=0.36))),
    (28.543, "punch", None, {}),
    (29.176, "cut", "HD", {}),
    (29.739, "cut", "SV", {}),
    (30.360, "cut", "FH", dict(whoosh=dict(A=0.10, ox=0, oy=200, D=0.34))),
    (30.952, "punch", None, {}),
    (31.539, "cut", "E1", dict(crush=[(32.00, 32.12, 0.0, 0.52)], strobe=(32.00, 32.705))),
    (32.705, "whole", 0, dict(crush=[(32.705, 33.30, 0.55, 0.0)])),
    (33.315, "whole", 1, {}),
    (33.907, "whole", 2, {}),
    (34.458, "whole", 3, {}),
    (35.045, "whole", 4, dict(crush=[(35.683, 36.25, 0.0, 1.0)], strobe=(35.683, 36.25))),
    (36.270, "glimpse", 4, dict(peak=0.85)),
    (36.879, "glimpse", 3, dict(peak=0.45)),
]
WHOLE_STEP = 1.075   # the whole icon comes closer by this much on each beat after the stop

# The light (reference 3): the verses one line on each beat, the question one word on each beat; once a verse is whole,
# its beats switch to a colour picture and back (reference 3's two worlds).
LIGHT_SCRIPT = [
    (37.448, "panel", "isaiah92", dict(shown=1, entry="bloom")),
    (38.040, "panel", "isaiah92", dict(shown=2)),
    (38.609, "panel", "isaiah92", dict(shown=3)),
    (39.259, "panel", "isaiah92", dict(shown=4)),
    (39.816, "panel", "isaiah92", dict(shown=5)),
    (40.414, "insert", ("elgreco", (1150, 2320, 560)), {}),
    (41.001, "panel", "isaiah92", dict(shown=5)),
    (41.593, "insert", ("vladimir", (2330, 1960, 700)), {}),
    (42.179, "faces", None, {}),
    (46.881, "panel", "isaiah96", dict(shown=1, entry="flash")),
    (47.502, "panel", "isaiah96", dict(shown=2)),
    (48.094, "panel", "isaiah96", dict(shown=3)),
    (48.686, "panel", "isaiah96", dict(shown=4)),
    (49.238, "insert", ("kazan", (1918, 1700, 760)), {}),
    (49.865, "panel", "isaiah96", dict(shown=4)),
    (50.457, "insert", ("vladimir", (2250, 2230, 560)), {}),
    (51.072, "panel", "isaiah96", dict(shown=4)),
    (51.635, "panel", "matthew1615", dict(shown=1, big=True)),
    (52.233, "panel", "matthew1615", dict(shown=2, big=True)),
    (52.808, "panel", "matthew1615", dict(shown=3, big=True)),
    (53.418, "panel", "matthew1615", dict(shown=4, big=True)),
    (54.004, "panel", "matthew1615", dict(shown=5, big=True)),
    (54.596, "panel", "matthew1615", dict(shown=5, big=True)),
    (54.805, "end", None, dict(mark_at=55.107)),
]
END_T = N / FPS + 1


def build():
    """The segments of the film, one for each event, in order; and the flashes of light."""
    segs, flashes = [], []
    script = NIGHT_SCRIPT + MOTHER_SCRIPT
    prev = None
    for k, (t0, op, arg, opt) in enumerate(script):
        t1 = script[k + 1][0] if k + 1 < len(script) else 37.448
        night = t0 < 18.53 - 1e-6
        look = NIGHT if night else MOTHER
        crops = NIGHT_CROPS if night else MOTHER_CROPS
        if op in ("cut", "reveal"):
            cx, cy, cw = crops[arg]
            a = (cx, cy, cw)
            b = (cx + 0.01 * cw, cy - 0.005 * cw, cw * 0.965)
        elif op == "punch":
            (px, py, pw) = prev["b"]
            a = (px, py, pw / 1.12)
            b = (px, py, pw / 1.16)
        elif op in ("whole", "glimpse"):
            z = WHOLE_STEP ** arg
            a = (2635, 3000, 5728 / z)
            b = (2635, 3000, 5728 / (z * 1.012))
        sg = dict(t0=t0, t1=t1, kind="pic", src="elgreco" if night else "vladimir", a=a, b=b, whole=(op in ("whole", "glimpse")), **look)
        sg["pool"] = (a[0], a[1], look["r"]) if op not in ("whole", "glimpse") else (2500, 2600, 0.95)
        if op == "glimpse":   # in the silence, the icon seen for a moment, and the dark again
            sg["light"] = [(t0, t0 + 0.36, opt["peak"], 0.0, lambda u: 1 - (1 - u) ** 2.4)]
        if night and op in ("cut", "reveal") and arg in NIGHT_GAIN: sg["gain"] = NIGHT_GAIN[arg]
        if op == "punch": sg["gain"] = prev["gain"]
        if "whoosh" in opt: sg["whoosh"] = opt["whoosh"]
        if op == "punch": sg["whoosh"] = dict(A=0.05, ox=0, oy=0, D=0.16)
        if "light" in opt: sg["light"] = [(x0, x1, v0, v1, SYM) for (x0, x1, v0, v1) in opt["light"]]
        if "crush" in opt: sg["crush"] = [(x0, x1, v0, v1, HOUSE if v0 > v1 else SYM) for (x0, x1, v0, v1) in opt["crush"]]
        if "strobe" in opt: sg["strobe"] = opt["strobe"]
        if op == "reveal":
            pk = opt.get("peak", 0.9)
            sg["light"] = [(t0, t0 + 0.42, pk, 0.0, lambda u: 1 - (1 - u) ** 2.2)]
            flashes.append((t0, 0.55 * pk, 0, 0.06, 0, "strike"))
        if "strike" in opt: flashes.append((t0, opt["strike"], 2, 0.11, 0, "strike"))
        if "flick" in opt:
            flashes.append((t0 + 0.04, opt["flick"], 0, 0.06, 0, "strike"))
            flashes.append((t0 + 0.13, opt["flick"] * 0.6, 0, 0.05, 0, "strike"))
        segs.append(sg)
        prev = sg
    segs[-1]["t1"] = 37.448
    flashes.append((18.530, 1.00, 0, 0.10, 2, "white"))     # the drop
    for k, (t0, op, arg, opt) in enumerate(LIGHT_SCRIPT):
        t1 = LIGHT_SCRIPT[k + 1][0] if k + 1 < len(LIGHT_SCRIPT) else END_T
        if op == "panel":
            segs.append(dict(t0=t0, t1=t1, kind="panel", key=arg, shown=opt["shown"], big=opt.get("big", False), entry=opt.get("entry")))
        elif op == "insert":
            name, (cx, cy, cw) = arg
            sg = dict(t0=t0, t1=t1, kind="pic", src=name, a=(cx, cy, cw), b=(cx, cy, cw * 0.95), whole=False, **LIGHT)
            sg["pool"] = (cx, cy, LIGHT["r"])
            sg["whoosh"] = dict(A=0.08, ox=0, oy=0, D=0.18)
            segs.append(sg)
        elif op == "faces":
            segs.append(dict(t0=t0, t1=t1, kind="faces"))
        elif op == "end":
            segs.append(dict(t0=t0, t1=t1, kind="end", mark_at=opt["mark_at"]))
    return segs, flashes


SEGS, FLASHES = build()
FLASHES.append((9.665, 0.60, 0, 0.06, 0, "strike"))   # the bass leaves: one flicker as the light closes

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
WARP_D = 0.36               # the page-bend into the faces

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
    """The crop at time t, with reference 2's entry: a fast zoom and pan that settles."""
    p = min(1.0, max(0.0, (t - sh["t0"]) / (sh["t1"] - sh["t0"])))
    e = SYM(p)
    (ax, ay, aw), (bx, by, bw) = sh["a"], sh["b"]
    cx, cy, cw = ax + (bx - ax) * e, ay + (by - ay) * e, aw + (bw - aw) * e
    wh = sh.get("whoosh")
    if wh:
        tau = t - sh["t0"]
        if tau < wh["D"]:
            k = 1 - HOUSE(max(0.0, tau) / wh["D"])
            ow = W
            cw = cw / (1 + wh["A"] * k)
            cx -= wh["ox"] * k * cw / ow
            cy -= wh["oy"] * k * cw / ow
    return cx, cy, cw


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


def picture_frame(sh, i, blur=True):
    t = i / FPS
    wh = sh.get("whoosh")
    moving = wh and (t - sh["t0"]) < wh["D"] * 0.85
    if moving and blur:
        acc = None
        K = 7
        for k in range(K):
            tk = t + (k / (K - 1) - 0.5) * (1.6 / FPS)
            img, geo, ow, oh = picture(sh, max(sh["t0"], tk))
            g = grade(img, sh, t, geo, ow, oh)
            acc = g if acc is None else acc + g
        x = acc / K
    else:
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
    block = lh * len(lines) + 34 + 44
    y0 = 760 - block // 2
    for ln in lines:
        assert d.textlength(ln, font=f) <= 860, f"{ln!r} is wider than 860 px"
    toks = TOKENS[key][:shown]
    for (li, c0, c1) in toks:
        ln = lines[li]
        assert ln[c0:c1].strip(), (key, li, c0, c1)
        x = 110 + d.textlength(ln[:c0], font=f)
        d.text((x, y0 + li * lh), ln[c0:c1], font=f, fill=(14, 14, 14))
    if shown >= len(TOKENS[key]):
        d.text((114, y0 + len(lines) * lh + 34), cite, font=fc, fill=(88, 88, 88))
    _panels[ck] = np.array(im)
    return _panels[ck]


def zoom_about(img, z, centre, bg):
    if abs(z - 1) < 1e-6: return img
    cx, cy = centre
    M = np.float32([[1 / z, 0, cx - cx / z], [0, 1 / z, cy - cy / z]])
    return cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_CUBIC | cv2.WARP_INVERSE_MAP,
                          borderMode=cv2.BORDER_CONSTANT, borderValue=bg)


def kick(t, t0, amp=0.065):
    """Reference 3's pulse: a push on the beat that eases out."""
    return 1.0 + amp * math.exp(-max(0.0, t - t0) / 0.13)


def panel_frame(sh, i):
    t = i / FPS
    base = panel(sh["key"], sh["big"], sh["shown"])
    z = kick(t, sh["t0"]) * (1.0 + 0.012 * min(1.0, (t - sh["t0"]) / 0.6))
    img = zoom_about(base, z, (540, 760), (250, 250, 250)).astype(np.float32) / 255
    k = i - first(sh["t0"])
    entry = sh.get("entry")
    if entry in ("bloom", "flash"):
        hold = 3
        if k < hold:
            img = np.ones_like(img)
        elif k < hold + 8:
            a = (k - hold + 1) / 9
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
    _faces[k] = grade(img, sh, 0.0, geo, W, H)
    return _faces[k]


def bend(img, k):
    """Reference 3's page-bend: the picture arrives curved like a sheet and flattens. k from 1 to 0."""
    if k <= 1e-3: return img
    u, v = grid(W, H)
    nx, ny = (u - W / 2) / (W / 2), (v - H / 2) / (H / 2)
    r2 = nx * nx + ny * ny
    amt = 0.42 * k
    sx = 1 + amt * r2
    mapx = (W / 2 + (u - W / 2) * sx * (1 + 0.10 * k)).astype(np.float32)
    mapy = (H / 2 + (v - H / 2) * sx * (1 + 0.10 * k) - 60 * k * (1 - nx * nx)).astype(np.float32)
    return cv2.remap(img, mapx, mapy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=(0.98, 0.98, 0.98))


def faces_frame(sh, i):
    t = i / FPS
    j = max(n for n, s in enumerate(SWAPS) if i >= first(s) or n == 0)
    x = face(j % len(FACES))
    since = t - SWAPS[j]
    z = 1 + 0.045 * math.exp(-max(0.0, since) / 0.10)
    x = zoom_about(x, z, EYES_AT, (0, 0, 0))
    tau = t - sh["t0"]
    if tau < WARP_D:
        x = bend(x, 1 - HOUSE(tau / WARP_D))
    x = np.clip(x + (grain(i, W, H) * 0.018)[..., None] * (0.35 + 0.65 * x), 0, 1)
    return (x * 255 + 0.5).astype(np.uint8)


# ---------------------------------------------------------------- the whip into the question (reference 3)
WHIP_OUT, WHIP_IN = 0.09, 0.20
DIRX, DIRY = 0.87, -0.50

def whip_frame(i):
    t = i / FPS
    cut = 51.635
    acc = None
    K = 48
    for k in range(K):
        tk = t + (k / (K - 1) - 0.5) * (2.0 / FPS)
        if tk < cut:
            p = max(0.0, (tk - (cut - WHIP_OUT)) / WHIP_OUT)
            d = 1500 * p * p
            img = panel("isaiah96", False, 4)
        else:
            p = min(1.0, (tk - cut) / WHIP_IN)
            d = -1500 * (1 - HOUSE(p))
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
        return (base * SYM(a)).astype(np.uint8)
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
    chunks = [(a, min(N, a + 20)) for a in range(0, N, 20)]
    with mp.Pool(4) as pool:
        for k, frames in enumerate(pool.imap(_render_chunk, chunks)):
            for fb in frames:
                ff.stdin.write(fb)
    ff.stdin.close()
    ff.wait()
    print(path)


def cmd_check():
    check_words()
    print("words: every line is in data/bible")
    print(f"segments: {len(SEGS)}; beats: {len(BEATS_ALL)}")
    starts = sorted(first(sg["t0"]) for sg in SEGS)
    missing = [b for b in BEATS_ALL if not any(abs(first(b) - st) <= 1 for st in starts) and not (42.17 < b < 46.89) and not (32.0 < b < 32.7) and not (35.6 < b < 37.44)]
    print("beats with no event of their own:", missing)


if __name__ == "__main__":
    WORK = os.path.abspath(sys.argv[1])
    c = sys.argv[2]
    if c == "still": cmd_still(sys.argv[3:])
    elif c == "sheet": cmd_sheet([float(x) for x in sys.argv[3:]] or None)
    elif c == "render": cmd_render(sys.argv[3])
    elif c == "check": cmd_check()
else:
    WORK = os.environ.get("EDIT3_WORK", ".promo/edit-3")
