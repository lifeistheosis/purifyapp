# Typing a printing from its scans

For a printed English edition that no one has transcribed (no CCEL, no
Gutenberg): Butler's Lives, November 2026. The tools draft the text from two
scans of the same printing and show every place the page must settle; the
page images settle them; then the month's ingest checks the text against
scans that did not draft it (`scripts/ingest-witness-lives.mjs`).

They need Python 3 with Pillow. Every tool takes the settings file first
(`november-butler.json` is November's); work goes to
`scripts/.cache/scan-draft/<settings name>/` (gitignored).

1. **Settings.** Two scans of one printing for each volume (`volumes`: first
   the scan whose page images you will read, then a second scan of the same
   printing, line for line the same), the Lives and the words of each heading
   (`lives`), and other printings of the same text to vote with (`others`).
   archive.org's advanced search finds the scans; a title page tells you
   whether two scans are one printing.
2. `extract.py <settings> <key>` cuts the Life from both scans by their word
   boxes (running heads, notes in the smaller type or two columns, and
   stray marks out) and lines the two up word by word: `out/<key>.json`.
3. `draft.py <settings> <key>` writes the draft (`out/<key>.txt`: paragraphs
   as printed, line-end hyphens joined, the printer's running quotation marks
   off) and the flags to read (`out/<key>.flags.txt`: where the scans disagree,
   a word no period text has, a stop, a quotation mark, a hyphen), with what
   the other printings read there. Where the second scan and another printing
   agree against the first, their word is put in, and flagged.
4. `pages.py <settings> <key>` draws each page with what the draft kept
   (green) and left out (red): read every page image against
   `proof.py <settings> <key> <page>`, which prints the page's lines with the
   second scan's readings. `crops.py` cuts any word at full size.
5. Settle what the page says: corrections as `[draft, page]` pairs in
   `fix/<key>.json` and `apply.py <settings> <key>`, or, where the draft is
   too tangled (long dialogue), the text typed from the page images into
   `final/<key>.txt`. `diffcheck.py <settings> <key>` then lists every word
   of the text that differs from the first scan's, with the second scan's
   reading: each must be a correction you read on the page.
6. Put the texts in the month's spec as typed passages
   (`scripts/menologion/<month>-held.mjs`, generated from the finals) with
   the scans that did not draft them, and run the ingest's `--check`.

A misprint of the page itself is kept and named in the source line
("harshnesss", November). What November's drafts got wrong, and the page put
right: a year ("389" for "387"), names ("aiaebins" for "Eusebius"), words run
together ("sucha", "stoodsome"), footnotes in two columns run into the text,
and a footnote's mark read as a quotation mark.
