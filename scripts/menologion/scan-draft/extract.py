#!/usr/bin/env python3
"""Two scans of one printing, one draft (from Butler's Lives, November 2026).

usage: python3 scripts/menologion/scan-draft/extract.py <settings.json> <key>

Reads both scans' djvu.xml (word boxes), cuts the Life from its heading to
the next heading, drops running heads, footnotes (smaller type, at a page's
foot) and stray marks, keeps the printed lines, aligns the two OCRs word by
word and writes out/<key>.json: for each printed line, its page (the P scan's
leaf index), its box, whether it opens a paragraph, and its words with the
other scan's reading where they differ.
"""
import json
import os
import re
import statistics
import sys
import xml.etree.ElementTree as ET
from difflib import SequenceMatcher

import importlib.util as _u
sys.dont_write_bytecode = True  # no __pycache__ beside the tools
_s = _u.spec_from_file_location("common", os.path.join(os.path.dirname(os.path.abspath(__file__)), "common.py"))
C = _u.module_from_spec(_s); _s.loader.exec_module(C)

QUOTES = "“”„‟\"'‘’*«»"


def norm(w):
    w = w.lower().replace("æ", "ae").replace("œ", "oe").replace("ſ", "s")
    return re.sub(r"[^a-z0-9]", "", w)


def pages_of(item):
    """Every page: its index, size and lines; each line its words and boxes."""
    path = C.scan_file(item, "xml")
    pages = []
    n = -1
    for ev, el in ET.iterparse(path, events=("end",)):
        if el.tag != "OBJECT":
            continue
        n += 1
        W = int(el.get("width") or 0)
        H = int(el.get("height") or 0)
        lines = []
        for line in el.iter("LINE"):
            ws = []
            for w in line.iter("WORD"):
                t = (w.text or "").strip()
                if not t:
                    continue
                l, b, r, tp = map(int, w.get("coords").split(",")[:4])
                ws.append({"t": t, "l": l, "b": b, "r": r, "top": tp, "h": b - tp})
            if ws:
                hs = sorted(x["h"] for x in ws)
                lines.append({
                    "words": ws,
                    "x0": min(x["l"] for x in ws),
                    "x1": max(x["r"] for x in ws),
                    "top": min(x["top"] for x in ws),
                    "bot": max(x["b"] for x in ws),
                    "h": hs[int(len(hs) * 0.8) if len(hs) > 1 else 0],
                    "text": " ".join(x["t"] for x in ws),
                })
        pages.append({"n": n, "W": W, "H": H, "lines": lines})
        el.clear()
    return pages


def is_heading(line, W):
    letters = re.sub(r"[^A-Za-z]", "", line["text"])
    if len(letters) < 5:
        return False
    upper = sum(c.isupper() for c in letters) / len(letters)
    return upper > 0.85 and line["x0"] > W * 0.12 and len(line["words"]) <= 12


def find_start(pages, want):
    """The Life's heading: its words (one misread allowed in a long heading),
    in capitals, set in from the margin. `want` may list its spellings, where
    a scan's text misreads a short heading ("ST. BONIFACH, M.")."""
    if want and isinstance(want[0], list):
        for alt in want:
            try:
                return find_start(pages, alt)
            except SystemExit:
                continue
        raise SystemExit(f"heading {want} not found")
    for p in pages:
        W = p["W"] or 2000
        for i, line in enumerate(p["lines"]):
            toks = [norm(w["t"]) for w in line["words"]]
            toks = [t for t in toks if t]
            joined = "".join(toks)
            target = "".join(want)
            if SequenceMatcher(a=joined[: len(target)], b=target, autojunk=False).ratio() < (0.8 if len(target) >= 14 else 0.95):
                continue
            letters = re.sub(r"[^A-Za-z]", "", line["text"])
            if letters and sum(c.isupper() for c in letters) / len(letters) > 0.6 and line["x0"] > W * 0.08:
                return p["n"], i
    raise SystemExit(f"heading {want} not found")


def classify(page):
    """Body lines of a page: running head, stray marks and footnotes out.

    The running head is the band of lines level with the topmost line. The
    footnotes are the block at the page's foot set in smaller type (or opening
    with a note's number): the first line from which every line to the end is
    small, in the lower part of the page."""
    W = page["W"] or 2000
    H = page["H"] or 3000
    lines = [l for l in page["lines"] if len(re.sub(r"[^A-Za-z]", "", l["text"])) >= 2]
    if not lines:
        return []
    top = min(l["top"] for l in lines)
    if top < H * 0.12:
        lines = [l for l in lines if abs(l["top"] - top) > 45]

    def maxh(l):
        hs = [w["h"] for w in l["words"] if re.search(r"[A-Za-z]{2,}", w["t"])]
        return max(hs) if hs else 0

    long = [maxh(l) for l in lines if len(l["text"]) > 30]
    body_h = statistics.median(long) if long else statistics.median([maxh(l) for l in lines])
    small = [maxh(l) < body_h * 0.8 or bool(re.match(r"^\(?\d{1,3}\)", l["text"])) for l in lines]
    k = len(lines)
    tail = len(lines)
    # The signature or a stray mark under the notes does not end the block.
    while tail > 0 and len(lines[tail - 1]["text"]) < 14 and lines[tail - 1]["top"] > H * 0.8:
        tail -= 1
    k = tail
    tops = [l["top"] for l in lines]
    ups = [tops[i] - tops[i - 1] for i in range(1, len(lines)) if tops[i] < H * 0.45 and tops[i] > tops[i - 1]]
    body_pitch = statistics.median(ups) if ups else 0
    def note_like(i):
        tight = body_pitch and i > 0 and 0 < tops[i] - tops[i - 1] < body_pitch * 0.85
        return small[i] or tight
    for i in range(tail - 1, -1, -1):
        if note_like(i) and lines[i]["top"] > H * 0.4:
            k = i
        else:
            break
    # The block's first line sits under a gap: it is a note only if it is
    # small itself.
    while k < tail and not small[k]:
        k += 1
    if k == tail:
        k = len(lines) if tail == len(lines) else tail
    # A line opening with a note's mark, in the page's lower part, starts
    # the notes whatever its type size reads as; so does the first line from
    # which the rest of the page, taken together, is in the smaller type.
    for i, l in enumerate(lines[:k]):
        if l["top"] > H * 0.45 and re.match(r"^[\(\[]?[\d©®@°*†‡§]{1,3}[\)\]]", l["text"]):
            k = i
            break

    # Notes set in two columns: lines level with each other, one at the left
    # margin and one starting past the middle. Everything from the first such
    # pair down is notes, and so is a short note line just above it.
    pair_tops = []
    for a_ in lines:
        for b_ in lines:
            if a_ is not b_ and abs(a_["top"] - b_["top"]) < 25 and a_["x0"] < W * 0.3 and b_["x0"] > W * 0.42 and a_["top"] > H * 0.35:
                pair_tops.append(min(a_["top"], b_["top"]))
    if pair_tops:
        y = min(pair_tops)
        above = [l for l in lines if l["top"] < y - 10]
        cut_y = y
        if above:
            last = max(above, key=lambda l: l["top"])
            if (last["x1"] - last["x0"]) < W * 0.45 and last["top"] > H * 0.35 and re.search(r"\)", last["text"][:6]):
                cut_y = last["top"]
        notes = {id(l) for l in lines if l["top"] >= cut_y - 10}
        lines_k = [l for l in lines[:k] if id(l) not in notes]
    else:
        lines_k = lines[:k]
    out = []
    for l in lines_k:
        if re.match(r"^(VOL|Vol)\.?\s*[XVI]+", l["text"]) and l["top"] > H * 0.85:
            continue  # the signature
        out.append(l)
    return out


def cut(pages, start_page, start_line):
    """The Life's printed lines, from the heading to the next heading."""
    lines = []
    seen = 0
    for p in pages[start_page:]:
        body = classify(p)
        W = p["W"] or 2000
        margin = statistics.median([l["x0"] for l in body]) if body else 0
        for l in body:
            if p["n"] == start_page and p["lines"].index(l) <= start_line:
                continue
            letters = re.sub(r"[^A-Za-z]", "", l["text"])
            caps = len(letters) >= 12 and sum(c.isupper() for c in letters) / len(letters) > 0.85 and len(l["words"]) >= 3
            seen += 1
            if seen <= 2 and (is_heading(l, W) or caps):
                continue  # the heading's second line ("PATRIARCH OF ALEXANDRIA.")
            if is_heading(l, W) or caps:
                return lines
            l2 = dict(l)
            l2["page"] = p["n"]
            l2["indent"] = l["x0"] > margin + W * 0.025
            lines.append(l2)
    return lines


def tokens(lines):
    """Words of the lines in order, with where each stands; the line's
    leading running quotation marks kept apart."""
    out = []
    for li, l in enumerate(lines):
        for wi, w in enumerate(l["words"]):
            out.append({"li": li, "wi": wi, "t": w["t"], "n": norm(w["t"])})
    return out


def main():
    cfg = C.settings(sys.argv[1])
    key = sys.argv[2]
    vol, want = cfg["lives"][key]
    p_item, d_item = cfg["volumes"][vol]
    P = pages_of(p_item)
    D = pages_of(d_item)
    ps, pl = find_start(P, want)
    ds, dl = find_start(D, want)
    plines = cut(P, ps, pl)
    dlines = cut(D, ds, dl)
    pt = [t for t in tokens(plines) if t["n"]]
    dt = [t for t in tokens(dlines) if t["n"]]
    sm = SequenceMatcher(a=[t["n"] for t in pt], b=[t["n"] for t in dt], autojunk=False)
    other = {}
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            for k in range(i2 - i1):
                other[(pt[i1 + k]["li"], pt[i1 + k]["wi"])] = dt[j1 + k]["t"]
        else:
            dwords = " ".join(t["t"] for t in dt[j1:j2])
            for k in range(i1, i2):
                other[(pt[k]["li"], pt[k]["wi"])] = None
            if i1 < i2:
                pt[i1]["dspan"] = dwords
            elif i1 < len(pt):
                pt[i1].setdefault("dins", dwords)
    # Lines out, with each word's D reading where it differs.
    out = []
    for li, l in enumerate(plines):
        words = []
        for wi, w in enumerate(l["words"]):
            d = other.get((li, wi), "")
            entry = {"t": w["t"], "box": [w["l"], w["top"], w["r"], w["b"]]}
            if d is None:
                entry["d"] = "?"
            elif d and norm(d) == norm(w["t"]) and d != w["t"]:
                entry["dpunct"] = d
            words.append(entry)
        for t in pt:
            if t["li"] == li and ("dspan" in t or "dins" in t):
                words[t["wi"]]["dspan"] = t.get("dspan", "") or ("+" + t.get("dins", ""))
        out.append({"page": l["page"], "indent": l["indent"], "box": [l["x0"], l["top"], l["x1"], l["bot"]], "words": words})
    with open(os.path.join(cfg["work"], "out", f"{key}.json"), "w") as f:
        json.dump({"key": key, "vol": vol, "p": p_item, "d": d_item, "lines": out}, f, indent=1)
    agree = sum(1 for t in pt if other.get((t["li"], t["wi"])))
    print(f"{key}: {len(plines)} lines over P pages {sorted(set(l['page'] for l in plines))}; "
          f"{len(pt)} P words, {len(dt)} D words, {agree} agree, {len(pt) - agree} differ")


if __name__ == "__main__":
    main()
