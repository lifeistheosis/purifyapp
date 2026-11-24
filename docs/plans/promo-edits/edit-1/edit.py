#!/usr/bin/env python3
"""Promo edit 1, the Light: the stage and the film (the brief is ../edit-1-the-light.md; RECORD.md has its story).

The film is 1080 by 1920 at 60 frames a second and 1199 frames long, the reference's own length and clock, so a
frame here is the same frame there. Every change of picture is the reference's, measured frame by frame: when it
starts, how many frames it takes, and what kind it is (a melt, a whip, a fade, a blur, a plain cut). Every
word is Scripture, held to data/bible each run. No picture is redrawn: each is placed whole, larger than the frame,
with its light pooled; a change of picture works on whole pictures only.

  python3 docs/plans/promo-edits/edit-1/edit.py <repo root> <work dir> still <frame> <out.png>
  python3 docs/plans/promo-edits/edit-1/edit.py <repo root> <work dir> board <out dir>     # stills, and a sheet of the gods
  python3 docs/plans/promo-edits/edit-1/edit.py <repo root> <work dir> render <out dir> [the reference's file, for its sound]
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
PICS = json.load(open(os.path.join(HERE, "pictures.json")))["pictures"]
W, H, FPS, TOTAL = 1080, 1920, 60, 1199

# ── The reference, measured (RECORD.md) ──────────────────────────────────
# Where each picture of its run begins (the frame of greatest change), and the frames each change takes.
RUN_CUTS = [126, 141, 156, 174, 189, 206, 223, 239, 257, 273, 291, 307, 324, 342, 360, 377, 394, 403, 414, 421, 431, 439, 448, 455,
            464, 472, 483, 489, 498, 505, 514, 523, 535, 569, 597, 631]
RUN_CHANGES = [(125, 127), (140, 142), (156, 159), (172, 176), (189, 193), (204, 206), (221, 226), (237, 241), (255, 260), (271, 274),
               (289, 294), (305, 309), (322, 326), (340, 345), (358, 363), (376, 380), (393, 398), (401, 406), (411, 415), (419, 424),
               (429, 432), (437, 440), (446, 450), (453, 458), (462, 467), (470, 472), (480, 484), (487, 492), (495, 500), (503, 508),
               (512, 517), (521, 526), (534, 536), (568, 571), (594, 599), (628, 632)]
# Its kinds: the held picture gives way in a soft blur; its ink faces melt one into the next; its last three changes
# before the drop are a whip down, a whip across and a pull from the middle; ours are whips all three, since a pull
# from the middle draws lines of light out of a bright picture, and the house keeps no rays. Its last four shots
# move: nearer, nearer, farther, and the last one farther still (shares of its size a second).
RUN_KINDS = ["blur"] + ["melt"] * 32 + ["whip-v", "whip-h", "whip-v"]
PUSH = {32: 0.076, 33: 0.019, 34: -0.041, 35: -0.139}
DROP = (675, 680)  # the bass comes in at 671; the reference fades from light to dark over these frames, and so do we
END = 1144         # its last cut; ours goes to black and the mark, which fades where the reference fades (1177 to 1183)

# ── The run: 36 pictures, no picture twice (his word, 2026-11-24) ────────
# Each is a painting in colour, held on the face of its god or pagan, the face at the middle of the screen. The
# order is each picture's "run" in pictures.json; the last is the Demiurge, its disc of light set on His halo.
FACE_AT = (540, 860)          # where the middle of the face stands: the middle of the screen, a little above it for the words
FACE_WIDE, MAX_UP = 540, 2.6  # how wide the face stands, unless that would show the file at more than MAX_UP its size
RUN = [n for _, n in sorted((p["run"], n) for n, p in PICS.items() if "run" in p)]
LAST = "urizen"
RUN_POOL = (360, 1250, 0.24)  # the light pooled on the face, the rest let fall
LINE_ASK, LINE_GODS = ("ask", 800, None, 60), ("gods", 1320, ("there be gods many,", "and lords many"), 60)
LINE_ANSWER, LINE_LIGHT = ("answer", 1390, None, 72), ("light", 1400, None, 60)

# ── After the drop: icons of Him on the reference's own changes ──────────
# (first frame, the change into it (first frame, last frame, kind; None is a plain cut), icon, the point held ("eyes" or
#  shares of its width and height), where that point stands, its size ("wide": the icon's width on the screen; "eyes":
#  how far apart His eyes stand), the push by the shot's end, the pooled light, its line). An icon moves only whole.
SINAI_AT, SINAI_WIDE = (540, 700), 1500
SOFT = (340, 1200, 0.20)
ICONS = [(675, DROP + ("fade",), "sinai", "eyes", SINAI_AT, ("wide", SINAI_WIDE), 1.04, (330, 1150, 0.16), LINE_ANSWER),
         (706, (704, 706, "fade"), "sinai", "eyes", (540, 600), ("wide", 1180), 1.03, (300, 1250, 0.22), LINE_ANSWER),
         (739, (738, 739, "fade"), "transfig", (0.5, 0.215), (540, 418), ("wide", 1400), 1.04, (380, 1500, 0.34), None),
         (772, (765, 780, "whip-h"), "zlatye", "eyes", (540, 700), ("eyes", 390), 1.02, SOFT, None),
         (790, (788, 790, "blur"), "ushakov", "eyes", (540, 700), ("eyes", 330), 1.02, SOFT, None),
         (807, (806, 807, "blur"), "rublev", "eyes", (540, 700), ("eyes", 380), 1.04, SOFT, None),
         (841, (836, 840, "out"), "vysotsky", "eyes", (540, 700), ("eyes", 170), 1.03, SOFT, None),
         (874, (869, 873, "out"), "pantocrator19", "eyes", (540, 700), ("eyes", 260), 1.04, SOFT, None),
         (918, None, "golden", "eyes", (540, 700), ("eyes", 240), 1.02, SOFT, None),
         (930, None, "yaroe", "eyes", (540, 780), ("eyes", 250), 1.02, SOFT, None),
         (946, (940, 945, "stutter"), "ushakov", "eyes", (540, 760), ("eyes", 460), 1.03, SOFT, None),
         (977, (974, 976, "out"), "zlatye", "eyes", (540, 760), ("eyes", 520), 1.03, SOFT, None),
         (1013, (1008, 1012, "out"), "novgorod", "eyes", (540, 560), ("wide", 1750), 1.05, (420, 1060, 0.04), LINE_LIGHT),
         (1112, None, "sinai", "eyes", (540, 760), ("eyes", 380), 1.03, (330, 1150, 0.16), None)]

# Every shot: (kind, what, its first frame, its last, its line), and the change into it.
SHOTS, CHANGES = [("light", None, 0, RUN_CUTS[0], LINE_ASK)], [None]
for i in range(36):
    SHOTS.append(("god", i, RUN_CUTS[i], RUN_CUTS[i + 1] if i < 35 else DROP[0], LINE_GODS))
    CHANGES.append(RUN_CHANGES[i] + (RUN_KINDS[i],))
for n, row in enumerate(ICONS):
    SHOTS.append(("icon", n, row[0], ICONS[n + 1][0] if n + 1 < len(ICONS) else END, row[8]))
    CHANGES.append(row[1])
SHOTS.append(("end", None, END, TOTAL, None))
CHANGES.append(None)
BEGINS = [0] + [(c[0] if c else s[2]) for s, c in zip(SHOTS[1:], CHANGES[1:])]
assert BEGINS == sorted(BEGINS) and len(RUN) == 35, (len(RUN), BEGINS)

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


def cover(shape, k, sx, sy, dx, dy):
    """A picture always covers the frame: the held point gives way a little before an edge of the canvas shows."""
    ih, iw = shape[:2]
    return min(max(dx, W - k * (iw - sx)), k * sx), min(max(dy, H - k * (ih - sy)), k * sy)


def edge(shape, k, sx, sy, dx, dy, soft=240):
    """Where an edge of the canvas would show in the frame, the picture is let fall to dark before it: a soft
    shade, never a line."""
    ih, iw = shape[:2]
    yy, xx = grid()
    x0, y0 = dx - k * sx, dy - k * sy
    m = np.ones((H, W), np.float32)
    for near, far in ((yy - y0, y0 > 0), (y0 + k * ih - yy, y0 + k * ih < H), (xx - x0, x0 > 0), (x0 + k * iw - xx, x0 + k * iw < W)):
        if far:
            m *= np.clip(near / soft, 0, 1)
    return (m * m * (3 - 2 * m))[..., None]


def shrunk(name, k):
    """A picture shown far smaller than its file is made smaller once, by area, so its fine lines do not shimmer."""
    if k >= 0.6:
        return rgb(name), 1.0
    f = round(k / 0.9, 3)
    return once(("small", name, f), lambda: cv2.resize(rgb(name), None, fx=f, fy=f, interpolation=cv2.INTER_AREA)), f


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


def write(img, line, share=1.0):
    """A line and, smaller under it, where it is found: plain white, still and sharp through every change of
    picture, there from its shot's first frame to its last. No glow. `share` is how much of it has come or is left."""
    if line is None or share <= 0:
        return img
    key, cy, lines, size = line
    text, where, _ = words()[key]
    lines = list(lines or [text])
    assert " ".join(lines) == text
    m = text_mask(lines, cy, size) * share
    r = text_mask([where], cy + (len(lines) - 1) * size * 0.61 + size * 1.25, 32, 500) * share
    return img * (1 - m) * (1 - 0.8 * r) + 0.97 * m + 0.8 * r


# ── The shots ────────────────────────────────────────────────────────────

def the_light(F):
    """The road at night, and a light from heaven round about him (Acts 9:3). No lamp is seen: the light comes down
    from above the frame and lies on the ground about Saul as one soft pool; the dark between holds his words. It
    grows a little, evenly, through the shot. The light is ours: none of the painting's sky is kept. No beams."""
    grow = 1 + 0.07 * F / RUN_CUTS[0]
    yy, xx = grid()

    def figure():
        s = np.asarray(Image.open(f"{HOME}/saul.png").convert("RGBA"), dtype=np.float32) / 255
        k = 940 / s.shape[1]
        fig = place(s, k, s.shape[1] / 2, s.shape[0], W / 2, 1540)
        # Where he lies the road is in his shade: under him only, never a dark edge about him.
        shade = cv2.GaussianBlur(place(s[..., 3], k, s.shape[1] / 2, s.shape[0], W / 2, 1576), (0, 0), 14) * np.clip((yy - 1400) / 110, 0, 1)
        # He is lit from above: his hand, his face and his shoulder take the light, and his legs take less.
        hx, hy = W / 2 + (0.36 - 0.5) * 940, 1540 - (1 - 0.30) * s.shape[0] * k
        return fig[..., :3] * pool(hx + 80, hy - 60, 240, 900, 0.30), fig[..., 3:4], shade
    lit, a, shade = once("saul", figure)
    d = np.hypot((xx - W / 2) / 1.2, yy + 150) / grow                      # from above: the foot of a wide light
    above = 1.0 * np.exp(-(d / 330) ** 2) + 0.22 * np.exp(-(d / 760) ** 2)
    g = np.hypot((xx - W / 2 + 40) / (600 * grow), (yy - 1455) / (190 * grow))  # on the road: the same light, wide and low
    road = (0.72 * np.exp(-g ** 2) + 0.12 * np.exp(-(g / 1.9) ** 2)) * (1 - 0.8 * shade)
    out = np.clip(above + road, 0, 1)[..., None] * np.float32([1.0, 0.99, 0.975])
    return out * (1 - a) + lit * a


def god(i, F):
    """A painting whole and unaltered, larger than the frame, held on the face, its light pooled there. The run's
    last four move as the reference's do; the rest stand still, as its ink faces do."""
    name = RUN[i] if i < 35 else LAST
    _, _, t0, t1, _ = SHOTS[1 + i]
    rate = PUSH.get(i, 0.0)
    z = 1.0 if not rate else 1 + rate * (min(max(F, t0 - 8), t1) - (t0 if rate > 0 else t1)) / FPS

    def make():
        im, p = rgb(name), PICS[name]
        if name == LAST:  # its disc of light on His halo, as the halo stands in the shot after the drop
            (ax, ay), (bx, by) = PICS["sinai"]["eyes"]
            k0 = SINAI_WIDE / rgb("sinai").shape[1]
            hx, hy, hr = PICS["sinai"]["halo"]
            sx, sy, r = p["disc"]
            k = hr * k0 / r
            dx, dy = SINAI_AT[0] + (hx - (ax + bx) / 2) * k0, SINAI_AT[1] + (hy - (ay + by) / 2) * k0
        else:  # the face: its middle and its width in the file, found by find/faces.py or marked by hand
            sx, sy, fw = p["face"]
            k, (dx, dy) = max(min(FACE_WIDE / fw, MAX_UP), W / im.shape[1], H / im.shape[0]), FACE_AT
        k *= z
        if name == LAST:
            dx, dy = cover(im.shape, k, sx, sy, dx, dy)
        out = place(im, k, sx, sy, dx, dy)
        if name != LAST:  # the face keeps its place even where that brings an edge of the canvas into the frame
            out = out * edge(im.shape, k, sx, sy, dx, dy)
        if k > 1.2:  # a painting shown larger than its file is made a little crisper; nothing in it is drawn
            out = np.clip(out + 0.6 * (out - cv2.GaussianBlur(out, (0, 0), 2.2 * k)), 0, 1)
        out = out * pool(dx, dy, *RUN_POOL)
        yy, _ = grid()
        foot = np.clip((yy - 1060) / 380, 0, 1)
        return out * (1 - 0.55 * foot * foot * (3 - 2 * foot))[..., None]  # the foot let fall further, where the words stand
    if rate:
        return make()
    out = once(("god", i), make)
    _cache.pop(("rgb", name), None)  # a still picture's file is not needed again
    return out


def icon(n, F):
    start, _, name, held, at, (kind, size), z1, light, _ = ICONS[n]
    stop = SHOTS[37 + n][3]
    full = rgb(name)
    if held == "eyes":
        (lx, ly), (rx, ry) = PICS[name]["eyes"]
        sx, sy = (lx + rx) / 2, (ly + ry) / 2
    else:
        sx, sy = held[0] * full.shape[1], held[1] * full.shape[0]
    k0 = size / math.hypot(rx - lx, ry - ly) if kind == "eyes" else size / full.shape[1]
    z = 1 + (z1 - 1) * min(1.0, max(0.0, (F - start) / (stop - start)))  # one slow even move, toward Him
    im, f = shrunk(name, k0)
    k = k0 * z / f
    dx, dy = cover(im.shape, k, sx * f, sy * f, *at)
    return place(im, k, sx * f, sy * f, dx, dy) * pool(dx, dy, *light)


def the_end(F):
    """Black and Purify's mark, still; it goes to black where the reference does. No white frame."""
    def make():
        m = np.asarray(Image.open(f"{HOME}/mark.png").convert("RGBA"), dtype=np.float32) / 255
        fig = place(m, 2.0, m.shape[1] / 2, m.shape[0] / 2, W / 2, 820)
        t = text_mask(["Purify"], 1250, 76, 600)
        return fig[..., :3] * fig[..., 3:4] * (1 - t) + 0.97 * t
    return once("end", make) * (1 - smooth((F - 1176) / 7))


def draw(k, F):
    kind, what = SHOTS[k][:2]
    return the_light(F) if kind == "light" else god(what, F) if kind == "god" else icon(what, F) if kind == "icon" else the_end(F)


# ── The changes of picture: the reference's kinds, on whole pictures ─────

def whip(img, n, down):
    """A camera thrown down or across: the whole picture drawn out along one line. One smooth blur, never beams."""
    n = int(n) | 1
    return img if n < 3 else cv2.blur(img, (1, n) if down else (n, 1), borderType=cv2.BORDER_REFLECT)


def melt(A, B, u, k):
    """One picture melting into the next, as the Christ edit's faces do: each whole picture follows the flow part of
    the way, laid over the other, soft in its middle."""
    def flow():
        small = lambda p: cv2.GaussianBlur(cv2.resize(cv2.cvtColor((np.clip(p, 0, 1) * 255).astype(np.uint8), cv2.COLOR_RGB2GRAY), (270, 480), interpolation=cv2.INTER_AREA), (0, 0), 2)
        f = cv2.calcOpticalFlowFarneback(small(A), small(B), None, 0.5, 4, 41, 4, 7, 1.5, 0)
        return cv2.resize(cv2.GaussianBlur(f, (0, 0), 6), (W, H), interpolation=cv2.INTER_CUBIC) * 4.0 * 1.5
    f = once(("flow", k), flow)
    yy, xx = grid()
    a = cv2.remap(A, xx - u * f[..., 0], yy - u * f[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    b = cv2.remap(B, xx + (1 - u) * f[..., 0], yy + (1 - u) * f[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    return cv2.GaussianBlur(a * (1 - u) + b * u, (0, 0), 1.0 + 5.0 * math.sin(math.pi * u))


def change(kind, A, B, u, k):
    """The picture at share u of a change from A to B, and how much of B's line has come."""
    bell, cross = math.sin(math.pi * u), smooth((u - 0.3) / 0.4)
    if kind == "fade":
        return A * (1 - smooth(u)) + B * smooth(u), smooth(u)
    if kind == "melt":
        return melt(A, B, smooth(u), k), smooth(u)
    X = A * (1 - cross) + B * cross
    if kind == "blur":
        return cv2.GaussianBlur(X, (0, 0), 0.5 + 13 * bell), cross
    assert kind in ("whip-v", "whip-h"), kind
    return whip(X, 320 * bell, kind == "whip-v"), cross


def frame(F):
    words()
    k = max(i for i, b in enumerate(BEGINS) if b <= F)
    c, line = CHANGES[k], SHOTS[k][4]
    if not c or F > c[1]:
        return write(draw(k, F), line)
    a, b, kind = c
    u, before = (F - a + 1) / (b - a + 2), SHOTS[k - 1][4]
    A = draw(k - 1, F)
    if kind == "out":       # the picture goes soft and a little dark, then a plain cut
        return write(cv2.GaussianBlur(A, (0, 0), 0.5 + 26 * u * u) * (1 - 0.35 * u), before)
    B = draw(k, F)
    if kind == "stutter":   # the next picture shows for two frames, the last comes back for two, then one gives way
        s = (1.0, 1.0, 0.0, 0.0, 0.4, 0.8)[F - a]
        return write(write(A * (1 - s) + B * s, before, 1 - s), line, s)
    X, s = change(kind, A, B, u, k)
    return write(X, line) if before == line else write(write(X, before, 1 - s), line, s)


def u8(img):
    return (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8)


def save(F, path, width=W):
    im = Image.fromarray(u8(frame(F)), "RGB")
    if width != W:
        im = im.resize((width, round(H * width / W)), Image.LANCZOS)
    im.save(path, quality=88)


def render(out, ref=None):
    """Every frame, straight into the encoder: the silent master, and with the reference's file a preview with its
    sound under the same picture. The preview is for the owner alone, never for posting, and never in the repository."""
    os.makedirs(out, exist_ok=True)
    master = f"{out}/purify-the-light.mp4"
    enc = subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-an",
                            "-vf", "scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", "15",
                            "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv", "-movflags", "+faststart", master],
                           stdin=subprocess.PIPE)
    for F in range(TOTAL):
        enc.stdin.write(u8(frame(F)).tobytes())
        if F % 150 == 0:
            print(f"  frame {F}", flush=True)
    enc.stdin.close()
    assert enc.wait() == 0, "the encoder failed"
    if ref:
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", master, "-i", ref, "-map", "0:v", "-map", "1:a", "-c", "copy", "-shortest", "-movflags", "+faststart",
                        f"{out}/purify-the-light-PREVIEW-not-for-posting.mp4"], check=True)


# Stills for the film's page: one moment of each part, and of each kind of change.
BOARD = [("1-the-light", 60), ("2-run-first", 133), ("3-run-melt", 174), ("4-whip", 596), ("5-before-the-drop", 668), ("5b-the-change", 677),
         ("6-the-drop", 692), ("7-transfiguration", 752), ("7b-the-whip", 772), ("8-light-of-the-world", 1060), ("9-the-end", 1160)]

if __name__ == "__main__":
    cmd = sys.argv[3]
    if cmd == "still":
        save(int(sys.argv[4]), sys.argv[5])
    elif cmd == "render":
        render(sys.argv[4], sys.argv[5] if len(sys.argv) > 5 else None)
    elif cmd == "board":
        os.makedirs(sys.argv[4], exist_ok=True)
        for name, F in BOARD:
            save(F, f"{sys.argv[4]}/{name}.jpg", 720)
            print(f"  {name}: frame {F}, {F / FPS:.2f} s")
        # Every picture of the run as it stands in the film, in order: one sheet, four across.
        cells = [Image.fromarray(u8(write(god(i, SHOTS[1 + i][3]), LINE_GODS))).resize((180, 320), Image.LANCZOS) for i in range(36)]
        sheet = Image.new("RGB", (720, 320 * 9), (0, 0, 0))
        for n, c in enumerate(cells):
            sheet.paste(c, (180 * (n % 4), 320 * (n // 4)))
        sheet.save(f"{sys.argv[4]}/4b-the-gods.jpg", quality=88)
