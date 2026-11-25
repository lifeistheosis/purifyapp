#!/usr/bin/env python3
"""The Cradle, version 3: Musashi. Reference 3 in its full style, with a cut on every beat.

Reference 3 (docs/plans/promo-edits/study-2026-11-25.md), the "new editing style": a square frame; a colour painting
holds the body and the sky while black-and-white drawings of the same face are swapped in place over it, one face in
many drawings, the painting's own foreground kept in front of them; two worlds, colour for the life and black ink on
white for the inner voice, a white flash carrying you from one to the other; a few words in bold capitals in the
white space beside an ink figure; a whip into a question put to the viewer; a fade to black; a sign-off typed out.

Its own devices that his rules forbid are left out and named: the push that pulses on the beat and settles, the page
that bends and flattens, the glow on the sign-off. Every move here is a cut or runs at a steady speed (CLAUDE.md, "No
bounce"); the sign-off is Purify's cross and its name typed, with no glow.

The film, in reference 3's order, a cut on every beat:
  colour: Murillo's Mother and Child, and over her face the Mother drawn by Dürer, Schongauer and Raimondi, one face
  on each beat, the Child kept in front of them; colour again: in to Ribera's Mother looking at us, out from
  Zurbarán's young Virgin praying; the white flash on the drop into ink: "FOR A CHILD IS BORN TO US, AND A SON IS
  GIVEN TO US" (Isaiah 9:6), a line on each beat, beside the Mother and Child as many engravers drew them; a whip into
  the question, "BUT WHOM SAY YE THAT I AM?" (Matthew 16:15), a word on each beat, beside His face in many drawings,
  closer every pass; a white flash into colour, His face and the Child's face in paint, one in place of the other; a
  whip into the question alone, closer on each beat, the fade, the cross and the name.
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import cv2
from PIL import Image, ImageDraw
import core as C
from core import BEATS, KICKS, GAPS, FPS, first, beat_end

NAME = "the-cradle-v3-musashi"
S = 1080
BAND = (0, (C.H - S) // 2, S, S)          # reference 3's square

# ---------------------------------------------------------------- the drawings (The Met, Open Access), in ink
INK = {
    "schon_apple": "367006.jpg",   # Martin Schongauer, Virgin and Child with an Apple, about 1475
    "durer_tree": "396540.jpg",    # Albrecht Dürer, Virgin and Child Seated by a Tree, 1513
    "raimondi": "342531.jpg",      # Marcantonio Raimondi, The Virgin and the Christ Child Seated on Clouds, about 1500 to 1534
    "durer_crowned": "391227.jpg", # Albrecht Dürer, Virgin and Child Crowned by Two Angels, 1518
    "schon_parrot": "367004.jpg",  # Martin Schongauer, The Madonna and Child with the Parrot, 1470 to 1491
    "durer_pear": "391198.jpg",    # Albrecht Dürer, Virgin and Child with the Pear, 1511
    "schon_bench": "367003.jpg",   # Martin Schongauer, Virgin and Child on a Grassy Bench, 1470 to 1491
    "durer_bench": "390975.jpg",   # Albrecht Dürer, Virgin and Child on a Grassy Bench, 1503
    "durer_wall": "391215.jpg",    # Albrecht Dürer, Virgin and Child Seated by the Wall, 1514
    "schon_court": "367005.jpg",   # Martin Schongauer, The Madonna and Child in the Courtyard, 1470 to 1491
    "traut": "394488.jpg",         # Wilhelm Traut, Bust of Christ Blessing, 17th century (woodcut on vellum)
    "huret": "645136.jpg",         # Grégoire Huret, Christ Crowned with Thorns, 17th century (engraving)
    "acarracci": "341241.jpg",     # Agostino Carracci, Ecce Homo, 1587 (engraving)
    "beham": "418384.jpg",         # Sebald Beham, The Head of Christ Crowned with Thorns, about 1520 (woodcut)
    "straet": "383693.jpg",        # Jan van der Straet, called Stradanus, Head of Christ (engraving)
    "schon_christ": "367000.jpg",  # Martin Schongauer, Christ in an Attitude of Benediction, 1470 to 1491
}
# Each drawing's face: centre and width in source pixels. The Mothers carry where the Child is, as a share of the face
# width to the side, for the panels that stand beside the words.
FACE = {
    "schon_apple": (955, 434, 190, 0.7), "durer_tree": (1510, 870, 260, -0.6), "raimondi": (1365, 560, 190, 0.7),
    "durer_crowned": (1320, 990, 260, 0.3), "schon_parrot": (960, 790, 230, 0.7), "durer_pear": (1400, 1330, 200, 0.9),
    "schon_bench": (655, 620, 150, 0.1), "durer_bench": (1230, 1240, 250, 0.5), "durer_wall": (1270, 660, 260, -0.6),
    "schon_court": (950, 990, 130, 1.3),
    "traut": (637, 540, 330, 0), "huret": (1420, 1400, 520, 0), "acarracci": (1090, 900, 380, 0),
    "beham": (1250, 1250, 1050, 0), "straet": (1590, 1420, 560, 0), "schon_christ": (532, 225, 120, 0),
}
for _k, _p in INK.items():
    C.add_source(_k, "ink/" + _p, "gray")
C.add_source("murillo_mask", "murillo_child_mask.png", "rgb", plate=C.PLATES["murillo"])
C.add_source("cross_g", "met/437972.jpg", "gray")

_inked = set()


def inked(key):
    """A print as ink on white: its paper pushed to white, its lines to black."""
    if key not in _inked:
        g = C.src(key)[..., 0].astype(np.float32)
        paper = np.percentile(g[::5, ::5], 90)
        line = np.percentile(g[::5, ::5], 3)
        v = np.clip((g - line) / max(1.0, paper - line), 0, 1) ** 1.15
        u = (v * 255 + 0.5).astype(np.uint8)
        C._cache[(key, 0)] = np.repeat(u[..., None], 3, axis=2)
        for lvl in range(1, 6):
            C._cache.pop((key, lvl), None)
        _inked.add(key)
    return key


# ---------------------------------------------------------------- the colour world
def colour_look(x, gray=False):
    """Reference 3's paintings: warm, full colour, a soft haze in the lights."""
    x = np.power(np.clip(x, 0, 1), 0.92)
    if not gray:
        L = C.lum(x)[..., None]
        x = L + 1.14 * (x - L)
        x = x * np.float32((1.03, 1.0, 0.95))
    x = np.clip((x - 0.5) * 1.05 + 0.52, 0, 1)
    soft = cv2.GaussianBlur(x * x, (0, 0), 18)
    x = 1 - (1 - x) * (1 - 0.10 * soft)
    return np.clip(x * C.vignette(S, S, 0.22, 0.7)[..., None], 0, 1)


def colour_view(key, crop, t, sg, gray=False):
    u = C.clamp01((t - sg["t0"]) / max(1e-3, sg["t1"] - sg["t0"]))
    cx, cy, w = crop
    w2 = w * (1 - sg.get("push", 0.03) * u)
    img, geo = C.view(key, cx, cy, w2, S, S)
    return img, geo


# ---------------------------------------------------------------- the panels: a drawing cut out and laid in place
_noise = None


def edge_noise():
    global _noise
    if _noise is None:
        rng = np.random.default_rng(3)
        n = cv2.GaussianBlur(rng.random((S + 64, S + 64)).astype(np.float32), (0, 0), 3.0)
        _noise = (n - n.min()) / (n.max() - n.min())
    return _noise


def panel(key, u, v, face_px, wide, up, down, seed=0, side=0.0):
    """The drawing `key` with its face centred on (u, v) of the frame and face_px wide; cut out as a panel `wide` face
    widths across, from `up` above the face to `down` below, shifted `side` face widths to one side; its edge cut by
    hand. Returns the ink picture and its alpha."""
    inked(key)
    fx, fy, fw = FACE[key][:3]
    k = face_px / fw
    tx, ty = u - k * fx, v - k * fy
    lvl = 0
    while k * 2 ** (lvl + 1) <= 1.0 and lvl < 5:
        lvl += 1
    a = C.src(key, lvl)
    kk = k * 2 ** lvl
    M = np.float32([[kk, 0, tx], [0, kk, ty]])
    ink = cv2.warpAffine(a, M, (S, S), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_CONSTANT, borderValue=(255, 255, 255))
    W0, H0 = C.size(key)
    inset = 0.035 * min(W0, H0)
    sx0 = max(inset, fx + (side - wide / 2) * fw); sx1 = min(W0 - inset, fx + (side + wide / 2) * fw)
    sy0 = max(inset, fy - up * fw); sy1 = min(H0 - inset, fy + down * fw)
    x0, x1 = int(round(k * sx0 + tx)), int(round(k * sx1 + tx))
    y0, y1 = int(round(k * sy0 + ty)), int(round(k * sy1 + ty))
    m = np.zeros((S, S), np.uint8)
    m[max(0, y0):max(0, min(S, y1)), max(0, x0):max(0, min(S, x1))] = 255
    dist = cv2.distanceTransform(m, cv2.DIST_L2, 3)
    n = edge_noise()
    oy, ox = (seed * 17) % 60, (seed * 29) % 60
    alpha = np.clip((dist - 7.0 * n[oy:oy + S, ox:ox + S]) / 1.6, 0, 1)
    return ink.astype(np.float32) / 255, alpha[..., None]


# ---------------------------------------------------------------- the white pages
_page = None


def white_page():
    global _page
    if _page is None:
        uu, vv = C.grid(S, S)
        r2 = ((uu - S / 2) / (S / 2)) ** 2 + ((vv - S * 0.45) / (S / 2)) ** 2
        g = (250 / 255) * np.clip(1 - 0.075 * r2, 0.84, 1)        # reference 3's white is not flat
        _page = np.repeat(g[..., None], 3, axis=2).astype(np.float32)
    return _page


WORDS = {
    "isaiah96": (["FOR A CHILD", "IS BORN TO US,", "AND A SON IS", "GIVEN TO US"], "Isaiah 9:6", ("isaiah", 9, 6)),
    "matthew1615": (["BUT WHOM", "SAY YE THAT", "I AM?"], "Matthew 16:15", ("matthew", 16, 15)),
}
# what each beat of the question shows: (line, first character, last character)
Q_TOKENS = [(0, 0, 3), (0, 4, 8), (1, 0, 6), (1, 7, 11), (2, 0, 5)]


def check_words():
    for key, (lines, cite, (book, ch, vn)) in WORDS.items():
        verse = next(x["text"] for x in json.load(open(f"{C.ROOT}/data/bible/{book}/{ch}.json"))["verses"] if x["n"] == vn)
        flat = " ".join(" ".join(lines).split()).lower()
        assert flat in verse.lower(), f"{key}: {flat!r} is not in {book} {ch}:{vn}"
    return True


_text = {}


def words_layer(key, shown, size, cx, top, cite=True, tokens=None):
    """The words in DM Sans Bold capitals, centred on cx from top, as an alpha mask; shown counts lines (or tokens)."""
    ck = (key, shown, size, cx, top, cite, tokens is not None)
    if ck in _text:
        return _text[ck]
    lines, citation, _ = WORDS[key]
    im = Image.new("L", (S, S), 0)
    d = ImageDraw.Draw(im)
    f = C.font(700, size)
    lh = round(size * 1.08)
    for ln in lines:
        assert d.textlength(ln, font=f) <= S - 80, f"{ln!r} is too wide at {size}px"
    if tokens is None:
        for li in range(min(shown, len(lines))):
            wdt = d.textlength(lines[li], font=f)
            d.text((cx - wdt / 2, top + li * lh), lines[li], font=f, fill=255)
        done = shown >= len(lines)
    else:
        for (li, c0, c1) in tokens[:shown]:
            wdt = d.textlength(lines[li], font=f)
            x = cx - wdt / 2 + d.textlength(lines[li][:c0], font=f)
            d.text((x, top + li * lh), lines[li][c0:c1], font=f, fill=255)
        done = shown >= len(tokens)
    if cite and done:
        fc = C.font(500, max(26, size // 2 - 4))
        wdt = d.textlength(citation, font=fc)
        d.text((cx - wdt / 2, top + len(lines) * lh + size * 0.35), citation, font=fc, fill=150)
    a = np.array(im).astype(np.float32) / 255
    _text[ck] = a[..., None]
    return _text[ck]


def ink_text(x, a, value=0.055):
    return x * (1 - a) + value * a


# ---------------------------------------------------------------- the timeline
MOTHER_SWAPS = ["schon_apple", "durer_tree", "raimondi", "durer_crowned", "schon_parrot", "durer_pear", "schon_bench",
                "durer_bench", "durer_wall", "schon_court"]
MURILLO_BASE = (1600, 1430, 1500)          # the framing the faces are swapped on
MARY = (1545, 1150, 330)                   # her face in the Murillo: centre and width
RIBERA_IN = [(1450, 1600, 2600), (1600, 1450, 1900), (1750, 1320, 1350), (1800, 1260, 1000), (1840, 1230, 760),
             (1850, 1215, 580), (1852, 1205, 450), (1852, 1200, 360)]
ZURBARAN_OUT = [(1525, 1330, 380), (1520, 1360, 520), (1520, 1420, 720), (1540, 1550, 1000), (1560, 1700, 1400),
                (1600, 1850, 1900), (1620, 1950, 2500), (1600, 2050, 2950)]
GROUP_ORDER = ["schon_apple", "durer_tree", "raimondi", "durer_crowned", "schon_parrot", "durer_pear", "schon_bench",
               "durer_bench", "durer_wall", "schon_court"]
CHRIST_PASS1 = ["traut", "huret", "acarracci", "beham", "straet", "schon_christ", "traut"]
CHRIST_PASS2 = ["beham", "huret", "acarracci", "traut", "straet", "beham", "huret"]
# each painted face by the middle of its eyes and its width, so one stands where the last stood
COLOUR_FACES = [("head", (1835, 1527, 900)), ("murillo", (1792, 1494, 330)), ("velazquez", (790, 700, 420)),
                ("ribera", (1628, 1350, 300)), ("cross_g", (1150, 960, 300)), ("greco", (1105, 2330, 150)),
                ("head", (1835, 1527, 600))]
FINAL_ZOOM = [1.0, 1.22, 1.5, 1.95, 2.35, 2.8]


def build():
    segs = [dict(t0=0.0, t1=BEATS[0], kind="black", k=-1)]

    def seg(k, kind, **kw):
        t0, t1 = BEATS[k], beat_end(k)
        segs.append(dict(t0=t0, t1=t1, kind=kind, k=k, **kw))

    # I. colour: the Murillo, then one face in many drawings over the Mother's
    seg(0, "colour", key="murillo", crop=(1650, 1720, 2500))
    seg(1, "colour", key="murillo", crop=(1790, 1530, 650))
    seg(2, "colour", key="murillo", crop=(1530, 1150, 700))
    seg(3, "swap", face=None)
    for j, k in enumerate(range(4, 14)):
        seg(k, "swap", face=MOTHER_SWAPS[j], big=k in KICKS)
    seg(14, "swap", face=None)
    # II. colour again: in to Ribera's Mother, beat by beat, to her eyes on us
    for j, k in enumerate(range(15, 23)):
        seg(k, "colour", key="ribera", crop=RIBERA_IN[j])
    # III. and out from Zurbarán's young Virgin, beat by beat, to the whole room; the white comes in from the left
    for j, k in enumerate(range(23, 31)):
        seg(k, "colour", key="zurbaran", crop=ZURBARAN_OUT[j], white_in=(k == 30))
    # IV. the drop: white, and the ink world. The words a line a beat, beside the Mother and Child in many drawings.
    for j, k in enumerate(range(31, 35)):
        seg(k, "quote", shown=j + 1, group=GROUP_ORDER[j], entry=(k == 31))
    order = GROUP_ORDER[4:] + GROUP_ORDER
    n = 0
    for k in range(35, 54):
        if k in GAPS:
            seg(k, "quote", shown=4, group=None)
        else:
            seg(k, "quote", shown=4, group=order[n % len(order)], near=(n >= 9))
            n += 1
    seg(54, "quote", shown=4, group=None, empty=True)              # the song stops: the words alone
    # V. a whip into the question, a word a beat, beside Him: the standing figure, then His face in many drawings
    for j, (k, f) in enumerate(zip(range(55, 60), ["schon_christ", "traut", "huret", "acarracci", "straet"])):
        seg(k, "question", shown=j + 1, face=f, standing=(f == "schon_christ"), size=220, whip_in=(k == 55))
    seg(60, "question", shown=5, face="traut", size=230)
    seg(61, "question", shown=5, face="beham", size=330)
    seg(62, "question", shown=5, face=None)
    for j, k in enumerate(range(63, 70)):
        seg(k, "question", shown=5, face=CHRIST_PASS1[j], size=250 if k in KICKS else 220)
    seg(70, "question", shown=5, face=None)
    for j, k in enumerate(range(71, 78)):
        seg(k, "question", shown=5, face=CHRIST_PASS2[j], size=330 if k in KICKS else 300)
    seg(78, "question", shown=5, face=None)
    # VI. a white flash into colour: His face and the Child's, one in place of the other
    for j, k in enumerate(range(79, 86)):
        seg(k, "colourface", face=COLOUR_FACES[j], entry=(k == 79))
    seg(86, "white")
    # VII. a whip into the question alone; closer on each beat; the fade; the cross and the name
    for j, k in enumerate(range(87, 93)):
        seg(k, "final", zoom=FINAL_ZOOM[j], whip_in=(k == 87))
    seg(93, "end")
    return segs


SEGS = build()
CUTS = [s["t0"] for s in SEGS if s["t0"] > 0]


def seg_at(i):
    for sg in SEGS:
        if first(sg["t0"]) <= i < first(sg["t1"]):
            return sg
    return SEGS[-1]


# ---------------------------------------------------------------- drawing each kind
def swap_frame(sg, t, i):
    # the base holds one framing from b3 to b14 and pushes in at a steady speed across all of it
    a, b = BEATS[3], beat_end(14)
    u = C.clamp01((t - a) / (b - a))
    cx, cy, w = MURILLO_BASE
    w2 = w * (1 - 0.08 * u)
    base, geo = C.view("murillo", cx, cy - 40 * u, w2, S, S)
    x = colour_look(base)
    if sg["face"]:
        mu, mv = C.to_screen(geo, S, S, MARY[0], MARY[1])
        fpx = MARY[2] / geo[2] * (1.18 if sg.get("big") else 1.0)
        wide, up, down = (2.5, 1.5, 2.3) if sg.get("big") else (2.1, 1.25, 1.65)
        ink, al = panel(sg["face"], mu, mv, fpx, wide, up, down, seed=sg["k"])
        x = x * (1 - al) + ink * al
        m, _ = C.view("murillo_mask", cx, cy - 40 * u, w2, S, S)
        cm = m[..., :1]
        x = x * (1 - cm) + colour_look(base) * cm             # the Child stays in front of the drawings
    return x


def colour_frame(sg, t, i):
    img, geo = colour_view(sg["key"], sg["crop"], t, sg)
    x = colour_look(img)
    if sg.get("white_in"):                                    # reference 3's white, coming in from the left
        a0, a1 = 18.24, BEATS[31]
        if t >= a0:
            p = C.clamp01((t - a0) / (a1 - a0))
            uu, _ = C.grid(S, S)
            edge = (p * 1.35 - 0.2) * S
            w = np.clip((edge - uu) / (0.22 * S), 0, 1)[..., None]
            x = x * (1 - w) + w
    return x


def entry_white(x, sg, i):
    k = i - first(sg["t0"])
    if k < 3:
        return np.ones_like(x)
    if k < 11:
        return 1 - (1 - x) * ((k - 2) / 9)
    return x


def drifted(x, t, t0, t1, dx=-70.0, dy=-50.0):
    """The whole page moving at a steady speed from t0 to t1 (reference 3's frame never stops), inside a margin of
    its own so no edge is ever seen."""
    u = C.clamp01((t - t0) / (t1 - t0)) - 0.5
    z = 1.0 + (max(abs(dx), abs(dy)) + 24) / S
    ox, oy = (S - z * S) / 2 + dx * u, (S - z * S) / 2 + dy * u
    M = np.float32([[z, 0, ox], [0, z, oy]])
    return cv2.warpAffine(x, M, (S, S), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)


def quote_frame(sg, t, i):
    x = white_page().copy()
    if sg.get("group"):
        g = sg["group"]
        side = FACE[g][3]
        near = sg.get("near")
        ink, al = panel(g, 300, 735 if near else 705, 255 if near else 195, 2.6 if near else 3.3,
                        1.25 if near else 1.45, 2.4 if near else 3.6, seed=sg["k"], side=side * 0.8)
        x = x * (1 - al) + ink * al
    x = ink_text(x, words_layer("isaiah96", sg["shown"], 62, 700, 100))
    x = drifted(x, t, BEATS[31], BEATS[55])
    if sg.get("entry"):
        x = entry_white(x, sg, i)
    return x


def question_page(shown, face, size, standing, t):
    x = white_page().copy()
    if face:
        if standing:
            ink, al = panel(face, 300, 330, 72, 4.2, 1.3, 9.6, seed=7)
        else:
            near = size >= 300
            ink, al = panel(face, 330, 770 if near else 690, size, 1.9, 1.15 if near else 1.3, 1.6,
                            seed=sum(map(ord, face)) % 50)
        x = x * (1 - al) + ink * al
    x = ink_text(x, words_layer("matthew1615", shown, 66, 730, 120, tokens=Q_TOKENS))
    return drifted(x, t, BEATS[55], BEATS[79], dx=-80.0, dy=-80.0)


WHIP = 4          # frames each side of a whip's cut
DIR = np.float32((0.87, -0.50))


def whip(img_out, img_in, i, cut_frame):
    """Reference 3's whip, at a steady speed: out along a line before the cut, in along it after; blurred by its speed."""
    d = i - cut_frame
    speed = 1500 / WHIP
    acc = None
    K = 24
    for s in range(K):
        dt = d + (s / (K - 1) - 0.5)
        if dt < 0:
            off = speed * max(0.0, dt + WHIP)
            src = img_out
        else:
            off = -speed * max(0.0, WHIP - dt)
            src = img_in
        M = np.float32([[1, 0, -DIR[0] * off], [0, 1, -DIR[1] * off]])
        f = cv2.warpAffine(src, M, (S, S), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=(0.98, 0.98, 0.98))
        acc = f if acc is None else acc + f
    return acc / K


def question_frame(sg, t, i):
    x = question_page(sg["shown"], sg.get("face"), sg.get("size", 220), sg.get("standing", False), t)
    return x


def colourface_frame(sg, t, i):
    key, (fx, fy, fw) = sg["face"]
    face_px = 470 if key != "greco" else 380
    w = fw * S / face_px
    u = C.clamp01((t - sg["t0"]) / max(1e-3, sg["t1"] - sg["t0"]))
    w2 = w * (1 - 0.03 * u)
    img, geo = C.view(key, fx, fy + (S / 2 - 470) * w2 / S, w2, S, S)     # the eyes at 470 on every face
    x = colour_look(img, gray=(key == "cross_g"))
    if sg.get("entry"):
        x = entry_white(x, sg, i)
    return x


_final = {}


def final_page():
    if "p" not in _final:
        x = white_page().copy()
        a = words_layer("matthew1615", 3, 120, S / 2, 300, cite=False)
        _final["p"] = ink_text(x, a)
    return _final["p"]


def final_frame(sg, t, i):
    z = sg["zoom"]
    u = C.clamp01((t - sg["t0"]) / max(1e-3, sg["t1"] - sg["t0"]))
    z = z * (1 + 0.04 * u)                                    # and a steady push inside each beat
    cy = 490 + (z - 1) / 1.8 * 130                            # towards the last line, I AM?
    M = np.float32([[z, 0, S / 2 - z * S / 2], [0, z, cy - z * cy]])
    x = cv2.warpAffine(final_page(), M, (S, S), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    a0, a1 = BEATS[91], BEATS[93]                             # the fade to black over the last two beats
    if t >= a0:
        x = x * (1 - C.clamp01((t - a0) / (a1 - a0)))
    return x


def body(sg, t, i):
    k = sg["kind"]
    if k == "black":
        return np.zeros((S, S, 3), np.float32)
    if k == "colour":
        return colour_frame(sg, t, i)
    if k == "swap":
        return swap_frame(sg, t, i)
    if k == "quote":
        return quote_frame(sg, t, i)
    if k == "question":
        return question_frame(sg, t, i)
    if k == "colourface":
        return colourface_frame(sg, t, i)
    if k == "white":
        return white_page().copy()
    if k == "final":
        return final_frame(sg, t, i)
    return np.zeros((S, S, 3), np.float32)


def frame(i):
    t = i / FPS
    sg = seg_at(i)
    if sg["kind"] == "end":
        return C.end_card(t, BEATS[93], BEATS[93] + 0.15)
    for cut in (BEATS[55], BEATS[87]):                        # the two whips
        cf = first(cut)
        if cf - WHIP <= i < cf + WHIP:
            before = seg_at(cf - 1)
            after = seg_at(cf)
            x = whip(body(before, (cf - 1) / FPS, cf - 1), body(after, cf / FPS, cf), i, cf)
            return C.in_band(C.u8(C.add_grain(x, i, 0.014)), BAND)
    x = body(sg, t, i)
    x = C.add_grain(x, i, 0.014)
    return C.in_band(C.u8(x), BAND)


SHEET = [f"b{k}" for k in (0, 3, 4, 7, 9, 12, 14, 15, 19, 22, 23, 27, 30, 31, 34, 36, 44, 54, 55, 59, 63, 66, 71, 74,
                           79, 82, 84, 87, 90, 93)]

if __name__ == "__main__":
    check_words()
    C.main(NAME, frame, CUTS, SHEET)
