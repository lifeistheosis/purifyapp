#!/usr/bin/env python3
"""Where the text differs from the P-scan draft, word by word, with both
scans' readings.
usage: python3 scripts/menologion/scan-draft/diffcheck.py <settings.json> <key>"""
import json, os, re, sys
from difflib import SequenceMatcher
HERE = os.path.dirname(os.path.abspath(__file__))
import importlib.util as _u
sys.dont_write_bytecode = True  # no __pycache__ beside the tools
_s = _u.spec_from_file_location("common", os.path.join(HERE, "common.py")); C = _u.module_from_spec(_s); _s.loader.exec_module(C)
cfg = C.settings(sys.argv[1])
key = sys.argv[2]
norm = lambda w: re.sub(r"[^a-z0-9]", "", w.lower().replace("æ", "ae").replace("œ", "oe"))
mine = open(os.path.join(cfg["work"], "final", f"{key}.txt")).read().split()
d = json.load(open(os.path.join(cfg["work"], "out", f"{key}.json")))
ptoks, dmap = [], []
for l in d["lines"]:
    for w in l["words"]:
        ptoks.append(w["t"]); dmap.append(w.get("dspan", "") if w.get("d") == "?" else "")
pn = [norm(t) for t in ptoks]
keep = [i for i, n in enumerate(pn) if n]
a = [norm(w) for w in mine]
ka = [i for i, n in enumerate(a) if n]
sm = SequenceMatcher(a=[a[i] for i in ka], b=[pn[i] for i in keep], autojunk=False)
for tag, i1, i2, j1, j2 in sm.get_opcodes():
    if tag == "equal":
        continue
    m = " ".join(mine[ka[i]] for i in range(i1, i2))
    p = " ".join(ptoks[keep[j]] for j in range(j1, j2))
    dd = " ".join(dmap[keep[j]] for j in range(j1, j2) if dmap[keep[j]])
    ctx = " ".join(mine[ka[max(0, i1 - 3)]: ka[min(len(ka) - 1, i2 + 2)] + 1]) if ka else ""
    print(f"{tag:8s} mine[{m}]  P[{p}]  D[{dd}]   …{ctx[:90]}")
