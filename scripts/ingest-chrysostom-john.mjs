// Ingest St. John Chrysostom's Homilies on the Gospel of John (NPNF1-14,
// Schaff, public domain) into:
// 1. data/saints/john-chrysostom/homilies-on-john.json (the full 88-homily work)
// 2. data/bible/commentary/john/<chapter>.json (per-verse commentary, merged)
//
// Source: https://www.ccel.org/ccel/schaff/npnf114/cache/npnf114.txt
// Volume 14 contains the 88 John homilies followed by 34 Hebrews homilies;
// we slice the John block (first "Homily I." through the Hebrews intro).
//
// Run from the project root: node scripts/ingest-chrysostom-john.mjs

import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const CACHE = path.join(ROOT, "scripts", ".cache", "npnf114.txt");
const SRC_URL = "https://www.ccel.org/ccel/schaff/npnf114/cache/npnf114.txt";

const WORK_OUT = path.join(
 ROOT,
 "data",
 "saints",
 "john-chrysostom",
 "homilies-on-john.json",
);
const COMMENTARY_DIR = path.join(ROOT, "data", "bible", "commentary", "john");

const ROMAN = {
 i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10,
 xi: 11, xii: 12, xiii: 13, xiv: 14, xv: 15, xvi: 16, xvii: 17, xviii: 18,
 xix: 19, xx: 20, xxi: 21,
};
function romanToInt(r) {
 const key = r.toLowerCase();
 if (key in ROMAN) return ROMAN[key];
 // general fallback
 const map = { i: 1, v: 5, x: 10, l: 50, c: 100 };
 let total = 0;
 for (let i = 0; i < key.length; i++) {
 const cur = map[key[i]];
 const next = map[key[i + 1]];
 total += next && cur < next ? -cur : cur;
 }
 return total;
}

async function getText() {
 try {
 return await fs.readFile(CACHE, "utf8");
 } catch {
 /* fall through to fetch */
 }
 process.stdout.write(`Fetching ${SRC_URL} …\n`);
 const res = await fetch(SRC_URL);
 if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
 const text = await res.text();
 await fs.mkdir(path.dirname(CACHE), { recursive: true });
 await fs.writeFile(CACHE, text, "utf8");
 return text;
}

// ---- Cleaning helpers ----------------------------------------------------

function cleanInline(s) {
 return s
 // paragraph-number bullets like [1.] [12.]
 .replace(/\[\d+\.\]/g, "")
 // inline footnote refs like [74]
 .replace(/\[\d+\]/g, "")
 // collapse runs of whitespace
 .replace(/[ \t]+/g, " ")
 // tidy spaced punctuation introduced by stripping
 .replace(/\s+([,.;:!?])/g, "$1")
 .trim();
}

// Turn a raw homily block (minus its header line) into clean paragraphs.
// Drops footnote-definition lines, separators, and standalone editorial
// bracket lines; joins hard-wrapped lines into blank-line-separated paragraphs.
function toParagraphs(raw) {
 const lines = raw.split("\n");
 const kept = [];
 for (const line of lines) {
 const t = line.trim();
 if (/^\[\d+\]/.test(t)) continue; // footnote definition
 if (/^_{3,}$/.test(t)) continue; // separator rule
 if (/^-{3,}$/.test(t)) continue; // dash rule
 if (/^\[[^\]]*\]$/.test(t)) continue; // standalone editorial bracket line
 kept.push(line);
 }
 // group into paragraphs on blank lines
 const paras = [];
 let buf = [];
 for (const line of kept) {
 if (line.trim() === "") {
 if (buf.length) {
 paras.push(buf.join(" "));
 buf = [];
 }
 } else {
 buf.push(line.trim());
 }
 }
 if (buf.length) paras.push(buf.join(" "));
 return paras.map(cleanInline).filter((p) => p.length > 1);
}

// ---- Parse ---------------------------------------------------------------

function parseHomilies(text) {
 const startIdx = text.search(/^ {3}Homily I\.\s*$/m);
 if (startIdx < 0) throw new Error("Could not find first John homily header");
 const hebrewsIdx = text.indexOf("by the american reviser");
 if (hebrewsIdx < 0) throw new Error("Could not find John/Hebrews boundary");
 const region = text.slice(startIdx, hebrewsIdx);

 const headerRe = /^ {3}Homily ([IVXLCDM]+)\.\s*$/gm;
 const heads = [];
 let m;
 while ((m = headerRe.exec(region)) !== null) {
 heads.push({ roman: m[1], idx: m.index, headerLen: m[0].length });
 }

 const homilies = [];
 for (let i = 0; i < heads.length; i++) {
 const h = heads[i];
 const bodyStart = h.idx + h.headerLen;
 const bodyEnd = i + 1 < heads.length ? heads[i + 1].idx : region.length;
 const block = region.slice(bodyStart, bodyEnd);
 homilies.push({ n: i + 1, roman: h.roman, block });
 }
 return homilies;
}

// Pull the lemma line ("John i. 1" / "John i. 28, 29" / "John i. 35-37")
// out of the start of a block. Returns { chapter, startVerse, verseLabel, rest }.
function extractLemma(block) {
 const lines = block.split("\n");
 for (let i = 0; i < Math.min(lines.length, 8); i++) {
 const t = lines[i].trim();
 if (t === "") continue;
 const lm = t.match(/^John\s+([ivxlcdm]+)\.\s*([0-9][0-9,\s–\-]*)$/i);
 if (lm) {
 const chapter = romanToInt(lm[1]);
 const verseLabel = lm[2].replace(/\s+/g, " ").trim();
 const startVerse = parseInt(verseLabel.match(/\d+/)[0], 10);
 lines.splice(i, 1); // drop the lemma reference line from the body
 return { chapter, startVerse, verseLabel, rest: lines.join("\n") };
 }
 // "Preface." or other non-lemma first content -> no lemma
 if (/^[A-Za-z]/.test(t)) break;
 }
 return { chapter: null, startVerse: null, verseLabel: null, rest: block };
}

// Split a homily's paragraphs into verse-keyed chunks using line-leading
// "Ver. N." markers (the section breaks; parenthetical "( Ver. N.)" are
// citations and are intentionally ignored here).
function splitByVerse(paragraphs, startVerse) {
 const out = new Map(); // verse -> string[]
 let cur = startVerse;
 for (const p of paragraphs) {
 const vm = p.match(/^Ver\.\s*(\d+)\.?\s*/);
 if (vm) cur = parseInt(vm[1], 10);
 if (cur == null) continue;
 if (!out.has(cur)) out.set(cur, []);
 out.get(cur).push(p);
 }
 return out;
}

// ---- Main ----------------------------------------------------------------

async function main() {
 const text = await getText();
 const homilies = parseHomilies(text);

 if (homilies.length !== 88) {
 throw new Error(
 `Expected 88 John homilies, parsed ${homilies.length}. Aborting.`,
 );
 }

 // Build the work sections + collect per-chapter/-verse commentary.
 const sections = [];
 // chapter -> verse -> array of { n, paragraphs[] }
 const commentaryByChapter = new Map();

 for (const hom of homilies) {
 const { chapter, startVerse, verseLabel, rest } = extractLemma(hom.block);
 const paragraphs = toParagraphs(rest);

 const title =
 chapter == null
 ? `Homily ${hom.n}, Preface`
 : `Homily ${hom.n}, John ${chapter}:${verseLabel}`;
 sections.push({ n: hom.n, title, paragraphs });

 if (chapter == null) continue;

 const byVerse = splitByVerse(paragraphs, startVerse);
 if (!commentaryByChapter.has(chapter)) {
 commentaryByChapter.set(chapter, new Map());
 }
 const chMap = commentaryByChapter.get(chapter);
 for (const [verse, paras] of byVerse) {
 if (!chMap.has(verse)) chMap.set(verse, []);
 chMap.get(verse).push({ n: hom.n, text: paras.join("\n\n") });
 }
 }

 // ---- Write the work ----
 const work = {
 saint: "john-chrysostom",
 slug: "homilies-on-john",
 title: "Homilies on the Gospel of John",
 subtitle: "The complete eighty-eight homilies",
 source:
 "St. John Chrysostom, Homilies on the Gospel of St. John. From the Nicene and Post-Nicene Fathers, Series 1, Vol. 14 (ed. Philip Schaff). Public domain.",
 sections,
 };
 await fs.mkdir(path.dirname(WORK_OUT), { recursive: true });
 await fs.writeFile(WORK_OUT, JSON.stringify(work, null, 2) + "\n", "utf8");

 // ---- Write/merge the commentary ----
 await fs.mkdir(COMMENTARY_DIR, { recursive: true });
 let chaptersWritten = 0;
 let totalNotes = 0;
 const warnings = [];

 // John verse counts (KJV) for sanity-checking Ver. markers.
 const JOHN_VERSES = {
 1: 51, 2: 25, 3: 36, 4: 54, 5: 47, 6: 71, 7: 53, 8: 59, 9: 41, 10: 42,
 11: 57, 12: 50, 13: 38, 14: 31, 15: 27, 16: 33, 17: 26, 18: 40, 19: 42,
 20: 31, 21: 25,
 };

 for (const [chapter, verseMap] of [...commentaryByChapter.entries()].sort(
 (a, b) => a[0] - b[0],
 )) {
 const file = path.join(COMMENTARY_DIR, `${chapter}.json`);
 let existing = {};
 try {
 existing = JSON.parse(await fs.readFile(file, "utf8"));
 } catch {
 /* none yet */
 }

 // Strip prior Chrysostom notes; keep all other fathers.
 const merged = {};
 for (const [v, notes] of Object.entries(existing)) {
 const kept = notes.filter((nt) => nt.author !== "St. John Chrysostom");
 if (kept.length) merged[v] = kept;
 }

 // Add the new per-verse Chrysostom notes.
 for (const [verse, entries] of [...verseMap.entries()].sort(
 (a, b) => a[0] - b[0],
 )) {
 if (JOHN_VERSES[chapter] && verse > JOHN_VERSES[chapter]) {
 warnings.push(`John ${chapter}:${verse} exceeds chapter length`);
 }
 const key = String(verse);
 if (!merged[key]) merged[key] = [];
 for (const e of entries) {
 merged[key].push({
 author: "St. John Chrysostom",
 work: `Homilies on the Gospel of St. John, Homily ${e.n}`,
 citation: "NPNF1-14",
 text: e.text,
 });
 totalNotes++;
 }
 }

 // Write with numerically-sorted verse keys.
 const sorted = {};
 for (const k of Object.keys(merged).sort((a, b) => Number(a) - Number(b))) {
 sorted[k] = merged[k];
 }
 await fs.writeFile(file, JSON.stringify(sorted, null, 2) + "\n", "utf8");
 chaptersWritten++;
 }

 // ---- Report ----
 process.stdout.write(
 `\nHomilies parsed: ${homilies.length}\n` +
 `Work written: ${path.relative(ROOT, WORK_OUT)} (${sections.length} sections)\n` +
 `Commentary: ${chaptersWritten} chapters, ${totalNotes} Chrysostom verse-notes\n`,
 );
 if (warnings.length) {
 process.stdout.write(
 `\nWarnings (${warnings.length}):\n ` + warnings.join("\n ") + "\n",
 );
 }
}

main().catch((err) => {
 console.error(err);
 process.exit(1);
});
