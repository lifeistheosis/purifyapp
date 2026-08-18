// Keep only voices the Eastern Orthodox Church venerates as saints.
//
// WHY. The commentary rail was assembled from whatever the public-domain volumes
// carried, and the Catena Aurea quotes a very wide bench. An Orthodox library
// showing a reader "Rabanus Maurus" or "The Gloss" beside the Fathers is making
// a claim about authority that the Church does not make. This applies the rule.
//
// WHAT IT IS NOT. This is not a judgement that the removed writers are worthless
// or that their text is unsound. Origen was read by every Father in this corpus.
// It is a judgement about whose voice belongs in a rail a layperson reads as the
// mind of the Church.
//
// REVERSIBLE ON PURPOSE. Nothing is rewritten by hand; this filters the shipped
// JSON and prints exactly what it removed. The removals live in git, and the
// policy is the two sets below, so widening or narrowing it is a one-line edit
// and a re-run of the ingests.
//
// Run from the project root:
//   node scripts/apply-eo-saints-only.mjs            report only
//   node scripts/apply-eo-saints-only.mjs --apply    write

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DIR = path.join(ROOT, "data", "bible", "commentary");
const apply = process.argv.includes("--apply");

// Venerated in the Orthodox calendar. Western Fathers from before the schism are
// included where the calendar keeps them.
const KEEP = new Set([
  "St. John Chrysostom", "St. Augustine", "St. Augustine of Hippo", "St. Jerome",
  "St. Bede", "St. Gregory the Great", "St. Gregory of Nyssa",
  "St. Gregory the Theologian", "St. Basil the Great", "St. Cyril of Alexandria",
  "St. Ambrose", "St. Hilary of Poitiers", "St. Isidore of Seville", "St. Cyprian of Carthage",
  "St. Peter Chrysologus", "St. John Cassian", "St. John of Damascus",
  "St. Maximus the Confessor", "St. Athanasius the Great", "St. Leo the Great",
  "St. Victorinus of Pettau", "Blessed Theophylact", "St. Irenaeus of Lyons",
  "St. Ignatius of Antioch",
]);

// One deliberate exception, and the reason for it. The Corpus Areopagiticum is
// pseudonymous and the Church has always known it, yet it is quoted as authority
// by St Maximus the Confessor and St Gregory Palamas and stands behind Orthodox
// theology of the divine names and the uncreated light. Removing it as "not a
// saint" would be a mechanical answer to a question the tradition has already
// answered differently.
const KEEP_ANYWAY = new Set(["Pseudo-Dionysius the Areopagite"]);

const keeps = (author) => KEEP.has(author) || KEEP_ANYWAY.has(author);

const removed = new Map();
let before = 0;
let after = 0;
let versesEmptied = [];
let filesChanged = 0;

for (const book of fs.readdirSync(DIR)) {
  const bookDir = path.join(DIR, book);
  if (!fs.statSync(bookDir).isDirectory()) continue;
  for (const file of fs.readdirSync(bookDir)) {
    if (!file.endsWith(".json")) continue;
    const full = path.join(bookDir, file);
    const doc = JSON.parse(fs.readFileSync(full, "utf8"));
    let touched = false;
    const out = {};
    for (const verse of Object.keys(doc)) {
      const notes = doc[verse];
      before += notes.length;
      const kept = notes.filter((n) => {
        if (keeps(n.author)) return true;
        removed.set(n.author, (removed.get(n.author) ?? 0) + 1);
        return false;
      });
      after += kept.length;
      if (kept.length !== notes.length) touched = true;
      if (!kept.length) {
        if (notes.length) versesEmptied.push(`${book} ${file.replace(".json", "")}:${verse}`);
        continue;
      }
      out[verse] = kept;
    }
    if (!touched) continue;
    filesChanged++;
    if (apply) {
      const ordered = {};
      for (const k of Object.keys(out).sort((a, b) => Number(a) - Number(b))) ordered[k] = out[k];
      fs.writeFileSync(full, JSON.stringify(ordered, null, 2) + "\n", "utf8");
    }
  }
}

console.log("");
console.log(`Notes ${before.toLocaleString("en-US")} -> ${after.toLocaleString("en-US")} ` +
  `(${(before - after).toLocaleString("en-US")} removed from ${filesChanged} files)`);
console.log("");
console.log("Removed, commonest first:");
for (const [author, n] of [...removed.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(5)}  ${author}`);
}
console.log("");
if (versesEmptied.length) {
  console.log(`Verses left with no note at all (${versesEmptied.length}): ${versesEmptied.join(", ")}`);
  console.log("");
}
console.log(apply ? "MODE: APPLIED (files written)" : "MODE: dry run (use --apply to write)");
console.log("");
