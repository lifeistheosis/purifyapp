// The Bibles a reader downloads (1.9, item 21 of docs/1.9-build/PLAN.md; the
// owner's word of 2026-11-07: "make it so that the user picks to download the
// selected Bible they pick ... instead of the app including all of them").
//
//   node scripts/bibles/build.mjs \
//     --ru <russynodal.json> --grc-ot <grcbrent usfm folder> --grc-nt <grcbyz usfm folder> \
//     --sr <srp1868 usfm folder> --ar <arb-vd usfm folder> --es <spaRV1909 usfm folder> \
//     --pt <poralmeida1911.json> --web <eng-webbe usfm folder>
//
// Each Bible is built from its source when it is given, and kept as it was
// built when it is not (its files and its entry in the catalog untouched), so
// one Bible can be added without fetching every other again.
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
//  - Serbian: the Daničić-Karadžić Bible (New Testament 1847, Old Testament
//    1867, together 1868), in the Ekavian spelling of later printings, as
//    eBible's srp1868 has it (Cyrillic; letter for letter its Latin srp1865,
//    checked 2026-11-09), https://ebible.org/Scriptures/srp1868_usfm.zip
//    (sha256 ff301782373925feea78fdd77768a9adf1e4eb18dc7b886f88e97844f308f187).
//  - Arabic: the Smith and Van Dyck translation (1865) of the Syrian Mission,
//    eBible's arb-vd, https://ebible.org/Scriptures/arb-vd_usfm.zip
//    (sha256 fd420ac7b224d42be23997fef298c2193d12788d95d2db7103904184cdda766a).
//  - Spanish: the Reina-Valera revision of 1909, eBible's spaRV1909,
//    https://ebible.org/Scriptures/spaRV1909_usfm.zip
//    (sha256 56937c2be9ad278aed91370d6a15a98fe976f275d0cbaa6e26910291d949c7a5).
//    All three Public Domain. They are Bibles of the Hebrew canon, as their
//    publishers made them: no deuterocanonical books, no Psalm 151, Daniel in
//    twelve chapters, each line under its title saying so.
//  - English: the World English Bible, British Edition with the deuterocanon,
//    its 2020 stable text, eBible's eng-webbe,
//    https://ebible.org/Scriptures/eng-webbe_usfm.zip
//    (sha256 c982d6311c10e8ac6fc72a09e3ae17647c8502b2478b3d9a769eb64aaa40591c,
//    read 2026-11-13). Public Domain; "World English Bible" is eBible.org's
//    trademark, which may name the text only while it is unchanged, as here.
//    God's name is printed "the LORD" (the Classic edition prints "Yahweh").
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
if (!args.ru && !(args["grc-ot"] && args["grc-nt"]) && !args.sr && !args.ar && !args.es && !args.pt && !args.web) {
  console.error(
    "usage: node scripts/bibles/build.mjs [--ru <russynodal.json>] [--grc-ot <grcbrent usfm> --grc-nt <grcbyz usfm>] [--sr <srp1868 usfm>] [--ar <arb-vd usfm>] [--es <spaRV1909 usfm>] [--pt <poralmeida1911.json>] [--web <eng-webbe usfm>]",
  );
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

// ---- The Portuguese -------------------------------------------------------

/**
 * João Ferreira de Almeida's translation in its edition of 1911 (1.9, call 23,
 * the owner's yes of 2026-11-11: "verbatim in its 1911 spelling"): CrossWire's
 * PorAlmeida1911, 0.2.1, made from a transcription of a 1911 printing, read by
 * OCR and proofread (2017; the module's TextSource), and read here through
 * scripts/bibles/sword-extract.py as the Russian is. A Protestant translation:
 * its Old Testament is from the Hebrew, in the Hebrew canon's 39 books, so it
 * has no Psalm 151, Susanna or Bel. The module numbers as the King James Bible
 * does, and every verse is the edition's, its spelling as printed ("No
 * principio creou Deus os céus e a terra").
 */
function portuguese(file) {
  const bible = "pt-almeida-1911";
  const src = JSON.parse(fs.readFileSync(file, "utf8"));
  if (src.module !== "PorAlmeida1911" || src.version !== "0.2.1") throw new Error(`not PorAlmeida1911 0.2.1: ${src.module} ${src.version}`);
  if (src.empty !== EMPTY_NUMBERS[bible]) throw new Error(`${bible}: ${src.empty} verse numbers with no words, not ${EMPTY_NUMBERS[bible]}`);
  if (src.mended.length) throw new Error(`${bible}: markup mended in ${src.mended.join(", ")}, where none was expected`);
  const books = new Map();
  for (const b of src.books) {
    const slug = OSIS[b.osis];
    if (!slug) throw new Error(`${bible}: no app book for ${b.osis}`);
    books.set(slug, b.chapters.map((ch) => ch.map(([n, t]) => [n, even(t)])));
  }
  if (books.size !== 66) throw new Error(`${bible}: ${books.size} books, not the 66 of the Hebrew canon and the New Testament`);
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
const PARAGRAPH = /^(p|m|nb|pi\d?|pm|pmo|pmc|pmr|mi|q\d?|qr|qc|qm\d?|li\d?|b|cls|pc)$/;
/** Headings and the book's own front matter: left out. \qa is an acrostic's letter over its stanza (Psalm 119), a heading. */
const HEADING = /^(id|ide|h|toc\d|toca\d|mt\d?|mte\d?|s\d?|ms\d?|mr|r|sr|sp|cl|cp|is\d?|imt\d?|im|ib|ili\d?|rem|sts|usfm|qa)$/;

/**
 * One USFM book: its chapters, each a list of [label, text]. Footnotes and
 * cross-references go, word tags give back their words, styles their words;
 * \ip before the first chapter is text before its first verse (Lamentations'
 * preface in the Septuagint).
 *
 * With `opening`, words a chapter prints before its verse 1 are its opening
 * line, unnumbered, as the edition prints them: a psalm's title (\d), or the
 * end of a sentence that runs on into verse 1 (the Van Dyck Bible begins
 * Nehemiah 8 and Jeremiah 39 so). Without it they are a mistake in the file.
 * `drop` lists editors' notes printed as text, each left out where it stands
 * and each required to be found, so a list that no longer fits fails.
 */
function parseUsfm(text, where, { opening = false, drop = null, acrostic = null, introduction = null } = {}) {
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
  /** The heading over a book's introduction, where it has one (\is1). */
  let introHeading = "";
  const add = (t) => {
    if (!t) return;
    if (!verse && opening && chapter && chapter.every(([n]) => n === "")) {
      if (chapter.length === 0) chapter.push(["", t]);
      else chapter[0][1] += ` ${t}`;
      return;
    }
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
    if (drop?.has(rest)) {
      drop.get(rest).found += 1;
      continue;
    }
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
      // The World English Bible opens each deuterocanonical book with the
      // edition's own note on it ("is recognised as Deuterocanonical
      // Scripture by..."): not the book's words, so left out and counted
      // (`introduction`). Sirach's prologue, under its own heading, is the
      // book's, and stands before its verse 1.
      if (introduction && !/\bPrologue\b/.test(introHeading)) {
        introduction.left += 1;
        continue;
      }
      preface.push(rest);
      continue;
    }
    if (PARAGRAPH.test(mark)) {
      add(rest);
      continue;
    }
    if (mark === "d") {
      // The World English Bible sets the letters over Psalm 119's stanzas
      // (ALEPH to TAV, "SIN AND SHIN" one of them) as titles: headings, as
      // \qa is in other files, left out and counted (`acrostic`).
      if (acrostic && /^[A-Z]+(?: AND [A-Z]+)?$/.test(rest)) {
        acrostic.found += 1;
        continue;
      }
      // A psalm's title. Where the edition prints it apart from verse 1, as
      // the Bibles of the Hebrew canon do, it is the opening line (above);
      // anywhere else it is a mistake in the file.
      if (rest && opening && chapter && verse === null) add(rest);
      else if (rest) throw new Error(`${where}: a psalm title outside a verse`);
      continue;
    }
    if (/^is\d?$/.test(mark)) introHeading = rest;
    if (HEADING.test(mark)) continue;
    throw new Error(`${where}: unknown mark \\${mark}`);
  }
  for (const ch of chapters) for (const v of ch) v[1] = even(v[1]);
  for (const ch of chapters) for (const v of ch) if (/\\|\|/.test(v[1])) throw new Error(`${where}: markup left in ${v[0]}: ${v[1].slice(0, 80)}`);
  return chapters;
}

function readUsfm(folder, options = {}) {
  const books = new Map();
  for (const name of fs.readdirSync(folder).filter((f) => f.endsWith(".usfm")).sort()) {
    const code = /^\d+-([0-9A-Z]{3})/.exec(name)?.[1];
    if (!code) throw new Error(`not a book: ${name}`);
    if (LEFT_OUT.has(code) || options.leave?.has(code)) continue;
    books.set(code, parseUsfm(fs.readFileSync(path.join(folder, name), "utf8"), code, options));
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

// ---- The Bibles of the Hebrew canon -----------------------------------------

/** Their files name Esther, Daniel, Ezra and Nehemiah as the Hebrew canon has them. */
const HEBREW_CANON = { ...USFM, EST: "esther", DAN: "daniel", EZR: "ezra", NEH: "nehemiah" };

/**
 * Editors' notes printed as text, left out, with how many times each stands.
 * The Van Dyck file heads Nehemiah 7 with "(to verse 73)", a reader's pointer
 * to where the chapter's list of the returned ends, not words of the book.
 */
const NOTES = {
  "ar-van-dyck": { "(إلى عدد73)": 1 },
};

/**
 * Verse numbers the file keeps for the English count with no words under them,
 * the words standing in the verse before or after as the edition numbers them
 * (Spanish Numbers 12:16 is its 13:1, Jonah 1:17 its 2:1, Job 38:39-41 its
 * 39:1-3, and Acts 19:41 is the end of its 19:40). Left out, so the page
 * numbers as the edition does; how many, so a new source that differs fails.
 */
const EMPTY_NUMBERS = {
  "es-reina-valera-1909": 18,
  // The Almeida's blessing at the end of 2 Corinthians is its 13:13, as
  // Portuguese Bibles number it; the English count's 13:14 stands empty.
  "pt-almeida-1911": 1,
  // The World English Bible keeps the numbers of verses its text does not
  // hold: 24 in Sirach (1:5, 1:7, 1:21, 3:19, 10:21, 11:15-16, 13:14,
  // 16:15-16, 17:5, 9, 16, 18 and 21, 18:3, 19:18-19, 19:21, 20:3, 20:32,
  // 22:9-10, 23:28, 24:18, 24:24, 25:12, 26:19-27), the longer Greek's
  // verses, and Luke 17:36, Acts 8:37, 15:34 and 24:7, and Romans 16:25.
  "en-web": 29,
};

/**
 * The note printed after each of Paul's letters in the Reina-Valera of 1909,
 * where and by whom it was sent ("Fué escrita de Corinto á los Romanos..."):
 * the file runs it on after the last verse's "Amén." It is the edition's
 * apparatus, not words of the letter (the app's English leaves the King
 * James Bible's out too), so it goes, from all fourteen and only there.
 */
/**
 * The Reina-Valera of 1909 prints a psalm's title above it and begins the
 * psalm with its first word in capitals ("TEN piedad de mí, oh Dios"); the
 * file runs the title into verse 1. Set apart again, as the opening line,
 * where it stands in the edition, and as the Arabic and Serbian files hold
 * theirs: the words before that first word in capitals ("A TI, oh Jehová"
 * keeps its one-letter first word). 124 psalms have one.
 */
const SPANISH_TITLES = 124;
/** The Hebrew letters over Psalm 119's stanzas, which the file runs into each stanza's first verse: headings, left out as the Arabic's are. */
const STANZAS = ["ALEPH", "BETH", "GIMEL", "DALETH", "HE", "VAU", "ZAIN", "CHETH", "TETH", "JOD", "CAPH", "LAMED", "MEM", "NUN", "SAMECH", "AIN", "PE", "TZADDI", "COPH", "RESH", "SIN", "TAU"];

function spanishPsalms(psalms) {
  let titles = 0;
  for (const chapter of psalms) {
    const first = chapter.find(([n]) => n === 1);
    const m = /^(.*?)\s*((?:[¡¿(]\s*)?\p{Lu}{2,}(?![\p{Ll}]).*)$/u.exec(first[1]);
    if (!m || !m[1]) continue;
    let [, title, rest] = m;
    const one = /^(.*\S)\s+(\p{Lu})$/u.exec(title);
    if (one) [title, rest] = [one[1], `${one[2]} ${rest}`];
    if (!/[.:?!]$/.test(title)) throw new Error(`es-reina-valera-1909: a psalm title that does not end as a title: ${title}`);
    chapter.unshift(["", title]);
    first[1] = rest;
    titles += 1;
  }
  if (titles !== SPANISH_TITLES) throw new Error(`es-reina-valera-1909: ${titles} psalm titles, not ${SPANISH_TITLES}`);
  const long = psalms[118];
  STANZAS.forEach((letter, i) => {
    const verse = long.find(([n]) => n === 1 + 8 * i);
    const m = new RegExp(`^${letter}\\.?\\s+(\\S.*)$`, "u").exec(verse[1]);
    if (!m) throw new Error(`es-reina-valera-1909: Psalm 119:${1 + 8 * i} does not begin with ${letter}`);
    verse[1] = m[1];
  });
}

const PAUL = ["romans", "1-corinthians", "2-corinthians", "galatians", "ephesians", "philippians", "colossians", "1-thessalonians", "2-thessalonians", "1-timothy", "2-timothy", "titus", "philemon", "hebrews"];
const SUBSCRIBED = new Set(["es-reina-valera-1909"]);

function hebrewCanon(folder, bible) {
  const books = new Map();
  const drop = new Map(Object.entries(NOTES[bible] ?? {}).map(([note, times]) => [note, { times, found: 0 }]));
  const read = readUsfm(folder, { opening: true, drop });
  for (const [note, { times, found }] of drop) {
    if (found !== times) throw new Error(`${bible}: the note ${note} stands ${found} times, not ${times}`);
  }
  let empty = 0;
  for (const [code, chapters] of read) {
    const slug = HEBREW_CANON[code];
    if (!slug) throw new Error(`${bible}: no app book for ${code}`);
    books.set(
      slug,
      chapters.map((ch) =>
        ch.filter(([n, t]) => {
          if (n === "" || t) return true;
          empty += 1;
          return false;
        }),
      ),
    );
  }
  if (books.size !== 66) throw new Error(`${bible}: ${books.size} books, not the 66 of the Hebrew canon and the New Testament`);
  if (empty !== (EMPTY_NUMBERS[bible] ?? 0)) throw new Error(`${bible}: ${empty} verse numbers with no words, not ${EMPTY_NUMBERS[bible] ?? 0}`);
  if (bible === "es-reina-valera-1909") spanishPsalms(books.get("psalms"));
  if (SUBSCRIBED.has(bible)) {
    for (const slug of PAUL) {
      const last = books.get(slug).at(-1).at(-1);
      const m = /^(.*\bAmén\.) (\S.*)$/u.exec(last[1]);
      if (!m) throw new Error(`${bible} ${slug}: no note after the last Amén`);
      last[1] = m[1];
    }
  }
  return books;
}

// ---- The World English Bible --------------------------------------------------

/**
 * The World English Bible (1.9, build 95 note 25: his word of 2026-11-13,
 * "Both", that it ships in 1.9 and no longer stands as "Coming soon"):
 * eBible.org's edition with the deuterocanon, Public Domain, its 2020 stable
 * text. A modern translation: its Old Testament is from the Hebrew and
 * numbered as English Bibles number it (Psalm 51 is "Have mercy"), with the
 * deuterocanonical books. Set in the app's books, every one of the 78:
 *
 *  - Esther and Daniel are read in their Greek form, with the additions (ESG,
 *    DAG), as the app's Old Testament is the Septuagint's; the edition's
 *    Esther and Daniel from the Hebrew (EST, DAN) are left out.
 *  - Baruch's sixth chapter is the Letter of Jeremiah, a book of its own in
 *    the app.
 *  - Psalm 151 (PS2) follows Psalm 150.
 *  - 4 Maccabees is not among the app's books (LEFT_OUT), and the glossary
 *    is no book.
 *  - The edition's note before each deuterocanonical book ("is recognised
 *    as Deuterocanonical Scripture by...") is the edition's, not the book's:
 *    left out. Sirach's prologue, the translator's own, stands before its
 *    verse 1, unnumbered, as in the Greek.
 *  - The letters over Psalm 119's stanzas, set as titles, are headings: left out.
 */
const WEB_CODES = { ...USFM, EZR: "ezra", NEH: "nehemiah", "2ES": "2-esdras" };

function worldEnglish(folder, bible) {
  const acrostic = { found: 0 };
  const introduction = { left: 0 };
  const read = readUsfm(folder, { opening: true, acrostic, introduction, leave: new Set(["GLO", "EST", "DAN"]) });
  if (acrostic.found !== 22) throw new Error(`${bible}: ${acrostic.found} letters over Psalm 119's stanzas, not the Hebrew alphabet's 22`);
  // One note before each deuterocanonical book the app has, Esther's in two paragraphs.
  if (introduction.left !== 14) throw new Error(`${bible}: ${introduction.left} paragraphs of the edition's introductions left out, not 14`);
  const books = new Map();
  // Verse numbers kept with no words under them (EMPTY_NUMBERS): left out and counted.
  let empty = 0;
  for (const chapters of read.values()) {
    for (const ch of chapters) {
      const kept = ch.filter(([n, t]) => n === "" || t);
      empty += ch.length - kept.length;
      ch.splice(0, ch.length, ...kept);
    }
  }
  if (empty !== EMPTY_NUMBERS[bible]) throw new Error(`${bible}: ${empty} verse numbers with no words, not ${EMPTY_NUMBERS[bible]}`);
  for (const [code, chapters] of read) {
    if (code === "BAR" || code === "PS2") continue;
    const slug = WEB_CODES[code];
    if (!slug) throw new Error(`${bible}: no app book for ${code}`);
    books.set(slug, chapters);
  }
  const baruch = read.get("BAR");
  if (baruch?.length !== 6) throw new Error(`${bible}: Baruch has ${baruch?.length} chapters, not 5 and the Letter of Jeremiah`);
  books.set("baruch", baruch.slice(0, 5));
  books.set("epistle-of-jeremiah", [baruch[5]]);
  const psalms = books.get("psalms");
  const psalm151 = read.get("PS2");
  if (psalms?.length !== 150 || psalm151?.length !== 1) throw new Error(`${bible}: the Psalms are not 150 and Psalm 151`);
  psalms.push(psalm151[0]);
  if (books.size !== APP_BOOKS.length) throw new Error(`${bible}: ${books.size} books, not the app's ${APP_BOOKS.length}`);
  return books;
}

// ---- Writing ---------------------------------------------------------------

/**
 * Spacing made even, and the letters in Unicode's composed order (NFC): the
 * same text, mark for mark, in the order every other Bible's file already
 * has it. The Van Dyck file sets a shadda before the vowel it carries.
 */
function even(text) {
  return text.replace(/\s+/g, " ").trim().normalize("NFC");
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
/**
 * Books a Bible ends before the app's last chapter, the rest not being in it:
 * the Bibles of the Hebrew canon have no Psalm 151, and no Susanna or Bel
 * (the app's Daniel 13 and 14). The page for such a chapter shows the English
 * and says why.
 */
const HEBREW_ENDS = { psalms: 150, daniel: 12 };
const FEWER = {
  "sr-danicic-karadzic": HEBREW_ENDS,
  "ar-van-dyck": HEBREW_ENDS,
  "es-reina-valera-1909": HEBREW_ENDS,
  "pt-almeida-1911": HEBREW_ENDS,
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
    const fewer = FEWER[bible]?.[appBook.slug];
    // Chapters past the app's last are allowed where they are listed, chapters
    // the edition lacks where they are said to stand elsewhere, and a book
    // that ends sooner where it is listed.
    const expected = more ?? fewer ?? appBook.chapters;
    const missing = Object.keys(elsewhere).map(Number).filter((n) => n > chapters.length);
    if (chapters.length + missing.length !== expected) throw new Error(`${bible} ${appBook.slug}: ${chapters.length} chapters, the app has ${appBook.chapters}`);
    for (let n = 1; n <= Math.max(chapters.length, appBook.chapters); n += 1) {
      const ch = chapters[n - 1];
      const empty = !ch || ch.length === 0;
      if (empty && fewer !== undefined && n > fewer) continue;
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

/** Each Bible's source, when given: the owner's order of 2026-11-06 (Romanian waits on his word). */
const SOURCES = {
  "ru-synodal": () => (args.ru ? russian(args.ru) : null),
  "grc-lxx-patriarchal": () => (args["grc-ot"] && args["grc-nt"] ? greek(args["grc-ot"], args["grc-nt"]) : null),
  "sr-danicic-karadzic": () => (args.sr ? hebrewCanon(args.sr, "sr-danicic-karadzic") : null),
  "ar-van-dyck": () => (args.ar ? hebrewCanon(args.ar, "ar-van-dyck") : null),
  "es-reina-valera-1909": () => (args.es ? hebrewCanon(args.es, "es-reina-valera-1909") : null),
  "pt-almeida-1911": () => (args.pt ? portuguese(args.pt) : null),
  "en-web": () => (args.web ? worldEnglish(args.web, "en-web") : null),
};
const built = fs.existsSync(CATALOG) ? JSON.parse(fs.readFileSync(CATALOG, "utf8")) : {};
const catalog = {};
for (const [bible, read] of Object.entries(SOURCES)) {
  const books = read();
  if (books) catalog[bible] = write(bible, books);
  else if (built[bible]) {
    catalog[bible] = built[bible];
    console.log(`${bible}: kept as built (no source given)`);
  }
}
fs.mkdirSync(path.dirname(CATALOG), { recursive: true });
fs.writeFileSync(CATALOG, `${JSON.stringify(catalog, null, 1)}\n`);
