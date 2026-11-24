#!/usr/bin/env python3
"""Promo edit 1, the Light: the working pictures (the brief is ../edit-1-the-light.md).

From the files in <work>/raw (fetch each page in pictures.json at the width it names), makes:

  ink/<name>.png   each idol's face as hard black ink on white, as the reference's faces are: the museum's own
                   photograph, cut from its ground, its light and shade turned to black and white. Nothing is drawn.
  saul.png         Saul alone, cut out whole from Parmigianino's painting
  font.ttf         the app's sans (DM Sans), from the app's own font file
  mark.png         Purify's mark, the app's own file

  pip install "rembg[cpu]" opencv-python-headless fonttools brotli pillow numpy
  python3 docs/plans/promo-edits/edit-1/assets.py <repo root> <work dir>
"""
import json
import os
import shutil
import sys

import cv2
import numpy as np
from PIL import Image

ROOT, HOME = sys.argv[1], sys.argv[2]
HERE = os.path.dirname(os.path.abspath(__file__))
PICS = json.load(open(os.path.join(HERE, "pictures.json")))["pictures"]
RUN = [n for n, p in PICS.items() if "eyes" in p and "museum_page" in p]  # the statues; the engravings are ink already
os.makedirs(f"{HOME}/ink", exist_ok=True)
_session = {}


def cut(im, model="isnet-general-use"):
    """How much of each pixel is the thing and not its ground, 0 to 1."""
    from rembg import new_session, remove

    if model not in _session:
        _session[model] = new_session(model)
    return np.asarray(remove(im, session=_session[model], only_mask=True), dtype=np.float32) / 255


def ink(name):
    """The photograph's own light and shade as ink: an extended difference of Gaussians (Winnemoeller's XDoG),
    which keeps the dark masses whole and the edges as lines. The ground is white."""
    p = PICS[name]
    im = Image.open(f"{HOME}/raw/{name}.jpg").convert("RGB")
    a = cut(im)
    g = cv2.cvtColor(np.asarray(im), cv2.COLOR_RGB2GRAY).astype(np.float32) / 255
    (lx, ly), (rx, ry) = p["eyes"]
    d = float(np.hypot(rx - lx, ry - ly))
    # The tones of the face alone set black and white, so a dark bronze and a white marble come out alike.
    r = int(d * 1.6)
    cx, cy = int((lx + rx) / 2), int((ly + ry) / 2 + d * 0.5)
    face = g[max(0, cy - r) : cy + r, max(0, cx - r) : cx + r]
    lo, hi = np.percentile(face, 3), np.percentile(face, 97)
    g = np.clip((g - lo) / max(hi - lo, 1e-3), 0, 1)
    # The stone's grain and the bronze's pitting are smoothed away first, so the ink is masses and lines, not specks.
    g = cv2.bilateralFilter(g, 0, 0.12, d / 30)
    s = d / 42
    g1, g2 = cv2.GaussianBlur(g, (0, 0), s), cv2.GaussianBlur(g, (0, 0), s * 1.6)
    x = (1 + 12) * g1 - 12 * g2
    # Every face is given the same share of ink: the line between black and white is set where 40 parts in 100 of
    # the face fall dark.
    mid = float(np.percentile(x[max(0, cy - r) : cy + r, max(0, cx - r) : cx + r][a[max(0, cy - r) : cy + r, max(0, cx - r) : cx + r] > 0.5], 40))
    out = np.where(x >= mid, 1.0, 1.0 + np.tanh(14 * (x - mid)))
    out = cv2.GaussianBlur(np.clip(out, 0, 1), (0, 0), max(0.6, s * 0.25))
    out = out * a + (1 - a)
    Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8), "L").save(f"{HOME}/ink/{name}.png")
    print(f"  ink/{name}.png: {im.width}x{im.height}, eyes {d:.0f} apart")


def saul():
    """Saul alone. He lies in the lower half of the painting; the cut is the model's, and only the piece that holds
    his body is kept, so the horse and the landscape are left out."""
    im = Image.open(f"{HOME}/raw/saul.jpg").convert("RGB")
    W, H = im.size
    box = (0, int(H * 0.50), W, H)
    part = im.crop(box)
    # Two models' cuts joined: one keeps his body, the other his raised arm.
    a = np.maximum(cut(part), cut(part, "u2net"))
    n, lab, stats, _ = cv2.connectedComponentsWithStats((a > 0.5).astype(np.uint8))
    keep = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    a = a * (lab == keep)
    rgba = np.dstack([np.asarray(part), (a * 255).astype(np.uint8)])
    ys, xs = np.nonzero(a > 0.05)
    Image.fromarray(rgba, "RGBA").crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)).save(f"{HOME}/saul.png")
    print(f"  saul.png: {xs.max() - xs.min()}x{ys.max() - ys.min()}")


def font():
    from fontTools.ttLib import TTFont

    f = TTFont(f"{ROOT}/public/invest/fonts/dm-sans-latin.woff2")
    f.flavor = None
    f.save(f"{HOME}/font.ttf")
    shutil.copy(f"{ROOT}/public/purify-cross-mark.png", f"{HOME}/mark.png")
    print("  font.ttf, mark.png")


if __name__ == "__main__":
    for n in RUN:
        ink(n)
    saul()
    font()
