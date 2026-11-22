#!/usr/bin/env python3
"""The Christ edit: rendered frame for frame to the template's own measures (README.md, template.json).

  python3 edit.py <repo root> <work dir> sheet <name> <template frames...>   ours beside the template's, to look at
                                                                              ("big" for "sheet": larger, one to a row)
  python3 edit.py <repo root> <work dir> still <template frame>               one frame, full size
  python3 edit.py <repo root> <work dir> strip <name> <first> <last>           the film's own frames in a row, small
  python3 edit.py <repo root> <work dir> luma [from to]                       how bright and how sharp each frame is,
                                                                              ours beside the template's
  python3 edit.py <repo root> <work dir> render [sound file [offset]]         every frame, then the silent master;
                                                                              with a sound file, also a private preview
  python3 edit.py <repo root> <work dir> frames <first> <last>                some of the film's frames again
  python3 edit.py <repo root> <work dir> encode [sound file [offset]]         the files again from the frames
  python3 edit.py <repo root> <work dir> sound <sound file> [offset]          a new sound under the film already made
                                                                              (offset: seconds into the film at which
                                                                              the sound's first sample falls)

Time is counted in the template's own frames (30 a second), so every table in template.json is used as it was
measured; the film itself is 60 frames a second. The template's picture is read as the middle band of a 9:16
frame, so 480 is added to its y. Motion is blurred the way a camera blurs it: each frame is the mean of several
moments inside one template frame's time, never across a cut.

Nothing in an icon is redrawn and nothing in it is made to move: an icon moves only whole, and one face melts into
the next only as two whole pictures laid over each other (their pixels follow the flow between them).
"""
import json
import math
import os
import subprocess
import sys

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT, HOME = sys.argv[1], sys.argv[2]
HERE = os.path.dirname(os.path.abspath(__file__))
T = json.load(open(os.path.join(HERE, "template.json")))
MARKS = json.load(open(f"{HOME}/pic/marks.json"))
W, H, FPS, TF, UP = 1080, 1920, 60, 30, 480
TOTAL_F = 297  # the template's length, in its frames
cv2.setNumThreads(1)


# ── Small tools ──────────────────────────────────────────────────────────

def tab(table, f, log=False):
    """A table of {frame: value} read at any frame, straight between its points and held beyond its ends."""
    pts = sorted((float(k), v) for k, v in (table.items() if isinstance(table, dict) else table))
    if f <= pts[0][0]:
        return pts[0][1]
    if f >= pts[-1][0]:
        return pts[-1][1]
    for (a, va), (b, vb) in zip(pts, pts[1:]):
        if a <= f <= b:
            u = (f - a) / (b - a) if b > a else 0
            return math.exp(math.log(va) + (math.log(vb) - math.log(va)) * u) if log else va + (vb - va) * u
    return pts[-1][1]


def smooth(u):
    u = min(1.0, max(0.0, u))
    return u * u * (3 - 2 * u)


def lerp(a, b, u):
    return a + (b - a) * u


class Pic:
    """A picture kept at several sizes, so it can be set down smaller without shimmer."""

    def __init__(self, arr):
        self.lv = [np.ascontiguousarray(arr)]
        while min(self.lv[-1].shape[:2]) > 500:
            self.lv.append(cv2.pyrDown(self.lv[-1]))

    def draw(self, k, ax, ay, sx, sy, size=(W, H), edge=False):
        """Set the picture down `k` times its size with its point (ax, ay) at (sx, sy). Gives floats, 0 to 1.
        With `edge`, a sliver beyond the picture's own edge takes that edge's colour instead of black."""
        L = 0
        while k < 0.5 and L < len(self.lv) - 1:
            k, ax, ay, L = k * 2, ax / 2, ay / 2, L + 1
        M = np.float32([[k, 0, sx - k * ax], [0, k, sy - k * ay]])
        out = cv2.warpAffine(self.lv[L], M, size, flags=cv2.INTER_LINEAR if k <= 1.001 else cv2.INTER_CUBIC,
                             borderMode=cv2.BORDER_REPLICATE if edge else cv2.BORDER_CONSTANT, borderValue=0)
        return out.astype(np.float32) / 255


    def warp(self, Hm, smallest, size=(W, H)):
        """Set the picture down through a tilt: `Hm` carries a point of the picture to the screen, `smallest` is the
        smallest it is drawn anywhere (so a smaller copy is used and it does not shimmer). Gives floats, 0 to 1."""
        L = 0
        while smallest < 0.5 and L < len(self.lv) - 1:
            smallest, L = smallest * 2, L + 1
        Hl = Hm @ np.diag([2.0 ** L, 2.0 ** L, 1.0])
        out = cv2.warpPerspective(self.lv[L], Hl, size, flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
        return out.astype(np.float32) / 255


def load_rgb(path):
    return np.asarray(Image.open(path).convert("RGB"))


_cache = {}


def _grid():
    return once("grid", lambda: np.mgrid[0:H, 0:W].astype(np.float32))


def once(key, make):
    if key not in _cache:
        _cache[key] = make()
    return _cache[key]


def icon(name):
    return once(("icon", name), lambda: Pic(load_rgb(f"{HOME}/pic/{name}.jpg")))


def screen(name):
    return once(("screen", name), lambda: Pic(load_rgb(f"{HOME}/screens/{name}.png")))


def eyes(name):
    (lx, ly), (rx, ry) = MARKS[name]["eyes"]
    return (lx + rx) / 2, (ly + ry) / 2, math.hypot(rx - lx, ry - ly)


def blur(img, sigma):
    if sigma < 0.4:
        return img
    if sigma > 6:  # a wide blur is made on a smaller copy: the same look, far quicker
        f = 4 if sigma > 14 else 2
        small = cv2.resize(img, (img.shape[1] // f, img.shape[0] // f), interpolation=cv2.INTER_AREA)
        small = cv2.GaussianBlur(small, (0, 0), sigma / f)
        return cv2.resize(small, (img.shape[1], img.shape[0]), interpolation=cv2.INTER_LINEAR)
    return cv2.GaussianBlur(img, (0, 0), sigma)


def smear(img, length):
    """A camera thrown aside: the whole picture drawn out along the line of reading. One smooth blur, never beams."""
    n = int(round(length))
    if n < 3:
        return img
    return cv2.blur(img, (n | 1, 1), borderType=cv2.BORDER_REFLECT)


def push(img, z, cx=W / 2, cy=H / 2):
    """The finished picture a little nearer, about a point."""
    if abs(z - 1) < 1e-4:
        return img
    M = np.float32([[z, 0, cx * (1 - z)], [0, z, cy * (1 - z)]])
    return cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)


def pool(cx, cy, r0, r1, low):
    """Light pooled about a point: whole within r0, falling smoothly to `low` at r1 and beyond. One soft pool, never
    beams. The template is a dark film with its light on the face; an icon's gold ground is let fall the same way."""
    def make():
        yy, xx = _grid()
        d = np.hypot(xx - cx, (yy - cy) * 0.82)
        u = np.clip((d - r0) / (r1 - r0), 0, 1)
        return (1 - (1 - low) * (u * u * (3 - 2 * u)))[..., None].astype(np.float32)
    return once(("pool", cx, cy, r0, r1, low), make)


def flash(img, a, warm=0.0):
    """The template's hit: the picture blown out, its light spreading. `a` is how hard, 0 to 1."""
    if a <= 0.004:
        return img
    glow = blur(img, 34)
    out = img * (1 + 2.0 * a) + glow * (1.7 * a) + 0.12 * a * a
    if warm:
        out = out * np.float32([1.0, 1.0 - 0.06 * warm * a, 1.0 - 0.2 * warm * a])
    return out


def grey(img, amount=1.0):
    g = (0.299 * img[..., 0] + 0.587 * img[..., 1] + 0.114 * img[..., 2])[..., None]
    return img * (1 - amount) + g * amount


def leak(img, a):
    """A soft warm light from the reading edge, as the template has on two of its hits. A pool, never beams."""
    if a <= 0.004:
        return img
    L = once("leak", lambda: _leak())
    return img + L * a


def _leak():
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    d = np.hypot((xx + 160) / 760, (yy - 900) / 1100)
    g = np.clip(1 - d, 0, 1) ** 2
    return g[..., None] * np.float32([1.0, 0.42, 0.10])


# ── Words ────────────────────────────────────────────────────────────────

def font(size, weight=800):
    f = ImageFont.truetype(f"{HOME}/font.ttf", size)
    f.set_variation_by_axes([weight])
    return f


def text_mask(text, size, cy, tracking=0.03, weight=800, cx=W / 2):
    """Words as a mask the size of the frame, set on (cx, cy) by their middle."""
    def make():
        f = font(size, weight)
        gap = size * tracking
        widths = [f.getlength(ch) for ch in text]
        total = sum(widths) + gap * (len(text) - 1)
        im = Image.new("L", (W, H), 0)
        d = ImageDraw.Draw(im)
        x = cx - total / 2
        asc, desc = f.getmetrics()
        cap = f.getbbox("H")
        top = cy - (cap[1] + cap[3]) / 2
        for ch, w in zip(text, widths):
            d.text((x, top), ch, font=f, fill=255)
            x += w + gap
        return np.asarray(im, dtype=np.float32) / 255
    return once(("text", text, size, cy, tracking, weight, cx), make)


def turn_over(img, mask, strength=1.0):
    """The template's words: white set with a difference blend, so each letter is the picture's colour turned over."""
    m = (mask * strength)[..., None]
    return img * (1 - m) + np.abs(1 - np.clip(img, 0, 1)) * m


WORDS = None
WORD_Y = 960  # the middle of the frame, where every word of the template stands


def words():
    global WORDS
    if WORDS is None:
        def verse(book, chapter, n):
            return next(v["text"] for v in json.load(open(f"{ROOT}/data/bible/{book}/{chapter}.json"))["verses"] if v["n"] == n)
        john, q, a = verse("john", 14, 6), verse("matthew", 16, 15), verse("matthew", 16, 16)
        beats = ["I am", "the way", "the truth", "and", "the life"]
        assert f"{beats[0]} {beats[1]}, {beats[2]}, {beats[3]} {beats[4]}" in john, "the beat words are not John 14:6 in order"
        question, answer = "But whom say ye that I am?", "Thou art the Christ"
        assert question in q and answer in a, "the question or the answer is not the app's own Bible"
        WORDS = {"beats": beats, "question": question, "answer": answer}
    return WORDS


WORD_SIZE = 59   # capitals 42 high, as the template's are
LONG_SIZE = 50   # the question is a long line; at the template's size it would run under the buttons of the apps it is posted in

# What the template does to a word on its hits: draws it out sideways (pixels) and cuts it into bands that slip
# (pixels, about). Read off its frames: a twitch three frames after each cut, the hard cuts, the question's leaving.
WORD_SMEAR = {62.5: 0, 63: 50, 63.6: 0, 72.6: 0, 73: 70, 73.6: 0, 77.5: 0, 78: 70, 78.6: 0, 90.6: 0, 91: 12, 92: 16, 93: 130, 93.7: 0, 104.6: 0, 105: 34,
              106: 80, 106.8: 0, 107.5: 0, 108: 40, 108.6: 0, 172.5: 0, 175: 10, 176: 30, 176.8: 0, 232.5: 0, 233: 54, 233.7: 0}
WORD_SLIP = {90.6: 0, 91: 24, 92: 32, 93: 10, 93.7: 0, 104.6: 0, 105: 38, 106: 14, 106.8: 0, 107.5: 0, 108: 12, 108.6: 0, 172.5: 0, 173: 14, 174: 24,
             175: 32, 176: 40, 176.8: 0, 232.5: 0, 233: 26, 233.7: 0}


def slip(mask, amount, seed):
    """A word cut into bands that slip sideways, as the template's words do on its hits. Only the word: never a picture."""
    if amount < 1:
        return mask
    rng = np.random.default_rng(seed)
    out = mask.copy()
    y, y1 = WORD_Y - 48, WORD_Y + 48
    while y < y1:
        h = int(rng.integers(5, 20))
        out[y:y + h] = np.roll(mask[y:y + h], int(rng.normal(0, amount)), axis=1)
        y += h
    return out


def caption(img, F, soft=0.0, seed=0):
    """The word that stands at this frame, if one does: one line in the middle of the frame, as the template's
    words are, and where the verse is found, small, above the app's name."""
    w, tw = words(), T["words"]
    line = cite = None
    for i in range(5):
        a, b = tw[f"beat{i + 1}"]
        if a <= F < b + 1:
            fade = 1.0 if i != 3 else 1 - smooth((F - 100) / 3)  # the fourth word fades, as the template's does
            line = (w["beats"][i].upper(), WORD_SIZE, fade)
            cite = "JOHN 14:6" if i == 4 else None
    a, b = tw["question"]
    if a <= F < b + 1:
        line, cite = (w["question"].upper(), LONG_SIZE, 1.0), "MATTHEW 16:15"
    a, b = tw["answer"]
    if a <= F < b + 1:
        line, cite = (w["answer"].upper(), WORD_SIZE, 1 - 0.5 * smooth((F - 233.6) / 1.0)), "MATTHEW 16:16"
    if not line:
        return img
    text, size, strength = line
    m = text_mask(text, size, WORD_Y, tracking=0.035)
    # A soft shade under the word. A turned-over white on a middle tone (skin, gold) comes out a middle tone too, so
    # the picture is let down a little just there first; on the template's dark pictures this cannot be seen.
    # Over the app's own pages the shade is wider and deeper: there the word stands among the page's own lines.
    page = C["clip1a"] <= F < C["clip2"]
    wide = 17 if page else 11
    shade = once(("word-shade", text, size, wide), lambda: np.clip(cv2.GaussianBlur(m, (0, 0), wide) * (1.9 if page else 1.5), 0, 1))
    img = img * (1 - (0.62 if page else 0.36) * strength * shade[..., None])
    sm, sl = tab(WORD_SMEAR, F), tab(WORD_SLIP, F)
    if sl >= 1:
        m = slip(m, sl, seed)
    if sm >= 3:
        m = np.clip(cv2.blur(m, (int(sm) | 1, 1)) * (1 + sm / 160), 0, 1)
    if soft > 0.5:
        m = cv2.GaussianBlur(m, (0, 0), soft)
    img = turn_over(img, m, strength)
    if cite:
        c = text_mask(cite, 22, 905 + UP - 46, tracking=0.3, weight=700)
        sh = once(("cite-shadow", cite), lambda: cv2.GaussianBlur(np.roll(c, 2, axis=0), (0, 0), 2.5))
        img = img * (1 - 0.5 * np.clip(sh * 1.6, 0, 1)[..., None])
        img = img * (1 - 0.8 * c[..., None]) + 0.8 * c[..., None]
    return img


def name(img, strength=0.5):
    """The app's name, small, where the template carries its maker's mark."""
    m = text_mask("PURIFY", 30, 905 + UP, tracking=0.42, weight=800)
    sh = once("name-shadow", lambda: np.roll(np.roll(text_mask("PURIFY", 30, 905 + UP, tracking=0.42, weight=800), 3, axis=0), 2, axis=1))
    img = img * (1 - 0.35 * strength * sh[..., None])
    return img * (1 - strength * m[..., None]) + strength * m[..., None]


# ── The dome ─────────────────────────────────────────────────────────────

DOME_C = (T["dome"]["centre"][0], T["dome"]["centre"][1] + UP)
DOME_R = {i: r for i, r in enumerate(T["dome"]["radius_by_frame"])}
# How large each cut-out stands (screen pixels to one of its own) and the point of it the template's head rides on.
FIG = {
    "a": {"k": 0.50, "anchor": lambda: _head("pantocrator19"), "t": T["figure_a"]},
    "b": {"k": 0.33, "anchor": lambda: _head("sinai"), "t": T["figure_b"]},
}


FIG_A_GONE, FIG_B_COMES = 23.5, 22.0  # the first figure is out of sight in the dome's shadow; the second begins, flat


def _head(name):
    ex, ey, d = eyes(name)
    return ex, ey + 0.45 * d


def ink(rgb):
    """The template's look for the figure in the dome: grey, strong, crisp."""
    g = 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]
    g = np.clip((g - 0.45) * 1.55 + 0.5, 0, 1)
    g = np.clip(g + 0.55 * (g - cv2.GaussianBlur(g, (0, 0), 9)), 0, 1)
    return g


def figure(which):
    def make():
        rgba = np.asarray(Image.open(f"{HOME}/fig-{which}.png").convert("RGBA")).astype(np.float32) / 255
        a = rgba[..., 3]
        if which == "a":  # the icon's own border at its foot is left behind
            a[int(a.shape[0] * 0.952):] = 0
        rgb = rgba[..., :3]
        # The figure's own darkest and lightest are spread to black and white first, so an old, dim panel stands as
        # strongly as a bright one.
        lum = (0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2])[a > 0.5]
        lo, hi = np.percentile(lum, 1.5), np.percentile(lum, 98.5)
        rgb = np.clip((rgb - lo) / max(1e-3, hi - lo), 0, 1)
        g = ink(rgb) * a
        return Pic((np.dstack([g, a]) * 255).astype(np.uint8))  # grey, already multiplied by its mask, and the mask
    return once(("fig", which), make)


def sky():
    def make():
        rng = np.random.default_rng(11)
        big = np.zeros((H * 2, W * 2), np.float32)
        for _ in range(420):
            x, y = rng.uniform(0, W * 2), rng.uniform(0, H * 2)
            b = rng.uniform(0.12, 1.0) ** 2.2
            cv2.circle(big, (int(x), int(y)), int(rng.choice([1, 1, 1, 2, 2, 3])), float(b), -1, cv2.LINE_AA)  # round points
        s = cv2.resize(big, (W, H), interpolation=cv2.INTER_AREA)
        return np.repeat(s[..., None], 3, axis=2) * np.float32([0.92, 0.95, 1.0])
    return once("sky", make)


def disc():
    def make():
        n, r = 2048, 1000
        yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
        rho = np.hypot(xx - n / 2, yy - n / 2)
        a = np.clip(r + 0.5 - rho, 0, 1)
        shade = 1 - 0.07 * np.clip(rho / r, 0, 1) ** 3
        rgb = np.dstack([0.975 * shade, 0.975 * shade, 1.0 * shade]) * a[..., None]
        return Pic((np.dstack([rgb, a]) * 255).astype(np.uint8))
    return once("disc", make)


def floor():
    """The dome falls into shadow toward the foot of the frame, as the template's does."""
    def make():
        y = np.arange(H, dtype=np.float32)
        u = np.clip((y - 1150) / 670, 0, 1)
        return (1 - u * u * (3 - 2 * u))[:, None, None]
    return once("floor", make)


def figure_foot():
    """A cut-out ends where its icon ends; it is let go into the shadow before that edge can be seen."""
    def make():
        y = np.arange(H, dtype=np.float32)
        u = np.clip((y - 1540) / 190, 0, 1)
        return (1 - u * u * (3 - 2 * u))[:, None]
    return once("foot", make)


def head_y(which, F):
    """Where the template's head is at frame F, carried on past its picture's edge at the speed it had there."""
    t = FIG[which]["t"]["head_y"]
    if which == "a" and F > 19:
        return tab(t, 19) + 60.0 * (F - 19)
    if which == "b" and F < 24:
        return tab(t, 24) + 165.0 * (24 - F)
    return tab(t, F)


def tilt_of(which, F):
    """How far back the figure is tipped at frame F (radians) and how large the card itself stands, found from where
    the template's head is: the figure is one flat picture, hinged below and seen by a camera (template.json)."""
    t = FIG[which]["t"]
    tl = t["tilt"]
    yp, d = tl["hinge_y"], tl["camera"]
    h = yp - tab(t["head_y"], tl["upright_frame"])
    degs, zooms = zip(*tl["zoom_by_tilt"])
    target = head_y(which, F)
    lo, hi = 0.0, math.radians(88)
    for _ in range(40):
        th = (lo + hi) / 2
        z = float(np.interp(math.degrees(th), degs, zooms))
        if yp - z * h * math.cos(th) * d / (d + h * math.sin(th)) < target:
            lo = th
        else:
            hi = th
    th = (lo + hi) / 2
    return th, float(np.interp(math.degrees(th), degs, zooms))


def figure_at(which, F):
    """The cut-out as it stands at frame F: upright where the template's figure is upright, and tipped back whole,
    as a card, where the template's is. The whole picture tips; nothing in it moves against the rest."""
    t = FIG[which]["t"]
    tl = t["tilt"]
    k = FIG[which]["k"]
    ax, ay = FIG[which]["anchor"]()
    up = tl["upright_frame"]
    if (which == "a" and F <= up) or (which == "b" and F >= up):
        return figure(which).draw(k * tab(t["scale"], F), ax, ay, t["head_x"], tab(t["head_y"], F) + UP)
    th, z = tilt_of(which, F)
    k0, hx, hy0 = k * tab(t["scale"], up), t["head_x"], tab(t["head_y"], up) + UP
    yp, d = tl["hinge_y"] + UP, tl["camera"]
    c, sn = math.cos(th), math.sin(th)
    stand = np.float64([[k0, 0, hx - k0 * ax], [0, k0, hy0 - k0 * ay], [0, 0, 1]])         # the cut-out set upright
    to_card = np.float64([[1, 0, -hx], [0, -1, yp], [0, 0, 1]])                            # across, and up from the hinge
    tip = np.float64([[z * d, 0, 0], [0, z * d * c, 0], [0, sn, d]])                       # tipped back, seen by the camera
    to_screen = np.float64([[1, 0, hx], [0, -1, yp], [0, 0, 1]])
    top = yp - hy0 + 300                                                                   # about the top of His halo
    return figure(which).warp(to_screen @ tip @ to_card @ stand, k0 * z * c * d / (d + top * sn))


# The second dome. The template lights it in cyan and blue (template.json has that light, point by point). His word
# on the cut, 2026-11-22: "I want you to just use black or like a dark background, maybe like a glow. Just don't do
# blue though." So ours keeps the dark and the template's own shapes and times, with no colour in them: the ring
# about the dome is a soft white glow that grows as the template's ring grows, and the dark that rises behind the
# second figure is plain dark. The template's cyan pools and the blue from the foot of its picture are left out.
L2 = T["second_dome_light"]
RING_I, DARK_Y = L2["ring_strength"], L2["dark_half_y"]
GLOW = 0.5                                   # how strong the white glow is, against the template's coloured ring
GLOW_WHITE = np.float32([0.93, 0.93, 0.93])  # a plain white: no blue in it, and no gold


def ring(r, F2):
    """The second dome's glow: a soft ring of white about the disc, strongest toward the frame's sides, as the
    template's ring is. A ring and nothing else: its light has no beams in it."""
    yy, xx = _grid()
    d = np.hypot(xx - DOME_C[0], yy - DOME_C[1]) - r  # how far outside the disc
    dd = np.clip(d, 0, None)
    t = np.maximum(np.exp(-(((dd - 185) / 105) ** 2)), 0.28 * np.exp(-dd / 200))
    b = np.exp(-(((dd - 295) / 80) ** 2))
    side = once("ring-side", lambda: 0.15 + 0.85 * np.clip(np.abs(xx - W / 2) / 460, 0, 1) ** 1.5)
    v = (t + 0.5 * b) * side * (tab(RING_I, F2) * GLOW) * (d > -1)
    return v[..., None] * GLOW_WHITE


def second_light(out, F2):
    """What the second dome lays over the dome before the figure stands in it: the dark that rises with the second
    figure, as the template's does. No colour."""
    yy, _ = _grid()
    yb = yy - UP
    yd = tab(DARK_Y, F2)
    dark = None
    if yd < 1480:
        u = np.clip((yb - (yd - 150)) / 300, 0, 1)
        dark = u * u * (3 - 2 * u)
        out = out * (1 - 0.92 * dark[..., None])
    return out, dark


def dome_scene(F, second):
    """The dome at the template's frame F of its first playing: sky, disc, the name, and whichever figure stands.
    The second playing is the same dome with its colour on it."""
    r = tab(DOME_R, F)
    out = sky().copy()
    if second:
        out = out * 0.8 + ring(r, F + SECOND)
    d = disc().draw(r / 1000, 1024, 1024, DOME_C[0], DOME_C[1])
    da = d[..., 3:4]
    out = d[..., :3] * floor() + out * (1 - da)
    dark = None
    if second:
        out, dark = second_light(out, F + SECOND)
        out = out + 0.3 * blur(np.clip(out - 0.55, 0, 1), 16)
    out = name(out, 0.5)
    for which in ("a", "b"):
        # The second dome shows each figure on its own clock: holding, jumping, and the second one in sight sooner.
        Ff = tab(T["second_dome_clock"][f"figure_{which}"], F) if second else F
        if which == "a" and Ff >= FIG_A_GONE:
            continue
        if which == "b" and Ff < FIG_B_COMES:
            continue
        g = figure_at(which, Ff)
        # flat in the dome's shadow, a figure comes into sight and goes out of it softly
        seen = smooth((Ff - FIG_B_COMES) / 1.5) if which == "b" else 1 - smooth((Ff - (FIG_A_GONE - 1.5)) / 1.5)
        if seen < 0.999:
            g = g * seen
        a = g[..., 1] * figure_foot()
        lit = g[..., 0] * figure_foot()
        if dark is not None:  # the figure's own foot sinks into the dark that rose behind it
            lit = lit * (1 - 0.55 * dark)
        # a soft dark edge about the figure, as the template's has
        shade = blur(a, 16) * 0.5
        out = out * (1 - np.clip(shade - a, 0, 1)[..., None])
        out = lit[..., None] * np.float32([0.97, 0.98, 1.0]) + out * (1 - a[..., None])
    return out


def window_rect(F):
    """The window that opens over the figure: where it is and how large, at frame F of the dome's first playing."""
    w = tab(T["window"]["width"], F, log=True)
    u = smooth((w - 490) / (1200 - 490))
    aspect = lerp(0.95, 1.78, u ** 1.6)
    h = w * aspect
    cy = lerp(1235, 960, u)  # on His breast, below His beard; the template's opens on the man's face
    return 540.0, cy, w, h, u


def rounded(cx, cy, w, h, radius, feather=1.2):
    """A rounded rectangle as a mask the size of the frame."""
    yy, xx = once("grid", lambda: np.mgrid[0:H, 0:W].astype(np.float32))
    qx = np.abs(xx - cx) - (w / 2 - radius)
    qy = np.abs(yy - cy) - (h / 2 - radius)
    d = np.hypot(np.maximum(qx, 0), np.maximum(qy, 0)) + np.minimum(np.maximum(qx, qy), 0) - radius
    return np.clip(0.5 - d / feather, 0, 1)


def dome(F, second=False):
    out = dome_scene(F, second)
    a = tab(T["flash"]["by_frame"], F)
    if a > 0:
        back = F > 48  # coming back, the white is a little rose, as the template's is
        white = np.float32([1.0, 0.94, 0.98]) if back else np.float32([1.0, 1.0, 1.0])
        if second:  # the second flash is up a frame sooner, all the way to white, and down faster (the template's has cyan at its edge; ours is white)
            a = tab(L2["flash"], F)
        out = out * (1 - a) + white * a
    solid = tab(T["window"]["solid"], F)
    if solid > 0:
        cx, cy, w, h, u = window_rect(F)
        content = first_app_frame().draw(w / W, 540, lerp(513, 960, u), cx, cy)
        # the window's picture comes up to its flash as it is flown through; harder the second time, as measured
        up = {56.5: 0, 57: 0.3, 58: 0.9, 59: 2.0, 60: 2.2} if second else {56.5: 0, 57: 0.15, 58: 0.5, 59: 1.1, 60: 1.6}
        content = flash(content, tab(up, F), warm=0.3)
        m = rounded(cx, cy, w, h, 26 * (1 - u)) * solid
        edge = rounded(cx, cy, w + 5, h + 5, 28 * (1 - u) + 3) * solid * (1 - u)
        cast = blur(rounded(cx, cy + 18, w + 30, h + 30, 40), 22) * 0.55 * solid * (1 - u)
        out = out * (1 - cast[..., None])
        # the window is a lit screen: a fine light edge and a little light about it, so the app's dark page reads
        # against the dark figure as the template's bright picture does
        lit = blur(rounded(cx, cy, w + 10, h + 10, 30 * (1 - u) + 5), 14) * 0.5 * solid * (1 - u)
        out = out + lit[..., None] * np.float32([0.85, 0.9, 1.0])
        out = out * (1 - edge[..., None]) + 0.78 * edge[..., None]
        out = out * (1 - m[..., None]) + content * m[..., None]
    return out


# ── The shots between the domes ──────────────────────────────────────────

Z = T["zoom"]


def _z(name, extra):
    d = {float(k): v for k, v in Z[name].items()}
    d.update(extra)
    return d


# Each shot: its picture, the point of the picture that is held still (for an icon, counted from the middle of His
# eyes in eye-distances: across, down), where on the screen that point is held, how large the picture stands, and
# the template's own zoom, blur and flash for that shot, frame by frame.
#
# A word never stands on His face. In every shot that carries one, the point held at the middle of the frame, where
# the word stands, is His neck below His beard or His breast; so however near the shot comes, the word stays there.
SHOTS = {
    # The app's Today, drawn up so the quiet space between the saint and the hour's prayer is where the word stands.
    "clip1a": dict(src=("screen", "today"), anchor=(515, 946), pos=(540, 960), k=1080 / 1030,
                   zoom=_z("clip1a", {60: 0.985, 74: 1.75, 75: 2.0, 76: 2.2}), floor_zoom=1.0,
                   blur={60: 10, 61: 6, 62: 2.5, 63: 7, 64: 0.6, 65: 0, 72: 0, 73: 3, 74: 9, 75: 16},
                   flash={60: 1.5, 61: 0.95, 62: 0.6, 63: 0.38, 64: 0.26, 65: 0.16, 66: 0.08, 67: 0.03, 69: 0.03, 70: 0.07, 71: 0.15, 72: 0.33,
                          73: 0.66, 74: 1.2, 75: 1.9}),
    # John 14 in the app's own Bible, verse 6 ending just above the word.
    "clip1b": dict(src=("screen", "bible"), anchor=(515, 966), pos=(540, 960), k=1080 / 1030,
                   zoom=_z("clip1b", {76: 0.985, 89: 1.6, 90: 1.8, 91: 2.0}), floor_zoom=1.0,
                   blur={76: 6, 77: 3.5, 78: 7, 79: 0.6, 80: 0, 87: 0, 88: 3, 89: 9, 90: 16},
                   # the page is black with fine letters, far darker than the template's shot: its light is left on a little,
                   # so the letters glow and the shot holds its own between two bright ones
                   flash={76: 1.0, 77: 0.62, 78: 0.4, 79: 0.28, 80: 0.2, 81: 0.16, 84: 0.16, 85: 0.19, 86: 0.25, 87: 0.35, 88: 0.52, 89: 0.75,
                          90: 1.0}),
    # A quiet head and shoulders, the word on His neck: the template's second shot is its calmest.
    "clip2": dict(src=("icon", "pantocrator19"), anchor=("eyes", 0, 2.5), pos=(540, 960), D=200,
                  zoom=_z("clip2", {91: 0.90, 92: 0.95, 104: 0.89}), floor_zoom=0.9,
                  blur={91: 4, 92: 5, 93: 9, 94: 3, 95: 1.5, 96: 0.8, 97: 0.8, 98: 0.4, 99: 0.4, 100: 1.5, 101: 4, 102: 8.5, 103: 9, 104: 9},
                  flash={91: 0.2, 92: 0.1, 93: 0.04, 94: 0, 99: 0, 100: 0.04, 101: 0.07, 102: 0.09, 103: 0.12, 104: 0.17},
                  pool=(540, 620, 280, 1050, 0.22), expose=0.76),
    # The blessing hand, then the whole of Him: the template's third shot opens on a hand thrown toward the lens.
    "clip3": dict(src=("icon", "vysotsky"), anchor=(620, 1340), pos=(520, 1300), k=1.0 / 0.686,
                  zoom=_z("clip3", {105: 1.9, 106: 1.3, 118: 0.69, 119: 0.72, 120: 0.85, 121: 1.0}), floor_zoom=0.686,
                  blur={105: 12, 106: 9, 107: 8, 108: 8, 109: 7, 110: 5.5, 111: 2.5, 112: 1, 113: 0, 114: 1, 115: 2.5, 116: 4.5, 117: 2.5, 118: 6,
                        119: 4, 120: 12},
                  flash={105: 1.6, 106: 0.8, 107: 0.35, 108: 0.14, 109: 0.05, 110: 0, 114: 0, 115: 0.05, 116: 0.11, 117: 0.2, 118: 0.31, 119: 0.4,
                         120: 0.75},
                  pool=(540, 780, 400, 1100, 0.26), expose=0.72),
    # The same shot goes on beneath the first run of faces, as the template's does: its window opens on His face.
    "base4": dict(src=("icon", "vysotsky"), anchor=(620, 1340), pos=(520, 1300), k=1.0 / 0.686,
                  # soft beneath the window, as the template's shot is, so the eye goes to the faces
                  zoom={121: 0.70, 150: 0.735}, floor_zoom=0.686, blur={121: 4, 122: 2.5, 123: 3.5}, flash={},
                  pool=(540, 780, 400, 1100, 0.26), expose=0.72),
    # The question, over the oldest icon of Him there is: the app's own. The word on His neck.
    "question": dict(src=("icon", "sinai"), anchor=("eyes", 0, 2.95), pos=(505, 960), k=0.48,
                     zoom=_z("question", {150: 0.9, 151: 0.9, 152: 0.95, 177: 1.02, 240: 1.02}), floor_zoom=1.0,
                     blur={151: 9, 152: 7.5, 153: 6, 154: 5, 155: 4.2, 156: 3.5, 157: 2.8, 158: 2.2, 159: 1.6, 160: 1.0, 161: 0.5, 162: 0, 172: 0,
                           173: 1.2, 174: 2.5, 175: 4, 176: 4.5, 177: 4, 178: 0},
                     flash={172: 0, 173: 0.04, 174: 0.055, 175: 0.075, 176: 0.12, 177: 0.2, 178: 0, 203: 0, 204: 0.04, 205: 0.11, 206: 0.22},
                     leak={174: 0, 175: 0.15, 176: 0.4, 177: 0.8, 178: 0},
                     pool=(520, 600, 380, 1150, 0.45), expose=0.95),
    # The answer: first grey and blown out, pulling back from His face as the template pulls back; then in its gold,
    # the word on His neck. The eye-distances are the template's own, a little under (0.88), so the picture is
    # never drawn larger than it was fetched.
    "answer_grey": dict(src=("icon", "golden"), anchor=("eyes", 0, -0.84), pos=(540, 579), D=275 / 1.2,
                        zoom=_z("answer_grey", {208: 1.2}), floor_zoom=0.5, grey=1.0, levels=(0.16, 0.86),
                        gamma=1.35, tint=(0.96, 0.985, 1.03),
                        blur={208: 12, 209: 8, 210: 7, 211: 6, 212: 5, 213: 4.2, 214: 3.6, 215: 3.2},
                        smear={208: 110, 209: 60, 210: 30, 211: 12, 212: 0},
                        gain={208: 2.6, 209: 1.85, 210: 1.42, 211: 1.2, 212: 1.08, 213: 1.02, 214: 1.0}, flash={},
                        pool=(540, 800, 420, 1150, 0.5)),
    "answer_colour": dict(src=("icon", "golden"), anchor=("eyes", 0, 2.6), pos=(540, 960), D=150,
                          zoom=_z("answer_colour", {232: 0.95, 233: 1.0, 234: 0.97, 236: 1.0}), floor_zoom=0.876,
                          blur={216: 2.6, 217: 2.2, 218: 1.9, 219: 1.6, 220: 1.3, 221: 1.0, 222: 0.8, 223: 0.6, 224: 0.4, 226: 0.2, 228: 0, 231: 0,
                                232: 6, 233: 9, 234: 4, 234.6: 3, 235.4: 12},
                          flash={}, pool=(540, 760, 400, 1150, 0.4), expose=0.92),
}


def source(src):
    kind, n = src
    return icon(n) if kind == "icon" else screen(n)


def shot_geometry(name_, F):
    """Where a shot's picture stands at frame F: how large, and the picture's point and the screen's point held together."""
    s = SHOTS[name_]
    kind, n = s["src"]
    a = s["anchor"]
    if kind == "icon":
        ex, ey, d = eyes(n)
    if a == "eyes":
        ax, ay = ex, ey
    elif isinstance(a[0], str):
        ax, ay = ex + a[1] * d, ey + a[2] * d
    else:
        ax, ay = a
    k0 = s["D"] / d if "D" in s else s["k"]
    z = max(s.get("floor_zoom", 0), tab(s["zoom"], F, log=True))
    return k0 * z, ax, ay, s["pos"][0], s["pos"][1]


def face_place(name_, F):
    """Where the middle of His face stands on the screen in a shot, for a window to open on or close onto."""
    k, ax, ay, px, py = shot_geometry(name_, F)
    ex, ey, d = eyes(SHOTS[name_]["src"][1])
    return px + (ex - ax) * k, py + (ey + 0.45 * d - ay) * k


def shot_frame(name_, F, dx=0.0, plain=False):
    s = SHOTS[name_]
    kind, n = s["src"]
    k, ax, ay, px, py = shot_geometry(name_, F)
    img = source(s["src"]).draw(k, ax, ay, px + dx, py, edge=True)
    if plain:
        return img
    if s.get("pool"):
        img = img * pool(*s["pool"]) * s.get("expose", 1.0)
    if s.get("grey"):
        img = grey(img, s["grey"])
    if s.get("levels"):
        lo, hi = s["levels"]
        img = (img - lo) / (hi - lo)
    if s.get("gamma"):
        img = np.clip(img, 0, 1) ** s["gamma"]
    if s.get("tint"):
        img = img * np.float32(s["tint"])
    img = blur(img, tab(s["blur"], F)) if s["blur"] else img
    if s.get("smear"):
        img = smear(img, tab(s["smear"], F))
    if s.get("gain"):  # a hit that blows the lights out and leaves the darks dark, as the template's grey hit does
        g = tab(s["gain"], F)
        if g > 1.001:
            img = img * g + blur(img, 34) * (0.25 * (g - 1))
    img = flash(img, tab(s["flash"], F) if s["flash"] else 0, warm=1.0 if kind == "icon" else 0.3)
    if s.get("leak"):
        img = leak(img, tab(s["leak"], F))
    return img


def first_app_frame():
    """The app's Today as the first shot begins, which the window shows small and is flown through to."""
    return once("first-app", lambda: Pic((np.clip(shot_frame("clip1a", 60, plain=True), 0, 1) * 255).astype(np.uint8)))


# ── The runs of faces ────────────────────────────────────────────────────

EYE_Y = 780  # where His eyes stand in every face, so one face cuts and melts into the next in place
# (icon, how far apart His eyes are on the screen). In order; the run uses as many as the template has shots.
FACES1 = [("yaroe", 250), ("novgorod", 310), ("ushakov", 320), ("vysotsky", 150), ("sinai", 250), ("rublev", 380), ("zlatye", 390),
          ("pantocrator19", 240), ("novgorod", 400), ("sinai", 330), ("ushakov", 420), ("yaroe", 250), ("pantocrator19", 300),
          ("zlatye", 390), ("sinai", 430), ("novgorod", 320), ("ushakov", 330), ("sinai", 270)]
FACES2 = [("sinai", 460), ("ushakov", 340), ("novgorod", 330), ("pantocrator19", 250), ("zlatye", 390), ("sinai", 280), ("novgorod", 430),
          ("ushakov", 440), ("pantocrator19", 320), ("rublev", 380), ("sinai", 250), ("yaroe", 250), ("novgorod", 310), ("vysotsky", 150),
          ("ushakov", 320), ("sinai", 250)]


def plate(name_, D):
    def make():
        ex, ey, d = eyes(name_)
        return (np.clip(icon(name_).draw(D / d, ex, ey, 540, EYE_Y), 0, 1) * 255).astype(np.uint8)
    return once(("plate", name_, D), make)


def flow(a, b):
    """How the pixels of one face would have to travel to become the next: found small and smooth, then enlarged."""
    def make():
        A, B = plate(*a), plate(*b)
        sa = cv2.GaussianBlur(cv2.resize(cv2.cvtColor(A, cv2.COLOR_RGB2GRAY), (270, 480), interpolation=cv2.INTER_AREA), (0, 0), 2)
        sb = cv2.GaussianBlur(cv2.resize(cv2.cvtColor(B, cv2.COLOR_RGB2GRAY), (270, 480), interpolation=cv2.INTER_AREA), (0, 0), 2)
        f = cv2.calcOpticalFlowFarneback(sa, sb, None, 0.5, 4, 41, 4, 7, 1.5, 0)
        f = cv2.GaussianBlur(f, (0, 0), 6)
        return cv2.resize(f, (W, H), interpolation=cv2.INTER_CUBIC) * 4.0
    return once(("flow", a, b), make)


def melt(a, b, u):
    """One face melting into the next: each whole picture follows the flow part of the way, laid over the other,
    the one leaving a little nearer and the one arriving coming up to its place. Nothing in either is drawn."""
    f = flow(a, b) * WARP
    yy, xx = _grid()
    za, zb = 1 + 0.05 * u, 0.95 + 0.05 * u  # a small push through the change, about His eyes
    ax, ay = 540 + (xx - 540) / za, EYE_Y + (yy - EYE_Y) / za
    bx, by = 540 + (xx - 540) / zb, EYE_Y + (yy - EYE_Y) / zb
    A = cv2.remap(plate(*a), ax - u * f[..., 0], ay - u * f[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    B = cv2.remap(plate(*b), bx + (1 - u) * f[..., 0], by + (1 - u) * f[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    return (A.astype(np.float32) * (1 - u) + B.astype(np.float32) * u) / 255


WARP = 1.5        # how far the pixels travel in a melt, against the flow found: the template's faces pull hard
FACE_SOFT = 1.8   # every face a touch soft, as the template's are, so a small old panel and a large one sit together


def face_frame(run, F):
    faces = FACES1 if run == 1 else FACES2
    starts = T[f"faces{run}"]["shot_starts"]
    i = max(j for j, s in enumerate(starts) if s <= F) if F >= starts[0] else 0
    nxt = starts[i + 1] if i + 1 < len(starts) else None
    a = faces[i % len(faces)]
    if nxt is not None:
        span = min(1.7, 0.62 * (nxt - starts[i]))  # how long this face takes to melt into the next
        if F > nxt - span:
            u = smooth((F - (nxt - span)) / span)
            w = math.sin(math.pi * u)
            # the melt goes soft in its middle, as the template's does
            return blur(melt(a, faces[(i + 1) % len(faces)], u), FACE_SOFT + 5.0 * w)
    return blur(plate(*a).astype(np.float32) / 255, FACE_SOFT)


FACE_POOL = (540, 800, 280, 920, 0.14)


def faces(run, F):
    """A run of faces in its window over the shot beneath: the window grows to fill the frame, or shrinks away."""
    w = tab(T[f"faces{run}"]["window_width"], F)
    under = "base4" if run == 1 else "question"
    base = shot_frame(under, F)
    if run == 2:  # soft beneath the window, as the template's shot is
        base = blur(base, 2.5)
    home = face_place(under, F)
    if w <= 4:
        return base
    face = face_frame(run, F) * pool(*FACE_POOL) * 0.88
    u = min(1.0, max(0.0, (w - 300) / 790))
    full = u >= 0.999
    if full:
        out = face
    else:
        h = w * lerp(0.9, 1.78, u ** 2.2)
        cx, cy = lerp(home[0], 540, u ** 1.2), lerp(home[1], 960, u ** 1.2)
        c = lerp(0.42, 1.0, u ** 1.3)
        M = np.float32([[c, 0, cx - c * 540], [0, c, (cy - 0.094 * h) - c * EYE_Y]])
        content = cv2.warpAffine(face, M, (W, H), flags=cv2.INTER_AREA if c < 0.8 else cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        m = rounded(cx, cy, w, h, 14, feather=5)
        cast = blur(rounded(cx, cy + 10, w + 26, h + 26, 30), 20) * 0.5
        # the window's own edge falls a little into shadow, as the template's does
        inner = 1 - 0.35 * (1 - rounded(cx, cy, w - 36, h - 36, 20, feather=40))
        out = base * (1 - cast[..., None])
        out = out * (1 - m[..., None]) + content * inner[..., None] * m[..., None]
    if run == 1:
        out = flash(out, tab({121: 0.25, 122: 0.12, 123: 0.04, 124: 0, 146: 0, 147: 0.06, 148: 0.12, 149: 0.16, 149.5: 0.06, 150: 0}, F), warm=0.6)
        if F >= 149.5:  # the run falls dark and soft into the question
            v = smooth((F - 149.5) / 1.2)
            out = blur(out, 14 * v) * (1 - 0.45 * v)
    else:
        out = blur(out, tab({178: 20, 179: 6, 180: 2, 181: 0}, F))
        out = flash(out, tab({178: 0.34, 179: 0.46, 180: 0.34, 181: 0.16, 182: 0.04, 183: 0}, F), warm=1.0)
    return out


# ── The film ─────────────────────────────────────────────────────────────

C = T["cuts"]
SEGMENTS = [0, C["clip1a"], C["clip1b"], C["clip2"], C["clip3"], C["faces1"], C["question"], C["faces2"], C["whip"], C["answer_grey"],
            C["answer_colour"], 235.4, 294, TOTAL_F]
SECOND = T["second_dome_starts"]


def moment(F):
    """The picture at one moment, counted in the template's frames."""
    if F < C["clip1a"]:
        return dome(F)
    if F >= 294:  # the app again, as the template's first shot comes again with the second dome's light on it
        return shot_frame("clip1a", F - SECOND)
    if F >= 235.4:
        f = F - SECOND
        img = dome(f, second=True)
        u = min(1.0, (F - 235.4) / 4.6)
        if u < 1:  # the dome comes in fast and settles: nearer, sliding, soft, its light a little over
            z = 1 + 0.6 * (1 - u) ** 3
            M = np.float32([[z, 0, DOME_C[0] * (1 - z) + 900 * (1 - u) ** 4], [0, z, DOME_C[1] * (1 - z)]])
            img = cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
            img = smear(blur(img, 12 * (1 - u) ** 2), 240 * (1 - u) ** 3)
            img = img * (0.5 + 0.5 * u ** 0.7)
        return img
    if F < C["clip1b"]:
        img = shot_frame("clip1a", F)
    elif F < C["clip2"]:
        img = shot_frame("clip1b", F)
    elif F < C["clip3"]:
        img = shot_frame("clip2", F)
    elif F < C["faces1"]:
        img = shot_frame("clip3", F)
    elif F < C["question"]:
        img = faces(1, F)
    elif F < C["faces2"]:
        img = shot_frame("question", F)
    elif F < C["whip"]:
        img = faces(2, F)
    elif F < C["answer_grey"]:
        # The two frames before the answer: the shot beneath stays where it is and is drawn out sideways, soft and
        # brightening, as the template's is. Nothing slides out of the frame.
        v = (F - C["whip"]) / 2.0
        img = shot_frame("question", F)
        img = smear(blur(push(img, 1 + 0.07 * v, *face_place("question", F)), 3 + 5 * v), 70 + 150 * v)
        img = leak(flash(img, 0.26 * v, warm=1.0), 0.45 * v)
    elif F < C["answer_colour"]:
        img = shot_frame("answer_grey", F)
    else:
        # The answer leaves as the template's does: thrown to the reading side, drawn out, and falling dark.
        v = min(1.0, max(0.0, (F - 234.6) / 0.8))
        img = shot_frame("answer_colour", F, dx=-380 * v * v)
        if v > 0:
            img = smear(img, 40 + 320 * v) * (1 - 0.72 * v)
    return img


def caption_soft(F):
    """A word goes a little soft with its picture on the hardest hit, as the template's does."""
    return tab({104.5: 0, 105: 4, 106: 2, 107: 0}, F)


def fast(F):
    """How many moments are averaged for the frame at F: more where the picture moves fast."""
    f = F if F < 235.4 else F - SECOND
    if F < C["clip1a"] or F >= 235.4:
        if F >= 294:
            return 4
        if 235.4 <= F < 240:
            return 8
        if 3 <= f < FIG_A_GONE or FIG_B_COMES <= f < 40:
            # as many moments as the figure's head travels in fours of a pixel, so its blur is smooth and never stepped
            which = "a" if f < FIG_B_COMES else "b"
            travel = abs(head_y(which, f + 0.5) - head_y(which, f - 0.5)) * 1.3
            return int(min(36, max(2, math.ceil(travel / 4))))
        if 55.5 <= f < 60.5:
            return 30  # the window is flown through: many moments, so its blur is smooth
        return 1 if f < 44 or f > 54 else 2
    if C["faces1"] <= F < C["question"] or C["faces2"] <= F < C["whip"]:
        return 3
    if C["whip"] <= F < C["answer_grey"]:
        return 3  # drawn out by its own smear already
    if C["answer_grey"] <= F < 212 or F > 234.4:
        return 8
    return 5


def shutter(F):
    """How long the shutter stays open, in template frames. The template's second dome is the first one played
    again with its frames kept crisp, so there the figures move in clean steps; everywhere else motion is drawn out."""
    return 0.3 if 240 <= F < 289 else 1.0


def frame(n):
    """Frame n of the film (60 a second): the mean of several moments within one template frame's time."""
    Fc = n * TF / FPS
    seg = max(i for i, s in enumerate(SEGMENTS[:-1]) if s <= Fc)
    lo, hi = SEGMENTS[seg], SEGMENTS[seg + 1] - 1e-3
    sh = shutter(Fc)
    N = max(1, math.ceil(fast(Fc) * sh)) if sh < 1 else fast(Fc)
    acc = None
    for j in range(N):
        F = min(hi, max(lo, Fc + ((j + 0.5) / N - 0.5) * sh))
        m = np.clip(moment(F), 0, 1)
        acc = m if acc is None else acc + m
    img = acc / N
    if C["clip1a"] <= Fc < 235.4 or Fc >= 294:
        # The word and the name are set on the finished frame, so a word changes cleanly on its beat.
        if Fc < 235.4:
            img = caption(img, Fc, soft=caption_soft(Fc), seed=n)
        img = name(img, 0.5)
    return img


def to_u8(img):
    return (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8)


# ── The work ─────────────────────────────────────────────────────────────

def template_frame(F):
    p = os.environ.get("TEMPLATE_FRAMES")
    if not p:
        return None
    f = os.path.join(p, "%04d.jpg" % int(F))
    return np.asarray(Image.open(f).convert("RGB")) if os.path.exists(f) else None


def sheet(name_, frames, big=False):
    """Each named template frame: the template's picture, ours in the same band, and ours whole."""
    tiles = []
    bw, bh = (540, 480) if big else (270, 240)
    for F in frames:
        ours = to_u8(frame(int(round(F * FPS / TF))))
        band = cv2.resize(ours[UP:UP + 960], (bw, bh), interpolation=cv2.INTER_AREA)
        whole = cv2.resize(ours, (bw // 2, bh), interpolation=cv2.INTER_AREA)
        t = template_frame(F)
        t = cv2.resize(t, (bw, bh), interpolation=cv2.INTER_AREA) if t is not None else np.zeros((bh, bw, 3), np.uint8)
        tile = np.concatenate([t, band, whole], axis=1)
        cv2.putText(tile, f"{F:g}", (4, 14), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 0), 1, cv2.LINE_AA)
        tiles.append(tile)
    cols = 1 if big else 2
    rows = [np.concatenate(tiles[i:i + cols] + [np.zeros_like(tiles[0])] * (cols - len(tiles[i:i + cols])), axis=1) for i in range(0, len(tiles), cols)]
    out = np.concatenate(rows, axis=0)
    os.makedirs(f"{HOME}/sheets", exist_ok=True)
    Image.fromarray(out).save(f"{HOME}/sheets/{name_}.jpg", quality=86)
    print(f"{HOME}/sheets/{name_}.jpg", out.shape)


def strip(name_, n0, n1, cols=8):
    """Frames of the film itself (60 a second), one after another, to see a change as it moves."""
    tiles = []
    for n in range(n0, n1):
        t = cv2.resize(to_u8(frame(n)), (270, 480), interpolation=cv2.INTER_AREA)
        cv2.putText(t, f"{n} ({n * TF / FPS:g})", (4, 14), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (255, 255, 0), 1, cv2.LINE_AA)
        tiles.append(t)
    rows = [np.concatenate(tiles[i:i + cols] + [np.zeros_like(tiles[0])] * (cols - len(tiles[i:i + cols])), axis=1) for i in range(0, len(tiles), cols)]
    os.makedirs(f"{HOME}/sheets", exist_ok=True)
    Image.fromarray(np.concatenate(rows, axis=0)).save(f"{HOME}/sheets/{name_}.jpg", quality=86)
    print(f"{HOME}/sheets/{name_}.jpg")


def _luma_of(F):
    img = to_u8(frame(int(round(F * FPS / TF))))[UP:UP + 960].astype(np.float32)
    g = 0.299 * img[..., 0] + 0.587 * img[..., 1] + 0.114 * img[..., 2]
    return F, float(g.mean()), float(cv2.Laplacian(cv2.resize(g, (540, 480), interpolation=cv2.INTER_AREA), cv2.CV_32F).var())


def luma(a=0, b=TOTAL_F):
    """Ours against the template, frame by frame: how bright the template's band of the picture is, and how sharp."""
    from multiprocessing import Pool
    with Pool(4) as pool:
        rows = sorted(pool.map(_luma_of, range(a, b), chunksize=4))
    tl, ts = T["luma_by_frame"], T["sharpness_by_frame"]
    out = [{"frame": F, "ours": round(l, 1), "template": round(tl[F], 1), "ours_sharp": round(sh, 1), "template_sharp": round(ts[F], 1)} for F, l, sh in rows]
    json.dump(out, open(f"{HOME}/luma.json", "w"))
    for r in out:
        print(f"{r['frame']:4d}  ours {r['ours']:6.1f}  template {r['template']:6.1f}   sharp ours {r['ours_sharp']:7.1f}  template {r['template_sharp']:7.1f}")


def render_range(args):
    a, b = args
    os.makedirs(f"{HOME}/frames", exist_ok=True)
    for n in range(a, b):
        Image.fromarray(to_u8(frame(n))).save(f"{HOME}/frames/v{n:05d}.png", compress_level=1)
    return b - a


def lay_sound(audio, offset=0.0):
    """The private preview: the silent master with a sound laid under it. `offset` is how many seconds into the
    film the sound's first sample falls (found by setting the sound against the template's own, sample by sample);
    the sound is padded with silence to the film's length and the picture is not touched."""
    total = int(round(TOTAL_F * FPS / TF))
    master = f"{HOME}/purify-christ-edit.mp4"
    preview = f"{HOME}/purify-christ-edit-PREVIEW-not-for-posting.mp4"
    late = int(round(max(0.0, offset) * 44100))
    chain = f"aresample=44100,adelay={late}S:all=1,apad=whole_dur={total / FPS:.4f}"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", master, "-i", audio, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-af", chain,
                    "-c:a", "aac", "-b:a", "192k", "-t", f"{total / FPS:.4f}", "-movflags", "+faststart", preview], check=True)
    return preview


def render_frames(a=0, b=None):
    """Frames a to b of the film (60 a second) into the work folder; the rest are left as they are."""
    from multiprocessing import Pool
    total = int(round(TOTAL_F * FPS / TF))
    b = total if b is None else min(total, b)
    step = 12
    jobs = [(i, min(b, i + step)) for i in range(a, b, step)]
    done = 0
    with Pool(4) as pool:
        for k in pool.imap_unordered(render_range, jobs):
            done += k
            print(f"  {done} of {b - a} frames", flush=True)


def encode(audio=None, offset=0.0):
    """The silent master from the frames in the work folder; with a sound, the private preview too."""
    total = int(round(TOTAL_F * FPS / TF))
    master = f"{HOME}/purify-christ-edit.mp4"
    common = ["-framerate", str(FPS), "-i", f"{HOME}/frames/v%05d.png", "-frames:v", str(total), "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p",
              "-c:v", "libx264", "-profile:v", "high", "-level", "4.2", "-preset", "slower", "-crf", "15", "-colorspace", "bt709", "-color_primaries", "bt709",
              "-color_trc", "bt709", "-color_range", "tv", "-movflags", "+faststart"]
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *common, "-an", master], check=True)
    out = {"master": master, "frames": total, "seconds": total / FPS}
    if audio:
        out["preview"] = lay_sound(audio, offset)
    print(json.dumps(out))


def render(audio=None, offset=0.0):
    render_frames()
    encode(audio, offset)


if __name__ == "__main__":
    mode = sys.argv[3]
    if mode in ("sheet", "big"):
        sheet(sys.argv[4], [float(x) for x in sys.argv[5:]], big=mode == "big")
    elif mode == "still":
        F = float(sys.argv[4])
        os.makedirs(f"{HOME}/stills", exist_ok=True)
        Image.fromarray(to_u8(frame(int(round(F * FPS / TF))))).save(f"{HOME}/stills/f{F:g}.png")
        print(f"{HOME}/stills/f{F:g}.png")
    elif mode == "strip":
        strip(sys.argv[4], int(sys.argv[5]), int(sys.argv[6]))
    elif mode == "luma":
        luma(*(int(x) for x in sys.argv[4:6])) if len(sys.argv) > 5 else luma()
    elif mode == "render":
        render(sys.argv[4] if len(sys.argv) > 4 else None, float(sys.argv[5]) if len(sys.argv) > 5 else 0.0)
    elif mode == "frames":  # some frames again, after a change to one part of the film
        render_frames(int(sys.argv[4]), int(sys.argv[5]))
    elif mode == "encode":
        encode(sys.argv[4] if len(sys.argv) > 4 else None, float(sys.argv[5]) if len(sys.argv) > 5 else 0.0)
    elif mode == "sound":  # a new sound under the film already rendered
        print(lay_sound(sys.argv[4], float(sys.argv[5]) if len(sys.argv) > 5 else 0.0))
