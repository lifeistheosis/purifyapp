// Ingest St. Victorinus of Pettau's Commentary on the Apocalypse (ANF vol. 7,
// trans. Robert Ernest Wallis, public domain) into per-verse commentary at
// data/bible/commentary/revelation/<chapter>.json — the earliest surviving
// commentary on Revelation, from a bishop-martyr of the Diocletianic
// persecution (c. 303), and the book's first patristic voice in the app.
//
//   Source: https://www.ccel.org/ccel/schaff/anf07/cache/anf07.txt
//   Run from the project root: node scripts/ingest-victorinus-apocalypse.mjs
//
// Structure: lowercase "from the <ordinal> chapter." headers; sections open
// with `N. "quoted lemma..."]` where N is the verse; bracket-quote paragraphs
// without a number continue the current verse. The extant text covers
// chapters 1–15, 17, 19, 20, and 21–22 together (the last is keyed against
// chapter 21, clamped). Verse numbers are clamped to the app's KJV chapter
// lengths. No text is fabricated: every note is the cleaned source paragraph.

import fs from "node:fs/promises";
import path from "node:path";

import { getText, cleanInline } from "./lib/npnf-homilies.mjs";

const ROOT = process.cwd();
const SRC_URL = "https://www.ccel.org/ccel/schaff/anf07/cache/anf07.txt";
const OUT_DIR = path.join(ROOT, "data", "bible", "commentary", "revelation");
const BIBLE_DIR = path.join(ROOT, "data", "bible", "revelation");

const AUTHOR = "St. Victorinus of Pettau";
const WORK = "Commentary on the Apocalypse";
const CITATION = "ANF07";

const ORDINALS = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7,
  eighth: 8, ninth: 9, tenth: 10, eleventh: 11, twelfth: 12, thirteenth: 13,
  fourteenth: 14, fifteenth: 15, sixteenth: 16, seventeenth: 17,
  eighteenth: 18, nineteenth: 19, twentieth: 20, "twenty-first": 21,
  "twenty-second": 22,
};

function toParagraphs(raw) {
  const blocks = raw.replace(/\r/g, "").split(/\n\s*\n/);
  const out = [];
  for (const b of blocks) {
    const lines = b.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;
    if (/^\[\d+\]/.test(lines[0])) continue; // footnote definition block
    if (/^_{3,}$/.test(lines[0]) || /^-{3,}$/.test(lines[0])) continue;
    // The Wallis edition closes each quoted lemma with `"]`; the bracket is
    // typographic apparatus, not text, so render it as a plain close-quote.
    const p = cleanInline(lines.join(" ")).replace(/"\]/g, '"');
    if (p.length > 1) out.push(p);
  }
  return out;
}

async function main() {
  const text = await getText("anf07.txt", SRC_URL);

  // App chapter lengths for clamping.
  const verseCounts = {};
  for (const f of await fs.readdir(BIBLE_DIR)) {
    const m = f.match(/^(\d+)\.json$/);
    if (!m) continue;
    const j = JSON.parse(await fs.readFile(path.join(BIBLE_DIR, f), "utf8"));
    verseCounts[Number(m[1])] = j.verses.length;
  }

  const start = text.indexOf("COMMENTARY ON THE APOCALYPSE OF THE BLESSED JOHN");
  const end = text.indexOf("GENERAL NOTES BY THE AMERICAN EDITOR", start);
  if (start < 0 || end < 0) throw new Error("Could not locate the commentary region.");
  const region = text.slice(start, end);

  const headRe = /^ {3,5}from the ([a-z-]+)(?: and [a-z-]+)? chapters?\.(?:\s*\[\d+\])?\s*$/gim;
  const heads = [];
  let m;
  while ((m = headRe.exec(region)) !== null) {
    const chapter = ORDINALS[m[1].toLowerCase()];
    if (!chapter) throw new Error(`Unknown ordinal "${m[1]}". Aborting.`);
    heads.push({ chapter, idx: m.index, len: m[0].length });
  }
  if (heads.length !== 19) {
    throw new Error(`Expected 19 chapter sections, found ${heads.length}. Aborting.`);
  }

  const byChapter = new Map(); // chapter -> Map(verse -> [paragraphs])
  let sections = 0;

  for (let i = 0; i < heads.length; i++) {
    const h = heads[i];
    const stop = i + 1 < heads.length ? heads[i + 1].idx : region.length;
    const paragraphs = toParagraphs(region.slice(h.idx + h.len, stop));
    const max = verseCounts[h.chapter] ?? 999;

    let verse = 1;
    for (const p of paragraphs) {
      const vm = p.match(/^(\d+)\.\s*"/);
      if (vm) verse = Math.min(parseInt(vm[1], 10), max);
      if (!byChapter.has(h.chapter)) byChapter.set(h.chapter, new Map());
      const chMap = byChapter.get(h.chapter);
      if (!chMap.has(verse)) chMap.set(verse, []);
      chMap.get(verse).push(p);
      sections++;
    }
  }

  await fs.mkdir(OUT_DIR, { recursive: true });
  let chaptersWritten = 0;
  let notes = 0;
  for (const [chapter, verseMap] of [...byChapter.entries()].sort((a, b) => a[0] - b[0])) {
    const file = path.join(OUT_DIR, `${chapter}.json`);
    let existing = {};
    try {
      existing = JSON.parse(await fs.readFile(file, "utf8"));
    } catch {
      /* none yet */
    }
    const merged = {};
    for (const [v, arr] of Object.entries(existing)) {
      const kept = arr.filter(
        (nt) => !(nt.author === AUTHOR && nt.citation === CITATION),
      );
      if (kept.length) merged[v] = kept;
    }
    for (const [verse, paras] of [...verseMap.entries()].sort((a, b) => a[0] - b[0])) {
      const key = String(verse);
      if (!merged[key]) merged[key] = [];
      merged[key].push({
        author: AUTHOR,
        work: WORK,
        citation: CITATION,
        text: paras.join("\n\n"),
      });
      notes++;
    }
    const sorted = {};
    for (const k of Object.keys(merged).sort((a, b) => Number(a) - Number(b))) {
      sorted[k] = merged[k];
    }
    await fs.writeFile(file, JSON.stringify(sorted, null, 2) + "\n", "utf8");
    chaptersWritten++;
  }

  process.stdout.write(
    `Victorinus on the Apocalypse: ${sections} paragraphs -> ${notes} verse-notes across ${chaptersWritten} chapters (${[...byChapter.keys()].sort((a, b) => a - b).join(", ")})\n`,
  );
}

await main();
