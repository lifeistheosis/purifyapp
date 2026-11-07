"""
Reads a SWORD Bible module (CrossWire's format) and writes its text as plain
JSON, for scripts/bibles/build.mjs to make the readers' files from.

Used for the Russian Synodal of 1876 (CrossWire's RusSynodal, 1.9.1, public
domain, 78 books with the deuterocanon; docs/1.9-build/BIBLES.md). The text is
taken as the module holds it, in the module's own numbering (its conf names
the versification, Synodal), with its markup removed by pysword's own cleaner:
no word is changed. A verse the module leaves empty is left out and counted.

Three places in 1.9.1 hold markup written as text (escaped, so the cleaner
passes it by), and are mended here, each by what the markup says it is:

  - a translator's note in Job 2:9 and 9:9 (<note>): left out, as every
    footnote is; the readers' files carry the text of Scripture only;
  - Psalm 144's title, "Хвала Давида." (<title type="psalm">), stranded at
    the end of Psalm 143:15: set at the head of Psalm 144:1, where the
    Synodal prints it and where this module puts every other psalm's title.

Anything else that looks like markup stops the run.

    pip install pysword==0.2.8
    python3 -I scripts/bibles/sword-extract.py <module folder> <out.json>

The module folder is the unzipped module (mods.d/ and modules/). Run with -I,
as with any file downloaded from outside: Python then reads nothing from the
folder it runs in.
"""

import html
import json
import re
import sys

from pysword.modules import SwordModules


NOTE = re.compile(r"<note\b[^>]*>.*?</note>", re.S)
TITLE = re.compile(r"\s*<title\b[^>]*>(.*?)</title>\s*$", re.S)


def mend(text, where):
    """The verse's text with escaped markup mended, and a title it carries for the next verse."""
    text = html.unescape(text)
    text = NOTE.sub("", text)
    carried = None
    m = TITLE.search(text)
    if m:
        carried = " ".join(m.group(1).split())
        text = text[: m.start()]
    if "<" in text or ">" in text:
        raise SystemExit("markup left in %s: %s" % (where, text[:120]))
    return " ".join(text.split()), carried


def main(root, out_path):
    modules = SwordModules(root)
    found = modules.parse_modules()
    if len(found) != 1:
        raise SystemExit("expected one module in %s, found %d" % (root, len(found)))
    name, conf = next(iter(found.items()))
    bible = modules.get_bible_from_module(name)
    structure = bible.get_structure().get_books()
    books = []
    empty = 0
    mended = []
    for testament in ("ot", "nt"):
        for book in structure.get(testament, []):
            chapters = []
            carried = None
            for c, length in enumerate(book.chapter_lengths, start=1):
                verses = []
                for v in range(1, length + 1):
                    where = "%s %d:%d" % (book.osis_name, c, v)
                    raw = bible.get(books=[book.name], chapters=[c], verses=[v], clean=True)
                    text, title = mend(raw, where)
                    if text != " ".join(html.unescape(raw).split()):
                        mended.append(where)
                    if carried:
                        # A title is carried only to the first verse of the next psalm.
                        if book.osis_name != "Ps" or v != 1:
                            raise SystemExit("a title stranded before %s" % where)
                        text = carried + " " + text
                        mended.append(where)
                        carried = None
                    if title:
                        if book.osis_name != "Ps" or v != length:
                            raise SystemExit("a title inside %s" % where)
                        carried = title
                    if text:
                        verses.append([v, text])
                    else:
                        empty += 1
                chapters.append(verses)
            if carried:
                raise SystemExit("a title stranded at the end of %s" % book.osis_name)
            books.append({"osis": book.osis_name, "name": book.name, "chapters": chapters})
    out = {
        "module": name,
        "version": conf.get("version", ""),
        "versification": conf.get("versification", ""),
        "license": conf.get("distributionlicense", ""),
        "empty": empty,
        "mended": mended,
        "books": books,
    }
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False)
    print("%s %s: %d books, %d empty verses left out, mended %s" % (name, out["version"], len(books), empty, ", ".join(mended) or "nothing"))


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    main(sys.argv[1], sys.argv[2])
