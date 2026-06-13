// The Way of a Pilgrim (Otkrovennye rasskazy strannika), anonymous,
// nineteenth-century Russia, trans. R. M. French (Philip Allan, 1930;
// public domain). The four accounts of the wandering pilgrim who learns
// to pray the Jesus Prayer without ceasing.
//   Source: https://ccel.org/ccel/philip_allan/pilgrim/cache/pilgrim.txt
// Hosted on St. Theophan the Recluse's profile: the work is anonymous,
// and St. Theophan produced the corrected Russian recension and wrote
// the standard Orthodox teaching on the Jesus Prayer the pilgrim learns.
// Run from project root:  node scripts/ingest-way-of-a-pilgrim.mjs

import fs from "node:fs/promises";
import path from "node:path";
import { getText, toParagraphs } from "./lib/npnf-homilies.mjs";

const OUT = path.join(
  process.cwd(),
  "data",
  "saints",
  "theophan-the-recluse",
  "way-of-a-pilgrim.json",
);

const text = await getText(
  "pilgrim.txt",
  "https://ccel.org/ccel/philip_allan/pilgrim/cache/pilgrim.txt",
);

// Footnote DEFINITION blocks (blank-line-delimited, first line "[N] ...").
function stripFootnoteBlocks(raw) {
  return raw
    .split(/\n\s*\n/)
    .filter((b) => {
      const first = b.split("\n").find((l) => l.trim() !== "") ?? "";
      return !/^\s*\[\d+\]/.test(first);
    })
    .join("\n\n");
}

// The volume splits on long underscore rules. The four accounts are the
// segments whose first non-empty line is exactly the roman numeral I-IV;
// front matter, the footnote blocks, and the CCEL back matter are skipped.
const ROMANS = ["I", "II", "III", "IV"];
const TITLES = [
  "The First Account",
  "The Second Account",
  "The Third Account",
  "The Fourth Account",
];
const segs = text.split(/_{30,}/);

const sections = [];
for (const seg of segs) {
  const lines = seg.split("\n");
  const firstIdx = lines.findIndex((l) => l.trim() !== "");
  if (firstIdx < 0) continue;
  const head = lines[firstIdx].trim();
  const ri = ROMANS.indexOf(head);
  if (ri < 0) continue;
  const body = lines.slice(firstIdx + 1).join("\n");
  sections.push({
    ri,
    n: ri + 1,
    title: TITLES[ri],
    paragraphs: toParagraphs(stripFootnoteBlocks(body)),
  });
}
sections.sort((a, b) => a.ri - b.ri);
sections.forEach((s) => delete s.ri);

if (sections.length !== 4) {
  throw new Error(`Expected 4 accounts, built ${sections.length}.`);
}
const empty = sections.filter((s) => s.paragraphs.length === 0);
if (empty.length) throw new Error(`Empty sections: ${empty.map((s) => s.n)}`);
const totalChars = sections.reduce(
  (a, s) => a + s.paragraphs.reduce((b, p) => b + p.length, 0),
  0,
);
if (totalChars < 120000) {
  throw new Error(`Only ${totalChars} chars; parse likely wrong.`);
}

const work = {
  saint: "theophan-the-recluse",
  slug: "way-of-a-pilgrim",
  title: "The Way of a Pilgrim",
  subtitle: "The four accounts of the wanderer who learns to pray without ceasing",
  source:
    "The Way of a Pilgrim (Otkrovennye rasskazy strannika), anonymous, nineteenth-century Russia, in the recension corrected by St. Theophan the Recluse; translated by R. M. French. London: Philip Allan & Co., 1930. Public domain.",
  sections,
};
await fs.mkdir(path.dirname(OUT), { recursive: true });
await fs.writeFile(OUT, JSON.stringify(work, null, 2) + "\n", "utf8");
process.stdout.write(
  `Way of a Pilgrim: ${sections.length} accounts, ${(totalChars / 1000).toFixed(0)}k chars -> ${path.relative(process.cwd(), OUT)}\n`,
);
