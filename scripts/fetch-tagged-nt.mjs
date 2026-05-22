// Downloads the Nestle 1904 Greek New Testament (polytonic Unicode,
// with Strong's numbers and morphology codes) from biblicalhumanities
// and writes per-chapter JSON with the verse text plus a tokens array
// linking each Greek word to a Strong's number + parse code.
//
// Switched from Robinson-Pierpont (csv-unicode, stripped/monotonic)
// to Nestle 1904 because the user wants proper Koine polytonic
// accents (smooth/rough breathings, circumflex, iota subscript).
//
// Also slims the Open Scriptures Strong's Greek dictionary to a tight
// lexicon JSON (lemma + translit + short gloss) at lib/bible/strongs-greek.json.
//
// Usage: node scripts/fetch-tagged-nt.mjs

import fs from "node:fs/promises";
import path from "node:path";
import https from "node:https";

const ROOT = process.cwd();
const TMP = path.join(ROOT, ".tmp");
const OUT = path.join(ROOT, "data", "bible", "original");
const LEXICON_OUT = path.join(ROOT, "lib", "bible", "strongs-greek.json");

// Nestle 1904 uses these book codes in the BCV column (e.g. "Matt 1:1").
const NT_CODE_TO_SLUG = {
  Matt: "matthew", Mark: "mark", Luke: "luke", John: "john", Acts: "acts",
  Rom: "romans", "1Cor": "1-corinthians", "2Cor": "2-corinthians",
  Gal: "galatians", Eph: "ephesians", Phil: "philippians", Col: "colossians",
  "1Thess": "1-thessalonians", "2Thess": "2-thessalonians",
  "1Tim": "1-timothy", "2Tim": "2-timothy",
  Titus: "titus", Phlm: "philemon", Heb: "hebrews", Jas: "james",
  "1Pet": "1-peter", "2Pet": "2-peter",
  "1John": "1-john", "2John": "2-john", "3John": "3-john",
  Jude: "jude", Rev: "revelation",
};

const N1904_URL =
  "https://raw.githubusercontent.com/biblicalhumanities/Nestle1904/master/morph/Nestle1904.csv";
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

// Strip BOM and split a TSV line into fields.
function tsvFields(line) {
  return line.replace(/^﻿/, "").split("\t");
}

async function buildNT() {
  await fs.mkdir(TMP, { recursive: true });
  const csv = await get(N1904_URL);
  const lines = csv.split(/\r?\n/);
  // Header: BCV  text  func_morph  form_morph  strongs  lemma  normalized
  // Group by book → chapter → verse → token list
  // Map: slug -> Map<chapter, Map<verse, tokens[]>>
  const byBook = new Map();
  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim()) continue;
    const f = tsvFields(raw);
    if (f.length < 7) continue;
    const bcv = f[0]; // e.g. "Matt 1:1"
    const surfaceText = f[1]; // e.g. "Βίβλος" or "εἶπεν,"
    const formMorph = f[3]; // e.g. "N-NSF"
    const strongsRaw = f[4]; // e.g. "976" or "3004&5627"
    const normalized = (f[6] || surfaceText).trim();
    const sp = bcv.lastIndexOf(" ");
    if (sp < 0) continue;
    const code = bcv.slice(0, sp);
    const cv = bcv.slice(sp + 1).split(":");
    if (cv.length !== 2) continue;
    const chapter = parseInt(cv[0], 10);
    const verse = parseInt(cv[1], 10);
    if (!Number.isInteger(chapter) || !Number.isInteger(verse)) continue;
    const slug = NT_CODE_TO_SLUG[code];
    if (!slug) continue;
    // Strong's may have an ampersand-joined pair; keep the primary.
    const strongs = (strongsRaw || "").split("&")[0].trim();
    const token = {
      w: normalized || surfaceText.replace(/[\s,.;·:]+$/u, ""),
      s: strongs,
      p: formMorph,
    };
    if (!byBook.has(slug)) byBook.set(slug, new Map());
    const ch = byBook.get(slug);
    if (!ch.has(chapter)) ch.set(chapter, new Map());
    const vs = ch.get(chapter);
    if (!vs.has(verse)) vs.set(verse, { tokens: [], surfaces: [] });
    const bucket = vs.get(verse);
    bucket.tokens.push(token);
    bucket.surfaces.push(surfaceText);
  }
  let total = 0;
  for (const [slug, chapters] of byBook) {
    for (const [chapter, verses] of chapters) {
      const versesArr = [...verses.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([n, { tokens, surfaces }]) => ({
          n,
          text: surfaces.join(" "),
          tokens,
        }));
      const dir = path.join(OUT, slug);
      await fs.mkdir(dir, { recursive: true });
      const payload = {
        book: slug,
        name: titleCase(slug),
        chapter,
        verses: versesArr,
        source:
          "Nestle 1904 Greek New Testament (polytonic) with Strong's numbers and Robinson morphology. Public domain.",
      };
      await fs.writeFile(
        path.join(dir, `${chapter}.json`),
        JSON.stringify(payload),
        "utf8",
      );
      total++;
    }
    console.log(`NT ${slug}: ${chapters.size} chapters`);
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
