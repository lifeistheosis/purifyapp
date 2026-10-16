// Paragraph breaks for the reader's paragraph view (1.7), taken from the
// Church's own divisions of the text: every place an appointed reading
// starts, and the verse after one ends, in the readings the calendar holds
// (data/calendar). An Orthodox Gospel or Apostol book is divided the same
// way, into the passages read at the services (zachala). Joined to them, the
// paragraphs the printed texts themselves carry (data/bible/print-paragraphs.json,
// from scripts/import-print-paragraphs.mjs: the KJV's ¶ marks and Brenton's
// paragraphs).
//
//   node scripts/build-paragraphs.mjs
// writes data/bible/paragraphs.json: { "<book>": { "<chapter>": [verse, ...] } },
// the verses that begin a new paragraph (verse 1 is implied). Rerun when the
// reading tables change; lib/bible/__tests__/paragraphs.test.ts holds the
// file to the tables.
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const books = new Map(read("data/bible/books.json").map((b) => [b.slug, b]));

/** Every { book, chapter, from, to } anywhere in a JSON tree. */
function refsIn(node, out = []) {
  if (Array.isArray(node)) node.forEach((n) => refsIn(n, out));
  else if (node && typeof node === "object") {
    if (typeof node.book === "string" && Number.isInteger(node.chapter) && Number.isInteger(node.from)) out.push(node);
    Object.values(node).forEach((n) => refsIn(n, out));
  }
  return out;
}

const refs = [
  ...refsIn(read("data/calendar/daily-readings.json")),
  ...refsIn(read("data/calendar/movable-readings.json")),
  ...refsIn(read("data/calendar/official-readings.json")),
];

/** Verses in a chapter of the app's own text. */
const versesIn = new Map();
function verseCount(book, chapter) {
  const key = `${book}/${chapter}`;
  if (!versesIn.has(key)) {
    const file = path.join(ROOT, "data/bible", book, `${chapter}.json`);
    versesIn.set(key, fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")).verses.length : 0);
  }
  return versesIn.get(key);
}

const breaks = {};
const add = (book, chapter, verse) => {
  if (verse <= 1 || verse > verseCount(book, chapter)) return;
  ((breaks[book] ??= {})[chapter] ??= new Set()).add(verse);
};
let used = 0;
for (const r of refs) {
  if (!books.has(r.book) || !verseCount(r.book, r.chapter)) continue;
  used += 1;
  add(r.book, r.chapter, r.from);
  // A reading that ends inside its chapter ends a paragraph there too.
  if (Number.isInteger(r.to) && r.to >= r.from) add(r.book, r.chapter, r.to + 1);
}

// The printed texts' own paragraphs.
const PRINT = path.join(ROOT, "data/bible/print-paragraphs.json");
let printed = 0;
if (fs.existsSync(PRINT)) {
  for (const [book, byChapter] of Object.entries(read("data/bible/print-paragraphs.json"))) {
    for (const [ch, starts] of Object.entries(byChapter)) {
      for (const v of starts) {
        add(book, Number(ch), v);
        printed += 1;
      }
    }
  }
}

const out = {};
for (const book of Object.keys(breaks).sort()) {
  out[book] = {};
  for (const ch of Object.keys(breaks[book]).sort((a, b) => a - b)) out[book][ch] = [...breaks[book][ch]].sort((a, b) => a - b);
}
fs.writeFileSync(path.join(ROOT, "data/bible/paragraphs.json"), JSON.stringify(out) + "\n");
const chapters = Object.values(out).reduce((n, b) => n + Object.keys(b).length, 0);
console.log(`${refs.length} references (${used} on our text) and ${printed} printed marks: ${chapters} chapters with paragraph breaks in ${Object.keys(out).length} books`);
