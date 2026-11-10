#!/usr/bin/env python3
"""Each page of a Life, drawn with what the draft keeps: green, the body;
red, what it leaves out (running head, notes, marks).
usage: python3 scripts/menologion/scan-draft/pages.py <settings.json> <key>"""
import importlib.util, json, os, sys
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__))
sys.dont_write_bytecode = True  # no __pycache__ beside the tools
spec = importlib.util.spec_from_file_location("ex", os.path.join(HERE, "extract.py")); ex = importlib.util.module_from_spec(spec); spec.loader.exec_module(ex)
spec2 = importlib.util.spec_from_file_location("dr", os.path.join(HERE, "draft.py")); dr = importlib.util.module_from_spec(spec2); spec2.loader.exec_module(dr)
cfg = ex.C.settings(sys.argv[1])
key = sys.argv[2]
d = json.load(open(os.path.join(cfg["work"], "out", f"{key}.json")))
P = ex.pages_of(d["p"])
kept = {(l["page"], tuple(l["box"])) for l in d["lines"]}
for n in sorted({l["page"] for l in d["lines"]}):
    p = P[n]
    im = Image.open(dr.page_image(d["p"], n)).convert("RGB")
    sc = im.size[0] / (p["W"] or im.size[0])
    g = ImageDraw.Draw(im)
    for l in p["lines"]:
        box = (l["x0"], l["top"], l["x1"], l["bot"])
        ok = (n, box) in kept
        g.rectangle([box[0] * sc - 3, box[1] * sc - 3, box[2] * sc + 3, box[3] * sc + 3], outline=(0, 160, 0) if ok else (220, 0, 0), width=4)
    w = 1000
    im = im.resize((w, int(im.size[1] * w / im.size[0])))
    im.save(os.path.join(cfg["work"], "out", f"{key}-page-{n}.jpg"), quality=80)
print("pages", sorted({l["page"] for l in d["lines"]}))
