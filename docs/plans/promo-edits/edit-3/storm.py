#!/usr/bin/env python3
"""The Cradle, version 1: the storm. Reference 1 in its full style, with a cut on every beat.

Reference 1 (docs/plans/promo-edits/study-2026-11-25.md): black and white in a widescreen band; no cut is ever seen,
each hides inside a flash of lightning or in the dark; lightning is the reveal (a figure seen only when it strikes, the
dark taking it back); each shot closer than the last; the camera nearly still; no words; the emotion built from light
alone, grey, then darker, darkest just before the hand, then a soft light rising behind Him, still rising on the last
frame. Its film ends on the picture. So does this one.

The story, told in that light: the shepherds' field the night the angel came (Rembrandt), the road by lantern
(Rembrandt), the stable (Rembrandt, El Greco), the drop on the Child as the light, the Cross in the dark at the song's
stop, and in the last part His face and the Child's face, matched eye to eye, closer on every beat while the light
rises: the Child in the cradle is the Christ.

Every beat is a cut (core.py: the kick gets a strike, a beat between kicks a cut in lantern light or in the dark, a gap
a cut to darkness). The two bass entries, which fall between beats, are flickers inside a shot.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import cv2
import core as C
from core import BEATS, KICKS, ACCENTS, GAPS, FPS, first, beat_end

NAME = "the-cradle-v1-storm"
OW, OH = 1080, 760
BAND = (0, 580, OW, OH)      # reference 1: a 1080 by 740 picture in a 9:16 frame
C.add_source("murillo_g", "met/437175.jpg", "gray", plate=C.PLATES["murillo"])

# How each picture is lit for the night: gamma darkens a print's paper into night, the pool is the light in the scene.
LOOK = {
    "angel": dict(gamma=1.30, gain=1.10, floor=0.42, r=0.80, soft=0.45),
    "flight": dict(gamma=1.10, gain=1.95, floor=0.26, r=0.55, soft=0.70),
    "night": dict(gamma=1.20, gain=2.10, floor=0.22, r=0.50, soft=0.55),
    "lamp": dict(gamma=2.20, gain=1.12, floor=0.20, r=0.50, soft=0.45),
    "greco": dict(gamma=0.66, gain=1.55, floor=0.20, r=0.56, soft=0.60),
    "cross": dict(gamma=1.00, gain=1.10, floor=0.55, r=0.85, soft=0.50),
    "head": dict(gamma=0.80, gain=1.55, floor=0.32, r=0.62, soft=0.60),
    "murillo_g": dict(gamma=1.05, gain=1.25, floor=0.30, r=0.60, soft=0.60),
}
GRECO_GAIN = {"CC": 0.80, "CX": 0.72, "LB": 0.80, "MH": 0.95, "KF": 1.75}   # the Child and the lamb are the brightest paint
GRECO_AT = {(1250, 2310): "CC", (1150, 2320): "CX", (1105, 2335): "CX", (1100, 3050): "LB", (1310, 2200): "MH",
            (1310, 2250): "MH", (450, 3200): "KF", (700, 2050): "KF"}

# Where the eyes are, in source pixels: the last part holds both faces' eyes on one point of the screen.
EYES = {"head": (1835, 1527), "murillo_g": (1792, 1494)}
EYE_Y = 318                   # the eyes' height on the band, for every matched shot


def eyes_at(key, w):
    ex, ey = EYES[key]
    s = w / OW
    return (ex, ey + (OH / 2 - EYE_Y) * s, w)


# ---------------------------------------------------------------- the shots, one for each beat
# (beat, picture, (centre x, centre y, width) in source pixels, cut, exposure, light source or None, note)
# cut: S a strike on the cut; L a cut in the scene's own light; D a cut between dark shots; R a strike that reveals the
# shot and lets the dark take it back; G darkness. A kick's strike is the strongest.
SHOTS = [
    # I. The field, the night the angel came (Luke 2:8-9). Grey and small, then the first strikes with the bass.
    (0, "angel", (1455, 2700, 2830), "D", 0.62, None, "the field at night, the whole of it"),
    (1, "angel", (1700, 2120, 1500), "D", 0.60, None, "the dark wood"),
    (2, "angel", (760, 2860, 1000), "D", 0.70, (760, 2860), "a beast in the first light"),
    (3, "angel", (2200, 2800, 1500), "D", 0.72, None, "the flock"),
    (4, "angel", (1545, 2650, 760), "S", 0.90, (1545, 2650), "a shepherd stands, struck"),
    (5, "angel", (1160, 2900, 760), "L", 0.85, (1160, 2900), "another falls"),
    (6, "angel", (2250, 2780, 900), "S", 0.88, None, "the cattle run"),
    (7, "angel", (1545, 2600, 520), "S", 0.92, (1545, 2560), "the shepherd, closer"),
    (8, "angel", (1690, 2860, 600), "S", 0.88, None, "one kneels"),
    (9, "angel", (1150, 2880, 560), "S", 0.88, None, "one runs"),
    (10, "angel", (2480, 2700, 1000), "S", 0.90, None, "the flock and the rider"),
    (11, "angel", (2100, 2790, 620), "L", 0.82, None, "the cattle's heads"),
    (12, "angel", (800, 1500, 700), "S", 0.95, (770, 1400), "the angel on the cloud"),
    (13, "angel", (1545, 2545, 360), "L", 0.85, (1545, 2545), "the shepherd's face"),
    (14, None, None, "G", 0.0, None, "the music drops out: darkness"),
    # II. The road by lantern (the break: the bass is gone).
    (15, "flight", (1650, 2550, 3150), "D", 0.70, (883, 2860), "the road at night, the lantern far off"),
    (16, "flight", (1090, 1820, 560), "S", 0.95, (1090, 1830), "Joseph, in the strike"),
    (17, "flight", (900, 2700, 650), "L", 0.95, (883, 2860), "his hand, the lantern"),
    (18, "flight", (2135, 1500, 700), "L", 0.90, (2135, 1520), "the Mother on the road, veiled"),
    (19, "flight", (1500, 3200, 1300), "L", 0.90, (1250, 3150), "their feet on the road"),
    (20, "flight", (1320, 2300, 700), "S", 0.92, (1250, 2350), "the donkey's head"),
    (21, "flight", (1100, 2400, 1300), "L", 0.90, (1000, 2500), "Joseph walks"),
    (22, "flight", (2050, 2000, 1500), "S", 0.90, (2050, 1900), "the Mother and the beast"),
    # III. The stable: Rembrandt's night piece, then El Greco's faces glimpsed in strikes that grow dimmer, then the
    # pause before the drop is black. The drop shows the whole of what the glimpses were parts of.
    (23, "night", (1780, 1330, 3300), "S", 0.80, (1650, 1400), "the stable in the dark"),
    (24, "night", (1650, 1380, 700), "L", 0.95, (1650, 1400), "the lantern"),
    (25, "night", (1000, 960, 900), "L", 0.95, (1080, 1000), "the shepherds come in"),
    (26, "night", (2780, 1700, 1100), "S", 0.95, (2760, 1680), "the Mother and Child by the light"),
    (27, "greco", (1790, 1650, 600), "R", 0.35, (1790, 1650), "Joseph's face, in a strike"),
    (28, "greco", (1530, 1585, 600), "S", 0.45, (1530, 1585), "the Mother's face"),
    (29, "greco", (1150, 2320, 480), "S", 0.38, (1105, 2335), "the Child"),
    (30, "greco", (1105, 2335, 380), "R", 0.20, (1105, 2335), "His face, a last glimpse"),
    # IV. The drop: the whole night, the Child its light. Each shot closer to Him; the gaps are reveals in the dark.
    (31, "greco", (1250, 2000, 2495), "W", 1.00, (1150, 2320), "the whole night, the Child its light"),
    (32, "greco", (1100, 720, 1350), "L", 1.00, (1150, 700), "the angels above"),
    (33, "greco", (430, 1320, 800), "L", 1.00, (430, 1320), "a shepherd's arms raised"),
    (34, "greco", (1650, 1630, 1000), "S", 1.00, (1600, 1700), "the Mother and Joseph"),
    (35, "greco", (880, 1450, 620), "L", 1.00, (880, 1450), "a shepherd's face"),
    (36, "greco", (1250, 2310, 760), "S", 1.00, (1150, 2320), "the Child on the white cloth"),
    (37, "greco", (1790, 1650, 600), "L", 1.00, (1790, 1650), "Joseph's face"),
    (38, "night", (2780, 1700, 900), "R", 0.18, (2760, 1680), "gap: the family in the dark"),
    (39, "greco", (1310, 2200, 1000), "S", 1.00, (1150, 2320), "her hands over the Child"),
    (40, "greco", (1060, 1480, 600), "L", 1.00, (1060, 1480), "the young shepherd"),
    (41, "greco", (1100, 3050, 850), "L", 0.95, (1100, 3050), "the lamb, bound"),
    (42, "greco", (1530, 1585, 600), "S", 1.00, (1530, 1585), "the Mother's face"),
    (43, "greco", (700, 2050, 900), "L", 1.00, (720, 2000), "the old shepherd kneels"),
    (44, "greco", (1150, 2320, 480), "S", 1.00, (1105, 2335), "the Child, closer"),
    (45, "greco", (1150, 640, 700), "L", 1.00, (1150, 640), "the angels, closer"),
    (46, "night", (1650, 1380, 600), "R", 0.16, (1650, 1400), "gap: the lantern in the dark"),
    (47, "greco", (1530, 1585, 440), "S", 1.00, (1530, 1585), "her face, closer"),
    (48, "greco", (1105, 2335, 380), "L", 1.00, (1105, 2335), "His face"),
    (49, "greco", (1790, 1650, 420), "L", 1.00, (1790, 1650), "Joseph's face, closer"),
    (50, "greco", (1105, 2335, 320), "S", 1.00, (1105, 2335), "His face, closer"),
    (51, "greco", (1060, 1450, 420), "L", 1.00, (1060, 1450), "the young shepherd's face"),
    (52, "greco", (1310, 2250, 800), "S", 1.00, (1150, 2320), "the Mother holds Him"),
    (53, "greco", (1150, 2320, 420), "L", 0.95, (1105, 2335), "the Child: the song stops on Him"),
    (54, "cross", (1140, 950, 700), "R", 0.10, (1140, 950), "the stop: the Cross, glimpsed"),
    # V. The Cross in the dark, seen only in the strikes; the silence.
    (55, "cross", (1222, 820, 2443), "S", 0.18, (1140, 900), "the Cross"),
    (56, "cross", (2226, 540, 520), "R", 0.14, (2226, 540), "His hand"),
    (57, "cross", (330, 620, 480), "R", 0.14, (204, 560), "His other hand"),
    (58, "cross", (1140, 950, 700), "S", 0.16, (1140, 950), "His head"),
    (59, "cross", (1165, 2950, 650), "R", 0.14, (1165, 2950), "His feet"),
    (60, "cross", (1140, 990, 460), "S", 0.16, (1140, 990), "His head, closer"),
    (61, "cross", (1221, 360, 650), "R", 0.10, (1221, 360), "silence: the title over Him"),
    (62, "head", eyes_at("head", 2000), "R", 0.06, (1835, 1527), "silence: His face, the first time"),
    # VI. His face, matched with the Child's: first in the dark between strikes, then in the light rising.
    (63, "head", (1650, 1800, 2700), "S", 0.20, (1750, 1650), "His face in the storm"),
    (64, "cross", (1140, 950, 600), "R", 0.14, (1140, 950), "the crowned head"),
    (65, "head", eyes_at("head", 1300), "R", 0.16, (1835, 1527), "His eyes"),
    (66, "cross", (1222, 820, 2443), "S", 0.18, (1140, 900), "the arms held out"),
    (67, "head", (1750, 1700, 1400), "R", 0.16, (1750, 1650), "His face"),
    (68, "cross", (260, 560, 450), "S", 0.16, (204, 560), "the hand"),
    (69, "head", (1736, 2020, 900), "R", 0.14, (1736, 2000), "His mouth"),
    (70, None, None, "G", 0.0, None, "gap: darkness"),
    (71, "head", eyes_at("head", 1500), "S", 0.22, (1835, 1527), "His face, nearer"),
    (72, "cross", (1140, 990, 380), "R", 0.16, (1140, 990), "the crowned head, near"),
    (73, "murillo_g", eyes_at("murillo_g", 700), "R", 0.18, (1792, 1494), "the Child's face, eyes on His"),
    (74, "head", eyes_at("head", 1200), "S", 0.24, (1835, 1527), "His eyes"),
    (75, "murillo_g", eyes_at("murillo_g", 600), "R", 0.20, (1792, 1494), "the Child's eyes"),
    (76, "head", eyes_at("head", 1050), "S", 0.26, (1835, 1527), "His eyes, nearer"),
    (77, "murillo_g", eyes_at("murillo_g", 540), "R", 0.22, (1792, 1494), "the Child"),
    (78, None, None, "G", 0.0, None, "gap: the last darkness"),
    (79, "head", eyes_at("head", 2300), "L", 0.40, (1835, 1527), "the light begins: His whole face"),
    (80, "murillo_g", eyes_at("murillo_g", 1000), "L", 0.45, (1792, 1494), "the Child"),
    (81, "head", eyes_at("head", 1700), "L", 0.50, (1835, 1527), "Him, closer"),
    (82, "murillo_g", eyes_at("murillo_g", 800), "L", 0.56, (1792, 1494), "the Child, closer"),
    (83, "head", eyes_at("head", 1300), "L", 0.62, (1835, 1527), "Him, closer"),
    (84, "murillo_g", eyes_at("murillo_g", 640), "L", 0.68, (1792, 1494), "the Child, closer"),
    (85, "head", eyes_at("head", 1050), "L", 0.74, (1835, 1527), "Him, closer"),
    (86, "murillo_g", eyes_at("murillo_g", 520), "L", 0.80, (1792, 1494), "the Child's eyes"),
    (87, "head", eyes_at("head", 860), "L", 0.86, (1835, 1527), "His eyes"),
    (88, "murillo_g", eyes_at("murillo_g", 440), "L", 0.90, (1792, 1494), "the Child's eyes, closer"),
    (89, "head", eyes_at("head", 720), "L", 0.94, (1835, 1527), "His eyes, closer"),
    (90, "murillo_g", eyes_at("murillo_g", 390), "L", 0.97, (1792, 1494), "the Child's eyes, closest"),
    (91, "head", eyes_at("head", 600), "L", 1.00, (1835, 1527), "His eyes, closest"),
    (92, "head", (1730, 1505, 470), "L", 1.00, (1700, 1500), "one eye"),
    (93, "head", (1630, 1490, 380), "L", 1.00, (1630, 1487), "His eye, and the light takes the frame"),
]
assert [s[0] for s in SHOTS] == list(range(len(BEATS))), "one shot for every beat, in order"

STRIKE_PEAK = 0.95
DAWN = (BEATS[79], C.END)     # the light rising behind Him, from the bar line after the last gap to the last frame


def build():
    segs, strikes = [], []
    segs.append(dict(t0=0.0, t1=BEATS[0], key=None, kind="G"))
    for (k, key, crop, cut, expo, light, note) in SHOTS:
        t0, t1 = BEATS[k], beat_end(k)
        if k == 30:
            t1 = 18.24                       # the pause before the drop is black
        sg = dict(t0=t0, t1=t1, k=k, key=key, kind=cut, exp=expo, light=light, note=note)
        if key:
            cx, cy, w = crop
            if key == "greco":
                sg["gk"] = GRECO_AT.get((cx, cy))
            push = 0.035 if k < 79 else 0.06    # nearly still; the last part pushes in
            sg["a"] = (cx, cy, w)
            sg["b"] = (cx + 0.008 * w, cy - 0.004 * w, w * (1 - push))
        segs.append(sg)
        if k == 30:
            segs.append(dict(t0=18.24, t1=BEATS[31], key=None, kind="G"))
        strong = k in KICKS or k in ACCENTS
        if cut == "S":
            strikes.append((t0, STRIKE_PEAK if strong else 0.70, strong))
        elif cut == "R":
            strikes.append((t0, (0.85 if strong else 0.62) if expo > 0.07 else 0.40, False))
    strikes.append((C.BASS_IN[0], 0.70, True))        # the bass comes in: a flicker on the flock
    strikes.append((C.BASS_IN[1], 0.75, True))        # and again on the road
    return segs, strikes


SEGS, STRIKES = build()
CUTS = [s["t0"] for s in SEGS if s["t0"] > 0]


def shot_at(i):
    for sg in SEGS:
        if first(sg["t0"]) <= i < first(sg["t1"]):
            return sg
    return SEGS[-1]


def strike_at(i):
    """Lightning at frame i: two frames rising to the peak on the cut, a second flash three frames on, then decay."""
    v = 0.0
    for (te, peak, double) in STRIKES:
        fe = first(te)
        d = i - fe
        if d < -2:
            continue
        if d == -2:
            x = 0.30 * peak
        elif d == -1:
            x = 0.65 * peak
        elif d == 0:
            x = peak
        else:
            x = peak * np.exp(-d / (0.085 * FPS))
            if double and 3 <= d <= 5:
                x = max(x, peak * (0.75, 0.55, 0.30)[d - 3])
        v = max(v, x)
    return v


def white_at(i):
    """The drop: two frames at white, then the white falls away over a fifth of a second."""
    fe = first(C.DROP)
    d = i - fe
    if d < 0:
        return 0.0
    if d < 2:
        return 1.0
    return float(np.exp(-(d - 1) / (0.07 * FPS)))


def exposure(sg, t):
    e = sg["exp"]
    if sg["kind"] == "R":    # revealed by the strike, then the dark takes it back
        return e + (1.0 - e) * float(np.exp(-(t - sg["t0"]) / 0.16))
    return e


def dawn(t):
    a, b = DAWN
    return 0.0 if t < a else min(1.0, (t - a) / (b - a))


def grade(x, sg, t, geo, i):
    key = sg["key"]
    lk = LOOK[key]
    g = x[..., 0]
    if key == "greco":
        g = C.lum(x)
    g = np.power(np.clip(g, 0, 1), lk["gamma"])
    if lk["soft"] > 0:
        g = cv2.GaussianBlur(g, (0, 0), lk["soft"])
    if sg["light"]:
        u0, v0 = C.to_screen(geo, OW, OH, *sg["light"])
    else:
        u0, v0 = OW / 2, OH / 2
    m = C.pool(OW, OH, u0, v0, lk["r"], lk["floor"]) * C.vignette(OW, OH)
    gain = lk["gain"]
    if key == "greco":
        gain *= GRECO_GAIN.get(sg.get("gk"), 1.0)
    g = np.clip(g * m * gain * exposure(sg, t), 0, 1)
    x = np.repeat(g[..., None], 3, axis=2)
    x = C.strike(x, strike_at(i), top=True)
    dw = dawn(t)
    if dw > 0:
        # a soft light from above and behind Him, rising steadily, never rays; at the end it takes the frame
        uu, vv = C.grid(OW, OH)
        glow = np.exp(-(((uu - OW * 0.5) / (OW * 0.85)) ** 2 + ((vv + OH * 0.15) / (OH * 0.95)) ** 2))
        lift = (0.15 + 0.85 * dw) * dw
        x = 1 - (1 - x) * (1 - (lift * glow)[..., None])
        x = C.to_white(x, max(0.0, (dw - 0.72) / 0.28) ** 1.6 * 0.85)
    x = C.to_white(x, white_at(i))
    return x


def frame(i):
    t = i / FPS
    sg = shot_at(i)
    if sg["key"] is None or sg["kind"] == "G":
        x = np.zeros((OH, OW, 3), np.float32)
    else:
        u = C.clamp01((t - sg["t0"]) / max(1e-3, sg["t1"] - sg["t0"]))
        (ax, ay, aw), (bx, by, bw) = sg["a"], sg["b"]
        cx, cy, w = ax + (bx - ax) * u, ay + (by - ay) * u, aw + (bw - aw) * u
        j = C.hats_in(sg["t0"], i)
        if j:                          # a hi-hat: a cut closer into the same picture, towards its light
            lx, ly = sg["light"] or (cx, cy)
            cx, cy, w = cx + (lx - cx) * 0.5, cy + (ly - cy) * 0.5, w * (0.74 if j % 2 else 0.58)
        img, geo = C.view(sg["key"], cx, cy, w, OW, OH)
        x = grade(img, sg, t, geo, i)
    x = C.add_grain(x, i, 0.050)
    return C.in_band(C.u8(x), BAND)


SHEET = [f"b{k}" for k in (0, 4, 7, 12, 16, 19, 23, 26, 28, 31, 36, 42, 50, 55, 58, 63, 66, 73, 79, 84, 88, 91, 93)]

if __name__ == "__main__":
    C.main(NAME, frame, CUTS, SHEET)
