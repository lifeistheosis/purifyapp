// St. John Chrysostom, Commentary on Galatians (NPNF1-13, public domain).
// A continuous commentary (not numbered homilies): each chapter opens with a
// "Chapter N." heading and a "Verse X-Y" lemma, then uses "Ver. N." markers
// for subsequent verses. We key the exposition per-verse into the reader and
// also emit a readable 6-chapter work.
//   Source: https://ccel.org/ccel/schaff/npnf113/cache/npnf113.txt
// Run from project root:  node scripts/ingest-chrysostom-galatians.mjs

import fs from "node:fs/promises";
import path from "node:path";
import {
  getText,
  romanToInt,
  toParagraphs,
  splitByVerse,
} from "./lib/npnf-homilies.mjs";

const ROOT = process.cwd();
const GAL_VERSES = { 1: 24, 2: 21, 3: 29, 4: 31, 5: 26, 6: 18 };
const AUTHOR = "St. John Chrysostom";
const CITATION = "NPNF1-13";
const WORK_LABEL = "Commentary on Galatians";

const text = await getText(
  "npnf113.txt",
  "https://ccel.org/ccel/schaff/npnf113/cache/npnf113.txt",
);

// Region: from the Galatians section title to the Ephesians title block.
const titleI = text.search(/to the\s*\n\s*galatians/i);
const ephB = text.indexOf("Homilies of St. John Chrysostom,");
if (titleI < 0 || ephB < 0 || ephB <= titleI) {
  throw new Error("Could not bound the Galatians region.");
}
const region = text.slice(titleI, ephB);

const chapHeads = [...region.matchAll(/^ {3}Chapter ([IVX]+)\.\s*$/gm)];
if (chapHeads.length !== 6) {
  throw new Error(`Expected 6 Galatians chapters, found ${chapHeads.length}.`);
}

const sections = [];
const commentaryByChapter = new Map(); // chapter -> verse -> [{text}]

for (let i = 0; i < chapHeads.length; i++) {
  const h = chapHeads[i];
  const chapter = romanToInt(h[1]);
  const bodyStart = h.index + h[0].length;
  const bodyEnd = i + 1 < chapHeads.length ? chapHeads[i + 1].index : region.length;
  let block = region.slice(bodyStart, bodyEnd);

  // The opening "Verse X-Y" lemma gives the chapter's start verse; drop the
  // label line so it doesn't render as stray text.
  const lm = block.match(/^\s*Verses?\s+(\d+)/m);
  const startVerse = lm ? parseInt(lm[1], 10) : 1;
  block = block.replace(/^\s*Verses?\s+[\d,\s-]+\.?\s*$/m, "");

  const paragraphs = toParagraphs(block);
  sections.push({ n: chapter, title: `Chapter ${h[1]}, Galatians ${chapter}`, paragraphs });

  const byVerse = splitByVerse(paragraphs, startVerse);
  const chMap = new Map();
  for (const [verse, paras] of byVerse) chMap.set(verse, paras.join("\n\n"));
  commentaryByChapter.set(chapter, chMap);
}

// ---- Write the readable work ----
const workOut = path.join(ROOT, "data", "saints", "john-chrysostom", "commentary-on-galatians.json");
await fs.writeFile(
  workOut,
  JSON.stringify(
    {
      saint: "john-chrysostom",
      slug: "commentary-on-galatians",
      title: "Commentary on the Epistle to the Galatians",
      subtitle: "The complete commentary, all six chapters",
      source:
        "St. John Chrysostom, Commentary on the Epistle to the Galatians. From the Nicene and Post-Nicene Fathers, Series 1, Vol. 13 (ed. Philip Schaff). Public domain.",
      sections,
    },
    null,
    2,
  ) + "\n",
  "utf8",
);

// ---- Write per-verse commentary (galatians is a new book; no prior merge) ----
const dir = path.join(ROOT, "data", "bible", "commentary", "galatians");
await fs.mkdir(dir, { recursive: true });
let chaptersWritten = 0;
let totalNotes = 0;
const warnings = [];
for (const [chapter, chMap] of [...commentaryByChapter.entries()].sort((a, b) => a[0] - b[0])) {
  const obj = {};
  for (const [verse, txt] of [...chMap.entries()].sort((a, b) => a[0] - b[0])) {
    if (GAL_VERSES[chapter] && verse > GAL_VERSES[chapter]) {
      warnings.push(`Galatians ${chapter}:${verse} exceeds chapter length`);
    }
    obj[String(verse)] = [{ author: AUTHOR, work: WORK_LABEL, citation: CITATION, text: txt }];
    totalNotes++;
  }
  await fs.writeFile(path.join(dir, `${chapter}.json`), JSON.stringify(obj, null, 2) + "\n", "utf8");
  chaptersWritten++;
}

process.stdout.write(
  `Galatians: 6 chapters, ${sections.length} work sections; commentary ${chaptersWritten} chapters, ${totalNotes} notes\n`,
);
if (warnings.length) process.stdout.write(`  warnings: ${warnings.slice(0, 6).join("; ")}\n`);
