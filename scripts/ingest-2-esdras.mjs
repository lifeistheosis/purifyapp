// 2 Esdras, verbatim from the King James Version of 1769 with the Apocrypha.
//
//   node scripts/ingest-2-esdras.mjs <path to 58-2ESeng-kjv.usfm>
//
// Source: eBible.org, "King James Version + Apocrypha" (ENGKJA, eng-kjv),
// the standardized text of 1769, public domain. Download:
// https://ebible.org/Scriptures/eng-kjv_usfm.zip, file 58-2ESeng-kjv.usfm.
//
// Why this book comes from the KJV when the rest of the Old Testament is
// Brenton's Septuagint: 2 Esdras is not in the Greek Old Testament at all,
// so Brenton has no text of it. It survives in Latin and stands in the
// Slavonic Bible (as 3 Esdras) and the KJV Apocrypha, and the KJV is the
// public-domain English of it. Added 2026-09-26 at the owner's direction,
// after a reader asked for "Esdras 2" on Discord on 23 September.
//
// Output: data/bible/2-esdras/{chapter}.json in the same shape as every other
// book, source "kjv-pd". The text is copied, never edited: the one change is
// whitespace (USFM line padding trimmed, runs of spaces collapsed).

import fs from "node:fs";
import path from "node:path";

const input = process.argv[2];
if (!input) {
  console.error("usage: node scripts/ingest-2-esdras.mjs <58-2ESeng-kjv.usfm>");
  process.exit(1);
}

const SLUG = "2-esdras";
const NAME = "2 Esdras";
const SOURCE = "kjv-pd";
const EXPECTED_CHAPTERS = 16;

const usfm = fs.readFileSync(input, "utf8").replace(/^﻿/, "");

/** @type {Map<number, {n: number, text: string}[]>} */
const chapters = new Map();
let chapter = 0;
let verse = null;

for (const raw of usfm.split(/\r?\n/)) {
  const line = raw.trim();
  if (!line) continue;
  const c = /^\\c\s+(\d+)/.exec(line);
  if (c) {
    chapter = Number(c[1]);
    chapters.set(chapter, []);
    verse = null;
    continue;
  }
  const v = /^\\v\s+(\d+)\s*(.*)$/.exec(line);
  if (v) {
    if (!chapter) throw new Error(`verse before any chapter: ${line}`);
    verse = { n: Number(v[1]), text: v[2] };
    chapters.get(chapter).push(verse);
    continue;
  }
  // Paragraph and heading markers carry no verse text in this file.
  if (/^\\(p|q\d?|m|nb|b|id|ide|h|toc\d|mt\d?|s\d?|r)\b/.test(line)) continue;
  // Anything else is a continuation of the verse before it.
  if (verse && !line.startsWith("\\")) {
    verse.text += ` ${line}`;
    continue;
  }
  throw new Error(`unhandled USFM line in chapter ${chapter}: ${line}`);
}

if (chapters.size !== EXPECTED_CHAPTERS) {
  throw new Error(`expected ${EXPECTED_CHAPTERS} chapters, found ${chapters.size}`);
}

const outDir = path.join(process.cwd(), "data", "bible", SLUG);
fs.mkdirSync(outDir, { recursive: true });
let verseCount = 0;
for (const [n, verses] of chapters) {
  verses.forEach((vv, i) => {
    vv.text = vv.text.replace(/\s+/g, " ").trim();
    if (!vv.text) throw new Error(`empty verse ${n}:${vv.n}`);
    if (/[\\|]/.test(vv.text)) throw new Error(`markup left in ${n}:${vv.n}: ${vv.text}`);
    if (vv.n !== i + 1) throw new Error(`verse numbering breaks at ${n}:${vv.n}`);
  });
  verseCount += verses.length;
  const file = path.join(outDir, `${n}.json`);
  // Compact and without a trailing newline, like every other chapter file.
  fs.writeFileSync(file, JSON.stringify({ book: SLUG, name: NAME, chapter: n, verses, source: SOURCE }));
}
console.log(`${NAME}: ${chapters.size} chapters, ${verseCount} verses -> ${path.relative(process.cwd(), outDir)}`);
