// St. Cyril of Alexandria, Commentary on the Gospel of Luke, in R. Payne
// Smith's translation from the Syriac, Oxford, at the University Press, 1859.
// Public domain by publication date; Payne Smith died in 1895.
//
// WHY THIS WORK. Luke was the last Gospel with no patristic commentary at all.
// Chrysostom never wrote on it and the Catena volumes CCEL carries are Matthew
// and Mark only. Cyril's is the great surviving Greek commentary on Luke, and
// it survives whole only in Syriac, which is why Payne Smith translated from
// that rather than from the Greek fragments.
//
// WHAT REPLACES WHAT. data/saints/cyril-of-alexandria/commentary-on-luke.json
// previously held four editorial digest sections whose own source line said
// "Editorial framing and notes by the editors of Purify". This replaces that
// with Cyril's own words. The digest is kept at
// docs/editorial/superseded/ rather than deleted.
//
// HOW A LEMMA IS FOUND. The same answer as the Catena ingest: it is verified,
// not recognised. Payne Smith prints the passage under discussion inline as
// "2:8-18." followed by the Scripture itself, and Cyril quotes other books the
// same way. A regex cannot tell a lemma from a cross-reference to Matthew, so
// every candidate is checked against data/bible/luke/ and only what really is
// that verse becomes an anchor. A reference to Matt 5:8 has nothing in Luke 5:8
// to match, so it stays as prose where it belongs.
//
// The translation is from Syriac, so it does not track the Authorised Version
// word for word the way an 1842 Oxford lemma does. The verified rate is
// therefore reported and written to the review file, and the floor is the same
// as everywhere else: below it, the matcher is broken rather than the data.
//
// Run from the project root:
//   node scripts/ingest-cyril-luke.mjs
//   node scripts/ingest-cyril-luke.mjs --explain   list what did not verify

import fs from "node:fs";
import path from "node:path";

import { createAlignmentReport, createLemmaVerifier } from "./lib/lemma-verify.mjs";
import { romanToInt } from "./lib/npnf-homilies.mjs";
import { splitLongNote } from "./lib/ccel-work.mjs";

const ROOT = process.cwd();
const CACHE = path.join(ROOT, "scripts", ".cache");
const BASE = "https://www.tertullian.org/fathers";

const PAGES = [
  "01_sermons_01_11", "02_sermons_12_25", "03_sermons_26_38", "04_sermons_39_46",
  "05_sermons_47_56", "06_sermons_57_65", "07_sermons_66_80", "08_sermons_81_88",
  "09_sermons_89_98", "10_sermons_99_109", "11_sermons_110_123", "12_sermons_124_134",
  "13_sermons_135_145", "14_sermons_146_156",
];

const AUTHOR = "St. Cyril of Alexandria";
// Named in full rather than given a series number. Payne Smith's Cyril was
// printed by the University Press at Oxford in 1859 but was not a numbered
// volume of the Library of the Fathers, and inventing "LFC 48" here would be
// exactly the tidy fiction commentaryLicensing.test.ts exists to prevent.
const CITATION = "Commentary on Luke (Oxford, Payne Smith, 1859)";
const SOURCE =
  "St. Cyril of Alexandria, A Commentary upon the Gospel according to S. Luke, now first translated into English from an ancient Syriac version by R. Payne Smith, M.A. Oxford, at the University Press, 1859. Public domain.";

const args = process.argv.slice(2);

// ---- Fetch ------------------------------------------------------------------

async function page(slug) {
  const file = path.join(CACHE, `cyril_on_luke_${slug}.htm`);
  if (fs.existsSync(file)) return fs.readFileSync(file, "utf8");
  const url = `${BASE}/cyril_on_luke_${slug}.htm`;
  process.stdout.write(`fetching ${url} ... `);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  const text = await res.text();
  fs.mkdirSync(CACHE, { recursive: true });
  fs.writeFileSync(file, text, "utf8");
  console.log(`${(text.length / 1024) | 0} KB`);
  return text;
}

// ---- HTML to text -----------------------------------------------------------

const ENTITIES = {
  "&quot;": '"', "&amp;": "&", "&lt;": "<", "&gt;": ">", "&nbsp;": " ",
  "&apos;": "'", "&mdash;": ", ", "&ndash;": "-", "&hellip;": "...",
};

function toText(html) {
  let s = html
    // Footnote references are superscript links. Cut them before tags go, or
    // their numbers land in the prose and read as verse anchors.
    .replace(/<a[^>]*href="#\d+"[^>]*>[\s\S]*?<\/a>/gi, "")
    .replace(/<sup>[\s\S]*?<\/sup>/gi, "")
    .replace(/<head[\s\S]*?<\/head>/i, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");
  s = s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h\d|li|tr|blockquote)>/gi, "\n\n")
    .replace(/<[^>]+>/g, "");
  for (const [ent, ch] of Object.entries(ENTITIES)) s = s.split(ent).join(ch);
  return s
    // Decode numeric references, do not delete them. This transcription sets
    // Cyril's Greek as hex references, so deleting the decimal form and
    // ignoring the hex form left 2,617 literal "&#x03BA;" codes on the page
    // for the reader and silently dropped characters elsewhere.
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&[a-z]+;/gi, " ")
    // Payne Smith's page numbers, printed as |47 in this transcription.
    .replace(/\|\s*\d+/g, " ")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ---- Locate the sermons -----------------------------------------------------
// Each page opens with a contents list of <a href="#CN">Sermon N: Luke C:V</a>
// and the bodies follow behind matching <a name="CN"> anchors. The list is the
// edition's own statement of what each sermon expounds, so it is used for the
// section title and never for the verse anchoring, which stays evidence-based.

// The anchor scheme is not consistent across the transcription: the early pages
// use href="#C1", the later ones href="#SERMON XLVII.". So the id is treated as
// opaque and matched between the contents list and the body, rather than
// assumed to have a shape.
function sermonsOnPage(html) {
  const key = (s) => s.trim().toUpperCase().replace(/\s+/g, " ");

  const contents = new Map();
  // Tolerant of a lead-in, because several sermons survive only in pieces and
  // are listed as "Fragments from Sermon 21." Tolerant too of the split anchor
  // tags on that page, where the label is broken across two <a> elements.
  for (const m of html.matchAll(
    /<a[^>]*href="#([^"]+)"[^>]*>([^<]*?)\bSermons?\s+(\d+|[IVXLC]+)\b([^<]*)<\/a>/gi,
  )) {
    const rest = m[4].trim().replace(/^[:.]\s*/, "").replace(/\.$/, "");
    contents.set(key(m[1]), {
      label: m[3].trim(),
      // Later pages give only "Sermon 47" with no passage, which is fine: the
      // passage is a section title, never the verse anchoring.
      passage: /luke/i.test(rest) ? rest : "",
    });
  }

  // Cyril's material on Luke 1 survives only as catena fragments, listed as
  // "Miscellaneous fragments on Luke c. 1" with no sermon number. Skipping it
  // left chapter 1 of the Gospel empty while the other 23 were covered.
  for (const m of html.matchAll(/<a[^>]*href="#([^"]+)"[^>]*>([^<]*fragments?[^<]*)<\/a>/gi)) {
    const id = key(m[1]);
    if (contents.has(id)) continue;
    if (/\bsermon\b/i.test(m[2])) continue; // already handled above
    contents.set(id, { label: null, passage: m[2].trim().replace(/\.$/, "") });
  }

  // Body anchors, in document order, with the span running to the next one.
  const anchors = [...html.matchAll(/<a[^>]*name="([^"]+)"[^>]*>/gi)].map((m) => ({
    id: key(m[1]),
    at: m.index,
  }));

  const out = [];
  for (let i = 0; i < anchors.length; i++) {
    const { id, at } = anchors[i];
    const meta = contents.get(id);
    if (!meta) continue; // a paragraph or navigation anchor, not a sermon
    // Run to the next SERMON anchor, not merely the next anchor: the pages are
    // littered with per-paragraph anchors, and stopping at one would truncate
    // every sermon to its first paragraph.
    let end = html.length;
    for (let j = i + 1; j < anchors.length; j++) {
      if (contents.has(anchors[j].id)) { end = anchors[j].at; break; }
    }
    const n = meta.label == null
      ? null
      : /^\d+$/.test(meta.label)
        ? Number(meta.label)
        : romanToInt(meta.label);
    out.push({
      id,
      n: Number.isFinite(n) && n > 0 ? n : null,
      passage: meta.passage,
      text: toText(html.slice(at, end)),
    });
  }
  return out;
}

// ---- Parse ------------------------------------------------------------------

const VERIFIER = createLemmaVerifier("luke");
const REPORT = createAlignmentReport({
  label: "Cyril of Alexandria on Luke: lemma alignment",
  command: "node scripts/ingest-cyril-luke.mjs",
  source: SOURCE,
});

// "2:8-18." or "1:51." opening a lemma. Bounded to plausible chapter and verse
// numbers so page furniture cannot match.
const ANCHOR = /(?:^|[\s"(])(\d{1,2}):(\d{1,3})(?:\s*[-–—]\s*\d{1,3})?\.?(?:\s|$)/g;

const commentary = new Map(); // chapter -> verse -> notes[]
const sections = [];
let sermonCount = 0;
let noteCount = 0;

const allSermons = [];
for (const slug of PAGES) allSermons.push(...sermonsOnPage(await page(slug)));

if (allSermons.length < 100) {
  throw new Error(`Only ${allSermons.length} sermons located; the edition has 156. Parser is wrong.`);
}

for (const sermon of allSermons) {
  sermonCount++;
  const body = sermon.text;

  // Every candidate anchor in this sermon, with the text that follows it.
  const found = [];
  ANCHOR.lastIndex = 0;
  let m;
  while ((m = ANCHOR.exec(body)) !== null) {
    found.push({ chapter: Number(m[1]), verse: Number(m[2]), at: m.index, len: m[0].length });
    ANCHOR.lastIndex = m.index + m[0].length;
  }

  const anchored = [];
  for (let i = 0; i < found.length; i++) {
    const c = found[i];
    const until = i + 1 < found.length ? found[i + 1].at : body.length;
    const following = body.slice(c.at + c.len, until);
    // The verifier decides. A cross-reference to another Gospel has nothing in
    // Luke at that address to match, so it never becomes an anchor.
    const hit = VERIFIER.score(following, c.chapter, c.verse);
    if (hit >= 0.5) {
      REPORT.pass();
      anchored.push({ ...c, text: following.trim(), score: hit });
    } else {
      REPORT.fail({
        chapter: c.chapter,
        n: c.verse,
        hit: hit.toFixed(2),
        quoted: following.trim().slice(0, 72),
      });
    }
  }

  // ---- the readable work ----
  const paragraphs = body
    .split(/\n\n+/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 40);
  if (paragraphs.length) {
    sections.push({
      // The fragments on chapter 1 precede sermon 1 in the edition.
      n: sermon.n ?? 0,
      title: sermon.n
        ? sermon.passage
          ? `Sermon ${sermon.n}, ${sermon.passage.replace(/^Luke\s*/i, "Luke ")}`
          : `Sermon ${sermon.n}`
        : sermon.passage || "Fragments",
      paragraphs,
    });
  }

  // ---- the commentary rail ----
  for (const a of anchored) {
    if (a.text.replace(/\s+/g, " ").trim().length < 200) continue; // anchor with no exposition
    if (!commentary.has(a.chapter)) commentary.set(a.chapter, new Map());
    const ch = commentary.get(a.chapter);
    if (!ch.has(a.verse)) ch.set(a.verse, []);
    for (const part of splitLongNote(a.text)) {
      ch.get(a.verse).push({
        author: AUTHOR,
        work: sermon.n
          ? `Commentary on Luke, Sermon ${sermon.n}`
          : "Commentary on Luke, fragments on chapter 1",
        citation: CITATION,
        text: part,
      });
      noteCount++;
    }
  }
}

// ---- Prove it ---------------------------------------------------------------

REPORT.print({ explain: args.includes("--explain") });
const REVIEW = REPORT.writeReview("cyril-of-alexandria-commentary-on-luke");
if (REPORT.belowFloor()) {
  throw new Error(
    `only ${(REPORT.rate() * 100).toFixed(1)}% of lemma candidates verify against data/bible/luke/. ` +
      `That is a broken matcher, not messy data. See ${REVIEW}.`,
  );
}

// Luke has 24 chapters. Anything outside that is a parse failure, not a note.
const LUKE_VERSES = {
  1: 80, 2: 52, 3: 38, 4: 44, 5: 39, 6: 49, 7: 50, 8: 56, 9: 62, 10: 42, 11: 54, 12: 59,
  13: 35, 14: 35, 15: 32, 16: 31, 17: 37, 18: 43, 19: 48, 20: 47, 21: 38, 22: 71, 23: 56, 24: 53,
};
for (const [chapter, verses] of commentary) {
  if (chapter < 1 || chapter > 24) throw new Error(`Luke: parsed chapter ${chapter}.`);
  const max = Math.max(...verses.keys());
  if (max > LUKE_VERSES[chapter]) {
    throw new Error(`Luke ${chapter}:${max}: anchored past the end of a ${LUKE_VERSES[chapter]}-verse chapter.`);
  }
}

// ---- Write ------------------------------------------------------------------

const workOut = path.join(ROOT, "data", "saints", "cyril-of-alexandria", "commentary-on-luke.json");
fs.mkdirSync(path.dirname(workOut), { recursive: true });
fs.writeFileSync(
  workOut,
  JSON.stringify(
    {
      saint: "cyril-of-alexandria",
      slug: "commentary-on-luke",
      title: "Commentary on the Gospel of Luke",
      subtitle: `The surviving sermons, translated from the Syriac`,
      source: SOURCE,
      sections: sections.sort((a, b) => a.n - b.n),
    },
    null,
    2,
  ) + "\n",
  "utf8",
);

const dir = path.join(ROOT, "data", "bible", "commentary", "luke");
fs.mkdirSync(dir, { recursive: true });
let kept = 0;
for (const [chapter, verses] of [...commentary.entries()].sort((a, b) => a[0] - b[0])) {
  const file = path.join(dir, `${chapter}.json`);
  const existing = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
  // Keep every other Father; replace only this work's own prior notes.
  const merged = {};
  for (const [v, notes] of Object.entries(existing)) {
    const others = notes.filter((n) => n.citation !== CITATION);
    kept += others.length;
    if (others.length) merged[v] = others;
  }
  for (const [verse, notes] of verses) {
    const key = String(verse);
    merged[key] = (merged[key] ?? []).concat(notes);
  }
  const ordered = {};
  for (const k of Object.keys(merged).sort((a, b) => Number(a) - Number(b))) ordered[k] = merged[k];
  fs.writeFileSync(file, JSON.stringify(ordered, null, 2) + "\n", "utf8");
}

console.log(
  `Luke: ${sermonCount} sermons -> ${noteCount} notes across ${commentary.size} chapters. ` +
    `Other sources preserved: ${kept}.`,
);
console.log(`  work:   ${path.relative(ROOT, workOut)} (${sections.length} sections)`);
console.log(`  review: ${REVIEW}`);
console.log(SOURCE);
