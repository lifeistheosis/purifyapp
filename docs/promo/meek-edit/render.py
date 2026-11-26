"""Purify: the "meek" edit, a frame-exact copy of the reference edit's structure.

Every cut, move and transition is placed on the reference's own frame numbers
(30 fps, 558 frames). Pictures are public-domain works (see provenance.json);
words are verbatim KJV, the app's own Bible.

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
REPO = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
ROOT = os.environ.get("MEEK_WORK") or os.path.join(REPO, ".promo", "meek-edit")  # out of git
SRC = os.path.join(ROOT, "src")
FONTS = os.path.join(ROOT, "fonts")
W = H = 1080
FPS = 30
N = 558

INK = np.array([0x49, 0x42, 0x4E], np.float32) / 255.0      # --color-ink
GROUND = np.array([0x10, 0x10, 0x13], np.float32) / 255.0   # --color-night
GLOW = np.array([0xEA, 0xEA, 0xEC], np.float32) / 255.0     # --color-gold: a glowing white

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
    im = cv2.cvtColor(im, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
    return im

def prescale(img, crop, target=1600):
    """Shrink a big source so its base crop is about `target` px; returns img, crop."""
    x0, y0, size = crop
    if size <= target:
        return img, crop
    s = target / size
    img = cv2.resize(img, (round(img.shape[1] * s), round(img.shape[0] * s)), interpolation=cv2.INTER_AREA)
    return img, (x0 * s, y0 * s, size * s)

def view(img, crop, z=1.0, fixed=(0.5, 0.5), shift=(0.0, 0.0), border=0.0, size_out=(W, H)):
    """Map a square crop of `img` to the frame, zoomed by z about frame point `fixed`."""
    x0, y0, size = crop
    fx, fy = fixed
    a = z * size_out[0] / size
    bx = fx * size_out[0] - a * (x0 + fx * size) + shift[0] * size_out[0]
    by = fy * size_out[1] - a * (y0 + fy * size) + shift[1] * size_out[1]
    M = np.float32([[a, 0, bx], [0, a, by]])
    flags = cv2.INTER_CUBIC if a >= 1 else cv2.INTER_LINEAR
    src = img
    if a < 0.8:  # soften before shrinking so fine detail does not alias
        sig = 0.45 / a
        src = cv2.GaussianBlur(img, (0, 0), sig)
    return cv2.warpAffine(src, M, size_out, flags=flags, borderMode=cv2.BORDER_CONSTANT,
                          borderValue=(border, border, border))

def ink(img, lo_pct=1.5, hi_pct=88.0, gamma=1.0, clahe=2.2, sharpen=0.6, lift=0.0, smooth_px=0.0):
    """A neutral black-and-white print of a picture: local contrast, white pushed to paper."""
    L = 0.2126 * img[..., 0] + 0.7152 * img[..., 1] + 0.0722 * img[..., 2]
    if smooth_px:  # calm the brushwork and canvas weave so the print reads clean
        L = cv2.bilateralFilter(L.astype(np.float32), d=0, sigmaColor=0.10, sigmaSpace=smooth_px)
    u8 = np.clip(L * 255, 0, 255).astype(np.uint8)
    if clahe:
        u8 = cv2.createCLAHE(clipLimit=clahe, tileGridSize=(8, 8)).apply(u8)
    L = u8.astype(np.float32) / 255.0
    lo, hi = np.percentile(L, lo_pct), np.percentile(L, hi_pct)
    L = np.clip((L - lo) / max(hi - lo, 1e-3), 0, 1) ** gamma
    if sharpen:
        L = np.clip(L + sharpen * (L - cv2.GaussianBlur(L, (0, 0), 1.6)), 0, 1)
    if lift:
        L = 1 - (1 - L) * (1 - lift)
    return np.dstack([L, L, L])

def screen(a, b):
    return 1 - (1 - a) * (1 - b)

def bloom(img, strength=0.16, sigma=16):
    return screen(img, strength * cv2.GaussianBlur(img, (0, 0), sigma))

YY, XX = np.mgrid[0:H, 0:W].astype(np.float32)
RR = ((XX - W / 2) ** 2 + (YY - H / 2) ** 2) / (W / 2) ** 2

def vignette(img, amount=0.16):
    return img * (1 - amount * RR)[..., None]

def grain(img, f, amount=0.016):
    rng = np.random.default_rng(1000 + f)
    g = rng.normal(0, 1, (H, W)).astype(np.float32)
    g = cv2.GaussianBlur(g, (0, 0), 0.7)
    return np.clip(img + amount * g[..., None], 0, 1)

def feather_rect(x0, y0, x1, y1, sigma):
    m = np.zeros((H, W), np.float32)
    cv2.rectangle(m, (int(x0 * W), int(y0 * H)), (int(x1 * W), int(y1 * H)), 1.0, -1)
    return cv2.GaussianBlur(m, (0, 0), sigma)

def paper_fade(shape, inset, sigma):
    """1 inside, falling to 0 at the frame's edge: a picture laid on white paper."""
    h, w = shape
    m = np.zeros((h, w), np.float32)
    cv2.rectangle(m, (int(inset[0] * w), int(inset[1] * h)), (int((1 - inset[2]) * w), int((1 - inset[3]) * h)), 1.0, -1)
    return cv2.GaussianBlur(m, (0, 0), sigma)

def font(name, size):
    return ImageFont.truetype(os.path.join(FONTS, name), size)

def text_alpha(lines, face, size, line_h, canvas, centre, cite=None, cite_face=None, cite_size=0, cite_gap=0):
    """Alpha mask (float) of centred lines of type, drawn at canvas size."""
    cw, ch = canvas
    im = Image.new("L", (cw, ch), 0)
    d = ImageDraw.Draw(im)
    fnt = font(face, size)
    n = len(lines)
    total = line_h * n + (cite_gap + cite_size if cite else 0)
    y = centre[1] * ch - total / 2
    boxes = []
    for ln in lines:
        bb = d.textbbox((0, 0), ln, font=fnt, anchor="ls")
        tw = bb[2] - bb[0]
        x = centre[0] * cw - tw / 2
        d.text((x, y + line_h * 0.78), ln, font=fnt, fill=255, anchor="ls")
        boxes.append((x, y, x + tw, y + line_h))
        y += line_h
    if cite:
        cf = font(cite_face, cite_size)
        bb = d.textbbox((0, 0), cite, font=cf, anchor="ls")
        tw = bb[2] - bb[0]
        x = centre[0] * cw - tw / 2
        d.text((x, y + cite_gap + cite_size * 0.8), cite, font=cf, fill=255, anchor="ls")
        boxes.append((x, y + cite_gap, x + tw, y + cite_gap + cite_size))
    return np.asarray(im, np.float32) / 255.0, boxes

# ---------------------------------------------------------------- the pictures

class Assets:
    def __init__(self):
        # S1 and P1: the Sinai Pantocrator, aligned.
        s1 = load("s1_sinai.jpg")
        self.s1, self.s1_crop = prescale(s1, (0, 296, 1700))
        self.s1_ink = ink(self.s1, lo_pct=1.0, hi_pct=86, clahe=2.0, sharpen=0.7)
        # P2..P5: four more icons of Christ, black and white, framed for the panel.
        def panel(name, cx, cy, ph, lo=1.0, hi=85, cl=2.0, gamma=1.0, lift=0.0, sm=0.0, oval=None):
            im = load(name)
            hgt = ph * im.shape[0]
            wid = hgt * (PANEL[2] - PANEL[0]) / (PANEL[3] - PANEL[1])
            x0 = cx * im.shape[1] - wid / 2
            y0 = cy * im.shape[0] - hgt / 2
            im, crop = prescale(im, (x0, y0, wid), target=1100)
            g = ink(im, lo_pct=lo, hi_pct=hi, clahe=cl, gamma=gamma, lift=lift, smooth_px=sm)
            if oval:  # the head and shoulders kept, the worn ground given back to paper
                ox, oy, rx, ry = oval
                X0, Y0, Wd = crop
                Hd = Wd * (PANEL[3] - PANEL[1]) / (PANEL[2] - PANEL[0])
                yy, xx = np.mgrid[0:g.shape[0], 0:g.shape[1]].astype(np.float32)
                m = np.exp(-(((xx - (X0 + ox * Wd)) / (rx * Wd)) ** 4 + ((yy - (Y0 + oy * Hd)) / (ry * Hd)) ** 4))
                m = cv2.GaussianBlur(m, (0, 0), 0.04 * Wd)
                g = 1 - (1 - g) * m[..., None]
            return g, crop
        self.p2, self.p2_crop = panel("p2_ushakov.jpg", 0.50, 0.49, 0.70)
        self.p3, self.p3_crop = panel("p3_vysotsky.jpg", 0.50, 0.255, 0.40, cl=1.2, hi=84, sm=1.2, oval=(0.50, 0.56, 0.36, 0.50))
        self.p4, self.p4_crop = panel("p4_novgorod.jpg", 0.50, 0.53, 0.66, hi=80, gamma=1.1)
        self.p5, self.p5_crop = panel("p5_vasnetsov.jpg", 0.46, 0.335, 0.56, cl=1.2, hi=92)
        # S3: Kramskoi, Christ in the Wilderness, close on the face and the clasped hands.
        s3 = load("s3_kramskoi.jpg")
        self.s3, self.s3_crop = prescale(s3, (1500, 520, 1330))
        # S4: Polenov, At the Lake of Gennesaret.
        s4 = load("s4_genesaret.jpg")
        self.s4, self.s4_crop = s4, (1279, 96, 1000)
        # S5: Polenov, Dreams (On the hill), on paper, with the first card.
        self.s5_canvas, self.s5_text, self.s5_boxes = self.make_s5()
        # S6: Polenov, He returned to Galilee, on paper, with the second card.
        self.s6_canvas, self.s6_text, self.s6_boxes = self.make_s6()
        # The end card's word.
        self.end_letters = self.make_end()
        # Dust in the wilderness: small motes and a few soft discs.
        rng = np.random.default_rng(7)
        n = 150
        self.motes = dict(x=rng.uniform(0, 1, n), y=rng.uniform(-0.1, 1.1, n), r=rng.choice([1.1, 1.4, 1.8, 2.4, 3.2], n, p=[.3, .3, .2, .14, .06]),
                          a=rng.uniform(0.25, 0.75, n), vy=rng.uniform(0.018, 0.05, n), sw=rng.uniform(0.002, 0.008, n),
                          fq=rng.uniform(0.2, 0.7, n), ph=rng.uniform(0, 6.28, n))
        m = 12
        self.discs = dict(x=rng.uniform(0, 1, m), y=rng.uniform(0, 1, m), r=rng.uniform(12, 26, m), a=rng.uniform(0.05, 0.11, m),
                          vy=rng.uniform(0.01, 0.025, m))
        # Soft pools of light drifting over the first picture (white, never amber).
        k = 6
        self.orbs = dict(x=rng.uniform(0.05, 0.95, k), y=rng.uniform(0.35, 0.95, k), r=rng.uniform(40, 85, k), a=rng.uniform(0.05, 0.10, k),
                         vx=rng.uniform(-0.01, 0.01, k), vy=rng.uniform(-0.012, -0.004, k))

    def make_s5(self):
        im = load("s5_dreams.jpg")
        crop = (300, 0, 1200)
        C = 2 * W  # a canvas twice the frame, so type stays sharp through the zoom
        base = view(im, crop, 1.0, size_out=(C, C), border=1.0)
        g = ink(base, lo_pct=2.5, hi_pct=76, clahe=0, gamma=1.0, sharpen=0.35, smooth_px=6)
        # The sky is pushed to paper so the words stand on white.
        sky = np.clip((g[..., 0] - 0.45) / 0.35, 0, 1)
        pool = np.exp(-(((XXc - 0.25 * C) / (0.30 * C)) ** 2 + ((YYc - 0.21 * C) / (0.22 * C)) ** 2))
        g = np.clip(g + (1 - g) * (0.92 * pool * sky)[..., None], 0, 1)
        fade = paper_fade((C, C), (0.0, 0.0, 0.0, 0.02), 40)
        g = 1 - (1 - g) * fade[..., None]
        alpha, boxes = text_alpha(["I am meek", "and lowly", "in heart"], "Lora-Medium.ttf", 104, 130,
                                  (C, C), (0.25, 0.205), cite="Matthew 11:29", cite_face="DMSans-Medium.ttf", cite_size=68, cite_gap=34)
        return g, alpha, boxes

    def make_s6(self):
        im = load("s6_galilee_rm.jpg")
        C = 2 * W
        # The left of the painting (Christ on the path, the lake behind him), laid on white.
        sx0, sy0, sx1, sy1 = 0, 0.06 * im.shape[0], 0.62 * im.shape[1], 0.80 * im.shape[0]
        part = im[int(sy0):int(sy1), int(sx0):int(sx1)]
        s = 0.80 * C / part.shape[0]
        pw, ph = round(part.shape[1] * s), round(part.shape[0] * s)
        pic = cv2.resize(part, (pw, ph), interpolation=cv2.INTER_LANCZOS4)
        pic = ink(pic, lo_pct=2.0, hi_pct=70, clahe=0, gamma=1.0, sharpen=0.45, smooth_px=5)
        canvas = np.ones((C, C, 3), np.float32)
        cxp = (0.405 * im.shape[1] - sx0) * s          # Christ, in the placed picture
        hyp = (0.21 * im.shape[0] - sy0) * s           # his head
        ox, oy = round(0.42 * C - cxp), round(0.24 * C - hyp)
        y0, y1 = max(0, oy), min(C, oy + ph)
        x0, x1 = max(0, ox), min(C, ox + pw)
        canvas[y0:y1, x0:x1] = pic[y0 - oy:y1 - oy, x0 - ox:x1 - ox]
        # an oval of the picture around him, melting into the page
        m = np.exp(-(((XXc - 0.41 * C) / (0.19 * C)) ** 4 + ((YYc - 0.49 * C) / (0.31 * C)) ** 4))
        inside = np.zeros((C, C), np.float32)
        inside[y0:y1, x0:x1] = 1
        # gone to paper well before the picture's own border, so no edge ever shows
        inside = cv2.erode(inside, np.ones((301, 301), np.uint8))
        inside = cv2.GaussianBlur(inside, (0, 0), 60)
        m = cv2.GaussianBlur(m, (0, 0), 40) * inside
        g = 1 - (1 - canvas) * m[..., None]
        alpha, boxes = text_alpha(["The kingdom", "of God is", "within you"], "Lora-Medium.ttf", 104, 130,
                                  (C, C), (0.765, 0.205), cite="Luke 17:21", cite_face="DMSans-Medium.ttf", cite_size=68, cite_gap=34)
        return g, alpha, boxes

    def make_end(self):
        word = "Purify"
        fnt = font("DMSerifDisplay-Regular.ttf", 176)
        im = Image.new("L", (W, H), 0)
        d = ImageDraw.Draw(im)
        bb = d.textbbox((0, 0), word, font=fnt, anchor="ls")
        tw = bb[2] - bb[0]
        x = W / 2 - tw / 2
        base_y = H / 2 + 120
        letters = []
        cur = x
        for i, ch in enumerate(word):
            li = Image.new("L", (W, H), 0)
            ImageDraw.Draw(li).text((cur, base_y), ch, font=fnt, fill=255, anchor="ls")
            letters.append(np.asarray(li, np.float32) / 255.0)
            cur += d.textlength(ch, font=fnt)
        return letters

C2 = 2 * W
YYc, XXc = np.mgrid[0:C2, 0:C2].astype(np.float32)
PANEL = (0.17, 0.03, 0.83, 0.72)
PANEL_MASK = None

A = None

def assets():
    global A, PANEL_MASK
    if A is None:
        A = Assets()
        PANEL_MASK = feather_rect(*PANEL, sigma=20)
    return A

# ---------------------------------------------------------------- the shots

def splat(img, xs, ys, rs, als, blur_extra=0.0):
    """Add soft white dots (additive, clipped)."""
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
        acc[y0:y1, x0:x1] += a * np.exp(-(gx * gx + gy * gy) / (2 * (r * (1 + blur_extra)) ** 2))
    return screen(img, np.clip(acc, 0, 1)[..., None])

def shot_s1(f):
    a = assets()
    z = 1.0 + 0.05 * (f / 141)
    img = view(a.s1, a.s1_crop, z, fixed=(0.5, 0.31))
    img = bloom(img, 0.14, 18)
    t = f / FPS
    o = a.orbs
    img = splat(img, o["x"] + o["vx"] * t, o["y"] + o["vy"] * t, o["r"], o["a"])
    return img, z

PANELS = [  # (first frame, last frame, which)
    (41, 50, 1), (51, 59, 2), (60, 68, 3), (69, 91, 4), (92, 102, 5), (103, 110, 4), (111, 118, 3), (119, 138, 1),
]

def shot_s2(f):
    a = assets()
    bg, z = shot_s1(f)
    which, f0, f1 = None, 0, 0
    for p0, p1, w in PANELS:
        if p0 <= f <= p1 + (1 if f == 139 else 0):
            which, f0, f1 = w, p0, p1
    if f >= 139:
        which, f0, f1 = 1, 119, 138
    if which is None:
        return bg
    k = (f - f0) / max(1, (f1 - f0))
    pz = 1.0 + (0.035 if which == 4 else 0.02) * k
    if which == 1:
        pan = view(a.s1_ink, a.s1_crop, z, fixed=(0.5, 0.31))
    else:
        im, crop = {2: (a.p2, a.p2_crop), 3: (a.p3, a.p3_crop), 4: (a.p4, a.p4_crop), 5: (a.p5, a.p5_crop)}[which]
        # map the panel crop onto the panel rectangle
        x0, y0, wid = crop
        hgt = wid * (PANEL[3] - PANEL[1]) / (PANEL[2] - PANEL[0])
        pw = (PANEL[2] - PANEL[0]) * W
        s = pz * pw / wid
        cx, cy = (PANEL[0] + PANEL[2]) / 2 * W, (PANEL[1] + PANEL[3]) / 2 * H
        M = np.float32([[s, 0, cx - s * (x0 + wid / 2)], [0, s, cy - s * (y0 + hgt / 2)]])
        pan = cv2.warpAffine(im, M, (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_CONSTANT, borderValue=(1, 1, 1))
    m = PANEL_MASK[..., None]
    bgl = screen(bg, 0.08 * np.ones_like(bg))  # the picture behind lifts a little while a panel is up
    return bgl * (1 - m) + pan * m

def shot_s3(f, particles=True):
    a = assets()
    z = 1.0 + 0.075 * clamp01((f - 139) / 165)
    img = view(a.s3, a.s3_crop, z, fixed=(0.50, 0.27))
    img = np.clip(img, 0, 1) ** 0.90  # the robe's shadows opened a little; the painting's colour kept
    t = (f - 139) / FPS
    # a soft pool of dawn light travels along the horizon, 5.9 s to 7.0 s
    k = clamp01((f / FPS - 5.75) / 1.45)
    if 0 < k < 1:
        cx = (0.12 + 0.76 * smooth(k)) * W
        cy = (0.717 + (z - 1) * 0.45) * H
        pool = np.exp(-(((XX - cx) / 150) ** 2 + ((YY - cy) / 26) ** 2)) * 0.22 * math.sin(math.pi * k)
        img = screen(img, pool[..., None])
    img = bloom(img, 0.22, 24)
    if particles:
        m = a.motes
        ys = (m["y"] + m["vy"] * t) % 1.2 - 0.1
        xs = m["x"] + m["sw"] * np.sin(m["fq"] * 6.283 * t + m["ph"])
        img = splat(img, xs, ys, m["r"], m["a"])
        d = a.discs
        img = splat(img, d["x"], (d["y"] + d["vy"] * t) % 1.1, d["r"], d["a"])
    return img

def s4_frame(f):
    a = assets()
    z = 1.0 + 0.045 * clamp01((f - 290) / 39)
    img = view(a.s4, a.s4_crop, z, fixed=(0.62, 0.52))
    return bloom(img, 0.14, 18)

def shot_s4(f):
    a = assets()
    if f >= 303:
        return s4_frame(f)
    behind = shot_s3(f)
    src = s4_frame(f)
    k = (f - 235) / (288 - 235)
    p = 0.55 + 0.45 * ease_out(k) if f <= 288 else 1.0 + 0.03 * clamp01((f - 288) / 15)
    bend = 0.20 * (1 - ease_out((f - 235) / (300 - 235)))
    tilt = 0.07 * (1 - ease_out((f - 235) / (290 - 235)))
    cx, cy = 0.5, 0.47 + 0.03 * ease_out(k)
    u = XX / W - cx
    v = YY / H - cy
    qx = u / p
    qy = v / p
    qy = qy / (1 + tilt * qx * 2)
    r2 = qx * qx + qy * qy
    qx = qx * (1 + bend * r2 * 4)
    qy = qy * (1 + bend * r2 * 4)
    mx = (qx + 0.5) * W
    my = (qy + 0.5) * H
    panel = cv2.remap(src, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0))
    inside = ((qx > -0.5) & (qx < 0.5) & (qy > -0.5) & (qy < 0.5)).astype(np.float32)
    inside = cv2.GaussianBlur(inside, (0, 0), 0.8)[..., None]
    # a short blur on arrival
    if f < 240:
        panel = cv2.GaussianBlur(panel, (0, 0), 3.0 * (240 - f) / 5)
    shade = cv2.GaussianBlur(inside[..., 0], (0, 0), 18)[..., None]
    behind = behind * (1 - 0.35 * shade)
    return behind * (1 - inside) + panel * inside

def s5_layer(f, text_e=1.0):
    a = assets()
    t = a.s5_text
    if text_e < 1:
        sig = 10 * (1 - text_e)
        t = cv2.GaussianBlur(t, (0, 0), sig) if sig > 0.3 else t
        t = t * text_e
    canvas = a.s5_canvas * (1 - t[..., None]) + INK * t[..., None]
    z = 1.0 + 0.10 * clamp01((f - 332) / 90)
    for fi in (345, 358, 365, 370, 377, 395, 407):
        z += 0.075 * ease_out((f - fi) / 8)
    return canvas, z

def warp_canvas(canvas, z, fixed, shift=(0, 0)):
    C = canvas.shape[0]
    return view(canvas, (0, 0, C), z, fixed=fixed, shift=shift, border=1.0)

S5_FIX = (0.0, 0.06)
S6_FIX = (1.08, 0.01)

def shot_s5(f):
    canvas, z = s5_layer(f, text_e=ease_out((f - 330) / 6))
    return warp_canvas(canvas, z, S5_FIX)

def s6_layer(f):
    a = assets()
    t = a.s6_text
    canvas = a.s6_canvas * (1 - t[..., None]) + INK * t[..., None]
    z = 1.0 + 0.10 * clamp01((f - 430) / 37) + 0.35 * ease_out((f - 468) / 9) + 0.10 * clamp01((f - 477) / 26)
    return canvas, z

def shot_s6(f):
    canvas, z = s6_layer(f)
    return warp_canvas(canvas, z, S6_FIX)

def whip1(f):
    # f329..f332: a soft white band crosses left to right; the next picture is behind it
    bx = {329: 0.06, 330: 0.30, 331: 0.68, 332: 1.25}[f]
    out = s4_frame(f)
    out = cv2.blur(out, (31, 1))
    nxt, _ = s5_layer(332, text_e=0.0)
    nxt = warp_canvas(nxt, 1.0, S5_FIX)
    nxt = cv2.blur(nxt, (41, 1))
    x = XX / W
    left = (x < bx).astype(np.float32)
    left = cv2.GaussianBlur(left, (0, 0), 14)[..., None]
    band = np.exp(-((x - bx) / 0.10) ** 2)[..., None]
    wash = np.clip(1 - (bx - x) / 0.35, 0, 1)[..., None] * left  # the incoming side is still washed near the band
    img = out * (1 - left) + (nxt * (1 - 0.8 * wash) + 0.8 * wash) * left
    return screen(img, band)

def whip2(f):
    e0 = ease_in_out((f - 0.5 - 423) / 10)
    e1 = ease_in_out((f + 0.5 - 423) / 10)
    acc5 = np.zeros((H, W, 3), np.float32)
    acc6 = np.zeros((H, W, 3), np.float32)
    n = 13
    c5, z5 = s5_layer(422)
    c6, z6 = s6_layer(430)
    for i in range(n):
        e = e0 + (e1 - e0) * (i + 0.5) / n
        out5 = warp_canvas(c5, z5, S5_FIX, shift=(-0.42 * e, 0.30 * e))
        acc5 += 1 - (1 - out5) * (1 - 0.55 * e)
        acc6 += warp_canvas(c6, z6, S6_FIX, shift=(0.32 * (1 - e), -0.24 * (1 - e)))
    return (acc5 / n) * (acc6 / n)

def end_word(f):
    a = assets()
    word = np.zeros((H, W), np.float32)
    flash = np.zeros((H, W), np.float32)
    for i, L in enumerate(a.end_letters):
        fi = 512 + 4 * i
        e = clamp01((f - fi + 1) / 3)
        word += L * e
        if fi <= f < fi + 4:
            flash += L * (1 - (f - fi) / 4)
    if f >= 549:
        word *= 1 - smooth((f - 549) / 8)
        flash *= 0
    s = 1.0 + 0.03 * clamp01((f - 512) / 37)
    if s != 1.0:
        M = cv2.getRotationMatrix2D((W / 2, H / 2), 0, s)
        word = cv2.warpAffine(word, M, (W, H), flags=cv2.INTER_LINEAR)
        flash = cv2.warpAffine(flash, M, (W, H), flags=cv2.INTER_LINEAR)
    flick = 0.93 + 0.07 * math.sin(f * 1.7) * math.sin(f * 0.61 + 1.0)
    g1 = cv2.GaussianBlur(word, (0, 0), 7) * 0.55 * flick
    g2 = cv2.GaussianBlur(word + flash, (0, 0), 24) * 0.40 * flick
    lum = np.clip(word + g1 + g2 + 0.6 * cv2.GaussianBlur(flash, (0, 0), 4), 0, 1.4)
    return lum

def dim_and_end(f):
    base = shot_s6(min(f, 517)) if f <= 517 else None
    d = smooth((f - 503) / 14)
    if base is not None:
        img = base * (1 - d) + GROUND * d
    else:
        img = np.broadcast_to(GROUND, (H, W, 3)).copy()
    if f >= 512:
        lum = end_word(f)[..., None]
        img = img + (GLOW - img) * np.clip(lum, 0, 1) + 0.12 * np.clip(lum - 1, 0, 1)
    return img

# ---------------------------------------------------------------- the edit

def frame(f):
    if f <= 40:
        img = shot_s1(f)[0]
    elif f <= 138:
        img = shot_s2(f)
    elif f <= 141:
        w = {139: 0.62, 140: 0.97, 141: 0.55}[f]
        under = shot_s2(f) if f == 139 else shot_s3(f)
        img = under * (1 - w) + w
    elif f <= 234:
        img = shot_s3(f)
        if f <= 144:
            img = screen(img, np.full_like(img, {142: 0.14, 143: 0.06, 144: 0.02}[f]))
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
    colour = f <= 331
    if colour:
        img = vignette(img, 0.14)
    img = grain(img, f, 0.014 if colour else 0.010)
    return np.clip(img, 0, 1)

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
    args = ap.parse_args()
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
