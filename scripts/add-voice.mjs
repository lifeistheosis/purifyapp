/**
 * One-time migration: stamp an explicit `voice` on every section.
 *
 * Until now, "is this the saint speaking?" was inferred by regex over the
 * work's prose `source` string. That inference was wrong in both directions:
 * Seraphim's instructions read as "Compiled from..." and were misread as a
 * retelling though they are verbatim, while Nicholas's troparion is verbatim
 * text that he did not write. Attribution cannot be guessed from prose.
 *
 * Classification below was made by reading all 48 sections. Anything not
 * listed is the saint's own words.
 *
 * Run: node scripts/add-voice.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DIR = path.join(process.cwd(), "data", "saints");

// "{saint}/{work}": { [sectionNumber]: voice }
const OVERRIDES = {
  // Purify's own prose about the saint. Slated for replacement with the
  // real public-domain text; marked honestly until then.
  "augustine-of-hippo/tractates-on-john": { 1: "editorial", 2: "editorial" },
  "cyril-of-alexandria/commentary-on-john": { 1: "editorial", 2: "editorial" },
  "irenaeus-of-lyons/against-heresies-on-john": { 1: "editorial", 2: "editorial" },
  "john-chrysostom/homilies-on-john": { 1: "editorial", 2: "editorial" },
  // A Life is written *about* its subject, by another hand. Even verbatim,
  // Mary of Egypt is the subject here, not the author.
  "mary-of-egypt/life-by-sophronius": { 1: "editorial", 2: "editorial" },
  // 1 is a retold story, 2 is the Byzantine troparion: verbatim, but
  // hymnography, not Nicholas's own writing.
  "nicholas-the-wonderworker/stories-and-prayers": { 1: "editorial", 2: "liturgical" },
  // Canonical Scripture, quoted exactly.
  "apostle-paul/letter-from-the-prison": { 1: "scripture", 2: "scripture" },
};

let touched = 0;
for (const saint of fs.readdirSync(DIR)) {
  for (const file of fs.readdirSync(path.join(DIR, saint))) {
    const key = `${saint}/${file.replace(/\.json$/, "")}`;
    const full = path.join(DIR, saint, file);
    const doc = JSON.parse(fs.readFileSync(full, "utf8"));
    const over = OVERRIDES[key] ?? {};

    for (const section of doc.sections) {
      section.voice = over[section.n] ?? "saint";
    }
    fs.writeFileSync(full, JSON.stringify(doc, null, 2) + "\n", "utf8");
    touched++;
  }
}
console.log(`stamped voice on ${touched} works`);
