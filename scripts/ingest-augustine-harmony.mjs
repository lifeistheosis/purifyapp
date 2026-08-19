// St. Augustine, The Harmony of the Gospels, from NPNF1-06 (Schaff, public
// domain). Four books on how the four evangelists agree.
//
// WHY THIS WORK. Luke rests on St Cyril alone. This is the one work in the
// untouched volumes that reaches all four Gospels at once, so it is the cheapest
// way to give Luke, Mark and John another voice, and Augustine is arguing the
// unity of the Gospels rather than expounding one, which is a kind of note the
// rail does not otherwise carry.
//
// THE PROBLEM THIS WORK CREATES FOR ANCHORING. Its whole subject is the same
// event told by more than one evangelist. A chapter about the calming of the
// storm quotes Matthew, Mark and Luke in the same breath, and pinning it to one
// of them would be a coin toss dressed as a citation.
//
// So the margin does the deciding. Every quotation is placed against all four
// Gospels, and a placement is accepted only when the winner beats the best rival
// across the other three by a clear margin. A distinctively Johannine or Lukan
// quotation wins outright and anchors. A synoptic parallel scores about the same
// in three books, fails the margin, and is refused. That refusal is the correct
// answer, not a shortfall: the passage genuinely is not identifiable to one
// Gospel, and a note that claims otherwise would be misplaced by construction.
//
// A large share of chapters will therefore not anchor, and that is the design.
// What is written is only what the text itself can prove.
//
// Run from the project root:
//   node scripts/ingest-augustine-harmony.mjs
//   node scripts/ingest-augustine-harmony.mjs --explain

import fs from "node:fs";
import path from "node:path";

import { MATCH_THRESHOLD, createAlignmentReport, createLemmaVerifier } from "./lib/lemma-verify.mjs";
import { getText, romanToInt, toParagraphs } from "./lib/npnf-homilies.mjs";
import { sliceRegion, splitLongNote, writeWork } from "./lib/ccel-work.mjs";

const ROOT = process.cwd();
const SRC_URL = "https://www.ccel.org/ccel/schaff/npnf106/cache/npnf106.txt";

const AUTHOR = "St. Augustine";
const CITATION = "NPNF1-06";
const SOURCE =
  "St. Augustine, The Harmony of the Gospels. From the Nicene and Post-Nicene Fathers, Series 1, Vol. 6 (ed. Philip Schaff). Public domain.";

const GOSPELS = { matthew: 28, mark: 16, luke: 24, john: 21 };

// How far ahead of the best rival Gospel a placement must be. Below this the
// quotation is a synoptic parallel and belongs to no single evangelist.
const CROSS_BOOK_MARGIN = 0.2;
// Only the opening quotations of a chapter are tried. Augustine ranges widely
// once he is arguing, and the passage under discussion is stated at the top.
const QUOTATIONS_TRIED = 4;

const args = process.argv.slice(2);
const text = await getText("npnf106.txt", SRC_URL);

// ---- Region -----------------------------------------------------------------
// The volume holds three works. This is the second, opening with a bare
// "Book I." followed by its own summary line, and running to the third.

// The third work's title page is set in lower case in this transcription
// ("sermons on selected lessons of the new testament"), so the end marker has to
// be case-insensitive. A capitalised marker matched nothing, the region ran to
// the end of the volume, and the Harmony's last chapter swallowed 1.8 million
// characters of the next work: 111 notes landed on John 4:48 alone. The chapter
// count below is what makes that visible if it ever happens again.
const region = sliceRegion(
  text,
  /^[ \t]*Book I\.[ \t]*\r?\n[\s\S]{0,300}?The treatise opens with a short statement on the subject/m,
  /^[ \t]*sermons on selected lessons of the new testament[ \t]*$/im,
  { label: "Harmony of the Gospels" },
);

// ---- Parse ------------------------------------------------------------------

const VERIFIERS = Object.fromEntries(
  Object.keys(GOSPELS).map((book) => [book, createLemmaVerifier(book)]),
);
const ALL_CHAPTERS = Object.fromEntries(
  Object.entries(GOSPELS).map(([book, n]) => [book, Array.from({ length: n }, (_, i) => i + 1)]),
);

const REPORT = createAlignmentReport({
  label: "Augustine, The Harmony of the Gospels: lemma alignment",
  command: "node scripts/ingest-augustine-harmony.mjs",
  source: SOURCE,
});

/**
 * Which verse of which Gospel is this quotation, if it is identifiably one?
 * Returns null when no Gospel wins clearly, which is the honest answer for a
 * passage the evangelists tell alike.
 */
function place(quoted) {
  const candidates = [];
  for (const book of Object.keys(GOSPELS)) {
    const found = VERIFIERS[book].findVerse(quoted, ALL_CHAPTERS[book], { margin: 0 });
    if (found.score > 0) {
      candidates.push({ book, chapter: found.chapter, verse: found.verse, score: found.score });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  if (!best || best.score < MATCH_THRESHOLD) return null;
  const rival = candidates.find((c) => c.book !== best.book);
  if (rival && best.score - rival.score < CROSS_BOOK_MARGIN) {
    return { ambiguous: true, best, rival };
  }
  return { ambiguous: false, best };
}

const BOOK_RE = /^[ \t]*Book ([IVXLCDM]+)\.[ \t]*$/gm;
const CHAP_RE = /^[ \t]*Chapter ([IVXLCDM]+)\.--([^\n]*)$/gm;

const books = [...region.matchAll(BOOK_RE)].map((m) => ({ at: m.index, n: romanToInt(m[1]) }));
const chapters = [...region.matchAll(CHAP_RE)].map((m) => ({
  at: m.index,
  end: m.index + m[0].length,
  n: romanToInt(m[1]),
  title: m[2].replace(/\s+/g, " ").trim().replace(/\.$/, ""),
}));
// De Consensu is Book I 35 chapters, II 80, III 25, IV 10, so exactly 150.
// Any other number means the region slipped, and the direction that hurts is
// long: an over-run region hands the whole of the next work to the last chapter.
if (chapters.length !== 150) {
  throw new Error(`Parsed ${chapters.length} chapters; the four books hold exactly 150. The region is wrong.`);
}
// No single chapter should be a large fraction of the work. This is the check
// that would have caught the over-run region directly rather than by its
// symptoms.
const LONGEST_CHAPTER_SHARE = 0.1;

const bookAt = (offset) => {
  let cur = null;
  for (const b of books) {
    if (b.at <= offset) cur = b.n;
    else break;
  }
  return cur;
};

const QUOTED = /"([^"]{40,600})"/g;
const commentary = new Map(); // book -> chapter -> verse -> notes[]
const sections = [];
let anchored = 0;
let ambiguous = 0;

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
    title: c.title ? `Book ${book}, Chapter ${c.n}. ${c.title}` : `Book ${book}, Chapter ${c.n}`,
    paragraphs,
  });

  const prose = paragraphs.join("\n\n");
  let placed = null;
  let sawAmbiguous = null;
  QUOTED.lastIndex = 0;
  let q;
  let tried = 0;
  while ((q = QUOTED.exec(prose)) !== null && tried < QUOTATIONS_TRIED) {
    tried++;
    const result = place(q[1]);
    if (!result) continue;
    if (result.ambiguous) {
      sawAmbiguous = sawAmbiguous ?? result;
      continue;
    }
    placed = result.best;
    break;
  }

  if (!placed) {
    ambiguous += sawAmbiguous ? 1 : 0;
    REPORT.flag({
      where: `Book ${book}, Chapter ${c.n}`,
      detail: sawAmbiguous
        ? `told alike by ${sawAmbiguous.best.book} and ${sawAmbiguous.rival.book}, so it belongs to neither`
        : "no quotation resolved to a single Gospel",
      homily: `Book ${book}`,
      quoted: (c.title || prose).slice(0, 90),
    });
    continue;
  }

  REPORT.pass();
  anchored++;
  if (!commentary.has(placed.book)) commentary.set(placed.book, new Map());
  const byChapter = commentary.get(placed.book);
  if (!byChapter.has(placed.chapter)) byChapter.set(placed.chapter, new Map());
  const byVerse = byChapter.get(placed.chapter);
  if (!byVerse.has(placed.verse)) byVerse.set(placed.verse, []);
  for (const part of splitLongNote(prose)) {
    byVerse.get(placed.verse).push({
      author: AUTHOR,
      work: `The Harmony of the Gospels, Book ${book}, Chapter ${c.n}`,
      citation: CITATION,
      text: part,
    });
  }
}

// ---- Prove it ---------------------------------------------------------------

REPORT.print({ explain: args.includes("--explain") });
const REVIEW = REPORT.writeReview("augustine-harmony-of-the-gospels");

const longest = Math.max(...sections.map((s) => s.paragraphs.join(" ").length));
const total = sections.reduce((n, s) => n + s.paragraphs.join(" ").length, 0);
if (longest / total > LONGEST_CHAPTER_SHARE) {
  throw new Error(
    `one chapter holds ${((longest / total) * 100).toFixed(0)}% of the work, which means the region ran past its end.`,
  );
}
if (anchored < 30) {
  throw new Error(`only ${anchored} chapters resolved to a single Gospel, too few to be working. See ${REVIEW}.`);
}
if (commentary.size < 2) {
  throw new Error(`anchored into only ${commentary.size} Gospel(s); a harmony that reaches one book is wrong. See ${REVIEW}.`);
}

// ---- Write ------------------------------------------------------------------

writeWork({
  saintSlug: "augustine-of-hippo",
  workSlug: "harmony-of-the-gospels",
  title: "The Harmony of the Gospels",
  subtitle: "Four books on the agreement of the evangelists",
  source: SOURCE,
  sections,
});

let written = 0;
let kept = 0;
for (const [book, byChapter] of commentary) {
  const dir = path.join(ROOT, "data", "bible", "commentary", book);
  fs.mkdirSync(dir, { recursive: true });
  for (const [chapter, verses] of [...byChapter.entries()].sort((a, b) => a[0] - b[0])) {
    const file = path.join(dir, `${chapter}.json`);
    const existing = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
    const merged = {};
    for (const [v, notes] of Object.entries(existing)) {
      const others = notes.filter((n) => !(n.citation === CITATION && /Harmony of the Gospels/.test(n.work)));
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
}

const reach = [...commentary.entries()]
  .map(([b, m]) => `${b} ${[...m.values()].reduce((n, v) => n + v.size, 0)} verses`)
  .join(", ");
console.log(
  `Harmony: ${anchored} of ${chapters.length} chapters anchored (${ambiguous} refused as told alike) ` +
    `-> ${written} notes. Reach: ${reach}. Other sources preserved: ${kept}.`,
);
console.log(`  review: ${REVIEW}`);
console.log(SOURCE);
