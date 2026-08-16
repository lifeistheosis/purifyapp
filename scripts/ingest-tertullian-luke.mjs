// Tertullian, Against Marcion, Book IV, from ANF03 (public domain).
//
// WHY THIS WORK. Luke carried 207 notes and two voices against John's 1,835 and
// Matthew's 4,848. There is very little else to give it: the Catena Aurea on
// Luke exists only as an archive.org scan whose marginal glosses are interleaved
// mid-sentence by the OCR, and Ambrose's Exposition of Luke was first put into
// English in 1998 and is in copyright. Book IV is the earliest surviving Latin
// walk through Luke and it is in a series already whitelisted.
//
// WHAT THIS TEXT IS, AND WHY THAT MATTERS EDITORIALLY. It is polemic, not
// exposition. Marcion had cut Luke down to suit his own theology, and Tertullian
// goes through the mutilated Gospel proving the Creator to be the Father of
// Christ. He is also a writer the Church does not number among the saints: he
// ended his life a Montanist, and the notes here name him plainly as Tertullian
// rather than dressing him as a Father. That is the same treatment Origen and
// Victorinus already receive in this corpus, and it is queued for editorial
// review in docs/editorial-standards.md rather than assumed to be settled.
//
// HOW A LEMMA IS FOUND. Tertullian quotes Luke inside double quotes, and quotes
// Isaiah, Paul and Marcion's own Antitheses the same way. So the quotation is
// the only evidence, `findVerse` says which verse of Luke it is if it is one,
// and everything else resolves to nothing in Luke and is dropped. He proceeds
// through the Gospel in order, so the search looks first at where the argument
// has reached before falling back to the whole book.
//
// Run from the project root:
//   node scripts/ingest-tertullian-luke.mjs
//   node scripts/ingest-tertullian-luke.mjs --explain

import fs from "node:fs";
import path from "node:path";

import { createAlignmentReport, createLemmaVerifier } from "./lib/lemma-verify.mjs";
import { getText, romanToInt, toParagraphs } from "./lib/npnf-homilies.mjs";
import { sliceRegion, splitLongNote } from "./lib/ccel-work.mjs";

const ROOT = process.cwd();
const SRC_URL = "https://www.ccel.org/ccel/schaff/anf03/cache/anf03.txt";

const AUTHOR = "Tertullian";
const CITATION = "ANF03";
const SOURCE =
  "Tertullian, Against Marcion, Book IV. From the Ante-Nicene Fathers, Vol. 3 (ed. Roberts and Donaldson), translated by Dr. Holmes. Public domain.";

const LUKE_CHAPTERS = Array.from({ length: 24 }, (_, i) => i + 1);

const args = process.argv.slice(2);
const text = await getText("anf03.txt", SRC_URL);

// ---- Region -----------------------------------------------------------------
// Book IV opens with a footnote marker on its heading and runs to Book V, which
// turns from the Gospel to Paul's epistles.

const region = sliceRegion(
  text,
  /^[ \t]*Book IV\.[ \t]*(?:\[\d+\])?[ \t]*$/m,
  /^[ \t]*Book V\.[ \t]*(?:\[\d+\])?[ \t]*$/m,
  { label: "Against Marcion IV" },
);

// ---- Parse ------------------------------------------------------------------

const VERIFIER = createLemmaVerifier("luke");
const REPORT = createAlignmentReport({
  label: "Tertullian, Against Marcion IV: lemma alignment",
  command: "node scripts/ingest-tertullian-luke.mjs",
  source: SOURCE,
});

// The dash is not always flush against the footnote marker: this volume prints
// both "Chapter VII.--Marcion Rejected" and "Chapter I. [459] --The Hatred".
const CHAP_RE = /^[ \t]*Chapter ([IVXLCDM]+)\.(?:\s*\[\d+\])?\s*--([^\n]*)$/gm;
const chapters = [...region.matchAll(CHAP_RE)].map((m) => ({
  at: m.index,
  end: m.index + m[0].length,
  n: romanToInt(m[1]),
  title: m[2].replace(/\s+/g, " ").trim(),
}));
// Book IV has forty-three chapters. A different count means the region slipped.
if (chapters.length !== 43) {
  throw new Error(`Parsed ${chapters.length} chapters; Book IV has exactly 43. The region is wrong.`);
}

const QUOTED = /"([^"]{25,400})"/g;
const commentary = new Map(); // chapter -> verse -> notes[]
const sections = [];
let anchored = 0;
let cursor = 1;

for (let i = 0; i < chapters.length; i++) {
  const c = chapters[i];
  const stop = i + 1 < chapters.length ? chapters[i + 1].at : region.length;
  const paragraphs = toParagraphs(region.slice(c.end, stop));
  if (!paragraphs.length) continue;

  const prose = paragraphs.join("\n\n");
  sections.push({
    n: sections.length + 1,
    title: `Chapter ${c.n}${c.title ? `. ${c.title}` : ""}`,
    paragraphs,
  });

  // The first quotation in the chapter that really is a verse of Luke.
  let placed = null;
  QUOTED.lastIndex = 0;
  let q;
  while ((q = QUOTED.exec(prose)) !== null) {
    const window = [cursor, cursor + 1, cursor + 2].filter((n) => n >= 1 && n <= 24);
    let found = VERIFIER.findVerse(q[1], window);
    if (!found.ok) found = VERIFIER.findVerse(q[1], LUKE_CHAPTERS);
    if (found.ok) {
      placed = found;
      break;
    }
  }

  if (!placed) {
    REPORT.flag({
      where: `Chapter ${c.n}`,
      detail: "no quotation in this chapter resolved to a verse of Luke",
      homily: `Chapter ${c.n}`,
      quoted: c.title.slice(0, 90),
    });
    continue;
  }

  REPORT.pass();
  anchored++;
  cursor = placed.chapter;
  if (!commentary.has(placed.chapter)) commentary.set(placed.chapter, new Map());
  const ch = commentary.get(placed.chapter);
  if (!ch.has(placed.verse)) ch.set(placed.verse, []);
  for (const part of splitLongNote(prose)) {
    ch.get(placed.verse).push({
      author: AUTHOR,
      work: `Against Marcion, Book IV, Chapter ${c.n}`,
      citation: CITATION,
      text: part,
    });
  }
}

// ---- Prove it ---------------------------------------------------------------

console.log(`Tertullian on Luke: ${anchored} of ${chapters.length} chapters anchored.`);
REPORT.print({ explain: args.includes("--explain") });
const REVIEW = REPORT.writeReview("tertullian-against-marcion-iv");

// No percentage floor: with no verse markers there are no candidates being
// accepted or rejected, only chapters that quote Luke and chapters that argue
// without quoting it. The structural facts are the proof.
if (anchored < 25) {
  throw new Error(`only ${anchored} of 43 chapters anchored, too few to be working. See ${REVIEW}.`);
}
if (commentary.size < 8) {
  throw new Error(`anchored into only ${commentary.size} chapters of Luke; Book IV walks the whole Gospel. See ${REVIEW}.`);
}

// ---- Write ------------------------------------------------------------------

// DELIBERATELY NO READABLE WORK. data/saints/<slug>/ is the saints' library, and
// saints.integrity.test.ts requires a matching entry in lib/saints/saints.ts for
// every file there. Tertullian is not a saint, he ended a Montanist, and adding
// him to that registry to make a file legal would be the tidy fiction this
// repository keeps refusing. The commentary rail names its authors freely and
// already carries Origen, Josephus and The Gloss, so the notes go there and the
// work does not.
console.log(`  (${sections.length} chapters parsed; no saints entry written, Tertullian is not a saint)`);

const dir = path.join(ROOT, "data", "bible", "commentary", "luke");
fs.mkdirSync(dir, { recursive: true });
let written = 0;
let kept = 0;
for (const [chapter, verses] of [...commentary.entries()].sort((a, b) => a[0] - b[0])) {
  const file = path.join(dir, `${chapter}.json`);
  const existing = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
  const merged = {};
  for (const [v, notes] of Object.entries(existing)) {
    const others = notes.filter((n) => !(n.author === AUTHOR && /Against Marcion/.test(n.work)));
    kept += others.length;
    if (others.length) merged[v] = others;
  }
  for (const [verse, notes] of verses) {
    const key = String(verse);
    merged[key] = (merged[key] ?? []).concat(notes);
    written += notes.length;
  }
  const ordered = {};
  for (const k of Object.keys(merged).sort((a, b) => Number(a) - Number(b))) ordered[k] = merged[k];
  fs.writeFileSync(file, JSON.stringify(ordered, null, 2) + "\n", "utf8");
}

console.log(
  `  ${written} notes across ${commentary.size} chapters of Luke. Other sources preserved: ${kept}.`,
);
console.log(`  review: ${REVIEW}`);
console.log(SOURCE);
