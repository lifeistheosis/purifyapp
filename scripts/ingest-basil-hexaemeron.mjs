// Ingest St. Basil the Great's Nine Homilies of the Hexaemeron (NPNF2-08,
// Schaff & Wace, public domain) into per-verse commentary at
// data/bible/commentary/genesis/1.json.
//
//   Source: https://www.ccel.org/ccel/schaff/npnf208/cache/npnf208.txt
//   Run from the project root: node scripts/ingest-basil-hexaemeron.mjs
//
// The Hexaemeron preaches through the six days of creation, homily by homily,
// not verse by verse, so each homily is attached whole to the verse whose
// command it opens with (the pattern the Augustine 1 John ingest set). The
// anchors are the homilies' own opening lemmas, hand-verified against the
// app's Brenton text, which Basil's LXX matches word for word ("In the
// beginning God made the heaven and the earth"). Homilies VIII and IX both
// open from Genesis 1:24 and stack there as two entries.
//
// Existing short curated Basil digests at 1:1 and 1:2 are superseded by the
// full homilies; every other Father's entry is kept untouched.

import fs from "node:fs/promises";
import path from "node:path";

import { getText, cleanInline } from "./lib/npnf-homilies.mjs";

const ROOT = process.cwd();
const SRC_URL = "https://www.ccel.org/ccel/schaff/npnf208/cache/npnf208.txt";
const OUT_FILE = path.join(ROOT, "data", "bible", "commentary", "genesis", "1.json");

const AUTHOR = "St. Basil the Great";
const CITATION = "NPNF2-08";

// Homily number -> Genesis 1 anchor verse (each homily's opening lemma).
const ANCHORS = { 1: 1, 2: 2, 3: 6, 4: 9, 5: 11, 6: 14, 7: 20, 8: 24, 9: 24 };
const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9 };

function toParagraphs(raw) {
  const blocks = raw.replace(/\r/g, "").split(/\n\s*\n/);
  const out = [];
  for (const b of blocks) {
    const lines = b.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;
    if (/^\[\d+\]/.test(lines[0])) continue; // footnote definition block
    if (/^_{3,}$/.test(lines[0]) || /^-{3,}$/.test(lines[0])) continue;
    const p = cleanInline(lines.join(" "));
    if (p.length > 1) out.push(p);
  }
  return out;
}

async function main() {
  const text = await getText("npnf208.txt", SRC_URL);

  // The Hexaemeron's homilies are the "    Homily N." headers in the back
  // half of the volume (the prolegomena's homily summaries are prose lines,
  // not standalone headers). The series ends at the Letters' Prolegomena.
  const headRe = /^ {3,4}Homily ([IVX]+)\.\s*$/gm;
  const heads = [];
  let m;
  while ((m = headRe.exec(text)) !== null) {
    const n = ROMAN[m[1]];
    if (!n) continue;
    heads.push({ n, idx: m.index, len: m[0].length });
  }
  // Keep the strictly increasing run I..IX (the Hexaemeron); the volume has
  // no other standalone "Homily N." headers, but gate on the shape anyway.
  const series = heads.filter((h, i) => h.n === i + 1);
  if (series.length !== 9) {
    throw new Error(`Expected the 9 Hexaemeron homilies, found ${series.length}. Aborting.`);
  }

  const end = text.indexOf("Prolegomena.", series[8].idx);
  if (end < 0) throw new Error("Could not find the end of Homily IX.");

  const entries = new Map(); // verse -> [entry]
  for (let i = 0; i < series.length; i++) {
    const h = series[i];
    const stop = i + 1 < series.length ? series[i + 1].idx : end;
    const block = text.slice(h.idx + h.len, stop);
    const paragraphs = toParagraphs(block);
    if (paragraphs.length < 5) {
      throw new Error(`Homily ${h.n} parsed only ${paragraphs.length} paragraphs. Aborting.`);
    }
    const verse = ANCHORS[h.n];
    if (!entries.has(verse)) entries.set(verse, []);
    entries.get(verse).push({
      author: AUTHOR,
      work: `Hexaemeron, Homily ${h.n}`,
      citation: CITATION,
      text: paragraphs.join("\n\n"),
    });
  }

  // Merge: keep every other Father; replace prior Basil Hexaemeron notes
  // (the short curated digests) with the full homilies.
  let existing = {};
  try {
    existing = JSON.parse(await fs.readFile(OUT_FILE, "utf8"));
  } catch {
    /* none yet */
  }
  const merged = {};
  for (const [v, arr] of Object.entries(existing)) {
    const kept = arr.filter(
      (nt) => !(nt.author === AUTHOR && nt.citation === CITATION && /^Hexaemeron/.test(nt.work)),
    );
    if (kept.length) merged[v] = kept;
  }
  let notes = 0;
  for (const [verse, arr] of [...entries.entries()].sort((a, b) => a[0] - b[0])) {
    const key = String(verse);
    if (!merged[key]) merged[key] = [];
    merged[key].push(...arr);
    notes += arr.length;
  }
  const sorted = {};
  for (const k of Object.keys(merged).sort((a, b) => Number(a) - Number(b))) {
    sorted[k] = merged[k];
  }
  await fs.mkdir(path.dirname(OUT_FILE), { recursive: true });
  await fs.writeFile(OUT_FILE, JSON.stringify(sorted, null, 2) + "\n", "utf8");

  process.stdout.write(
    `Hexaemeron: 9 homilies -> ${notes} entries on Genesis 1 (verses ${[...entries.keys()].sort((a, b) => a - b).join(", ")})\n`,
  );
}

await main();
