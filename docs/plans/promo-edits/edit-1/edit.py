#!/usr/bin/env python3
"""Promo edit 1, the Light: the stage (the brief is ../edit-1-the-light.md; the pictures are assets.py's).

The film is 1080 by 1920 at 60 frames a second and 1199 frames long, the reference's own length and clock, so a
frame here is the same frame there. Every cut is the reference's, measured (RECORD.md); the drop is the frame its
bass comes in. Nothing answers the beat but a cut and a line. Every word is Scripture, held to data/bible each run.

  python3 docs/plans/promo-edits/edit-1/edit.py <repo root> <work dir> still <frame> <out.png>
  python3 docs/plans/promo-edits/edit-1/edit.py <repo root> <work dir> board <out dir>     # the storyboard's stills
"""
import json
import math
import os
import sys

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT, HOME = sys.argv[1], sys.argv[2]
HERE = os.path.dirname(os.path.abspath(__file__))
PICS = json.load(open(os.path.join(HERE, "pictures.json")))["pictures"]
W, H, FPS, TOTAL = 1080, 1920, 60, 1199

# ── The reference's clock, in its own frames (60 a second) ───────────────
LIGHT_ENDS = 126  # 2.10 s: the held picture gives way to the run
# Where one ink face becomes the next: the frame of greatest change in each of the reference's smears.
RUN_CUTS = [126, 141, 156, 174, 189, 206, 223, 239, 257, 273, 291, 307, 324, 342, 360, 377, 394, 403, 414, 421, 431, 439, 448, 455,
            464, 472, 483, 489, 498, 505, 514, 523, 535, 569, 597, 631]
DROP = 671        # 11.183 s: the first frame the sound's low band (under 120 Hz) passes 1.3 times its loudest before
MELT = 5          # frames a face takes to become the next (the reference's smears take three to six)
END = 1144        # 19.07 s: the reference's last cut before its white frame; ours goes to black and the mark

# The run's faces, in order; the run uses as many as there are shots, round again. (picture, how far apart the eyes
# stand on the screen.) It opens and closes on the emperor: the last false god before the drop is a man.
RUN = [("augustus", 300), ("zeusammon", 250), ("amun", 320), ("smiting", 270), ("serapis", 245)]
WORDS_CLEAR = 1230  # below this line of the frame the run is clean white, for its words
EYE_Y = 740       # where the eyes stand in every face, so the gaze holds still through the run

# After the drop, on the reference's own cuts: (first frame, picture, width on screen, middle y, push by its end).
AFTER = [(671, "sinai", 1080, None, 1.05), (739, "transfig", 1000, 900, 1.05), (1013, "novgorod", 940, 760, 1.04)]

_cache = {}


def once(key, make):
    if key not in _cache:
        _cache[key] = make()
    return _cache[key]


def smooth(u):
    u = min(1.0, max(0.0, u))
    return u * u * (3 - 2 * u)


def grid():
    return once("grid", lambda: np.mgrid[0:H, 0:W].astype(np.float32))


def rgb(name):
    return once(("rgb", name), lambda: np.asarray(Image.open(f"{HOME}/raw/{name}.jpg").convert("RGB"), dtype=np.float32) / 255)


def place(img, k, sx, sy, dx, dy, ground=0.0):
    """The whole picture at scale k, its point (sx, sy) set on the frame's (dx, dy). It moves only whole."""
    M = np.float32([[k, 0, dx - k * sx], [0, k, dy - k * sy]])
    flag = cv2.INTER_AREA if k < 1 else cv2.INTER_CUBIC
    return cv2.warpAffine(img, M, (W, H), flags=flag, borderMode=cv2.BORDER_CONSTANT, borderValue=ground)


def pool(cx, cy, r0, r1, low):
    """Light pooled about a point: whole within r0, falling smoothly to `low` at r1. One soft pool, never beams."""
    yy, xx = grid()
    u = np.clip((np.hypot(xx - cx, yy - cy) - r0) / (r1 - r0), 0, 1)
    return (1 - (1 - low) * (u * u * (3 - 2 * u)))[..., None]


# ── Words: Scripture, word for word ──────────────────────────────────────

def words():
    def make():
        def verse(book, chapter, n):
            return next(v["text"] for v in json.load(open(f"{ROOT}/data/bible/{book}/{chapter}.json"))["verses"] if v["n"] == n)
        w = {"ask": ("Who art thou, Lord?", "Acts 9:5", verse("acts", 9, 5)),
             "gods": ("there be gods many, and lords many", "1 Corinthians 8:5", verse("1-corinthians", 8, 5)),
             "answer": ("I am Jesus", "Acts 9:5", verse("acts", 9, 5)),
             "light": ("I am the light of the world", "John 8:12", verse("john", 8, 12))}
        for line, where, text in w.values():
            assert line in text, f"not the app's own Bible: {line} ({where})"
        return w
    return once("words", make)


def font(size, weight):
    f = ImageFont.truetype(f"{HOME}/font.ttf", size)
    f.set_variation_by_axes([min(40, max(9, size)), weight])  # the app's sans: optical size, weight
    return f


def text_mask(lines, cy, size=60, weight=700, gap=1.22):
    """Lines of words as a mask, centred, their middle on cy."""
    def make():
        f = font(size, weight)
        im = Image.new("L", (W, H), 0)
        d = ImageDraw.Draw(im)
        top = cy - (len(lines) - 1) * size * gap / 2
        for i, line in enumerate(lines):
            d.text((W / 2, top + i * size * gap), line, font=f, fill=255, anchor="mm")
        return np.asarray(im, dtype=np.float32)[..., None] / 255
    return once(("text", tuple(lines), cy, size, weight), make)


def say(img, key, cy, lines=None, turned=False, size=60):
    """A line and, smaller under it, where it is found. Plain white, or on the ink each letter the picture turned over.
    No glow behind it."""
    line, where, _ = words()[key]
    lines = lines or [line]
    assert " ".join(lines) == line
    m = text_mask(lines, cy, size)
    r = text_mask([where], cy + (len(lines) - 1) * size * 0.61 + size * 1.25, 32, 500)
    if turned:
        return img * (1 - m - r) + (1 - np.clip(img, 0, 1)) * (m + r)
    return img * (1 - m) * (1 - 0.8 * r) + 0.97 * m + 0.8 * r


# ── The light ────────────────────────────────────────────────────────────

LIGHT = (560, 430)


def the_light(F):
    """Black, one soft pool of light, and Saul on the ground before it. The light is ours: none of the painting's sky
    is kept. It grows a little, evenly, through the shot."""
    u = F / LIGHT_ENDS
    yy, xx = grid()
    d = np.hypot(xx - LIGHT[0], yy - LIGHT[1]) / (1 + 0.08 * u)
    glow = 0.62 * np.exp(-(d / 190) ** 2) + 0.34 * np.exp(-(d / 430) ** 2) + 0.07 * np.exp(-(d / 900) ** 2)
    out = np.repeat(np.clip(glow, 0, 1)[..., None], 3, 2) * np.float32([1.0, 0.985, 0.96])
    s = once("saul", lambda: np.asarray(Image.open(f"{HOME}/saul.png").convert("RGBA"), dtype=np.float32) / 255)
    k = 940 / s.shape[1]
    fig = place(s, k, s.shape[1] / 2, s.shape[0], W / 2, 1560)
    # He is lit from the light: his hand and his face take it, and his legs fall into the dark.
    hx, hy = W / 2 + (0.36 - 0.5) * 940, 1560 - (1 - 0.30) * s.shape[0] * k
    lit = pool(hx + 60, hy - 120, 170, 760, 0.10)
    a = fig[..., 3:4]
    out = out * (1 - a) + fig[..., :3] * lit * a
    return say(out, "ask", 820)


# ── The run ──────────────────────────────────────────────────────────────

def plate(i):
    name, D = RUN[i % len(RUN)]
    def make():
        ink = np.asarray(Image.open(f"{HOME}/ink/{name}.png"), dtype=np.float32) / 255
        (lx, ly), (rx, ry) = PICS[name]["eyes"]
        p = place(ink, D / math.hypot(rx - lx, ry - ly), (lx + rx) / 2, (ly + ry) / 2, W / 2, EYE_Y, ground=1.0)
        # Below the chin the ink is let go into the white ground, so the words stand on clean white. Nothing is drawn.
        yy, _ = grid()
        keep = 1 - np.clip((yy - WORDS_CLEAR + 150) / 150, 0, 1) ** 2
        return 1 - (1 - p) * keep
    return once(("plate", name, D), make)


def flow(i, j):
    """How the pixels of one face would have to travel to become the next: found small and smooth, then enlarged.
    (The Christ edit's melt.)"""
    def make():
        small = lambda p: cv2.GaussianBlur(cv2.resize((p * 255).astype(np.uint8), (270, 480), interpolation=cv2.INTER_AREA), (0, 0), 2)
        f = cv2.calcOpticalFlowFarneback(small(plate(i)), small(plate(j)), None, 0.5, 4, 41, 4, 7, 1.5, 0)
        return cv2.resize(cv2.GaussianBlur(f, (0, 0), 6), (W, H), interpolation=cv2.INTER_CUBIC) * 4.0
    return once(("flow", i % len(RUN), j % len(RUN)), make)


def melt(i, j, u):
    """One face melting into the next: each whole picture follows the flow part of the way, laid over the other,
    soft in its middle. Set on the eyes, so the gaze holds still. Nothing in either face is drawn."""
    f = flow(i, j) * 1.5
    yy, xx = grid()
    A = cv2.remap(plate(i), xx - u * f[..., 0], yy - u * f[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    B = cv2.remap(plate(j), xx + (1 - u) * f[..., 0], yy + (1 - u) * f[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    g = cv2.GaussianBlur(A * (1 - u) + B * u, (0, 0), 0.6 + 2.6 * math.sin(math.pi * u))
    return np.clip((g - 0.5) * (1 + 1.6 * math.sin(math.pi * u)) + 0.5, 0, 1)  # the melt stays ink: black and white, not grey


def the_run(F):
    i = max(k for k, c in enumerate(RUN_CUTS) if c <= F + MELT / 2)
    c = RUN_CUTS[i]
    if i > 0 and abs(F - c) < MELT / 2:      # the first face comes on a plain cut; the last gives way to the drop on one
        g = melt(i - 1, i, smooth((F - c + MELT / 2) / MELT))
    else:
        g = plate(i if F >= c else i - 1)
    out = np.repeat(g[..., None], 3, 2)
    return say(out, "gods", 1320, ["there be gods many,", "and lords many"], turned=True)


# ── After the drop ───────────────────────────────────────────────────────

def icon_shot(F):
    k = max(n for n, s in enumerate(AFTER) if s[0] <= F)
    start, name, width, cy, z1 = AFTER[k]
    stop = AFTER[k + 1][0] if k + 1 < len(AFTER) else END
    im = rgb(name)
    z = 1 + (z1 - 1) * (F - start) / (stop - start)  # one slow even move
    s = width / im.shape[1] * z
    if name == "sinai":
        # His icon whole, filling the frame, held by His eyes; its light pooled on His face, the edges let fall.
        (lx, ly), (rx, ry) = PICS[name]["eyes"]
        ex, ey = (lx + rx) / 2, (ly + ry) / 2
        k0 = width / im.shape[1]
        out = place(im, s, ex, ey, ex * k0, ey * k0) * pool(ex * k0, ey * k0, 360, 1250, 0.30)
        return say(out, "answer", 1010, size=72)
    out = place(im, s, im.shape[1] / 2, im.shape[0] / 2, W / 2, cy)
    if name == "novgorod":
        out = say(out, "light", 1420)
    return out


def the_end(F):
    """Black and Purify's mark, still."""
    def make():
        m = np.asarray(Image.open(f"{HOME}/mark.png").convert("RGBA"), dtype=np.float32) / 255
        fig = place(m, 1.25, m.shape[1] / 2, m.shape[0] / 2, W / 2, 880)
        out = fig[..., :3] * fig[..., 3:4]
        t = text_mask(["Purify"], 1180, 58, 600)
        return out * (1 - t) + 0.97 * t
    return once("end", make)


def frame(F):
    words()
    if F < LIGHT_ENDS:
        return the_light(F)
    if F < DROP:
        return the_run(F)
    if F < END:
        return icon_shot(F)
    return the_end(F)


def save(F, path, width=W):
    im = Image.fromarray((np.clip(frame(F), 0, 1) * 255).astype(np.uint8), "RGB")
    if width != W:
        im = im.resize((width, round(H * width / W)), Image.LANCZOS)
    im.save(path, quality=88)


# The storyboard: the moments the brief asks for.
BOARD = [("1-the-light", 60), ("2-run-first", 148), ("3-run-melt", 174), ("4-run-sharp", 197), ("5-before-the-drop", 670), ("6-the-drop", 690),
         ("7-transfiguration", 800), ("8-light-of-the-world", 1060), ("9-the-end", 1180)]

if __name__ == "__main__":
    cmd = sys.argv[3]
    if cmd == "still":
        save(int(sys.argv[4]), sys.argv[5])
    elif cmd == "board":
        os.makedirs(sys.argv[4], exist_ok=True)
        for name, F in BOARD:
            save(F, f"{sys.argv[4]}/{name}.jpg", 720)
            print(f"  {name}: frame {F}, {F / FPS:.2f} s")
