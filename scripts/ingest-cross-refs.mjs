// Ingests TSK-style cross-references from openbible.info (CC-BY).
// Source: scripts/cr/cross_references.txt (download via cross-references.zip).
// Writes: data/bible/cross-refs/<slug>/<chapter>.json
//   shape: { "<verseN>": [{ display: "John 1:1-3", votes: 57 }, ...] }
// Top 8 refs per verse, sorted by vote count desc.
//
// Limitations: Psalms refs skipped (TSK uses Hebrew/MT numbering; our Brenton uses
// LXX numbering - chapters differ by one in the middle range). Deuterocanon not in TSK.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const TSV = path.join(__dirname, "cr", "cross_references.txt");
const OUT_DIR = path.join(ROOT, "data", "bible", "cross-refs");

const TOP_N = 8;

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
  // Ps intentionally omitted - numbering mismatch with Brenton LXX
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
  // Single "Book.C.V" or range "Book.C.V-Book.C.V"
  const parts = toStr.split("-");
  const a = parseRef(parts[0]);
  if (!a || !MAP[a.book]) return null;
  const [, displayBookA] = MAP[a.book];

  if (parts.length === 1) {
    return `${displayBookA} ${a.chapter}:${a.verse}`;
  }
  const b = parseRef(parts[1]);
  if (!b) return null;
  if (a.book === b.book) {
    if (a.chapter === b.chapter) {
      if (a.verse === b.verse) return `${displayBookA} ${a.chapter}:${a.verse}`;
      return `${displayBookA} ${a.chapter}:${a.verse}-${b.verse}`;
    }
    return `${displayBookA} ${a.chapter}:${a.verse}–${b.chapter}:${b.verse}`;
  }
  const mb = MAP[b.book];
  if (!mb) return `${displayBookA} ${a.chapter}:${a.verse}+`;
  return `${displayBookA} ${a.chapter}:${a.verse} – ${mb[1]} ${b.chapter}:${b.verse}`;
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
    let bySlug = bucket.get(slug);
    if (!bySlug) { bySlug = new Map(); bucket.set(slug, bySlug); }
    let byCh = bySlug.get(fromRef.chapter);
    if (!byCh) { byCh = new Map(); bySlug.set(fromRef.chapter, byCh); }
    let arr = byCh.get(fromRef.verse);
    if (!arr) { arr = []; byCh.set(fromRef.verse, arr); }
    arr.push({ display, votes });
    parsed++;
  }

  console.log(`Parsed ${parsed} refs, skipped ${skipped} (psalms + non-canonical sources)`);

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
