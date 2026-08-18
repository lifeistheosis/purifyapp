// Cut the printed back-matter index out of commentary notes.
//
// WHAT WENT WRONG. Several NPNF volumes end with an alphabetical index of
// subjects. The homily ingests slice a book's region from its first homily to
// the next book's, and for the LAST book in a volume there is no next book, so
// the region ran to the end of the file and the closing verse swallowed the
// index. A reader opening the last verse of Philemon was shown "Zenas, the
// lawyer, 541." over St John Chrysostom's name.
//
// Fourteen notes carried index-shaped runs. The worst were 24,654 words at
// Philemon 1:25 and 22,854 at Hebrews 13:24, and together they account for a
// good share of the notes over 5,000 words that commentaryIntegrity.test.ts
// ratchets on: those were never long homilies, they were indexes.
//
// WHY A CLEANER RATHER THAN A RE-INGEST. Same reason
// scripts/clean-commentary-footnotes.mjs exists and is part of the loop. Fixing
// the region boundaries would be better, but it needs every affected volume
// re-downloaded and re-run, and each re-run reintroduces the footnote apparatus
// that the sibling cleaner strips. This is deterministic, idempotent and
// reviewable, and it cuts only at a header the edition itself prints.
//
// IT CUTS ONLY AT A PRINTED HEADER. "INDEX OF SUBJECTS", "INDEXES OF SUBJECTS",
// "GENERAL INDEX". No heuristic guessing at where prose stops, because a wrong
// cut here silently deletes a Father. A note that looks index-shaped but has no
// such header is reported and left alone for a person to look at.
//
// Run from the project root:
//   node scripts/clean-commentary-indexes.mjs           report only
//   node scripts/clean-commentary-indexes.mjs --apply   write

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DIR = path.join(ROOT, "data", "bible", "commentary");
const apply = process.argv.includes("--apply");

/** The header the volume itself prints before its back matter. */
const INDEX_HEADER = /^[ \t]*(?:INDEXE?S?\s+OF\s+SUBJECTS|GENERAL\s+INDEX|INDEXE?S?\s+TO\s+)/im;

/** Many short "term, 123; term, 456." runs, which prose almost never produces. */
const INDEX_SHAPED =
  /(?:[a-z][^,;.]{2,40},\s*(?:ib\.|\d{1,4})\s*[;.])(?:[^;]{0,60}(?:ib\.|\d{1,4})\s*[;.]){4,}/i;

const cut = [];
const flagged = [];
let filesChanged = 0;
let wordsRemoved = 0;

for (const book of fs.readdirSync(DIR)) {
  const bookDir = path.join(DIR, book);
  if (!fs.statSync(bookDir).isDirectory()) continue;
  for (const file of fs.readdirSync(bookDir)) {
    if (!file.endsWith(".json")) continue;
    const full = path.join(bookDir, file);
    const doc = JSON.parse(fs.readFileSync(full, "utf8"));
    let touched = false;

    for (const verse of Object.keys(doc)) {
      const kept = [];
      for (const note of doc[verse]) {
        const at = note.text.search(INDEX_HEADER);
        if (at === -1) {
          if (INDEX_SHAPED.test(note.text)) {
            flagged.push({
              where: `${book} ${file.replace(".json", "")}:${verse}`,
              author: note.author,
              words: note.text.split(/\s+/).length,
            });
          }
          kept.push(note);
          continue;
        }
        const before = note.text.split(/\s+/).length;
        const trimmed = note.text.slice(0, at).trim();
        const after = trimmed ? trimmed.split(/\s+/).length : 0;
        wordsRemoved += before - after;
        cut.push({
          where: `${book} ${file.replace(".json", "")}:${verse}`,
          author: note.author,
          before,
          after,
        });
        touched = true;
        // A note that was nothing but index leaves the rail entirely.
        if (after >= 25) kept.push({ ...note, text: trimmed });
      }
      if (kept.length) doc[verse] = kept;
      else delete doc[verse];
    }

    if (!touched) continue;
    filesChanged++;
    if (apply) {
      const ordered = {};
      for (const k of Object.keys(doc).sort((a, b) => Number(a) - Number(b))) ordered[k] = doc[k];
      fs.writeFileSync(full, JSON.stringify(ordered, null, 2) + "\n", "utf8");
    }
  }
}

console.log("");
console.log("=== Cut at a printed index header ===");
for (const c of cut.sort((a, b) => b.before - a.before)) {
  console.log(
    `  ${c.where.padEnd(22)} ${String(c.before).padStart(6)}w -> ${String(c.after).padStart(5)}w   ${c.author}`,
  );
}
console.log("");
if (flagged.length) {
  console.log("=== Index-shaped but NO printed header, left alone for review ===");
  for (const f of flagged.sort((a, b) => b.words - a.words)) {
    console.log(`  ${f.where.padEnd(22)} ${String(f.words).padStart(6)}w   ${f.author}`);
  }
  console.log("");
}
console.log("────────────────────────────");
console.log(`Notes cut:      ${cut.length}`);
console.log(`Files changed:  ${filesChanged}`);
console.log(`Words removed:  ${wordsRemoved.toLocaleString("en-US")}`);
console.log(`Left flagged:   ${flagged.length}`);
console.log(apply ? "MODE: APPLIED (files written)" : "MODE: dry run (use --apply to write)");
console.log("");
