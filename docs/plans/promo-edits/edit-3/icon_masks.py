#!/usr/bin/env python3
"""Cut-outs for the icon film (icons.py): a figure cut out whole, never redrawn (CLAUDE.md, edits). GrabCut finds each
figure inside its box at half size; the icon's gold ground is told to it as ground for certain (it is one colour, Lab a
125 and b 168 within a few units, which the wings and robes are not), and each halo as figure for certain, since a halo
is the same gold. The mask is brought back to full size and its edge softened by a pixel and a half.
Boxes are source pixels of Galanopoulos's print files (.promo/edit-3/raw/modern/athonite/). Gabriel and the risen
Christ are not cut out: his wings lie over the house behind him, and Christ's glory (painted rays) round Him; nor the
Nativity's angels, whose hands are painted over the rock. Gold left in a mask outside a halo is taken out at the end.

  python -I -B icon_masks.py <work> [name ...]          writes <work>/raw/modern/masks/<name>.png and a check picture
"""
import os, sys
import numpy as np
import cv2

# name: icon, box, halos (x, y, r: figure), discs that are ground (x, y, r), boxes that are ground, boxes that are figure,
#       boxes left open (probable figure even inside a ground disc), dark: the deep dark round the figure is ground
FIGURES = {
    "lazarus": dict(icon="lazarus", box=(2600, 320, 3060, 1500), halos=[(2860, 463, 146)], dark=True,
                    bg=[(2880, 1300, 3060, 1500), (2990, 330, 3060, 1250), (2600, 330, 2690, 1000), (2600, 600, 2712, 960), (2700, 600, 2748, 750), (2700, 840, 2748, 940)],
                    fg=[(2755, 650, 2940, 1100), (2660, 1150, 2790, 1380)]),
    "angel_left": dict(icon="ascension", box=(60, 380, 920, 1345), halos=[(626, 828, 108)], discs=[(1155, 810, 482)],
                       open=[(850, 1120, 970, 1240)], fg=[(420, 960, 640, 1130), (560, 760, 690, 900)]),
    "angel_right": dict(icon="ascension", box=(1440, 380, 2300, 1345), halos=[(1726, 816, 105)], discs=[(1155, 810, 482)],
                        open=[(1390, 1120, 1520, 1240)], fg=[(1660, 960, 1880, 1130), (1660, 750, 1790, 890)]),
    "cross": dict(icon="crucifixion", box=(150, 200, 2260, 2440), halos=[(1139, 770, 150)],
                  bg=[(150, 900, 900, 2440), (1420, 900, 2260, 2440), (900, 1250, 1000, 2440), (900, 2000, 1075, 2440),
                      (1300, 1800, 1420, 2440)],
                  fg=[(320, 730, 2080, 820), (1080, 240, 1290, 660), (1010, 900, 1270, 1850), (1090, 2290, 1250, 2430)]),
}
GOLD_A, GOLD_B = 125.0, 168.0


def gold_ground(lab):
    L, a, b = lab[..., 0].astype(np.float32), lab[..., 1].astype(np.float32), lab[..., 2].astype(np.float32)
    g = ((np.abs(a - GOLD_A) < 4.5) & (np.abs(b - GOLD_B) < 7.5) & (L > 110)).astype(np.uint8)
    g = cv2.morphologyEx(g, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))        # specks inside a figure are not ground
    return g > 0


def cut(work, name):
    f = FIGURES[name]
    im = cv2.imread(os.path.join(work, "raw", "modern", "athonite", f["icon"] + ".jpg"), cv2.IMREAD_COLOR)
    H, W = im.shape[:2]
    sm_im = cv2.resize(im, (W // 2, H // 2), interpolation=cv2.INTER_AREA)
    lab = cv2.cvtColor(sm_im, cv2.COLOR_BGR2LAB)
    h, w = sm_im.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    m = np.full((h, w), cv2.GC_BGD, np.uint8)
    x0, y0, x1, y1 = f["box"]
    m[y0 // 2:y1 // 2, x0 // 2:x1 // 2] = cv2.GC_PR_FGD
    inbox = m == cv2.GC_PR_FGD
    m[inbox & gold_ground(lab)] = cv2.GC_BGD
    if f.get("dark"):                                   # the tomb's deep dark, not the thin dark lines of the drawing
        d = (lab[..., 0] < 75).astype(np.uint8)
        d = cv2.morphologyEx(d, cv2.MORPH_OPEN, np.ones((9, 9), np.uint8)) > 0
        m[inbox & d] = cv2.GC_BGD
    for (cx, cy, r) in f.get("discs", []):
        m[((xx - cx / 2) ** 2 + (yy - cy / 2) ** 2) < (r / 2) ** 2] = cv2.GC_BGD
    for (a, b, c, e) in f.get("bg", []):
        m[b // 2:e // 2, a // 2:c // 2] = cv2.GC_BGD
    for (a, b, c, e) in f.get("open", []):
        m[b // 2:e // 2, a // 2:c // 2] = cv2.GC_PR_FGD
    for (cx, cy, r) in f.get("halos", []):
        m[((xx - cx / 2) ** 2 + (yy - cy / 2) ** 2) < (r / 2 - 2) ** 2] = cv2.GC_FGD
    for (a, b, c, e) in f.get("fg", []):
        m[b // 2:e // 2, a // 2:c // 2] = cv2.GC_FGD
    bgm, fgm = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
    cv2.grabCut(sm_im, m, None, bgm, fgm, 8, cv2.GC_INIT_WITH_MASK)
    sm = np.where((m == cv2.GC_FGD) | (m == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    sm = cv2.morphologyEx(sm, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    n, lab_, stats, _ = cv2.connectedComponentsWithStats(sm)
    if n > 1:                                           # the figure is the largest piece; specks of the ground go
        keep = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
        sm = np.where(lab_ == keep, 255, 0).astype(np.uint8)
    sm = cv2.morphologyEx(sm, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    full = cv2.resize(sm, (W, H), interpolation=cv2.INTER_LINEAR)
    g = gold_ground(cv2.cvtColor(im, cv2.COLOR_BGR2LAB))
    g = cv2.morphologyEx(g.astype(np.uint8), cv2.MORPH_OPEN, np.ones((7, 7), np.uint8)) > 0
    Y, X = np.mgrid[0:H, 0:W]
    for (cx, cy, r) in f.get("halos", []):
        g[((X - cx) ** 2 + (Y - cy) ** 2) < (r - 3) ** 2] = False
    full[g] = 0
    full = np.where(full > 127, 255, 0).astype(np.uint8)
    n, lab_, stats, _ = cv2.connectedComponentsWithStats(full)
    if n > 1:
        keep = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
        full = np.where(lab_ == keep, 255, 0).astype(np.uint8)
    full = cv2.GaussianBlur(full, (0, 0), 1.5)
    out = os.path.join(work, "raw", "modern", "masks")
    os.makedirs(out, exist_ok=True)
    cv2.imwrite(os.path.join(out, name + ".png"), full)
    a = full.astype(np.float32)[..., None] / 255         # the check: the figure alone on grey, in its box
    chk = (im.astype(np.float32) * a + 70 * (1 - a))[y0:y1, x0:x1].astype(np.uint8)
    s = 700 / max(chk.shape[:2])
    cv2.imwrite(os.path.join(out, name + "_check.jpg"), cv2.resize(chk, None, fx=s, fy=s, interpolation=cv2.INTER_AREA))
    print(name, f"{(full > 127).mean() * 100:.2f}% of the icon")


if __name__ == "__main__":
    work = os.path.abspath(sys.argv[1])
    for n in sys.argv[2:] or FIGURES:
        cut(work, n)
