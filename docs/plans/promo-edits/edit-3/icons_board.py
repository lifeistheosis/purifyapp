#!/usr/bin/env python3
"""The Cradle in icons, storyboard 2: twelve panels, each a frame of the film (9:16), cut from Nikolaos Galanopoulos's
feast icons (`.promo/edit-3/raw/modern/athonite/`, where `sources.json` names each file's page). The crops are the
film's plan: no panel is drawn, only cut from the icon and scaled (2.25x at the closest, where the print file still
holds at phone size).

  python -I -B icons_board.py <this folder> <out.jpg>      also writes <out>_p5_full.jpg and <out>_p11_full.jpg
"""
import sys, os
sys.path.insert(0, sys.argv[1])
import core
from PIL import Image, ImageDraw
D = os.path.join(core.WORK, "raw", "modern", "athonite")
# (icon, centre x, centre y, crop width, time, feast, the shot)
P = [
 ("annunciation", 800, 1500, 1000, "0.2 to 4.3 s", "The Annunciation", "Gabriel comes to her"),
 ("nativity", 1200, 2060, 900, "4.3 to 9.1 s", "The Nativity", "the Mother, the manger, the Child"),
 ("nativity", 1750, 2300, 900, "9.1 to 13.8 s, the break", "The Nativity", "the Magi bring their gifts"),
 ("meeting", 850, 1650, 1000, "13.8 to 18.2 s", "The Meeting in the Temple", "Simeon's veiled hands, into the pause"),
 ("meeting", 1150, 1500, 480, "18.5 s, the drop", "The Meeting", "the Mother and the Child, close"),
 ("baptism", 900, 2000, 1100, "18.5 to 27.4 s", "The Baptism", "the Meeting widens, then the Jordan"),
 ("lazarus", 2700, 1100, 1000, "28.0 to 32.0 s", "The Raising of Lazarus", "\"Lazarus, come forth\", into the stop"),
 ("crucifixion", 1139, 1150, 700, "32.7 to 37.4 s", "The Crucifixion", "His face in the silence"),
 ("resurrection", 1181, 1653, 1860, "37.4 s, the music returns", "The Resurrection", "the gates of Hades broken"),
 ("resurrection", 700, 2100, 900, "42.2 to 46.9 s", "The Resurrection", "Adam's hand in His"),
 ("ascension", 1212, 2140, 480, "46.9 to 51.6 s", "The Ascension", "the Mother looks into the lens"),
 ("ascension", 440, 950, 640, "51.6 to 56.7 s", "The angels", "black between them; the cross, the name"),
]
cols, pw, ph, cap, gap, pad = 3, 330, 587, 92, 14, 18
rows = (len(P) + cols - 1) // cols
W = pad * 2 + cols * pw + (cols - 1) * gap
H = pad * 2 + 70 + rows * (ph + cap) + (rows - 1) * gap
sheet = Image.new("RGB", (W, H), (14, 14, 16)); d = ImageDraw.Draw(sheet)
d.text((pad, pad), "The Cradle in icons: storyboard 2", font=core.font(700, 30), fill=(240, 240, 236))
d.text((pad, pad + 38), "Icons by Nikolaos Galanopoulos (Greece, our day)", font=core.font(400, 19), fill=(170, 170, 170))
cache, full = {}, {}
for i, (k, cx, cy, cw, tm, feast, shot) in enumerate(P):
    if k not in cache: cache[k] = Image.open(os.path.join(D, k + ".jpg")).convert("RGB")
    im = cache[k]; Wi, Hi = im.size
    ch = cw * 16 / 9
    x0 = min(max(cx - cw / 2, 0), Wi - cw); y0 = min(max(cy - ch / 2, 0), Hi - ch)
    box = (round(x0), round(y0), round(x0 + cw), round(y0 + ch))
    fr = im.crop(box).resize((1080, 1920), Image.LANCZOS)
    full[i + 1] = (fr, box, 1080 / cw)
    tile = fr.resize((pw, ph), Image.LANCZOS)
    x = pad + (i % cols) * (pw + gap); y = pad + 70 + (i // cols) * (ph + cap + gap)
    sheet.paste(tile, (x, y))
    d.text((x, y + ph + 8), f"{i+1}  {tm}", font=core.font(700, 17), fill=(232, 200, 120))
    d.text((x, y + ph + 32), feast, font=core.font(700, 18), fill=(240, 240, 236))
    d.text((x, y + ph + 56), shot, font=core.font(400, 16), fill=(185, 185, 185))
    print(i + 1, k, box, f"x{1080/cw:.2f}")
sheet.save(sys.argv[2], quality=90)
full[5][0].save(sys.argv[2].replace(".jpg", "_p5_full.jpg"), quality=92)
full[11][0].save(sys.argv[2].replace(".jpg", "_p11_full.jpg"), quality=92)
print(sheet.size)
