#!/usr/bin/env python3
"""Promo edit 3, the Cradle: the film rendered from the tables below.

Brief: docs/plans/promo-edits/edit-3-the-cradle.md. Record: RECORD.md beside this file.

Run from the repository root, with a Python that has numpy, opencv-python-headless and pillow:
  python edit.py <work> still <seconds> [...]   stills into <work>/stills/
  python edit.py <work> sheet                   the storyboard's stills in one picture
  python edit.py <work> render <sound.mp3>      every frame, then <work>/out/the-cradle.mp4
  python edit.py <work> check                   the words against data/bible, and the light of each shot
<work> holds raw/ (the pictures, out of git) and font/ (DM Sans 400 and 500).
"""
import json, math, os, subprocess, sys
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont

W, H, FPS = 1080, 1920, 60
N = 3400  # 56.667 s: the sound is 56.66 s
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))

# ---------------------------------------------------------------- the pictures
SRC = {
    "elgreco": "raw/met_436570.jpg",       # El Greco, The Adoration of the Shepherds, about 1605 to 1610. The Met, 05.42
    "vladimir": "raw/vladimir_rm302.jpg",  # Our Lady of Vladimir, Moscow, mid 16th century, in its silver cover. Russian Museum, DRZh-302
    "berlinghiero": "raw/met_435658.jpg",  # Berlinghiero, Madonna and Child, 1230s. The Met
    "hodegetria14": "raw/rm_3124.jpg",     # Hodegetria of Smolensk, end of the 14th century. Russian Museum, DRZh-3124
    "hodegetria15": "raw/rm_987.jpg",      # Hodegetria, Suzdal, end of the 15th century. Russian Museum, DRZh-987
    "bellini65": "raw/met_459023.jpg",     # Giovanni Bellini, Madonna and Child, about 1465. The Met (Robert Lehman Collection)
    "bellini": "raw/met_435641.jpg",       # Giovanni Bellini, Madonna and Child, late 1480s. The Met
    "smolensk16": "raw/rm_1871.jpg",       # Hodegetria of Smolensk, mid to late 16th century. Russian Museum, DRZh-1871
    "kazan": "raw/rm_623.jpg",             # Our Lady of Kazan, 17th century. Russian Museum, DRZh-623
}

# ---------------------------------------------------------------- the words (asserted against data/bible)
WORDS = {
    "isaiah92": ("O people walking\nin darkness, behold\na great light", "Isaiah 9:2", ("isaiah", 9, 2)),
    "isaiah96": ("For a child is born\nto us, and a son\nis given to us", "Isaiah 9:6", ("isaiah", 9, 6)),
    "matthew1615": ("But whom say ye\nthat I am?", "Matthew 16:15", ("matthew", 16, 15)),
}


def check_words():
    for key, (line, cite, (book, ch, v)) in WORDS.items():
        verse = next(x["text"] for x in json.load(open(f"{ROOT}/data/bible/{book}/{ch}.json"))["verses"] if x["n"] == v)
        flat = " ".join(line.split())
        assert flat in verse, f"{key}: {flat!r} is not in {book} {ch}:{v}: {verse!r}"
    return True


# ---------------------------------------------------------------- easing
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

SYM = bezier(0.37, 0, 0.63, 1)     # a move inside a shot
HOUSE = bezier(0.22, 1, 0.36, 1)   # --ease-house: a light opening, a develop


def ramp(t, segs, v0):
    """segs: (t0, t1, a, b, ease). The value holds the first a before the first t0, and b after each t1."""
    v = segs[0][2] if segs else v0   # before the first segment, its own first value
    for (t0, t1, a, b, e) in segs:
        if t >= t1: v = b
        elif t >= t0: v = a + (b - a) * e((t - t0) / (t1 - t0))
        else: break
    return v


# ---------------------------------------------------------------- the shots
# Each picture shot: the crop is a centre (cx, cy) and a width cw in source pixels at the shot's start and end
# (the height follows from 9:16), moved on SYM. The pool is a soft light centred on (px, py) in source pixels,
# of radius r (a fraction of the frame's width), falling to `floor` of the picture's own light.
# light: the whole frame's light over time; crush: the black point over time; sat: saturation; soft: blur in px.
I = dict(sat=0.30, soft=0.8, floor=0.16, gain=1.50, gamma=0.66)   # Chapter I, the night: the build, held back
II = dict(sat=0.85, soft=0.0, floor=0.30, gain=1.18, gamma=0.95)  # Chapter II, the Mother: the drop, open

SHOTS = [
    # ---- Chapter I, the night (El Greco): light that edits, each shot closer
    dict(n=1, t0=0.00, t1=2.281, src="elgreco", a=(1250, 2150, 2151), b=(1240, 2180, 2050), pool=(1230, 2290, 0.34), **I,
         light=[(0.00, 1.10, 0.80, 1.0, HOUSE)]),
    dict(n=2, t0=2.281, t1=4.342, src="elgreco", a=(1110, 760, 1000), b=(1110, 740, 950), pool=(1090, 650, 0.42), **I),
    dict(n=3, t0=4.342, t1=6.716, src="elgreco", a=(1000, 1560, 1000), b=(985, 1545, 950), pool=(960, 1480, 0.42), **I),
    dict(n=4, t0=6.716, t1=10.53, src="elgreco", a=(1780, 1700, 760), b=(1785, 1690, 715), pool=(1790, 1650, 0.36), **I,
         light=[(9.65, 10.40, 1.0, 0.0, SYM)]),
    dict(n=5, t0=10.53, t1=11.738, src="elgreco", a=(1520, 1650, 640), b=(1520, 1650, 640), pool=(1530, 1585, 0.34), **I,
         light=[(10.53, 10.70, 0.0, 0.0, SYM), (10.70, 11.60, 0.0, 1.0, HOUSE)]),
    dict(n=6, t0=11.738, t1=13.804, src="elgreco", a=(1350, 2160, 900), b=(1345, 2180, 860), pool=(1300, 2250, 0.44), **I),
    dict(n=7, t0=13.804, t1=18.530, src="elgreco", a=(1245, 2300, 600), b=(1245, 2305, 572), pool=(1250, 2310, 0.46), **I,
         radius=[(16.63, 18.10, 0.46, 0.16, SYM)], light=[(16.63, 18.25, 1.0, 0.0, SYM)]),
    # ---- Chapter II, the Mother (the Vladimir in its silver cover): one picture filmed as a scene, wider each cut
    dict(n=8, t0=18.530, t1=20.904, src="vladimir", a=(2330, 1960, 700), b=(2335, 1960, 680), pool=(2330, 1950, 0.62), **II),
    dict(n=9, t0=20.904, t1=23.266, src="vladimir", a=(2560, 2080, 1150), b=(2300, 2150, 1150), pool=(2400, 2100, 0.66), **II),
    dict(n=10, t0=23.266, t1=25.629, src="vladimir", a=(2650, 2600, 1100), b=(2760, 2700, 1080), pool=(2700, 2600, 0.68), **II),
    dict(n=11, t0=25.629, t1=27.992, src="vladimir", a=(2650, 3700, 1900), b=(2650, 3690, 1845), pool=(2600, 3400, 0.74), **II),
    dict(n=12, t0=27.992, t1=30.360, src="vladimir", a=(2640, 2700, 2600), b=(2640, 2690, 2520), pool=(2400, 2300, 0.80), **II),
    dict(n=13, t0=30.360, t1=32.705, src="vladimir", a=(2635, 3000, 3375), b=(2635, 3000, 3290), pool=(2400, 2300, 0.85), **II,
         crush=[(32.00, 32.20, 0.0, 0.58, SYM)]),
    dict(n=14, t0=32.705, t1=37.448, src="vladimir", whole=True, a=(2635, 3000, 5728), b=(2635, 3000, 5560), pool=(2500, 2600, 0.95), **II,
         crush=[(32.705, 33.705, 0.58, 0.0, HOUSE), (35.85, 36.40, 0.0, 1.0, SYM)]),
    # ---- the silence is black (the end of shot 14); Chapter III, the light
    dict(n=15, t0=37.448, t1=42.179, panel="isaiah92", glide=(1.000, 1.025)),
    dict(n=16, t0=42.179, t1=46.881, faces=True),
    dict(n=17, t0=46.881, t1=51.635, panel="isaiah96", glide=(1.000, 1.025)),
    dict(n=18, t0=51.635, t1=54.805, panel="matthew1615", glide=(1.000, 1.020), big=True),
    dict(n=19, t0=54.805, t1=N / FPS + 1, end=True, mark_at=55.107),
]

# The run of faces: one on each beat, the Child's eyes set in the same place. (src, eye one, eye two) in source pixels.
BEATS = [42.179, 42.818, 43.328, 43.961, 44.577, 45.134, 45.708, 46.295]  # measured onsets
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
EYES_AT = (540, 790)   # where the Child's eyes sit, between them
EYE_GAP = 112          # the distance between the eyes on screen, px
MELT = 5               # frames: each face melts into the next over the five frames before its beat

# ---------------------------------------------------------------- loading
_cache = {}

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


GROUND = {"vladimir"}   # pictures photographed on a light ground that a whole shot shows


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


def font(weight, size):
    return ImageFont.truetype(os.path.join(WORK, "font", f"DMSans-{weight}.ttf"), size)


UU, VV = np.meshgrid(np.arange(W, dtype=np.float32), np.arange(H, dtype=np.float32))

# ---------------------------------------------------------------- one picture frame
def view(name, cx, cy, cw, whole=False):
    a0 = src(name)
    sh, sw = a0.shape[:2]
    s = cw / W                      # source pixels for one screen pixel
    if not whole:                   # never show beyond the picture's edge
        hw, hh = s * W / 2, s * H / 2
        cx = sw / 2 if 2 * hw >= sw else min(max(cx, hw), sw - hw)
        cy = sh / 2 if 2 * hh >= sh else min(max(cy, hh), sh - hh)
    lvl = 0
    while s / 2 ** (lvl + 1) >= 1.0 and lvl < 5:
        lvl += 1
    a = src(name, lvl)
    f = 1 / 2 ** lvl
    ss = s * f
    M = np.float32([[ss, 0, cx * f - ss * W / 2], [0, ss, cy * f - ss * H / 2]])
    out = cv2.warpAffine(a, M, (W, H), flags=cv2.INTER_CUBIC | cv2.WARP_INVERSE_MAP,
                         borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0))
    return out, (cx, cy, s)


def grade(img, sat=1.0, soft=0.0, pool=None, floor=1.0, light=1.0, crush=0.0, gain=1.0, geo=None, gamma=1.0):
    x = img.astype(np.float32) / 255.0
    if gamma != 1.0:
        x = np.power(x, gamma)
    if soft > 0:
        x = cv2.GaussianBlur(x, (0, 0), soft)
    if sat != 1.0:
        lum = x @ np.float32([0.2126, 0.7152, 0.0722])
        x = lum[..., None] + sat * (x - lum[..., None])
    if pool is not None:
        px, py, r = pool
        cx, cy, s = geo
        u = (px - cx) / s + W / 2
        v = (py - cy) / s + H / 2
        rr = r * W
        d2 = ((UU - u) ** 2 + (VV - v) ** 2) / (rr * rr)
        m = floor + (1 - floor) * np.exp(-d2)
        x = x * m[..., None]
    x = np.clip(x * (gain * light), 0, 1)
    if crush >= 0.999:
        return np.zeros_like(img)
    if crush > 0:
        lum = x @ np.float32([0.2126, 0.7152, 0.0722])
        k = np.clip((lum - crush) / max(1e-3, 1 - crush), 0, 1) / np.maximum(lum, 1e-4)
        x = x * np.minimum(k, 1.0)[..., None]
    return np.clip(x * 255 + 0.5, 0, 255).astype(np.uint8)


def picture_frame(sh, t):
    p = (t - sh["t0"]) / (sh["t1"] - sh["t0"])
    e = SYM(min(1.0, max(0.0, p)))
    (ax, ay, aw), (bx, by, bw) = sh["a"], sh["b"]
    img, geo = view(sh["src"], ax + (bx - ax) * e, ay + (by - ay) * e, aw + (bw - aw) * e, sh.get("whole", False))
    px, py, r = sh["pool"]
    r = ramp(t, sh.get("radius", []), r)
    return grade(img, sat=sh["sat"], soft=sh["soft"], pool=(px, py, r), floor=sh["floor"],
                 light=ramp(t, sh.get("light", []), 1.0), crush=ramp(t, sh.get("crush", []), 0.0),
                 gain=sh["gain"], geo=geo, gamma=sh.get("gamma", 1.0))


# ---------------------------------------------------------------- the white panels
_panels = {}

def panel(key, big=False):
    if key in _panels: return _panels[key]
    line, cite, _ = WORDS[key]
    im = Image.new("RGB", (W, H), (250, 250, 250))
    d = ImageDraw.Draw(im)
    size = 96 if big else 78
    f, fc = font(500, size), font(400, 38)
    lines = line.split("\n")
    lh = round(size * 1.18)
    block = lh * len(lines) + 28 + 40
    y = 700 - block // 2
    for ln in lines:
        d.text((120, y), ln, font=f, fill=(17, 17, 17))
        assert d.textlength(ln, font=f) <= 840, f"{ln!r} is wider than 840 px"
        y += lh
    d.text((120, y + 28), cite, font=fc, fill=(92, 92, 92))
    _panels[key] = np.array(im)
    return _panels[key]


def glide(img, z, centre=(540, 700), bg=(250, 250, 250)):
    if abs(z - 1) < 1e-6: return img
    cx, cy = centre
    M = np.float32([[1 / z, 0, cx - cx / z], [0, 1 / z, cy - cy / z]])
    return cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_CUBIC | cv2.WARP_INVERSE_MAP,
                          borderMode=cv2.BORDER_CONSTANT, borderValue=bg)


# ---------------------------------------------------------------- the faces
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
    img, geo = view(name, cx, cy, cw, whole=True)
    _faces[k] = grade(img, sat=1.0, pool=(mx, my + 40 * s, 0.75), floor=0.42, gain=1.08, geo=geo)
    return _faces[k]


def faces_frame(i):
    t = i / FPS
    k = max(j for j, b in enumerate(BEATS[:len(FACES)]) if i >= first(b) or j == 0)
    nxt = k + 1
    if nxt < len(FACES):
        start = first(BEATS[nxt]) - MELT
        if i >= start:
            a = (i - start + 1) / (MELT + 1)
            return cv2.addWeighted(face(k), 1 - a, face(nxt), a, 0)
    return face(k)


# ---------------------------------------------------------------- the end
_mark = None

def mark_frame(t, sh):
    global _mark
    out = np.zeros((H, W, 3), np.uint8)
    if round(t * FPS) < first(sh["mark_at"]):
        return out
    if _mark is None:
        _mark = np.array(Image.open(os.path.join(ROOT, "public", "purify-cross-mark.png")).convert("RGBA")).astype(np.float32) / 255
    mh, mw = _mark.shape[:2]
    x0, y0 = W // 2 - mw // 2, H // 2 - mh // 2
    a = _mark[..., 3:4]
    region = out[y0:y0 + mh, x0:x0 + mw].astype(np.float32) / 255
    out[y0:y0 + mh, x0:x0 + mw] = np.clip((region * (1 - a) + _mark[..., :3] * a) * 255 + 0.5, 0, 255).astype(np.uint8)
    return out


# ---------------------------------------------------------------- one frame
def first(t):
    """The frame that holds time t: a cut lands on its beat's frame, never after it."""
    return math.floor(t * FPS + 1e-6)


def shot_at(i):
    for sh in SHOTS:
        if first(sh["t0"]) <= i < first(sh["t1"]):
            return sh
    return SHOTS[-1]


def frame(i):
    t = i / FPS
    sh = shot_at(i)
    if "src" in sh: return picture_frame(sh, t)
    if "panel" in sh:
        p = min(1.0, max(0.0, (t - sh["t0"]) / (sh["t1"] - sh["t0"])))
        z0, z1 = sh["glide"]
        return glide(panel(sh["panel"], sh.get("big", False)), z0 + (z1 - z0) * SYM(p))
    if sh.get("faces"): return faces_frame(i)
    return mark_frame(t, sh)


# ---------------------------------------------------------------- commands
def cmd_still(times):
    os.makedirs(os.path.join(WORK, "stills"), exist_ok=True)
    for ts in times:
        i = round(float(ts) * FPS)
        p = os.path.join(WORK, "stills", f"{float(ts):06.2f}.jpg")
        Image.fromarray(frame(i)).save(p, quality=92)
        print(p)


def cmd_sheet():
    times = [1.20, 3.30, 8.00, 15.00, 18.60, 26.80, 34.00, 39.00, 44.00, 53.00, 56.00]
    tw, th = 270, 480
    sheet = Image.new("RGB", (6 * (tw + 8), 2 * (th + 34)), (12, 12, 12))
    d = ImageDraw.Draw(sheet)
    f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 18)
    for k, ts in enumerate(times):
        im = Image.fromarray(frame(round(ts * FPS))).resize((tw, th), Image.LANCZOS)
        x, y = (k % 6) * (tw + 8), (k // 6) * (th + 34)
        sheet.paste(im, (x, y + 30))
        d.text((x + 4, y + 6), f"{ts:.2f} s", fill=(255, 220, 0), font=f)
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
            if k % 20 == 0:
                print(f"frame {chunks[k][1]} of {N}", flush=True)
    ff.stdin.close()
    ff.wait()
    print(path)


def cmd_check():
    check_words()
    print("words: every line is in data/bible")
    for sh in SHOTS:
        mid = (sh["t0"] + min(sh["t1"], N / FPS)) / 2
        x = frame(round(mid * FPS)).astype(np.float32) / 255
        lum = x @ np.float32([0.2126, 0.7152, 0.0722])
        print(f"shot {sh['n']:2d} at {mid:5.2f} s: frame luma {lum.mean():.3f}, brightest tenth {np.percentile(lum, 90):.3f}")


if __name__ == "__main__":
    WORK = os.path.abspath(sys.argv[1])
    c = sys.argv[2]
    if c == "still": cmd_still(sys.argv[3:])
    elif c == "sheet": cmd_sheet()
    elif c == "render": cmd_render(sys.argv[3])
    elif c == "check": cmd_check()
else:
    WORK = os.environ.get("EDIT3_WORK", ".promo/edit-3")
