// Ingest St. Augustine's Ten Homilies on the First Epistle of John
// (NPNF1-07, Schaff, public domain) into per-verse commentary at
// data/bible/commentary/1-john/<chapter>.json.
//
// Augustine's homilies are continuous expositions over a passage range
// (e.g. Homily I covers 1 John 1:1-2:11), not verse-tagged like Chrysostom.
// So each homily is attached to the OPENING verse of its range, the same
// pattern the existing commentary data uses (a homily keyed to a verse).
//
// Source: https://www.ccel.org/ccel/schaff/npnf107/cache/npnf107.txt
// Run from the project root: node scripts/ingest-augustine-1-john.mjs

import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const CACHE = path.join(ROOT, "scripts", ".cache", "npnf107.txt");
const SRC_URL = "https://www.ccel.org/ccel/schaff/npnf107/cache/npnf107.txt";
const OUT_DIR = path.join(ROOT, "data", "bible", "commentary", "1-john");
const CITATION = "NPNF1-07";

const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };

async function getText() {
  try {
    return await fs.readFile(CACHE, "utf8");
  } catch {
    const res = await fetch(SRC_URL);
    if (!res.ok) throw new Error(`fetch ${SRC_URL}: ${res.status}`);
    const txt = await res.text();
    await fs.mkdir(path.dirname(CACHE), { recursive: true });
    await fs.writeFile(CACHE, txt, "utf8");
    return txt;
  }
}

/**
 * Cut a homily body where its endnote list begins.
 *
 * CCEL prints each homily, then a long rule, then the numbered footnote
 * definitions the body referred to. Slicing a homily from its own header to
 * the next one therefore carries that whole apparatus along, and because
 * cleanBody strips the [1991] anchors out of the prose, the definitions
 * arrived looking like ordinary paragraphs: "1 John iv. 20, 21.", "Gal. v.
 * 6.", "Ps. cxix. 85." for dozens of lines under Augustine's name.
 *
 * All ten homilies shipped this way, 10,822 words of it. Homily X was the
 * worst: the marker that ends the series, "Preface to Soliloquies", sits
 * AFTER the endnote list, after the editor's appended extracts from other
 * works, and after the title page of the Soliloquies, so 3,879 of its 9,745
 * words were not Augustine expounding John at all.
 *
 * The cut is doubly positive and never positional: a rule of twenty or more
 * underscores AND a bracketed footnote number directly after it. Both are
 * required, so a rule the edition prints for any other reason is left alone.
 * Measured against this source, every homily has exactly one such boundary.
 */
function cutEndnotes(raw) {
  for (const m of raw.matchAll(/_{20,}/g)) {
    const after = raw.slice(m.index).replace(/_+/g, "").trimStart();
    if (/^\[\d{3,5}\]/.test(after)) return raw.slice(0, m.index);
  }
  return raw;
}

// Collapse the CCEL hard-wrapped, 3-space-indented body into clean paragraphs.
function cleanBody(raw) {
  const paras = raw
    .replace(/\r/g, "")
    .split(/\n\s*\n/) // blank line separates paragraphs
    .map((p) =>
      p
        .split("\n")
        .map((l) => l.trim())
        .join(" ")
        .replace(/\s*\[\d+\]\s*/g, " ") // footnote anchors
        .replace(/\s{2,}/g, " ")
        .trim(),
    )
    .filter((p) => p.length > 0);
  return paras.join("\n\n");
}

async function main() {
  const text = await getText();

  // Each 1 John homily: a "Homily <roman>." header, then a "1 John <roman>. <v>..."
  // range line. The Tractates on the Gospel of John use "Tractate", so the
  // "Homily" headers belong only to the 1 John series.
  const headerRe = /\n {3}Homily ([IVX]+)\.\s*\n\s*\n {3}(1 John [IVX]+\.\s*\d+[^\n]*)\n/g;
  const marks = [];
  let m;
  while ((m = headerRe.exec(text)) !== null) {
    marks.push({ roman: m[1], range: m[2].trim(), bodyStart: headerRe.lastIndex });
  }
  if (marks.length === 0) throw new Error("No 1 John homilies found in source.");

  // End of the last homily: the Soliloquies preface that follows the series.
  const end = text.indexOf("Preface to Soliloquies", marks[marks.length - 1].bodyStart);
  const byChapter = {}; // chapter -> { verse -> [entry] }
  let count = 0;

  for (let i = 0; i < marks.length; i++) {
    const cur = marks[i];
    const stop = i + 1 < marks.length ? marksHeaderIndex(text, marks[i + 1]) : end;
    const rawBody = text.slice(cur.bodyStart, stop > 0 ? stop : undefined);

    const rm = cur.range.match(/1 John ([IVX]+)\.\s*(\d+)/);
    if (!rm) {
      console.warn(`skip: cannot parse range "${cur.range}"`);
      continue;
    }
    const chapter = ROMAN[rm[1]];
    const verse = parseInt(rm[2], 10);
    const text_ = cleanBody(cutEndnotes(rawBody));
    const entry = {
      author: "St. Augustine",
      work: `Homilies on the First Epistle of John, Homily ${cur.roman}`,
      citation: CITATION,
      text: text_,
    };
    byChapter[chapter] = byChapter[chapter] || {};
    (byChapter[chapter][verse] = byChapter[chapter][verse] || []).push(entry);
    count++;
  }

  await fs.mkdir(OUT_DIR, { recursive: true });
  for (const [chapter, verses] of Object.entries(byChapter)) {
    // Merge with any existing chapter file (none expected for 1-john).
    const file = path.join(OUT_DIR, `${chapter}.json`);
    let existing = {};
    try {
      existing = JSON.parse(await fs.readFile(file, "utf8"));
    } catch {
      /* new */
    }
    // Replace only this work's own prior notes, keeping every other Father,
    // the same rule ingest-cyril-luke.mjs follows. Concatenating instead meant
    // a second run silently doubled the homilies rather than re-stating them,
    // so the script was not safe to re-run and a fix could not be verified by
    // running it.
    for (const [v, notes] of Object.entries(existing)) {
      const others = notes.filter((n) => n.citation !== CITATION);
      if (others.length) existing[v] = others;
      else delete existing[v];
    }
    for (const [v, entries] of Object.entries(verses)) {
      existing[v] = (existing[v] || []).concat(entries);
    }
    // Sort verse keys numerically for a stable file.
    const sorted = {};
    for (const k of Object.keys(existing).sort((a, b) => Number(a) - Number(b))) {
      sorted[k] = existing[k];
    }
    await fs.writeFile(file, JSON.stringify(sorted, null, 2) + "\n", "utf8");
    console.log(`wrote 1-john/${chapter}.json (${Object.keys(verses).length} verse anchors)`);
  }
  console.log(`Done. ${count} homilies ingested across ${Object.keys(byChapter).length} chapters.`);
}

// Position of a homily's "Homily <roman>." header line, to bound the previous body.
function marksHeaderIndex(text, mark) {
  const idx = text.lastIndexOf(`\n   Homily ${mark.roman}.`, mark.bodyStart);
  return idx;
}

main().catch((e) => {
  console.error("ingest-augustine-1-john:", e.message);
  process.exit(1);
});
