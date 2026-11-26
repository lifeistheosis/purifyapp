"""Purify: the meek edit, a one to one copy of the reference edit: its cut, its moves and its look.

Every cut, move and transition is on the reference's own frame numbers (30 fps,
558 frames), and every shot wears the reference shot's look (look.py): the
colour shots its grade and glow, the black and white shots its manga ink on
white, the cards its comic capitals, the end its brush capitals in a white glow.
Pictures are public-domain works (art.json); words are verbatim KJV.

  python fetch.py                                     the pictures, faces and narration, checked
  python render.py --stills 0,45,...  --out DIR     stills as PNG
  python render.py --video OUT.mp4                    silent master (sound is muxed later)
  Everything it reads and writes is under .promo/meek-edit/ (MEEK_WORK moves it).
"""
import argparse, json, math, os, subprocess, sys
from concurrent.futures import ProcessPoolExecutor

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import look as LK  # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
ROOT = os.environ.get("MEEK_WORK") or os.path.join(REPO, ".promo", "meek-edit")  # out of git
SRC = os.path.join(ROOT, "src")
FONTS = os.path.join(ROOT, "fonts")
CACHE = os.path.join(ROOT, "cache-v2")
GRADE = json.load(open(os.path.join(HERE, "grade_ref.json")))

W = H = 1080
FPS = 30
N = 558
C2 = 2 * W                     # the cards' canvas, twice the frame, so type stays sharp through the zoom
PANEL = (0.17, 0.04, 0.83, 0.70)
TEXT_INK = np.array([0.07, 0.07, 0.07], np.float32)
END_TOP = np.array([0.075, 0.060, 0.050], np.float32)   # the reference's end ground: near black, warm
END_BOTTOM = np.array([0.018, 0.016, 0.015], np.float32)
END_TEXT = np.array([0.80, 0.80, 0.80], np.float32)

# ---------------------------------------------------------------- helpers

def clamp01(x):
    return max(0.0, min(1.0, x))

def ease_out(x):
    x = clamp01(x)
    return 1 - (1 - x) ** 3

def ease_in_out(x):
    x = clamp01(x)
    return 4 * x ** 3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2

def smooth(x):
    x = clamp01(x)
    return x * x * (3 - 2 * x)

def load(name):
    im = cv2.imread(os.path.join(SRC, name), cv2.IMREAD_COLOR)
    return cv2.cvtColor(im, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0

def square(img, x0, y0, size, out):
    c = img[int(round(y0)):int(round(y0 + size)), int(round(x0)):int(round(x0 + size))]
    return cv2.resize(c, (out, out), interpolation=cv2.INTER_AREA if out < c.shape[0] else cv2.INTER_LANCZOS4)

def view(img, crop, z=1.0, fixed=(0.5, 0.5), shift=(0.0, 0.0), border=0.0, size_out=(W, H)):
    """Map a square crop of `img` to the frame, zoomed by z about frame point `fixed`."""
    x0, y0, size = crop
    fx, fy = fixed
    a = z * size_out[0] / size
    bx = fx * size_out[0] - a * (x0 + fx * size) + shift[0] * size_out[0]
    by = fy * size_out[1] - a * (y0 + fy * size) + shift[1] * size_out[1]
    M = np.float32([[a, 0, bx], [0, a, by]])
    src = img
    if a < 0.8:
        src = cv2.GaussianBlur(img, (0, 0), 0.45 / a)
    bv = (border,) * (3 if img.ndim == 3 else 1)
    return cv2.warpAffine(src, M, size_out, flags=cv2.INTER_CUBIC if a >= 1 else cv2.INTER_LINEAR,
                          borderMode=cv2.BORDER_CONSTANT, borderValue=bv)

YY, XX = np.mgrid[0:H, 0:W].astype(np.float32)
RR = np.sqrt(((XX - W / 2) / (W / 2)) ** 2 + ((YY - H / 2) / (H / 2)) ** 2)

def bloom(img, strength, sigma):
    return LK.screen(img, strength * cv2.GaussianBlur(img, (0, 0), sigma))

def vignette(img, amount):
    return img * (1 - amount * np.clip(RR / 1.41, 0, 1) ** 2)[..., None]

def paper_vignette(img):
    """The reference's white pages darken to a soft grey at the corners."""
    v = 0.40 * np.clip((RR - 0.5) / 0.91, 0, 1) ** 1.5
    return img * (1 - v[..., None]) + 0.45 * v[..., None]

def grain(img, f, amount):
    rng = np.random.default_rng(1000 + f)
    g = cv2.GaussianBlur(rng.normal(0, 1, (H, W)).astype(np.float32), (0, 0), 0.7)
    return np.clip(img + amount * g[..., None], 0, 1)

def feather_rect(x0, y0, x1, y1, sigma, grow=0.0):
    m = np.zeros((H, W), np.float32)
    cv2.rectangle(m, (int((x0 - grow) * W), int((y0 - grow) * H)), (int((x1 + grow) * W), int((y1 + grow) * H)), 1.0, -1)
    return cv2.GaussianBlur(m, (0, 0), sigma)

def font(name, size):
    return ImageFont.truetype(os.path.join(FONTS, name), size)

def text_block(lines, face, size, pitch, canvas, centre, squeeze=0.93, spacing=0):
    """Centred lines of type, as an alpha mask; each line narrowed a touch, as the reference's lettering is."""
    cw, ch = canvas
    out = np.zeros((ch, cw), np.float32)
    fnt = font(face, size)
    y = centre[1] * ch - pitch * len(lines) / 2
    for ln in lines:
        probe = ImageDraw.Draw(Image.new("L", (10, 10)))
        tw = sum(probe.textlength(c, font=fnt) for c in ln) + spacing * (len(ln) - 1)
        im = Image.new("L", (int(tw + 40), int(pitch * 1.6)), 0)
        d = ImageDraw.Draw(im)
        x = 20
        for c in ln:
            d.text((x, pitch * 0.25), c, font=fnt, fill=255)
            x += d.textlength(c, font=fnt) + spacing
        a = np.asarray(im, np.float32) / 255.0
        a = cv2.resize(a, (max(1, int(a.shape[1] * squeeze)), a.shape[0]), interpolation=cv2.INTER_AREA)
        x0 = int(centre[0] * cw - a.shape[1] / 2)
        y0 = int(y - pitch * 0.25)
        ys, xs = max(0, y0), max(0, x0)
        ye, xe = min(ch, y0 + a.shape[0]), min(cw, x0 + a.shape[1])
        out[ys:ye, xs:xe] = np.maximum(out[ys:ye, xs:xe], a[ys - y0:ye - y0, xs - x0:xe - x0])
        y += pitch
    return out

# ---------------------------------------------------------------- the pictures, prepared once (cached)

def build():
    os.makedirs(CACHE, exist_ok=True)
    A = {}
    # S1 and panel 1: the Sinai Pantocrator, graded to the reference's opening, and the same in ink.
    sin = load("s1_sinai.jpg")
    s1 = square(sin, 0, 296, 1700, 1600)
    A["s1"] = LK.punch(LK.transfer(s1, GRADE["S1"], sL=0.45, sab=0.7))
    A["s1_ink"] = LK.ink_icon(s1, scale=1.5)
    # Panels 2 to 5: four more icons of Christ, in ink.
    def panel(name, cx, cy, ph, **kw):
        im = load(name)
        hgt = ph * im.shape[0]
        wid = hgt * (PANEL[2] - PANEL[0]) / (PANEL[3] - PANEL[1])
        x0 = cx * im.shape[1] - wid / 2
        y0 = cy * im.shape[0] - hgt / 2
        c = im[int(max(0, y0)):int(y0 + hgt), int(max(0, x0)):int(x0 + wid)]
        c = cv2.resize(c, (900, int(900 * c.shape[0] / c.shape[1])), interpolation=cv2.INTER_AREA if c.shape[1] > 900 else cv2.INTER_LANCZOS4)
        return LK.ink_icon(c, scale=1.2, **kw)
    A["p2"] = panel("p2_ushakov.jpg", 0.50, 0.49, 0.70)
    A["p3"] = panel("p3_vysotsky.jpg", 0.50, 0.255, 0.40)
    A["p4"] = panel("p4_novgorod.jpg", 0.50, 0.53, 0.66, black=0.11, tone_hi=0.27, white=0.33, min_area=220)
    A["p5"] = panel("p5_vasnetsov.jpg", 0.46, 0.335, 0.56)
    # S3: Kramskoi, graded to the reference's backlit close-up, then its cream haze.
    kra = load("s3_kramskoi.jpg")
    s3 = square(kra, 1500, 520, 1330, 1330)
    A["s3"] = LK.highkey(LK.transfer(s3, GRADE["S3"], sL=0.85, sab=0.8))
    # S4: Polenov's lake in the forest shot's golden hour.
    pol = load("s4_genesaret.jpg")
    A["s4"] = LK.golden_hour(square(pol, 1279, 96, 1000, 1000), wb=(1.07, 1.0, 0.82), sat=0.85, crush=3.1, orton=0.42)
    # S5: Dreams, in ink, on paper, with the first card.
    dre = load("s5_dreams.jpg")
    # cut so He sits large at lower left with open sky at upper right, as the reference's figure and card do
    A["s5"] = LK.ink_paint(square(dre, 675, 0, 825, C2), scale=2.0, black=0.07, hatch_hi=0.42, cross=0.20, white=0.58)
    A["t5"] = text_block(["I AM", "MEEK AND", "LOWLY", "IN HEART"], "ComicRelief-Bold.ttf", 84, 104, (C2, C2), (0.75, 0.33))
    # S6: He returned into Galilee, in ink, laid on paper, with the second card.
    gal = load("s6_galilee_rm.jpg")
    sx1, sy0, sy1 = 0.62 * gal.shape[1], 0.06 * gal.shape[0], 0.80 * gal.shape[0]
    part = gal[int(sy0):int(sy1), 0:int(sx1)]
    s = 0.80 * C2 / part.shape[0]
    pic = cv2.resize(part, (round(part.shape[1] * s), round(part.shape[0] * s)), interpolation=cv2.INTER_LANCZOS4)
    pic = LK.ink_paint(pic, scale=2.0)
    canvas = np.ones((C2, C2), np.float32)
    ox, oy = round(0.42 * C2 - 0.405 * gal.shape[1] * s), round(0.24 * C2 - (0.21 * gal.shape[0] - sy0) * s)
    y0, y1 = max(0, oy), min(C2, oy + pic.shape[0])
    x0, x1 = max(0, ox), min(C2, ox + pic.shape[1])
    canvas[y0:y1, x0:x1] = pic[y0 - oy:y1 - oy, x0 - ox:x1 - ox]
    yy, xx = np.mgrid[0:C2, 0:C2].astype(np.float32)
    m = np.exp(-(((xx - 0.41 * C2) / (0.19 * C2)) ** 4 + ((yy - 0.49 * C2) / (0.31 * C2)) ** 4))
    inside = np.zeros((C2, C2), np.float32)
    inside[y0:y1, x0:x1] = 1
    inside = cv2.GaussianBlur(cv2.erode(inside, np.ones((301, 301), np.uint8)), (0, 0), 60)
    m = cv2.GaussianBlur(m, (0, 0), 40) * inside
    A["s6"] = 1 - (1 - canvas) * m
    A["t6"] = text_block(["THE KINGDOM", "OF GOD", "IS WITHIN", "YOU."], "ComicRelief-Bold.ttf", 110, 136, (C2, C2), (0.835, 0.175))
    # The end: PURIFY in brush capitals.
    A["end"] = text_block(["PURIFY"], "PermanentMarker-Regular.ttf", 104, 150, (W, H), (0.5, 0.5), squeeze=1.0, spacing=14)
    for k, v in A.items():
        np.save(os.path.join(CACHE, k + ".npy"), v.astype(np.float16))
    return A

A = None
GLOW_MASK = PANEL_MASK = None

def assets():
    global A, GLOW_MASK, PANEL_MASK
    if A is None:
        names = ["s1", "s1_ink", "p2", "p3", "p4", "p5", "s3", "s4", "s5", "t5", "s6", "t6", "end"]
        if all(os.path.exists(os.path.join(CACHE, n + ".npy")) for n in names):
            A = {n: np.load(os.path.join(CACHE, n + ".npy")).astype(np.float32) for n in names}
        else:
            A = build()
        PANEL_MASK = feather_rect(*PANEL, sigma=18)
        GLOW_MASK = feather_rect(*PANEL, sigma=40, grow=0.02)
    return A

# ---------------------------------------------------------------- light: discs, dust, flakes

PEACH = np.array([1.0, 0.80, 0.62], np.float32)
ORANGE = np.array([1.0, 0.62, 0.38], np.float32)
BOKEH = [  # x, y, r (of the frame), alpha, colour, drift x, drift y (per second)
    (0.10, 0.31, 0.055, 0.45, PEACH, 0.006, -0.004),
    (0.07, 0.16, 0.032, 0.30, PEACH, 0.004, -0.003),
    (0.68, 0.61, 0.042, 0.36, ORANGE, -0.005, -0.004),
    (0.78, 0.67, 0.036, 0.32, ORANGE, -0.004, -0.003),
    (0.43, 0.64, 0.070, 0.15, ORANGE, 0.003, -0.002),
]

def bokeh(img, t):
    acc = np.zeros((H, W, 3), np.float32)
    for x, y, r, a, col, vx, vy in BOKEH:
        px, py, pr = (x + vx * t) * W, (y + vy * t) * H, r * W
        R = int(pr * 1.2) + 2
        x0, x1 = int(max(0, px - R)), int(min(W, px + R))
        y0, y1 = int(max(0, py - R)), int(min(H, py + R))
        d = np.sqrt((XX[y0:y1, x0:x1] - px) ** 2 + (YY[y0:y1, x0:x1] - py) ** 2)
        disc = LK.smoothstep(pr, pr * 0.82, d) * 0.85 + 0.15 * np.exp(-((d - 0.9 * pr) / (0.08 * pr)) ** 2)
        acc[y0:y1, x0:x1] += (1.3 * a * disc)[..., None] * col
    return LK.screen(img, np.clip(acc, 0, 1))

def dots(img, xs, ys, rs, als):
    acc = np.zeros((H, W), np.float32)
    for x, y, r, a in zip(xs, ys, rs, als):
        px, py = x * W, y * H
        R = int(r * 3 + 4)
        x0, x1 = int(max(0, px - R)), int(min(W, px + R + 1))
        y0, y1 = int(max(0, py - R)), int(min(H, py + R + 1))
        if x0 >= x1 or y0 >= y1:
            continue
        gx = XX[y0:y1, x0:x1] - px
        gy = YY[y0:y1, x0:x1] - py
        acc[y0:y1, x0:x1] += a * np.exp(-(gx * gx + gy * gy) / (2 * r * r))
    return LK.screen(img, np.clip(acc, 0, 1)[..., None])

RNG = np.random.default_rng(7)
SPECKS = dict(x=RNG.uniform(0, 1, 22), y=RNG.uniform(0, 1, 22), r=RNG.uniform(0.8, 1.8, 22), a=RNG.uniform(0.3, 0.7, 22),
              vy=RNG.uniform(-0.01, 0.01, 22))
FLAKES = dict(x=RNG.uniform(0, 1.1, 95), y=RNG.uniform(-0.1, 1.1, 95), r=RNG.choice([1.4, 1.9, 2.5, 3.2, 4.0], 95, p=[.25, .3, .22, .15, .08]),
              a=RNG.uniform(0.45, 0.85, 95), vy=RNG.uniform(0.04, 0.09, 95), vx=RNG.uniform(-0.03, -0.01, 95))
BIG = dict(x=RNG.uniform(0, 1.1, 14), y=RNG.uniform(0, 1.1, 14), r=RNG.uniform(10, 24, 14), a=RNG.uniform(0.16, 0.32, 14),
           vy=RNG.uniform(0.06, 0.11, 14), vx=RNG.uniform(-0.04, -0.02, 14))

# ---------------------------------------------------------------- the shots

def shot_s1(f):
    a = assets()
    z = 1.0 + 0.05 * (f / 141)
    img = view(a["s1"], (0, 0, a["s1"].shape[0]), z, fixed=(0.5, 0.31))
    img = bloom(img, 0.26, 22)
    t = f / FPS
    img = bokeh(img, t)
    s = SPECKS
    img = dots(img, s["x"], (s["y"] + s["vy"] * t) % 1.0, s["r"], s["a"])
    pulse = math.exp(-((f - 29) / 2.2) ** 2) * 0.07  # the warm breath of light at 0.93 s
    if pulse > 0.003:
        img = LK.screen(img, pulse * PEACH)
    return img, z

PANELS = [(41, 50, 1), (51, 59, 2), (60, 68, 3), (69, 91, 4), (92, 102, 5), (103, 110, 4), (111, 118, 3), (119, 139, 1)]

def shot_s2(f):
    a = assets()
    bg, z = shot_s1(f)
    which, f0, f1 = 1, 119, 139
    for p0, p1, w in PANELS:
        if p0 <= f <= p1:
            which, f0, f1 = w, p0, p1
    k = (f - f0) / max(1, (f1 - f0))
    pz = 1.0 + (0.035 if which == 4 else 0.02) * k
    if which == 1:
        pan = view(a["s1_ink"], (0, 0, a["s1_ink"].shape[0]), z, fixed=(0.5, 0.31), border=1.0)
    else:
        im = a[f"p{which}"]
        pw = (PANEL[2] - PANEL[0]) * W
        s = pz * pw / im.shape[1]
        cx, cy = (PANEL[0] + PANEL[2]) / 2 * W, (PANEL[1] + PANEL[3]) / 2 * H
        M = np.float32([[s, 0, cx - s * im.shape[1] / 2], [0, s, cy - s * im.shape[0] / 2]])
        pan = cv2.warpAffine(im, M, (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_CONSTANT, borderValue=1.0)
    pan = np.dstack([pan, pan, pan])
    bg = LK.screen(bg, 0.05)
    bg = LK.screen(bg, 0.55 * GLOW_MASK[..., None])  # the white halo the reference's panels throw
    m = PANEL_MASK[..., None]
    return bg * (1 - m) + pan * m

def shot_s3(f):
    a = assets()
    z = 1.0 + 0.075 * clamp01((f - 139) / 165)
    img = view(a["s3"], (0, 0, a["s3"].shape[0]), z, fixed=(0.50, 0.27))
    img = bloom(img, 0.30, 26)
    t = (f - 139) / FPS
    # light passing over the clasped hands, 5.8 s to 7.2 s, where it ran along the sword: a soft pool
    k = clamp01((f / FPS - 5.8) / 1.4)
    if 0 < k < 1:
        cx = (0.38 + 0.24 * smooth(k)) * W
        g = np.exp(-(((XX - cx) / 90) ** 2 + ((YY - 0.80 * H) / 45) ** 2)) * 0.24 * math.sin(math.pi * k)
        img = LK.screen(img, g[..., None] * np.array([1.0, 0.96, 0.88], np.float32))
    fl = FLAKES
    ys = (fl["y"] + fl["vy"] * t) % 1.2 - 0.1
    xs = (fl["x"] + fl["vx"] * t) % 1.2 - 0.05
    img = dots(img, xs, ys, fl["r"], fl["a"])
    b = BIG
    img = dots(img, (b["x"] + b["vx"] * t) % 1.2 - 0.05, (b["y"] + b["vy"] * t) % 1.2 - 0.1, b["r"], b["a"])
    return img

def s4_frame(f):
    a = assets()
    z = 1.0 + 0.045 * clamp01((f - 290) / 39)
    img = view(a["s4"], (0, 0, a["s4"].shape[0]), z, fixed=(0.62, 0.52))
    return vignette(bloom(img, 0.12, 18), 0.30)

def shot_s4(f):
    if f >= 303:
        return s4_frame(f)
    behind = shot_s3(f)
    src = s4_frame(f)
    k = (f - 235) / (288 - 235)
    p = 0.55 + 0.45 * ease_out(k) if f <= 288 else 1.0 + 0.03 * clamp01((f - 288) / 15)
    bend = 0.20 * (1 - ease_out((f - 235) / (300 - 235)))
    tilt = 0.07 * (1 - ease_out((f - 235) / (290 - 235)))
    cx, cy = 0.5, 0.47 + 0.03 * ease_out(k)
    qx = (XX / W - cx) / p
    qy = (YY / H - cy) / p
    qy = qy / (1 + tilt * qx * 2)
    r2 = qx * qx + qy * qy
    qx = qx * (1 + bend * r2 * 4)
    qy = qy * (1 + bend * r2 * 4)
    panel = cv2.remap(src, (qx + 0.5) * W, (qy + 0.5) * H, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0))
    inside = ((qx > -0.5) & (qx < 0.5) & (qy > -0.5) & (qy < 0.5)).astype(np.float32)
    inside = cv2.GaussianBlur(inside, (0, 0), 0.8)[..., None]
    if f < 240:
        panel = cv2.GaussianBlur(panel, (0, 0), 3.0 * (240 - f) / 5)
    shade = cv2.GaussianBlur(inside[..., 0], (0, 0), 18)[..., None]
    behind = behind * (1 - 0.35 * shade)
    return behind * (1 - inside) + panel * inside

# The fixed points of the zooms, measured on the reference. Its first card rides its picture: the centre
# goes from (0.75, 0.33) to (0.53, 0.39). Its second card is its own layer: it grows only 1.25 times while
# the picture behind zooms past it, its centre going from (0.835, 0.165) to (0.57, 0.33).
S5_FIX = (1.05, 0.25)
S6_FIX = (1.30, 0.0)
T6_FIX = (1.917, -0.509)
T6_GROW = 0.25

def s5_layer(f, text_e=1.0):
    a = assets()
    t = a["t5"]
    if text_e < 1:
        sig = 10 * (1 - text_e)
        t = (cv2.GaussianBlur(t, (0, 0), sig) if sig > 0.3 else t) * text_e
    canvas = a["s5"][..., None] * (1 - t[..., None]) + TEXT_INK * t[..., None]
    z = 1.0 + 0.10 * clamp01((f - 332) / 90)
    for fi in (345, 358, 365, 370, 377, 395, 407):
        z += 0.09 * ease_out((f - fi) / 8)
    return canvas, z

def z6(f):
    return 1.0 + 0.10 * clamp01((f - 430) / 37) + 0.35 * ease_out((f - 468) / 9) + 0.10 * clamp01((f - 477) / 26)

Z6_END = 1.55

def s6_frame(f, shift=(0.0, 0.0)):
    """The walking figure zooms; the second card, its own layer, grows less and slides to the middle."""
    a = assets()
    z = z6(f)
    img = warp_canvas(np.dstack([a["s6"]] * 3), z, S6_FIX, shift)
    zt = 1.0 + T6_GROW * (z - 1.0) / (Z6_END - 1.0)
    t = view(a["t6"], (0, 0, C2), zt, fixed=T6_FIX, shift=shift, border=0.0)[..., None]
    return img * (1 - t) + TEXT_INK * t

def warp_canvas(canvas, z, fixed, shift=(0, 0)):
    return view(canvas, (0, 0, canvas.shape[0]), z, fixed=fixed, shift=shift, border=1.0)

def shot_s5(f):
    canvas, z = s5_layer(f, text_e=ease_out((f - 330) / 6))
    return paper_vignette(warp_canvas(canvas, z, S5_FIX))

def shot_s6(f):
    return paper_vignette(s6_frame(f))

def whip1(f):
    bx = {329: 0.06, 330: 0.30, 331: 0.68}[f]
    out = cv2.blur(s4_frame(f), (31, 1))
    nxt, _ = s5_layer(332, text_e=0.0)
    nxt = cv2.blur(paper_vignette(warp_canvas(nxt, 1.0, S5_FIX)), (41, 1))
    x = XX / W
    left = cv2.GaussianBlur((x < bx).astype(np.float32), (0, 0), 14)[..., None]
    band = np.exp(-((x - bx) / 0.10) ** 2)[..., None]
    wash = np.clip(1 - (bx - x) / 0.35, 0, 1)[..., None] * left
    img = out * (1 - left) + (nxt * (1 - 0.8 * wash) + 0.8 * wash) * left
    return LK.screen(img, band)

def whip2(f):
    e0 = ease_in_out((f - 0.5 - 423) / 10)
    e1 = ease_in_out((f + 0.5 - 423) / 10)
    acc5 = np.zeros((H, W, 3), np.float32)
    acc6 = np.zeros((H, W, 3), np.float32)
    n = 13
    c5, z5 = s5_layer(422)
    for i in range(n):
        e = e0 + (e1 - e0) * (i + 0.5) / n
        out5 = warp_canvas(c5, z5, S5_FIX, shift=(-0.42 * e, 0.30 * e))
        acc5 += 1 - (1 - out5) * (1 - 0.55 * e)
        acc6 += s6_frame(430, shift=(0.32 * (1 - e), -0.24 * (1 - e)))
    return paper_vignette((acc5 / n) * (acc6 / n))

GRAD = (END_TOP[None, None, :] * (1 - (YY / H)[..., None]) * (0.6 + 0.4 * (XX / W)[..., None])
        + END_BOTTOM[None, None, :] * (YY / H)[..., None])

def end_layer(f):
    a = assets()
    word = a["end"]
    cols = np.where(word.max(axis=0) > 0.05)[0]
    xl, xr = (cols.min() / W, cols.max() / W) if len(cols) else (0.3, 0.7)
    edge = xl + (xr - xl + 0.06) * clamp01((f - 512) / 23)  # a soft wipe reveals it left to right
    reveal = LK.smoothstep(edge, edge - 0.06, XX / W)
    s = 1.0 + 0.03 * clamp01((f - 512) / 37)
    M = cv2.getRotationMatrix2D((W / 2, H / 2), 0, s)
    w = cv2.warpAffine(word, M, (W, H), flags=cv2.INTER_LINEAR) * reveal
    if f >= 549:
        w = w * (1 - smooth((f - 549) / 8))
    flick = 0.94 + 0.06 * math.sin(f * 1.7) * math.sin(f * 0.61 + 1.0)
    fresh = LK.smoothstep(edge - 0.10, edge - 0.02, XX / W) * w  # just-revealed letters glow brighter
    g1 = cv2.GaussianBlur(w, (0, 0), 6) * 0.50 * flick
    g2 = cv2.GaussianBlur(w + fresh, (0, 0), 18) * 0.32 * flick
    return w, np.clip(g1 + g2, 0, 1)

def dim_and_end(f):
    d = smooth((f - 503) / 14)
    if f <= 517:
        img = shot_s6(f) * (1 - d) + GRAD * d
    else:
        img = GRAD.copy()
    if f >= 512:
        w, g = end_layer(f)
        img = img * (1 - w[..., None]) + END_TEXT * w[..., None]
        img = LK.screen(img, g[..., None] * np.array([1.0, 1.0, 1.0], np.float32))
    return img

# ---------------------------------------------------------------- the edit

def frame(f):
    if f <= 40:
        img = vignette(shot_s1(f)[0], 0.12)
    elif f <= 138:
        img = vignette(shot_s2(f), 0.12)
    elif f <= 141:
        w = {139: 0.62, 140: 0.97, 141: 0.55}[f]
        under = vignette(shot_s2(f), 0.12) if f == 139 else shot_s3(f)
        img = under * (1 - w) + w
    elif f <= 234:
        img = shot_s3(f)
        if f <= 144:
            img = LK.screen(img, np.full_like(img, {142: 0.14, 143: 0.06, 144: 0.02}[f]))
    elif f <= 328:
        img = shot_s4(f)
    elif f <= 331:
        img = whip1(f)
    elif f <= 422:
        img = shot_s5(f)
    elif f <= 432:
        img = whip2(f)
    elif f <= 502:
        img = shot_s6(f)
    else:
        img = dim_and_end(f)
    amount = 0.014 if f <= 331 else (0.012 if f >= 503 else 0.010)
    return np.clip(grain(img, f, amount), 0, 1)

def to_u8(img):
    return (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8)

def _render_one(f):
    return f, to_u8(frame(f))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--stills")
    ap.add_argument("--out", default=os.path.join(ROOT, "stills"))
    ap.add_argument("--video")
    ap.add_argument("--range")
    ap.add_argument("--jobs", type=int, default=4)
    ap.add_argument("--rebuild", action="store_true", help="prepare the pictures again, ignoring the cache")
    args = ap.parse_args()
    if args.rebuild or not os.path.exists(os.path.join(CACHE, "end.npy")):
        build()
    if args.stills:
        os.makedirs(args.out, exist_ok=True)
        fs = [int(x) for x in args.stills.split(",")]
        with ProcessPoolExecutor(args.jobs) as ex:
            for f, u8 in ex.map(_render_one, fs):
                Image.fromarray(u8).save(os.path.join(args.out, f"f{f:03d}.png"))
                print("still", f, flush=True)
        return
    if args.video:
        lo, hi = (0, N) if not args.range else map(int, args.range.split(":"))
        cmd = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
               "-c:v", "libx264", "-preset", "slow", "-crf", "15", "-pix_fmt", "yuv420p", "-profile:v", "high",
               "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-movflags", "+faststart", args.video]
        p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
        with ProcessPoolExecutor(args.jobs) as ex:
            for f, u8 in ex.map(_render_one, range(lo, hi), chunksize=2):
                p.stdin.write(u8.tobytes())
                if f % 30 == 0:
                    print("frame", f, flush=True)
        p.stdin.close()
        p.wait()
        print("done", args.video)

if __name__ == "__main__":
    main()
