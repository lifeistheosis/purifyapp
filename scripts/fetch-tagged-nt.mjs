// Downloads the Robinson-Pierpont Byzantine Majority Text NT
// (csv-unicode/strongs/with-parsing) and writes per-chapter JSON
// with both the verse text AND a tokens array linking each Greek word
// to a Strong's number + parse code.
//
// Also slims the Open Scriptures Strong's Greek dictionary to a tight
// lexicon JSON (lemma + translit + short gloss) at lib/bible/strongs-greek.json.
//
// Usage: node scripts/fetch-tagged-nt.mjs

import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import https from "node:https";

const ROOT = process.cwd();
const TMP = path.join(ROOT, ".tmp");
const OUT = path.join(ROOT, "data", "bible", "original");
const LEXICON_OUT = path.join(ROOT, "lib", "bible", "strongs-greek.json");

// BMT uses different USFM-ish codes than ebible's Stephanus.
const NT_CODE_TO_SLUG = {
  MAT: "matthew", MAR: "mark", LUK: "luke", JOH: "john", ACT: "acts",
  ROM: "romans", "1CO": "1-corinthians", "2CO": "2-corinthians",
  GAL: "galatians", EPH: "ephesians", PHP: "philippians", COL: "colossians",
  "1TH": "1-thessalonians", "2TH": "2-thessalonians",
  "1TI": "1-timothy", "2TI": "2-timothy",
  TIT: "titus", PHM: "philemon", HEB: "hebrews", JAM: "james",
  "1PE": "1-peter", "2PE": "2-peter",
  "1JO": "1-john", "2JO": "2-john", "3JO": "3-john",
  JUD: "jude", REV: "revelation",
};

const BMT_BASE =
  "https://raw.githubusercontent.com/byztxt/byzantine-majority-text/master/csv-unicode/strongs/with-parsing";
const STRONGS_URL =
  "https://raw.githubusercontent.com/openscriptures/strongs/master/greek/strongs-greek-dictionary.js";

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (
          [301, 302, 303, 307, 308].includes(res.statusCode) &&
          res.headers.location
        ) {
          return get(res.headers.location).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode}: ${url}`));
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      })
      .on("error", reject);
  });
}

// Parse BMT verse text:
//   "εν 1722 {PREP} αρχη 746 {N-DSF} ην 1510 {V-IAI-3S} ..."
// into [{ w: "εν", s: "1722", p: "PREP" }, ...]
function parseTokens(text) {
  const tokens = [];
  const re = /(\S+)\s+(\d+)\s+\{([^}]+)\}/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    tokens.push({ w: m[1], s: m[2], p: m[3] });
  }
  return tokens;
}

async function buildNT() {
  await fs.mkdir(TMP, { recursive: true });
  let total = 0;
  for (const [code, slug] of Object.entries(NT_CODE_TO_SLUG)) {
    const url = `${BMT_BASE}/${code}.csv`;
    let csv;
    try {
      csv = await get(url);
    } catch (e) {
      console.warn(`NT skip ${code}: ${e.message}`);
      continue;
    }
    // Group rows by chapter
    const byChapter = new Map();
    const lines = csv.split(/\r?\n/);
    // First line is header: chapter,verse,text
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      // Split CSV: first comma = chapter; second comma = verse; rest = text
      const c1 = line.indexOf(",");
      const c2 = line.indexOf(",", c1 + 1);
      if (c1 < 0 || c2 < 0) continue;
      const chapter = parseInt(line.slice(0, c1), 10);
      const verse = parseInt(line.slice(c1 + 1, c2), 10);
      const text = line.slice(c2 + 1);
      if (!Number.isInteger(chapter) || !Number.isInteger(verse)) continue;
      if (!byChapter.has(chapter)) byChapter.set(chapter, []);
      const tokens = parseTokens(text);
      const verseText = tokens.map((t) => t.w).join(" ");
      byChapter.get(chapter).push({ n: verse, text: verseText, tokens });
    }
    // Write per-chapter
    for (const [chapter, verses] of byChapter) {
      const dir = path.join(OUT, slug);
      await fs.mkdir(dir, { recursive: true });
      const payload = {
        book: slug,
        name: titleCase(slug),
        chapter,
        verses,
        source:
          "Robinson-Pierpont Byzantine Majority Text (Textus Receptus tradition) with Strong's numbers and morphology. Public domain.",
      };
      await fs.writeFile(
        path.join(dir, `${chapter}.json`),
        JSON.stringify(payload),
        "utf8",
      );
      total++;
    }
    console.log(`NT ${code} → ${slug}: ${byChapter.size} chapters`);
  }
  return total;
}

// Slim the Strong's Greek lexicon — keep only what the popover renders.
async function buildLexicon() {
  const js = await get(STRONGS_URL);
  // The file ends with: `}; module.exports = strongsGreekDictionary;`
  // and starts with: `var strongsGreekDictionary = {`
  // Slice out just the object literal between those.
  const declIdx = js.indexOf("var strongsGreekDictionary");
  if (declIdx < 0) throw new Error("Lexicon declaration not found");
  const openIdx = js.indexOf("{", declIdx);
  let depth = 0;
  let i = openIdx;
  for (; i < js.length; i++) {
    if (js[i] === "{") depth++;
    else if (js[i] === "}") {
      depth--;
      if (depth === 0) break;
    }
  }
  if (depth !== 0) throw new Error("Unbalanced braces in lexicon");
  const objSrc = js.slice(openIdx, i + 1);
  // eslint-disable-next-line no-eval
  const raw = eval("(" + objSrc + ")");
  const slim = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!k.startsWith("G")) continue;
    const lemma = v.lemma || "";
    const translit = v.translit || "";
    // Prefer the short Strong's def; fall back to the kjv_def which is
    // a comma-separated list of English glosses.
    const def = (v.strongs_def || v.kjv_def || "").trim().replace(/^[\s,]+/, "");
    slim[k] = { l: lemma, t: translit, d: def };
  }
  await fs.writeFile(LEXICON_OUT, JSON.stringify(slim), "utf8");
  const sz = (await fs.stat(LEXICON_OUT)).size;
  console.log(`lexicon: ${Object.keys(slim).length} entries, ${Math.round(sz / 1024)} KB`);
}

function titleCase(slug) {
  return slug
    .split("-")
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(" ");
}

(async () => {
  const nt = await buildNT();
  console.log(`NT chapters written: ${nt}`);
  await buildLexicon();
})();
