#!/usr/bin/env python3
"""The Christ edit's pictures, made from the app's own icon (public/shop/media/christ-pantocrator-mounted.jpg, the
Sinai Pantocrator, not on the heritage list): the icon twice its size, and the figure of Christ with His halo cut
out of it. The cut-out is two models' masks joined (one keeps the blessing hand, the other the outline) with the
halo put back as a true circle, since neither model keeps it whole. Nothing of the painting is redrawn or moved.

  python3 docs/plans/v1.9/video/release/christ-edit/assets.py <repo root> <out dir>     (needs: pip install rembg)
"""
import sys
from PIL import Image, ImageChops, ImageDraw, ImageFilter
from rembg import new_session, remove

root, out = sys.argv[1], sys.argv[2]
im = Image.open(f"{root}/public/shop/media/christ-pantocrator-mounted.jpg").convert("RGB")
W, H = im.size  # 629 by 1200
a = remove(im, session=new_session("u2net")).getchannel("A").point(lambda v: 255 if v > 96 else 0)
b = remove(im, session=new_session("isnet-general-use")).getchannel("A").point(lambda v: 255 if v > 96 else 0)
mask = ImageChops.lighter(a, b)
# The halo, a true circle about His head (measured on the picture: centre 300, 290, radius 262).
halo = Image.new("L", (W, H), 0)
ImageDraw.Draw(halo).ellipse((300 - 262, 290 - 262, 300 + 262, 290 + 262), fill=255)
# Three bands. Above the shoulders (His head is wholly inside the halo) the cut is the halo alone, so the models'
# ragged pieces of the painted ground are dropped. At the shoulders it is the halo and the second model's outline,
# with its specks cleaned away. Below, the two models joined, which keeps the blessing hand and the Gospel whole.
def band(y0, y1):
    m = Image.new("L", (W, H), 0)
    ImageDraw.Draw(m).rectangle((0, y0, W, y1 - 1), fill=255)
    return m
clean = b.filter(ImageFilter.MinFilter(13)).filter(ImageFilter.MaxFilter(13))
ImageDraw.Draw(clean).rectangle((0, 0, 30, 720), fill=0)
ImageDraw.Draw(clean).rectangle((0, 440, 150, 525), fill=0)  # a piece of the painted building beside the halo
parts = [
    ImageChops.multiply(halo, band(0, 440)),
    ImageChops.multiply(ImageChops.lighter(halo, clean), band(440, 720)),
    ImageChops.multiply(ImageChops.lighter(mask, halo), band(720, H)),
]
mask = ImageChops.lighter(ImageChops.lighter(parts[0], parts[1]), parts[2])
big = im.resize((W * 2, H * 2), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=2.2, percent=70, threshold=2))
big.save(f"{out}/icon.jpg", quality=93)
m2 = mask.resize((W * 2, H * 2), Image.LANCZOS).filter(ImageFilter.GaussianBlur(2.2))
cut = big.convert("RGBA")
cut.putalpha(m2)
cut.save(f"{out}/cut.png")
print("icon.jpg", big.size, "cut.png", cut.size)
