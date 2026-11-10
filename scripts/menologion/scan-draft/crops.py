#!/usr/bin/env python3
"""Full-size crops of chosen words on the P scan's pages, stacked:
usage: python3 scripts/menologion/scan-draft/crops.py <settings.json> <key> <out.jpg> <line>:<word-text> ..."""
import json, os, sys
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__))
sys.dont_write_bytecode = True  # no __pycache__ beside the tools
spec = __import__("importlib.util").util.spec_from_file_location("dr", os.path.join(HERE, "draft.py")); dr = __import__("importlib.util").util.module_from_spec(spec); spec.loader.exec_module(dr)
cfg = dr.C.settings(sys.argv[1])
d = json.load(open(os.path.join(cfg["work"], "out", sys.argv[2] + ".json")))
strips = []
for arg in sys.argv[4:]:
    li, word = arg.split(":", 1)
    l = d["lines"][int(li)]
    w = next(w for w in l["words"] if w["t"].startswith(word))
    im = Image.open(dr.page_image(d["p"], l["page"])).convert("RGB")
    x0, y0, x1, y1 = w["box"]
    c = im.crop((max(0, x0 - 260), y0 - 45, min(im.size[0], x1 + 260), y1 + 45))
    strips.append((arg, c))
W = max(c.size[0] for _, c in strips) + 10
H = sum(c.size[1] + 30 for _, c in strips)
sheet = Image.new("RGB", (W, H), "white"); g = ImageDraw.Draw(sheet); y = 0
for label, c in strips:
    g.text((4, y + 2), label, fill=(0, 0, 200)); sheet.paste(c, (5, y + 18)); y += c.size[1] + 30
sheet.save(os.path.join(cfg["work"], "out", sys.argv[3]), quality=88)
print(sheet.size)
