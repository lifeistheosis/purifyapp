// Ingest St Augustine's Confessions, all thirteen books, from Project
// Gutenberg (E. B. Pusey's translation, public domain, ebook #3296) and write
// the Purify work-file at data/saints/augustine-of-hippo/confessions.json.
//
// Usage: node scripts/ingest-confessions.mjs <path to pg3296.txt>
//
// The ebook is read from a copy downloaded beforehand into a folder of its
// own (https://www.gutenberg.org/cache/epub/3296/pg3296.txt; 632,170 bytes,
// the release of September 15, 2026, read 2026-10-18). This script only reads
// it, as text: nothing in it is run.
//
// What it does, and what it leaves alone:
// - Gutenberg's header and licence (to "*** START OF THE PROJECT GUTENBERG
//   EBOOK") and footer (from "*** END OF") are cut away, and the title page
//   before Book I.
// - Each book is the text between its "BOOK N" line and the next. Pusey's
//   paragraphs are kept as the ebook has them, word for word, with only
//   their line breaks joined. The closing "GRATIAS TIBI DOMINE" after Book
//   XIII is the edition's colophon, not Augustine's text, and is left out.
// - Pusey's paragraphs follow the Latin text's sections (book, chapter and
//   section, as at The Latin Library), one to one save where he sets a
//   quotation apart (Virgil and Terence in Book I, Virgil in Book VIII, St
//   Ambrose's hymn in Book IX) or carries a section on into the next
//   paragraph (the end of Book VI). In three places one paragraph of his
//   holds two sections; it is split where the second begins (SPLITS), so
//   that every section opens a paragraph and can be cited and opened
//   (Confessions VIII.5.12, XII.15.19, XIII.18.23). Nothing else moves.
// - Book I is section 1, as it has been since 1.8. Books II to XIII are
//   sections 102 to 113: numbers past the 2 to 10 under which Book I was
//   once grouped, so the moves of lib/saints/layoutMoves.ts never touch them.
// - Where each section begins is in lib/saints/divisions.ts (CONFESSIONS),
//   by the opening words of its paragraph.

import fs from "node:fs";
import path from "node:path";

const URL = "https://www.gutenberg.org/cache/epub/3296/pg3296.txt";
const OUT = "data/saints/augustine-of-hippo/confessions.json";
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII"];

// [book, the section it opens, its first words in Pusey]: a paragraph of his
// that holds two sections is split before these words.
const SPLITS = [
  [8, "8.5.12", "Thus with the baggage of this present world was I held down pleasantly"],
  [12, "12.15.19", "\"What will ye say then, O ye gainsayers?"],
  [13, "13.18.23", "For to one is given by the Spirit the word of wisdom"],
];

// Pusey's paragraphs per book once split: read against the download.
const PARAGRAPHS = [38, 18, 21, 31, 25, 27, 27, 32, 38, 70, 41, 43, 53];

const file = process.argv[2];
if (!file) throw new Error(`Give the path to the downloaded ${URL}`);
const raw = fs.readFileSync(file, "utf8");

const START = "*** START OF THE PROJECT GUTENBERG EBOOK THE CONFESSIONS OF ST. AUGUSTINE ***";
const END = "*** END OF THE PROJECT GUTENBERG EBOOK THE CONFESSIONS OF ST. AUGUSTINE ***";
const a = raw.indexOf(START);
const b = raw.indexOf(END);
if (a < 0 || b < 0 || b < a) throw new Error("Not Gutenberg #3296: its start and end markers are not there.");
if (!/Translator: E\. B\. Pusey/.test(raw.slice(0, a))) throw new Error("Not Pusey's translation.");
const lines = raw.slice(a + START.length, b).split(/\r?\n/);

const heads = [];
lines.forEach((l, i) => {
  const m = /^BOOK ([IVX]+)$/.exec(l.trim());
  if (m) heads.push({ roman: m[1], i });
});
if (heads.map((h) => h.roman).join(" ") !== ROMAN.join(" ")) throw new Error(`Books not as expected: ${heads.map((h) => h.roman).join(" ")}`);

const sections = heads.map((h, k) => {
  const book = k + 1;
  const text = lines.slice(h.i + 1, k + 1 < heads.length ? heads[k + 1].i : lines.length).join("\n");
  let paras = text
    .trim()
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 0 && p !== "GRATIAS TIBI DOMINE");
  for (const [at, , words] of SPLITS) {
    if (at !== book) continue;
    const hits = paras.map((p, j) => [p.indexOf(` ${words}`), j]).filter(([x]) => x > 0);
    if (hits.length !== 1) throw new Error(`Book ${ROMAN[k]}: "${words}" is not in one paragraph`);
    const [cut, j] = hits[0];
    paras = [...paras.slice(0, j), paras[j].slice(0, cut), paras[j].slice(cut + 1), ...paras.slice(j + 1)];
  }
  if (paras.length !== PARAGRAPHS[k]) throw new Error(`Book ${ROMAN[k]}: ${paras.length} paragraphs, expected ${PARAGRAPHS[k]}`);
  return { n: book === 1 ? 1 : 100 + book, title: `Book ${ROMAN[k]}`, paragraphs: paras };
});

const payload = {
  saint: "augustine-of-hippo",
  slug: "confessions",
  title: "Confessions",
  subtitle: "Confessiones, complete in thirteen books",
  source:
    "Translation: E. B. Pusey, 1838 (public domain). Sourced from Project Gutenberg ebook #3296 (the release of September 15, 2026). Latin text c. 397-400. Book, chapter and section are numbered as in the Latin text (The Latin Library).",
  sections,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(payload, null, 2), "utf8");
console.log(`Wrote ${OUT}: ${sections.length} books, ${sections.reduce((n, s) => n + s.paragraphs.length, 0)} paragraphs.`);
