// What the corpus actually holds, measured rather than remembered.
//
// WHY THIS EXISTS. "How much is left" has been answered by hand every time it
// was asked, which means it has been answered differently every time and no
// answer survived the session that produced it. Coverage is a fact on disk. It
// should be a command.
//
// It reports three things the planning documents keep needing:
//   1. Commentary reach: chapters carrying at least one note, against every
//      chapter we ship, per book, with the author count so a book carried by a
//      single voice is visible as such.
//   2. Saints: how many ship no writings at all, which is the other half of the
//      corpus and is invisible from the Bible side.
//   3. Registry drift: books with commentary on disk that COMMENTED_BOOKS does
//      not name. That exact gap shipped Mark's 2,948 notes dark.
//
// Run from the project root:
//   node scripts/audit-corpus-coverage.mjs              full report
//   node scripts/audit-corpus-coverage.mjs --json       machine readable
//   node scripts/audit-corpus-coverage.mjs --gaps       only what is missing
//
// Exits non-zero when the registry disagrees with the data, so it can gate.

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const BIBLE = path.join(ROOT, "data", "bible");
const COMMENTARY = path.join(BIBLE, "commentary");
const SAINTS = path.join(ROOT, "data", "saints");
const INDEX = path.join(ROOT, "lib", "bible", "commentary-index.ts");

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const gapsOnly = args.includes("--gaps");

// Directories under data/bible that are not books.
const NOT_A_BOOK = new Set(["commentary", "original", "cross-refs", "english-tagged", "intros"]);

function dirs(where) {
  if (!fs.existsSync(where)) return [];
  return fs
    .readdirSync(where, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

function chapterFiles(where) {
  if (!fs.existsSync(where)) return [];
  return fs.readdirSync(where).filter((f) => /^\d+\.json$/.test(f));
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

// ---- Commentary reach --------------------------------------------------------

const books = [];
for (const slug of dirs(BIBLE)) {
  if (NOT_A_BOOK.has(slug)) continue;
  const chapters = chapterFiles(path.join(BIBLE, slug)).length;
  if (!chapters) continue;

  const commentaryDir = path.join(COMMENTARY, slug);
  const covered = [];
  const authors = new Set();
  const citations = new Set();
  let notes = 0;
  let words = 0;

  for (const f of chapterFiles(commentaryDir)) {
    const doc = readJson(path.join(commentaryDir, f));
    let inChapter = 0;
    for (const verse of Object.keys(doc)) {
      for (const note of doc[verse]) {
        inChapter++;
        notes++;
        authors.add(note.author);
        if (note.citation) citations.add(note.citation);
        words += String(note.text ?? "").split(/\s+/).length;
      }
    }
    if (inChapter) covered.push(Number(f.replace(".json", "")));
  }

  books.push({
    slug,
    chapters,
    covered: covered.length,
    notes,
    words,
    authors: [...authors].sort(),
    citations: [...citations].sort(),
  });
}

const totalChapters = books.reduce((n, b) => n + b.chapters, 0);
const coveredChapters = books.reduce((n, b) => n + b.covered, 0);
const totalNotes = books.reduce((n, b) => n + b.notes, 0);
const empty = books.filter((b) => !b.notes);
const singleVoice = books.filter((b) => b.notes && b.authors.length === 1);

// ---- Saints ------------------------------------------------------------------
//
// Counted from the registry, not from data/saints/. A saint with no writings has
// no directory at all, so walking the filesystem answers "how many saints have
// files" and reports zero gaps, which is the opposite of the truth. The registry
// is the list of saints the app believes in; `works: []` is the gap.

const SAINTS_REGISTRY = path.join(ROOT, "lib", "saints", "saints.ts");

let saintTotal = 0;
let saintsWithNothing = [];
let saintsReadable = true;
try {
  const src = fs.readFileSync(SAINTS_REGISTRY, "utf8");
  saintsWithNothing = [];

  // Nesting has to be tracked, not guessed. Indentation in this file is not
  // uniform (saint keys sit at one space in some entries and four in others),
  // and a saint's own `works` array contains objects that carry a `slug` of
  // their own. A regex pairing each slug with the next `works:` therefore reads
  // a work's slug as if it were a saint's, and reports work names like
  // "the-tome-of-leo" and "institutes" as saints shipping nothing. Depth is the
  // only thing that separates them reliably.
  let depth = 0;
  let inString = null;
  let saintSlug = null;
  let saintDepth = null;

  const lines = src.split("\n");
  for (const line of lines) {
    const before = depth;

    const slug = /^[ \t]*slug:\s*"([^"]+)"/.exec(line);
    const works = /^[ \t]*works:\s*(\[\]?)/.exec(line);

    // A saint object sits one level inside the exported array. Anything deeper
    // is one of its works.
    if (slug && (saintDepth === null || before === saintDepth)) {
      saintSlug = slug[1];
      saintDepth = before;
    }
    if (works && saintDepth !== null && before === saintDepth) {
      saintTotal++;
      if (works[1] === "[]" && saintSlug) saintsWithNothing.push(saintSlug);
    }

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inString) {
        if (ch === "\\") i++;
        else if (ch === inString) inString = null;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === "`") inString = ch;
      else if (ch === "{" || ch === "[") depth++;
      else if (ch === "}" || ch === "]") depth--;
    }
  }

  // Count only `works:` keys that carry a value. The `Saint` type declares
  // `works: Work[];` too, and counting that made the total read 150.
  const declared = (src.match(/^[ \t]*works:\s*\[/gm) ?? []).length;
  if (saintTotal !== declared) {
    throw new Error(`walked ${saintTotal} saints but the file declares ${declared} works arrays`);
  }
} catch (err) {
  saintsReadable = false;
  console.error(`Could not read ${path.relative(ROOT, SAINTS_REGISTRY)}: ${err.message}`);
}

// A saint whose directory holds a real work while the registry still says
// `works: []` is text shipping dark. `licensed-works.json` does not count: that
// file points at third-party books we recommend and cannot carry, so it is
// expected alongside an empty works array rather than a contradiction of it.
const saintsWithFilesOnDisk = new Set(
  dirs(SAINTS).filter((slug) =>
    fs
      .readdirSync(path.join(SAINTS, slug))
      .some((f) => f.endsWith(".json") && f !== "licensed-works.json"),
  ),
);

// ---- Registry drift ----------------------------------------------------------
// Parsed from the source rather than imported: this script is plain node and the
// index is TypeScript. The shape is a flat list of quoted slugs, so a regex over
// the Set literal is honest here, and a parse that finds nothing is an error
// rather than a silently empty answer.

let registered = new Set();
let registryReadable = true;
try {
  const src = fs.readFileSync(INDEX, "utf8");
  const literal = /COMMENTED_BOOKS[^=]*=\s*new Set\(\[([\s\S]*?)\]\)/.exec(src);
  if (!literal) throw new Error("COMMENTED_BOOKS literal not found");
  registered = new Set([...literal[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]));
  if (!registered.size) throw new Error("COMMENTED_BOOKS parsed empty");
} catch (err) {
  registryReadable = false;
  console.error(`Could not read ${path.relative(ROOT, INDEX)}: ${err.message}`);
}

const withData = new Set(books.filter((b) => b.notes).map((b) => b.slug));
const unregistered = [...withData].filter((s) => !registered.has(s)).sort();
const overRegistered = [...registered].filter((s) => !withData.has(s)).sort();

// ---- Report ------------------------------------------------------------------

const pct = (a, b) => (b ? ((a / b) * 100).toFixed(1) : "0.0");

if (asJson) {
  console.log(
    JSON.stringify(
      {
        chapters: { covered: coveredChapters, total: totalChapters, pct: Number(pct(coveredChapters, totalChapters)) },
        notes: totalNotes,
        books: books.map(({ slug, chapters, covered, notes, authors, citations }) => ({
          slug, chapters, covered, notes, authors, citations,
        })),
        booksAtZero: empty.map((b) => b.slug),
        singleVoiceBooks: singleVoice.map((b) => b.slug),
        saints: { total: saintTotal, withNoWorks: saintsWithNothing },
        registry: { unregistered, overRegistered },
      },
      null,
      2,
    ),
  );
  process.exit(unregistered.length ? 1 : 0);
}

const bar = (a, b, width = 24) => {
  const filled = b ? Math.round((a / b) * width) : 0;
  return "#".repeat(filled) + ".".repeat(width - filled);
};

if (!gapsOnly) {
  console.log("");
  console.log("COMMENTARY REACH");
  console.log(
    `  ${coveredChapters} of ${totalChapters} chapters (${pct(coveredChapters, totalChapters)}%), ` +
      `${totalNotes.toLocaleString("en-US")} notes, ${withData.size} books carrying anything.`,
  );
  console.log("");

  const carrying = books.filter((b) => b.notes).sort((a, b) => b.notes - a.notes);
  const w = Math.max(...carrying.map((b) => b.slug.length));
  for (const b of carrying) {
    const voices = b.authors.length === 1 ? "1 voice" : `${b.authors.length} voices`;
    console.log(
      `  ${b.slug.padEnd(w)}  ${bar(b.covered, b.chapters)}  ` +
        `${String(b.covered).padStart(3)}/${String(b.chapters).padEnd(3)}  ` +
        `${String(b.notes).padStart(5)} notes  ${voices}`,
    );
  }
  console.log("");
}

console.log("GAPS");
console.log(`  ${empty.length} books carry nothing at all.`);
const gospelGap = empty.filter((b) => ["matthew", "mark", "luke", "john"].includes(b.slug));
if (gospelGap.length) {
  console.log(`    Gospels among them: ${gospelGap.map((b) => `${b.slug} (0/${b.chapters})`).join(", ")}`);
}
const biggest = empty.slice().sort((a, b) => b.chapters - a.chapters).slice(0, 8);
console.log(`    Largest: ${biggest.map((b) => `${b.slug} (${b.chapters})`).join(", ")}`);
console.log(`  ${singleVoice.length} books rest on a single author.`);
if (saintsReadable) {
  console.log(`  ${saintsWithNothing.length} of ${saintTotal} saints ship no writings (works: []).`);
  const orphaned = [...saintsWithFilesOnDisk].filter((d) => saintsWithNothing.includes(d));
  if (orphaned.length) {
    console.log(`    DARK: a work on disk with works: [] in the registry: ${orphaned.join(", ")}`);
  }
} else {
  console.log("  Saints could not be counted. Fix the error above.");
}
console.log("");

console.log("REGISTRY");
if (!registryReadable) {
  console.log("  Could not be checked. Fix the error above before trusting this run.");
} else if (!unregistered.length && !overRegistered.length) {
  console.log("  COMMENTED_BOOKS agrees with the data.");
} else {
  for (const slug of unregistered) {
    const b = books.find((x) => x.slug === slug);
    console.log(`  MISSING  ${slug}: ${b.notes} notes on disk, not named in COMMENTED_BOOKS, so unreachable.`);
  }
  for (const slug of overRegistered) {
    console.log(`  STALE    ${slug}: named in COMMENTED_BOOKS with no notes on disk.`);
  }
}
console.log("");

// An unregistered book is data shipping dark, which is the one failure this
// script exists to prevent. A stale entry is only cosmetic, so it does not gate.
process.exit(unregistered.length && registryReadable ? 1 : 0);
