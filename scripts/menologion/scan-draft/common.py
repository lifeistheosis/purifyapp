"""What the scan-draft tools share: the month's settings and where work goes.

Every tool takes the settings file first (november-butler.json beside this
file is November's): which scans of the printing to read (`volumes`: the scan
whose page images are read, then a second scan of the same printing), the
Lives to cut and the words that find each heading (`lives`), and the other
printings to vote with (`others`). Work goes to
scripts/.cache/scan-draft/<settings name>/ (gitignored): out/ for drafts,
pages and sheets, fix/ for the corrections read on the page, final/ for the
texts. Scans are fetched from archive.org into scripts/.cache/scans/, where
the ingest keeps them.
"""
import json
import os
import re
import urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))
SCANS = os.path.join(ROOT, "scripts", ".cache", "scans")
UA = "PurifyApp public-domain check"


def settings(path):
    cfg = json.load(open(path, encoding="utf-8"))
    name = os.path.splitext(os.path.basename(path))[0]
    work = os.path.join(ROOT, "scripts", ".cache", "scan-draft", name)
    for sub in ("out", "fix", "final"):
        os.makedirs(os.path.join(work, sub), exist_ok=True)
    cfg["work"] = work
    return cfg


def fetch(url, path):
    if not (os.path.exists(path) and os.path.getsize(path) > 0):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=300) as r, open(path, "wb") as fh:
            fh.write(r.read())
    return path


def scan_file(scan, kind):
    """A scan's djvu.xml or djvu.txt, cached. A scan whose files are not named
    after it is given as "<item>/<file stem>" (the Digital Library of India's)."""
    item, stem = (scan.split("/", 1) + [None])[:2]
    stem = stem or item
    ext = {"xml": "_djvu.xml", "txt": "_djvu.txt"}[kind]
    local = os.path.join(SCANS, f"{item}{'_djvu.xml' if kind == 'xml' else '.txt'}")
    return fetch(f"https://archive.org/download/{item}/{urllib.request.quote(stem + ext)}", local)


def vocab(cfg):
    """Words period English texts use, from the library's cached sources
    (CCEL, Gutenberg) and the app's Bible: a word outside it is read on the page."""
    path = os.path.join(cfg["work"], "vocab.json")
    if not os.path.exists(path):
        import collections, glob
        cnt = collections.Counter()
        for f in glob.glob(os.path.join(ROOT, "scripts", ".cache", "ccel", "*.txt")) + glob.glob(os.path.join(ROOT, "scripts", ".cache", "gutenberg", "*.txt")):
            cnt.update(re.findall(r"[a-zæœ]+(?:'[a-z]+)?", open(f, encoding="utf-8", errors="replace").read().lower()))
        for f in glob.glob(os.path.join(ROOT, "data", "bible", "*", "*.json")):
            try:
                for v in json.load(open(f)).get("verses", []):
                    cnt.update(re.findall(r"[a-z]+", v.get("text", "").lower()))
            except Exception:
                pass
        json.dump(sorted(w for w, c in cnt.items() if c >= 2), open(path, "w"))
    return set(json.load(open(path)))
