// St. Cyril of Alexandria, Commentary on the Gospel of John, in the Library of
// the Fathers translation (Oxford, 1874 and 1885). Volume 1 by P. E. Pusey,
// volume 2 by Thomas Randell. Public domain by publication date.
//
// WHY THIS WORK. John carried 840 notes to Matthew's 4,848, and most of what it
// had were Catena fragments or short extracts. This is the great Greek
// commentary on the Fourth Gospel, twelve books of it, by the Father the Church
// calls the Seal of the Fathers, and it is the same author this library already
// carries on Luke.
//
// HOW A LEMMA IS FOUND. The transcription sets every scriptural quotation in
// italics, and Cyril opens each stretch of comment by quoting the verse he is
// about to expound. So the lemma is marked in the source, and `findVerse` says
// which verse of John it is.
//
// Only Book 1 carries a table of chapters that could have been used instead;
// Books 5 and 9 have no chapter divisions at all in this transcription, so a
// contents-driven parse reached 25 lemmas out of the whole commentary. Reading
// the italics works the same way in all twelve books.
//
// Cyril quotes Isaiah and Paul in italics just as readily, and those resolve to
// nothing in John and are refused. That refusal is the filter: it is why a
// quotation of Deuteronomy in Book 3 does not become a note on the Fourth
// Gospel.
//
// THE CITATION IS TAKEN FROM THE PAGE. The two volumes are separate Library of
// the Fathers numbers, 43 and 48, and each page states its own translator. Pusey
// means volume 43, Randell means volume 48. Reading it off the page is why this
// does not have to guess, which is what commentaryLicensing.test.ts exists to
// prevent.
//
// Run from the project root:
//   node scripts/ingest-cyril-john.mjs
//   node scripts/ingest-cyril-john.mjs --explain

import fs from "node:fs";
import path from "node:path";

import { createAlignmentReport, createLemmaVerifier } from "./lib/lemma-verify.mjs";
import { splitLongNote, writeWork } from "./lib/ccel-work.mjs";

const ROOT = process.cwd();
const CACHE = path.join(ROOT, "scripts", ".cache");
const BASE = "https://www.tertullian.org/fathers";

const AUTHOR = "St. Cyril of Alexandria";
const SOURCE =
  "St. Cyril of Alexandria, Commentary on the Gospel according to S. John. Library of the Fathers of the Holy Catholic Church, volumes 43 and 48. Oxford, 1874 and 1885. Volume 1 translated by P. E. Pusey, volume 2 by Thomas Randell. Public domain.";

const JOHN_CHAPTERS = Array.from({ length: 21 }, (_, i) => i + 1);

const args = process.argv.slice(2);

// ---- Fetch ------------------------------------------------------------------

async function bookPage(n) {
  const slug = `cyril_on_john_${String(n).padStart(2, "0")}_book${n}`;
  const file = path.join(CACHE, `${slug}.htm`);
  if (fs.existsSync(file)) return fs.readFileSync(file, "utf8");
  const url = `${BASE}/${slug}.htm`;
  const res = await fetch(url);
  if (!res.ok) {
    console.log(`  Book ${n}: ${url} -> ${res.status}, skipped.`);
    return null;
  }
  const text = await res.text();
  fs.mkdirSync(CACHE, { recursive: true });
  fs.writeFileSync(file, text, "utf8");
  return text;
}

// Sentinels that survive tag stripping, so the italics can still be located in
// the plain text afterwards.
const OPEN = "";
const CLOSE = "";

function toText(html, { keepItalics = false } = {}) {
  let s = html
    .replace(/<a[^>]*href="#\d+"[^>]*>[\s\S]*?<\/a>/gi, "") // footnote refs
    .replace(/<sup>[\s\S]*?<\/sup>/gi, "")
    .replace(/<head[\s\S]*?<\/head>/i, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "");
  if (keepItalics) {
    s = s.replace(/<i>/gi, OPEN).replace(/<\/i>/gi, CLOSE);
  }
  s = s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h\d|li|tr|blockquote)>/gi, "\n\n")
    .replace(/<[^>]+>/g, "");
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#\d+;/g, "")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\|\s*\d+/g, " ") // the transcription's page markers
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ---- Parse ------------------------------------------------------------------

const VERIFIER = createLemmaVerifier("john");
const REPORT = createAlignmentReport({
  label: "Cyril of Alexandria on John: lemma alignment",
  command: "node scripts/ingest-cyril-john.mjs",
  source: SOURCE,
});

const commentary = new Map(); // chapter -> verse -> notes[]
const sections = [];
let booksRead = 0;
let anchored = 0;
let italics = 0;
// Minimum characters of exposition between two accepted anchors.
const MIN_GAP = 1200;
// Where the commentary has reached, so a short lemma can be read in context.
let cursor = 1;

for (let n = 1; n <= 12; n++) {
  const html = await bookPage(n);
  if (!html) continue;
  booksRead++;

  // The volume, and therefore the Library of the Fathers number, is whichever
  // translator this page credits.
  const citation = /Randell/i.test(html.slice(0, 4000)) ? "LFC 48" : "LFC 43";

  // Drop the book's own table of chapters. Its entries quote the lemma in
  // italics too, so left in place the first anchor lands inside the contents and
  // the note opens with a list of chapter headings rather than with Cyril.
  let source = html;
  const tocLinks = [...html.matchAll(/<a[^>]*href="#C\d+"[^>]*>[\s\S]*?<\/a>/gi)];
  if (tocLinks.length) {
    const last = tocLinks[tocLinks.length - 1];
    source = html.slice(last.index + last[0].length);
  }

  const body = toText(source, { keepItalics: true });

  // Every italic span. This transcription italicises Scripture, so these are the
  // quotations, whichever book they come from.
  const spanRe = new RegExp(OPEN + "([^" + CLOSE + "]{12,400})" + CLOSE, "g");
  const spans = [...body.matchAll(spanRe)];
  italics += spans.length;

  const anchors = [];
  for (const s of spans) {
    const lemma = s[1].replace(/\s+/g, " ").trim();
    const window = [cursor, cursor + 1, cursor + 2].filter((c) => c >= 1 && c <= 21);
    let found = VERIFIER.findVerse(lemma, window);
    if (!found.ok) found = VERIFIER.findVerse(lemma, JOHN_CHAPTERS);
    if (!found.ok) continue; // another book of Scripture, or too short to place

    // Cyril often quotes the same verse several times while arguing it. Require
    // real exposition since the last anchor so a passage does not shatter into
    // fragments too small to read.
    const previous = anchors[anchors.length - 1];
    if (previous && s.index - previous.at < MIN_GAP) continue;

    anchors.push({ at: s.index, chapter: found.chapter, verse: found.verse, lemma });
    cursor = found.chapter;
    REPORT.pass();
    anchored++;
  }

  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i];
    const until = i + 1 < anchors.length ? anchors[i + 1].at : body.length;
    const paragraphs = body
      .slice(a.at, until)
      .split(/\n\n+/)
      .map((p) => p.replace(new RegExp(`${OPEN}|${CLOSE}`, "g"), "").replace(/\s+/g, " ").trim())
      .filter((p) => p.length > 40);
    const text = paragraphs.join("\n\n");
    if (text.length < 400) continue;

    sections.push({
      n: sections.length + 1,
      title: `Book ${n}, on John ${a.chapter}:${a.verse}`,
      paragraphs,
    });

    if (!commentary.has(a.chapter)) commentary.set(a.chapter, new Map());
    const ch = commentary.get(a.chapter);
    if (!ch.has(a.verse)) ch.set(a.verse, []);
    for (const part of splitLongNote(text)) {
      ch.get(a.verse).push({
        author: AUTHOR,
        work: `Commentary on John, Book ${n}`,
        citation,
        text: part,
      });
    }
  }
}

// ---- Prove it ---------------------------------------------------------------

console.log(
  `Cyril on John: ${booksRead} of 12 books read, ${italics} italic quotations seen, ` +
    `${anchored} of them placed as verses of John.`,
);
REPORT.print({ explain: args.includes("--explain") });
const REVIEW = REPORT.writeReview("cyril-of-alexandria-commentary-on-john");

if (booksRead < 12) throw new Error(`only ${booksRead} of 12 books fetched. See ${REVIEW}.`);
if (REPORT.belowFloor()) {
  throw new Error(
    `only ${(REPORT.rate() * 100).toFixed(1)}% of printed lemmas resolve to a verse of John. See ${REVIEW}.`,
  );
}
// Twelve books walking the whole Gospel should reach most of its chapters.
if (commentary.size < 15) {
  throw new Error(`reached only ${commentary.size} chapters of John, which cannot be right. See ${REVIEW}.`);
}

// ---- Write ------------------------------------------------------------------

writeWork({
  saintSlug: "cyril-of-alexandria",
  workSlug: "commentary-on-john",
  title: "Commentary on the Gospel of John",
  subtitle: "The twelve books, in the Library of the Fathers translation",
  source: SOURCE,
  sections,
});

const dir = path.join(ROOT, "data", "bible", "commentary", "john");
fs.mkdirSync(dir, { recursive: true });
let written = 0;
let kept = 0;
for (const [chapter, verses] of [...commentary.entries()].sort((a, b) => a[0] - b[0])) {
  const file = path.join(dir, `${chapter}.json`);
  const existing = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
  const merged = {};
  for (const [v, notes] of Object.entries(existing)) {
    const others = notes.filter((x) => !(x.author === AUTHOR && /Commentary on John/.test(x.work)));
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
  `  ${written} notes across ${commentary.size} chapters of John. Other sources preserved: ${kept}.`,
);
console.log(`  review: ${REVIEW}`);
console.log(SOURCE);
