// Downloads KJV-with-Strong's-numbers per word from kaiserlik/kjv (PD)
// and writes per-chapter English-token JSON to:
//   data/bible/english-tagged/{nt-slug}/{chapter}.json
//
// Token shape:
//   { w: "Paul,", s?: "3972" }
//
// Multiple consecutive English words can share the same Strong's number
// when one Greek word maps to a phrase (e.g. "to be an apostle" -> G652).
//
// Usage: node scripts/fetch-tagged-kjv.mjs [--only <code>]
//   --only Phm   fetch and write that one book (their code), nothing else

import fs from "node:fs/promises";
import path from "node:path";
import https from "node:https";
import {
  patchAllEnglishStrongs,
  findLowCoverageChapters,
} from "./patch-english-strongs.mjs";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "data", "bible", "english-tagged");

// kaiserlik code -> our slug. Their files: 1Co.json, Joh.json, etc.
const NT = {
  Mat: "matthew", Mar: "mark", Luk: "luke", Jhn: "john", Act: "acts",
  Rom: "romans", "1Co": "1-corinthians", "2Co": "2-corinthians",
  // Philippians is "Phl" there, file and keys alike; asked for as "Php" it
  // was never fetched, and the app had no English tags for it until 1.9.
  Gal: "galatians", Eph: "ephesians", Phl: "philippians", Col: "colossians",
  "1Th": "1-thessalonians", "2Th": "2-thessalonians",
  "1Ti": "1-timothy", "2Ti": "2-timothy",
  Tit: "titus", Phm: "philemon", Heb: "hebrews", Jas: "james",
  "1Pe": "1-peter", "2Pe": "2-peter",
  "1Jo": "1-john", "2Jo": "2-john", "3Jo": "3-john",
  Jde: "jude", Rev: "revelation",
};

const BASE = "https://raw.githubusercontent.com/kaiserlik/kjv/master";

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (
          [301, 302, 303, 307, 308].includes(res.statusCode) &&
          res.headers.location
        )
          return get(res.headers.location).then(resolve).catch(reject);
        if (res.statusCode !== 200)
          return reject(new Error(`HTTP ${res.statusCode}: ${url}`));
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      })
      .on("error", reject);
  });
}

// Parse a KJV verse string like:
//   "Paul,[G3972] called[G2822] to be an apostle[G652] of Jesus[G2424]"
// into:
//   [ {w:"Paul,",s:"3972"}, {w:"called",s:"2822"}, {w:"to",s:"652"},
//     {w:"be",s:"652"}, {w:"an",s:"652"}, {w:"apostle",s:"652"},
//     {w:"of",s:"2424"}, {w:"Jesus",s:"2424"}, ... ]
//
// Words that don't precede any [G####] marker get no `s` (untagged).
// Strips italic markers (<em>/</em>) the source uses for KJV supplied words,
// the directional-arrow glyph, and any stray Strong's-bracket fragments.
function parseVerse(en) {
  const text = en
    // Strip helper marks the source uses (➔ marks word-order swaps; we ignore).
    .replace(/➔/g, " ")
    // Strip KJV-supplied-word italics. Both whole-token (<em>of</em>) and
    // split-token (<em>the ... son</em>) cases are handled because we strip
    // the substrings before tokenizing.
    .replace(/<\/?em>/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const out = [];
  // Match: any non-bracket run, optionally followed by [G####].
  const re = /([^\[]+?)\s*\[G(\d+)\]/g;
  let lastEnd = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    const phrase = m[1].trim();
    const strongs = m[2];
    if (phrase) {
      for (const w of phrase.split(/\s+/)) out.push({ w, s: strongs });
    }
    lastEnd = re.lastIndex;
  }
  const trail = text.slice(lastEnd).trim();
  if (trail) {
    for (const w of trail.split(/\s+/)) out.push({ w });
  }
  return cleanTokens(out);
}

// Post-process tokens to drop ingestion artifacts that can survive the
// bracket-tokenizer when the upstream source has malformed Strong's markers
// (mid-text `]` without matching `[`) or stray angle brackets.
function cleanTokens(tokens) {
  const out = [];
  for (const t of tokens) {
    let w = (t.w ?? "").trim();
    // Drop residual Strong's-bracket fragments like "G3756]" or "[G3756".
    w = w.replace(/\[G\d+\]?/g, "").replace(/G\d+\]/g, "");
    // Drop any residual angle brackets (extra safety in case <em> stripping above missed something).
    w = w.replace(/<\/?[a-zA-Z][^>]*>/g, "").replace(/[<>]/g, "");
    w = w.trim();
    if (!w) continue;
    out.push(t.s ? { w, s: t.s } : { w });
  }
  return out;
}

// Some kaiserlik files have escape-sequence errors in the bg/ch/sp fields
// that make JSON.parse choke. We only need the `en` field, so we extract
// each verse's English directly via regex on the raw text.
//
// A file can hold another book's verses as well as its own: theirs for
// Philemon, Phm.json, carries all of Philippians under the key "Phl" after
// Philemon's 25 verses, which is how Philemon's English came to read
// Philippians (lib/bible/interlinearBooks.ts). So only the verses keyed with
// the file's own code are read, or, where the file holds one code alone, that
// one; a file with several codes and none its own stops the ingest.
function extractEnglish(raw, code) {
  const re =
    /"([A-Za-z0-9]+)\|(\d+)\|(\d+)"\s*:\s*\{[^{}]*?"en"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  const codes = new Set([...raw.matchAll(/"([A-Za-z0-9]+)\|\d+\|\d+"\s*:/g)].map((k) => k[1]));
  const own = codes.has(code) ? code : codes.size === 1 ? [...codes][0] : null;
  if (!own) throw new Error(`${code}.json holds ${[...codes].join(", ")} and not ${code}`);
  const out = new Map(); // chapter -> [{ n, en }]
  let m;
  while ((m = re.exec(raw)) !== null) {
    if (m[1] !== own) continue;
    const chapter = parseInt(m[2], 10);
    const verse = parseInt(m[3], 10);
    // Unescape JSON-style backslash sequences.
    const en = m[4]
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\")
      .replace(/\\\//g, "/");
    if (!out.has(chapter)) out.set(chapter, []);
    out.get(chapter).push({ n: verse, en });
  }
  return out;
}

/** `--only <code>`: one book, as when Philemon was written again (1.9). */
const ONLY = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;
if (ONLY && !(ONLY in NT)) throw new Error(`--only ${ONLY}: not one of ${Object.keys(NT).join(", ")}`);

async function buildNT() {
  let total = 0;
  for (const [code, slug] of Object.entries(NT)) {
    if (ONLY && code !== ONLY) continue;
    let raw;
    try {
      raw = await get(`${BASE}/${code}.json`);
    } catch (e) {
      console.warn(`NT skip ${code}: ${e.message}`);
      continue;
    }
    const byChapter = new Map();
    for (const [chapter, vs] of extractEnglish(raw, code)) {
      const list = vs
        .map(({ n, en }) => ({ n, tokens: parseVerse(en) }))
        .filter((v) => v.tokens.length > 0);
      byChapter.set(chapter, list);
    }
    for (const [chapter, verses] of byChapter) {
      const dir = path.join(OUT, slug);
      await fs.mkdir(dir, { recursive: true });
      const payload = { book: slug, chapter, verses };
      await fs.writeFile(
        path.join(dir, `${chapter}.json`),
        JSON.stringify(payload),
        "utf8",
      );
      total++;
    }
    console.log(`KJV ${code} -> ${slug}: ${byChapter.size} chapters`);
  }
  return total;
}

// Sanity-check every written file. Fails loudly if any token still carries
// an ingestion artifact, so the next ingest can't silently regress.
async function assertCleanOutput() {
  const stack = [OUT];
  const bad = [];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        stack.push(full);
      } else if (e.name.endsWith(".json")) {
        const raw = await fs.readFile(full, "utf8");
        const data = JSON.parse(raw);
        for (const v of data.verses ?? []) {
          for (const t of v.tokens ?? []) {
            const w = t.w ?? "";
            if (/[<>]/.test(w) || /^G\d+\]/.test(w) || /\[G\d+/.test(w)) {
              bad.push(`${full} v${v.n}: ${JSON.stringify(t)}`);
            }
          }
        }
      }
    }
  }
  if (bad.length > 0) {
    console.error(
      `Sanity check failed: ${bad.length} dirty token(s) survived the ingest.`,
    );
    for (const line of bad.slice(0, 20)) console.error("  " + line);
    if (bad.length > 20) console.error(`  ...and ${bad.length - 20} more`);
    process.exit(1);
  }
  console.log(`Sanity check passed: no <em>, no G####] fragments.`);
}

(async () => {
  const n = await buildNT();
  console.log(`English tagged chapters written: ${n}`);
  await assertCleanOutput();

  // Recovery pass: back-fill Strong's numbers that the upstream source
  // dropped on trailing words of many verses. Idempotent; no-op when
  // already patched.
  const { total } = await patchAllEnglishStrongs();
  console.log(`Recovery: ${total} tokens patched.`);

  // Coverage guard: fail loudly if any chapter has > 15% untagged
  // content tokens after recovery.
  const flagged = await findLowCoverageChapters(0.15);
  if (flagged.length > 0) {
    console.error(
      `Coverage check failed: ${flagged.length} chapter(s) above the 15% untagged-content-token threshold.`,
    );
    for (const f of flagged.slice(0, 20)) {
      console.error(
        `  ${f.book} ${f.chapter}: ${f.untagged}/${f.content} (${(f.ratio * 100).toFixed(1)}%)`,
      );
    }
    process.exit(1);
  }
  console.log("Coverage check passed: every NT chapter <= 15% untagged content.");
})();
