// Patch missing Strong's numbers on the English NT tokens.
//
// The upstream kaiserlik/kjv source has gaps: the closing word of many
// verses (Matthew 1:1 "Abraham." was the canonical case) ships without
// a [G####] bracket, so our parser correctly drops the Strong's tag.
// The Greek side is authoritative, the matching code (Strong's +
// occurrence-index) is correct; the data is what's incomplete.
//
// Recovery is per-chapter and conservative:
//
//   1. Build Map<normalizedWord, Map<strongs, count>> from every token
//      in the chapter that already has `s`.
//   2. For each token *without* `s`, look up the normalized form.
//      Apply the Strong's only when the mapping is unambiguous in the
//      chapter (one Strong's, OR one Strong's >= 90% of >= 3 obs).
//   3. Second pass: for any *capitalized* untagged token still missing,
//      consult an NT-wide map (handles short books like 2/3 John,
//      Philemon, Jude).
//
// English connectors ("of", "the", "and", ...) are skipped — they
// recur with too many different Strong's to disambiguate from form alone.
//
// Idempotent: a second run is a no-op. Re-run after every
// fetch-tagged-kjv.mjs to keep the data clean.
//
// Usage:
//   node scripts/patch-english-strongs.mjs            (patch + report)
//   node scripts/patch-english-strongs.mjs --dry-run  (report only)

import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const ENGLISH_TAGGED_DIR = path.join(ROOT, "data", "bible", "english-tagged");

// NT book slugs (English-tagged side does not ship the OT).
const NT_BOOKS = [
  "matthew", "mark", "luke", "john", "acts",
  "romans", "1-corinthians", "2-corinthians",
  "galatians", "ephesians", "philippians", "colossians",
  "1-thessalonians", "2-thessalonians",
  "1-timothy", "2-timothy", "titus", "philemon", "hebrews", "james",
  "1-peter", "2-peter",
  "1-john", "2-john", "3-john",
  "jude", "revelation",
];

// English connectors and high-ambiguity short words. These recur with
// many distinct Strong's numbers (each translates a different Greek
// genitive/article/conjunction); back-filling them by surface form
// would introduce false matches in the interlinear.
const STOPWORDS = new Set([
  "a", "an", "the",
  "of", "in", "on", "to", "for", "with", "by", "at", "from", "into", "unto", "upon", "out", "up", "down", "over", "under",
  "and", "but", "or", "nor", "so", "yet", "if", "as", "than", "though", "because", "while", "until", "when", "where", "after", "before",
  "that", "this", "these", "those", "which", "who", "whom", "whose", "what",
  "is", "was", "were", "are", "be", "been", "being", "am",
  "will", "shall", "would", "should", "can", "may", "might", "must",
  "not", "no", "yes",
  "his", "her", "their", "our", "my", "thy", "your", "its",
  "he", "she", "it", "we", "they", "i", "you", "thou", "thee", "ye",
  "me", "him", "us", "them",
  "also", "even", "all", "any", "some", "every", "each",
  "do", "did", "done", "have", "has", "had",
  "very", "much", "more", "most", "such", "same",
  "lo", "behold", "yea", "verily", "indeed",
]);

// Strip leading/trailing punctuation, lowercase. Keep the inner word
// intact (e.g. "Abraham." → "abraham", "Babylon:" → "babylon").
function normalize(word) {
  return (word ?? "")
    .toLowerCase()
    .replace(/[‘’“”]/g, "")
    .replace(/^[\s.,;:!?"'()\-\[\]]+/, "")
    .replace(/[\s.,;:!?"'()\-\[\]]+$/, "")
    .trim();
}

function isCapitalizedSurface(word) {
  const m = (word ?? "").match(/[A-Za-z]/);
  return !!m && m[0] === m[0].toUpperCase();
}

// Build Map<norm, Map<strongs, count>> from a list of tokens.
function buildWordMap(tokens) {
  const map = new Map();
  for (const t of tokens) {
    if (!t.s) continue;
    const n = normalize(t.w);
    if (!n) continue;
    if (!map.has(n)) map.set(n, new Map());
    const inner = map.get(n);
    inner.set(t.s, (inner.get(t.s) ?? 0) + 1);
  }
  return map;
}

// Resolve unambiguous Strong's for a normalized word in a map. Returns
// the Strong's string, or null if ambiguous / unknown.
function unambiguousStrong(wordMap, norm) {
  if (!wordMap.has(norm)) return null;
  const inner = wordMap.get(norm);
  const entries = [...inner.entries()];
  if (entries.length === 0) return null;
  if (entries.length === 1) return entries[0][0];
  // Multiple Strong's seen. Apply the 90% / >= 3 rule.
  const total = entries.reduce((s, [, n]) => s + n, 0);
  if (total < 3) return null;
  entries.sort((a, b) => b[1] - a[1]);
  const top = entries[0];
  if (top[1] / total >= 0.9) return top[0];
  return null;
}

async function readChapter(book, chapter) {
  const file = path.join(ENGLISH_TAGGED_DIR, book, `${chapter}.json`);
  const raw = await fs.readFile(file, "utf8");
  return { file, data: JSON.parse(raw) };
}

async function listChapters(book) {
  const dir = path.join(ENGLISH_TAGGED_DIR, book);
  const entries = await fs.readdir(dir);
  return entries
    .filter((e) => e.endsWith(".json"))
    .map((e) => parseInt(e.slice(0, -5), 10))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
}

// Patch a single token list in place using the given chapter + NT maps.
// Returns the number of patches applied.
function patchTokens(tokens, chapterMap, ntMap) {
  let patched = 0;
  for (const t of tokens) {
    if (t.s) continue;
    const n = normalize(t.w);
    if (!n || STOPWORDS.has(n)) continue;
    // Chapter map first.
    let s = unambiguousStrong(chapterMap, n);
    // NT-wide fallback for capitalized proper nouns.
    if (!s && isCapitalizedSurface(t.w)) {
      s = unambiguousStrong(ntMap, n);
    }
    if (s) {
      t.s = s;
      patched++;
    }
  }
  return patched;
}

// Patch every NT chapter under ENGLISH_TAGGED_DIR. Exported so
// fetch-tagged-kjv.mjs can invoke it after a fresh fetch.
//
// Returns a summary { byBook, total, untaggedContentByBook }.
export async function patchAllEnglishStrongs({ dryRun = false } = {}) {
  // Pass 1: build NT-wide word map from all already-tagged tokens.
  const ntMap = new Map();
  const chapterCache = new Map(); // `${book}/${chapter}` -> {file, data, chapterMap}

  for (const book of NT_BOOKS) {
    let chapters;
    try {
      chapters = await listChapters(book);
    } catch {
      continue;
    }
    for (const chapter of chapters) {
      const { file, data } = await readChapter(book, chapter);
      const allTokens = data.verses.flatMap((v) => v.tokens);
      const chapterMap = buildWordMap(allTokens);
      chapterCache.set(`${book}/${chapter}`, { file, data, chapterMap });
      // Merge into NT-wide map.
      for (const [n, inner] of chapterMap) {
        if (!ntMap.has(n)) ntMap.set(n, new Map());
        const outer = ntMap.get(n);
        for (const [s, c] of inner) {
          outer.set(s, (outer.get(s) ?? 0) + c);
        }
      }
    }
  }

  // Pass 2: patch each chapter.
  const byBook = new Map();
  const untaggedContentByBook = new Map();
  let total = 0;

  for (const [key, entry] of chapterCache) {
    const [book] = key.split("/");
    const { file, data, chapterMap } = entry;
    let patchedHere = 0;
    let untaggedContent = 0;

    for (const v of data.verses) {
      patchedHere += patchTokens(v.tokens, chapterMap, ntMap);
      // Count remaining untagged content tokens (alphabetic, > 2 chars,
      // not a stopword).
      for (const t of v.tokens) {
        if (t.s) continue;
        const n = normalize(t.w);
        if (n.length > 2 && /^[a-z]+$/.test(n) && !STOPWORDS.has(n)) {
          untaggedContent++;
        }
      }
    }

    if (patchedHere > 0 && !dryRun) {
      await fs.writeFile(file, JSON.stringify(data), "utf8");
    }
    total += patchedHere;
    byBook.set(book, (byBook.get(book) ?? 0) + patchedHere);
    untaggedContentByBook.set(
      book,
      (untaggedContentByBook.get(book) ?? 0) + untaggedContent,
    );
  }

  return { byBook, total, untaggedContentByBook, chapterCount: chapterCache.size };
}

// Coverage check: returns the list of chapters where untagged content
// tokens exceed `threshold` (fraction of total content tokens). Used
// by the build-time sanity check in fetch-tagged-kjv.mjs.
export async function findLowCoverageChapters(threshold = 0.15) {
  const flagged = [];
  for (const book of NT_BOOKS) {
    let chapters;
    try {
      chapters = await listChapters(book);
    } catch {
      continue;
    }
    for (const chapter of chapters) {
      const { data } = await readChapter(book, chapter);
      let content = 0;
      let untagged = 0;
      for (const v of data.verses) {
        for (const t of v.tokens) {
          const n = normalize(t.w);
          if (n.length > 2 && /^[a-z]+$/.test(n) && !STOPWORDS.has(n)) {
            content++;
            if (!t.s) untagged++;
          }
        }
      }
      if (content > 0 && untagged / content > threshold) {
        flagged.push({ book, chapter, untagged, content, ratio: untagged / content });
      }
    }
  }
  return flagged;
}

// CLI entry point.
const isDirect = import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}`
  || process.argv[1].endsWith("patch-english-strongs.mjs");

if (isDirect) {
  const dryRun = process.argv.includes("--dry-run");
  const { byBook, total, untaggedContentByBook, chapterCount } =
    await patchAllEnglishStrongs({ dryRun });
  console.log(
    dryRun
      ? `Dry run. Would have patched ${total} tokens across ${chapterCount} chapters.`
      : `Patched ${total} tokens across ${chapterCount} chapters.`,
  );
  console.log("\nPer book:");
  for (const book of NT_BOOKS) {
    const patched = byBook.get(book) ?? 0;
    const remaining = untaggedContentByBook.get(book) ?? 0;
    console.log(
      `  ${book.padEnd(20)} +${String(patched).padStart(5)} patched · ${String(remaining).padStart(4)} untagged content tokens remaining`,
    );
  }
  const flagged = await findLowCoverageChapters(0.15);
  if (flagged.length > 0) {
    console.log(
      `\nWarning: ${flagged.length} chapter(s) have > 15% untagged content tokens:`,
    );
    for (const f of flagged.slice(0, 10)) {
      console.log(
        `  ${f.book} ${f.chapter}: ${f.untagged}/${f.content} (${(f.ratio * 100).toFixed(1)}%)`,
      );
    }
    if (flagged.length > 10) {
      console.log(`  ...and ${flagged.length - 10} more`);
    }
  } else {
    console.log("\nAll NT chapters have <= 15% untagged content tokens.");
  }
}
