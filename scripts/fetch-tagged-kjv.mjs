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
// Usage: node scripts/fetch-tagged-kjv.mjs

import fs from "node:fs/promises";
import path from "node:path";
import https from "node:https";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "data", "bible", "english-tagged");

// kaiserlik code -> our slug. Their files: 1Co.json, Joh.json, etc.
const NT = {
  Mat: "matthew", Mar: "mark", Luk: "luke", Jhn: "john", Act: "acts",
  Rom: "romans", "1Co": "1-corinthians", "2Co": "2-corinthians",
  Gal: "galatians", Eph: "ephesians", Php: "philippians", Col: "colossians",
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
// Removes the directional-arrow glyph and any extra italics markers.
function parseVerse(en) {
  // Strip helper marks the source uses (➔ marks word-order swaps; we ignore).
  const text = en.replace(/➔/g, " ").replace(/\s+/g, " ").trim();
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
  return out;
}

// Some kaiserlik files have escape-sequence errors in the bg/ch/sp fields
// that make JSON.parse choke. We only need the `en` field, so we extract
// each verse's English directly via regex on the raw text.
function extractEnglish(raw) {
  const re =
    /"([A-Za-z0-9]+)\|(\d+)\|(\d+)"\s*:\s*\{[^{}]*?"en"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  const out = new Map(); // chapter -> [{ n, en }]
  let m;
  while ((m = re.exec(raw)) !== null) {
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

async function buildNT() {
  let total = 0;
  for (const [code, slug] of Object.entries(NT)) {
    let raw;
    try {
      raw = await get(`${BASE}/${code}.json`);
    } catch (e) {
      console.warn(`NT skip ${code}: ${e.message}`);
      continue;
    }
    const byChapter = new Map();
    for (const [chapter, vs] of extractEnglish(raw)) {
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

(async () => {
  const n = await buildNT();
  console.log(`English tagged chapters written: ${n}`);
})();
