// The paragraphs of the printed texts the app reads: the KJV's own ¶ marks
// for the New Testament and Brenton's paragraphs for the Old, both public
// domain, from ebible.org's USFM editions (eng-kjv2006_usfm.zip and
// eng-Brenton_usfm.zip, downloaded with the owner's yes of 2026-10-16).
//
//   node scripts/import-print-paragraphs.mjs <kjv usfm dir> <brenton usfm dir>
//
// writes data/bible/print-paragraphs.json, in the shape of paragraphs.json.
// scripts/build-paragraphs.mjs joins it to the Church's reading divisions.
// A chapter is taken only when the printed chapter has the app's number of
// verses and each verse that opens a paragraph begins with the app's words,
// so a mark can never land on the wrong verse. The KJV printed its ¶ marks
// only as far as Acts 20, so the later New Testament leans on the readings.
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const [, , kjvDir, brentonDir] = process.argv;
if (!kjvDir || !brentonDir) {
  console.error("usage: node scripts/import-print-paragraphs.mjs <kjv usfm dir> <brenton usfm dir>");
  process.exit(2);
}

const NT = {
  MAT: "matthew", MRK: "mark", LUK: "luke", JHN: "john", ACT: "acts", ROM: "romans",
  "1CO": "1-corinthians", "2CO": "2-corinthians", GAL: "galatians", EPH: "ephesians",
  PHP: "philippians", COL: "colossians", "1TH": "1-thessalonians", "2TH": "2-thessalonians",
  "1TI": "1-timothy", "2TI": "2-timothy", TIT: "titus", PHM: "philemon", HEB: "hebrews",
  JAS: "james", "1PE": "1-peter", "2PE": "2-peter", "1JN": "1-john", "2JN": "2-john",
  "3JN": "3-john", JUD: "jude", REV: "revelation",
};
const OT = {
  GEN: "genesis", EXO: "exodus", LEV: "leviticus", NUM: "numbers", DEU: "deuteronomy",
  JOS: "joshua", JDG: "judges", RUT: "ruth", "1SA": "1-samuel", "2SA": "2-samuel",
  "1KI": "1-kings", "2KI": "2-kings", "1CH": "1-chronicles", "2CH": "2-chronicles",
  "1ES": "1-esdras", EZR: "ezra", NEH: "nehemiah", TOB: "tobit", JDT: "judith", ESG: "esther",
  "1MA": "1-maccabees", "2MA": "2-maccabees", "3MA": "3-maccabees", JOB: "job", PSA: "psalms",
  PRO: "proverbs", ECC: "ecclesiastes", SNG: "song-of-solomon", WIS: "wisdom", SIR: "sirach",
  HOS: "hosea", AMO: "amos", MIC: "micah", JOL: "joel", OBA: "obadiah", JON: "jonah",
  NAM: "nahum", HAB: "habakkuk", ZEP: "zephaniah", HAG: "haggai", ZEC: "zechariah",
  MAL: "malachi", ISA: "isaiah", JER: "jeremiah", BAR: "baruch", LAM: "lamentations",
  LJE: "epistle-of-jeremiah", EZK: "ezekiel", DAG: "daniel", MAN: "prayer-of-manasseh",
};

/** A verse's words without USFM markup, footnotes or the ¶ sign. */
const plain = (s) =>
  s
    .replace(/\\f\s.*?\\f\*/g, " ")
    .replace(/\\x\s.*?\\x\*/g, " ")
    .replace(/\\w\s([^|\\]*)\|[^\\]*\\w\*/g, "$1")
    .replace(/\\\+?[a-z0-9]+\*?/g, " ")
    .replace(/¶/g, " ");
const firstWords = (s, n) => plain(s).toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean).slice(0, n).join(" ");

/** { chapter: { verses: Map(n, text), starts: [n, ...] } } from one USFM book. */
function readBook(file) {
  const chapters = {};
  let ch = null;
  let open = false;
  let verse = null;
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    const c = line.match(/^\\c\s+(\d+)/);
    if (c) {
      ch = chapters[c[1]] = { verses: new Map(), starts: [] };
      open = false;
      verse = null;
      continue;
    }
    if (!ch) continue;
    if (/^\\(p|pi\d?|b)(\s|$)/.test(line)) open = true;
    const parts = line.split(/(?=\\v\s+\d+)/);
    for (const part of parts) {
      const v = part.match(/^\\v\s+(\d+)\s*(.*)$/);
      if (v) {
        verse = Number(v[1]);
        ch.verses.set(verse, v[2]);
        if (open && verse > 1) ch.starts.push(verse);
        open = false;
      } else if (verse !== null && !/^\\(c|p|pi\d?|b|s\d?|ms\d?|mt\d?|d|q\d?|m)(\s|$)/.test(part)) {
        ch.verses.set(verse, `${ch.verses.get(verse)} ${part}`);
      } else if (verse !== null && /^\\(q\d?|m)\s/.test(part)) {
        ch.verses.set(verse, `${ch.verses.get(verse)} ${part.replace(/^\\(q\d?|m)\s/, "")}`);
      }
    }
  }
  return chapters;
}

const out = {};
const report = { taken: 0, countDiffers: [], wordsDiffer: [] };
for (const [dir, map] of [[kjvDir, NT], [brentonDir, OT]]) {
  for (const name of fs.readdirSync(dir).filter((n) => /\.usfm$/i.test(n))) {
    const file = path.join(dir, name);
    const code = (fs.readFileSync(file, "utf8").match(/^\\id\s+(\S+)/m) ?? [])[1];
    const slug = map[code];
    if (!slug) continue;
    for (const [chNum, ch] of Object.entries(readBook(file))) {
      const appFile = path.join(ROOT, "data/bible", slug, `${chNum}.json`);
      if (!fs.existsSync(appFile) || ch.starts.length === 0) continue;
      const app = JSON.parse(fs.readFileSync(appFile, "utf8")).verses;
      const ours = new Map(app.map((v) => [v.n, v.text]));
      let starts;
      if (app.length === ch.verses.size && ch.starts.every((n) => firstWords(ours.get(n) ?? "", 3) === firstWords(ch.verses.get(n) ?? "", 3))) {
        starts = ch.starts;
        report.taken += 1;
      } else {
        // Numbered apart (Brenton's chapters and ours split some verses
        // differently): a mark follows its verse by the verse's opening
        // words, and only where those words open one verse of ours alone.
        starts = [];
        const lost = [];
        for (const n of ch.starts) {
          const want = firstWords(ch.verses.get(n) ?? "", 6);
          const hits = want.split(" ").length >= 4 ? app.filter((v) => firstWords(v.text, 6) === want) : [];
          if (hits.length === 1 && hits[0].n > 1) starts.push(hits[0].n);
          else lost.push(n);
        }
        (app.length === ch.verses.size ? report.wordsDiffer : report.countDiffers).push(`${slug} ${chNum}: ${starts.length} placed by words, ${lost.length} left out`);
        report.byWords = (report.byWords ?? 0) + starts.length;
        report.lost = (report.lost ?? 0) + lost.length;
        if (!starts.length) continue;
      }
      (out[slug] ??= {})[chNum] = [...new Set(starts)].sort((a, b) => a - b);
    }
  }
}
const sorted = {};
for (const b of Object.keys(out).sort()) {
  sorted[b] = {};
  for (const c of Object.keys(out[b]).sort((a, b2) => a - b2)) sorted[b][c] = out[b][c];
}
fs.writeFileSync(path.join(ROOT, "data/bible/print-paragraphs.json"), JSON.stringify(sorted) + "\n");
console.log(`${report.taken} chapters as numbered; ${report.countDiffers.length + report.wordsDiffer.length} numbered apart, where ${report.byWords ?? 0} marks were placed by their words and ${report.lost ?? 0} left out`);
if (process.env.SHOW) console.log(JSON.stringify({ countDiffers: report.countDiffers, wordsDiffer: report.wordsDiffer }, null, 1));
