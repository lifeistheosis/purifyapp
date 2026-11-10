#!/usr/bin/env python3
"""From the aligned scans (out/<key>.json) to a draft to proofread.

usage: python3 scripts/menologion/scan-draft/draft.py <settings.json> <key>

Writes, in the settings' work folder, out/<key>.txt (paragraphs: P's words, line-end hyphens joined, the
printer's running quotation marks taken off and the quotation's own marks
put as “ and ”) and out/<key>.flags.txt (every place to read on the page:
the two scans disagree, a word no period English text has, a mark of
quotation placed, a line-end hyphen kept or joined), each with what the
other printings (Edinburgh 1798-99, Derby 1842) have there, and contact
sheets out/<key>-sheet-<n>.jpg cropped from the P scan's page images, one
numbered strip per flag.
"""
import json
import os
import re
import sys
import urllib.request
from difflib import SequenceMatcher

from PIL import Image, ImageDraw, ImageFont

import importlib.util as _u
sys.dont_write_bytecode = True  # no __pycache__ beside the tools
_s = _u.spec_from_file_location("common", os.path.join(os.path.dirname(os.path.abspath(__file__)), "common.py"))
C = _u.module_from_spec(_s); _s.loader.exec_module(C)
VOCAB = set()
WORK = ""
JUNK_Q = "‘’“”\"'*<«»„¢©™®°"
NOISE = re.compile(r"^[_|+?^~•·.,:;\-—]+$")


def norm(w):
    w = w.lower().replace("æ", "ae").replace("œ", "oe").replace("ſ", "s")
    return re.sub(r"[^a-z0-9]", "", w)


def other_words(scan):
    t = open(C.scan_file(scan, "txt"), encoding="utf-8", errors="replace").read()
    t = t.replace("ſ", "s")
    t = re.sub(r"(\w)-\s*\n\s*(\w)", r"\1\2", t)
    raw = t.split()
    return [norm(w) for w in raw if norm(w)], t


def window(stream, first, last):
    """Where a Life stands in another printing: from its first words to its
    last, found by the runs of four words they share."""
    grams = {}
    for i in range(len(stream) - 3):
        grams.setdefault(tuple(stream[i : i + 4]), []).append(i)

    def anchor(words, after=0):
        votes = {}
        for k in range(len(words) - 3):
            for i in grams.get(tuple(words[k : k + 4]), []):
                if i - k >= after:
                    votes[i - k] = votes.get(i - k, 0) + 1
        if not votes:
            return -1
        at, n = max(votes.items(), key=lambda x: x[1])
        return at if n >= 2 else -1

    a = anchor(first)
    if a < 0:
        return None
    b = anchor(last, a)
    if b < 0:
        return None
    return a, b + len(last)


def main():
    global VOCAB, WORK
    cfg = C.settings(sys.argv[1])
    WORK = cfg["work"]
    VOCAB = C.vocab(cfg)
    key = sys.argv[2]
    d = json.load(open(os.path.join(WORK, "out", f"{key}.json")))
    lines = d["lines"]
    # 1. Tokens, with their place; noise out.
    toks = []
    for li, l in enumerate(lines):
        first = True
        for wi, w in enumerate(l["words"]):
            t = w["t"]
            if re.fullmatch(r"[.,;:!?]+", t) and toks and toks[-1]["li"] == li:
                # A stop the printer set off with a space ("Marcian ;") is the
                # word's before it.
                toks[-1]["t"] += t
                continue
            if NOISE.match(t) and not re.search(r"[A-Za-z0-9]", t):
                continue
            toks.append({"t": t, "li": li, "wi": wi, "first": first, "w": w,
                         "par": first and l["indent"] or (li == 0 and first)})
            first = False
    for i, t in enumerate(toks):
        t["last"] = i + 1 == len(toks) or toks[i + 1]["li"] != t["li"]
    # 2. Line-end hyphens joined; the decision recorded.
    flags = []
    out = []
    i = 0
    while i < len(toks):
        t = dict(toks[i])
        if t["last"] and t["t"].endswith("-") and not t["t"].endswith("--") and i + 1 < len(toks):
            j = i + 1
            # The next line's running quotation mark stands between the halves.
            while j < len(toks) and re.fullmatch(rf"[{re.escape(JUNK_Q)}]+", toks[j]["t"]):
                j += 1
            n = toks[j] if j < len(toks) else toks[i + 1]
            a = t["t"][:-1]
            b = re.sub(rf"^[{re.escape(JUNK_Q)}]+", "", n["t"])
            t["t"] = a + "\u0001" + b  # decided below, once the other printings are read
            t["join"] = (a, b, n)
            i = j + 1
        else:
            i += 1
        out.append(t)
    # 3. The other printings, for votes.
    others = []
    for name, fname in cfg["others"][d["vol"]]:
        stream, text = other_words(fname)
        others.append((name, stream, text))
    def plain(t):
        return norm(t["t"].replace("\u0001", ""))
    words = [plain(t) for t in out]
    words_nz = [w for w in words if w]
    votes = {}
    for name, stream, text in others:
        win = window(stream, words_nz[:40], words_nz[-40:])
        if not win:
            print(f"{name}: the Life not found")
            continue
        seg = stream[win[0] : win[1]]
        sm = SequenceMatcher(a=words, b=seg, autojunk=False)
        for tag, i1, i2, j1, j2 in sm.get_opcodes():
            for k in range(i1, i2):
                if tag == "equal":
                    votes.setdefault(k, {})[name] = seg[j1 + (k - i1)]
                else:
                    votes.setdefault(k, {})[name] = "~" + " ".join(seg[j1:j2])[:40]
        for k, t in enumerate(out):
            if "join" in t:
                a, b, _ = t["join"]
                hy = len(re.findall(rf"\b{re.escape(a)}-\s*{re.escape(b)}", text, re.I))
                solid = len(re.findall(rf"\b{re.escape(a + b)}\b", text, re.I))
                t.setdefault("jv", []).append((name, hy, solid))
    # 4. Hyphens decided: kept where another printing prints the hyphen inside
    # a line and none prints the word solid; joined where one prints it solid.
    for k, t in enumerate(out):
        if "join" not in t:
            continue
        a, b, n = t["join"]
        jv = t.get("jv", [])
        hy = sum(x[1] for x in jv)
        solid = sum(x[2] for x in jv)
        whole = norm(a + b)
        if solid and not hy:
            t["t"] = a + b
        elif hy and not solid:
            t["t"] = a + "-" + b
            flags.append({"k": k, "kind": "hyphen kept", "note": f"{a}-{b} {jv}"})
        else:
            t["t"] = a + b
            if whole not in VOCAB or hy:
                flags.append({"k": k, "kind": "hyphen?", "note": f"{a}-{b} joined {jv}"})
    # 5. Quotation marks: a line's leading marks inside a quotation are the
    # printer's running quotes; outside one they open it.
    inq = False
    for k, t in enumerate(out):
        s = t["t"]
        m = re.match(rf"^([{re.escape(JUNK_Q)}]+)", s)
        if m:
            lead = m.group(1)
            rest = s[len(lead):]
            if t["first"] and inq:
                s = rest
            elif lead in ("’", "'") and not t["first"]:
                pass
            else:
                s = "“" + rest
                inq = True
                flags.append({"k": k, "kind": "quote opens", "note": f"{t['t']}"})
        m2 = re.search(r"([”\"]|’’|’”|\*\*)([.,;:!?)]*)$", s)
        if m2 and s != "“":
            s = s[: m2.start()] + "”" + m2.group(2)
            inq = False
            flags.append({"k": k, "kind": "quote closes", "note": f"{t['t']}"})
        if not s:
            s = ""
        t["t"] = s
    # 6. Disagreements and words no period text has.
    PUN = re.compile(r"([.,;:?!]*)[^A-Za-z0-9.,;:?!]*$")
    applied = []
    for k, t in enumerate(out):
        w = t["w"]
        v = votes.get(k, {})
        others_say = set()
        for x in (v.get("E"), v.get("R")):
            if not x:
                continue
            # A replaced stretch ("~such a") offers each of its words, and the
            # words run together, for a word the scan split or joined.
            parts = x[1:].split() if x.startswith("~") else [x]
            others_say.update(parts)
            if x.startswith("~"):
                others_say.update(a + b for a, b in zip(parts, parts[1:]))
        mine = norm(t["t"])
        if w.get("d") == "?":
            dspan = w.get("dspan", "?")
            dn = norm(dspan) if dspan not in ("?", "") and not dspan.startswith("+") else ""
            if mine and mine in others_say:
                continue  # another printing reads as P does: D misread
            if dn and dn in others_say and " " not in dspan.strip():
                # The other scan and another printing agree against P: their word, P's stops.
                stops = PUN.search(t["t"]).group(1)
                lead = "“" if t["t"].startswith("“") else ""
                new = lead + re.sub(r"[^A-Za-z0-9'’-]", "", dspan) + stops
                applied.append(f"{t['t']!r} -> {new!r}  (D {dspan!r}, {sorted(others_say)})")
                t["t"] = new
                flags.append({"k": k, "kind": "D+print", "note": f"P {w['t']!r} -> {new!r}"})
                continue
            flags.append({"k": k, "kind": "P/D", "note": f"P {w['t']!r}  D {dspan!r}"})
        elif mine and not mine.isdigit() and mine not in VOCAB:
            if mine in others_say:
                continue  # a period spelling another printing has too
            flags.append({"k": k, "kind": "word?", "note": t["t"]})
        elif w.get("dpunct"):
            ps = PUN.search(w["t"]).group(1)
            ds = PUN.search(w["dpunct"]).group(1)
            # D drops stops often; a stop D has and P has not, or another
            # stop than P's, is read on the page.
            if ds and ps != ds and not set(ds) - set(".,;:?!"):
                flags.append({"k": k, "kind": "stop", "note": f"P {w['t']!r}  D {w['dpunct']!r}"})
    open(os.path.join(WORK, "out", f"{key}.applied.txt"), "w").write("\n".join(applied) + "\n")
    flags.sort(key=lambda f: f["k"])
    # 7. The draft: paragraphs.
    paras = []
    carry = ""
    for k, t in enumerate(out):
        if t["par"] and paras and paras[-1]:
            paras.append([])
        if not paras:
            paras.append([])
        if t["t"] == "“":
            carry = "“"
            continue
        if t["t"]:
            paras[-1].append(carry + t["t"])
            carry = ""
    text = "\n\n".join(" ".join(p) for p in paras if p)
    text = re.sub(r" ([,.;:!?])", r"\1", text)
    open(os.path.join(WORK, "out", f"{key}.txt"), "w").write(text + "\n")
    # 8. Flags with votes, and crops.
    rows = []
    for n, f in enumerate(flags, 1):
        k = f["k"]
        ctx = " ".join(x["t"] for x in out[max(0, k - 4) : k + 5])
        v = votes.get(k, {})
        f["n"] = n
        rows.append(f"{n:3d} {f['kind']:12s} {f['note'][:60]:60s} E:{v.get('E','-')!s:14s} R:{v.get('R','-')!s:14s} | {ctx[:110]}")
    open(os.path.join(WORK, "out", f"{key}.flags.txt"), "w").write("\n".join(rows) + "\n")
    sheets(key, d, out, flags)
    print(f"{key}: {len(paras)} paragraphs, {len(text.split())} words, {len(flags)} flags")


def page_image(item, n):
    path = os.path.join(C.SCANS, f"{item}_n{n}.jpg")
    if not (os.path.exists(path) and os.path.getsize(path) > 0):
        req = urllib.request.Request(f"https://archive.org/download/{item}/page/n{n}.jpg", headers={"User-Agent": "PurifyApp public-domain check"})
        with urllib.request.urlopen(req, timeout=180) as r, open(path, "wb") as fh:
            fh.write(r.read())
    return path


def sheets(key, d, out, flags, per=12):
    item = d["p"]
    sizes = {}
    strips = []
    for f in flags:
        t = out[f["k"]]
        line = d["lines"][t["li"]]
        page = line["page"]
        im = Image.open(page_image(item, page)).convert("RGB")
        if page not in sizes:
            sizes[page] = im.size
        # The djvu boxes are of the full scan; the served image may be smaller.
        full_w = max(l["box"][2] for l in d["lines"] if l["page"] == page) * 1.08
        sc = min(1.0, im.size[0] / max(full_w, im.size[0]))
        x0, y0, x1, y1 = line["box"]
        box = t["w"]["box"]
        crop = im.crop((0, max(0, int((y0 - 30) * sc)), im.size[0], min(im.size[1], int((y1 + 30) * sc))))
        dr = ImageDraw.Draw(crop)
        dr.rectangle([int(box[0] * sc) - 4, int((box[1] - y0 + 30) * sc) - 4, int(box[2] * sc) + 4, int((box[3] - y0 + 30) * sc) + 4], outline=(220, 0, 0), width=3)
        w = 1100
        crop = crop.resize((w, max(1, int(crop.size[1] * w / crop.size[0]))))
        strips.append((f["n"], crop))
    for s in range(0, len(strips), per):
        group = strips[s : s + per]
        H = sum(c.size[1] + 6 for _, c in group)
        sheet = Image.new("RGB", (1160, H), "white")
        y = 0
        dr = ImageDraw.Draw(sheet)
        for n, c in group:
            sheet.paste(c, (60, y))
            dr.text((6, y + c.size[1] // 2 - 6), str(n), fill=(0, 0, 200))
            y += c.size[1] + 6
        sheet.save(os.path.join(WORK, "out", f"{key}-sheet-{s // per + 1}.jpg"), quality=85)


if __name__ == "__main__":
    main()
