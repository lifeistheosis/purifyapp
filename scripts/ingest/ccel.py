"""Pull the translator's running text out of a CCEL page.

A CCEL page is a scan of a printed critical edition, so the body text is
interleaved with the printed apparatus: footnote markers, Greek glosses,
manuscript variants, and the American editor's bracketed insertions signed
"P.S." (Philip Schaff). None of that is the Father speaking, and none of it
belongs in a corpus that claims to be verbatim.

The apparatus is removed structurally, by walking the markup, rather than by
pattern-matching the prose. Guessing at prose is how you silently delete a
clause the author actually wrote.

Fetching is curl's job. Python's SSL stack is not usable in this sandbox.
"""
import html
import pathlib
import re
import sys


def read(path: str) -> str:
    return pathlib.Path(path).read_text(encoding="utf8", errors="replace")


def strip_nested(markup: str, tag: str, cls: str) -> str:
    """Remove every <tag class="...cls..."> element, including nested copies
    of the same tag. A non-greedy regex cannot do this: it stops at the first
    closing tag, which for span.mnote lands in the middle of the footnote."""
    open_re = re.compile(rf'<{tag}[^>]*class="[^"]*\b{cls}\b[^"]*"[^>]*>', re.I)
    any_re = re.compile(rf"<(/?){tag}\b[^>]*>", re.I)

    while True:
        m = open_re.search(markup)
        if not m:
            return markup
        depth, i = 1, m.end()
        while depth and i < len(markup):
            t = any_re.search(markup, i)
            if not t:
                break
            depth += -1 if t.group(1) else 1
            i = t.end()
        markup = markup[: m.start()] + markup[i:]


# The American editor's own insertions, always closed with his initials.
EDITOR_INSERT = re.compile(r"\[[^\[\]]{0,600}?—?\s*P\.\s?S\.\s*\]", re.S)
# Collation notes lifted from the apparatus into the line.
MS_VARIANT = re.compile(r"\b(One|Some|Most|Two|Three)\s+mss?\.[^.]*\.\s*", re.I)


def paragraphs(raw: str):
    m = re.search(r'<div class="page".*?>(.*)</div>\s*</div>', raw, re.S)
    body = m.group(1) if m else raw

    body = strip_nested(body, "span", "mnote")  # footnote bodies
    body = strip_nested(body, "span", "Footnote")
    body = re.sub(r"<sup[^>]*>.*?</sup>", "", body, flags=re.S)  # markers

    out = []
    for chunk in re.findall(r"<p[^>]*>(.*?)</p>", body, re.S):
        # Tags become a space, not nothing. Dropping them outright fuses
        # words across inline markup ("eternallife" for "eternal life").
        chunk = re.sub(r"<[^>]+>", " ", chunk)
        chunk = html.unescape(chunk).replace("\xa0", " ")
        chunk = EDITOR_INSERT.sub("", chunk)
        chunk = MS_VARIANT.sub("", chunk)
        # Section markers like "[2.]" that the edition prints inline.
        chunk = re.sub(r"^\s*\[\d+\.\]\s*", "", chunk)
        # Printed page numbers that fall mid-sentence in the scan.
        chunk = re.sub(r"(?<=[a-z,]) \d{1,4} (?=[a-z])", " ", chunk)
        chunk = re.sub(r"\s+([,.;:])", r"\1", chunk)
        # Turning tags into spaces leaves gaps inside brackets and quotes:
        # "( fine )", "“ Verily". Close them back up.
        chunk = re.sub(r"\(\s+", "(", chunk)
        chunk = re.sub(r"\s+\)", ")", chunk)
        chunk = re.sub(r"\[\s+", "[", chunk)
        chunk = re.sub(r"\s+\]", "]", chunk)
        chunk = re.sub(r"“\s+", "“", chunk)
        chunk = re.sub(r"\s+”", "”", chunk)
        chunk = re.sub(r"\s+", " ", chunk).strip()
        if len(chunk.split()) < 12:
            continue
        out.append(chunk)
    return out


def residue(text: str):
    """Anything that suggests apparatus survived. Printed so a human can
    look before this text is ever shipped."""
    flags = []
    # A parenthesised Greek word is the translator's own gloss, printed in
    # the running text: "four principal (καθολικαί) covenants". That belongs
    # to the translation and stays. Bare Greek is a footnote that leaked out
    # of the apparatus, and does not.
    bare = re.sub(r"\(\s*[Ͱ-Ͽἀ-῿][^)]*\)", "", text)
    if re.search(r"[Ͱ-Ͽἀ-῿]", bare):
        flags.append("greek-gloss")
    if re.search(r"\bP\.\s?S\.", text):
        flags.append("editor-initials")
    if re.search(r"\bmss?\.", text, re.I):
        flags.append("ms-variant")
    if re.search(r"\bibid\.|\bcomp\.\s|\bvid\.", text, re.I):
        flags.append("apparatus-abbrev")
    return flags


if __name__ == "__main__":
    for i, p in enumerate(paragraphs(read(sys.argv[1]))):
        r = residue(p)
        print(f"--- [{i}] {len(p.split())}w {'!! ' + ','.join(r) if r else ''}")
        print(p)
