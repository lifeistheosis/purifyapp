// Catena Aurea (the Golden Chain), compiled by St. Thomas Aquinas, in the
// Oxford translation published by J.G.F. and J. Rivington, London, 1842.
// Public domain by publication date.
//
// WHY THIS WORK. The commentary rail is built from NPNF, which is
// overwhelmingly Chrysostom and Augustine, and neither wrote on Mark or Luke.
// Mark therefore had no patristic commentary at all. The Catena is a per-verse
// chain of quotations from roughly eighty Fathers, which is the same shape as
// our own data: {verse: [{author, work, citation, text}]}.
//
// ATTRIBUTION, AND WHY THIS IS SAFE TO INGEST. A catena is a medieval
// compilation, and some of what it hands to a Father is not his. The 1842
// preface says so plainly: "Many of the passages ascribed to S. Chrysostom are
// not found in the works of that Father." Crucially, the edition marks those
// itself, printing "Pseudo-Chrys.", "Pseudo-Jerome", "Pseudo-Aug.". We preserve
// that marking exactly. A note attributed to Pseudo-Jerome is stored as
// Pseudo-Jerome and is never quietly promoted to Jerome.
//
// The `work` field always names the Catena rather than the Father's own book,
// so the chain of custody is visible to the reader: this is what the Golden
// Chain attributes to him, not a direct citation of his collected works.
//
// HOW A LEMMA IS FOUND, AND WHY IT IS NOT A REGEX. The first version of this
// script recognised a lemma by its shape, a line like "  19. And Joseph...".
// That shape is indistinguishable from ordinary numbered prose inside a
// Father's commentary. Mark's volume never does that mid-commentary; Matthew's
// does, and it produced a note anchored at Matthew 3:19, in a chapter with
// seventeen verses. A tighter regex would only be a better guess about
// typography, and would break on the next volume.
//
// So a lemma is not recognised, it is VERIFIED, against the Scripture we
// already ship. That matcher now lives in scripts/lib/lemma-verify.mjs, which
// carries the full argument and the calibration constants; this script is the
// volume-specific part. Mark remains its oracle: 679 of 679 lemmas verified,
// and data/bible/commentary/mark/ byte-identical.
//
// Commentary is never dropped: an unverified line folds into the preceding
// block, so the text survives and only its position stays conservative.
//
// Run from the project root:
//   node scripts/ingest-catena-aurea.mjs --book mark
//   node scripts/ingest-catena-aurea.mjs --book matthew
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import { createAlignmentReport, createLemmaVerifier } from "./lib/lemma-verify.mjs";

// Verse counts (KJV) are a backstop on the verifier: a note anchored past the
// end of its chapter proves something upstream is wrong. Once verification is
// in, this should never fire.
const MARK_VERSES = {
  1: 45, 2: 28, 3: 35, 4: 41, 5: 43, 6: 56, 7: 37, 8: 38,
  9: 50, 10: 52, 11: 33, 12: 44, 13: 37, 14: 72, 15: 47, 16: 20,
};
const MATTHEW_VERSES = {
  1: 25, 2: 23, 3: 17, 4: 25, 5: 48, 6: 34, 7: 29, 8: 34, 9: 38, 10: 42,
  11: 30, 12: 50, 13: 58, 14: 36, 15: 39, 16: 28, 17: 27, 18: 35, 19: 30,
  20: 34, 21: 46, 22: 46, 23: 39, 24: 51, 25: 46, 26: 75, 27: 66, 28: 20,
};

const VOLUMES = {
  mark: {
    id: "catena2",
    bookSlug: "mark",
    bookName: "Mark",
    chapters: 16,
    work: "Catena Aurea on Mark",
    verseCounts: MARK_VERSES,
  },
  matthew: {
    id: "catena1",
    bookSlug: "matthew",
    bookName: "Matthew",
    chapters: 28,
    work: "Catena Aurea on Matthew",
    verseCounts: MATTHEW_VERSES,
  },
};

const CITATION = "Catena Aurea (Oxford, Rivington, 1842)";
const SOURCE_NOTE =
  "St. Thomas Aquinas, Catena Aurea, Oxford translation, J.G.F. and J. Rivington, London, 1842. Public domain. Attributions are those printed by the 1842 edition, including its own Pseudo- markings.";

// The speakers the 1842 volumes actually use, mapped onto the names the rest of
// the corpus uses. Pseudo- forms are deliberately distinct entries: they are a
// different claim about authorship, not a variant spelling.
const SPEAKERS = new Map(Object.entries({
  "Chrys": "St. John Chrysostom",
  "Chrysostom": "St. John Chrysostom",
  "Pseudo-Chrys": "Pseudo-Chrysostom",
  // The transcription misspells the Pseudo- prefix in three places. These are
  // real attributions, and leaving them unmapped folded their text into the
  // PREVIOUS Father's note, which is a misattribution rather than a gap.
  "Psuedo-Chrys": "Pseudo-Chrysostom",
  "Pseudo-Chyrs": "Pseudo-Chrysostom",
  "Pseudo-Augustine": "Pseudo-Augustine",
  "Origin": "Origen",
  "Aug": "St. Augustine",
  "Augustine": "St. Augustine",
  "Pseudo-Aug": "Pseudo-Augustine",
  "Jerome": "St. Jerome",
  "Hieron": "St. Jerome",
  "Pseudo-Jerome": "Pseudo-Jerome",
  "Bede": "St. Bede",
  "Theophylact": "Blessed Theophylact",
  // The transcription carries two obvious typos for Theophylact.
  "Theophlyact": "Blessed Theophylact",
  "Theophyact": "Blessed Theophylact",
  "Greg": "St. Gregory the Great",
  "Gregory": "St. Gregory the Great",
  "Greg. Nyss": "St. Gregory of Nyssa",
  "Greg. Naz": "St. Gregory the Theologian",
  "Gregory Nyss": "St. Gregory of Nyssa",
  "Basil": "St. Basil the Great",
  "Cyril": "St. Cyril of Alexandria",
  "Origen": "Origen",
  "Ambrose": "St. Ambrose",
  "Hilary": "St. Hilary of Poitiers",
  "Isidore": "St. Isidore",
  "Remig": "Remigius",
  "Rabanus": "Rabanus Maurus",
  // Matthew's volume leans on a wider bench than Mark's. Left unmapped these
  // folded into the preceding Father's note, which misattributes rather than
  // merely omits: 200 of them were Rabanus alone.
  "Raban": "Rabanus Maurus",
  "Cyprian": "St. Cyprian of Carthage",
  "Chrysol": "St. Peter Chrysologus",
  "Cassian": "St. John Cassian",
  "Haymo": "Haymo of Halberstadt",
  "Euseb": "Eusebius",
  "Eusebius": "Eusebius",
  "Theodotus": "Theodotus of Ancyra",
  "Damascenus": "St. John of Damascus",
  "Damas": "St. John of Damascus",
  "Hil": "St. Hilary of Poitiers",
  "Gennadius": "Gennadius",
  // Another transcription typo for Chrysostom, alongside the Pseudo- ones.
  "Chyrs": "St. John Chrysostom",
  // The last of Matthew's tail. One note each, but a folded note is attributed
  // to the wrong Father, so they are worth naming.
  "Pseudo-Dionysius": "Pseudo-Dionysius the Areopagite",
  "Psuedo-Aug": "Pseudo-Augustine",
  "Josephus": "Josephus",
  "Maximus": "St. Maximus the Confessor",
  "Faustus": "Faustus of Riez",
  "Ambrosiaster": "Ambrosiaster",
  "Isid": "St. Isidore",
  "Nemesius": "Nemesius of Emesa",
  "Severianus": "Severianus of Gabala",
  "Chrysologus": "St. Peter Chrysologus",
  "Titus": "Titus of Bostra",
  "Athanasius": "St. Athanasius the Great",
  "Damascene": "St. John of Damascus",
  "Leo": "St. Leo the Great",
  "Bagster": "Bagster",
  "Gloss": "The Gloss",
  "Glossa": "The Gloss",
  "Anselm": "Anselm",
  "Victor": "Victor of Antioch",
  "Euthymius": "Euthymius Zigabenus",
  "Nyssen": "St. Gregory of Nyssa",
  "Pseudo-Athanasius": "Pseudo-Athanasius",
  "Pseudo-Basil": "Pseudo-Basil",
  "Pseudo-Origen": "Pseudo-Origen",
  "Pseudo-Bede": "Pseudo-Bede",
  "Pseudo-Ambrose": "Pseudo-Ambrose",
  "Pseudo-Gregory": "Pseudo-Gregory",
  "Pseudo-Hilary": "Pseudo-Hilary",
  "Pseudo-Isidore": "Pseudo-Isidore",
  "Pseudo-Leo": "Pseudo-Leo",
  "Pseudo-Cyril": "Pseudo-Cyril",
  "Pseudo-Theophylact": "Pseudo-Theophylact",
}));

const args = process.argv.slice(2);
const bookArg = args[args.indexOf("--book") + 1];
const vol = VOLUMES[bookArg];
if (!vol) {
  console.error(`Usage: node scripts/ingest-catena-aurea.mjs --book <${Object.keys(VOLUMES).join("|")}>`);
  process.exit(1);
}

const CACHE = path.join(os.tmpdir(), "purify-catena");
fs.mkdirSync(CACHE, { recursive: true });

async function load(id) {
  const file = path.join(CACHE, `${id}.txt`);
  if (fs.existsSync(file)) return fs.readFileSync(file, "utf8");
  const url = `https://www.ccel.org/ccel/aquinas/${id}/cache/${id}.txt`;
  process.stdout.write(`fetching ${url} ... `);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  const text = await res.text();
  fs.writeFileSync(file, text, "utf8");
  console.log(`${(text.length / 1024) | 0} KB`);
  return text;
}

// The matcher, and the running tally that becomes the review file.
const VERIFIER = createLemmaVerifier(vol.bookSlug);
const REPORT = createAlignmentReport({
  label: `${vol.work}: lemma alignment`,
  command: `node scripts/ingest-catena-aurea.mjs --book ${bookArg}`,
  source: SOURCE_NOTE,
});

let raw = await load(vol.id);

// CCEL appends its endnote index after the work: numbered lines of
// "file:///ccel/..." links. They are shaped exactly like lemmas, and the
// verifier correctly refuses every one of them, but they are not part of the
// text and should not be counted against the match rate. Cut them.
const indexAt = raw.search(/^[ \t]*\d{1,4}\.\s+file:\/\//m);
if (indexAt !== -1) raw = raw.slice(0, indexAt);

// ---- Chapter anchors --------------------------------------------------------
// Headings that exist carry their own number, so they are anchors rather than a
// running count. Missing ones are recovered by the verifier below.
const marks = [...raw.matchAll(/^[ \t]*Chapter (\d+)[ \t]*$/gm)];
if (!marks.length) throw new Error(`no chapter headings found in ${vol.id}`);

const missing = [];
for (let n = 1; n <= vol.chapters; n++) {
  if (!marks.some((m) => Number(m[1]) === n)) missing.push(n);
}
if (missing.length) {
  console.log(
    `${vol.bookName}: no heading for chapter ${missing.join(", ")}; recovering those from the text.`,
  );
}

const regions = [];
if (Number(marks[0][1]) !== 1) regions.push({ chapter: 1, body: raw.slice(0, marks[0].index) });
for (let i = 0; i < marks.length; i++) {
  regions.push({
    chapter: Number(marks[i][1]),
    body: raw.slice(
      marks[i].index + marks[i][0].length,
      i + 1 < marks.length ? marks[i + 1].index : raw.length,
    ),
  });
}

const RULE = /_{20,}/;

function paragraphs(block) {
  return block
    .split(/\n\s*\n/)
    .map((p) => p.replace(RULE, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

let noteCount = 0;
let blockCount = 0;
const out = new Map(); // chapter -> { verse -> notes[] }

for (const region of regions) {
  const lines = region.body.split("\n");
  const blocks = [];
  let pending = null;
  let chapter = region.chapter;
  let state = "lemma";

  for (const line of lines) {
    const cand = /^[ \t]{2,}(\d{1,3})\.\s+(\S.*)$/.exec(line);
    if (cand) {
      const n = Number(cand[1]);
      const quoted = cand[2];
      // Verify against this chapter first, then against the next: a candidate
      // that matches the next chapter is where a missing heading belongs.
      const check = VERIFIER.verifyAnchor(quoted, n, chapter);
      if (check.ok) {
        REPORT.pass();
        if (check.chapter !== chapter) chapter = check.chapter;
        if (state === "notes") {
          if (pending) blocks.push(pending);
          pending = null;
        }
        state = "lemma";
        if (!pending) pending = { verse: n, chapter, buf: [] };
        continue;
      }
      // Not the verse it claims to be: ordinary prose. Fall through so it is
      // kept as commentary rather than dropped or turned into an anchor.
      REPORT.fail({ chapter, n, hit: check.score.toFixed(2), quoted: quoted.slice(0, 72) });
    }
    if (RULE.test(line)) {
      state = "notes";
      continue;
    }
    if (state === "notes" && pending) pending.buf.push(line);
  }
  if (pending) blocks.push(pending);

  for (const b of blocks) {
    blockCount++;
    const notes = [];
    for (const p of paragraphs(b.buf.join("\n"))) {
      const m = /^([A-Z][A-Za-z'’\-]{1,24})\.?(?:,\s*([^:]{1,90}))?:\s+(.+)$/s.exec(p);
      if (m) {
        const mapped = SPEAKERS.get(m[1]);
        if (mapped === undefined) {
          REPORT.unnamedLabel(m[1]);
          if (notes.length) notes[notes.length - 1].text += " " + p;
          continue;
        }
        notes.push({
          author: mapped,
          work: m[2] ? `${vol.work} (${m[2].trim()})` : vol.work,
          citation: CITATION,
          text: m[3].trim(),
        });
      } else if (notes.length) {
        notes[notes.length - 1].text += " " + p;
      }
    }
    if (!notes.length) continue;
    const ch = out.get(b.chapter) ?? {};
    const key = String(b.verse);
    ch[key] = (ch[key] ?? []).concat(notes);
    out.set(b.chapter, ch);
    noteCount += notes.length;
  }
}

// ---- Prove it ---------------------------------------------------------------
REPORT.print({ explain: args.includes("--explain") });
// Written before the gates below, so the evidence exists when one of them fires.
const REVIEW = REPORT.writeReview(`catena-aurea-${vol.bookSlug}`);
if (REPORT.belowFloor()) {
  throw new Error(
    `only ${(REPORT.rate() * 100).toFixed(1)}% of lemma candidates verify. That is a broken matcher, not messy data.`,
  );
}

const absent = [];
for (let n = 1; n <= vol.chapters; n++) if (!out.has(n)) absent.push(n);
if (absent.length) throw new Error(`${vol.bookName}: nothing landed in chapter ${absent.join(", ")}.`);

for (const [ch, verses] of out) {
  if (ch > vol.chapters) throw new Error(`${vol.bookName}: parsed chapter ${ch}, book has ${vol.chapters}.`);
  const max = Math.max(...Object.keys(verses).map(Number));
  const limit = vol.verseCounts[ch];
  if (limit && max > limit) {
    throw new Error(`${vol.bookName} ${ch}: note anchored at verse ${max}, chapter has ${limit}.`);
  }
}

const unnamed = REPORT.unnamedEntries();
if (unnamed.length) {
  console.log(`Unrecognised speaker labels (folded into the previous note, never written as authors):`);
  unnamed.slice(0, 12).forEach(([l, n]) => console.log(`  ${String(n).padStart(4)}  ${l}`));
}

// ---- Merge, never clobber ---------------------------------------------------
const DIR = path.join("data", "bible", "commentary", vol.bookSlug);
fs.mkdirSync(DIR, { recursive: true });

let kept = 0;
for (const [chapter, byVerse] of out) {
  const file = path.join(DIR, `${chapter}.json`);
  const existing = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
  for (const verse of Object.keys(byVerse)) {
    const others = (existing[verse] ?? []).filter((n) => n.citation !== CITATION);
    kept += others.length;
    existing[verse] = others.concat(byVerse[verse]);
  }
  const ordered = {};
  for (const k of Object.keys(existing).sort((a, b) => Number(a) - Number(b))) ordered[k] = existing[k];
  fs.writeFileSync(file, JSON.stringify(ordered, null, 2) + "\n", "utf8");
}

console.log(
  `${vol.bookName}: ${blockCount} blocks -> ${noteCount} notes across ${out.size} chapters. ` +
    `Other sources preserved: ${kept}.`,
);
console.log(`review: ${REVIEW}`);
console.log(SOURCE_NOTE);
