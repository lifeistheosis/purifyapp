// St. Augustine, Our Lord's Sermon on the Mount, from NPNF1-06 (Schaff, public
// domain). Two books expounding Matthew 5 to 7.
//
// WHY THIS WORK. Matthew is the best-covered book in the library, but every one
// of its 4,740 notes is a Catena fragment: a sentence or two lifted from a
// Father by a 13th century compiler. This is the opposite kind of resource, one
// Father reading three chapters straight through at length. It is also the work
// that fixed the Beatitudes in Western reading, and it is the earliest sustained
// commentary on the Sermon that survives.
//
// HOW A LEMMA IS FOUND, WHEN THE SOURCE PRINTS NO MARKER. Augustine has no
// "Ver. N." and no numbered lemmas. He quotes Matthew inside quotation marks and
// then expounds it, and he quotes Paul, the Psalms and the prophets exactly the
// same way. So there is no marker to trust and no number to check.
//
// The quotation itself is therefore the only evidence, and `findVerse` is the
// verifier used in reverse: instead of asking "is this really verse N", it asks
// "which verse of Matthew 5 to 7 is this, if any". A quotation of Romans has no
// home in those three chapters and is refused, which is what keeps Augustine's
// constant cross-references out of the rail.
//
// One note per chapter, anchored at the first quotation in it that verifies.
// That is coarser than a per-verse split and it is deliberate: Augustine's
// chapters are continuous argument, and cutting them at every scriptural
// quotation would leave the reader holding fragments of a paragraph. The same
// choice is made, for the same reason, in scripts/ingest-chrysostom-matthew.mjs.
//
// Run from the project root:
//   node scripts/ingest-augustine-sermon-on-the-mount.mjs
//   node scripts/ingest-augustine-sermon-on-the-mount.mjs --explain

import fs from "node:fs";
import path from "node:path";

import { createAlignmentReport, createLemmaVerifier } from "./lib/lemma-verify.mjs";
import { getText, romanToInt, toParagraphs } from "./lib/npnf-homilies.mjs";
import { sliceRegion, splitLongNote, writeWork } from "./lib/ccel-work.mjs";

const ROOT = process.cwd();
const SRC_URL = "https://www.ccel.org/ccel/schaff/npnf106/cache/npnf106.txt";

const AUTHOR = "St. Augustine";
const CITATION = "NPNF1-06";
const SOURCE =
  "St. Augustine, Our Lord's Sermon on the Mount, according to Matthew. From the Nicene and Post-Nicene Fathers, Series 1, Vol. 6 (ed. Philip Schaff). Public domain.";

// The Sermon occupies Matthew 5 to 7 and nothing else. Bounding the search to
// those three chapters is what makes the anchoring trustworthy.
const CHAPTERS = [5, 6, 7];
const MATTHEW_VERSES = { 5: 48, 6: 34, 7: 29 };

const args = process.argv.slice(2);
const text = await getText("npnf106.txt", SRC_URL);

// ---- Region -----------------------------------------------------------------
// The volume prints the title several times (contents, half-title, running
// heads). The body is the occurrence followed by "Book I." and a Chapter I.

// The volume holds three works and this is the first. Its Book I is the one
// followed by the summary line naming the fifth chapter of Matthew; the Harmony
// further down opens with a bare "Book I." too.
//
// The end marker is the title page of the next work in the volume. CCEL sets
// those as an ALL-CAPS author line followed by a lowercase title, and the
// Sermon's own title page sits well before this region's start, so the first
// one after the start is the Harmony's.
//
// It used to end on the Harmony's opening summary line instead, which sits
// 26,544 characters further on, AFTER the Harmony's title page and the whole
// of its Introductory Essay. Those 26,544 characters had nowhere to go but the
// Sermon's last section, so Matthew 7:21 shipped 1,158 words of front matter
// for another book, in lowercase, under Augustine's name. Ending on the title
// page is also the more honest marker: a region should end where the next work
// begins, not somewhere inside it.
const region = sliceRegion(
  text,
  /^[ \t]*Book I\.[ \t]*\r?\n[\s\S]{0,300}?Explanation of the first part of the sermon/m,
  /^[ \t]*St\. AUGUSTIN:[ \t]*$/m,
  { label: "Sermon on the Mount" },
);

// ---- Parse ------------------------------------------------------------------

const VERIFIER = createLemmaVerifier("matthew");
const REPORT = createAlignmentReport({
  label: "Augustine, Our Lord's Sermon on the Mount: lemma alignment",
  command: "node scripts/ingest-augustine-sermon-on-the-mount.mjs",
  source: SOURCE,
});

const BOOK_RE = /^[ \t]*Book ([IVXLCDM]+)\.[ \t]*$/gm;
const CHAP_RE = /^[ \t]*Chapter ([IVXLCDM]+)\.[ \t]*(?:\[\d+\])?[ \t]*$/gm;

const books = [...region.matchAll(BOOK_RE)].map((m) => ({ at: m.index, n: romanToInt(m[1]) }));
const chapters = [...region.matchAll(CHAP_RE)].map((m) => ({
  at: m.index,
  end: m.index + m[0].length,
  n: romanToInt(m[1]),
}));
// Book I has 23 chapters and Book II has 25. Anything else means the region
// slipped, either short of the end of the work or past it into the Harmony.
if (chapters.length !== 48) {
  throw new Error(`Parsed ${chapters.length} chapters; the two books hold exactly 48. The region is wrong.`);
}

const bookAt = (offset) => {
  let cur = null;
  for (const b of books) {
    if (b.at <= offset) cur = b.n;
    else break;
  }
  return cur;
};

// Scripture as Augustine prints it: inside double quotes, long enough to be a
// quotation rather than a phrase in passing.
const QUOTED = /"([^"]{40,600})"/g;

const commentary = new Map(); // chapter -> verse -> notes[]
const sections = [];
let anchored = 0;

for (let i = 0; i < chapters.length; i++) {
  const c = chapters[i];
  const stop = i + 1 < chapters.length ? chapters[i + 1].at : region.length;
  const nextBook = books.find((b) => b.at > c.end && b.at < stop);
  const body = region.slice(c.end, nextBook ? nextBook.at : stop);

  const paragraphs = toParagraphs(body);
  if (!paragraphs.length) continue;

  const book = bookAt(c.at) ?? 1;
  sections.push({
    n: sections.length + 1,
    title: `Book ${book}, Chapter ${c.n}`,
    paragraphs,
  });

  // The first quotation in the chapter that is really a verse of Matthew 5 to 7.
  const prose = paragraphs.join("\n\n");
  let placed = null;
  QUOTED.lastIndex = 0;
  let q;
  while ((q = QUOTED.exec(prose)) !== null) {
    const found = VERIFIER.findVerse(q[1], CHAPTERS);
    if (found.ok) {
      placed = found;
      break;
    }
  }

  if (!placed) {
    // Not a failure of the matcher. Augustine spends whole chapters on Paul, on
    // the Psalms, or on an argument with no quotation in it at all, and such a
    // chapter has no business in the Matthew rail. It is recorded for a reader
    // of the review file and deliberately kept out of the verified rate, which
    // exists to catch a broken matcher rather than an unquoted chapter.
    REPORT.flag({
      where: `Book ${book}, Chapter ${c.n}`,
      detail: "no quotation resolved to Matthew 5 to 7",
      homily: `Book ${book}`,
      quoted: prose.slice(0, 90),
    });
    continue;
  }

  REPORT.pass();
  anchored++;
  if (!commentary.has(placed.chapter)) commentary.set(placed.chapter, new Map());
  const ch = commentary.get(placed.chapter);
  if (!ch.has(placed.verse)) ch.set(placed.verse, []);
  for (const part of splitLongNote(prose)) {
    ch.get(placed.verse).push({
      author: AUTHOR,
      work: `Our Lord's Sermon on the Mount, Book ${book}, Chapter ${c.n}`,
      citation: CITATION,
      text: part,
    });
  }
}

// ---- Prove it ---------------------------------------------------------------

REPORT.print({ explain: args.includes("--explain") });
const REVIEW = REPORT.writeReview("augustine-sermon-on-the-mount");

// A percentage floor is the wrong gate for a source that prints no markers.
// There are no candidates being accepted or rejected here, only chapters that
// quote the Sermon and chapters that do not, so the structural facts are what
// prove the matcher works: it should reach a large share of the chapters, and it
// should land in all three chapters of the Sermon rather than piling everything
// into one. A matcher that had broken would fail both.
if (anchored < 40) {
  throw new Error(`only ${anchored} chapters anchored, which is too few to be working. See ${REVIEW}.`);
}
const reached = [...commentary.keys()].sort((a, b) => a - b);
if (reached.length !== CHAPTERS.length) {
  throw new Error(
    `anchored into Matthew ${reached.join(", ")} but the Sermon spans ${CHAPTERS.join(", ")}. See ${REVIEW}.`,
  );
}

for (const [chapter, verses] of commentary) {
  const max = Math.max(...verses.keys());
  if (max > MATTHEW_VERSES[chapter]) {
    throw new Error(`Matthew ${chapter}:${max}: past the end of a ${MATTHEW_VERSES[chapter]}-verse chapter.`);
  }
}

// ---- Write ------------------------------------------------------------------

writeWork({
  saintSlug: "augustine-of-hippo",
  workSlug: "sermon-on-the-mount",
  title: "Our Lord's Sermon on the Mount",
  subtitle: "Two books on Matthew 5 to 7",
  source: SOURCE,
  sections,
});

const dir = path.join(ROOT, "data", "bible", "commentary", "matthew");
fs.mkdirSync(dir, { recursive: true });
let kept = 0;
let written = 0;
for (const [chapter, verses] of [...commentary.entries()].sort((a, b) => a[0] - b[0])) {
  const file = path.join(dir, `${chapter}.json`);
  const existing = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
  const merged = {};
  for (const [v, notes] of Object.entries(existing)) {
    // Keep every other Father, and this Father's other works; replace only this
    // work's own prior notes.
    const others = notes.filter((n) => !(n.citation === CITATION && /Sermon on the Mount/.test(n.work)));
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
  `Matthew: ${anchored} of ${chapters.length} chapters anchored -> ${written} notes across ${commentary.size} chapters. ` +
    `Other sources preserved: ${kept}.`,
);
console.log(`  review: ${REVIEW}`);
console.log(SOURCE);
