// Ingest St. Augustine's Expositions on the Book of Psalms (NPNF1-08,
// Schaff, public domain) into per-verse commentary at
// data/bible/commentary/psalms/<chapter>.json — the full Psalter, all 150.
//
//   Source: https://www.ccel.org/ccel/schaff/npnf108/cache/npnf108.txt
//   Run from the project root: node scripts/ingest-augustine-psalms.mjs
//
// Two alignment problems, both solved against the app's own data:
//
// 1. NUMBERING. Augustine expounded the Latin/LXX psalter; Schaff's headers
//    renumber to the Hebrew ("Psalm XXIII" is the Shepherd). The app's
//    Psalter is Brenton's Septuagint whose chapter arrangement is verified
//    empirically from data/bible/psalms/*.json (9 merged; 113–115 following
//    the Hebrew split; 147 split at verse 12). hebrewToApp() encodes that
//    mapping; the seam psalms carry candidate verse offsets.
//
// 2. VERSE KEYS. Sections carry "(ver. N)" markers whose scheme varies by
//    psalm (Latin counts titles; Schaff sometimes renumbers). Rather than
//    trust N blindly, each section's opening quoted lemma is fuzzy-matched
//    against the app's Brenton text in a small window around every candidate
//    (claimed + each seam offset); the note is keyed to the verse whose words
//    it actually quotes. No match → the claimed number, clamped to the
//    chapter. Match statistics are printed so drift is visible, not silent.
//
// No text is fabricated: every note is the cleaned source paragraph(s);
// footnote apparatus is dropped whole, never rewritten.

import fs from "node:fs/promises";
import path from "node:path";

import { getText, cleanInline, romanToInt } from "./lib/npnf-homilies.mjs";

const ROOT = process.cwd();
const SRC_URL = "https://www.ccel.org/ccel/schaff/npnf108/cache/npnf108.txt";
const OUT_DIR = path.join(ROOT, "data", "bible", "commentary", "psalms");
const BIBLE_DIR = path.join(ROOT, "data", "bible", "psalms");

const AUTHOR = "St. Augustine";
const CITATION = "NPNF1-08";

// ---- App psalter shape (loaded from the app's own data) -------------------

async function loadAppPsalter() {
  const psalms = new Map(); // appChapter -> [verse texts]
  const files = await fs.readdir(BIBLE_DIR);
  for (const f of files) {
    const m = f.match(/^(\d+)\.json$/);
    if (!m) continue;
    const j = JSON.parse(await fs.readFile(path.join(BIBLE_DIR, f), "utf8"));
    psalms.set(
      Number(m[1]),
      j.verses.map((v) => v.text),
    );
  }
  return psalms;
}

// Hebrew (NPNF header) psalm -> { app chapter, candidate verse offsets }.
// Offsets are guesses the lemma-matcher may confirm; 0 is always tried.
function hebrewToApp(h) {
  if (h <= 9) return { app: h, offsets: [0] };
  if (h === 10) return { app: 9, offsets: [21, 0] }; // merged into app 9
  if (h <= 113) return { app: h - 1, offsets: [0] };
  if (h === 114) return { app: 113, offsets: [0] };
  if (h === 115) return { app: 114, offsets: [0, -8] };
  if (h === 116) return { app: 115, offsets: [0, 9] };
  if (h <= 146) return { app: h - 1, offsets: [0] };
  if (h === 147) return { app: null, offsets: [0] }; // split, handled inline
  return { app: h, offsets: [0] };
}

// ---- Text cleaning ---------------------------------------------------------

// Paragraphs from a raw block; footnote-definition paragraphs (starting with
// "[n]") are dropped WHOLE, including wrapped continuation lines.
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

// ---- Lemma matching --------------------------------------------------------

const STOP = new Set(["the", "and", "that", "unto", "with", "thou", "thy", "shall", "have", "hath", "them", "they", "not", "for", "his", "him", "her", "our", "your", "will", "are", "was", "but"]);

function tokens(s) {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOP.has(w)),
  );
}

function overlap(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let hit = 0;
  for (const w of a) if (b.has(w)) hit++;
  return hit / Math.min(a.size, b.size);
}

/** First quoted string in a paragraph, Augustine's lemma for the section. */
function lemmaOf(paragraph) {
  const m = paragraph.match(/"([^"]{8,220})"/);
  return m ? m[1] : null;
}

/**
 * Choose the verse for a section: try claimed+offset for each candidate
 * offset, score the lemma against app verses in a ±2 window, take the best
 * scoring verse ≥ threshold; otherwise the first candidate, clamped.
 */
function snapVerse(claimed, offsets, lemma, verses, stats) {
  const max = verses.length;
  const clamp = (v) => Math.min(Math.max(v, 1), max);
  if (!lemma) {
    stats.noLemma++;
    return clamp(claimed + offsets[0]);
  }
  const lem = tokens(lemma);
  let best = { score: 0, verse: null };
  for (const off of offsets) {
    const center = claimed + off;
    for (let v = center - 2; v <= center + 2; v++) {
      if (v < 1 || v > max) continue;
      const score = overlap(lem, tokens(verses[v - 1]));
      if (
        score > best.score ||
        (score === best.score && best.verse != null && Math.abs(v - (claimed + offsets[0])) < Math.abs(best.verse - (claimed + offsets[0])))
      ) {
        best = { score, verse: v };
      }
    }
  }
  if (best.verse != null && best.score >= 0.25) {
    if (best.verse === clamp(claimed + offsets[0])) stats.exact++;
    else stats.snapped++;
    return best.verse;
  }
  stats.unmatched++;
  return clamp(claimed + offsets[0]);
}

// ---- Main -------------------------------------------------------------------

async function main() {
  const text = await getText("npnf108.txt", SRC_URL);
  const appPsalms = await loadAppPsalter();

  // Every psalm exposition sits under a "   Psalm <roman>." header; the run of
  // 150 ends at the volume's back matter.
  const headRe = /^ {3}Psalm ([IVXLCDM]+)\.(?:\s*\[\d+\])?\s*$/gm;
  const heads = [];
  let m;
  while ((m = headRe.exec(text)) !== null) {
    heads.push({ hebrew: romanToInt(m[1]), idx: m.index, len: m[0].length });
  }
  if (heads.length !== 150) {
    throw new Error(`Expected 150 psalm headers, found ${heads.length}. Aborting.`);
  }

  // Sequence repair: the CCEL text mislabels Psalm XIII's header as a second
  // "Psalm XII." A repeated numeral in an otherwise strictly increasing run is
  // that same typo, so bump it to the successor; anything worse aborts.
  for (let i = 1; i < heads.length; i++) {
    if (heads[i].hebrew === heads[i - 1].hebrew) {
      process.stdout.write(
        `  note: header "Psalm ${heads[i].hebrew}" repeats; treating the second as Psalm ${heads[i].hebrew + 1}\n`,
      );
      heads[i].hebrew = heads[i - 1].hebrew + 1;
    } else if (heads[i].hebrew !== heads[i - 1].hebrew + 1) {
      throw new Error(
        `Psalm headers out of sequence at #${i}: ${heads[i - 1].hebrew} -> ${heads[i].hebrew}. Aborting.`,
      );
    }
  }

  const byChapter = new Map(); // app chapter -> Map(verse -> [paragraphs])
  const stats = { exact: 0, snapped: 0, unmatched: 0, noLemma: 0 };
  let sections = 0;

  for (let i = 0; i < heads.length; i++) {
    const h = heads[i];
    const end = i + 1 < heads.length ? heads[i + 1].idx : text.indexOf("\n   Indexes", h.idx);
    const block = text.slice(h.idx + h.len, end > 0 ? end : undefined);
    const paragraphs = toParagraphs(block);

    const map = hebrewToApp(h.hebrew);
    let current = null; // app { chapter, verse } the running paragraph belongs to

    for (const p of paragraphs) {
      const vm = p.match(/\(ver\.?\s*(\d+)/i);
      if (vm) {
        const claimed = parseInt(vm[1], 10);
        // Hebrew 147 splits across app 146 (vv 1–11) and app 147 (vv 12–20).
        const app =
          map.app != null ? map.app : claimed <= 11 ? 146 : 147;
        const offsets =
          map.app != null ? map.offsets : claimed <= 11 ? [0] : [-11];
        const verses = appPsalms.get(app);
        if (!verses) continue;
        const verse = snapVerse(claimed, offsets, lemmaOf(p), verses, stats);
        current = { chapter: app, verse };
      } else if (current == null) {
        // Preamble before any verse marker: the psalm's opening.
        const app = map.app != null ? map.app : 146;
        current = { chapter: app, verse: 1 };
      }
      if (!byChapter.has(current.chapter)) byChapter.set(current.chapter, new Map());
      const chMap = byChapter.get(current.chapter);
      if (!chMap.has(current.verse)) chMap.set(current.verse, []);
      chMap.get(current.verse).push(p);
      sections++;
    }
  }

  // ---- Write/merge, keeping other Fathers, replacing only this work --------
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
        (nt) => !(nt.author === AUTHOR && nt.citation === CITATION),
      );
      if (kept.length) merged[v] = kept;
    }
    for (const [verse, paras] of [...verseMap.entries()].sort((a, b) => a[0] - b[0])) {
      const key = String(verse);
      if (!merged[key]) merged[key] = [];
      merged[key].push({
        author: AUTHOR,
        work: `Expositions on the Book of Psalms, Psalm ${chapter}`,
        citation: CITATION,
        text: paras.join("\n\n"),
      });
      notes++;
    }
    const sorted = {};
    for (const k of Object.keys(merged).sort((a, b) => Number(a) - Number(b))) {
      sorted[k] = merged[k];
    }
    await fs.writeFile(file, JSON.stringify(sorted, null, 2) + "\n", "utf8");
    chaptersWritten++;
  }

  const total = stats.exact + stats.snapped + stats.unmatched + stats.noLemma;
  process.stdout.write(
    `Psalms: 150 expositions, ${sections} paragraphs -> ${notes} verse-notes across ${chaptersWritten} chapters\n` +
      `  lemma alignment: ${stats.exact} exact, ${stats.snapped} snapped, ` +
      `${stats.unmatched} unmatched (kept claimed), ${stats.noLemma} no-lemma of ${total} markers\n`,
  );
}

await main();
