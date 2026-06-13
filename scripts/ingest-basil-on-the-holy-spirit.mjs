// St. Basil the Great, On the Holy Spirit / De Spiritu Sancto (NPNF2-08,
// public domain). The complete treatise in thirty chapters, trans.
// Blomfield Jackson.
//   Source: https://ccel.org/ccel/schaff/npnf208/cache/npnf208.txt
// Run from project root:  node scripts/ingest-basil-on-the-holy-spirit.mjs

import fs from "node:fs/promises";
import path from "node:path";
import { getText, toParagraphs } from "./lib/npnf-homilies.mjs";

const OUT = path.join(
  process.cwd(),
  "data",
  "saints",
  "basil-the-great",
  "on-the-holy-spirit.json",
);

const text = await getText(
  "npnf208.txt",
  "https://ccel.org/ccel/schaff/npnf208/cache/npnf208.txt",
);

// The thirty chapter headings are the only "Chapter N." lines in the volume
// (the Hexaemeron that follows uses "Homily N."). The chapter title sits on
// the next non-empty line after the bare "Chapter N." marker.
const heads = [...text.matchAll(/^\s*Chapter ([IVXL]+)\.\s*$/gm)].map((m) => ({
  roman: m[1],
  markerStart: m.index,
  markerEnd: m.index + m[0].length,
}));
if (heads.length !== 30) {
  throw new Error(`Expected 30 chapters, found ${heads.length}. Aborting.`);
}

// Chapter XXX ends where the translator's editorial matter begins: after
// Basil's last words the volume inserts an "Introduction to the Hexæmeron"
// (third-person notes on the work's fame, Photius, dating) before the
// Hexaemeron homilies. Basil never names his own treatise, so cut at that
// editorial heading rather than at the later "Homily I." marker.
const afterLast = text.slice(heads[29].markerEnd);
const edOff = afterLast.search(/Introduction to the Hex/);
const regionEnd = edOff > 0 ? heads[29].markerEnd + edOff : text.length;

// NPNF2-08 carries a heavier critical apparatus than the Chrysostom homily
// volumes the shared helper was tuned for: footnote DEFINITIONS appear as
// blank-line-delimited blocks whose first line starts with "[NNN]" and wrap
// across several indented lines (Migne references, editor's notes). The
// shared toParagraphs only drops the first such line, so the continuations
// bleed into Basil's text. Strip whole footnote blocks before paragraphing.
// Body paragraphs never start with "[NNN]", so this only removes apparatus.
function stripFootnoteBlocks(raw) {
  const blocks = raw.split(/\n\s*\n/);
  return blocks
    .filter((b) => {
      const firstLine = b.split("\n").find((l) => l.trim() !== "") ?? "";
      return !/^\s*\[\d+\]/.test(firstLine);
    })
    .join("\n\n");
}

function splitTitleBody(slice) {
  // First non-empty block is the chapter title; the remainder is the body.
  const lines = slice.split("\n");
  let i = 0;
  while (i < lines.length && lines[i].trim() === "") i++;
  const titleLines = [];
  while (i < lines.length && lines[i].trim() !== "") {
    titleLines.push(lines[i].trim());
    i++;
  }
  const title = titleLines.join(" ").replace(/\s+/g, " ").replace(/\.$/, "");
  const body = lines.slice(i).join("\n");
  return { title, body };
}

const sections = heads.map((h, i) => {
  const bodyStart = h.markerEnd;
  const bodyEnd = i + 1 < heads.length ? heads[i + 1].markerStart : regionEnd;
  const { title, body } = splitTitleBody(text.slice(bodyStart, bodyEnd));
  return {
    n: i + 1,
    title: title ? `Chapter ${h.roman}. ${title}` : `Chapter ${h.roman}`,
    paragraphs: toParagraphs(stripFootnoteBlocks(body)),
  };
});

const totalChars = sections.reduce(
  (a, s) => a + s.paragraphs.reduce((b, p) => b + p.length, 0),
  0,
);
if (totalChars < 80000) {
  throw new Error(`On the Holy Spirit only ${totalChars} chars; parse likely wrong.`);
}
const empty = sections.filter((s) => s.paragraphs.length === 0);
if (empty.length) {
  throw new Error(`Empty sections: ${empty.map((s) => s.n).join(", ")}`);
}

const work = {
  saint: "basil-the-great",
  slug: "on-the-holy-spirit",
  title: "On the Holy Spirit",
  subtitle: "The treatise De Spiritu Sancto, complete in thirty chapters",
  source:
    "St. Basil the Great, On the Holy Spirit (De Spiritu Sancto), translated by the Rev. Blomfield Jackson. From the Nicene and Post-Nicene Fathers, Series 2, Vol. 8 (ed. Philip Schaff and Henry Wace). Public domain.",
  sections,
};
await fs.writeFile(OUT, JSON.stringify(work, null, 2) + "\n", "utf8");
process.stdout.write(
  `On the Holy Spirit: ${sections.length} chapters, ${(totalChars / 1000).toFixed(0)}k chars -> ${path.relative(process.cwd(), OUT)}\n`,
);
