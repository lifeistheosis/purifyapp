#!/usr/bin/env python3
"""The Christ edit's pictures (README.md).

Makes, from the icons listed in pictures.json (each a public-domain work; the file says what it is, where it is
held and where the picture came from):

  pic/<name>.jpg     a working copy of each icon, no wider than 2400
  pic/marks.json     where His eyes are in each working copy (read off by hand, then set on the dark of each eye),
                     and each halo's circle
  fig-b.png          the figure that rises in the dome: Christ cut from the Sinai Pantocrator, with His halo
  fig-a.png          the figure that stands first and falls back: Christ cut from the second Pantocrator, with His halo
  font.ttf           the app's own sans (DM Sans), taken from the export's own font file

Nothing of any icon is redrawn. A cut-out is the icon's own pixels with the ground made clear: two models' masks
joined, and the halo put back as a true circle since neither model keeps it whole.

  pip install rembg opencv-python-headless fonttools brotli
  python3 docs/plans/v1.9/video/release/christ-edit/assets.py <repo root> <work dir>
"""
import json
import os
import sys

import cv2
import numpy as np
from PIL import Image

ROOT, HOME = sys.argv[1], sys.argv[2]
HERE = os.path.dirname(os.path.abspath(__file__))
PICS = json.load(open(os.path.join(HERE, "pictures.json")))["pictures"]
os.makedirs(f"{HOME}/pic", exist_ok=True)


def working_copies():
    marks = {}
    for name, p in PICS.items():
        im = Image.open(f"{HOME}/raw/{name}.jpg").convert("RGB")
        k = min(1.0, 2400 / im.width)
        if k < 1:
            im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
        im.save(f"{HOME}/pic/{name}.jpg", quality=93)
        g = cv2.GaussianBlur(cv2.cvtColor(np.asarray(im), cv2.COLOR_RGB2GRAY).astype(np.float32), (0, 0), 2.0)
        eyes = []
        d = np.hypot(p["eyes"][1][0] - p["eyes"][0][0], p["eyes"][1][1] - p["eyes"][0][1]) * k
        for ex, ey in p["eyes"]:
            ex, ey = ex * k, ey * k
            # The eye is set on the middle of the darkest part within a fifth of the eyes' distance of the hand reading.
            r = max(6, int(d * 0.2))
            x0, y0 = int(ex - r), int(ey - r)
            win = g[y0 : y0 + 2 * r, x0 : x0 + 2 * r]
            dark = win <= np.percentile(win, 14)
            ys, xs = np.nonzero(dark)
            eyes.append([round(float(x0 + xs.mean()), 1), round(float(y0 + ys.mean()), 1)])
        m = {"size": [im.width, im.height], "eyes": eyes, "scale_of_raw": round(k, 5)}
        if "halo" in p:
            m["halo"] = [round(v * k, 1) for v in p["halo"]]
        marks[name] = m
        print(f"  {name}: {im.width}x{im.height}, eyes {eyes}, apart {np.hypot(eyes[1][0]-eyes[0][0], eyes[1][1]-eyes[0][1]):.0f}")
    json.dump(marks, open(f"{HOME}/pic/marks.json", "w"), indent=1)
    return marks


def cut_out(name, marks, out, shoulders=(0.55, 1.3)):
    """The figure with His halo, cut from the icon's ground."""
    from rembg import new_session, remove

    im = Image.open(f"{HOME}/pic/{name}.jpg").convert("RGB")
    W, H = im.size
    small = im.resize((900, round(H * 900 / W)), Image.LANCZOS)
    s = 900 / W
    a = np.asarray(remove(small, session=new_session("isnet-general-use")).getchannel("A")) > 110
    b = np.asarray(remove(small, session=new_session("u2net")).getchannel("A")) > 110
    hx, hy, hr = [v * s for v in marks[name]["halo"]]
    yy, xx = np.mgrid[0 : small.height, 0 : small.width]
    halo = np.hypot(xx - hx, yy - hy) <= hr
    # Three bands. About His head the cut is the halo alone, so the models' ragged pieces of the painted ground are
    # dropped. At the shoulders it is the halo and the first model's outline, cleaned of specks. Below, the two models
    # joined, which keeps the blessing hand and the Gospel whole.
    top, mid = hy + shoulders[0] * hr, hy + shoulders[1] * hr
    clean = cv2.morphologyEx(a.astype(np.uint8), cv2.MORPH_OPEN, np.ones((13, 13), np.uint8)).astype(bool)
    mask = np.where(yy < top, halo, np.where(yy < mid, halo | clean, a | b | halo))
    # Only the piece that holds His face is kept; stray islands of the ground are dropped.
    n, lab = cv2.connectedComponents(mask.astype(np.uint8))
    keep = lab[int(min(small.height - 1, hy)), int(hx)]
    mask = lab == keep
    mask = cv2.morphologyEx(mask.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    alpha = cv2.resize(mask.astype(np.float32), (W, H), interpolation=cv2.INTER_CUBIC)
    alpha = np.clip(cv2.GaussianBlur(alpha, (0, 0), max(1.5, W / 900)), 0, 1)
    rgba = np.dstack([np.asarray(im), (alpha * 255).astype(np.uint8)])
    Image.fromarray(rgba, "RGBA").save(out)
    print(f"  {os.path.basename(out)}: {W}x{H}")


def font():
    from fontTools.ttLib import TTFont

    media = f"{ROOT}/out/_next/static/media"
    css = "".join(open(os.path.join(dp, f), encoding="utf8", errors="ignore").read() for dp, _, fs in os.walk(f"{ROOT}/out/_next/static") for f in fs if f.endswith(".css"))
    import re

    # The app's sans, in the part of it that holds the plain Latin letters.
    faces = [m for m in re.finditer(r"@font-face\{([^}]*)\}", css) if "font-family:DM Sans" in m.group(1) and "U+0-FF" in m.group(1).replace("U+??", "U+0-FF")]
    src = re.search(r"url\(\.\./media/([^)]+)\)", faces[0].group(1)).group(1)
    f = TTFont(os.path.join(media, src))
    f.flavor = None
    f.save(f"{HOME}/font.ttf")
    print(f"  font.ttf from {src}")


if __name__ == "__main__":
    marks = working_copies()
    cut_out("sinai", marks, f"{HOME}/fig-b.png")
    cut_out("pantocrator19", marks, f"{HOME}/fig-a.png", shoulders=(0.2, 0.9))
    font()
