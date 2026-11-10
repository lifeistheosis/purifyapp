#!/usr/bin/env python3
"""The kept lines of a Life, page by page, as the P scan read them, with the
other scan's reading where it differs.
usage: python3 scripts/menologion/scan-draft/proof.py <settings.json> <key> [page]"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
import importlib.util as _u
sys.dont_write_bytecode = True  # no __pycache__ beside the tools
_s = _u.spec_from_file_location("common", os.path.join(HERE, "common.py")); C = _u.module_from_spec(_s); _s.loader.exec_module(C)
cfg = C.settings(sys.argv[1])
d = json.load(open(os.path.join(cfg["work"], "out", sys.argv[2] + ".json")))
only = int(sys.argv[3]) if len(sys.argv) > 3 else None
for i, l in enumerate(d["lines"]):
    if only is not None and l["page"] != only:
        continue
    s = " ".join(w["t"] + (("{" + w.get("dspan", "?") + "}") if w.get("d") == "?" else "") for w in l["words"])
    print(f"{l['page']}:{i:3d} {'¶' if l['indent'] else ' '} {s}")
