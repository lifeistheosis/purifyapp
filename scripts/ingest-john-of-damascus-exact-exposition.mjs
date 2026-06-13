// St. John of Damascus, An Exposition of the Orthodox Faith (the Exact
// Exposition / Ekdosis akribes), NPNF2-09, public domain. The complete work
// in four books, ninety-nine chapters, trans. S.D.F. Salmond.
//   Source: https://ccel.org/ccel/schaff/npnf209/cache/npnf209.txt
// Run from project root:
//   node scripts/ingest-john-of-damascus-exact-exposition.mjs

import fs from "node:fs/promises";
import path from "node:path";
import { getText, toParagraphs } from "./lib/npnf-homilies.mjs";

const OUT = path.join(
  process.cwd(),
  "data",
  "saints",
  "john-of-damascus",
  "exact-exposition-of-the-orthodox-faith.json",
);

const text = await getText(
  "npnf209.txt",
  "https://ccel.org/ccel/schaff/npnf209/cache/npnf209.txt",
);

// The work sits near the end of the volume (Hilary's De Trinitate precedes
// it). Anchor on its title line, then read forward.
const start = text.search(/^\s*Exposition of the Orthodox Faith\.\s*$/m);
if (start < 0) throw new Error("Could not find the Exposition title.");
const region = text.slice(start);

const books = [...region.matchAll(/^\s*Book ([IVX]+)\.\s*$/gm)].map((m) => ({
  roman: m[1],
  idx: m.index,
}));
if (books.length !== 4) {
  throw new Error(`Expected 4 books, found ${books.length}.`);
}

// Footnote DEFINITION blocks (blank-line-delimited, first line "[NNNN] ...")
// carry the critical apparatus and must not bleed into the saint's text.
function stripFootnoteBlocks(raw) {
  return raw
    .split(/\n\s*\n/)
    .filter((b) => {
      const first = b.split("\n").find((l) => l.trim() !== "") ?? "";
      return !/^\s*\[\d+\]/.test(first);
    })
    .join("\n\n");
}

const CHAP = /^\s*Chapter ([IVXLC]+)\.--/gm;

const sections = [];
let n = 0;
for (let bi = 0; bi < books.length; bi++) {
  let bookEnd =
    bi + 1 < books.length ? books[bi + 1].idx : region.length;
  let seg = region.slice(books[bi].idx, bookEnd);
  // Book IV is the last; trim its trailing matter (indices, elucidations)
  // at the long underscore divider that follows the final chapter.
  if (bi === books.length - 1) {
    const chaps = [...seg.matchAll(CHAP)];
    const lastIdx = chaps[chaps.length - 1].index;
    const divOff = seg.slice(lastIdx).search(/_{30,}/);
    if (divOff > 0) seg = seg.slice(0, lastIdx + divOff);
  }
  const marks = [...seg.matchAll(CHAP)].map((m) => ({
    roman: m[1],
    idx: m.index,
  }));
  for (let ci = 0; ci < marks.length; ci++) {
    const cStart = marks[ci].idx;
    const cEnd = ci + 1 < marks.length ? marks[ci + 1].idx : seg.length;
    const slice = seg.slice(cStart, cEnd);
    // Heading runs from "Chapter N.--" to the first blank line; the rest is body.
    const blank = slice.search(/\n\s*\n/);
    const headRaw = blank > 0 ? slice.slice(0, blank) : slice;
    const body = blank > 0 ? slice.slice(blank) : "";
    const title = headRaw
      .replace(/^\s*Chapter [IVXLC]+\.--/, "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\.$/, "");
    n += 1;
    sections.push({
      n,
      title: `Book ${books[bi].roman}, Chapter ${marks[ci].roman}. ${title}`,
      paragraphs: toParagraphs(stripFootnoteBlocks(body)),
    });
  }
}

if (sections.length !== 99) {
  throw new Error(`Expected 99 chapters, built ${sections.length}.`);
}
const empty = sections.filter((s) => s.paragraphs.length === 0);
if (empty.length) {
  throw new Error(`Empty sections: ${empty.map((s) => s.n).join(", ")}`);
}
const totalChars = sections.reduce(
  (a, s) => a + s.paragraphs.reduce((b, p) => b + p.length, 0),
  0,
);
if (totalChars < 150000) {
  throw new Error(`Only ${totalChars} chars; parse likely wrong.`);
}

const work = {
  saint: "john-of-damascus",
  slug: "exact-exposition-of-the-orthodox-faith",
  title: "An Exact Exposition of the Orthodox Faith",
  subtitle: "The Exact Exposition, complete in four books",
  source:
    "St. John of Damascus, An Exposition of the Orthodox Faith, translated by the Rev. S.D.F. Salmond. From the Nicene and Post-Nicene Fathers, Series 2, Vol. 9 (ed. Philip Schaff and Henry Wace). Public domain.",
  sections,
};
await fs.writeFile(OUT, JSON.stringify(work, null, 2) + "\n", "utf8");
process.stdout.write(
  `Exact Exposition: ${sections.length} chapters, ${(totalChars / 1000).toFixed(0)}k chars -> ${path.relative(process.cwd(), OUT)}\n`,
);
