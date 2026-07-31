// Pulls Brenton LXX (OT, incl. deuterocanon) and KJV (NT) from bolls.life,
// normalizes to per-chapter JSON under data/bible/<slug>/<chapter>.json,
// writes data/bible/books.json, and self-tests known verse counts.
//
// Run once:  node scripts/ingest-bible.mjs
// Re-run is idempotent - files overwritten.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "data", "bible");

const BASE = "https://bolls.life";
const CONCURRENCY = 6;

// [slug, displayName, testament, translation, bolls bookId]
const CANON = [
  // Pentateuch
  ["genesis", "Genesis", "OT", "LXXE", 1],
  ["exodus", "Exodus", "OT", "LXXE", 2],
  ["leviticus", "Leviticus", "OT", "LXXE", 3],
  ["numbers", "Numbers", "OT", "LXXE", 4],
  ["deuteronomy", "Deuteronomy", "OT", "LXXE", 5],
  // Historical
  ["joshua", "Joshua", "OT", "LXXE", 6],
  ["judges", "Judges", "OT", "LXXE", 7],
  ["ruth", "Ruth", "OT", "LXXE", 8],
  ["1-samuel", "1 Samuel", "OT", "LXXE", 9],
  ["2-samuel", "2 Samuel", "OT", "LXXE", 10],
  ["1-kings", "1 Kings", "OT", "LXXE", 11],
  ["2-kings", "2 Kings", "OT", "LXXE", 12],
  ["1-chronicles", "1 Chronicles", "OT", "LXXE", 13],
  ["2-chronicles", "2 Chronicles", "OT", "LXXE", 14],
  ["1-esdras", "1 Esdras", "OT", "LXXE", 67],
  ["ezra", "Ezra", "OT", "LXXE", 15],
  ["nehemiah", "Nehemiah", "OT", "LXXE", 16],
  ["tobit", "Tobit", "OT", "LXXE", 68],
  ["judith", "Judith", "OT", "LXXE", 69],
  ["esther", "Esther", "OT", "LXXE", 17],
  ["1-maccabees", "1 Maccabees", "OT", "LXXE", 74],
  ["2-maccabees", "2 Maccabees", "OT", "LXXE", 75],
  ["3-maccabees", "3 Maccabees", "OT", "LXXE", 76],
  // Wisdom
  ["job", "Job", "OT", "LXXE", 18],
  ["psalms", "Psalms", "OT", "LXXE", 19],
  ["proverbs", "Proverbs", "OT", "LXXE", 20],
  ["ecclesiastes", "Ecclesiastes", "OT", "LXXE", 21],
  ["song-of-solomon", "Song of Solomon", "OT", "LXXE", 22],
  ["wisdom", "Wisdom of Solomon", "OT", "LXXE", 70],
  ["sirach", "Sirach", "OT", "LXXE", 71],
  // Minor prophets (Septuagint order)
  ["hosea", "Hosea", "OT", "LXXE", 28],
  ["amos", "Amos", "OT", "LXXE", 30],
  ["micah", "Micah", "OT", "LXXE", 33],
  ["joel", "Joel", "OT", "LXXE", 29],
  ["obadiah", "Obadiah", "OT", "LXXE", 31],
  ["jonah", "Jonah", "OT", "LXXE", 32],
  ["nahum", "Nahum", "OT", "LXXE", 34],
  ["habakkuk", "Habakkuk", "OT", "LXXE", 35],
  ["zephaniah", "Zephaniah", "OT", "LXXE", 36],
  ["haggai", "Haggai", "OT", "LXXE", 37],
  ["zechariah", "Zechariah", "OT", "LXXE", 38],
  ["malachi", "Malachi", "OT", "LXXE", 39],
  // Major prophets
  ["isaiah", "Isaiah", "OT", "LXXE", 23],
  ["jeremiah", "Jeremiah", "OT", "LXXE", 24],
  ["baruch", "Baruch", "OT", "LXXE", 73],
  ["lamentations", "Lamentations", "OT", "LXXE", 25],
  ["epistle-of-jeremiah", "Epistle of Jeremiah", "OT", "LXXE", 72],
  ["ezekiel", "Ezekiel", "OT", "LXXE", 26],
  ["daniel", "Daniel", "OT", "LXXE", 27],
  ["prayer-of-manasseh", "Prayer of Manasseh", "OT", "LXXE", 83],
  // NT (KJV)
  ["matthew", "Matthew", "NT", "KJV", 40],
  ["mark", "Mark", "NT", "KJV", 41],
  ["luke", "Luke", "NT", "KJV", 42],
  ["john", "John", "NT", "KJV", 43],
  ["acts", "Acts", "NT", "KJV", 44],
  ["romans", "Romans", "NT", "KJV", 45],
  ["1-corinthians", "1 Corinthians", "NT", "KJV", 46],
  ["2-corinthians", "2 Corinthians", "NT", "KJV", 47],
  ["galatians", "Galatians", "NT", "KJV", 48],
  ["ephesians", "Ephesians", "NT", "KJV", 49],
  ["philippians", "Philippians", "NT", "KJV", 50],
  ["colossians", "Colossians", "NT", "KJV", 51],
  ["1-thessalonians", "1 Thessalonians", "NT", "KJV", 52],
  ["2-thessalonians", "2 Thessalonians", "NT", "KJV", 53],
  ["1-timothy", "1 Timothy", "NT", "KJV", 54],
  ["2-timothy", "2 Timothy", "NT", "KJV", 55],
  ["titus", "Titus", "NT", "KJV", 56],
  ["philemon", "Philemon", "NT", "KJV", 57],
  ["hebrews", "Hebrews", "NT", "KJV", 58],
  ["james", "James", "NT", "KJV", 59],
  ["1-peter", "1 Peter", "NT", "KJV", 60],
  ["2-peter", "2 Peter", "NT", "KJV", 61],
  ["1-john", "1 John", "NT", "KJV", 62],
  ["2-john", "2 John", "NT", "KJV", 63],
  ["3-john", "3 John", "NT", "KJV", 64],
  ["jude", "Jude", "NT", "KJV", 65],
  ["revelation", "Revelation", "NT", "KJV", 66],
];

// Sanity assertions: (slug, chapter, expectedVerseCount)
// Brenton uses LXX numbering: "The Lord is my shepherd" lives at LXX Psalm 22, not 23.
const ASSERTIONS = [
  ["genesis", 1, 31],
  ["psalms", 22, 6],
  ["psalms", 151, null],
  ["matthew", 1, 25],
  ["john", 3, 36],
  ["tobit", 1, null],
  ["1-maccabees", 1, null],
  // Daniel. bolls.life's LXXE Daniel is the 12-chapter form with the
  // deuterocanonical sections stripped and chapter 3 renumbered so verse 24
  // follows verse 23 with no visible gap. That shipped unnoticed for months
  // because nothing here checked Daniel, until a member asked in 2026-07
  // why Bel and the Dragon was missing. Chapter 3 must carry the Prayer of
  // Azariah and the Song of the Three Holy Children (3:24-90), and the book
  // must run to 14 chapters with Susanna and Bel. If this source cannot
  // supply them, do NOT let it overwrite Daniel: use
  // scripts/fetch-daniel-additions.mjs, which reads Brenton from ebible.org.
  ["daniel", 3, 97],
  ["daniel", 13, 64],
  ["daniel", 14, 42],
];

function cleanVerse(raw) {
  return raw
    .replace(/<S>\d+<\/S>/g, "")
    .replace(/<sup>[\s\S]*?<\/sup>/g, "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/?[a-z][^>]*>/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchJson(url, attempt = 0) {
  try {
    const r = await fetch(url, { headers: { "user-agent": "purify-orthoapp/ingest" } });
    if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
    return await r.json();
  } catch (e) {
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      return fetchJson(url, attempt + 1);
    }
    throw e;
  }
}

async function getBookMeta(translation, bookId) {
  const list = await fetchJson(`${BASE}/get-books/${translation}/`);
  const b = list.find((x) => x.bookid === bookId);
  if (!b) throw new Error(`${translation} bookId ${bookId} not found`);
  return b;
}

async function pool(tasks, n) {
  const results = [];
  let i = 0;
  const workers = Array.from({ length: n }, async () => {
    while (i < tasks.length) {
      const idx = i++;
      results[idx] = await tasks[idx]();
    }
  });
  await Promise.all(workers);
  return results;
}

async function ingestBook(entry) {
  const [slug, name, testament, translation, bookId] = entry;
  const meta = await getBookMeta(translation, bookId);
  const chapters = meta.chapters;
  const bookDir = path.join(OUT_DIR, slug);
  await fs.mkdir(bookDir, { recursive: true });

  const source = translation === "LXXE" ? "brenton-lxx-pd" : "kjv-pd";

  const tasks = [];
  for (let ch = 1; ch <= chapters; ch++) {
    tasks.push(async () => {
      const raw = await fetchJson(`${BASE}/get-text/${translation}/${bookId}/${ch}/`);
      const verses = raw.map((v) => ({ n: v.verse, text: cleanVerse(v.text) }));
      const out = { book: slug, name, chapter: ch, verses, source };
      await fs.writeFile(
        path.join(bookDir, `${ch}.json`),
        JSON.stringify(out, null, 0),
      );
      return verses.length;
    });
  }
  const counts = await pool(tasks, CONCURRENCY);
  return { slug, name, testament, source, chapters, verseCounts: counts };
}

async function runAssertions(results) {
  const bySlug = Object.fromEntries(results.map((r) => [r.slug, r]));
  for (const [slug, ch, expected] of ASSERTIONS) {
    const r = bySlug[slug];
    if (!r) throw new Error(`assertion: ${slug} not ingested`);
    const count = r.verseCounts[ch - 1];
    if (count == null || count <= 0)
      throw new Error(`assertion: ${slug} ${ch} missing/empty`);
    if (expected != null && count !== expected)
      throw new Error(
        `assertion: ${slug} ${ch} expected ${expected} verses, got ${count}`,
      );
    console.log(`  ✓ ${slug} ${ch}: ${count} verses`);
  }
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  console.log(`Ingesting ${CANON.length} books → ${OUT_DIR}`);
  const results = [];
  for (const entry of CANON) {
    const start = Date.now();
    const res = await ingestBook(entry);
    const ms = Date.now() - start;
    console.log(
      `  ${res.slug.padEnd(22)} ${String(res.chapters).padStart(3)} ch  (${ms}ms)`,
    );
    results.push(res);
  }

  const books = results.map((r) => ({
    slug: r.slug,
    name: r.name,
    testament: r.testament,
    chapters: r.chapters,
    source: r.source,
  }));
  await fs.writeFile(
    path.join(OUT_DIR, "books.json"),
    JSON.stringify(books, null, 2),
  );

  const totalChapters = books.reduce((a, b) => a + b.chapters, 0);
  console.log(`\nWrote books.json: ${books.length} books, ${totalChapters} chapters total\n`);

  console.log("Running sanity assertions...");
  await runAssertions(results);
  console.log("\nDone.");
}

main().catch((e) => {
  console.error("\nIngest failed:", e);
  process.exit(1);
});
