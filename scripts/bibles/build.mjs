// The Bibles a reader downloads (1.9, item 21 of docs/1.9-build/PLAN.md; the
// owner's word of 2026-11-07: "make it so that the user picks to download the
// selected Bible they pick ... instead of the app including all of them").
//
//   node scripts/bibles/build.mjs \
//     --ru <russynodal.json> --grc-ot <grcbrent usfm folder> --grc-nt <grcbyz usfm folder>
//
// Writes, for each Bible, one file per book and a list of them:
//
//   public/bibles/<bible>/<book>.json   { bible, book, hash, chapters: [[[label, text], ...], ...] }
//   public/bibles/<bible>/index.json    { bible, version, bytes, books: [{ book, chapters, bytes, hash }] }
//   data/bibles/catalog.json            what the apps carry: each Bible's version, size and books
//
// The files live on the website alone: the apps download a Bible's books when
// the reader asks for it (lib/bible/downloads/), and the native build sets the
// folder aside (scripts/native-build.mjs). A verse is [its label, its text]:
// the label as the edition prints it (a number, or "2a" for the Septuagint's
// added verses, or "" for text before a chapter's first verse), the text as
// the edition holds it. No word is changed: markup is taken out and spaces
// are evened, and nothing else.
//
// Each Bible keeps its own numbering, chapters as well as verses: a reader of
// the Greek finds Joel in four chapters, as Greek Bibles print it, and the
// Synodal's Jeremiah in the Hebrew order. A book's chapters are the edition's;
// the app shows its chapter N on the app's page N, and a chapter past the
// app's last on the last page (lib/bible/downloads/chapter.ts). Where an
// edition sets a chapter's verses in another chapter, its book file says where
// (`elsewhere`), so the page can say so and lead there; every such place is
// listed here (ELSEWHERE), and an empty or missing chapter not listed stops the
// build.
//
// Sources (docs/1.9-build/BIBLES.md):
//
//  - Russian: the Synodal translation of 1876, CrossWire's RusSynodal 1.9.1,
//    Public Domain, 78 books with the deuterocanon, in its own (Synodal)
//    numbering. https://www.crosswire.org/ftpmirror/pub/sword/packages/rawzip/RusSynodal.zip
//    (sha256 b802570e1783c326552b9e810786efe3df4efcd615f28ccf3a86bae27dbc5022),
//    read by scripts/bibles/sword-extract.py.
//  - Greek: the Septuagint as Brenton printed it (1851), eBible's grcbrent,
//    https://ebible.org/Scriptures/grcbrent_usfm.zip
//    (sha256 9de434f4922f85a475276e4754f6d114dee0f3bf5323d90dcd559a1f8286e9a4),
//    and the Patriarchal New Testament of 1904 (Antoniades, with 21 corrections
//    from later editions), eBible's grcbyz, https://ebible.org/Scriptures/grcbyz_usfm.zip
//    (sha256 d349039838cf1d62f9302a7cefdabe51f9f0d5d504f1294f9a4c14843f14cc5b).
//    Both Public Domain.
//
// Where the Greek file is arranged otherwise than the app's books, it is set
// in the app's books, each change named here and held by
// lib/bible/downloads/__tests__/files.test.ts:
//
//  - Ezra and Nehemiah are one book in the Septuagint (Esdras B, 23 chapters):
//    its chapters 1 to 10 are Ezra, 11 to 23 are Nehemiah 1 to 13.
//  - Susanna and Bel and the Dragon are books of their own in the file; in the
//    app, as in Brenton, they are Daniel 13 and 14.
//  - Sirach's prologue is numbered in the file as verses 1 and 1a to 1g, and
//    the book's own first verse as 1h. The prologue is set before verse 1,
//    unnumbered, and 1h is verse 1 again.
//  - 4 Maccabees is in the file and not among the app's books: it is left out.
//
// The Greek New Testament's footnotes (the 1904 printing's readings where the
// later editions corrected it) are left out, as every footnote is.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const OUT = path.join(ROOT, "public/bibles");
const CATALOG = path.join(ROOT, "data/bibles/catalog.json");

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .reduce((pairs, a, i, all) => (a.startsWith("--") ? [...pairs, [a.slice(2), all[i + 1]]] : pairs), []),
);
if (!args.ru || !args["grc-ot"] || !args["grc-nt"]) {
  console.error("usage: node scripts/bibles/build.mjs --ru <russynodal.json> --grc-ot <grcbrent usfm> --grc-nt <grcbyz usfm>");
  process.exit(1);
}

/** The app's books, in its order, with their chapter counts. */
const APP_BOOKS = JSON.parse(fs.readFileSync(path.join(ROOT, "data/bible/books.json"), "utf8"));
const APP = new Map(APP_BOOKS.map((b) => [b.slug, b]));

// ---- The Russian ----------------------------------------------------------

const OSIS = {
  Gen: "genesis", Exod: "exodus", Lev: "leviticus", Num: "numbers", Deut: "deuteronomy",
  Josh: "joshua", Judg: "judges", Ruth: "ruth", "1Sam": "1-samuel", "2Sam": "2-samuel",
  "1Kgs": "1-kings", "2Kgs": "2-kings", "1Chr": "1-chronicles", "2Chr": "2-chronicles",
  PrMan: "prayer-of-manasseh", Ezra: "ezra", Neh: "nehemiah", "1Esd": "1-esdras",
  Tob: "tobit", Jdt: "judith", Esth: "esther", Job: "job", Ps: "psalms", Prov: "proverbs",
  Eccl: "ecclesiastes", Song: "song-of-solomon", Wis: "wisdom", Sir: "sirach", Isa: "isaiah",
  Jer: "jeremiah", Lam: "lamentations", EpJer: "epistle-of-jeremiah", Bar: "baruch",
  Ezek: "ezekiel", Dan: "daniel", Hos: "hosea", Joel: "joel", Amos: "amos", Obad: "obadiah",
  Jonah: "jonah", Mic: "micah", Nah: "nahum", Hab: "habakkuk", Zeph: "zephaniah",
  Hag: "haggai", Zech: "zechariah", Mal: "malachi", "1Macc": "1-maccabees",
  "2Macc": "2-maccabees", "3Macc": "3-maccabees", "2Esd": "2-esdras",
  Matt: "matthew", Mark: "mark", Luke: "luke", John: "john", Acts: "acts", Jas: "james",
  "1Pet": "1-peter", "2Pet": "2-peter", "1John": "1-john", "2John": "2-john", "3John": "3-john",
  Jude: "jude", Rom: "romans", "1Cor": "1-corinthians", "2Cor": "2-corinthians",
  Gal: "galatians", Eph: "ephesians", Phil: "philippians", Col: "colossians",
  "1Thess": "1-thessalonians", "2Thess": "2-thessalonians", "1Tim": "1-timothy",
  "2Tim": "2-timothy", Titus: "titus", Phlm: "philemon", Heb: "hebrews", Rev: "revelation",
};

function russian(file) {
  const src = JSON.parse(fs.readFileSync(file, "utf8"));
  if (src.module !== "RusSynodal" || src.version !== "1.9.1") throw new Error(`not RusSynodal 1.9.1: ${src.module} ${src.version}`);
  const books = new Map();
  for (const b of src.books) {
    const slug = OSIS[b.osis];
    if (!slug) throw new Error(`no app book for ${b.osis}`);
    books.set(slug, b.chapters.map((ch) => ch.map(([n, t]) => [n, even(t)])));
  }
  return books;
}

// ---- The Greek --------------------------------------------------------------

const USFM = {
  GEN: "genesis", EXO: "exodus", LEV: "leviticus", NUM: "numbers", DEU: "deuteronomy",
  JOS: "joshua", JDG: "judges", RUT: "ruth", "1SA": "1-samuel", "2SA": "2-samuel",
  "1KI": "1-kings", "2KI": "2-kings", "1CH": "1-chronicles", "2CH": "2-chronicles",
  JOB: "job", PSA: "psalms", PRO: "proverbs", ECC: "ecclesiastes", SNG: "song-of-solomon",
  ISA: "isaiah", JER: "jeremiah", LAM: "lamentations", EZK: "ezekiel", HOS: "hosea",
  JOL: "joel", AMO: "amos", OBA: "obadiah", JON: "jonah", MIC: "micah", NAM: "nahum",
  HAB: "habakkuk", ZEP: "zephaniah", HAG: "haggai", ZEC: "zechariah", MAL: "malachi",
  TOB: "tobit", JDT: "judith", ESG: "esther", WIS: "wisdom", SIR: "sirach", BAR: "baruch",
  LJE: "epistle-of-jeremiah", "1MA": "1-maccabees", "2MA": "2-maccabees", "3MA": "3-maccabees",
  "1ES": "1-esdras", MAN: "prayer-of-manasseh", DAG: "daniel",
  MAT: "matthew", MRK: "mark", LUK: "luke", JHN: "john", ACT: "acts", ROM: "romans",
  "1CO": "1-corinthians", "2CO": "2-corinthians", GAL: "galatians", EPH: "ephesians",
  PHP: "philippians", COL: "colossians", "1TH": "1-thessalonians", "2TH": "2-thessalonians",
  "1TI": "1-timothy", "2TI": "2-timothy", TIT: "titus", PHM: "philemon", HEB: "hebrews",
  JAS: "james", "1PE": "1-peter", "2PE": "2-peter", "1JN": "1-john", "2JN": "2-john",
  "3JN": "3-john", JUD: "jude", REV: "revelation",
};
/** In the files and set elsewhere in the app's books (above), or not among them. */
const SPECIAL = new Set(["EZR", "SUS", "BEL"]);
const LEFT_OUT = new Set(["4MA", "FRT", "INT", "XXA", "XXB", "XXC"]);

/** Character styles whose words stay and whose marks go. */
const STYLES = "bdit|bd|it|em|sc|sup|add|nd|wj|qs|tl|no|bk|pn|ord|sls";
/** Paragraph marks: the text after one goes on with the verse before it. */
const PARAGRAPH = /^(p|m|nb|pi\d?|pm|pmo|pmc|pmr|mi|q\d?|qr|qc|qm\d?|li\d?|b|cls)$/;
/** Headings and the book's own front matter: left out. */
const HEADING = /^(id|ide|h|toc\d|toca\d|mt\d?|mte\d?|s\d?|ms\d?|mr|r|sr|sp|cl|cp|is\d?|imt\d?|im|ib|ili\d?|rem|sts|usfm)$/;

/**
 * One USFM book: its chapters, each a list of [label, text]. Footnotes and
 * cross-references go, word tags give back their words, styles their words;
 * \ip before the first chapter is text before its first verse (Lamentations'
 * preface in the Septuagint).
 */
function parseUsfm(text, where) {
  const clean = text
    .replace(/^﻿/, "")
    .replace(/\\(f|fe|x)\s[\s\S]*?\\\1\*/g, "")
    .replace(/\\\+?w\s+([^|\\]*?)(?:\|[^\\]*)?\\\+?w\*/g, "$1")
    .replace(new RegExp(`\\\\\\+?(${STYLES})\\s`, "g"), "")
    .replace(new RegExp(`\\\\\\+?(${STYLES})\\*`, "g"), "");
  const chapters = [];
  let chapter = null;
  let verse = null;
  let preface = [];
  const add = (t) => {
    if (!t) return;
    if (!verse) throw new Error(`${where}: text outside a verse: ${t.slice(0, 60)}`);
    verse[1] += ` ${t}`;
  };
  for (const raw of clean.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = /^\\([a-z0-9]+)\s*(.*)$/.exec(line);
    if (!m) {
      add(line);
      continue;
    }
    const [, mark, rest] = m;
    if (mark === "c") {
      const n = Number(rest.split(/\s/)[0]);
      if (!Number.isInteger(n) || n !== chapters.length + 1) throw new Error(`${where}: chapter ${rest} out of order`);
      chapter = [];
      chapters.push(chapter);
      verse = null;
      if (n === 1 && preface.length) chapter.push(["", preface.join(" ")]);
      continue;
    }
    if (mark === "v") {
      if (!chapter) throw new Error(`${where}: a verse before chapter 1`);
      const v = /^(\S+)\s*(.*)$/.exec(rest);
      const label = /^\d+$/.test(v[1]) ? Number(v[1]) : v[1];
      verse = [label, v[2]];
      chapter.push(verse);
      continue;
    }
    if (mark === "ip" && !chapter) {
      preface.push(rest);
      continue;
    }
    if (PARAGRAPH.test(mark)) {
      add(rest);
      continue;
    }
    if (mark === "d") {
      if (rest) throw new Error(`${where}: a psalm title outside a verse`);
      continue;
    }
    if (HEADING.test(mark)) continue;
    throw new Error(`${where}: unknown mark \\${mark}`);
  }
  for (const ch of chapters) for (const v of ch) v[1] = even(v[1]);
  for (const ch of chapters) for (const v of ch) if (/\\|\|/.test(v[1])) throw new Error(`${where}: markup left in ${v[0]}: ${v[1].slice(0, 80)}`);
  return chapters;
}

function readUsfm(folder) {
  const books = new Map();
  for (const name of fs.readdirSync(folder).filter((f) => f.endsWith(".usfm")).sort()) {
    const code = /^\d+-([0-9A-Z]{3})/.exec(name)?.[1];
    if (!code) throw new Error(`not a book: ${name}`);
    if (LEFT_OUT.has(code)) continue;
    books.set(code, parseUsfm(fs.readFileSync(path.join(folder, name), "utf8"), code));
  }
  return books;
}

function greek(otFolder, ntFolder) {
  const ot = readUsfm(otFolder);
  const nt = readUsfm(ntFolder);
  const books = new Map();
  for (const [code, chapters] of [...ot, ...nt]) {
    if (SPECIAL.has(code)) continue;
    const slug = USFM[code];
    if (!slug) throw new Error(`no app book for ${code}`);
    books.set(slug, chapters);
  }

  // Esdras B: Ezra and Nehemiah.
  const esdras = ot.get("EZR");
  if (esdras.length !== 23) throw new Error(`Esdras B has ${esdras.length} chapters`);
  books.set("ezra", esdras.slice(0, 10));
  books.set("nehemiah", esdras.slice(10));

  // Susanna and Bel: Daniel 13 and 14.
  const daniel = books.get("daniel");
  if (daniel.length !== 12 || ot.get("SUS").length !== 1 || ot.get("BEL").length !== 1) throw new Error("Daniel, Susanna or Bel is not as expected");
  books.set("daniel", [...daniel, ot.get("SUS")[0], ot.get("BEL")[0]]);

  // Sirach: the prologue before verse 1, unnumbered, and 1h as verse 1.
  const sirach = books.get("sirach");
  const first = sirach[0];
  const at = first.findIndex(([n]) => n === "1h");
  const prologue = first.slice(0, at);
  if (at !== 8 || prologue.map(([n]) => String(n)).join(",") !== "1,1a,1b,1c,1d,1e,1f,1g") throw new Error("Sirach's prologue is not as expected");
  sirach[0] = [["", prologue.map(([, t]) => t).join(" ")], [1, first[at][1]], ...first.slice(at + 1)];

  return books;
}

// ---- Writing ---------------------------------------------------------------

function even(text) {
  return text.replace(/\s+/g, " ").trim();
}

const hash = (s) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 12);

/**
 * The app's chapters a Bible has no verses for, and the chapter of its own
 * where they stand. The Greek sets Proverbs 30:1-14 and 30:15-33 (with
 * 31:1-9) inside its chapter 24, as the Septuagint orders them, and prints
 * Malachi in three chapters, the app's 4:1-6 being its 3:19-24.
 */
const ELSEWHERE = {
  "grc-lxx-patriarchal": { proverbs: { 30: 24 }, malachi: { 4: 3 } },
};
/** Books a Bible divides into more chapters than the app: the Greek's Joel, in four. */
const MORE = {
  "grc-lxx-patriarchal": { joel: 4 },
};

/** Checks a Bible against the app's books, and writes its files. */
function write(bible, books) {
  const dir = path.join(OUT, bible);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const listed = [];
  const differs = [];
  for (const appBook of APP_BOOKS) {
    const chapters = books.get(appBook.slug);
    if (!chapters) continue;
    const elsewhere = ELSEWHERE[bible]?.[appBook.slug] ?? {};
    const more = MORE[bible]?.[appBook.slug];
    // Chapters past the app's last are allowed where they are listed, and
    // chapters the edition lacks where they are said to stand elsewhere.
    const expected = more ?? appBook.chapters;
    const missing = Object.keys(elsewhere).map(Number).filter((n) => n > chapters.length);
    if (chapters.length + missing.length !== expected) throw new Error(`${bible} ${appBook.slug}: ${chapters.length} chapters, the app has ${appBook.chapters}`);
    for (let n = 1; n <= Math.max(chapters.length, appBook.chapters); n += 1) {
      const ch = chapters[n - 1];
      const empty = !ch || ch.length === 0;
      if (empty !== Boolean(elsewhere[n])) throw new Error(`${bible} ${appBook.slug} ${n}: ${empty ? "has no verses and is not said to stand elsewhere" : "has verses and is said to stand elsewhere"}`);
      if (elsewhere[n] && !chapters[elsewhere[n] - 1]?.length) throw new Error(`${bible} ${appBook.slug} ${n}: said to stand in ${elsewhere[n]}, which is empty`);
      if (empty) continue;
      for (const [label, t] of ch) if (!t) throw new Error(`${bible} ${appBook.slug} ${n}:${label} has no text`);
      if (n <= appBook.chapters) {
        const english = JSON.parse(fs.readFileSync(path.join(ROOT, "data/bible", appBook.slug, `${n}.json`), "utf8")).verses.length;
        if (english !== ch.length) differs.push(`${appBook.slug} ${n} (${ch.length}, the English ${english})`);
      }
    }
    const body = JSON.stringify(chapters);
    const h = hash(body + JSON.stringify(elsewhere));
    const where = Object.keys(elsewhere).length ? `,"elsewhere":${JSON.stringify(elsewhere)}` : "";
    const file = `{"bible":${JSON.stringify(bible)},"book":${JSON.stringify(appBook.slug)},"hash":"${h}"${where},"chapters":${body}}\n`;
    fs.writeFileSync(path.join(dir, `${appBook.slug}.json`), file);
    listed.push({ book: appBook.slug, chapters: chapters.length, bytes: Buffer.byteLength(file), hash: h });
  }
  for (const slug of books.keys()) if (!APP.has(slug)) throw new Error(`${bible}: ${slug} is not an app book`);
  const version = hash(listed.map((b) => b.hash).join(""));
  const bytes = listed.reduce((n, b) => n + b.bytes, 0);
  fs.writeFileSync(path.join(dir, "index.json"), `${JSON.stringify({ bible, version, bytes, books: listed })}\n`);
  if (process.env.BIBLES_REPORT) console.log(differs.join("\n"));
  console.log(`${bible}: ${listed.length} books, ${(bytes / 1e6).toFixed(2)} MB, version ${version}; ${differs.length} chapters numbered apart from the English`);
  return { version, bytes, books: listed.map((b) => b.book) };
}

const catalog = {
  "ru-synodal": write("ru-synodal", russian(args.ru)),
  "grc-lxx-patriarchal": write("grc-lxx-patriarchal", greek(args["grc-ot"], args["grc-nt"])),
};
fs.mkdirSync(path.dirname(CATALOG), { recursive: true });
fs.writeFileSync(CATALOG, `${JSON.stringify(catalog, null, 1)}\n`);
