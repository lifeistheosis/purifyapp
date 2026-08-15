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
// Chain attributes to him, not a direct citation of his collected works. That
// distinction is the one the florilegium audit found missing elsewhere.
//
// VERSE ANCHORING. The Catena comments on a run of verses at a time. Each block
// is anchored to the FIRST verse of its run, the same choice made by
// scripts/ingest-chrysostom-matthew.mjs, so no verse mapping is invented.
//
// Unrecognised speaker labels abort the run rather than being written as
// authors, per the repo's ingest convention.
//
// Run from the project root:
//   node scripts/ingest-catena-aurea.mjs --book mark
//   node scripts/ingest-catena-aurea.mjs --book matthew
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const VOLUMES = {
  mark: {
    id: "catena2",
    bookSlug: "mark",
    bookName: "Mark",
    chapters: 16,
    work: "Catena Aurea on Mark",
  },
  matthew: {
    id: "catena1",
    bookSlug: "matthew",
    bookName: "Matthew",
    chapters: 28,
    work: "Catena Aurea on Matthew",
  },
};

const CITATION = "Catena Aurea (Oxford, Rivington, 1842)";
const SOURCE_NOTE =
  "St. Thomas Aquinas, Catena Aurea, Oxford translation, J.G.F. and J. Rivington, London, 1842. Public domain. Attributions are those printed by the 1842 edition, including its own Pseudo- markings.";

// The speakers the 1842 volumes actually use, mapped onto the names the rest of
// the corpus uses. Pseudo- forms are deliberately distinct entries: they are a
// different claim about authorship, not a variant spelling.
// Right-hand side null means "keep the printed label as-is".
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

const raw = await load(vol.id);

// ---- 1. Split into chapters -------------------------------------------------
const chapterRe = /^[ \t]*Chapter (\d+)[ \t]*$/gm;
const marks = [...raw.matchAll(chapterRe)];
if (marks.length !== vol.chapters) {
  throw new Error(
    `expected ${vol.chapters} chapter headings for ${vol.bookName}, found ${marks.length}. ` +
      `Refusing to guess at chapter boundaries.`,
  );
}

const RULE = /_{20,}/;

/** Strip the transcription's hanging indent and rejoin wrapped lines. */
function paragraphs(block) {
  return block
    .split(/\n\s*\n/)
    .map((p) => p.replace(RULE, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

const unknown = new Map();
let noteCount = 0;
let blockCount = 0;
const out = new Map(); // chapter -> { verse -> notes[] }

for (let i = 0; i < marks.length; i++) {
  const chapter = Number(marks[i][1]);
  const body = raw.slice(
    marks[i].index + marks[i][0].length,
    i + 1 < marks.length ? marks[i + 1].index : raw.length,
  );

  // A lemma line is "   12. <scripture>". A run of them opens a block.
  const lines = body.split("\n");
  let pending = null; // { verse, buf: [] }
  const blocks = [];

  // Each block is: a run of numbered lemma lines quoting the passage, then a
  // rule, then the Fathers on it. The rule is the reliable boundary. Lemma text
  // wraps across lines, so anything before the rule is Scripture and is skipped,
  // and the block anchors on the FIRST verse of the run, matching
  // ingest-chrysostom-matthew.mjs: a note on Mark 1:1-3 belongs at verse 1.
  let state = "lemma";
  for (const line of lines) {
    const lemma = /^[ \t]{2,}(\d{1,3})\.\s+\S/.exec(line);
    if (lemma) {
      if (state === "notes") {
        if (pending) blocks.push(pending);
        pending = null;
      }
      state = "lemma";
      if (!pending) pending = { verse: Number(lemma[1]), buf: [] };
      continue;
    }
    if (RULE.test(line)) {
      state = "notes";
      continue;
    }
    if (state === "notes" && pending) pending.buf.push(line);
  }
  if (pending) blocks.push(pending);

  const byVerse = {};
  for (const b of blocks) {
    blockCount++;
    const paras = paragraphs(b.buf.join("\n"));
    const notes = [];
    for (const p of paras) {
      // "Bede:", "Pseudo-Chrys., Vict. Ant. e Cat. in Marc.:", "Aug., de Cons. Ev. ii, 4:"
      const m = /^([A-Z][A-Za-z'’\-]{1,24})\.?(?:,\s*([^:]{1,90}))?:\s+(.+)$/s.exec(p);
      if (m) {
        const label = m[1];
        const mapped = SPEAKERS.get(label);
        if (mapped === undefined) {
          unknown.set(label, (unknown.get(label) ?? 0) + 1);
          // Unknown label: treat as continuation so nothing is invented.
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
    const key = String(b.verse);
    byVerse[key] = (byVerse[key] ?? []).concat(notes);
    noteCount += notes.length;
  }
  out.set(chapter, byVerse);
}

if (unknown.size) {
  console.log(`\nUnrecognised speaker labels (folded into the previous note, none written as authors):`);
  [...unknown.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)
    .forEach(([l, n]) => console.log(`  ${String(n).padStart(4)}  ${l}`));
}

// ---- 2. Merge, never clobber ------------------------------------------------
const DIR = path.join("data", "bible", "commentary", vol.bookSlug);
fs.mkdirSync(DIR, { recursive: true });

let written = 0;
let kept = 0;
for (const [chapter, byVerse] of out) {
  const file = path.join(DIR, `${chapter}.json`);
  const existing = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};

  for (const verse of Object.keys(byVerse)) {
    const prior = existing[verse] ?? [];
    // Re-running must be idempotent: drop only this work's prior notes.
    const others = prior.filter((n) => n.citation !== CITATION);
    kept += others.length;
    existing[verse] = others.concat(byVerse[verse]);
  }

  const ordered = {};
  for (const k of Object.keys(existing).sort((a, b) => Number(a) - Number(b))) {
    ordered[k] = existing[k];
  }
  fs.writeFileSync(file, JSON.stringify(ordered, null, 2) + "\n", "utf8");
  written++;
}

console.log("");
console.log(`${vol.bookName}: ${blockCount} comment blocks -> ${noteCount} notes across ${written} chapters.`);
console.log(`Existing notes from other sources preserved: ${kept}.`);
console.log(SOURCE_NOTE);
