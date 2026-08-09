/*
 * Strip NPNF footnote apparatus accidentally ingested onto the end of patristic
 * commentary notes (data/bible/commentary/<book>/<chapter>.json).
 *
 * The source edition prints, after each homily, a block of editorial footnotes:
 * romanized-Greek variant readings ending "k.t.l." (= κ.τ.λ.), manuscript
 * apparatus ("al.", "Savile", "... mss.", "not found in ..."), and signed editor
 * notes ("...--J.A.B.]", "...--G.A.]", "...--Gray."). None of this is the
 * Father's text.
 *
 * INTEGRITY RULE (paramount): never delete a word of real homily text. So this
 * tool is POSITIVE-MARKER ONLY. It does NOT cut by position (an earlier version
 * cut "everything after the last doxology" — catastrophic, because Chrysostom
 * quotes doxological verses mid-homily and ends each homily with a "Moral"
 * section AFTER its first doxology; that rule deleted whole homilies). Here a
 * segment is removed only if it PROVES itself apparatus.
 *
 * What is removed:
 *   1. Any segment (never the first) containing "k.t.l." — the romanized-Greek
 *      "etc." marker. This token never appears in real English homily prose.
 *   2. The CONTIGUOUS TRAILING block of apparatus-like segments — but only when
 *      that block contains at least one STRONG marker (k.t.l. / signed editor
 *      note / "al." / Savile / Morel / "not found in" / "mss."). The backward
 *      scan STOPS at the first segment that is real English (any English
 *      function word and no marker), so real text is never crossed.
 *
 * "apparatus-like" = strong marker OR pure transliteration cruft (zero English
 * function-words, >=2 tokens, short). Single-word tails (e.g. a lone Greek
 * "pneumatike." with no marker) are intentionally LEFT — safer to keep a stray
 * footnote than to risk a real trailing word.
 *
 * `node scripts/clean-commentary-footnotes.mjs` = dry run; add `--apply` to write.
 */
import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.cwd(), "data", "bible", "commentary");
const APPLY = process.argv.includes("--apply");

// Broad English function-word list. Any hit means the segment is real English
// prose, so the trailing scan stops there (it is never crossed).
const EN = new Set(
  ("a an the and or but of to in on at by for with from as is are was were be " +
    "been being he she it they them his her its their we us you your i not no " +
    "this that these those which who whom what when where why how all any some " +
    "our my me him do does did has have had will would shall should can could " +
    "may might must so then than there here out up down says said saith thou " +
    "thee thy ye unto upon also more most very such into about after before " +
    "through over under again because while himself itself things thing let us " +
    "them then them now")
    .split(" "),
);

function enCount(s) {
  let n = 0;
  for (const w of s.toLowerCase().match(/[a-z]+/g) || []) if (EN.has(w)) n++;
  return n;
}

function tokenCount(s) {
  return (s.match(/[A-Za-zÀ-ÿ]+/g) || []).length;
}

// Signed editor signature ANCHORED at the segment's end. Real homily prose never
// ends this way (these sigla are the modern editor's), so it is safe at ANY
// length — the long "Meyer says..."/"--R.]" textual-criticism notes are genuine
// apparatus and do end in such a signature.
function signedNote(s) {
  return (
    /--\s*([A-Z]\.){1,4}\]\s*$/.test(s) || // --J.A.B.]  --G.A.]  --C.]  --P.S.]  --R.]  --F.G.]
    /--\s*[A-Z][a-z]+\.\]?\s*$/.test(s) // --Gray.  --Meyer.  --Schaff.  --Riddle.]
  );
}

// Unanchored textual markers. These can appear INSIDE real homily prose (a
// homily segment may mention "mss" or quote Greek), so they are trusted ONLY on
// short segments — a genuine standalone apparatus line is short; a 4000-char
// paragraph that merely contains "mss" is the Father's text, not a footnote.
function shortMarker(s) {
  return (
    /k\.t\.l/.test(s) || // romanized Greek "etc." (κ.τ.λ.)
    /^al\.(\s|$)/i.test(s) || s === "al." || // variant-reading marker
    /\bSavile\b/.test(s) ||
    /\bMorel\b/.test(s) ||
    /\bnot found in\b/i.test(s) ||
    /\bmss\b/.test(s) || /\bMSS\b/.test(s) // manuscript apparatus
  );
}

// A STRONG, unmistakable apparatus signal. Presence => definitely a footnote.
function strongMarker(seg) {
  const s = seg.trim();
  if (signedNote(s)) return true; // anchored — safe at any length
  if (s.length <= 300 && shortMarker(s)) return true; // unanchored — short only
  return false;
}

// Pure transliteration cruft: no English function words, a couple tokens, short.
// (>=2 tokens so a lone real English word like "goodness." is never caught.)
function isCruft(seg) {
  const s = seg.trim();
  return enCount(s) === 0 && tokenCount(s) >= 2 && s.length <= 160;
}

// Distinctly-Greek transliteration particles (deliberately EXCLUDING tokens that
// look like English words — to/me/he/ho/ton — so a list of English proper nouns
// can never match). Two or more of these in a near-English-free segment is
// conclusive romanized-Greek apparatus.
const GREEK = new Set(
  ("kai tou tes tas tois hoi hai gar oun hoti touto tauta tauten esti einai " +
    "legon legonta legei pros dia kata meta peri hoper autou auton autois autes " +
    "hina pneuma eis ek men ouk auton touton toutou tauto estin ton")
    .split(" "),
);
function greekCount(s) {
  let n = 0;
  for (const w of s.toLowerCase().match(/[a-z]+/g) || []) if (GREEK.has(w)) n++;
  return n;
}

// A pure romanized-Greek tail: many tokens, essentially no English, and carrying
// real Greek particles. Strong, standalone evidence of apparatus.
function isTranslit(seg) {
  const s = seg.trim();
  return (
    s.length <= 400 &&
    tokenCount(s) >= 6 &&
    enCount(s) <= 1 &&
    greekCount(s) >= 2
  );
}

const apparatusLike = (seg) =>
  strongMarker(seg) || isTranslit(seg) || isCruft(seg);
const strongEvidence = (seg) => strongMarker(seg) || isTranslit(seg);

// A CCEL EXPORT ARTIFACT, not apparatus. The scraped page ends with a numbered
// "References" list of file:/// URLs pointing into the local CCEL cache. This
// is not text of any kind and cannot occur in patristic prose, so unlike
// everything above it can be identified positively and cut whole.
//
// It reached production. data/bible/commentary/john/21.json v19 carried 3,371
// of these entries and psalms/150.json v5 carried 19,141 words of them, 76% of
// that note, rendered to readers as St Augustine's commentary.
//
// The predicate is not "contains a link". A segment must PROVE itself: strip
// every numbered file:/// entry and what remains must be negligible. Measured
// on both known cases, the residue is exactly zero characters.
function isLinkIndex(seg) {
  const s = seg.trim();
  if (!s.includes("file:///")) return false;
  const LINK = /\d+\.\s*file:\/{3}\S+/g;
  if ((s.match(LINK) || []).length < 3) return false;
  return s.replace(LINK, "").trim().length <= 40;
}

/** The bare heading the scraper emits directly above that list. */
const isReferencesHeading = (seg) => /^references[.:]?$/i.test(seg.trim());

function cleanText(text) {
  const segs = text.split(/\n\n+/);
  if (segs.length < 2) return null;

  const drop = new Set();

  // (1) A SHORT non-first segment containing k.t.l. is apparatus, wherever it
  //     sits. (Short only: a long real-text segment could conceivably quote it.)
  for (let i = 1; i < segs.length; i++) {
    if (segs[i].trim().length <= 300 && /k\.t\.l/.test(segs[i])) drop.add(i);
  }

  // (2) Contiguous trailing apparatus block — only if it holds a strong marker.
  const block = [];
  let i = segs.length - 1;
  while (i > 0 && apparatusLike(segs[i])) {
    block.push(i);
    i--;
  }
  if (block.some((idx) => strongEvidence(segs[idx]))) {
    for (const idx of block) drop.add(idx);
  }

  // (3) The trailing CCEL link index, plus the bare "References" heading that
  //     introduces it. This is the one positional rule in the file, which every
  //     other rule here deliberately refuses to be. It is safe only because the
  //     segment proves itself by content: remove the numbered file:/// entries
  //     and nothing is left. The scan still stops at the first segment that
  //     does not prove itself, so real text is never crossed.
  let k = segs.length - 1;
  while (k > 0 && isLinkIndex(segs[k])) {
    drop.add(k);
    k--;
  }
  if (k > 0 && k < segs.length - 1 && isReferencesHeading(segs[k])) drop.add(k);

  if (drop.size === 0) return null;

  const removed = [];
  const kept = [];
  for (let j = 0; j < segs.length; j++) {
    if (drop.has(j)) removed.push(segs[j]);
    else kept.push(segs[j]);
  }
  return { text: kept.join("\n\n"), removed };
}

async function walk(dir) {
  const out = [];
  for (const ent of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...(await walk(p)));
    else if (ent.name.endsWith(".json")) out.push(p);
  }
  return out;
}

const trunc = (s, n = 100) => {
  const one = s.replace(/\s+/g, " ").trim();
  return one.length > n ? one.slice(0, n) + "…" : one;
};

async function main() {
  const files = await walk(ROOT);
  let filesChanged = 0, notesChanged = 0, segsRemoved = 0;
  const withEnglish = []; // removed segments that contain English — AUDIT THESE.
  const pure = []; // removed pure-cruft / marker-only segments.

  for (const file of files) {
    const data = JSON.parse(await fs.readFile(file, "utf8"));
    let changed = false;
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    const [book, chapFile] = rel.split("/");
    const chap = chapFile.replace(".json", "");

    for (const verse of Object.keys(data)) {
      for (const note of data[verse]) {
        if (typeof note.text !== "string") continue;
        const res = cleanText(note.text);
        if (!res) continue;
        note.text = res.text;
        changed = true;
        notesChanged++;
        segsRemoved += res.removed.length;
        const loc = `${book} ${chap}:${verse}`;
        for (const r of res.removed) {
          const line = `${loc}  [${r.trim().length}c] ✂ ${trunc(r)}`;
          if (enCount(r) > 0) withEnglish.push(line);
          else pure.push(line);
        }
      }
    }
    if (changed) {
      filesChanged++;
      if (APPLY) await fs.writeFile(file, JSON.stringify(data, null, 2) + "\n", "utf8");
    }
  }

  console.log("=== Removed segments CONTAINING ENGLISH — audit each (should all be signed editor notes / mss apparatus) ===");
  console.log(withEnglish.join("\n") || "(none)");
  console.log(`\n=== Removed pure transliteration / marker-only segments (${pure.length}) — sample ===`);
  console.log(pure.slice(0, 60).join("\n") || "(none)");
  if (pure.length > 60) console.log(`… and ${pure.length - 60} more`);
  console.log("\n────────────────────────────");
  console.log(`Files scanned:    ${files.length}`);
  console.log(`Files changed:    ${filesChanged}`);
  console.log(`Notes changed:    ${notesChanged}`);
  console.log(`Segments removed: ${segsRemoved}  (with English: ${withEnglish.length}, pure: ${pure.length})`);
  console.log(APPLY ? "MODE: APPLIED (files written)" : "MODE: dry run (use --apply to write)");
}

main().catch((e) => { console.error(e); process.exit(1); });
