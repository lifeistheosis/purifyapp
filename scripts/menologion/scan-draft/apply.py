#!/usr/bin/env python3
"""Draft + the page's corrections = the text.
usage: python3 scripts/menologion/scan-draft/apply.py <settings.json> <key>
Each pair must match exactly once in the draft."""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
import importlib.util as _u
sys.dont_write_bytecode = True  # no __pycache__ beside the tools
_s = _u.spec_from_file_location("common", os.path.join(HERE, "common.py")); C = _u.module_from_spec(_s); _s.loader.exec_module(C)
cfg = C.settings(sys.argv[1])
key = sys.argv[2]
t = open(os.path.join(cfg["work"], "out", f"{key}.txt")).read()
for a, b in json.load(open(os.path.join(cfg["work"], "fix", f"{key}.json"))):
    if a == "<END AFTER>":
        # The Life ends at the last sentence about the saint (another man's
        # story follows): everything after it goes.
        if t.count(b) != 1:
            sys.exit(f"{key}: end {b!r} matches {t.count(b)} times")
        t = t[: t.index(b) + len(b)] + "\n"
        continue
    n = t.count(a)
    if n != 1:
        sys.exit(f"{key}: {a!r} matches {n} times")
    t = t.replace(a, b)
open(os.path.join(cfg["work"], "final", f"{key}.txt"), "w").write(t)
print(t)
