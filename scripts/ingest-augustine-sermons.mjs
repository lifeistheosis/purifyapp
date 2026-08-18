// St. Augustine, Sermons on Selected Lessons of the New Testament, from
// NPNF1-06 (Schaff, public domain). The third work in the volume, ninety-seven
// sermons preached on a single Gospel or Epistle lesson each.
//
// WHY THIS WORK, AND WHY IT WAS NEARLY MISSED. It sat behind two other works in
// a volume this branch had already opened twice: once to bound the Sermon on the
// Mount, once to fix the Harmony's end marker. Both times it was treated as a
// boundary rather than a source. It is Augustine preaching on Gospel passages,
// public domain, a saint the calendar keeps, in a series already whitelisted.
//
// HOW A LEMMA IS FOUND. This edition is unusually generous: each sermon's
// heading names its lesson outright and then quotes it. Sermon V is headed "On
// the words of the Gospel, Matt. v. 22, 'Whosoever shall say to his brother,
// thou fool, shall be in danger of the hell of fire.'"
//
// So the citation is printed and so is the text. The citation gives the book and
// chapter, which bounds the search to one chapter instead of a whole Gospel, and
// `findVerse` then pins the verse against the Scripture we ship. Where the
// heading quotes nothing, the printed verse number stands on its own. Where the
// heading names a book we do not carry commentary for, or names none at all, the
// sermon is recorded in the review file and left out.
//
// Run from the project root:
//   node scripts/ingest-augustine-sermons.mjs
//   node scripts/ingest-augustine-sermons.mjs --explain

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
  "St. Augustine, Sermons on Selected Lessons of the New Testament. From the Nicene and Post-Nicene Fathers, Series 1, Vol. 6 (ed. Philip Schaff). Public domain.";

// How the volume abbreviates the books, mapped to our slugs. Only books this
// library already carries Scripture for can be anchored against.
const BOOKS = {
  matt: "matthew", mark: "mark", luke: "luke", john: "john",
  acts: "acts", rom: "romans", gal: "galatians", eph: "ephesians",
  phil: "philippians", col: "colossians", heb: "hebrews", tit: "titus",
};

const args = process.argv.slice(2);
const text = await getText("npnf106.txt", SRC_URL);

// ---- Region -----------------------------------------------------------------
// The third work. Its title page is set in lower case in this transcription,
// which is what hid it from a capitalised search earlier on this branch.

const region = sliceRegion(
  text,
  /^[ \t]*sermons on selected lessons of the new testament[ \t]*$/im,
  null,
  { label: "Sermons on Selected Lessons" },
);

// ---- Parse ------------------------------------------------------------------

const REPORT = createAlignmentReport({
  label: "Augustine, Sermons on Selected Lessons: lemma alignment",
  command: "node scripts/ingest-augustine-sermons.mjs",
  source: SOURCE,
});

const verifiers = new Map();
function verifierFor(slug) {
  if (!verifiers.has(slug)) {
    try {
      verifiers.set(slug, createLemmaVerifier(slug));
    } catch {
      verifiers.set(slug, null); // a book we ship no Scripture for
    }
  }
  return verifiers.get(slug);
}

const HEAD_RE = /^[ \t]*Sermon ([IVXLCDM]+)\.[ \t]*$/gm;
const heads = [...region.matchAll(HEAD_RE)].map((m) => ({
  at: m.index,
  end: m.index + m[0].length,
  n: romanToInt(m[1]),
}));
if (heads.length < 90) {
  throw new Error(`Parsed ${heads.length} sermons; the work holds ninety-seven. The region is wrong.`);
}

// "Matt. iii. 13" / "Matt. Chap. v. 3" / "Luke xv. 11" / "John vi. 9"
const CITE_RE =
  /\b(Matt|Mark|Luke|John|Acts|Rom|Gal|Eph|Phil|Col|Heb|Tit)\.?\s*(?:Chap\.\s*)?([ivxlcdm]+)\.?\s*(\d+)?/i;

const commentary = new Map(); // book -> chapter -> verse -> notes[]
const sections = [];
let anchored = 0;

for (let i = 0; i < heads.length; i++) {
  const h = heads[i];
  const stop = i + 1 < heads.length ? heads[i + 1].at : region.length;
  const block = region.slice(h.end, stop);

  // The heading runs from the sermon number to the first numbered paragraph.
  const bodyAt = block.search(/^[ \t]*1\.[ \t]/m);
  const heading = block
    .slice(0, bodyAt > 0 ? bodyAt : 600)
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const paragraphs = toParagraphs(bodyAt > 0 ? block.slice(bodyAt) : block);
  if (!paragraphs.length) continue;

  sections.push({
    n: sections.length + 1,
    title: `Sermon ${h.n}. ${heading.slice(0, 140)}`,
    paragraphs,
  });

  const cite = CITE_RE.exec(heading);
  const slug = cite ? BOOKS[cite[1].toLowerCase()] : null;
  const verifier = slug ? verifierFor(slug) : null;
  if (!cite || !slug || !verifier) {
    REPORT.flag({
      where: `Sermon ${h.n}`,
      detail: cite ? `names ${cite[1]}, which this library carries no Scripture for` : "names no book and chapter",
      homily: `Sermon ${h.n}`,
      quoted: heading.slice(0, 90),
    });
    continue;
  }

  const chapter = romanToInt(cite[2]);
  const statedVerse = cite[3] ? Number(cite[3]) : null;

  // The heading usually quotes the lesson. Prefer the evidence of the words
  // over the printed number, but only search the chapter the edition names.
  const quoted = (heading.match(/"([^"]{20,400})"/) ?? [])[1];
  let verse = null;
  if (quoted) {
    const found = verifier.findVerse(quoted, [chapter], { margin: 0.05 });
    if (found.ok) verse = found.verse;
  }
  if (verse == null) verse = statedVerse;

  if (verse == null || !verifier.scripture.get(chapter)?.has(verse)) {
    REPORT.fail({
      chapter,
      n: verse ?? 0,
      hit: "0.00",
      quoted: `Sermon ${h.n}: ${heading.slice(0, 60)}`,
    });
    continue;
  }

  REPORT.pass();
  anchored++;
  if (!commentary.has(slug)) commentary.set(slug, new Map());
  const byChapter = commentary.get(slug);
  if (!byChapter.has(chapter)) byChapter.set(chapter, new Map());
  const byVerse = byChapter.get(chapter);
  if (!byVerse.has(verse)) byVerse.set(verse, []);
  for (const part of splitLongNote(paragraphs.join("\n\n"))) {
    byVerse.get(verse).push({
      author: AUTHOR,
      work: `Sermons on Selected Lessons, Sermon ${h.n}`,
      citation: CITATION,
      text: part,
    });
  }
}

// ---- Prove it ---------------------------------------------------------------

console.log(`Augustine's Sermons: ${heads.length} sermons, ${anchored} anchored.`);
REPORT.print({ explain: args.includes("--explain") });
const REVIEW = REPORT.writeReview("augustine-sermons-on-selected-lessons");

if (anchored < 50) {
  throw new Error(`only ${anchored} of ${heads.length} sermons anchored, too few to be working. See ${REVIEW}.`);
}

// ---- Write ------------------------------------------------------------------

writeWork({
  saintSlug: "augustine-of-hippo",
  workSlug: "sermons-on-selected-lessons",
  title: "Sermons on Selected Lessons of the New Testament",
  subtitle: "Ninety-seven sermons, each on one lesson",
  source: SOURCE,
  sections,
});

let written = 0;
let kept = 0;
for (const [slug, byChapter] of commentary) {
  const dir = path.join(ROOT, "data", "bible", "commentary", slug);
  fs.mkdirSync(dir, { recursive: true });
  for (const [chapter, verses] of [...byChapter.entries()].sort((a, b) => a[0] - b[0])) {
    const file = path.join(dir, `${chapter}.json`);
    const existing = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
    const merged = {};
    for (const [v, notes] of Object.entries(existing)) {
      const others = notes.filter((n) => !(n.citation === CITATION && /Sermons on Selected Lessons/.test(n.work)));
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
console.log(`  ${written} notes. Reach: ${reach}. Other sources preserved: ${kept}.`);
console.log(`  review: ${REVIEW}`);
console.log(SOURCE);
