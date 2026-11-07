// Ingests TSK-style cross-references from openbible.info (CC-BY).
// Source: scripts/cr/cross_references.txt (download via cross-references.zip).
// Writes: data/bible/cross-refs/<slug>/<chapter>.json
//   shape: { "<verseN>": [{ display: "John 1:1-3", votes: 57 }, ...] }
// Top 8 refs per verse, sorted by vote count desc.
//
// Numbered as the app numbers its Bible (1.9). OpenBible numbers every book as
// the King James Version does; the app's Old Testament is the Septuagint in
// Brenton's English, numbered otherwise (the KJV's Jeremiah 31:31 is the
// app's 38:31, its Psalm 23 the app's 22). Each Old Testament reference, the
// verse it is on and the verse it points to, is placed through the verse map
// (data/bible/kjv-to-lxx.json, scripts/bibles/verse-map.mjs); one the app's
// Septuagint does not have is left out, never placed on a neighbour. The
// Psalms are in now: until 1.9 they were left out for their numbering. Two KJV
// verses Brenton holds in one give that verse both lists, each reference once
// at its higher count. The New Testament is numbered alike in both.
//
// No deuterocanon: OpenBible's list has none.

import fs from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const TSV = path.join(__dirname, "cr", "cross_references.txt");
const OUT_DIR = path.join(ROOT, "data", "bible", "cross-refs");

const TOP_N = 8;

/** The KJV's Old Testament numbering to the app's (scripts/bibles/verse-map.mjs). */
const VERSE_MAP = JSON.parse(readFileSync(path.join(ROOT, "data", "bible", "kjv-to-lxx.json"), "utf8")).books;
const MISSING = Object.fromEntries(Object.entries(VERSE_MAP).map(([slug, m]) => [slug, new Set(m.missing)]));

/** Where a KJV-numbered verse is in the app: its own number in the New Testament; null when the app has none. */
function place(slug, chapter, verse) {
  const map = VERSE_MAP[slug];
  if (!map) return { chapter, verse };
  const key = `${chapter}:${verse}`;
  if (MISSING[slug].has(key)) return null;
  const to = map.moved[key];
  if (!to) return { chapter, verse };
  const [c, v] = to.split(":").map(Number);
  return { chapter: c, verse: v };
}

// OSIS abbreviation -> [slug, displayName]
const MAP = {
  Gen: ["genesis", "Genesis"],
  Exod: ["exodus", "Exodus"],
  Lev: ["leviticus", "Leviticus"],
  Num: ["numbers", "Numbers"],
  Deut: ["deuteronomy", "Deuteronomy"],
  Josh: ["joshua", "Joshua"],
  Judg: ["judges", "Judges"],
  Ruth: ["ruth", "Ruth"],
  "1Sam": ["1-samuel", "1 Samuel"],
  "2Sam": ["2-samuel", "2 Samuel"],
  "1Kgs": ["1-kings", "1 Kings"],
  "2Kgs": ["2-kings", "2 Kings"],
  "1Chr": ["1-chronicles", "1 Chronicles"],
  "2Chr": ["2-chronicles", "2 Chronicles"],
  Ezra: ["ezra", "Ezra"],
  Neh: ["nehemiah", "Nehemiah"],
  Esth: ["esther", "Esther"],
  Job: ["job", "Job"],
  Ps: ["psalms", "Psalms"],
  Prov: ["proverbs", "Proverbs"],
  Eccl: ["ecclesiastes", "Ecclesiastes"],
  Song: ["song-of-solomon", "Song of Solomon"],
  Isa: ["isaiah", "Isaiah"],
  Jer: ["jeremiah", "Jeremiah"],
  Lam: ["lamentations", "Lamentations"],
  Ezek: ["ezekiel", "Ezekiel"],
  Dan: ["daniel", "Daniel"],
  Hos: ["hosea", "Hosea"],
  Joel: ["joel", "Joel"],
  Amos: ["amos", "Amos"],
  Obad: ["obadiah", "Obadiah"],
  Jonah: ["jonah", "Jonah"],
  Mic: ["micah", "Micah"],
  Nah: ["nahum", "Nahum"],
  Hab: ["habakkuk", "Habakkuk"],
  Zeph: ["zephaniah", "Zephaniah"],
  Hag: ["haggai", "Haggai"],
  Zech: ["zechariah", "Zechariah"],
  Mal: ["malachi", "Malachi"],
  Matt: ["matthew", "Matthew"],
  Mark: ["mark", "Mark"],
  Luke: ["luke", "Luke"],
  John: ["john", "John"],
  Acts: ["acts", "Acts"],
  Rom: ["romans", "Romans"],
  "1Cor": ["1-corinthians", "1 Corinthians"],
  "2Cor": ["2-corinthians", "2 Corinthians"],
  Gal: ["galatians", "Galatians"],
  Eph: ["ephesians", "Ephesians"],
  Phil: ["philippians", "Philippians"],
  Col: ["colossians", "Colossians"],
  "1Thess": ["1-thessalonians", "1 Thessalonians"],
  "2Thess": ["2-thessalonians", "2 Thessalonians"],
  "1Tim": ["1-timothy", "1 Timothy"],
  "2Tim": ["2-timothy", "2 Timothy"],
  Titus: ["titus", "Titus"],
  Phlm: ["philemon", "Philemon"],
  Heb: ["hebrews", "Hebrews"],
  Jas: ["james", "James"],
  "1Pet": ["1-peter", "1 Peter"],
  "2Pet": ["2-peter", "2 Peter"],
  "1John": ["1-john", "1 John"],
  "2John": ["2-john", "2 John"],
  "3John": ["3-john", "3 John"],
  Jude: ["jude", "Jude"],
  Rev: ["revelation", "Revelation"],
};

function parseRef(s) {
  // "Book.Chapter.Verse" -> { book, chapter, verse }
  const m = s.match(/^([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)$/);
  if (!m) return null;
  return { book: m[1], chapter: Number(m[2]), verse: Number(m[3]) };
}

function formatToVerse(toStr) {
  // Single "Book.C.V" or range "Book.C.V-Book.C.V", placed in the app's numbering.
  const parts = toStr.split("-");
  const a = parseRef(parts[0]);
  if (!a || !MAP[a.book]) return null;
  const [slugA, displayBookA] = MAP[a.book];
  const start = place(slugA, a.chapter, a.verse);
  if (!start) return null;
  const one = `${displayBookA} ${start.chapter}:${start.verse}`;
  if (parts.length === 1) return one;
  const b = parseRef(parts[1]);
  if (!b || b.book !== a.book) return one;
  const end = place(slugA, b.chapter, b.verse);
  // A range the app's Septuagint ends otherwise, or orders otherwise, is its first verse.
  if (!end || end.chapter < start.chapter || (end.chapter === start.chapter && end.verse <= start.verse)) return one;
  if (end.chapter === start.chapter) return `${one}-${end.verse}`;
  return `${one}–${end.chapter}:${end.verse}`;
}

async function main() {
  const raw = await fs.readFile(TSV, "utf8");
  const lines = raw.split(/\r?\n/);
  // bucket: slug -> chapter -> verse -> [{display, votes}]
  const bucket = new Map();

  let parsed = 0, skipped = 0;
  for (const line of lines) {
    if (!line || line.startsWith("From Verse") || line.startsWith("#")) continue;
    const [from, to, votesStr] = line.split("\t");
    if (!from || !to) continue;
    const fromRef = parseRef(from);
    if (!fromRef) { skipped++; continue; }
    const m = MAP[fromRef.book];
    if (!m) { skipped++; continue; }
    const display = formatToVerse(to);
    if (!display) { skipped++; continue; }
    const votes = Number(votesStr) || 0;
    const [slug] = m;
    const at = place(slug, fromRef.chapter, fromRef.verse);
    if (!at) { skipped++; continue; }
    // A reference that begins at the verse it is on says nothing the reader is not reading.
    if (display.startsWith(`${m[1]} ${at.chapter}:${at.verse}`) && !/^\d/.test(display.slice(`${m[1]} ${at.chapter}:${at.verse}`.length))) { skipped++; continue; }
    let bySlug = bucket.get(slug);
    if (!bySlug) { bySlug = new Map(); bucket.set(slug, bySlug); }
    let byCh = bySlug.get(at.chapter);
    if (!byCh) { byCh = new Map(); bySlug.set(at.chapter, byCh); }
    let arr = byCh.get(at.verse);
    if (!arr) { arr = []; byCh.set(at.verse, arr); }
    const same = arr.find((x) => x.display === display);
    if (same) same.votes = Math.max(same.votes, votes);
    else arr.push({ display, votes });
    parsed++;
  }

  console.log(`Parsed ${parsed} refs, skipped ${skipped} (verses the app's Septuagint does not have, and non-canonical sources)`);

  await fs.rm(OUT_DIR, { recursive: true, force: true });
  let files = 0;
  for (const [slug, bySlug] of bucket) {
    const dir = path.join(OUT_DIR, slug);
    await fs.mkdir(dir, { recursive: true });
    for (const [chapter, byCh] of bySlug) {
      const obj = {};
      for (const [verse, arr] of byCh) {
        arr.sort((a, b) => b.votes - a.votes);
        obj[verse] = arr.slice(0, TOP_N);
      }
      await fs.writeFile(
        path.join(dir, `${chapter}.json`),
        JSON.stringify(obj, null, 0),
      );
      files++;
    }
  }
  console.log(`Wrote ${files} cross-ref chapter files under ${OUT_DIR}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
