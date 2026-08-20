// St. Gregory the Great, Morals on the Book of Job, in the Library of the
// Fathers translation (Oxford, John Henry Parker, and J.G.F. and J. Rivington,
// London, 1844 to 1850). Public domain by publication date.
//
// WHY THIS WORK. Job was one of the largest books in the library carrying
// nothing at all: forty-two chapters, zero notes. The Moralia is the commentary
// on Job for the whole Latin Middle Ages, thirty-five books written while
// Gregory was papal envoy at Constantinople, and the Library of the Fathers
// translation is the only complete English one that is out of copyright.
//
// WHY THE VERIFIER DOES NOT ANCHOR THIS ONE, AND WHY THAT IS NOT AN EXCEPTION.
// Our Job is Brenton's Septuagint. Gregory expounds the Latin, and for Job those
// are materially different books: the Septuagint is far shorter and freely
// rendered. Measured against Job 1, the easiest chapter, only 8 of 10 lemmas
// clear a threshold calibrated on an 1842 Oxford text tracking the Authorised
// Version. The anchors are right and the wording simply differs, so lowering
// that threshold would be tuning a calibrated guard to fit one hard source.
//
// So this ingest does not ask the verifier to find the anchor. It uses what the
// edition itself prints, which is exactly the trust model every NPNF ingest in
// this repository has always used:
//
//   * the verse comes from Gregory's own "Ver. N." marker, as in NPNF;
//   * the chapter comes from the edition's stated scope for each Book, encoded
//     in SCOPE below, and where a Book spans more than one chapter the verifier
//     chooses between those two or three candidates on the evidence.
//
// The verifier then re-reads every anchor and the agreement rate is printed and
// written to the review file. That is strictly more evidence than the sixteen
// NPNF ingests carry, not less, and a fall in that rate is the signal that
// something upstream moved.
//
// Run from the project root:
//   node scripts/ingest-gregory-job.mjs
//   node scripts/ingest-gregory-job.mjs --explain

import fs from "node:fs";
import path from "node:path";

import { createAlignmentReport, createLemmaVerifier } from "./lib/lemma-verify.mjs";
import { splitLongNote, writeWork } from "./lib/ccel-work.mjs";

const ROOT = process.cwd();
const CACHE = path.join(ROOT, "scripts", ".cache");
const BASE = "https://www.lectionarycentral.com/GregoryMoralia";

const AUTHOR = "St. Gregory the Great";
// Named in full for the reason commentaryLicensing.test.ts already gives twice:
// the Moralia was published in the Library of the Fathers, but pinning it to a
// series number here would be a guess, and the imprint is what carries the
// public-domain claim.
const CITATION = "Morals on the Book of Job (Oxford, Parker, 1844)";
const SOURCE =
  "St. Gregory the Great, Morals on the Book of Job, translated with notes and indices. Oxford, John Henry Parker, and J.G.F. and J. Rivington, London, 1844 to 1850. Public domain.";

// The Job chapters each Book expounds, from the edition's own contents. Where a
// Book spans more than one, the verifier picks between them for each lemma.
const SCOPE = {
  1: [1], 2: [1], 3: [2], 4: [3], 5: [3, 4, 5], 6: [5], 7: [6], 8: [6, 7, 8],
  9: [9, 10], 10: [11, 12], 11: [12, 13, 14], 12: [14, 15], 13: [16, 17],
  14: [18, 19], 15: [20, 21], 16: [22, 23, 24], 17: [24, 25, 26], 18: [27, 28],
  19: [28, 29], 20: [29, 30], 21: [31], 22: [31], 23: [32, 33], 24: [33, 34],
  25: [34], 26: [34, 35, 36], 27: [36, 37], 28: [38], 29: [38], 30: [38, 39],
  31: [39], 32: [39, 40], 33: [40, 41], 34: [41], 35: [42],
};

const args = process.argv.slice(2);

// ---- Fetch ------------------------------------------------------------------

/**
 * Decode a fetched page using the encoding it actually declares.
 *
 * WHY THIS IS NOT `res.text()`. These pages are windows-1252 and say so in a
 * meta tag in the document head. They do NOT say so in the Content-Type
 * header, which is the bare `text/html`. `res.text()` reads only that header
 * and never looks at the markup, so it falls back to UTF-8 and every cp1252
 * smart quote and section sign decodes to U+FFFD. That is not a display bug
 * that can be fixed later: the original bytes are gone the moment the string
 * exists, and if the result is cached the loss is permanent.
 *
 * This shipped. 795 of 920 Job notes carried 11,125 replacement characters in
 * production, so a reader met "by ?the seven sons? is represented" throughout
 * the largest work in the library. Found 2026-08-19.
 *
 * So: take the bytes, sniff the declared charset out of the first block, and
 * decode deliberately. A server that omits the charset while the document
 * declares it is common enough in the scanned-nineteenth-century corner of the
 * web that this is the safe default, not a special case.
 */
function decodeDeclared(buf) {
  const head = Buffer.from(buf).subarray(0, 4096).toString("latin1");
  const m = head.match(/charset\s*=\s*["']?\s*([\w-]+)/i);
  const label = (m?.[1] ?? "utf-8").toLowerCase();
  try {
    return new TextDecoder(label).decode(buf);
  } catch {
    console.log(`  unknown charset "${label}", falling back to windows-1252.`);
    return new TextDecoder("windows-1252").decode(buf);
  }
}

async function bookPage(n) {
  const name = `Book${String(n).padStart(2, "0")}`;
  const file = path.join(CACHE, `gregory-job-${name.toLowerCase()}.html`);
  if (fs.existsSync(file)) return fs.readFileSync(file, "utf8");
  const url = `${BASE}/${name}.html`;
  const res = await fetch(url);
  if (!res.ok) {
    console.log(`  Book ${n}: ${url} -> ${res.status}, skipped.`);
    return null;
  }
  const text = decodeDeclared(await res.arrayBuffer());
  fs.mkdirSync(CACHE, { recursive: true });
  // Cache as UTF-8 now that it is correctly decoded, so the re-read above is right.
  fs.writeFileSync(file, text, "utf8");
  return text;
}

function toText(html) {
  let s = html
    .replace(/<head[\s\S]*?<\/head>/i, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");
  s = s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h\d|li|tr|blockquote)>/gi, "\n\n")
    .replace(/<[^>]+>/g, "");
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    // Decode numeric references rather than deleting them. Dropping them
    // silently removes characters from a verbatim text, which is the same
    // class of loss as the charset bug above, just quieter.
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\r/g, "")
    // House typography. CLAUDE.md: no em dashes, en dashes in numeric ranges
    // are fine. The 1844 Oxford edition sets both senses with an em dash, so
    // split them: a range keeps a dash (as an en dash), a sentence break
    // becomes a comma, which is what scripts/sweep-em-dashes.mjs did to the
    // rest of this corpus. Typography only; not a word is added or removed.
    // The printed edition's page numbers, set as a bracketed roman numeral on
    // a line of its own. 1,253 of them were reaching the reader mid-sentence
    // as "[xxviii]", which is the same kind of artifact as the CCEL Page_NNN
    // anchors the integrity test already forbids. Anchored to the whole line
    // so bracketed references like [Job 1, 1] and [2 Sam. 7, 23] are untouched.
    .replace(/^[ \t]*\[[ivxlcdm]{1,7}\][ \t]*$/gim, "")
    // The same page number where it shares a line with the interpretive
    // heading that follows it, as in "[xvi] [MORAL INTERPRETATION]". The
    // heading is content and stays; only the page number goes.
    .replace(/^[ \t]*\[[ivxlcdm]{1,7}\][ \t]+(?=\[)/gim, "")
    // The same edition's footnote anchors, set as a bracketed letter inside the
    // sentence: "made to fear by His power [c], but refusing to believe". The
    // notes they point at are not part of what we ship, so the anchor is a
    // reference to nothing. ingest-augustine-1-john.mjs already strips the
    // numeric form of exactly this. Two letters at most, so bracketed
    // references like [Job 1, 1] and [Gen. 3, 19] are untouched.
    .replace(/[ \t]*\[[a-z]{1,2}\](?=[\s,.;:?!)])/g, "")
    .replace(/(\d)\s*—\s*(\d)/g, "$1–$2")
    .replace(/\s*—\s*/g, ", ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/,\s*,/g, ",")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Drop the Oxford editor's appended note, where the edition prints one.
 *
 * Book 29 ends with a rule and then "Note from §. 74 above:", under which the
 * 1844 editor argues at length that Gregory's language on the procession of
 * the Spirit can be read compatibly with the later Latin Church. That is a
 * Victorian Anglican's opinion on the filioque. It is not Gregory, and it
 * shipped as 1,094 of the 1,741 words of the note at Job 38:33, under his
 * name, where a reader had no way to know whose voice it was.
 *
 * Removing it is a misattribution fix rather than a doctrinal judgement: the
 * note claimed the words were Gregory's and they are not. The question of
 * whether the Church reads Gregory the way that editor did is a real one, and
 * it belongs in the clergy queue in docs/editorial-standards.md, not in a
 * script.
 *
 * Marker is doubly positive, as everywhere else here: a rule AND the header
 * the edition itself prints. Exactly one of the thirty-five books has it.
 */
function cutEditorNote(text) {
  const m = text.match(/_{20,}\s*\n+\s*Note from[^\n]{0,60}above:/);
  return m ? text.slice(0, m.index) : text;
}

// ---- Parse ------------------------------------------------------------------

const VERIFIER = createLemmaVerifier("job");
const REPORT = createAlignmentReport({
  label: "Gregory the Great, Morals on the Book of Job: lemma alignment",
  command: "node scripts/ingest-gregory-job.mjs",
  source: SOURCE,
});

// Verse counts taken from the text we actually ship, so the bounds check cannot
// drift from the edition on disk.
const JOB_VERSES = new Map(
  [...VERIFIER.scripture.entries()].map(([ch, verses]) => [ch, Math.max(...verses.keys())]),
);

const VER = /(?:^|\s)Ver\.\s*(\d{1,3})\.\s*/g;
const commentary = new Map(); // chapter -> verse -> notes[]
const sections = []; // the same text again, as a work someone can read straight through
const driftCounts = new Map(); // offset -> how many lemmas fit a neighbour better
let markers = 0;
let booksRead = 0;

/**
 * Where a Book's own text starts.
 *
 * Each page opens with the site's navigation and the volume's half-title
 * before the Book itself. The rail never noticed because it slices from the
 * first "Ver." marker onwards, but a work meant to be read straight through
 * would open on "Home Moralia Index The Epistle Book II", so find the "BOOK
 * N." heading the edition prints and start there.
 */
function bookBody(body, n) {
  const roman = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII",
    "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI", "XXII", "XXIII", "XXIV",
    "XXV", "XXVI", "XXVII", "XXVIII", "XXIX", "XXX", "XXXI", "XXXII", "XXXIII", "XXXIV", "XXXV"][n];
  const m = body.match(new RegExp(`^[ \\t]*BOOK ${roman}\\.[ \\t]*$`, "m"));
  return m ? body.slice(m.index + m[0].length).trim() : body.trim();
}

/** The site's own furniture, which is navigation and not Gregory. */
const CHROME = /^(?:Home|Moralia Index|The Epistle|BOOK [IVXLCDM]+|Book [IVXLCDM]+)$/;

function toParas(s) {
  const paras = s
    .split(/\n\s*\n+/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 1);
  // Each page closes with a link to the next Book, and the last with a link
  // back to the index. Trim from the end only, so a line of Gregory's that
  // happens to be short is never touched.
  while (paras.length && CHROME.test(paras[paras.length - 1])) paras.pop();
  return paras;
}

for (let n = 1; n <= 35; n++) {
  const html = await bookPage(n);
  if (!html) continue;
  booksRead++;
  const body = cutEditorNote(toText(html));
  const scope = SCOPE[n] ?? [];
  if (!scope.length) continue;

  // The reading copy. Same text the rail quotes, kept whole and in order,
  // because the rail necessarily shows it in verse-sized pieces and the
  // Moralia is an argument that runs.
  const paragraphs = toParas(bookBody(body, n));
  if (paragraphs.length) {
    const span = scope.length > 1 ? `Job ${scope[0]} to ${scope[scope.length - 1]}` : `Job ${scope[0]}`;
    sections.push({ n, title: `Book ${n}, on ${span}`, paragraphs });
  }

  const found = [];
  VER.lastIndex = 0;
  let m;
  while ((m = VER.exec(body)) !== null) {
    found.push({ verse: Number(m[1]), at: m.index, len: m[0].length });
    VER.lastIndex = m.index + m[0].length;
  }

  for (let i = 0; i < found.length; i++) {
    const f = found[i];
    const until = i + 1 < found.length ? found[i + 1].at : body.length;
    const text = body.slice(f.at + f.len, until).trim();
    if (text.length < 300) continue; // a marker with no exposition behind it
    markers++;

    // The chapter is the edition's, narrowed by evidence when it names more
    // than one. With a single candidate the printed scope simply stands.
    let chapter = scope[0];
    let best = VERIFIER.score(text, chapter, f.verse);
    for (const cand of scope.slice(1)) {
      const hit = VERIFIER.score(text, cand, f.verse);
      if (hit > best) {
        best = hit;
        chapter = cand;
      }
    }

    // Report only. The anchor is the edition's, not the matcher's; this records
    // how far our Septuagint and Gregory's Latin agree, lemma by lemma.
    if (best >= 0.5) {
      REPORT.pass();
    } else {
      // When a lemma does not match where it was placed, say whether a
      // neighbouring verse fits it better. Measured across the whole work the
      // offsets come out symmetric, roughly as many backwards as forwards,
      // which is adjacent-verse vocabulary in Hebrew poetry rather than the two
      // editions numbering Job differently. A one-directional bias here would
      // mean the opposite and would need fixing before this could ship.
      let drift = null;
      let driftScore = best;
      for (const off of [-3, -2, -1, 1, 2, 3]) {
        const hit = VERIFIER.score(text, chapter, f.verse + off);
        if (hit > driftScore + 0.12) {
          driftScore = hit;
          drift = off;
        }
      }
      REPORT.fail({
        chapter,
        n: f.verse,
        hit: best.toFixed(2),
        quoted:
          (drift ? `[verse ${f.verse + drift} fits better, ${driftScore.toFixed(2)}] ` : "") +
          text.slice(0, 72),
      });
      if (drift) driftCounts.set(drift, (driftCounts.get(drift) ?? 0) + 1);
    }

    const limit = JOB_VERSES.get(chapter);
    if (!limit || f.verse > limit) {
      REPORT.flag({
        where: `Job ${chapter}:${f.verse}`,
        detail: `past the end of a ${limit ?? 0}-verse chapter, so it is dropped`,
        homily: `Book ${n}`,
        quoted: text.slice(0, 90),
      });
      continue;
    }

    if (!commentary.has(chapter)) commentary.set(chapter, new Map());
    const ch = commentary.get(chapter);
    if (!ch.has(f.verse)) ch.set(f.verse, []);
    for (const part of splitLongNote(text)) {
      ch.get(f.verse).push({
        author: AUTHOR,
        work: `Morals on the Book of Job, Book ${n}`,
        citation: CITATION,
        text: part,
      });
    }
  }
}

// ---- Prove it ---------------------------------------------------------------

console.log(
  `Gregory on Job: ${booksRead} of 35 books read, ${markers} verse markers, ` +
    `${commentary.size} chapters of Job reached.`,
);
REPORT.print({ explain: args.includes("--explain") });
const REVIEW = REPORT.writeReview("gregory-the-great-morals-on-job");

// Symmetry is the thing being asserted. If lemmas that miss their verse were
// mostly fitting one direction, the two editions would be numbering Job
// differently and every note would be systematically off by that much.
const back = [...driftCounts].filter(([o]) => o < 0).reduce((n, [, c]) => n + c, 0);
const forward = [...driftCounts].filter(([o]) => o > 0).reduce((n, [, c]) => n + c, 0);
console.log(
  `  neighbour fit: ${back} lemmas sit better a verse or two earlier, ${forward} later. ` +
    `Symmetry means adjacent-verse wording, not a numbering offset.`,
);
if (back + forward > 20 && Math.min(back, forward) / Math.max(back, forward) < 0.4) {
  throw new Error(
    `lemma drift is one-directional (${back} back, ${forward} forward), which means the editions ` +
      `number Job differently and the anchors are systematically wrong. See ${REVIEW}.`,
  );
}

if (booksRead < 30) throw new Error(`only ${booksRead} of 35 books fetched. See ${REVIEW}.`);
// Job has 42 chapters and the Moralia walks all of them. Reaching most is the
// structural proof that scope and markers were read correctly.
if (commentary.size < 30) {
  throw new Error(`reached only ${commentary.size} chapters of Job, which cannot be right. See ${REVIEW}.`);
}

// ---- Write ------------------------------------------------------------------

// The work itself, so the Moralia is readable as a book and not only as 920
// fragments beside the verses. Gregory speaks in 1,179 notes across the corpus
// and his profile shipped no writings at all, which is the gap this closes.
// Same parse, two artifacts, exactly as ingest-cyril-luke.mjs does for Luke.
if (sections.length < 30) {
  throw new Error(`only ${sections.length} of 35 Books produced readable text; the work would ship partial.`);
}
writeWork({
  saintSlug: "gregory-the-dialogist",
  workSlug: "morals-on-the-book-of-job",
  title: "Morals on the Book of Job",
  subtitle: "The Moralia, in thirty-five books",
  source: SOURCE,
  sections: sections.sort((a, b) => a.n - b.n),
});

const dir = path.join(ROOT, "data", "bible", "commentary", "job");
fs.mkdirSync(dir, { recursive: true });
let written = 0;
let kept = 0;
for (const [chapter, verses] of [...commentary.entries()].sort((a, b) => a[0] - b[0])) {
  const file = path.join(dir, `${chapter}.json`);
  const existing = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
  const merged = {};
  for (const [v, notes] of Object.entries(existing)) {
    const others = notes.filter((x) => x.citation !== CITATION);
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

console.log(`  ${written} notes written across ${commentary.size} chapters. Other sources preserved: ${kept}.`);
console.log(`  review: ${REVIEW}`);
console.log("  Remember: add \"job\" to COMMENTED_BOOKS or none of this is reachable.");
console.log(SOURCE);
