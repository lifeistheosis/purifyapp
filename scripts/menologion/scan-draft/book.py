#!/usr/bin/env python3
"""A whole book, from three scans of one printing (St John of Kronstadt's My
Life in Christ, 1897; December 2026).

usage: python3 scripts/menologion/scan-draft/book.py <settings.json> draft [first last]
       python3 scripts/menologion/scan-draft/book.py <settings.json> sheets
       python3 scripts/menologion/scan-draft/book.py <settings.json> final

The settings (kronstadt.json beside this file) name the scans (`scans`: each
archive.org item and the leaf its page 1 stands on, so a page's leaf is its
number plus that), which one's page images are read (`read`), the book's
parts in printed pages, and the file of corrections read on the page
(`fixes`, committed beside the settings).

`draft` reads every printed page in all three scans: the running head, the
footnotes (the smaller type at the page's foot) and the notes' marks in the
text are left out; a word broken at a line's end is joined for the vote and
decided afterwards. The three readings of each page are lined up word by
word, and where they differ the reading two of them share is taken. A place
is flagged, to be read on the page, where no two agree, where the reading
taken is a word no period English text has, where a stop is read three ways,
and where a broken word's hyphen cannot be decided from the book itself or
the period texts. It writes out/<part>.txt (paragraphs, each page's first word
marked {n}), out/flags.txt, and the flags as JSON for `sheets`, which crops
each flagged line from the read scan's page image into numbered contact
sheets. `final` applies the corrections (page, the draft's words, the page's
words) and writes final/<part>.txt, refusing any correction whose words are
not found exactly once on its page.
"""
import json
import os
import pickle
import re
import statistics
import sys
import urllib.request
from difflib import SequenceMatcher

import importlib.util as _u
sys.dont_write_bytecode = True  # no __pycache__ beside the tools
_here = os.path.dirname(os.path.abspath(__file__))
_s = _u.spec_from_file_location("common", os.path.join(_here, "common.py"))
C = _u.module_from_spec(_s); _s.loader.exec_module(C)
_s = _u.spec_from_file_location("extract", os.path.join(_here, "extract.py"))
EX = _u.module_from_spec(_s); _s.loader.exec_module(EX)

MARKS = set("0123456789]|[*†‡§¹²³⁴⁵⁶⁷⁸⁹⁰")
STOPS = ".,;:!?"
QUOTE = {"“": '"', "”": '"', "„": '"', "‘": "'", "’": "'", "`": "'"}
# One scan's OCR reads some capitals as the Cyrillic letters they look like.
LATIN = str.maketrans("АВЕКМНОРСТХаеорсухіІ", "ABEKMHOPCTXaeopcyxiI")
SOFT = "­"  # stands where a line's last word was broken, until decided
REPAIRS = []  # the misreadings mended, for review


def canon(t):
    return "".join(QUOTE.get(c, c) for c in t)


def norm(t):
    return EX.norm(t.replace(SOFT, ""))


WORDLIST = "https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt"


FREQ = {}


def frequencies(cfg):
    """How often each word stands in the period texts (CCEL, Gutenberg, the
    app's Bible): the measure of which of two readings is the likelier word."""
    path = os.path.join(cfg["work"], "freq.json")
    if not os.path.exists(path):
        import collections, glob
        cnt = collections.Counter()
        for f in glob.glob(os.path.join(C.ROOT, "scripts", ".cache", "ccel", "*.txt")) + glob.glob(os.path.join(C.ROOT, "scripts", ".cache", "gutenberg", "*.txt")):
            cnt.update(re.findall(r"[a-z]+", open(f, encoding="utf-8", errors="replace").read().lower()))
        json.dump(cnt, open(path, "w"))
    return json.load(open(path))


def dictionary(vocab):
    """The period texts' words and a long English word list: a word in
    neither, or in only one scan's reading, is read on the page."""
    path = os.path.join(C.ROOT, "scripts", ".cache", "wordlist", "words_alpha.txt")
    C.fetch(WORDLIST, path)
    return vocab | {w.strip() for w in open(path, encoding="utf-8")}


def in_dictionary(w, words):
    """A word, or its possessive, its old verb ending (-est, -eth) or its
    plural, is in the dictionary."""
    w = w.lower().strip("'’")
    w = re.sub(r"['’]s?$", "", w)
    if not w or w in words:
        return True
    for end in ("est", "eth", "st", "th", "s", "es", "ed", "ly"):
        if w.endswith(end) and len(w) > len(end) + 2:
            stem = w[: -len(end)]
            if stem in words or stem + "e" in words or (len(stem) > 2 and stem[-1] == stem[-2] and stem[:-1] in words) or (stem.endswith("i") and stem[:-1] + "y" in words):
                return True
    return False


def pages_of(cfg, key):
    item = cfg["scans"][key][0]
    path = os.path.join(cfg["work"], f"{key}.pages.pkl")
    if not os.path.exists(path):
        pickle.dump(EX.pages_of(item), open(path, "wb"))
    return pickle.load(open(path, "rb"))


def line_height(l):
    """A line's type size: how tall its words with a tall letter and no
    letter that hangs below the line stand (the boxes take in what hangs)."""
    hs = [w["h"] for w in l["words"] if re.fullmatch(r"[A-Za-z]{2,}[.,:;!?\"”’']*", w["t"]) and re.search(r"[bdfhklt]", w["t"]) and not re.search(r"[gjpqy,;]", w["t"])]
    if not hs:
        hs = [w["h"] for w in l["words"] if re.search(r"[A-Za-z]{2,}", w["t"])]
    return statistics.median(hs) if hs else 0


def body(page, first=False):
    """A page's printed lines, the running head and the footnotes out. The
    notes are the run of lines at the foot, under a gap, all in the smaller
    type."""
    H = page["H"] or 3800
    lines = sorted((l for l in page["lines"] if re.search(r"[A-Za-z0-9]", l["text"])), key=lambda l: l["top"])
    if not lines:
        return [], 0
    def head(l):
        # The running head ("MY LIFE IN CHRIST. 31"), or its number set apart:
        # a short line in capitals or figures, never a line of the text.
        t = l["text"].translate(LATIN)
        letters = re.sub(r"[^A-Za-z]", "", t)
        caps = sum(c.isupper() for c in letters) / len(letters) if letters else 0
        return len(l["words"]) <= 7 and (re.fullmatch(r"[\W\d]+", t) is not None or (len(letters) >= 4 and caps >= 0.6))
    while not first and lines and lines[0]["top"] < H * 0.12 and head(lines[0]):
        lines = lines[1:]  # the running head, and a page number set apart from it
    if not lines:
        return [], 0
    lines = [l for l in lines if not (l["top"] > H * 0.85 and re.search(r"Digiti|Google|oogle|ooQ|OOQ|^by$", l["text"]))]
    if not lines:
        return [], 0
    sizes = [line_height(l) for l in lines if len(l["words"]) >= 5]
    size = statistics.median(sizes) if sizes else 45
    steps = [b["top"] - a["top"] for a, b in zip(lines, lines[1:]) if b["top"] > a["top"]]
    pitch = statistics.median(steps) if steps else size * 1.5
    k = len(lines)
    # The notes: under a gap in the page's lower part, every line of them
    # (but a short one) in the smaller type. The highest such gap.
    for g in range(1, len(lines)):
        if lines[g]["top"] - lines[g - 1]["top"] > pitch * 1.1 and lines[g]["top"] > H * 0.5:
            block = [l for l in lines[g:] if len(l["text"]) >= 30] or lines[g:]
            def small(l):
                if line_height(l) < size * 0.88:
                    return True
                # A short note: its number, then the book's name.
                hs = sorted(w["h"] for w in l["words"])
                return bool(re.match(r"^\W?[\dlI•»'a-z]{1,2}\s+(\d\s+)?[A-Z]", l["text"])) and hs[len(hs) // 2] < size * 0.9
            if all(small(l) for l in block):
                k = g
                break
    return lines[:k], size


def tokens(page, first=False):
    """The page's words in order: notes' marks out, a word broken at a line's
    end joined (SOFT where it broke). Each keeps its line, box and whether its
    line is indented (a paragraph's first line)."""
    lines, size = body(page, first)
    if not lines:
        return []
    W = page["W"] or 2400
    margin = statistics.median([l["x0"] for l in lines])
    out = []
    for li, l in enumerate(lines):
        base = statistics.median([w["b"] for w in l["words"] if re.search(r"[a-z]{2,}", w["t"])] or [l["bot"]])
        ws = []
        # A box the OCR gave two words is two words.
        flat = [dict(w0, t=t) for w0 in l["words"] for t in w0["t"].translate(LATIN).split()]
        for i, w in enumerate(flat):
            if w["t"] in ("u", "n", "U", "«", "»") and i + 1 < len(flat) and re.match(r"[A-Z]", flat[i + 1]["t"]):
                w["t"] = '"'  # an opening quotation mark, misread
            raised = w["b"] < base - size * 0.18 and w["h"] < size * 0.75
            if re.fullmatch(r"0[,!]?", w["t"]) and not raised and i + 1 < len(flat) and re.match(r"[A-Za-z]", flat[i + 1]["t"]):
                w["t"] = "O" + w["t"][1:]  # the vocative O, read as a nought ("0 ye of little faith")
        for w in flat:
            t = w["t"].replace("''", '"').replace("\\v", "w")
            t = re.sub(r"(?<=[a-z])[1\]](?=[?!])", "", t)  # "heart1?": the mark read twice
            raised = w["b"] < base - size * 0.18 and w["h"] < size * 0.75
            if raised and all(c in MARKS or c in "'’\"”:;." for c in t) and any(c in MARKS for c in t):
                # A note's mark set apart. A closing double quotation mark
                # printed with it ("ark.”³") stays, on the word before; a stop
                # or an apostrophe in the box is the mark misread (page 23's
                # "hearts.”³" read as ”;3).
                kept = "".join(c for c in t if c in '"”').replace('"', "”")
                if kept and (ws or out):
                    (ws[-1] if ws else out[-1])["t"] += kept
                continue
            m = re.match(r"^(.*?[A-Za-z][.,;:!?]?[\"”’']?)[0-9\]|*†‡§¹²³⁴⁵⁶⁷⁸⁹⁰~^-]{1,2}([).,;:]*)$", t)
            if m and re.search(r"[.,;:!?][\"”’']?$|[\"”]$", m.group(1)):
                t = m.group(1) + m.group(2)  # a note's mark on the word: "truth."3, "Aaron"2),
            m = re.match(r"^(.*?[A-Za-z][.,;:!?]?[\"”])([;:'’,.0-9\]|*†‡§~^-]{1,3})$", t)
            if m and re.search(r"[0-9\]|*†‡§~^]", m.group(2)):
                t = m.group(1)  # "ways.";'1
            if not t:
                continue
            ws.append({"t": t, "box": [w["l"], w["top"], w["r"], w["b"]], "li": li,
                       "par": False, "line": [l["x0"], l["top"], l["x1"], l["bot"]]})
        if not ws:
            continue
        # Stops the printer set off with a space belong to the word before;
        # a quotation mark standing alone opens the word after (the printer
        # spaced the opening marks), or closes the word before at the line's
        # end or before a stop.
        joined = []
        for i, w in enumerate(ws):
            t = w["t"]
            if re.fullmatch(r"[.,;:!?]+", t) and (joined or out):
                tgt = joined[-1] if joined else out[-1]
                tgt["t"] += t
                continue
            if re.fullmatch(r"[”’]+", t) and (joined or out):
                tgt = joined[-1] if joined else out[-1]
                tgt["t"] += t
                continue  # a closing mark: the word before's
            if joined and re.fullmatch(r"[\"“”'‘’]+", joined[-1]["t"]) and not joined[-1].get("closes"):
                q = joined.pop()
                w = dict(w, t=q["t"] + t)
            if re.fullmatch(r"[\"“”]+", w["t"]) and (i + 1 == len(ws) or re.match(r"[.,;:!?)]", ws[i + 1]["t"])):
                tgt = joined[-1] if joined else (out[-1] if out else None)
                if tgt is not None:
                    tgt["t"] += w["t"]
                    continue
                w = dict(w, closes=True)
            joined.append(w)
        ws = joined
        if not ws:
            continue
        ws[0]["par"] = l["x0"] > margin + W * 0.025
        ws[0]["first"] = True
        if out and out[-1]["t"].endswith("-") and not out[-1]["t"].endswith("--") and out[-1]["li"] == li - 1 and re.search(r"[A-Za-z]-$", out[-1]["t"]):
            prev = out.pop()
            ws[0] = dict(ws[0], t=prev["t"][:-1] + SOFT + ws[0]["t"], box=prev["box"], li=prev["li"], line=prev["line"], par=prev["par"], first=prev.get("first", False))
        out.extend(ws)
    return out


def clean_cuts(ops, n, m):
    """Where a line-up of two readings can be cut: the index in the second at
    every boundary of the first that falls between whole words of both."""
    at = [None] * (n + 1)
    bad = [False] * (n + 1)
    for tag, i1, i2, j1, j2 in ops:
        if tag == "equal":
            for i in range(i1, i2 + 1):
                if at[i] is None:
                    at[i] = j1 + (i - i1)
        elif i1 == i2:
            bad[i1] = True  # words only the second has: kept with a neighbour
        else:
            if at[i1] is None:
                at[i1] = j1
            at[i2] = j2
            for i in range(i1 + 1, i2):
                bad[i] = True
    at[0], at[n] = 0, m
    bad[0] = bad[n] = False
    return [None if bad[i] else at[i] for i in range(n + 1)]


MARKLIKE = re.compile(r"^[\d\]\[|}{lL!?*:;•»'\"`’‘“”.,\-~^]{1,3}$")
BOOKS = re.compile(r"^(Corinthians|Kings|Samuel|Chronicles|Timothy|Thessalonians|Peter|John|Esdras|Maccabees)")


def marklike(s):
    """A reading that is only a note's mark or a stop the scan misread: one to
    three marks, at least one of them not a quotation mark or a stop."""
    ws = s.split()
    return all(MARKLIKE.match(w) and re.search(r"[\d\]\[|}{lL*•»!?]", w) for w in ws) if ws else True


def known(s, vocab):
    """Every word of a reading is one the period texts have (a word broken
    at a line's end taken whole; a compound's parts each)."""
    ws = [norm(w) for w in re.split(r"[\s\-—]+", s.replace(SOFT, "")) if norm(w)]
    return bool(ws) and all(w in vocab or w.isdigit() for w in ws)


def letters(s):
    """A reading's letters, for the vote: the marks a scan reads for a note's
    mark or a question mark left out."""
    return "".join(re.sub(r"[^a-z]", "", w) if re.search(r"[A-Za-z]{2,}|^[A-Za-z]$", w) and not marklike(w) else ("" if marklike(w) else re.sub(r"[^0-9]", "", w))
                   for w in canon(s).replace(SOFT, "").lower().split())


def sig(s, before=""):
    """A reading's stops and marks. A mark a scan read after a word may be the
    page's question mark, so it counts as one; after a stop or a quotation
    mark it is a note's, and counts for nothing."""
    out = []
    prev = before
    for w in canon(s).replace("''", '"').split():
        if marklike(w) and not re.search(r"[?!]", w):
            out.append("" if re.search(r"[.,;:!?\"'\]]$", prev) or not prev else "?")
        else:
            out.append(re.sub(r"[A-Za-z0-9\u00ad]", "", w))
            prev = w
    return "".join(out)


def against(mine, theirs):
    """Two scans agree on a reading and the base read another: is it a word
    read against a word ("lie" for "he", "aud" for "and", "flow" for "now")?
    None if not; else which reading stands until the page is read: the base's
    where its word is ten times the likelier, or theirs is no word at all."""
    if marklike(canon(theirs)) or marklike(canon(mine)):
        return None  # a mark either way ("'I" and "1" for a question mark)
    a = [re.sub(r"^\W+|\W+$", "", w) for w in mine.split()]
    b = [re.sub(r"^\W+|\W+$", "", w) for w in theirs.split()]
    if len(a) != len(b) or not all(re.fullmatch(r"[A-Za-z]+(?:[-’'][A-Za-z]+)*", w) for w in a):
        return None
    pairs = [(x.lower(), y.lower()) for x, y in zip(a, b) if x.lower() != y.lower()]
    if not pairs:
        return None
    if not all(FREQ.get(x, 0) for x, _ in pairs):
        return None  # the base's own reading is no word
    if any(not re.fullmatch(r"[a-z]+", y) or not FREQ.get(y, 0) for _, y in pairs):
        return "base"  # theirs is no word: "aie", "tbe", "l>e"
    if all(FREQ.get(y, 0) >= 10 * FREQ.get(x, 1) for x, y in pairs):
        return None  # theirs is the far likelier word: the base's slip ("riot" for "not")
    return "base" if all(FREQ.get(x, 0) >= 10 * FREQ.get(y, 1) for x, y in pairs) else "theirs"


def vote(R, vocab):
    """One page: the three scans' words, lined up; where they differ, the
    reading two share. The scan that agrees best with the other two is the
    page's base (its lines, boxes and page image). Returns the words taken,
    each with its base word's place, and the places to read."""
    keys = list(R)
    N = {k: [norm(x["t"]) for x in R[k]] for k in keys}
    def ratio(a, b):
        return SequenceMatcher(a=N[a], b=N[b], autojunk=False).ratio()
    score = {k: sum(ratio(k, o) for o in keys if o != k) for k in keys}
    best = max(score.values())
    base = "T" if "T" in score and score["T"] >= best - 0.05 else max(keys, key=lambda k: score[k])
    A, B = [k for k in keys if k != base]
    X = R[base]
    n = len(X)
    ca = clean_cuts(SequenceMatcher(a=N[base], b=N[A], autojunk=False).get_opcodes(), n, len(R[A]))
    cb = clean_cuts(SequenceMatcher(a=N[base], b=N[B], autojunk=False).get_opcodes(), n, len(R[B]))
    cuts = [i for i in range(n + 1) if ca[i] is not None and cb[i] is not None]
    out, flags = [], []
    def flag(kind, say):
        flags.append({"kind": kind, "say": dict(say), "base": base, "at": len(out)})
    for a, b in zip(cuts, cuts[1:]):
        xs, as_, bs = X[a:b], R[A][ca[a]:ca[b]], R[B][cb[a]:cb[b]]
        say = {base: " ".join(x["t"] for x in xs), A: " ".join(x["t"] for x in as_), B: " ".join(x["t"] for x in bs)}
        c = {k: canon(v).replace("''", '"') for k, v in say.items()}
        anchor = X[a] if a < n else X[-1]
        # The words that begin a paragraph in each scan's reading of the
        # stretch: a word taken begins one where two scans begin one at it
        # (not only the stretch's first word: "torment. * — "It" in one scan,
        # "torment. "It" in the others, all three opening at "It").
        starts = {}
        for k, toks in ((base, xs), (A, as_), (B, bs)):
            for x in toks:
                if x.get("par") and norm(x["t"]):
                    starts.setdefault(norm(x["t"]), set()).add(k)
        def place(words, par=None):
            for i, w in enumerate(words):
                src = xs[i] if i < len(xs) else anchor
                p = (par if par is not None else anchor["par"]) if i == 0 else False
                if len(starts.get(norm(w), ())) >= 2:
                    p = True
                    starts.pop(norm(w))
                out.append(dict(src, t=w, scan=base, par=p,
                                first=anchor.get("first") if i == 0 else False))
        if c[base] == c[A] or c[base] == c[B]:
            # Two read it alike: the base's words, each a paragraph's first
            # where two of the three scans begin one there.
            other = as_ if c[base] == c[A] else bs
            third = bs if c[base] == c[A] else as_
            odd = B if c[base] == c[A] else A
            # The two can share a slip the third did not make ("hut" where the
            # third read "but"): where the third read another word, as likely
            # or likelier, the place is read on the page; a far likelier one
            # stands until then.
            hit = against(say[odd], say[base]) if c[odd].strip() else None
            if hit:
                # Only a likelier word than the two's is worth the page.
                a_ = [re.sub(r"^\W+|\W+$", "", w).lower() for w in say[odd].split()]
                b_ = [re.sub(r"^\W+|\W+$", "", w).lower() for w in say[base].split()]
                if not any(FREQ.get(x, 0) > FREQ.get(y, 0) for x, y in zip(a_, b_) if x != y):
                    hit = None
            if hit:
                flag("word against word", say)  # the two's reading stands until the page is read
            for i, x in enumerate(xs):
                votes = [x["par"], other[i]["par"] if i < len(other) else x["par"]]
                if len(third) == len(xs):
                    votes.append(third[i]["par"])
                out.append(dict(x, scan=base, par=sum(votes) * 2 > len(votes) if len(votes) == 3 else x["par"]))
            continue
        # A note's mark, or a question mark the scans read as a mark.
        if all(marklike(v) for v in c.values()):
            got = [v for v in c.values() if v.strip()]
            # A quotation mark read into the same box as the note's mark
            # ("ask him?”¹" read "(>, "« and 1”): where two scans read a
            # double mark there, it stays. It closes the words before, unless
            # a scan that tells the marks apart reads it opening.
            quoted = sum('"' in v for v in got) >= 2
            opens = any("“" in say[k] and "”" not in say[k] for k in keys)
            def keep_quote():
                if quoted and out and not re.search(r'["“”]$', out[-1]["t"]):
                    if opens:
                        place(['"'])
                    else:
                        out[-1]["t"] += '"'
            if any("?" in v for v in got):
                place(["?"])
                keep_quote()
            elif any("!" in v for v in got):
                place(["!"])
                keep_quote()
            elif got:
                prev = out[-1]["t"] if out else ""
                if re.search(r"[.,;:!?\"”’']$", prev) or not prev:
                    keep_quote()
                    continue  # after a stop or a quotation: a note's mark
                flag("mark?", say)
                place(c[base].split() or got[0].split())
            continue
        if c[A] == c[B] and c[A].strip():
            words = say[A].split()
            # Two scans can share a slip ("lie" for "he", "aud" for "and"):
            # where the base read another word, the likelier of the two, its
            # word stands, and the place is read on the page.
            hit = against(say[base], say[A])
            if hit:
                flag("word against word", say)
                place(say[base].split() if hit == "base" else words)
                continue
            place(words)
            if not known(say[A], vocab) and not re.fullmatch(r"[\W\d]*", say[A]) and letters(say[A]) != letters(say[base]):
                flag("unknown word", say)
            continue
        if not c[A].strip() and not c[B].strip():
            # Only the base has words here.
            if marklike(c[base]) or (len(c[base]) <= 3 and not known(c[base], vocab) and re.search(r"[^A-Za-z]", c[base])):
                continue
            flag("base alone", say)
            place(say[base].split())
            continue
        ks = [base, A, B]
        before = out[-1]["t"] if out else ""
        if re.search(r"[.,;:!?\"”'’)]$", before) and all(len(v) <= 3 and not re.search(r"[A-Za-z]{2}", v) for v in c.values()):
            continue  # a note's mark after a stop or a quotation, read three ways
        L = {k: letters(say[k]) for k in ks}
        G = {k: sig(say[k], before) for k in ks}
        major = next((L[k] for k in ks if L[k] and sum(L[k] == L[o] for o in ks) >= 2), None)
        if major is not None:
            cands = [k for k in ks if L[k] == major]
            smaj = next((G[k] for k in ks if sum(G[k] == G[o] for o in ks) >= 2), None)
            good = [k for k in cands if smaj is not None and G[k] == smaj] or cands
            good.sort(key=lambda k: (SOFT not in say[k], k != base))
            pick = good[0]
            hit = against(say[base], say[pick]) if base not in cands else None
            if smaj is None:
                flag("stops", say)
            elif hit:
                flag("word against word", say)
                if hit == "base":
                    pick = base
            elif base not in cands and not known(say[pick], vocab) and L[base] != major:
                flag("unknown word", say)
            place(say[pick].split())
            continue
        # The same number of words in two or three: a vote word by word.
        lens = {k: len(say[k].split()) for k in ks}
        same = max(([k for k in ks if lens[k] == lens[j]] for j in ks), key=lambda g: (len(g), base in g))
        if len(same) >= 2 and lens[same[0]] > 1:
            words, doubt = [], False
            for i in range(lens[same[0]]):
                rd = {k: say[k].split()[i] for k in same}
                cd = {k: canon(v) for k, v in rd.items()}
                hit = next((k for k in same if sum(cd[k] == cd[o] for o in same) >= 2), None)
                if hit is None:
                    kn = [k for k in same if known(rd[k], vocab)]
                    hit = kn[0] if len(kn) == 1 else (base if base in same else same[0])
                    doubt = doubt or len(kn) != 1
                words.append(rd[hit])
            if doubt:
                flag("three readings", say)
            place(words)
            continue
        kn = [k for k in ks if known(say[k], vocab)]
        if len(kn) == 1 and len(say[kn[0]].split()) == 1:
            place(say[kn[0]].split())  # one word, and only one reading of it is a word
            continue
        # A word one scan read in two halves, whole a word the others misread.
        halves = [k for k in ks if len(say[k].split()) == 2 and norm(say[k].replace(" ", "")) in vocab]
        if len(halves) == 1:
            place([say[halves[0]].replace(" ", SOFT)])
            continue
        flag("three readings", say)
        place(say[kn[0] if kn else base].split())
    # Marks the three scans read alike: after a stop or a quotation they are
    # a note's; after a word, a misread question mark most often: read.
    keep = []
    for i, x in enumerate(out):
        t = canon(x["t"])
        prev = keep[-1]["t"] if keep else ""
        if re.fullmatch(r"[-~^]", t) and re.search(r"[\"”]$", prev):
            for f in flags:
                if f["at"] > len(keep):
                    f["at"] -= 1
            continue  # a note's mark after a quotation
        if MARKLIKE.match(t) and re.search(r"[\d\]\[|}{lL*•»]", t) and not (i + 1 < len(out) and BOOKS.match(out[i + 1]["t"])) \
                and not (re.fullmatch(r"\d+[.,;)]*", t) and re.fullmatch(r"\(?[ivxlcIVXLC]+\.?,?", prev)):
            if re.search(r"[.,;:!?\"”’']$", prev) or not prev:
                for f in flags:
                    if f["at"] > len(keep):
                        f["at"] -= 1
                continue
            if not any(f["at"] == len(keep) for f in flags):
                flags.append({"kind": "mark?", "say": {"T": x["t"]}, "base": base, "at": len(keep)})
        keep.append(x)
    # The OCR's commonest misreadings inside a word ("tliis", "liim", "1ife"):
    # mended where the word is no word and the mended one is.
    for x in keep:
        m = re.match(r"^([^A-Za-z0-9]*)([A-Za-z0-9]+)([^A-Za-z0-9]*)$", x["t"])
        if not m or norm(m.group(2)) in vocab or m.group(2).isdigit():
            continue
        core = m.group(2)
        for a_, b_ in (("li", "h"), ("1", "l"), ("rn", "m"), ("cl", "d"), ("Ii", "H"), ("tl", "d")):
            hits = [i for i in range(len(core)) if core.startswith(a_, i)
                    and (a_ != "1" or (0 < i < len(core) - 1 and core[i - 1].isalpha() and core[i + 1].isalpha()))]
            done = False
            for i in hits:
                cand = core[:i] + b_ + core[i + len(a_):]
                if norm(cand) in vocab:
                    REPAIRS.append(f"{x['t']} -> {m.group(1) + cand + m.group(3)}")
                    x["t"] = m.group(1) + cand + m.group(3)
                    done = True
                    break
            if done:
                break
    return keep, flags


def leaf(cfg, key, page):
    return page + cfg["scans"][key][1]


def draft(cfg, first_page=None, last_page=None):
    vocab = C.vocab(cfg)
    FREQ.update(frequencies(cfg))
    P = {k: pages_of(cfg, k) for k in cfg["scans"]}
    allflags = []
    texts = {}
    unknown_all = {}
    for part in cfg["parts"]:
        lo, hi = part["pages"]
        if first_page is not None:
            lo, hi = max(lo, first_page), min(hi, last_page)
            if lo > hi:
                continue
        words = []
        for page in range(lo, hi + 1):
            first = page == part["pages"][0]
            per = {k: tokens(P[k][leaf(cfg, k, page)], first) for k in cfg["scans"]}
            if first and part.get("from"):
                # The part's heading and title out: from the words that open it.
                for k, ws in per.items():
                    full = [norm(w) for w in part["from"].split()]
                    found = None
                    # A scan that misread the first words: found by the rest,
                    # its start as many words before.
                    for drop in range(0, len(full) - 1):
                        want = full[drop:]
                        for s in range(len(ws)):
                            if [norm(x["t"]) for x in ws[s:s + len(want)]] == want:
                                found = max(0, s - drop)
                                break
                        if found is not None:
                            break
                    if found is None:
                        raise SystemExit(f"{part['key']}: {part['from']!r} not found on page {page} of scan {k}")
                    s = found
                    while s > 0 and not norm(ws[s - 1]["t"]) and not ws[s - 1]["t"].strip("\"“'‘"):
                        s -= 1  # the quotation mark that opens it
                    per[k] = ws[s:]
            if page == part["pages"][1] and part.get("to"):
                # The part's last words: what follows them (a note, the
                # printer's name) out.
                for k, ws in per.items():
                    want = [norm(w) for w in part["to"].split()]
                    for e in range(len(ws) - len(want), -1, -1):
                        if [norm(x["t"]) for x in ws[e:e + len(want)]] == want:
                            per[k] = ws[:e + len(want)]
                            break
                    else:
                        raise SystemExit(f"{part['key']}: {part['to']!r} not found on page {page} of scan {k}")
            got, flags = vote(per, vocab)
            for f in flags:
                f["page"] = page
                f["word"] = got[f["at"]] if f["at"] < len(got) else (got[-1] if got else None)
            for x in got:
                x["page"] = page
            if got:
                got[0]["pagestart"] = True
            for f in flags:
                f["k"] = len(words) + f["at"]
            words.extend(got)
            allflags.extend(dict(f, part=part["key"]) for f in flags)
        texts[part["key"]] = words
    # Words broken at a line's (or a page's) end: decided from the book itself
    # (the word printed whole, or with its hyphen, inside a line) and the period
    # texts; flagged where neither decides.
    whole, hyph = {}, {}
    for words in texts.values():
        for x in words:
            if SOFT in x["t"]:
                continue
            for w in re.findall(r"[A-Za-z]+(?:-[A-Za-z]+)+|[A-Za-z]+", x["t"]):
                if "-" in w:
                    hyph[w.lower().replace("-", "")] = hyph.get(w.lower().replace("-", ""), 0) + 1
                else:
                    whole[w.lower()] = whole.get(w.lower(), 0) + 1
    for key, words in texts.items():
        # a page's last word broken onto the next page's first
        i = 0
        while i < len(words) - 1:
            if words[i]["t"].endswith("-") and words[i + 1].get("pagestart") and re.search(r"[A-Za-z]-$", words[i]["t"]):
                gone = words[i + 1]
                words[i]["t"] = words[i]["t"][:-1] + SOFT + gone["t"]  # in place: the flags hold the word
                words[i]["spans"] = gone["page"]
                if i + 2 < len(words) and words[i + 2]["page"] == gone["page"]:
                    words[i + 2]["pagestart"] = True  # the page's mark stays, on its first whole word
                for f in allflags:
                    if f.get("word") is gone:
                        f["word"] = words[i]
                del words[i + 1]
            i += 1
        for k, x in enumerate(words):
            if SOFT not in x["t"]:
                continue
            a, b = x["t"].split(SOFT, 1)
            la = re.sub(r"[^A-Za-z]", "", a.split("-")[-1]).lower()
            lb = re.sub(r"[^A-Za-z]", "", b.split("-")[0]).lower()
            joined = la + lb
            h, w_ = hyph.get(joined, 0), whole.get(joined, 0)
            if h or w_:
                x["t"] = a + "-" + b if h > w_ else a + b  # as the book prints it elsewhere
            elif joined in vocab:
                x["t"] = a + b
            elif la in vocab and lb in vocab and len(la) > 1 and len(lb) > 1:
                x["t"] = a + "-" + b  # two words: a compound, as the book makes them
            else:
                x["t"] = a + b
                allflags.append({"part": key, "kind": "hyphen", "say": {"joined": a + b, "book": f"whole {w_}, hyphen {h}"}, "base": x.get("scan", cfg["read"]), "page": x["page"], "k": k, "word": x})
    # Every word not in the dictionary is read on the page, however the
    # scans read it: the printer's misprints and broken letters are in all
    # three. The list of them is written for review.
    words_ = dictionary(vocab)
    flagged = {(f["part"], f["k"]) for f in allflags}
    for key, words in texts.items():
        for k, x in enumerate(words):
            parts = [p for p in re.split(r"[\-—\u00ad]+", canon(x["t"]).replace(SOFT, "")) if re.search(r"[A-Za-z]", p)]
            bad = [p for p in parts if not in_dictionary(re.sub(r"[^A-Za-z']", "", p), words_)]
            if bad:
                unknown_all.setdefault(norm(" ".join(bad)), []).append((key, k, x))
                if (key, k) not in flagged:
                    allflags.append({"part": key, "kind": "not a word", "say": {"read": x["t"]}, "base": x.get("scan", cfg["read"]), "page": x["page"], "k": k, "word": x})
                    flagged.add((key, k))
    os.makedirs(os.path.join(cfg["work"], "out"), exist_ok=True)
    with open(os.path.join(cfg["work"], "out", "unknown-agreed.txt"), "w") as fh:
        for n, occ in sorted(unknown_all.items(), key=lambda kv: -len(kv[1])):
            fh.write(f"{len(occ):4d} {occ[0][2]['t']}  (p. {occ[0][2]['page']})\n")
    for key, words in texts.items():
        text = assemble(words)
        open(os.path.join(cfg["work"], "out", f"{key}.txt"), "w").write(text)
    # Each flag's place, counted again now that words broken over a page are one.
    for key, words in texts.items():
        at = {id(x): k for k, x in enumerate(words)}
        for f in allflags:
            if f["part"] == key and f.get("word") is not None and id(f["word"]) in at:
                f["k"] = at[id(f["word"])]
    allflags.sort(key=lambda f: (f["part"], f["k"]))
    for n, f in enumerate(allflags, 1):
        f["n"] = n
    # The draft again with each flag's number before its word (⟦n⟧), for
    # reading the flags against the draft's own words.
    for key, words in texts.items():
        marked = [dict(x) for x in words]
        for f in allflags:
            if f["part"] == key and f["k"] < len(marked):
                marked[f["k"]]["t"] = f"⟦{f['n']}⟧" + marked[f["k"]]["t"]
        open(os.path.join(cfg["work"], "out", f"{key}.marked.txt"), "w").write(assemble(marked))
    rows = []
    for n, f in enumerate(allflags, 1):
        f["n"] = n
        words = texts[f["part"]]
        k = f["k"]
        ctx = " ".join(x["t"] for x in words[max(0, k - 5): k + 6]).replace(SOFT, "~")
        said = "  ".join(f"{k}:{v!r}" for k, v in f["say"].items())
        rows.append(f"{n:5d} p{f['page']:<4d} {f['kind']:14s} {said[:100]:100s} | {ctx[:120]}")
    open(os.path.join(cfg["work"], "out", "flags.txt"), "w").write("\n".join(rows) + "\n")
    for f in allflags:
        words = texts[f["part"]]
        f["near"] = [x["t"].replace(SOFT, "") for x in words[max(0, f["k"] - 3): f["k"] + 3]]
        f["at_word"] = min(3, f["k"])
    json.dump([{k: v for k, v in f.items() if k != "word"} | {"box": (f.get("word") or {}).get("box"), "line": (f.get("word") or {}).get("line")} for f in allflags],
              open(os.path.join(cfg["work"], "out", "flags.json"), "w"))
    open(os.path.join(cfg["work"], "out", "repairs.txt"), "w").write("\n".join(REPAIRS) + "\n")
    kinds = {}
    for f in allflags:
        kinds[f["kind"]] = kinds.get(f["kind"], 0) + 1
    print(f"{sum(len(w) for w in texts.values())} words; {len(allflags)} flags {kinds}; {len(unknown_all)} unknown words all three read alike")


def assemble(words):
    """Paragraphs; each page's first word marked {n}; the printer's spaces
    before stops and around dashes out; quotation marks turned."""
    paras = [[]]
    for x in words:
        if x.get("par") and paras[-1]:
            paras.append([])
        t = x["t"]
        if x.get("pagestart"):
            t = "{" + str(x["page"]) + "}" + t
        paras[-1].append(t)
    out = []
    for p in paras:
        s = " ".join(p)
        s = re.sub(r" +([.,;:!?)\]])", r"\1", s)
        s = re.sub(r"\s*[—–]+\s*|\s+--\s+|(?<=\w)--(?=\w)", "—", s)
        s = re.sub(r"([\[(]) +", r"\1", s)
        s = turn_quotes(s)
        # The book's question mark, read as an apostrophe and a question mark
        # by the scans ("Christians'?"): read on the page wherever flagged,
        # never an apostrophe there.
        s = re.sub(r"(?<=[a-z])’\?", "?", s)
        out.append(s)
    return "\n\n".join(out) + "\n"


def turn_quotes(s):
    """Straight marks to the printed ones: a double mark opens before a word
    and closes after one; an apostrophe inside or after a word is ’."""
    s = canon(s)
    # Two marks between words close one quotation and open the next
    # ("tempted; ""Had I not heard").
    s = re.sub(r'(?<=[^\s"])\s*""\s*(?=\w)', "” “", s)
    # A mark opens only before a word; before a dash, a bracket or a stop it
    # closes the words before ("into the world "—and read them").
    s = re.sub(r'(^|[\s(\[—{}0-9])"\s*(?=[\w‘\'(\[{])', lambda m: m.group(1) + "“", s)
    s = re.sub(r'"', "”", s)
    s = re.sub(r"(^|[\s(\[—“])'(?=\w)", lambda m: m.group(1) + "‘", s)
    s = s.replace("'", "’")
    s = re.sub(r"(\S) ”", r"\1”", s)
    return s


def page_image(item, n):
    path = os.path.join(C.SCANS, f"{item}_n{n}.jpg")
    if not (os.path.exists(path) and os.path.getsize(path) > 0):
        req = urllib.request.Request(f"https://archive.org/download/{item}/page/n{n}.jpg", headers={"User-Agent": C.UA})
        with urllib.request.urlopen(req, timeout=180) as r, open(path, "wb") as fh:
            fh.write(r.read())
    return path


def sheets(cfg, rows=14):
    """Each flagged word cut from its page image with the words either side,
    boxed in red and numbered, two columns of strips to a sheet."""
    from PIL import Image, ImageDraw
    flags = json.load(open(os.path.join(cfg["work"], "out", "flags.json")))
    P = {k: pages_of(cfg, k) for k in cfg["scans"]}
    strips = []
    for f in flags:
        if not f.get("box"):
            continue
        key = f.get("base") or cfg["read"]
        item = cfg["scans"][key][0]
        n = leaf(cfg, key, f["page"])
        im = Image.open(page_image(item, n)).convert("RGB")
        sc = im.size[0] / (P[key][n]["W"] or im.size[0])
        b = f["box"]
        y0, y1 = f["line"][1], f["line"][3]
        cx = (b[0] + b[2]) / 2
        x0 = max(0, cx - 420)
        x1 = min(P[key][n]["W"] or im.size[0] / sc, cx + 420)
        crop = im.crop((int(x0 * sc), max(0, int((y0 - 22) * sc)), int(x1 * sc), min(im.size[1], int((y1 + 22) * sc))))
        dr = ImageDraw.Draw(crop)
        dr.rectangle([int((b[0] - x0) * sc) - 3, int((b[1] - y0 + 22) * sc) - 3, int((b[2] - x0) * sc) + 3, int((b[3] - y0 + 22) * sc) + 3], outline=(220, 0, 0), width=2)
        w = 540
        crop = crop.resize((w, max(1, int(crop.size[1] * w / crop.size[0]))))
        strips.append((f["n"], crop))
    per = rows * 2
    for s_ in range(0, len(strips), per):
        group = strips[s_: s_ + per]
        col_h = [0, 0]
        place = []
        for i, (n, c) in enumerate(group):
            col = 0 if i < rows else 1
            place.append((n, c, col, col_h[col]))
            col_h[col] += c.size[1] + 6
        sheet = Image.new("RGB", (2 * (w + 50), max(col_h)), "white")
        dr = ImageDraw.Draw(sheet)
        for n, c, col, y in place:
            x = col * (w + 50) + 46
            sheet.paste(c, (x, y))
            dr.text((x - 44, y + c.size[1] // 2 - 6), str(n), fill=(0, 0, 200))
        sheet.save(os.path.join(cfg["work"], "out", f"sheet-{s_ // per + 1:03d}.jpg"), quality=85)
    print(f"{len(strips)} strips on {(len(strips) + per - 1) // per} sheets")


def final(cfg):
    """The corrections read on the page, applied: each is a page, the draft's
    words on it (found exactly once) and the page's."""
    fixes = []
    path = os.path.join(_here, cfg["fixes"])
    if os.path.exists(path):
        for n, line in enumerate(open(path, encoding="utf-8"), 1):
            if not line.strip() or line.startswith("#"):
                continue
            parts = line.rstrip("\n").split("\t")
            if len(parts) < 3:
                raise SystemExit(f"{cfg['fixes']}:{n}: page, the draft's words, the page's words, tab-separated")
            fixes.append((int(parts[0]), parts[1].replace("\\n", "\n"), parts[2].replace("\\n", "\n"), n))
    done = []
    errors = []  # every correction that does not apply, named at once
    for part in cfg["parts"]:
        text = open(os.path.join(cfg["work"], "out", f"{part['key']}.txt"), encoding="utf-8").read()
        lo, hi = part["pages"]
        for page, a, b, n in fixes:
            if not lo <= page <= hi:
                continue
            start = text.find("{" + str(page) + "}")
            end = text.find("{" + str(page + 1) + "}")
            if start < 0:
                errors.append(f"{cfg['fixes']}:{n}: page {page} not in {part['key']}")
                continue
            end = len(text) if end < 0 else end
            # A correction may reach a few words into the next page.
            end = min(len(text), end + 80)
            seg = text[start:end]
            if seg.count(a) != 1:
                errors.append(f"{cfg['fixes']}:{n}: {a!r} found {seg.count(a)} times on page {page}")
                continue
            text = text[:start] + seg.replace(a, b) + text[end:]
        open(os.path.join(cfg["work"], "final", f"{part['key']}.txt"), "w").write(text)
        done.append((part["key"], text))
        print(f"{part['key']}: {len(text.split())} words")
    if errors:
        raise SystemExit("\n".join(errors))
    if cfg.get("text"):
        # The book as the ingest reads it: each part under its heading.
        out = os.path.join(C.ROOT, cfg["text"])
        os.makedirs(os.path.dirname(out), exist_ok=True)
        open(out, "w").write("".join(f"=== {k} ===\n\n{t.strip()}\n\n" for k, t in done).rstrip() + "\n")
        print(f"wrote {cfg['text']}")


def main():
    cfg = C.settings(sys.argv[1])
    what = sys.argv[2]
    if what == "draft":
        a = int(sys.argv[3]) if len(sys.argv) > 3 else None
        b = int(sys.argv[4]) if len(sys.argv) > 4 else None
        draft(cfg, a, b)
    elif what == "sheets":
        sheets(cfg)
    elif what == "final":
        final(cfg)
    else:
        raise SystemExit(__doc__)


if __name__ == "__main__":
    main()
