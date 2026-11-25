#!/usr/bin/env python3
"""The Cradle, version 2: the whisper. Reference 2 in its full style, with a cut on every beat.

Reference 2 (docs/plans/promo-edits/study-2026-11-25.md): old-master paintings in warm chiaroscuro, in a 4:3 frame
(on a phone, a band); each painting cut like film coverage of a scene, a close face, an insert of hands, a two-shot,
then the whole painting as the master, a reveal by widening; nothing held still; it opens in the middle of a move;
between paintings the blacks are crushed while the lights stay, a hard cut, and the next painting develops up out of
the dark; its peak is a woman looking straight into the lens; it ends on angels under black frames, then black, then
an editor's card. Here the card is Purify's own: the cross and the name, typed, no glow.

Its moves are kept and its weaknesses are not: every move runs at a steady speed (no arrival that eases in: CLAUDE.md,
"No bounce"); no push goes past a picture's own detail; the black frames come once a beat (about 1.7 a second, under
the three a second that light-sensitive viewers can take), not fifteen in a second.

The paintings, one to each phrase of the song, each covered beat by beat:
  the young Virgin praying (Zurbarán); the Mother and Child, her face and hands only (Murillo); the night of the
  Nativity (El Greco); Peter's denial by the fire (Caravaggio); at the drop, the Mother looking into the lens, then
  the Holy Family widening out (Ribera); the Cross, into the song's stop (Zurbarán); at Emmaus, known in the breaking
  of the bread (Velázquez); out of the silence, Our Lady of Vladimir, the Child's cheek on hers; the Murillo again,
  and now the Child looks into the lens; the angels with their banner (El Greco), black between them; the card.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import cv2
import core as C
from core import BEATS, KICKS, GAPS, PHRASES, FPS, first, beat_end

NAME = "the-cradle-v2-whisper"
OW, OH = 1080, 810
BAND = (0, (C.H - OH) // 2, OW, OH)     # reference 2's 4:3, as a phone shows it
C.add_source("cross_w", "met/437972.jpg", "gray")

# Each painting's light: gamma, gain, how far the pool of light reaches and its floor, colour.
LOOK = {
    "zurbaran": dict(gamma=0.92, gain=1.30, r=0.80, floor=0.55, sat=1.05),
    "murillo": dict(gamma=0.95, gain=1.18, r=0.80, floor=0.55, sat=1.05),
    "greco": dict(gamma=0.80, gain=1.45, r=0.75, floor=0.45, sat=1.00),
    "caravaggio": dict(gamma=0.72, gain=1.95, r=0.70, floor=0.40, sat=1.08),
    "ribera": dict(gamma=0.98, gain=1.08, r=0.85, floor=0.60, sat=1.02),
    "cross_w": dict(gamma=1.00, gain=1.10, r=0.80, floor=0.50, sat=1.00, tint=(1.0, 0.97, 0.93)),   # near neutral: no sepia (CLAUDE.md)
    "velazquez": dict(gamma=0.90, gain=1.30, r=0.80, floor=0.50, sat=1.04),
    "vladimir": dict(gamma=1.00, gain=1.12, r=0.80, floor=0.55, sat=0.84),
}

# Moves: each shot drifts at a steady speed, never still. in/out push or pull a share of the width; l/r/u/d pan.
MOVES = {"in": (0, 0, -0.09), "out": (0, 0, 0.09), "l": (-0.07, 0, -0.03), "r": (0.07, 0, -0.03),
         "u": (0, -0.06, -0.03), "d": (0, 0.06, -0.03), "in+": (0, 0, -0.14), "out+": (0, 0, 0.14)}

# (beat, painting, (centre x, centre y, width), move, note). A painting's first shot develops out of the dark; its
# last shot is crushed into it; a gap is quieter.
SHOTS = [
    # I. The young Virgin praying (Zurbarán). Close, then wider each kick, the whole at the phrase's end.
    (0, "zurbaran", (1653, 2120, 650), "u", "her hands, folded"),
    (1, "zurbaran", (1520, 1370, 640), "in", "her face, looking up"),
    (2, "zurbaran", (1476, 960, 900), "r", "angels' faces in the dark above her"),
    (3, "zurbaran", (1600, 1750, 1300), "out", "her face and her hands"),
    (4, "zurbaran", (2622, 1956, 820), "l", "the lilies and the roses"),
    (5, "zurbaran", (1525, 1330, 400), "in", "her eyes"),
    (6, "zurbaran", (1600, 2050, 2950), "out", "the whole room: the master"),
    # II. The Mother and Child (Murillo): her face and her hands; His face is kept for the end.
    (7, "murillo", (1545, 1115, 520), "in", "her eyes, lowered to Him"),
    (8, "murillo", (1440, 1440, 470), "r", "His hand on her breast"),
    (9, "murillo", (1500, 1160, 820), "l", "her face"),
    (10, "murillo", (1911, 2000, 720), "u", "her hand holding Him"),
    (11, "murillo", (1733, 2680, 620), "d", "His foot"),
    (12, "murillo", (689, 2667, 640), "r", "her other hand"),
    (13, "murillo", (1450, 1650, 1600), "out", "the Mother, and the Child turned from us"),
    (14, "murillo", (1420, 2000, 2550), "out", "gap: the master, crushed"),
    # III. The night of the Nativity (El Greco): the break, the bass gone; the Child the only light.
    (15, "greco", (1105, 2335, 420), "in", "the Child's face"),
    (16, "greco", (1530, 1585, 520), "l", "the Mother's face"),
    (17, "greco", (1310, 2200, 900), "r", "her hands over Him"),
    (18, "greco", (1790, 1650, 560), "in", "Joseph"),
    (19, "greco", (880, 1450, 700), "u", "a shepherd's face"),
    (20, "greco", (1300, 1900, 1500), "out", "the Mother, the Child and the shepherds"),
    (21, "greco", (1150, 650, 800), "d", "the angels with their banner"),
    (22, "greco", (1250, 2000, 2400), "out+", "the master, crushed"),
    # IV. Peter's denial by the fire (Caravaggio): "I know not the man." Into the pause before the drop.
    (23, "caravaggio", (3010, 900, 700), "in", "Peter's face"),
    (24, "caravaggio", (1580, 880, 620), "r", "the servant girl"),
    (25, "caravaggio", (2560, 1800, 820), "l", "his hands: not I"),
    (26, "caravaggio", (900, 760, 760), "u", "the soldier's helmet"),
    (27, "caravaggio", (2300, 1000, 2600), "out", "the girl and Peter"),
    (28, "caravaggio", (3000, 860, 420), "in", "Peter's eyes"),
    (29, "caravaggio", (1565, 850, 400), "in", "her eyes"),
    (30, "caravaggio", (1950, 1450, 3700), "out", "the master, crushed into the pause"),
    # V. The drop: the Mother looks into the lens (Ribera). Then the Holy Family, wider every kick.
    (31, "ribera", (1852, 1205, 500), "in", "the Mother's eyes, on us"),
    (32, "ribera", (1640, 1390, 600), "l", "the Child"),
    (33, "ribera", (1160, 1690, 700), "r", "Catherine kisses His hand"),
    (34, "ribera", (1750, 1300, 1150), "out", "the Mother and the Child"),
    (35, "ribera", (1817, 1764, 600), "u", "her hand holding Him"),
    (36, "ribera", (1160, 1560, 720), "l", "Catherine's face"),
    (37, "ribera", (2109, 2337, 620), "r", "His foot"),
    (38, "ribera", (1860, 1250, 820), "in", "gap: the Mother's face"),
    (39, "ribera", (2254, 400, 820), "d", "Joseph"),
    (40, "ribera", (455, 724, 700), "r", "Anne"),
    (41, "ribera", (300, 1500, 800), "u", "Anne's roses and the fruit"),
    (42, "ribera", (1450, 1500, 1750), "out", "the Mother, the Child, Catherine"),
    (43, "ribera", (2481, 3267, 820), "l", "the basket of linen"),
    (44, "ribera", (1852, 1220, 700), "in", "the Mother's eyes again"),
    (45, "ribera", (1380, 1860, 2700), "out", "the whole family: the master"),
    (46, "ribera", (1380, 1860, 2700), "out", "gap: the master, crushed"),
    # VI. The Cross (Zurbarán), into the song's stop.
    (47, "cross_w", (1140, 1000, 620), "in", "His head, crowned"),
    (48, "cross_w", (2226, 540, 600), "l", "His hand"),
    (49, "cross_w", (1221, 360, 700), "r", "the title over Him"),
    (50, "cross_w", (1150, 1000, 1150), "out", "His head and shoulders"),
    (51, "cross_w", (330, 620, 560), "r", "His other hand"),
    (52, "cross_w", (1150, 1700, 1400), "d", "His body and the white cloth"),
    (53, "cross_w", (1165, 2950, 700), "u", "His feet: the song stops"),
    (54, "cross_w", (1222, 1500, 2443), "out", "the stop: the whole Cross, crushed"),
    # VII. Emmaus (Velázquez): known in the breaking of the bread. Into the silence.
    (55, "velazquez", (800, 760, 800), "in", "His face"),
    (56, "velazquez", (1080, 1440, 700), "l", "a hand thrown up"),
    (57, "velazquez", (2080, 760, 720), "r", "the one who sees"),
    (58, "velazquez", (1470, 2010, 800), "u", "His hands, the bread"),
    (59, "velazquez", (2700, 1290, 760), "l", "the other, turning"),
    (60, "velazquez", (1770, 1650, 3400), "out", "the master, crushed into the silence"),
    (61, "velazquez", (820, 700, 440), "in", "silence: His eyes, developing and crushed"),
    (62, "vladimir", (2330, 1960, 900), "in", "silence: her eye, out of the dark"),
    # VIII. Our Lady of Vladimir: the Child's cheek on hers. The cover of silver, wider every kick.
    (63, "vladimir", (2330, 1960, 700), "in", "her eye"),
    (64, "vladimir", (2250, 2230, 560), "r", "the Child's cheek on hers"),
    (65, "vladimir", (1650, 1600, 800), "u", "the enamel"),
    (66, "vladimir", (2420, 2100, 1150), "out", "both faces"),
    (67, "vladimir", (2980, 2850, 800), "l", "the Child's hand"),
    (68, "vladimir", (1650, 3900, 900), "u", "her hand"),
    (69, "vladimir", (2640, 3800, 700), "r", "a stone in the silver"),
    (70, "vladimir", (2380, 1900, 520), "in", "gap: her eye, quiet"),
    (71, "vladimir", (2640, 2700, 2600), "out", "the two of them"),
    (72, "vladimir", (2900, 4560, 900), "l", "the Child's foot"),
    (73, "vladimir", (1200, 1250, 700), "r", "a medallion"),
    (74, "vladimir", (2700, 2600, 1150), "in", "the Child"),
    (75, "vladimir", (600, 3000, 1000), "u", "the silver flowers"),
    (76, "vladimir", (2650, 3500, 1800), "out", "her arm round Him"),
    (77, "vladimir", (2250, 2230, 640), "in", "the cheeks, again"),
    (78, "vladimir", (2635, 3000, 3375), "out", "gap: the whole icon, crushed"),
    # IX. The Murillo again, and now the Child looks into the lens.
    (79, "murillo", (1792, 1494, 460), "in", "His eyes, on us"),
    (80, "murillo", (1545, 1115, 460), "r", "her eyes, on Him"),
    (81, "murillo", (1550, 1460, 520), "l", "His hand on her"),
    (82, "murillo", (1790, 1530, 760), "in", "His face"),
    (83, "murillo", (1530, 1160, 700), "r", "her face"),
    (84, "murillo", (1650, 1360, 1350), "out", "the two of them"),
    (85, "murillo", (1550, 1750, 2050), "out", "the Mother and Child"),
    (86, "murillo", (1420, 2000, 2550), "out", "gap: the master, crushed"),
    # X. The angels (El Greco), black between them, once a beat. Then the card.
    (87, "greco", (1150, 650, 800), "in", "the angels with their banner"),
    (88, "greco", (1190, 610, 380), "r", "an angel's face"),
    (89, "zurbaran", (1476, 930, 820), "r", "the angels' faces in her dark, again"),
    (90, "greco", (930, 660, 440), "in", "another angel"),
    (91, "greco", (1170, 470, 620), "r", "their banner: we praise thee, we bless thee"),
    (92, "greco", (1150, 700, 1100), "out", "the angels together"),
    (93, None, None, None, "the card: the cross, and the name typed"),
]
assert [s[0] for s in SHOTS] == list(range(len(BEATS))), "one shot for every beat, in order"

FIRSTS = {0: (0.70, 0.45), 7: (0.70, 0.45), 15: (0.70, 0.45), 23: (0.70, 0.45), 47: (0.70, 0.45), 55: (0.40, 0.35),
          63: (0.45, 0.30), 79: (0.60, 0.20)}   # develops out of the dark: (how far it starts crushed, over how long)
# (the drop is the one painting that does not develop: the Mother's eyes are simply there, on the beat)
GAIN = {2: 1.7, 89: 1.7}                                   # the angels' faces in Zurbarán's dark are faint paint
CRUSHED = {6, 14, 22, 30, 46, 54, 60, 78, 86}       # a painting's last shot is crushed into the dark
ANGELS = range(87, 93)                              # each shown on its beat, black for the last nine frames before the next


def build():
    segs = []
    # it opens in the middle of a move: a fast pan across the room to her hands, at a steady speed
    segs.append(dict(t0=0.0, t1=BEATS[0], key="zurbaran", a=(2500, 1250, 1500), b=(1800, 2000, 900), k=-1,
                     note="the opening move", blur=True))
    for (k, key, crop, mv, note) in SHOTS:
        t0, t1 = BEATS[k], beat_end(k)
        sg = dict(t0=t0, t1=t1, k=k, key=key, note=note)
        if key:
            cx, cy, w = crop
            dx, dy, dz = MOVES[mv]
            sg["a"] = (cx, cy, w)
            sg["b"] = (cx + dx * w, cy + dy * w, w * (1 + dz))
        if k == 30:
            sg["t1"] = 18.24
        segs.append(sg)
        if k == 30:
            segs.append(dict(t0=18.24, t1=BEATS[31], key=None, k=-2, note="the pause before the drop"))
    return segs


SEGS = build()
CUTS = [s["t0"] for s in SEGS if s["t0"] > 0]


def shot_at(i):
    for sg in SEGS:
        if first(sg["t0"]) <= i < first(sg["t1"]):
            return sg
    return SEGS[-1]


def crush_amount(sg, t):
    """Reference 2's crush and develop, and the quiet of a gap."""
    k = sg["k"]
    c = 0.0
    if k in FIRSTS:                       # develops out of the dark
        c0, dur = FIRSTS[k]
        c = max(c, c0 * (1 - C.clamp01((t - sg["t0"]) / dur)))
    if k in CRUSHED:                      # blacks pulled down while the lights stay, to black at the shot's end
        u = C.clamp01((t - sg["t0"]) / max(1e-3, sg["t1"] - sg["t0"]))
        c = max(c, 0.70 * C.clamp01((u - 0.15) / 0.75))     # the lights stay to the cut
    if k in GAPS and k not in CRUSHED:
        c = max(c, 0.30)
    if k == 53 and t >= C.STOP[0]:        # the song stops on His feet
        c = max(c, C.clamp01((t - C.STOP[0]) / 0.12) * 0.6)
    if k == 60 and t >= C.SILENCE[0]:
        c = max(c, 0.80 * C.clamp01((t - C.SILENCE[0]) / 0.30))
    if k == 61:                           # in the silence: develops, then crushed again
        u = t - sg["t0"]
        c = max(0.0, 0.55 - u / 0.30) if u < 0.30 else 0.80 * C.clamp01((u - 0.32) / 0.22)
    if k == 62:                           # her eye comes slowly out of the dark
        c = 0.62 - 0.30 * C.clamp01((t - sg["t0"]) / (sg["t1"] - sg["t0"]))
    return c


def grade(x, sg, t, geo):
    lk = LOOK[sg["key"]]
    x = np.power(np.clip(x, 0, 1), lk["gamma"])
    if "tint" in lk:
        x = C.lum(x)[..., None] * np.float32(lk["tint"])
    L = C.lum(x)[..., None]
    x = L + lk["sat"] * (x - L)
    x = x * np.float32((1.04, 1.00, 0.91))                       # warm
    x = np.clip((x - 0.5) * 1.06 + 0.5, 0, 1)                    # a little more contrast
    m = C.pool(OW, OH, OW / 2, OH * 0.46, lk["r"], lk["floor"]) * C.vignette(OW, OH, 0.34, 0.5)
    x = np.clip(x * (m * lk["gain"] * GAIN.get(sg["k"], 1.0))[..., None], 0, 1)
    return C.crush_lights(x, crush_amount(sg, t))


def picture(sg, t):
    u = C.clamp01((t - sg["t0"]) / max(1e-3, sg["t1"] - sg["t0"]))
    (ax, ay, aw), (bx, by, bw) = sg["a"], sg["b"]
    return C.view(sg["key"], ax + (bx - ax) * u, ay + (by - ay) * u, aw + (bw - aw) * u, OW, OH)


def frame(i):
    t = i / FPS
    sg = shot_at(i)
    k = sg["k"]
    if k == 93 or (k == -2):
        if k == 93:
            return C.end_card(t, BEATS[93], BEATS[93] + 0.15)
        return np.zeros((C.H, C.W, 3), np.uint8)
    if k in ANGELS and i >= first(sg["t1"]) - 9:                 # the black between the angels, just before each beat
        return np.zeros((C.H, C.W, 3), np.uint8)
    if sg.get("blur"):                                           # the opening move, blurred by its own speed
        acc = None
        for s in range(10):
            ts = t + (s / 9 - 0.5) / FPS
            img, geo = picture(sg, ts)
            acc = img if acc is None else acc + img
        img = acc / 10
        x = grade(img, dict(sg, k=-1), t, geo)
    else:
        img, geo = picture(sg, t)
        x = grade(img, sg, t, geo)
    x = C.add_grain(x, i, 0.022)
    return C.in_band(C.u8(x), BAND)


SHEET = [f"b{k}" for k in (0, 3, 6, 7, 13, 15, 20, 23, 27, 31, 34, 42, 45, 47, 52, 55, 58, 63, 66, 71, 79, 84, 87, 93)]

if __name__ == "__main__":
    C.main(NAME, frame, CUTS, SHEET)
