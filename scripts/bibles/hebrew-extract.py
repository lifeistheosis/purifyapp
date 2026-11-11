"""
Reads the Westminster Leningrad Codex from CrossWire's SWORD module (WLC 2.0,
public domain, its conf: "DistributionLicense=Public Domain", from the
Westminster Hebrew Institute and tanach.us) and writes the Hebrew of the 39
books the Hebrew Bible holds, for the Old Testament's interlinear (1.9, the
Discord's "Add Hebrew", on the arbiter's word: the Hebrew beside the Old
Testament as the Greek is beside the New, a study aid; the Church's Old
Testament is the Septuagint). docs/1.9-build/BIBLES.md has the story.

The text is the module's, in its own numbering (the conf names the
versification, Leningrad, which is the original-language numbering the
Copenhagen maps call "org"). Only marks are taken away, never a letter:

  - the cantillation, U+0591 to U+05AF, and with it the meteg (U+05BD), the
    paseq (U+05C0) and the combining grapheme joiner (U+034F) the WLC uses to
    hold marks in order: the pointed text without cantillation, the arbiter's
    choice. The points, the dagesh, the shin and sin dots, the maqaf and the
    sof pasuq stay.
  - Where the written word and the word read differ (ketiv and qere), the
    module gives both, the written one unpointed and then the one read,
    pointed (Genesis 8:17, "הוצא הַיְצֵא"). The written word is set in round
    brackets before it, so the line reads as it is read and says what is
    written: "(הוצא) הַיְצֵא". A written word that is not read (ketiv without
    qere) is bracketed the same way.

Anything that looks like markup stops the run.

    pip install pysword==0.2.8
    python3 -I scripts/bibles/hebrew-extract.py <module folder> <out folder>

The module folder is the unzipped module (mods.d/ and modules/). Run with -I,
as with any file downloaded from outside: Python then reads nothing from the
folder it runs in. One file per book is written, data/bible/hebrew/<slug>.json,
in the shape of the downloaded Bibles' files (public/bibles/<id>/<book>.json),
so scripts/bibles/compare-map.mjs places it as it places them.
"""

import hashlib
import json
import os
import re
import sys

from pysword.modules import SwordModules

# The module's books, by its OSIS names, to the app's slugs (data/bible/books.json).
BOOKS = {
    "Gen": "genesis", "Exod": "exodus", "Lev": "leviticus", "Num": "numbers", "Deut": "deuteronomy",
    "Josh": "joshua", "Judg": "judges", "Ruth": "ruth", "1Sam": "1-samuel", "2Sam": "2-samuel",
    "1Kgs": "1-kings", "2Kgs": "2-kings", "1Chr": "1-chronicles", "2Chr": "2-chronicles",
    "Ezra": "ezra", "Neh": "nehemiah", "Esth": "esther", "Job": "job", "Ps": "psalms",
    "Prov": "proverbs", "Eccl": "ecclesiastes", "Song": "song-of-solomon", "Isa": "isaiah",
    "Jer": "jeremiah", "Lam": "lamentations", "Ezek": "ezekiel", "Dan": "daniel", "Hos": "hosea",
    "Joel": "joel", "Amos": "amos", "Obad": "obadiah", "Jonah": "jonah", "Mic": "micah",
    "Nah": "nahum", "Hab": "habakkuk", "Zeph": "zephaniah", "Hag": "haggai", "Zech": "zechariah",
    "Mal": "malachi",
}

CANTILLATION = re.compile("[\u0591-\u05AF\u05BD\u034F]")
PASEQ = re.compile("\\s*\u05C0\\s*")
# What makes a word pointed: a vowel, the dagesh, the shin or sin dot, the qamats qatan.
POINTED = re.compile("[\u05B0-\u05BC\u05C1\u05C2\u05C7]")
LETTER = re.compile("[\u05D0-\u05EA]")
MARKUP = re.compile("[<>&]")


def clean(text):
    text = CANTILLATION.sub("", text)
    text = PASEQ.sub(" ", text)
    return re.sub("\\s+", " ", text).strip()


def bracket_written(text):
    """Each unpointed word (what is written and not read as written) in round brackets before the one read."""
    words = text.split(" ")
    out = []
    written = 0
    for w in words:
        if LETTER.search(w) and not POINTED.search(w):
            out.append(f"({w})")
            written += 1
        else:
            out.append(w)
    return " ".join(out), written


def main(module_dir, out_dir):
    mods = SwordModules(module_dir)
    mods.parse_modules()
    bible = mods.get_bible_from_module("WLC")
    books = {b.osis_name: b for b in bible.get_structure().get_books()["ot"]}
    if set(books) != set(BOOKS):
        raise SystemExit(f"the module's books are not the 39 expected: {sorted(set(books) ^ set(BOOKS))}")
    os.makedirs(out_dir, exist_ok=True)
    totals = {"verses": 0, "empty": 0, "written": 0, "bytes": 0}
    for osis, slug in BOOKS.items():
        book = books[osis]
        chapters = []
        for c in range(1, book.num_chapters + 1):
            verses = []
            for v in range(1, book.chapter_lengths[c - 1] + 1):
                raw = bible.get(books=[osis.lower()], chapters=[c], verses=[v], clean=True)
                if MARKUP.search(raw):
                    raise SystemExit(f"markup in {osis} {c}:{v}: {raw[:80]!r}")
                text = clean(raw)
                if not text:
                    totals["empty"] += 1
                    continue
                text, written = bracket_written(text)
                totals["written"] += written
                totals["verses"] += 1
                verses.append([v, text])
            chapters.append(verses)
        body = json.dumps({"chapters": chapters}, ensure_ascii=False, separators=(",", ":"))
        doc = {
            "bible": "he-wlc",
            "book": slug,
            "hash": hashlib.sha256(body.encode("utf-8")).hexdigest()[:12],
            "chapters": chapters,
        }
        data = json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + "\n"
        with open(os.path.join(out_dir, f"{slug}.json"), "w", encoding="utf-8") as f:
            f.write(data)
        totals["bytes"] += len(data.encode("utf-8"))
    print(json.dumps(totals))


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    main(sys.argv[1], sys.argv[2])
