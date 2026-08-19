// Ingest St. Augustine's Tractates on the Gospel of John (NPNF1-07, Schaff,
// public domain) into per-verse commentary at
// data/bible/commentary/john/<chapter>.json — a second patristic voice
// standing beside St. John Chrysostom's homilies across all 21 chapters.
//
//   Source: https://www.ccel.org/ccel/schaff/npnf107/cache/npnf107.txt
//   Run from the project root: node scripts/ingest-augustine-john-tractates.mjs
//
// The 124 tractates are continuous expositions over a passage range
// ("Chapter I. 6-14"), so each is attached whole to the OPENING verse of its
// range, the same pattern the Augustine 1 John ingest set. Continuation
// tractates ("on the same passage") inherit the previous range; a tractate
// spanning two chapters ("Chapter XX. 30-31, and XXI. 1-11") anchors to the
// first. Short curated Tractate digests already present are superseded by the
// full text; every other Father's entry is kept untouched.

import fs from "node:fs/promises";
import path from "node:path";

import { getText, cleanInline, romanToInt } from "./lib/npnf-homilies.mjs";

const ROOT = process.cwd();
const SRC_URL = "https://www.ccel.org/ccel/schaff/npnf107/cache/npnf107.txt";
const OUT_DIR = path.join(ROOT, "data", "bible", "commentary", "john");

const AUTHOR = "St. Augustine";
const CITATION = "NPNF1-07";
const WORK_PREFIX = "Tractates on the Gospel of John";

// John verse counts (for clamping the anchor).
const JOHN_VERSES = {
  1: 51, 2: 25, 3: 36, 4: 54, 5: 47, 6: 71, 7: 53, 8: 59, 9: 41, 10: 42,
  11: 57, 12: 50, 13: 38, 14: 31, 15: 27, 16: 33, 17: 26, 18: 40, 19: 42,
  20: 31, 21: 25,
};

function toParagraphs(raw) {
  const blocks = raw.replace(/\r/g, "").split(/\n\s*\n/);
  const out = [];
  for (const b of blocks) {
    const lines = b.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;
    if (/^\[\d+\]/.test(lines[0])) continue; // footnote definition block
    if (/^_{3,}$/.test(lines[0]) || /^-{3,}$/.test(lines[0])) continue;
    const p = cleanInline(lines.join(" "));
    if (p.length > 1) out.push(p);
  }
  return out;
}

async function main() {
  const text = await getText("npnf107.txt", SRC_URL);

  const headRe = /^ {3}Tractate ([IVXLC]+)\.\s*$/gm;
  const heads = [];
  let m;
  while ((m = headRe.exec(text)) !== null) {
    heads.push({ n: romanToInt(m[1]), idx: m.index, len: m[0].length });
  }
  if (heads.length !== 124) {
    throw new Error(`Expected 124 tractates, found ${heads.length}. Aborting.`);
  }

  // The series ends where the Homilies on 1 John begin.
  //
  // This used to be a case-sensitive indexOf for "Ten Homilies on the First
  // Epistle of John", and that string is not in the volume. The title page is
  // set in lower case and worded differently: "ten homilies / on the epistle of
  // john / to the parthians". So indexOf returned -1, `stop > 0 ? stop :
  // undefined` below fell through to undefined, and the last tractate ran to the
  // end of the file. Tractate 124 shipped carrying 90,758 words: itself, then
  // the whole of the Homilies on the First Epistle of John, then both books of
  // the Soliloquies, all of it under one heading at John 21:19.
  //
  // The same lower-case title page defeated the Harmony of the Gospels ingest on
  // this branch, which is why the match is now case-insensitive and tolerant of
  // the line breaks between the words. It throws rather than falling through: a
  // missing boundary must stop the run, never silently widen it.
  const tail = text.slice(heads[123].idx);
  const endMatch = /ten\s+homilies[\s\S]{0,80}?on\s+the\s+(?:first\s+)?epistle\s+of\s+john/i.exec(tail);
  if (!endMatch) {
    throw new Error(
      "Could not find where the Homilies on 1 John begin, so the last tractate would " +
        "swallow the rest of the volume. Aborting.",
    );
  }
  // The next work's title page opens with "St. AUGUSTIN:" a little above the
  // words matched, so back up to that when it is close by. Otherwise the last
  // tractate ends carrying the first line of somebody else's title.
  let endAt = endMatch.index;
  const before = tail.slice(Math.max(0, endAt - 300), endAt);
  const title = /St\.?\s*AUGUSTIN\s*:?[^\n]*$/i.exec(before.replace(/\s+$/, ""));
  if (title) endAt = Math.max(0, endAt - 300) + title.index;
  const seriesEnd = heads[123].idx + endAt;

  const byChapter = new Map(); // chapter -> Map(verse -> [entry])
  let prev = null; // { chapter, verse } for "on the same passage" tractates
  let anchored = 0;

  for (let i = 0; i < heads.length; i++) {
    const h = heads[i];
    const stop = i + 1 < heads.length ? heads[i + 1].idx : seriesEnd;
    const block = text.slice(h.idx + h.len, stop > 0 ? stop : undefined);

    // Range line: first non-empty line ("Chapter I. 6-14", possibly
    // "(continued)", or a continuation phrase).
    const lines = block.split("\n");
    let range = null;
    let bodyFrom = 0;
    for (let j = 0; j < Math.min(lines.length, 6); j++) {
      const t = lines[j].trim();
      if (t === "") continue;
      range = t;
      bodyFrom = j + 1;
      break;
    }
    let anchor = null;
    // "Chapter IX. 1-7" anchors at 9:1; a bare "Chapter IX" (Tractate 44
    // takes the whole chapter) anchors at verse 1.
    const rm = range && range.match(/Chapter ([IVXLC]+)\.?(?:\s*(\d+))?/);
    if (rm) {
      const chapter = romanToInt(rm[1]);
      const verse = Math.min(
        rm[2] ? parseInt(rm[2], 10) : 1,
        JOHN_VERSES[chapter] ?? 999,
      );
      anchor = { chapter, verse };
    } else if (range && /same passage/i.test(range) && prev) {
      anchor = prev;
    }
    if (!anchor) {
      throw new Error(`Tractate ${h.n}: cannot parse range "${range}". Aborting.`);
    }
    prev = anchor;

    const paragraphs = toParagraphs(lines.slice(bodyFrom).join("\n"));
    // Some tractates are legitimately just a couple of long paragraphs
    // (Tractate 66); gate on volume of text, not paragraph count.
    const chars = paragraphs.reduce((s, p) => s + p.length, 0);
    if (chars < 800) {
      throw new Error(`Tractate ${h.n} parsed only ${chars} chars. Aborting.`);
    }

    if (!byChapter.has(anchor.chapter)) byChapter.set(anchor.chapter, new Map());
    const chMap = byChapter.get(anchor.chapter);
    if (!chMap.has(anchor.verse)) chMap.set(anchor.verse, []);
    chMap.get(anchor.verse).push({
      author: AUTHOR,
      work: `${WORK_PREFIX}, Tractate ${h.n}`,
      citation: CITATION,
      text: paragraphs.join("\n\n"),
    });
    anchored++;
  }

  // Merge per chapter: keep every other Father (Chrysostom's homilies);
  // replace prior Augustine Tractate notes (the curated digests).
  await fs.mkdir(OUT_DIR, { recursive: true });
  let chaptersWritten = 0;
  let notes = 0;
  for (const [chapter, verseMap] of [...byChapter.entries()].sort((a, b) => a[0] - b[0])) {
    const file = path.join(OUT_DIR, `${chapter}.json`);
    let existing = {};
    try {
      existing = JSON.parse(await fs.readFile(file, "utf8"));
    } catch {
      /* none yet */
    }
    const merged = {};
    for (const [v, arr] of Object.entries(existing)) {
      const kept = arr.filter(
        (nt) => !(nt.author === AUTHOR && nt.citation === CITATION && nt.work.startsWith(WORK_PREFIX)),
      );
      if (kept.length) merged[v] = kept;
    }
    for (const [verse, arr] of [...verseMap.entries()].sort((a, b) => a[0] - b[0])) {
      const key = String(verse);
      if (!merged[key]) merged[key] = [];
      merged[key].push(...arr);
      notes += arr.length;
    }
    const sorted = {};
    for (const k of Object.keys(merged).sort((a, b) => Number(a) - Number(b))) {
      sorted[k] = merged[k];
    }
    await fs.writeFile(file, JSON.stringify(sorted, null, 2) + "\n", "utf8");
    chaptersWritten++;
  }

  process.stdout.write(
    `Tractates on John: ${anchored} tractates -> ${notes} entries across ${chaptersWritten} chapters\n`,
  );
}

await main();
