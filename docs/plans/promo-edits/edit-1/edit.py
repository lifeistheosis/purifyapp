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

# The run, in order: Western paintings of the pagan gods, in colour (his word, 2026-11-24). It uses as many as there
# are shots, round again, and always ends on the last. Each fills the frame, held on the god's face:
#   (picture, how wide the whole painting is on the screen, where its held point stands)
# The last, Ingres's Jupiter, is set eye for eye on the icon that follows the drop: the same place and the same size,
# so the cut turns the false face into the true one.
# The gods are the ones known at a glance (his word, 2026-11-24: "Use recognizable pagans").
# Buddha stands among them at his word of 2026-11-24, given three times after the risk to the account was named to him.
# Every one is a painting (his word, 2026-11-24: "use art, not statues or old drawings").
RUN = [("poseidon", 3600, (540, 480)), ("athene", 2700, (540, 640)), ("buddha", 2000, (540, 620)), ("thor", 1700, (540, 640)),
       ("calf", 3000, (540, 400)), ("semele", 4600, (540, 760)), ("jupiter", "eyes", None)]
RUN_POOL = (380, 1250, 0.24)  # the light pooled on the face, the rest let fall
WORDS_CLEAR = 1230  # below this line of the frame the run is clean white, for its words
EYE_Y = 700       # where the eyes stand in every face, so the gaze holds still through the run

# After the drop, on the reference's own cuts. Every icon fills the frame, as the Christ edit's do: (first frame,
# picture, the point of it that is held (as shares of its width and height, or "eyes"), where on the frame that point
# stands, how wide the whole icon is on the screen, the push by the shot's end, the pooled light (r0, r1, low)).
AFTER = [(671, "sinai", "eyes", (540, 700), 1500, 1.06, (330, 1150, 0.16)),
         (739, "transfig", (0.5, 0.215), (540, 418), 1400, 1.05, (380, 1500, 0.34)),
         (1013, "novgorod", "eyes", (540, 560), 1750, 1.05, (420, 1060, 0.04))]
LINES = {"sinai": ("answer", 1390, 72), "novgorod": ("light", 1400, 60)}  # a word never stands on His face

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

def the_light(F):
    """The road at night, and a light from heaven round about him (Acts 9:3). No lamp is seen: the light comes down
    from above the frame and lies on the ground about Saul as one soft pool; the dark between holds his words. It
    grows a little, evenly, through the shot. The light is ours: none of the painting's sky is kept. No beams."""
    u = F / LIGHT_ENDS
    grow = 1 + 0.07 * u
    yy, xx = grid()
    white = np.float32([1.0, 0.99, 0.975])
    # From above: the foot of a wide light whose middle is over the top of the frame.
    d = np.hypot((xx - W / 2) / 1.2, yy + 150) / grow
    above = 1.0 * np.exp(-(d / 330) ** 2) + 0.22 * np.exp(-(d / 760) ** 2)
    # On the road: the same light lying about him, seen from the side, so it is wide and low.
    s = once("saul", lambda: np.asarray(Image.open(f"{HOME}/saul.png").convert("RGBA"), dtype=np.float32) / 255)
    k = 940 / s.shape[1]
    fig = place(s, k, s.shape[1] / 2, s.shape[0], W / 2, 1540)
    a = fig[..., 3:4]
    g = np.hypot((xx - W / 2 + 40) / (600 * grow), (yy - 1455) / (190 * grow))
    road = 0.72 * np.exp(-g ** 2) + 0.12 * np.exp(-(g / 1.9) ** 2)
    # Where he lies the road is in his shade.
    shade = once("shade", lambda: cv2.GaussianBlur(place(s[..., 3], k, s.shape[1] / 2, s.shape[0], W / 2, 1576), (0, 0), 14))
    road = road * (1 - 0.8 * shade * np.clip((yy - 1400) / 110, 0, 1))  # under him only, never a dark edge about him
    out = np.clip(above + road, 0, 1)[..., None] * white
    # He is lit from above: his hand, his face and his shoulder take the light, and his legs take less.
    hx, hy = W / 2 + (0.36 - 0.5) * 940, 1540 - (1 - 0.30) * s.shape[0] * k
    lit = pool(hx + 80, hy - 60, 240, 900, 0.30)
    out = out * (1 - a) + fig[..., :3] * lit * a
    return say(out, "ask", 800)


# ── The run ──────────────────────────────────────────────────────────────

def entry(i):
    return RUN[-1] if i >= len(RUN_CUTS) - 1 else RUN[i % (len(RUN) - 1)]


def plate(i):
    """A painting whole and unaltered, larger than the frame, held on the god's face, its light pooled there."""
    name, width, at = entry(i)
    def make():
        im, p = rgb(name), PICS[name]
        if width == "eyes":
            (lx, ly), (rx, ry) = p["eyes"]
            (ax, ay), (bx, by) = PICS["sinai"]["eyes"]
            k = math.hypot(bx - ax, by - ay) * AFTER[0][4] / rgb("sinai").shape[1] / math.hypot(rx - lx, ry - ly)
            sx, sy, (dx, dy) = (lx + rx) / 2, (ly + ry) / 2, AFTER[0][3]
        else:
            k, sx, sy, (dx, dy) = width / im.shape[1], p["focus"][0] * im.shape[1], p["focus"][1] * im.shape[0], at
        # The painting always covers the frame: the held point gives way a little before an edge of the canvas shows.
        dx = min(max(dx, W - k * (im.shape[1] - sx)), k * sx)
        dy = min(max(dy, H - k * (im.shape[0] - sy)), k * sy)
        out = place(im, k, sx, sy, dx, dy)
        if k > 1.2:  # a painting shown larger than its file is made a little crisper; nothing in it is drawn
            out = np.clip(out + 0.6 * (out - cv2.GaussianBlur(out, (0, 0), 2.2 * k)), 0, 1)
        out = out * pool(dx, dy, *RUN_POOL)
        yy, _ = grid()
        foot = np.clip((yy - 1060) / 380, 0, 1)
        return out * (1 - 0.55 * foot * foot * (3 - 2 * foot))[..., None]  # the foot let fall further, where the words stand
    return once(("plate", name), make)


def flow(i, j):
    """How the pixels of one picture would have to travel to become the next: found small and smooth, then enlarged.
    (The Christ edit's melt.)"""
    def make():
        small = lambda p: cv2.GaussianBlur(cv2.resize(cv2.cvtColor((np.clip(p, 0, 1) * 255).astype(np.uint8), cv2.COLOR_RGB2GRAY), (270, 480), interpolation=cv2.INTER_AREA), (0, 0), 2)
        f = cv2.calcOpticalFlowFarneback(small(plate(i)), small(plate(j)), None, 0.5, 4, 41, 4, 7, 1.5, 0)
        return cv2.resize(cv2.GaussianBlur(f, (0, 0), 6), (W, H), interpolation=cv2.INTER_CUBIC) * 4.0
    return once(("flow", entry(i)[0], entry(j)[0]), make)


def melt(i, j, u):
    """One painting melting into the next, as the Christ edit's faces do: each whole picture follows the flow part of
    the way, laid over the other, soft in its middle. Nothing in either is drawn."""
    f = flow(i, j) * 1.5
    yy, xx = grid()
    A = cv2.remap(plate(i), xx - u * f[..., 0], yy - u * f[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    B = cv2.remap(plate(j), xx + (1 - u) * f[..., 0], yy + (1 - u) * f[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    return cv2.GaussianBlur(A * (1 - u) + B * u, (0, 0), 1.0 + 5.0 * math.sin(math.pi * u))


def the_run(F):
    i = max(k for k, c in enumerate(RUN_CUTS) if c <= F + MELT / 2)
    c = RUN_CUTS[i]
    if i > 0 and abs(F - c) < MELT / 2:      # the first comes on a plain cut; the last gives way to the drop on one
        out = melt(i - 1, i, smooth((F - c + MELT / 2) / MELT))
    else:
        out = plate(i if F >= c else i - 1)
    return say(out, "gods", 1320, ["there be gods many,", "and lords many"])


# ── After the drop ───────────────────────────────────────────────────────

def icon_shot(F):
    k = max(n for n, s in enumerate(AFTER) if s[0] <= F)
    start, name, held, (dx, dy), width, z1, (r0, r1, low) = AFTER[k]
    stop = AFTER[k + 1][0] if k + 1 < len(AFTER) else END
    im = rgb(name)
    if held == "eyes":
        (lx, ly), (rx, ry) = PICS[name]["eyes"]
        sx, sy = (lx + rx) / 2, (ly + ry) / 2
    else:
        sx, sy = held[0] * im.shape[1], held[1] * im.shape[0]
    z = 1 + (z1 - 1) * (F - start) / (stop - start)  # one slow even move, toward Him
    # The icon whole and unaltered, larger than the frame, held by Him; its light pooled on Him and the rest let fall.
    out = place(im, width / im.shape[1] * z, sx, sy, dx, dy) * pool(dx, dy, r0, r1, low)
    if name in LINES:
        key, y, size = LINES[name]
        out = say(out, key, y, size=size)
    return out


def the_end(F):
    """Black and Purify's mark, still."""
    def make():
        m = np.asarray(Image.open(f"{HOME}/mark.png").convert("RGBA"), dtype=np.float32) / 255
        fig = place(m, 2.0, m.shape[1] / 2, m.shape[0] / 2, W / 2, 820)
        out = fig[..., :3] * fig[..., 3:4]
        t = text_mask(["Purify"], 1250, 76, 600)
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
BOARD = [("1-the-light", 60), ("2-run-first", 133), ("3-run-melt", 141), ("4-run-sharp", 165), ("5-before-the-drop", 670), ("6-the-drop", 690),
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
        # The run's gods so far, each as it stands in the film: one sheet, two across.
        cells = [Image.fromarray((np.clip(say(plate(i), "gods", 1320, ["there be gods many,", "and lords many"]), 0, 1) * 255).astype(np.uint8)).resize((360, 640), Image.LANCZOS) for i in list(range(len(RUN) - 1)) + ([len(RUN_CUTS) - 1] if (len(RUN) - 1) % 2 else [])]
        sheet = Image.new("RGB", (720, 640 * ((len(cells) + 1) // 2)), (0, 0, 0))
        for n, c in enumerate(cells):
            sheet.paste(c, (360 * (n % 2), 640 * (n // 2)))
        sheet.save(f"{sys.argv[4]}/4b-the-gods.jpg", quality=88)
