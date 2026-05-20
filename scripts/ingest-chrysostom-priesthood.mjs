// St. John Chrysostom, On the Priesthood (NPNF1-09, public domain).
// The complete treatise in six books. Replaces the old 2-section stub.
//   Source: https://ccel.org/ccel/schaff/npnf109/cache/npnf109.txt
// Run from project root:  node scripts/ingest-chrysostom-priesthood.mjs

import fs from "node:fs/promises";
import path from "node:path";
import { getText, toParagraphs } from "./lib/npnf-homilies.mjs";

const OUT = path.join(
  process.cwd(),
  "data",
  "saints",
  "john-chrysostom",
  "on-the-priesthood.json",
);

const text = await getText(
  "npnf109.txt",
  "https://ccel.org/ccel/schaff/npnf109/cache/npnf109.txt",
);

// The six book headings, in body order (the TOC does not use bare "Book N."
// lines, so these six matches are the bodies).
const heads = [...text.matchAll(/^ {0,5}Book ([IVX]+)\.\s*$/gm)].map((m) => ({
  roman: m[1],
  idx: m.index,
  headerLen: m[0].length,
}));
if (heads.length !== 6) {
  throw new Error(`Expected 6 books, found ${heads.length}. Aborting.`);
}

// Book VI ends at the first long underscore divider after it.
const afterLast = text.slice(heads[5].idx);
const dividerOff = afterLast.search(/_{20,}/);
const regionEnd = dividerOff > 0 ? heads[5].idx + dividerOff : text.length;

const sections = heads.map((h, i) => {
  const bodyStart = h.idx + h.headerLen;
  const bodyEnd = i + 1 < heads.length ? heads[i + 1].idx : regionEnd;
  const paragraphs = toParagraphs(text.slice(bodyStart, bodyEnd));
  return { n: i + 1, title: `Book ${h.roman}`, paragraphs };
});

const totalChars = sections.reduce(
  (a, s) => a + s.paragraphs.reduce((b, p) => b + p.length, 0),
  0,
);
if (totalChars < 50000) {
  throw new Error(`Priesthood text only ${totalChars} chars; parse likely wrong.`);
}

const work = {
  saint: "john-chrysostom",
  slug: "on-the-priesthood",
  title: "On the Priesthood",
  subtitle: "The six books, complete",
  source:
    "St. John Chrysostom, A Treatise on the Priesthood. From the Nicene and Post-Nicene Fathers, Series 1, Vol. 9 (ed. Philip Schaff). Public domain.",
  sections,
};
await fs.writeFile(OUT, JSON.stringify(work, null, 2) + "\n", "utf8");
process.stdout.write(
  `On the Priesthood: ${sections.length} books, ${(totalChars / 1000).toFixed(0)}k chars -> ${path.relative(process.cwd(), OUT)}\n`,
);
