// Where each note of the Bible's commentary stands in the library (1.8).
//
// The owner, 2026-10-17: "whenever it quotes a father, I want that quote
// linked specifically to their book." The commentary rail quotes the Fathers
// on every chapter, and for twenty-three works the library holds the very
// edition the note was cut from: St John Chrysostom's homilies, St Cyril on
// John and on Luke, St Gregory's Morals, St Augustine's Harmony, Sermon on
// the Mount and Sermons. For each note of those, this finds the paragraph of
// the library work where the note begins and writes it into the note:
//
//   "at": { "work": "<saint>/<work>", "section": 15, "paragraph": 7,
//           "place": "Homily 15, Matthew 5:1, 2", "mark": "§2" }
//
// so the rail can name the place exactly and open it (components/bible/
// StudyRail.tsx, MobileCommentarySheet.tsx), with no library file in the
// page. The place is said by the work's own divisions (lib/saints/
// divisions.ts, placeWords). A note is placed only where its own words are
// found in the work, in order: the first of its paragraphs long enough to
// be told apart (eight words or more), in the sections its own heading names
// ("Homily 15", "Book 5") and else anywhere in the work. Nothing is placed by
// a guess; a note that is not found keeps no `at`, and the run says how many.
// A section whose number the file gives twice is never placed into: its
// paragraphs cannot be opened by number (Cyril on Luke, Sermons 29 and 96).
//
// The note's `at` goes after its citation and before its text, so a run
// changes one line per note. lib/bible/__tests__/commentaryPlaces.test.ts
// holds every `at` to the work and the note's words.
//
// The reading plans' sayings of the Fathers (data/plans/sayings.json) are
// cut from the same notes, a sentence or two each, and get their `at` the
// same way: the paragraph of the library's copy that holds the saying's own
// words, searched in the whole work when its heading names no number (the
// Proverbs plan's "Morals on the Book of Job").
//
//   node scripts/place-commentary.mjs          report
//   node scripts/place-commentary.mjs --apply  write the notes

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const APPLY = process.argv.includes("--apply");
const { divisionsOf, placeAt, placeWords } = await import("../lib/saints/divisions.ts");

/** The note's author and work, the library work, and the sections its number names. */
export const WORKS = [
  ["St. John Chrysostom", /^Homilies on the Gospel of St\. Matthew, Homily (\d+)$/, "john-chrysostom/homilies-on-matthew", "homily"],
  ["St. John Chrysostom", /^Homilies on the Gospel of St\. John, Homily (\d+)$/, "john-chrysostom/homilies-on-john", "homily"],
  ["St. John Chrysostom", /^Homilies on the Acts of the Apostles, Homily (\d+)$/, "john-chrysostom/homilies-on-acts", "homily"],
  ["St. John Chrysostom", /^Homilies on the Epistle to the Romans, Homily (\d+)$/, "john-chrysostom/homilies-on-romans", "homily"],
  ["St. John Chrysostom", /^Homilies on the First Epistle to the Corinthians, Homily (\d+)$/, "john-chrysostom/homilies-on-1-corinthians", "homily"],
  ["St. John Chrysostom", /^Homilies on the Second Epistle to the Corinthians, Homily (\d+)$/, "john-chrysostom/homilies-on-2-corinthians", "homily"],
  ["St. John Chrysostom", /^Commentary on Galatians$/, "john-chrysostom/commentary-on-galatians", "galatians"],
  ["St. John Chrysostom", /^Homilies on the Epistle to the Ephesians, Homily (\d+)$/, "john-chrysostom/homilies-on-ephesians", "homily"],
  ["St. John Chrysostom", /^Homilies on the Epistle to the Philippians, Homily (\d+)$/, "john-chrysostom/homilies-on-philippians", "homily"],
  ["St. John Chrysostom", /^Homilies on the Epistle to the Colossians, Homily (\d+)$/, "john-chrysostom/homilies-on-colossians", "homily"],
  ["St. John Chrysostom", /^Homilies on the First Epistle to the Thessalonians, Homily (\d+)$/, "john-chrysostom/homilies-on-1-thessalonians", "homily"],
  ["St. John Chrysostom", /^Homilies on the Second Epistle to the Thessalonians, Homily (\d+)$/, "john-chrysostom/homilies-on-2-thessalonians", "homily"],
  ["St. John Chrysostom", /^Homilies on the First Epistle to Timothy, Homily (\d+)$/, "john-chrysostom/homilies-on-1-timothy", "homily"],
  ["St. John Chrysostom", /^Homilies on the Second Epistle to Timothy, Homily (\d+)$/, "john-chrysostom/homilies-on-2-timothy", "homily"],
  ["St. John Chrysostom", /^Homilies on the Epistle to Titus, Homily (\d+)$/, "john-chrysostom/homilies-on-titus", "homily"],
  ["St. John Chrysostom", /^Homilies on the Epistle to Philemon, Homily (\d+)$/, "john-chrysostom/homilies-on-philemon", "homily"],
  ["St. John Chrysostom", /^Homilies on the Epistle to the Hebrews, Homily (\d+)$/, "john-chrysostom/homilies-on-hebrews", "homily"],
  // Cyril's verbatim notes say "Commentary on John"; "Commentary on the Gospel of John" marks our summaries, never placed.
  ["St. Cyril of Alexandria", /^Commentary on John, Book (\d+)$/, "cyril-of-alexandria/commentary-on-john", "book"],
  ["St. Cyril of Alexandria", /^Commentary on Luke, Sermon (\d+)$/, "cyril-of-alexandria/commentary-on-luke", "sermon"],
  ["St. Cyril of Alexandria", /^Commentary on Luke, fragments on chapter (\d+)$/, "cyril-of-alexandria/commentary-on-luke", "fragments"],
  ["St. Gregory the Great", /^Morals on the Book of Job, Book (\d+)$/, "gregory-the-dialogist/morals-on-the-book-of-job", "book"],
  ["St. Augustine", /^The Harmony of the Gospels, Book (\d+), Chapter (\d+)$/, "augustine-of-hippo/harmony-of-the-gospels", "bookChapter"],
  ["St. Augustine", /^Sermons on Selected Lessons, Sermon (\d+)$/, "augustine-of-hippo/sermons-on-selected-lessons", "sermon"],
  ["St. Augustine", /^Our Lord's Sermon on the Mount, Book (\d+), Chapter (\d+)$/, "augustine-of-hippo/sermon-on-the-mount", "bookChapter"],
];

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI"];
/** The sections a note's heading names, by their titles. */
function named(kind, m, chapter) {
  switch (kind) {
    case "homily":
      return (t) => t.startsWith(`Homily ${m[1]},`) || t === `Homily ${m[1]}`;
    case "book":
      return (t) => t.startsWith(`Book ${m[1]},`);
    case "sermon":
      return (t) => t === `Sermon ${m[1]}` || t.startsWith(`Sermon ${m[1]},`) || t.startsWith(`Sermon ${m[1]}.`);
    case "fragments":
      return (t) => t.startsWith(`Miscellaneous fragments on Luke c. ${m[1]}`);
    case "bookChapter":
      return (t) => t === `Book ${m[1]}, Chapter ${m[2]}` || t.startsWith(`Book ${m[1]}, Chapter ${m[2]}.`);
    case "galatians":
      return (t) => t.startsWith(`Chapter ${ROMAN[chapter]}, Galatians`);
    default:
      return () => false;
  }
}

/** The words in order: letters and digits, lower case. */
export const words = (s) =>
  String(s)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

const works = new Map();
function work(key) {
  if (!works.has(key)) {
    const [saint, slug] = key.split("/");
    const file = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "saints", saint, `${slug}.json`), "utf8"));
    // A section number the file gives twice (Cyril on Luke has two sections
    // each for Sermons 29 and 96) cannot be opened by its number: those
    // sections are not placed into, until the file numbers them apart.
    const seen = new Map();
    for (const s of file.sections) seen.set(s.n, (seen.get(s.n) ?? 0) + 1);
    const paras = file.sections
      .filter((s) => seen.get(s.n) === 1)
      .flatMap((s) => s.paragraphs.map((p, i) => ({ n: s.n, i, title: s.title, w: words(p) })));
    works.set(key, { file, paras, d: divisionsOf(key, file), twice: new Set([...seen].filter(([, c]) => c > 1).map(([n]) => n)) });
  }
  return works.get(key);
}

/** Where a note begins in its work, or null. */
export function placeNote(note, chapter) {
  const row = WORKS.find(([author, re]) => author === note.author && re.test(note.work));
  if (!row) return null;
  const [, re, key, kind] = row;
  const m = re.exec(note.work);
  const w = work(key);
  const inNamed = named(kind, m, chapter);
  const paragraphs = String(note.text).split(/\n\s*\n/).map(words).filter((p) => p.split(" ").length >= 8);
  for (const p of paragraphs.slice(0, 4)) {
    const all = p.split(" ");
    const anchor = all.slice(0, Math.min(14, all.length)).join(" ");
    const pick = (list) => list.find((x) => x.w.includes(anchor));
    const hit = pick(w.paras.filter((x) => inNamed(x.title))) ?? pick(w.paras);
    if (!hit) continue;
    const place = w.d ? placeAt(w.d, w.file, hit.n, hit.i) : null;
    const section = w.file.sections.find((s) => s.n === hit.n);
    const said = place ? placeWords(w.d, place.path, section.title, placeOfTitle) : { place: placeOfTitle(section.title) };
    return { work: key, section: hit.n, paragraph: hit.i, ...said };
  }
  return null;
}

/** A saying's work: by its author and its heading, with or without a number. */
const SAYING_WORKS = [
  [/^St\. Gregory the (?:Great|Dialogist)$/, /^Morals on the Book of Job/, "gregory-the-dialogist/morals-on-the-book-of-job"],
  [/^St\. John Chrysostom$/, /^Homilies on the Gospel of St\. Matthew/, "john-chrysostom/homilies-on-matthew"],
  [/^St\. John Chrysostom$/, /^Homilies on the Gospel of St\. John/, "john-chrysostom/homilies-on-john"],
  [/^St\. John Chrysostom$/, /^Homilies on the First Epistle to the Thessalonians/, "john-chrysostom/homilies-on-1-thessalonians"],
  [/^St\. John Chrysostom$/, /^Homilies on the First Epistle to the Corinthians/, "john-chrysostom/homilies-on-1-corinthians"],
  [/^St\. Cyril of Alexandria$/, /^Commentary on Luke/, "cyril-of-alexandria/commentary-on-luke"],
  [/^St\. Cyril of Alexandria$/, /^Commentary on John/, "cyril-of-alexandria/commentary-on-john"],
];

/** Where a saying's own words stand in the library, or null. */
export function placeSaying(saying) {
  const row = SAYING_WORKS.find(([a, re]) => a.test(saying.author) && re.test(saying.work));
  if (!row) return null;
  const key = row[2];
  const w = work(key);
  const target = words(saying.text);
  const num = /(\d+)$/.exec(saying.work)?.[1];
  const inNumbered = (x) => !num || new RegExp(`^(?:Homily|Book|Sermon) ${num}\\b`).test(x.title);
  const hit = w.paras.find((x) => inNumbered(x) && x.w.includes(target)) ?? w.paras.find((x) => x.w.includes(target));
  if (!hit) return null;
  const place = w.d ? placeAt(w.d, w.file, hit.n, hit.i) : null;
  const section = w.file.sections.find((s) => s.n === hit.n);
  const said = place ? placeWords(w.d, place.path, section.title, placeOfTitle) : { place: placeOfTitle(section.title) };
  return { work: key, section: hit.n, paragraph: hit.i, ...said };
}

/** The section's place as the work names it (lib/citations/cite.ts, placeOf). */
function placeOfTitle(title) {
  const m = /^((?:Book|Conference|Sermon|Homily|Chapter) [0-9IVXLC]+(?:, Chapter [0-9IVXLC]+)?)\. /.exec(title);
  return m ? m[1] : title;
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}` || process.argv[1]?.endsWith("place-commentary.mjs")) {
  const dir = path.join(ROOT, "data", "bible", "commentary");
  let notes = 0, placed = 0, missed = 0, files = 0;
  const missing = [];
  for (const book of fs.readdirSync(dir).sort()) {
    for (const f of fs.readdirSync(path.join(dir, book)).sort((a, b) => parseInt(a) - parseInt(b))) {
      const file = path.join(dir, book, f);
      const raw = fs.readFileSync(file, "utf8");
      const c = JSON.parse(raw);
      const chapter = parseInt(f, 10);
      let changed = false;
      for (const verse of Object.keys(c)) {
        c[verse] = c[verse].map((note) => {
          const at = placeNote(note, chapter);
          if (!WORKS.some(([a, re]) => a === note.author && re.test(note.work))) return note;
          notes++;
          if (!at) {
            missed++;
            missing.push(`${book}/${f} v${verse}: ${note.work}`);
            if (!note.at) return note;
            // A place found before and not now is taken away, never left standing.
            changed = true;
            const { at: _gone, ...kept } = note;
            return kept;
          }
          placed++;
          const { author, work: w, citation, at: old, text, ...rest } = note;
          const next = { author, work: w, citation, at, text, ...rest };
          if (JSON.stringify(old) !== JSON.stringify(at)) changed = true;
          return next;
        });
      }
      if (changed && APPLY) {
        const eol = raw.includes("\r\n") ? "\r\n" : "\n";
        const out = JSON.stringify(c, null, 2) + (raw.endsWith("\n") ? "\n" : "");
        fs.writeFileSync(file, eol === "\r\n" ? out.replace(/\n/g, "\r\n") : out);
        files++;
      }
    }
  }
  console.log(`notes from works in the library: ${notes}; placed: ${placed}; not found: ${missed}${APPLY ? `; files written: ${files}` : " (report only; --apply writes)"}`);
  for (const m of missing.slice(0, 40)) console.log(`  not found: ${m}`);

  // The reading plans' sayings.
  const sayingsFile = path.join(ROOT, "data", "plans", "sayings.json");
  const raw = fs.readFileSync(sayingsFile, "utf8");
  const sayings = JSON.parse(raw);
  let total = 0, inLibrary = 0, found = 0;
  const lost = [];
  for (const [plan, days] of Object.entries(sayings)) {
    for (const [day, saying] of Object.entries(days)) {
      total++;
      if (!SAYING_WORKS.some(([a, re]) => a.test(saying.author) && re.test(saying.work))) continue;
      inLibrary++;
      const at = placeSaying(saying);
      const { text, author, work: w, citation, from, at: _old, ...rest } = saying;
      if (at) found++;
      else lost.push(`${plan} day ${day}: ${saying.work}`);
      days[day] = { text, author, work: w, citation, ...(at ? { at } : {}), from, ...rest };
    }
  }
  console.log(`plan sayings: ${total}; from works in the library: ${inLibrary}; placed: ${found}`);
  for (const m of lost) console.log(`  not found: ${m}`);
  if (APPLY) {
    const eol = raw.includes("\r\n") ? "\r\n" : "\n";
    const out = JSON.stringify(sayings, null, 2) + (raw.endsWith("\n") ? "\n" : "");
    fs.writeFileSync(sayingsFile, eol === "\r\n" ? out.replace(/\n/g, "\r\n") : out);
  }
}
