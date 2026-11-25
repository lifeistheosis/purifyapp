#!/usr/bin/env python3
"""The Cradle in icons: the whisper's editing on eight great feasts by one living hand, with its effects.

His words (2026-11-25): "better clear high quality easter icons (nativity, etc)", then "no HIGH quality recent ones"
and, with a modern Greek Resurrection, "like this"; on storyboard 2 (icons-storyboard.md): "continue and add a lot of
effects". The icons are Nikolaos Galanopoulos's (Greece, our day), from the print files Athonite USA sells.

The story, on the song's shape: the Annunciation; the Nativity (the Mother, the manger, then the Magi at the break);
the Meeting into the pause; on the drop a flash of white and the Mother and the Child close, as Simeon foretells the
sword (Luke 2:35), then the Meeting widening; a whip into the Baptism; a whip into the Raising of Lazarus, the world
going dark round him, "LAZARUS, COME FORTH" a word a beat into the song's stop; the colour leaves with the stop: the
Cross in black and white, the world going dark round it in the silence, "IT IS FINISHED"; on the beat the music
returns, a flash of white and the colour back on the Resurrection; a whip up into the Ascension, the Mother looking
into the lens; the angels, black between them; the cross and the name.

The effects, each within the house rules (CLAUDE.md): cuts on every beat and every hi-hat; the whisper's crush and
develop between feasts; a figure cut out whole (icon_masks.py), kept lit while the world round it goes dark, never
moved off its own place and never redrawn; split screens that build a strip a hat on the long hi-hat rolls; whips at
a steady speed, blurred by their speed; two flashes of white; the colour leaving and returning; two verses (John
11:43, John 19:30, King James) cut in a word a beat, never scaled or moved; black frames between the angels, once a
beat; grain. Every move runs at a steady speed and nothing settles. No rays: the Transfiguration is left out, Christ's
glory in the Ascension is never in frame, and the heaven at the top of three feasts stays out of frame.

  python -I -B docs/plans/promo-edits/edit-3/icons.py <work> check | beats [a b] | sheet [b<k> ...] | frame <s> | render
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import cv2
from PIL import Image, ImageDraw
import core as C
from core import BEATS, GAPS, FPS, first, beat_end

NAME = "the-cradle-v4-icons"
W, H = C.W, C.H

# ---------------------------------------------------------------- the icons and their cut-outs
ICONS = {"ann": "annunciation", "nat": "nativity", "meet": "meeting", "bap": "baptism", "laz": "lazarus",
         "cru": "crucifixion", "res": "resurrection", "asc": "ascension"}
for _k, _n in ICONS.items():
    C.add_source(_k, f"modern/athonite/{_n}.jpg", "rgb")
_SIZE = {"laz": (3307, 2362)}
for _k in ICONS:
    _w, _h = _SIZE.get(_k, (2362, 3307))
    C.PLATES[_k] = (44, 44, _w - 44, _h - 44)          # inside the print's red border
MASKS = {"lazarus": "laz", "cross": "cru", "angel_left": "asc", "angel_right": "asc"}
for _m, _k in MASKS.items():
    C.add_source("m_" + _m, f"modern/masks/{_m}.png", "rgb", plate=C.PLATES[_k])

# Moves: each shot drifts at a steady speed, never still: share of the crop's width over the beat.
MOVES = {"in": (0, 0, -0.08), "out": (0, 0, 0.08), "l": (-0.06, 0, -0.03), "r": (0.06, 0, -0.03),
         "u": (0, -0.06, -0.03), "d": (0, 0.06, -0.03), "in+": (0, 0, -0.16), "out+": (0, 0, 0.14)}

# (beat, icon, (centre x, centre y, crop width), move, note, effects)
#   iso=<mask>: the figure stays lit while the world round it goes dark (to the share given by dark=)
#   mono: black and white;  words=<line>: the verse so far;  split=<set>: strips built on the beat's hi-hat roll
SHOTS = [
    # I. The Annunciation (Luke 1:28)
    (0, "ann", (742, 1212, 600), "in", "Gabriel's face", {}),
    (1, "ann", (1912, 1180, 600), "in", "the Mother hears", {}),
    (2, "ann", (1450, 1600, 620), "r", "his hand: hail", {}),
    (3, "ann", (1990, 1850, 600), "u", "her hand and the thread", {}),
    (4, "ann", (1200, 1992, 1430), "in", "the angel and the Mother (clear of the ray above)", {"split": "ann"}),
    (5, "ann", (1880, 2150, 1000), "u", "the Mother on her seat", {}),
    (6, "ann", (1181, 1992, 1430), "in", "the whole below the ray, crushed", {}),
    # II. The Nativity: the Mother, the manger, the Child
    (7, "nat", (880, 1720, 480), "in", "the Mother's face (clear of the star)", {}),
    (8, "nat", (1506, 2112, 520), "in", "the Child in the manger", {}),
    (9, "nat", (1620, 1800, 700), "l", "the ox and the ass (Isaiah 1:3)", {}),
    (10, "nat", (540, 1000, 860), "d", "the angels above", {}),
    (11, "nat", (2000, 860, 700), "r", "an angel to the shepherds", {}),
    (12, "nat", (2094, 1060, 700), "u", "the shepherds look up", {}),
    (13, "nat", (1200, 2060, 900), "in", "the Mother, the manger, the Child", {}),
    (14, "nat", (1500, 1650, 560), "in+", "gap: into the dark of the cave", {}),
    # III. The break: the Magi (Matthew 2:11)
    (15, "nat", (1750, 2300, 900), "in", "the Magi bring their gifts", {}),
    (16, "nat", (1470, 2450, 600), "r", "the old king", {}),
    (17, "nat", (1892, 2204, 600), "l", "the young king", {}),
    (18, "nat", (2057, 1990, 600), "u", "the third king", {}),
    (19, "nat", (441, 2388, 700), "d", "Joseph", {}),
    (20, "nat", (1506, 2112, 700), "in", "the Child again", {"split": "magi"}),
    (21, "nat", (560, 900, 760), "r", "the angels' faces", {}),
    (22, "nat", (1181, 2290, 1100), "in", "the whole below the star, crushed", {}),
    # IV. The Meeting in the Temple (Luke 2:28), into the pause
    (23, "meet", (850, 1650, 1000), "in", "Simeon's veiled hands", {}),
    (24, "meet", (643, 1378, 520), "in", "Simeon's face", {}),
    (25, "meet", (992, 1600, 520), "r", "the Child", {}),
    (26, "meet", (1570, 1650, 700), "u", "Joseph and the two doves", {}),
    (27, "meet", (2094, 1550, 700), "l", "Anna the prophetess", {}),
    (28, "meet", (650, 1150, 900), "d", "the Temple", {}),
    (29, "meet", (1060, 1560, 700), "in", "the Mother and the Child", {}),
    (30, "meet", (1181, 1700, 1800), "out", "the whole, crushed into the pause", {}),
    # V. The drop: a flash, the Mother and the Child close (Luke 2:35), then the Meeting widening
    (31, "meet", (1150, 1500, 480), "in", "the Mother and the Child, close", {}),
    (32, "meet", (992, 1580, 430), "l", "the Child's face", {}),
    (33, "meet", (643, 1400, 560), "r", "Simeon", {}),
    (34, "meet", (1146, 1460, 450), "in", "the Mother's face", {}),
    (35, "meet", (820, 1720, 600), "u", "his hands under the veil", {}),
    (36, "meet", (900, 1600, 1000), "out", "the Mother, the Child, Simeon", {"split": "meet"}),
    (37, "meet", (2094, 1450, 560), "l", "Anna", {}),
    (38, "meet", (1181, 1700, 1800), "out", "gap: the whole", {}),
    # VI. The Baptism (a whip in)
    (39, "bap", (900, 2000, 1100), "in", "Christ in the Jordan", {}),
    (40, "bap", (850, 1560, 560), "r", "the Forerunner's hand on His head", {}),
    (41, "bap", (698, 1359, 560), "l", "the Forerunner", {}),
    (42, "bap", (1650, 1700, 1000), "out", "the angels bow", {"split": "bap"}),
    (43, "bap", (937, 1653, 500), "in", "His face", {}),
    (44, "bap", (1500, 2750, 640), "r", "the sea that fled (Psalm 114:3)", {}),
    (45, "bap", (900, 2100, 800), "u", "Christ, the whole figure", {}),
    (46, "bap", (1181, 2030, 1400), "out", "gap: the whole", {}),
    # VII. The Raising of Lazarus (a whip in); the world goes dark round him; into the stop (John 11:43)
    (47, "laz", (1400, 1200, 900), "in", "Christ calls", {}),
    (48, "laz", (2830, 1000, 800), "in", "Lazarus stands", {"iso": "lazarus", "dark": 0.85}),
    (49, "laz", (2425, 960, 600), "l", "the young man at the grave clothes", {}),
    (50, "laz", (2050, 1750, 900), "r", "Martha and Mary at His feet", {}),
    (51, "laz", (2860, 760, 640), "in", "Lazarus", {"iso": "lazarus", "dark": 0.85, "words": "LAZARUS,"}),
    (52, "laz", (1433, 1000, 560), "in", "Christ's face", {"words": "LAZARUS, COME"}),
    (53, "laz", (2866, 560, 460), "in", "Lazarus's face; the song stops", {"iso": "lazarus", "dark": 0.85,
                                                                          "words": "LAZARUS, COME FORTH."}),
    (54, "laz", (2830, 1000, 820), "in", "the stop: Lazarus alone", {"iso": "lazarus", "dark": 1.0,
                                                                   "words": "LAZARUS, COME FORTH.", "cite": "JOHN 11:43"}),
    # VIII. The Cross in black and white; the silence (John 19:30)
    (55, "cru", (1180, 1450, 1750), "in", "the Cross", {"mono": True}),
    (56, "cru", (1139, 1150, 700), "in", "His head", {"mono": True}),
    (57, "cru", (661, 1450, 600), "u", "the Mother looks up", {"mono": True}),
    (58, "cru", (1708, 1420, 600), "l", "John", {"mono": True}),
    (59, "cru", (2160, 1150, 640), "r", "the centurion", {"mono": True}),
    (60, "cru", (1180, 1400, 1780), "in", "the Cross alone, into the silence", {"mono": True, "iso": "cross", "dark": 0.9,
                                                                             "split": "cru"}),
    (61, "cru", (1139, 950, 480), "in", "silence: His face out of the dark", {"mono": True, "words": "IT IS FINISHED."}),
    (62, "cru", (1180, 1400, 1780), "in", "silence: the Cross alone", {"mono": True, "iso": "cross", "dark": 1.0,
                                                                     "words": "IT IS FINISHED.", "cite": "JOHN 19:30"}),
    # IX. The Resurrection: a flash, the colour back
    (63, "res", (1181, 1653, 1800), "in", "the gates of Hades broken", {}),
    (64, "res", (1170, 1560, 560), "in", "His face", {}),
    (65, "res", (420, 2050, 700), "r", "Adam", {}),
    (66, "res", (1200, 2000, 1300), "out", "He raises Adam and Eve", {}),
    (67, "res", (1950, 2100, 700), "l", "Eve", {}),
    (68, "res", (1181, 3000, 1100), "u", "the gates broken, Death bound", {}),
    (69, "res", (420, 1750, 800), "r", "the Forerunner and the righteous", {}),
    (70, "res", (1181, 1653, 1800), "out", "gap: the whole", {}),
    (71, "res", (700, 2100, 900), "in", "Adam's hand in His", {}),
    (72, "res", (1650, 2050, 700), "l", "Eve's hand in His", {}),
    (73, "res", (2050, 1750, 800), "r", "Abel and the righteous", {}),
    (74, "res", (1200, 2200, 1500), "out", "Christ between them", {}),
    (75, "res", (650, 3060, 700), "d", "Death bound", {}),
    (76, "res", (1200, 2100, 1100), "in", "Christ, the whole figure", {}),
    (77, "res", (1170, 1560, 480), "in", "His face", {}),
    (78, "res", (1181, 1653, 1800), "out", "gap: the whole", {}),
    # X. The Ascension (a whip up); the Mother looks into the lens (Acts 1:14)
    (79, "asc", (1181, 2300, 1100), "u", "the apostles look up", {}),
    (80, "asc", (1212, 2200, 760), "in", "the Mother among the angels", {}),
    (81, "asc", (735, 2250, 620), "r", "Peter", {}),
    (82, "asc", (1212, 2140, 480), "in", "the Mother looks into the lens", {}),
    (83, "asc", (2020, 2100, 640), "l", "an apostle looks up", {}),
    (84, "asc", (1200, 2000, 800), "in", "the angels in white", {}),
    (85, "asc", (400, 950, 640), "r", "the angel who bears the glory", {"iso": "angel_left", "dark": 0.6}),
    (86, "asc", (1212, 2140, 440), "in", "gap: the Mother, closer", {}),
    # XI. The angels, black between them, once a beat; then the card
    (87, "asc", (1920, 900, 640), "l", "an angel alone", {"iso": "angel_right", "dark": 1.0}),
    (88, "asc", (400, 950, 640), "r", "the other angel", {"iso": "angel_left", "dark": 0.8}),
    (89, "ann", (742, 1300, 700), "in", "Gabriel", {}),
    (90, "nat", (540, 1000, 860), "d", "the Nativity's angels", {}),
    (91, "bap", (1650, 1620, 900), "l", "the Baptism's angels", {}),
    (92, "nat", (1985, 820, 640), "in", "the angel to the shepherds", {}),
    (93, None, None, None, "the card: the cross, and the name typed", {}),
]
assert [s[0] for s in SHOTS] == list(range(len(BEATS))), "one shot for every beat, in order"

# Split screens on the long hi-hat rolls: three strips, one more on each hat; from the fourth hat the strips change
# to the second set. (icon, centre x, centre y, crop width) for each strip.
SPLITS = {
    "ann": ([("ann", 742, 1230, 330), ("ann", 1912, 1200, 330), ("ann", 1490, 1600, 330)],
            [("ann", 330, 1000, 380), ("ann", 1990, 1720, 330), ("ann", 1010, 2300, 330)]),
    "magi": ([("nat", 1470, 2440, 300), ("nat", 1892, 2200, 300), ("nat", 2057, 1990, 300)],
             [("nat", 1506, 2112, 330), ("nat", 937, 1580, 330), ("nat", 441, 2400, 330)]),
    "meet": ([("meet", 643, 1400, 300), ("meet", 992, 1590, 280), ("meet", 1146, 1470, 280)],
             [("meet", 1580, 1460, 300), ("meet", 2094, 1440, 300), ("meet", 820, 1720, 330)]),
    "bap": ([("bap", 1414, 1480, 300), ("bap", 1672, 1390, 300), ("bap", 1929, 1550, 300)],
            [("bap", 698, 1500, 330), ("bap", 937, 1660, 300), ("bap", 1506, 1800, 330)]),
    "cru": ([("cru", 360, 760, 300), ("cru", 1139, 840, 300), ("cru", 1960, 760, 300)],
            [("cru", 1212, 460, 330), ("cru", 1170, 2350, 330), ("cru", 1250, 1300, 330)]),
}
GUTTER = 8

FIRSTS = {0: (0.70, 0.45), 7: (0.70, 0.40), 15: (0.55, 0.35), 23: (0.55, 0.35), 55: (0.80, 0.40)}  # develops from the dark
CRUSHED = {6, 14, 22, 30}                     # a feast's last shot crushed into the dark
WHIPS = {39: (0.0, -1.0), 47: (-1.0, 0.0), 79: (0.0, 1.0)}     # the cut is a whip: the way the pictures move
                                                              # (down into the Jordan, across, up to the Ascension)
WHITES = (31, 63)                             # the drop and the music's return: two frames of white, falling away
ANGELS = range(87, 93)                        # each on its beat, black for the last nine frames before the next


def build():
    segs = []
    # it opens in the middle of a move: a fast pan up Gabriel to his face, at a steady speed, blurred by its speed
    segs.append(dict(t0=0.0, t1=BEATS[0], k=-1, key="ann", a=(560, 2700, 1100), b=(742, 1400, 760), fx={}, blur=True))
    for (k, key, crop, mv, note, fx) in SHOTS:
        t0, t1 = BEATS[k], beat_end(k)
        sg = dict(t0=t0, t1=t1, k=k, key=key, note=note, fx=fx)
        if key:
            cx, cy, w = crop
            dx, dy, dz = MOVES[mv]
            sg["a"] = (cx, cy, w)
            sg["b"] = (cx + dx * w, cy + dy * w, w * (1 + dz))
        if k == 30:
            sg["t1"] = 18.24
        segs.append(sg)
        if k == 30:
            segs.append(dict(t0=18.24, t1=BEATS[31], key=None, k=-2, fx={}, note="the pause before the drop"))
    return segs


SEGS = build()
CUTS = [s["t0"] for s in SEGS if s["t0"] > 0]


def shot_at(i):
    for sg in SEGS:
        if first(sg["t0"]) <= i < first(sg["t1"]):
            return sg
    return SEGS[-1]


def geo_at(sg, t):
    u = C.clamp01((t - sg["t0"]) / max(1e-3, sg["t1"] - sg["t0"]))
    (ax, ay, aw), (bx, by, bw) = sg["a"], sg["b"]
    return ax + (bx - ax) * u, ay + (by - ay) * u, aw + (bw - aw) * u


# ---------------------------------------------------------------- light
def crush_amount(sg, t):
    k = sg["k"]
    c = 0.0
    if k in FIRSTS:
        c0, dur = FIRSTS[k]
        c = max(c, c0 * (1 - C.clamp01((t - sg["t0"]) / dur)))
    if k in CRUSHED:                               # the blacks pulled down while the lights stay, to the cut
        u = C.clamp01((t - sg["t0"]) / max(1e-3, sg["t1"] - sg["t0"]))
        c = max(c, 0.80 * C.clamp01((u - 0.15) / 0.75))
    if k in GAPS and k not in CRUSHED and k not in (54, 62):
        c = max(c, 0.30)
    if k == 53 and t >= C.STOP[0]:                 # the song stops: the picture goes, the words stay
        c = 1.0
    if k == 60 and t >= C.SILENCE[0]:              # the silence: the world round the Cross goes, then the Cross dims
        c = max(c, 0.35 * C.clamp01((t - C.SILENCE[0]) / 0.30))
    if k == 61:                                    # in the silence His face comes out of the dark
        c = max(c, 0.75 - 0.75 * C.clamp01((t - sg["t0"]) / 0.40))
    return c


def white_at(i):
    v = 0.0
    for k in WHITES:
        d = i - first(BEATS[k])
        if 0 <= d < 2:
            v = 1.0
        elif d >= 2:
            v = max(v, float(np.exp(-(d - 1) / (0.07 * FPS))))
    return v


def iso_dark(sg, t):
    """How dark the world round a figure is: the figure's own light is kept; the rest goes at a steady speed."""
    fx = sg["fx"]
    if "iso" not in fx:
        return 0.0
    target = fx.get("dark", 0.85)
    if target >= 1.0:
        return 1.0
    return target * C.clamp01((t - sg["t0"]) / 0.30)


def look(x, mono=False):
    x = np.clip((x - 0.5) * 1.05 + 0.5, 0, 1)                       # a little more contrast; the colour is the icon's
    if mono:
        x = np.repeat(C.lum(x)[..., None], 3, axis=2)                 # neutral black and white: no sepia
    return x * C.vignette(W, H, 0.22, 0.62)[..., None]


# ---------------------------------------------------------------- pictures
def mask_view(name, geo, ow, oh):
    cx, cy, s = geo
    m, _ = C.view("m_" + name, cx, cy, s * ow, ow, oh)
    return m[..., :1]


def picture(sg, t, i, cx=None, cy=None, w=None):
    """The shot's picture at time t, with its figure kept lit if it has one (before the light of the film)."""
    if cx is None:
        cx, cy, w = geo_at(sg, t)
    img, geo = C.view(sg["key"], cx, cy, w, W, H)
    d = iso_dark(sg, t)
    if d > 0:
        m = mask_view(sg["fx"]["iso"], geo, W, H)
        world = np.zeros_like(img) if d >= 1.0 else C.crush_lights(img, d)
        img = img * m + world * (1 - m)
    return img


def strips(sg, t, i):
    """The split screen on a hi-hat roll: a strip more on each hat; from the fourth hat, the second set."""
    j = C.hats_in(sg["t0"], i)
    first_set, second_set = SPLITS[sg["fx"]["split"]]
    sw = (W - 2 * GUTTER) // 3
    canvas = np.zeros((H, W, 3), np.float32)
    shown = min(3, j) if j <= 3 else 3
    use = first_set if j <= 3 else second_set
    u = C.clamp01((t - sg["t0"]) / max(1e-3, sg["t1"] - sg["t0"]))
    for n in range(shown):
        key, cx, cy, w = use[n]
        img, _ = C.view(key, cx, cy - 0.04 * w * u, w * (1 - 0.06 * u), sw, H)   # each strip drifts up, steadily
        x0 = n * (sw + GUTTER)
        canvas[:, x0:x0 + sw] = img
    return canvas


def body(sg, t, i):
    """The frame before the film's own light: the picture, its hat inserts, its split screen."""
    fx = sg["fx"]
    k = sg["k"]
    j = C.hats_in(sg["t0"], i) if k >= 0 else 0
    if "split" in fx and j >= 1:
        return strips(sg, t, i)
    if j:                                          # a hi-hat: an insert of the same icon, to one side, then the other
        cx, cy, w = geo_at(sg, t)
        side = 0.10 if j % 2 else -0.10
        return picture(sg, t, i, cx + side * w, cy - 0.04 * w, w * (0.74 if j % 2 else 0.60))
    return picture(sg, t, i)


# ---------------------------------------------------------------- words
_words = {}
VERSES = [["LAZARUS,", "COME FORTH."], ["IT IS FINISHED."]]       # John 11:43 and John 19:30 (King James), in rows


def words_layer(line, cite=None):
    """The verse so far in DM Sans Bold capitals, centred in the lower third, the citation under it: an alpha mask.
    Each row is placed by its whole text, so a word that arrives never moves the words already there."""
    ck = (line, cite)
    if ck not in _words:
        rows = next(v for v in VERSES if v[0].split()[0] == line.split()[0])
        words = line.split()
        im = Image.new("L", (W, H), 0)
        d = ImageDraw.Draw(im)
        f = C.font(700, 86)
        y = 1360
        for r in rows:
            rw = r.split()
            n = 0
            while n < len(rw) and words and words[0] == rw[n]:
                words.pop(0)
                n += 1
            if n:
                d.text((W / 2 - d.textlength(r, font=f) / 2, y), " ".join(rw[:n]), font=f, fill=255)
            y += 104
        if cite:
            fc = C.font(500, 34)
            d.text((W / 2 - d.textlength(cite, font=fc) / 2, y + 22), cite, font=fc, fill=190)
        _words[ck] = np.array(im).astype(np.float32)[..., None] / 255
    return _words[ck]


_band = np.clip((np.arange(H, dtype=np.float32) - 1150) / 260, 0, 1)[:, None, None] * 0.55


def with_words(x, sg):
    """The words over the picture, the lower third darkened under them so they read on any icon."""
    fx = sg["fx"]
    if "words" not in fx:
        return x
    a = words_layer(fx["words"], fx.get("cite"))
    return (x * (1 - _band)) * (1 - a) + 0.97 * a


# ---------------------------------------------------------------- whips
WHIP = 4                                          # frames each side of the cut


def whip(img_out, img_in, i, cut_frame, direction):
    """The camera whips: the picture leaves along a line and the next one follows it in, joined, the frame always
    full; one steady speed over the eight frames round the beat, blurred by that speed."""
    dx, dy = direction                            # the way the pictures move on the screen
    L = W if dx else H
    acc = None
    K = 16
    for s in range(K):
        dt = (i - cut_frame) + (s / (K - 1) - 0.5)
        p = L * C.clamp01((dt + WHIP) / (2 * WHIP))
        out = cv2.warpAffine(img_out, np.float32([[1, 0, dx * p], [0, 1, dy * p]]), (W, H), flags=cv2.INTER_LINEAR,
                             borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0))
        inc = cv2.warpAffine(img_in, np.float32([[1, 0, dx * (p - L)], [0, 1, dy * (p - L)]]), (W, H),
                             flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0))
        f = out + inc
        acc = f if acc is None else acc + f
    return acc / K


# ---------------------------------------------------------------- the frame
def lit(sg, t, i):
    """A shot's frame with the film's light on it (crush, black and white, the words), before the flashes."""
    x = body(sg, t, i)
    x = look(x, sg["fx"].get("mono", False))
    c = crush_amount(sg, t)
    x = np.zeros_like(x) if c >= 0.999 else C.crush_lights(x, c)
    return with_words(x, sg)


def frame(i):
    t = i / FPS
    sg = shot_at(i)
    k = sg["k"]
    if k == 93:
        return C.end_card(t, BEATS[93], BEATS[93] + 0.15)
    if k == -2:
        return np.zeros((H, W, 3), np.uint8)
    if k in ANGELS and i >= first(sg["t1"]) - 9:                 # the black between the angels, just before each beat
        return np.zeros((H, W, 3), np.uint8)
    for kk, direction in WHIPS.items():                         # the three whips, centred on their beats
        cf = first(BEATS[kk])
        if cf - WHIP <= i < cf + WHIP:
            before, after = shot_at(cf - 1), shot_at(cf)
            x = whip(lit(before, (cf - 1) / FPS, cf - 1), lit(after, cf / FPS, cf), i, cf, direction)
            return C.u8(C.add_grain(x, i, 0.018))
    if sg.get("blur"):                                          # the opening move, blurred by its own speed
        acc = None
        for s in range(10):
            ts = t + (s / 9 - 0.5) / FPS
            img = picture(sg, ts, i)
            acc = img if acc is None else acc + img
        x = look(acc / 10)
        x = C.crush_lights(x, 0.55)
    else:
        x = lit(sg, t, i)
    x = C.to_white(x, white_at(i))
    x = C.add_grain(x, i, 0.018)
    return C.u8(x)


SHEET = [f"b{k}" for k in (0, 4, 7, 13, 15, 20, 23, 31, 36, 39, 42, 48, 51, 53, 54, 55, 60, 61, 62, 63, 71, 82, 85, 87)]

if __name__ == "__main__":
    C.main(NAME, frame, CUTS, SHEET)
