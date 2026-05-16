// Downloads PD Greek NT (Stephanus 1550) + Greek LXX from ebible.org,
// parses into per-chapter JSON matching our existing English shape, and
// writes them to data/bible/original/{book-slug}/{chapter}.json.
//
// Usage:  node scripts/fetch-original.mjs
//
// One-off. Re-runnable; overwrites existing original files.

import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import https from "node:https";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const TMP = path.join(ROOT, ".tmp");
const OUT = path.join(ROOT, "data", "bible", "original");

const SOURCES = {
  nt: {
    url: "https://ebible.org/Scriptures/grcsr_readaloud.zip",
    zip: path.join(TMP, "grcsr.zip"),
    dir: path.join(TMP, "grcsr"),
  },
  ot: {
    url: "https://ebible.org/Scriptures/grclxx_usfm.zip",
    zip: path.join(TMP, "grclxx.zip"),
    dir: path.join(TMP, "grclxx"),
  },
};

// USFM/Paratext code -> our book slug.
const NT_CODE_TO_SLUG = {
  MAT: "matthew", MRK: "mark", LUK: "luke", JHN: "john", ACT: "acts",
  ROM: "romans", "1CO": "1-corinthians", "2CO": "2-corinthians",
  GAL: "galatians", EPH: "ephesians", PHP: "philippians", COL: "colossians",
  "1TH": "1-thessalonians", "2TH": "2-thessalonians",
  "1TI": "1-timothy", "2TI": "2-timothy",
  TIT: "titus", PHM: "philemon", HEB: "hebrews", JAS: "james",
  "1PE": "1-peter", "2PE": "2-peter",
  "1JN": "1-john", "2JN": "2-john", "3JN": "3-john",
  JUD: "jude", REV: "revelation",
};

const OT_CODE_TO_SLUG = {
  GEN: "genesis", EXO: "exodus", LEV: "leviticus", NUM: "numbers",
  DEU: "deuteronomy", JOS: "joshua", JDG: "judges", RUT: "ruth",
  "1SA": "1-samuel", "2SA": "2-samuel", "1KI": "1-kings", "2KI": "2-kings",
  "1CH": "1-chronicles", "2CH": "2-chronicles",
  NEH: "nehemiah", JOB: "job", PSA: "psalms", PRO: "proverbs",
  ECC: "ecclesiastes", SNG: "song-of-solomon",
  ISA: "isaiah", JER: "jeremiah", LAM: "lamentations", EZK: "ezekiel",
  HOS: "hosea", JOL: "joel", AMO: "amos", OBA: "obadiah",
  JON: "jonah", MIC: "micah", NAM: "nahum", HAB: "habakkuk",
  ZEP: "zephaniah", HAG: "haggai", ZEC: "zechariah", MAL: "malachi",
  TOB: "tobit", JDT: "judith",
  WIS: "wisdom", SIR: "sirach", BAR: "baruch", LJE: "epistle-of-jeremiah",
  "1MA": "1-maccabees", "2MA": "2-maccabees", "3MA": "3-maccabees",
  "1ES": "1-esdras",
  DAG: "daniel",
};

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fssync.createWriteStream(dest);
    https
      .get(url, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
          file.close();
          fssync.unlinkSync(dest);
          return download(res.headers.location, dest).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          file.close();
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
        res.pipe(file);
        file.on("finish", () => file.close(() => resolve()));
      })
      .on("error", reject);
  });
}

async function ensureSources() {
  await fs.mkdir(TMP, { recursive: true });
  for (const [name, s] of Object.entries(SOURCES)) {
    if (!fssync.existsSync(s.zip)) {
      console.log(`downloading ${name}...`);
      await download(s.url, s.zip);
    }
    await fs.mkdir(s.dir, { recursive: true });
    // Empty + extract
    for (const f of await fs.readdir(s.dir)) {
      await fs.unlink(path.join(s.dir, f)).catch(() => {});
    }
    execSync(`cd "${s.dir}" && unzip -q "${s.zip}"`);
  }
}

// --- Parsers ---

// Stephanus _read.txt:
//   line 1: title
//   line 2: chapter number "1."
//   lines 3..N: one verse per non-blank line, in canonical order
function parseStephanusChapter(text) {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  const verses = [];
  let started = false;
  let chapter = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!started) {
      if (/^\d+\.?$/.test(line)) {
        chapter = parseInt(line, 10);
        started = true;
      }
      continue;
    }
    if (!line) continue;
    // Strip editorial markers ⸀ ⸋ ⸌ ⸂ ⸃ ⸉ ⸊ ⸆ which are textual-criticism marginalia
    // and don't belong in the running text.
    const clean = line.replace(/[⸀-⹿]/g, "").replace(/\s+/g, " ").trim();
    verses.push({ n: verses.length + 1, text: clean });
  }
  return { chapter, verses };
}

// LXX USFM:
//   \id GEN
//   \c 1
//   \p
//   \v 1 ΕΝ ἀρχῇ...
//   \v 2 ...
function parseUsfm(text) {
  const chapters = {}; // { 1: [{ n, text }], 2: [...] }
  let curChap = null;
  let curVerse = null;
  let buffer = "";

  function flushVerse() {
    if (curChap == null || curVerse == null) {
      buffer = "";
      return;
    }
    // Strip nested markers like \p, \q, \add, \nd etc.
    const clean = buffer
      .replace(/\\add\*?|\\nd\*?|\\wj\*?|\\bk\*?|\\f .*?\\f\*/g, "")
      .replace(/\\[a-z0-9]+\*?/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    chapters[curChap].push({ n: curVerse, text: clean });
    buffer = "";
  }

  const lines = text.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith("\\c ")) {
      flushVerse();
      curChap = parseInt(line.slice(3).trim(), 10);
      curVerse = null;
      chapters[curChap] = [];
      continue;
    }
    if (line.startsWith("\\v ")) {
      flushVerse();
      const m = line.match(/^\\v\s+(\d+)\s*(.*)$/);
      if (!m) continue;
      curVerse = parseInt(m[1], 10);
      buffer = m[2];
      continue;
    }
    // skip pure-markup lines without a verse in progress
    if (curVerse == null) continue;
    // skip continuation paragraph markers, but keep their inline text
    if (line.startsWith("\\")) {
      const m = line.match(/^\\[a-z0-9]+\*?\s*(.*)$/i);
      if (m) buffer += " " + m[1];
      continue;
    }
    buffer += " " + line;
  }
  flushVerse();
  return chapters;
}

// --- Builders ---

async function writeChapter(slug, chapter, verses, bookName, source) {
  const dir = path.join(OUT, slug);
  await fs.mkdir(dir, { recursive: true });
  const payload = {
    book: slug,
    name: bookName,
    chapter,
    verses,
    source,
  };
  await fs.writeFile(
    path.join(dir, `${chapter}.json`),
    JSON.stringify(payload),
    "utf8",
  );
}

async function buildNT() {
  const files = (await fs.readdir(SOURCES.nt.dir)).filter((f) =>
    /^grcsr_\d+_[A-Z0-9]+_\d+_read\.txt$/.test(f),
  );
  let count = 0;
  for (const f of files) {
    const m = f.match(/^grcsr_\d+_([A-Z0-9]+)_(\d+)_read\.txt$/);
    if (!m) continue;
    const [, code, chStr] = m;
    const slug = NT_CODE_TO_SLUG[code];
    if (!slug) {
      console.warn("NT skip unknown code:", code);
      continue;
    }
    const chapter = parseInt(chStr, 10);
    const text = await fs.readFile(path.join(SOURCES.nt.dir, f), "utf8");
    const { verses } = parseStephanusChapter(text);
    if (verses.length === 0) {
      console.warn(`NT empty: ${slug} ${chapter}`);
      continue;
    }
    await writeChapter(
      slug,
      chapter,
      verses,
      titleCase(slug),
      "Stephanus 1550 Greek New Testament. Public domain.",
    );
    count++;
  }
  return count;
}

async function buildOT() {
  const files = (await fs.readdir(SOURCES.ot.dir)).filter((f) =>
    /grclxx\.usfm$/.test(f),
  );
  let count = 0;
  for (const f of files) {
    const code = f.replace(/^\d+-/, "").replace(/grclxx\.usfm$/, "");
    const slug = OT_CODE_TO_SLUG[code];
    if (!slug) {
      console.warn("OT skip unknown code:", code);
      continue;
    }
    const text = await fs.readFile(path.join(SOURCES.ot.dir, f), "utf8");
    const chapters = parseUsfm(text);
    for (const [chStr, verses] of Object.entries(chapters)) {
      if (!verses.length) continue;
      const chapter = parseInt(chStr, 10);
      await writeChapter(
        slug,
        chapter,
        verses,
        titleCase(slug),
        "Septuagint (Swete edition, Greek). Public domain.",
      );
      count++;
    }
  }
  return count;
}

function titleCase(slug) {
  return slug
    .split("-")
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(" ");
}

(async () => {
  await ensureSources();
  const nt = await buildNT();
  console.log(`NT chapters written: ${nt}`);
  const ot = await buildOT();
  console.log(`OT chapters written: ${ot}`);
  console.log(`total: ${nt + ot}`);
})();
