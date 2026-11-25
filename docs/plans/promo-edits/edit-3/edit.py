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


# ---------------------------------------------------------------- the shots
# A picture shot's crop: centre (cx, cy) and width cw in source pixels at its start (a) and end (b); its height follows
# from the frame it fills (the band in Chapter I, the full 9:16 after the drop). whoosh: the entry of reference 2, a fast
# blurred zoom (A, the extra zoom at the first frame) and pan (ox, oy screen pixels) that settles over D seconds.
NIGHT = dict(band=True, sat=0.06, soft=0.6, floor=0.18, gain=1.55, gamma=0.66, grain=0.050, vignette=True)
MOTHER = dict(sat=0.88, soft=0.0, floor=0.30, gain=1.18, gamma=0.95, grain=0.020)

SHOTS = [
    # ---- Chapter I, the night: reference 1
    dict(n=1, t0=0.000, t1=2.281, src="elgreco", a=(1250, 1850, 2300), b=(1250, 1900, 2150), pool=(1230, 2290, 0.44), **NIGHT,
         light=[(0.00, 0.60, 0.70, 1.0, HOUSE)], whoosh=dict(A=0.32, ox=0, oy=0, D=0.50)),
    dict(n=2, t0=2.281, t1=4.342, src="elgreco", a=(1100, 720, 1350), b=(1100, 700, 1280), pool=(1090, 650, 0.48), **NIGHT),
    dict(n=3, t0=4.342, t1=6.716, src="elgreco", a=(850, 1500, 1150), b=(840, 1490, 1090), pool=(900, 1470, 0.48), **NIGHT),
    dict(n=4, t0=6.716, t1=10.53, src="elgreco", a=(1640, 1640, 1050), b=(1650, 1630, 990), pool=(1650, 1620, 0.46), **NIGHT,
         light=[(9.65, 10.40, 1.0, 0.0, SYM)]),
    dict(n=5, t0=10.53, t1=11.738, src="elgreco", a=(1530, 1600, 720), b=(1530, 1595, 700), pool=(1530, 1585, 0.44), **NIGHT,
         light=[(10.53, 10.70, 0.0, 0.0, SYM), (10.70, 11.60, 0.0, 1.0, HOUSE)]),
    dict(n=6, t0=11.738, t1=13.804, src="elgreco", a=(1320, 2200, 1050), b=(1310, 2215, 1000), pool=(1290, 2260, 0.50), **NIGHT),
    dict(n=7, t0=13.804, t1=18.530, src="elgreco", a=(1250, 2310, 820), b=(1250, 2310, 740), pool=(1250, 2310, 0.52), **NIGHT,
         radius=[(16.63, 18.10, 0.52, 0.18, SYM)], light=[(16.63, 18.25, 1.0, 0.0, SYM)]),
    # ---- Chapter II, the Mother: reference 2
    dict(n=8, t0=18.530, t1=20.904, src="vladimir", a=(2330, 1960, 700), b=(2335, 1960, 680), pool=(2330, 1950, 0.62), **MOTHER,
         whoosh=dict(A=0.24, ox=0, oy=0, D=0.42)),
    dict(n=9, t0=20.904, t1=23.266, src="vladimir", a=(2560, 2080, 1150), b=(2300, 2150, 1150), pool=(2400, 2100, 0.66), **MOTHER,
         whoosh=dict(A=0.10, ox=260, oy=0, D=0.34)),
    dict(n=10, t0=23.266, t1=25.629, src="vladimir", a=(2650, 2600, 1100), b=(2760, 2700, 1080), pool=(2700, 2600, 0.68), **MOTHER,
         whoosh=dict(A=0.14, ox=0, oy=-220, D=0.34)),
    dict(n=11, t0=25.629, t1=27.992, src="vladimir", a=(2650, 3700, 1900), b=(2650, 3690, 1845), pool=(2600, 3400, 0.74), **MOTHER,
         whoosh=dict(A=0.12, ox=-260, oy=0, D=0.34)),
    dict(n=12, t0=27.992, t1=30.360, src="vladimir", a=(2640, 2700, 2600), b=(2640, 2690, 2520), pool=(2400, 2300, 0.80), **MOTHER,
         whoosh=dict(A=0.18, ox=0, oy=0, D=0.36)),
    dict(n=13, t0=30.360, t1=32.705, src="vladimir", a=(2635, 3000, 3375), b=(2635, 3000, 3290), pool=(2400, 2300, 0.85), **MOTHER,
         whoosh=dict(A=0.10, ox=0, oy=200, D=0.34), crush=[(32.00, 32.12, 0.0, 0.52, SYM)], strobe=(32.00, 32.705)),
    dict(n=14, t0=32.705, t1=37.448, src="vladimir", whole=True, a=(2635, 3000, 5728), b=(2635, 3000, 5560), pool=(2500, 2600, 0.95), **MOTHER,
         crush=[(32.705, 33.705, 0.55, 0.0, HOUSE), (35.85, 36.40, 0.0, 1.0, SYM)], strobe=(35.85, 36.40)),
    # ---- Chapter III, the light: reference 3
    dict(n=15, t0=37.448, t1=42.179, panel="isaiah92"),
    dict(n=16, t0=42.179, t1=46.881, faces=True),
    dict(n=17, t0=46.881, t1=51.635, panel="isaiah96", flash_in=True),
    dict(n=18, t0=51.635, t1=54.805, panel="matthew1615", big=True),
    dict(n=19, t0=54.805, t1=N / FPS + 1, end=True, mark_at=55.107),
]

# Light (reference 1): (time, peak, frames of rise before it, decay seconds, hold frames). A cut inside a flash rises over
# two frames to its peak on the cut's own frame; a flicker is a single strike.
FLASHES = [
    (2.281, 0.95, 2, 0.11, 0), (4.342, 0.95, 2, 0.11, 0), (6.716, 0.95, 2, 0.11, 0),
    (8.120, 0.70, 0, 0.06, 0), (8.205, 0.45, 0, 0.05, 0), (9.080, 0.60, 0, 0.07, 0),
    (11.738, 0.95, 2, 0.11, 0), (13.804, 0.95, 2, 0.11, 0),
    (15.300, 0.55, 0, 0.06, 0), (15.385, 0.35, 0, 0.05, 0),
    (18.530, 1.00, 0, 0.10, 2),   # the drop: out of black, white, then her eye
]
DROP_FLASH = 18.530

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
BEATS = [42.179, 42.818, 43.328, 43.961, 44.577, 45.134, 45.708, 46.295]  # measured onsets
SWAPS = []
for k, b in enumerate(BEATS):
    SWAPS.append(b)
    nb = BEATS[k + 1] if k + 1 < len(BEATS) else 46.881
    SWAPS.append((b + nb) / 2)
SWAPS = SWAPS[:16]          # one face on each half beat, the eight twice over
EYES_AT = (540, 790)
EYE_GAP = 112
WARP_D = 0.36               # the page-bend into the faces
BEAT = 60 / 103.4           # the song's beat, for the words' pulses

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
    v = 0.0
    for (te, peak, pre, decay, hold) in FLASHES:
        fe = first(te)
        if fe - pre <= i < fe:
            v = max(v, peak * (0.35 + 0.65 * (i - (fe - pre) + 1) / (pre + 1)))
        elif fe <= i < fe + hold + 1:
            v = max(v, peak)
        elif i >= fe + hold + 1:
            v = max(v, peak * math.exp(-(i - fe - hold) / (decay * FPS)))
    return v


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
    L = flash_at(i)
    x = light_strike(x, L, top_bias=sh.get("band", False), white=not sh.get("band", False))
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

def panel(key, big=False):
    if (key, big) in _panels: return _panels[(key, big)]
    line, cite, _ = WORDS[key]
    im = Image.new("RGB", (W, H), (250, 250, 250))
    # reference 3's white is not flat: a soft fall of light toward the corners
    a = np.array(im).astype(np.float32) / 255
    u, v = grid(W, H)
    r2 = ((u - W / 2) / (W / 2)) ** 2 + ((v - H * 0.42) / (H / 2)) ** 2
    a = a * np.clip(1 - 0.07 * r2, 0.86, 1)[..., None]
    im = Image.fromarray((a * 255 + 0.5).astype(np.uint8))
    d = ImageDraw.Draw(im)
    size = 112 if big else 96
    f, fc = font(700, size), font(500, 40)
    lines = line.split("\n")
    lh = round(size * 1.04)
    block = lh * len(lines) + 34 + 44
    y = 760 - block // 2
    for ln in lines:
        wln = d.textlength(ln, font=f)
        assert wln <= 860, f"{ln!r} is wider than 860 px"
        d.text((110, y), ln, font=f, fill=(14, 14, 14))
        y += lh
    d.text((114, y + 34), cite, font=fc, fill=(88, 88, 88))
    _panels[(key, big)] = np.array(im)
    return _panels[(key, big)]


def zoom_about(img, z, centre, bg):
    if abs(z - 1) < 1e-6: return img
    cx, cy = centre
    M = np.float32([[1 / z, 0, cx - cx / z], [0, 1 / z, cy - cy / z]])
    return cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_CUBIC | cv2.WARP_INVERSE_MAP,
                          borderMode=cv2.BORDER_CONSTANT, borderValue=bg)


def pulse(t, t0):
    """Reference 3's pulse: a small push on each beat that eases out, larger on the bar."""
    z = 1.0
    k = 0
    tb = t0
    while tb <= t + 1e-9:
        amp = 0.020 if k % 4 == 0 else 0.008
        z += amp * math.exp(-(t - tb) / 0.14)
        k += 1
        tb = t0 + k * BEAT
    return z


def panel_frame(sh, i):
    t = i / FPS
    base = panel(sh["panel"], sh.get("big", False))
    drift = 1.0 + 0.03 * SYM(min(1.0, (t - sh["t0"]) / (sh["t1"] - sh["t0"])))
    img = zoom_about(base, drift * pulse(t, sh["t0"]), (540, 760), (250, 250, 250)).astype(np.float32) / 255
    # entry: the words come up out of white (reference 3's white flash)
    fe = first(sh["t0"])
    hold = 3 if sh.get("flash_in") else 0
    k = i - fe
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
            img = panel("isaiah96")
        else:
            p = min(1.0, (tk - cut) / WHIP_IN)
            d = -1500 * (1 - HOUSE(p))
            img = panel("matthew1615", True)
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
        base = panel("matthew1615", True).astype(np.float32)
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
    for sh in SHOTS:
        if first(sh["t0"]) <= i < first(sh["t1"]):
            return sh
    return SHOTS[-1]


def frame(i):
    if in_whip(i):
        return whip_frame(i)
    sh = shot_at(i)
    if "src" in sh: return picture_frame(sh, i)
    if "panel" in sh: return panel_frame(sh, i)
    if sh.get("faces"): return faces_frame(sh, i)
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
    for sh in SHOTS:
        mid = (sh["t0"] + min(sh["t1"], N / FPS)) / 2
        x = frame(first(mid)).astype(np.float32) / 255
        lum = x @ np.float32([0.2126, 0.7152, 0.0722])
        print(f"shot {sh['n']:2d} at {mid:5.2f} s: frame luma {lum.mean():.3f}, brightest tenth {np.percentile(lum, 90):.3f}")


if __name__ == "__main__":
    WORK = os.path.abspath(sys.argv[1])
    c = sys.argv[2]
    if c == "still": cmd_still(sys.argv[3:])
    elif c == "sheet": cmd_sheet([float(x) for x in sys.argv[3:]] or None)
    elif c == "render": cmd_render(sys.argv[3])
    elif c == "check": cmd_check()
else:
    WORK = os.environ.get("EDIT3_WORK", ".promo/edit-3")
