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

The paintings, at his word (2026-11-25, living-paintings-plan.md), the Gospel in the song's phrases, each covered
beat by beat and moved through in depth (depth_maps.py; the Byzantine-manner Berlinghiero keeps a plain camera move):
  the Annunciation twice, as two cameras on one scene (Luca Giordano, Philippe de Champaigne); the Mother and Child
  (Berlinghiero); the Flight into Egypt (Maratti, Giordano); on the drop the Mother looking into the lens, then the Holy
  Family widening (Ribera); the Forerunner preaching (Preti) and the Baptism by night (Bassano) into the song's stop;
  the Baptism again (Bourdon), the Wilderness (Moretto), the blind man healed (El Greco) into the silence; Peter's
  denial and his tears (Caravaggio, Ribera); the Cross (Zurbarán); the Lamentation (Domenichino); the angels, black
  between them; the card. Nothing titled or composed as an Adoration, no saint the East does not share.
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
# The fifteen at his word (2026-11-25, living-paintings-plan.md): The Met, European Paintings, public domain.
for _k, _p in {"giordano_ann": "met2/436502.jpg", "champaigne": "met2/438724.jpg", "maratti": "met2/816629.jpg",
               "giordano_flight": "met2/436503.jpg", "bassano": "met2/440393.jpg", "bourdon": "met2/435755.jpg",
               "domenichino": "met2/439553.jpg", "moretto": "met2/437157.jpg", "ribera_peter": "met2/441971.jpg",
               "greco_blind": "met2/436572.jpg", "preti": "met2/438824.jpg", "berlinghiero": "met_435658.jpg"}.items():
    C.add_source(_k, _p, "rgb")
C.PLATES.update({"greco_blind": (200, 180, 3820, 2950), "moretto": (60, 60, 3940, 3290)})
# every crop inside the painting, clear of its frame (sizes in pixels as The Met serves them)
_INSET = {"giordano_ann": (2926, 4000), "champaigne": (3741, 3658), "maratti": (3214, 4000), "giordano_flight": (3188, 4000),
          "bassano": (3143, 3857), "bourdon": (2880, 3722), "domenichino": (2844, 3815), "ribera_peter": (2721, 3874),
          "preti": (2760, 3838), "berlinghiero": (2792, 4000)}
C.PLATES.update({k: (int(w * 0.035), int(h * 0.03), int(w * 0.965), int(h * 0.97)) for k, (w, h) in _INSET.items()})

# Each painting's light: gamma, gain, how far the pool of light reaches and its floor, colour.
LOOK = {
    "ribera": dict(gamma=0.98, gain=1.08, r=0.85, floor=0.60, sat=1.02),
    "caravaggio": dict(gamma=0.72, gain=1.95, r=0.70, floor=0.40, sat=1.08),
    "cross_w": dict(gamma=1.00, gain=1.10, r=0.80, floor=0.50, sat=1.00, tint=(1.0, 0.97, 0.93)),   # near neutral: no sepia (CLAUDE.md)
    "giordano_ann": dict(gamma=0.92, gain=1.25, r=0.80, floor=0.55, sat=1.00),
    "champaigne": dict(gamma=1.00, gain=1.05, r=0.85, floor=0.60, sat=0.95),
    "maratti": dict(gamma=0.95, gain=1.10, r=0.85, floor=0.60, sat=0.95),
    "giordano_flight": dict(gamma=0.88, gain=1.35, r=0.80, floor=0.55, sat=1.00),
    "bassano": dict(gamma=0.70, gain=2.00, r=0.75, floor=0.45, sat=1.05),
    "bourdon": dict(gamma=0.95, gain=1.12, r=0.85, floor=0.60, sat=0.95),
    "domenichino": dict(gamma=0.98, gain=1.05, r=0.85, floor=0.60, sat=0.95),
    "moretto": dict(gamma=0.92, gain=1.20, r=0.80, floor=0.55, sat=1.00),
    "ribera_peter": dict(gamma=0.80, gain=1.60, r=0.75, floor=0.50, sat=1.05),
    "greco_blind": dict(gamma=0.95, gain=1.10, r=0.85, floor=0.60, sat=0.95),
    "preti": dict(gamma=0.82, gain=1.50, r=0.75, floor=0.50, sat=1.05),
    "berlinghiero": dict(gamma=0.95, gain=1.10, r=0.85, floor=0.60, sat=0.90),
}

# Moves: each shot drifts at a steady speed, never still. in/out push or pull a share of the width; l/r/u/d pan.
MOVES = {"in": (0, 0, -0.09), "out": (0, 0, 0.09), "l": (-0.07, 0, -0.03), "r": (0.07, 0, -0.03),
         "u": (0, -0.06, -0.03), "d": (0, 0.06, -0.03), "in+": (0, 0, -0.14), "out+": (0, 0, 0.14)}

# (beat, painting, (centre x, centre y, width), move, note). A painting's first shot develops out of the dark; its
# last shot is crushed into it; a gap is quieter.
SHOTS = [
    # I. The Annunciation, twice, as two cameras on one scene: Luca Giordano, then Philippe de Champaigne.
    (0, "giordano_ann", (1800, 1540, 650), "in", "the Mother's face"),
    (1, "giordano_ann", (760, 860, 700), "l", "Gabriel"),
    (2, "giordano_ann", (1040, 1600, 700), "r", "the lily he brings"),
    (3, "giordano_ann", (1460, 1600, 2600), "out", "the angel and the Mother"),
    (4, "giordano_ann", (1900, 1830, 600), "u", "her hand on her breast"),
    (5, "giordano_ann", (1240, 2110, 600), "r", "her open hand"),
    (6, "giordano_ann", (1463, 2000, 2850), "out", "the master, crushed"),
    (7, "champaigne", (2850, 900, 800), "in", "Gabriel, the second camera"),
    (8, "champaigne", (1180, 1330, 650), "l", "the Mother's face"),
    (9, "champaigne", (2280, 1500, 700), "r", "his hand: hail"),
    (10, "champaigne", (1450, 1700, 1300), "out", "the Mother and her hands"),
    (11, "champaigne", (3000, 1500, 700), "u", "the lily"),
    (12, "champaigne", (1100, 330, 900), "d", "the angels above (clear of the shaft of light)"),
    (13, "champaigne", (1215, 1330, 420), "in", "her eyes"),
    (14, "champaigne", (1250, 2300, 1800), "out", "gap: the Mother kneeling, crushed"),
    # II. The break: the Mother and Child, Berlinghiero, in the Byzantine manner: a plain camera move only.
    (15, "berlinghiero", (1886, 1600, 700), "in", "her face"),
    (16, "berlinghiero", (1886, 1580, 420), "in", "her eyes"),
    (17, "berlinghiero", (1800, 2200, 1400), "u", "the Child on her arm"),
    (18, "berlinghiero", (1300, 2500, 900), "r", "her hand, showing Him"),
    (19, "berlinghiero", (1396, 2000, 2650), "out", "the whole panel"),
    (20, "berlinghiero", (1886, 1620, 900), "in", "the Child's face beside hers"),
    (21, "berlinghiero", (1886, 1300, 1200), "u", "the gold and her halo"),
    (22, "berlinghiero", (1396, 2000, 2700), "out+", "the master, crushed"),
    # III. The Flight into Egypt: Maratti, then Giordano, into the pause before the drop.
    (23, "maratti", (1200, 1800, 650), "in", "the Mother's face"),
    (24, "maratti", (1330, 2000, 650), "r", "the Child"),
    (25, "maratti", (2000, 2000, 700), "l", "Joseph"),
    (26, "maratti", (1650, 700, 1200), "d", "the angels above them, crushed"),
    (27, "giordano_flight", (2100, 1850, 1100), "in", "the Mother and the Child, resting"),
    (28, "giordano_flight", (1650, 1500, 700), "r", "Joseph"),
    (29, "giordano_flight", (2400, 1000, 1000), "l", "the angels over them"),
    (30, "giordano_flight", (1594, 2200, 3000), "out", "the master, crushed into the pause"),
    # IV. The drop: the Mother looks into the lens (Ribera). Then the Holy Family, wider every kick.
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
    # V. The Forerunner preaching (Preti), the Baptism by night (Bassano), into the song's stop.
    (47, "preti", (1950, 900, 650), "in", "John's face"),
    (48, "preti", (700, 700, 900), "r", "his arm raised"),
    (49, "preti", (2350, 2950, 800), "u", "the lamb, crushed"),
    (50, "bassano", (1800, 2000, 1000), "in", "Christ in the Jordan"),
    (51, "bassano", (2100, 1450, 1200), "l", "John's arm and the water"),
    (52, "bassano", (500, 1800, 1000), "r", "the angels waiting"),
    (53, "bassano", (1800, 2300, 900), "u", "Christ: the song stops"),
    (54, "bassano", (1572, 2200, 3000), "out", "the stop: the master, crushed"),
    # VI. The Baptism again (Bourdon), the Wilderness (Moretto), the blind man healed (El Greco) into the silence.
    (55, "bourdon", (1180, 1420, 650), "in", "Christ's face"),
    (56, "bourdon", (1700, 1050, 700), "l", "John"),
    (57, "bourdon", (2200, 1800, 1100), "r", "the angels with the cloth, crushed"),
    (58, "moretto", (3150, 1250, 800), "in", "Christ in the wilderness"),
    (59, "moretto", (1800, 1700, 1400), "l", "the wild beasts"),
    (60, "moretto", (3550, 650, 900), "d", "the angels who served Him, crushed into the silence"),
    (61, "greco_blind", (1720, 1330, 650), "in", "silence: Christ's face, developing and crushed"),
    (62, "greco_blind", (1350, 1700, 700), "in", "silence: the blind man, out of the dark"),
    # VII. Peter's denial and his tears (Caravaggio, Ribera).
    (63, "caravaggio", (3010, 900, 700), "in", "Peter's face"),
    (64, "caravaggio", (1580, 880, 620), "r", "the servant girl"),
    (65, "caravaggio", (2560, 1800, 820), "l", "his hands: not I"),
    (66, "caravaggio", (2300, 1000, 2600), "out", "the girl and Peter, crushed"),
    (67, "ribera_peter", (1000, 1120, 650), "in", "Peter weeps"),
    (68, "ribera_peter", (750, 1980, 700), "u", "his hands"),
    (69, "ribera_peter", (1360, 2000, 2400), "out", "Peter, the whole"),
    (70, "ribera_peter", (1000, 1080, 400), "in", "gap: his eyes, crushed"),
    # VIII. The Cross (Zurbarán).
    (71, "cross_w", (1140, 1000, 620), "in", "His head, crowned"),
    (72, "cross_w", (2226, 540, 600), "l", "His hand"),
    (73, "cross_w", (1221, 360, 700), "r", "the title over Him"),
    (74, "cross_w", (1150, 1000, 1150), "out", "His head and shoulders"),
    (75, "cross_w", (330, 620, 560), "r", "His other hand"),
    (76, "cross_w", (1150, 1700, 1400), "d", "His body and the white cloth"),
    (77, "cross_w", (1165, 2950, 700), "u", "His feet"),
    (78, "cross_w", (1222, 1500, 2443), "out", "gap: the whole Cross, crushed"),
    # IX. The Lamentation (Domenichino).
    (79, "domenichino", (1350, 1350, 650), "in", "the Mother's face"),
    (80, "domenichino", (650, 1900, 650), "r", "His face"),
    (81, "domenichino", (2150, 1050, 650), "l", "a woman's grief"),
    (82, "domenichino", (1000, 1700, 1300), "out", "the Mother holds Him"),
    (83, "domenichino", (700, 950, 700), "r", "Joseph of Arimathea"),
    (84, "domenichino", (300, 3500, 800), "u", "the crown of thorns and the nails"),
    (85, "domenichino", (1422, 1908, 2800), "out", "the whole"),
    (86, "domenichino", (1422, 1908, 2800), "out", "gap: the master, crushed"),
    # X. The angels (Giordano, Maratti, Domenichino, Bourdon), black between them, once a beat. Then the card.
    (87, "giordano_ann", (2300, 500, 800), "in", "angels over the Annunciation"),
    (88, "maratti", (1450, 650, 800), "r", "angels over the Flight"),
    (89, "domenichino", (1250, 2950, 700), "l", "an angel at the Lamentation"),
    (90, "bourdon", (2350, 1550, 800), "in", "an angel at the Baptism"),
    (91, "maratti", (2950, 1150, 700), "r", "an angel in the tree"),
    (92, "giordano_ann", (760, 860, 900), "out", "Gabriel"),
    (93, None, None, None, "the card: the cross, and the name typed"),
]
assert [s[0] for s in SHOTS] == list(range(len(BEATS))), "one shot for every beat, in order"

FIRSTS = {0: (0.70, 0.45), 7: (0.70, 0.45), 15: (0.40, 0.35), 23: (0.40, 0.35), 27: (0.45, 0.25), 47: (0.70, 0.45),
          50: (0.45, 0.25), 55: (0.40, 0.35), 58: (0.45, 0.25), 63: (0.45, 0.30), 67: (0.45, 0.25), 71: (0.60, 0.35),
          79: (0.60, 0.30)}   # develops out of the dark: (how far it starts crushed, over how long)
# (the drop is the one painting that does not develop: the Mother's eyes are simply there, on the beat)
GAIN = {}                                   # the angels' faces in Zurbarán's dark are faint paint
CRUSHED = {6, 14, 22, 26, 30, 46, 49, 54, 57, 60, 66, 70, 78, 86}       # a painting's last shot is crushed into the dark
ANGELS = range(87, 93)                              # each shown on its beat, black for the last nine frames before the next


def build():
    segs = []
    # it opens in the middle of a move: a fast pan across the room to her hands, at a steady speed
    segs.append(dict(t0=0.0, t1=BEATS[0], key="giordano_ann", a=(2300, 900, 1500), b=(1800, 1500, 900), k=-1,
                     note="the opening move", blur=True))
    for (k, key, crop, mv, note) in SHOTS:
        t0, t1 = BEATS[k], beat_end(k)
        sg = dict(t0=t0, t1=t1, k=k, key=key, note=note)
        if key:
            cx, cy, w = crop
            dx, dy, dz = MOVES[mv]
            sg["a"] = (cx, cy, w)
            sg["b"] = (cx + dx * w * 0.5, cy + dy * w * 0.5, w * (1 + dz * 0.5))   # half the move is the camera's;
            sg["mv"] = mv                                                     # the rest is in depth (depth_move)
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
        c = 0.42 - 0.20 * C.clamp01((t - sg["t0"]) / (sg["t1"] - sg["t0"]))
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


# ---------------------------------------------------------------- the 2.5D move (his choice: "No AI, free 2.5D")
# Each painting's depth (depth_maps.py, Depth Anything V2 Small): the camera moves through the scene, so what is near
# slides against what is far, at a steady speed. An icon has no depth map and keeps a plain camera move.
_depth = {}


def depth_of(key):
    if key not in _depth:
        p = os.path.join(C.WORK, "raw", "depth", f"{key}.png")
        _depth[key] = cv2.imread(p, cv2.IMREAD_UNCHANGED).astype(np.float32) / 65535 if os.path.exists(p) else None
    return _depth[key]


PARALLAX = {"l": (-1, 0, 0), "r": (1, 0, 0), "u": (0, -1, 0), "d": (0, 1, 0), "in": (0, 0, 1), "out": (0, 0, -1),
            "in+": (0, 0, 1.5), "out+": (0, 0, -1.5)}


def depth_move(img, sg, t, geo):
    d = depth_of(sg.get("key")) if sg.get("mv") else None
    if d is None:
        return img
    cx, cy, s = geo
    M = np.float32([[s / 4, 0, (cx - OW / 2 * s) / 4], [0, s / 4, (cy - OH / 2 * s) / 4]])
    dv = cv2.warpAffine(d, M, (OW, OH), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REPLICATE)
    focus = float(np.median(dv[OH // 3:2 * OH // 3, OW // 3:2 * OW // 3]))
    u = C.clamp01((t - sg["t0"]) / max(1e-3, sg["t1"] - sg["t0"]))
    ax, ay, az = PARALLAX[sg["mv"]]
    rel = dv - focus                                   # near is positive, far negative, the subject still
    uu, vv = C.grid(OW, OH)
    A = 100.0 * u                                       # pixels at a full step of depth, growing at a steady speed
    Z = 0.15 * u
    mx = uu - (ax * A * rel + az * Z * rel * (uu - OW / 2))
    my = vv - (ay * A * rel + az * Z * rel * (vv - OH / 2))
    return cv2.remap(img, mx.astype(np.float32), my.astype(np.float32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)


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
        j = C.hats_in(sg["t0"], i) if k >= 0 else 0
        if j:                                                    # a hi-hat: an insert of the same painting
            u = C.clamp01((t - sg["t0"]) / max(1e-3, sg["t1"] - sg["t0"]))
            (ax, ay, aw), (bx, by, bw) = sg["a"], sg["b"]
            cx, cy, w = ax + (bx - ax) * u, ay + (by - ay) * u, aw + (bw - aw) * u
            side = 0.12 if j % 2 else -0.12
            img, geo = C.view(sg["key"], cx + side * w, cy, w * (0.72 if j % 2 else 0.56), OW, OH)
        else:
            img, geo = picture(sg, t)
        img = depth_move(img, sg, t, geo)
        x = grade(img, sg, t, geo)
    x = C.add_grain(x, i, 0.022)
    return C.in_band(C.u8(x), BAND)


SHEET = [f"b{k}" for k in (0, 3, 6, 7, 13, 15, 20, 23, 27, 31, 34, 42, 45, 47, 52, 55, 58, 63, 66, 71, 79, 84, 87, 93)]

if __name__ == "__main__":
    C.main(NAME, frame, CUTS, SHEET)
