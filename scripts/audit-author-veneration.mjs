// Who is actually speaking in the commentary rail, and is the Church's answer
// to that person "saint"?
//
// WHY THIS EXISTS. The rail was built from whatever the public-domain volumes
// carried, and the Catena Aurea in particular quotes a very wide bench: Latin
// schoolmen, anonymous glosses, a Jewish historian, writers the Councils
// condemned, and a set of works the 1842 edition itself marks "Pseudo-". None of
// that is hidden, every note carries its author, but nobody had counted it.
//
// This script only reports. Removing a voice from the rail is an editorial
// decision with a real cost in coverage, and it is the owner's to make, so
// nothing here deletes anything.
//
// Run from the project root:
//   node scripts/audit-author-veneration.mjs
//   node scripts/audit-author-veneration.mjs --json

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DIR = path.join(ROOT, "data", "bible", "commentary");

// Venerated as a saint in the Eastern Orthodox Church. Western Fathers from
// before the schism are included where the Orthodox calendar keeps them, which
// is why Ambrose, Jerome, Leo, Gregory the Dialogist and Bede are here.
const EO_SAINTS = new Set([
  "St. John Chrysostom", "St. Augustine", "St. Augustine of Hippo", "St. Jerome",
  "St. Bede", "St. Gregory the Great", "St. Gregory of Nyssa",
  "St. Gregory the Theologian", "St. Basil the Great", "St. Cyril of Alexandria",
  "St. Ambrose", "St. Hilary of Poitiers", "St. Isidore", "St. Cyprian of Carthage",
  "St. Peter Chrysologus", "St. John Cassian", "St. John of Damascus",
  "St. Maximus the Confessor", "St. Athanasius the Great", "St. Leo the Great",
  "St. Victorinus of Pettau", "Blessed Theophylact",
  "St. Irenaeus of Lyons", "St. Ignatius of Antioch",
]);

// Not saints, with the reason. A reader is entitled to know which of these is a
// condemned teacher and which is merely an anonymous medieval note.
const NOT_SAINTS = new Map([
  ["Origen", "condemned at the Fifth Ecumenical Council, though read by the Fathers"],
  ["Eusebius", "historian, of Arian sympathies, never canonised"],
  ["Josephus", "a first-century Jewish historian, not a Christian writer"],
  ["The Gloss", "the anonymous medieval Glossa Ordinaria"],
  ["Anselm", "Latin scholastic, well after the schism"],
  ["Rabanus Maurus", "ninth-century Latin, not in the Orthodox calendar"],
  ["Haymo of Halberstadt", "ninth-century Latin, not in the Orthodox calendar"],
  ["Remigius", "Latin commentator, not in the Orthodox calendar"],
  ["Bagster", "a nineteenth-century publisher, not a Father at all"],
  ["Gennadius", "uncertain identity in the Catena's usage"],
  ["Victor of Antioch", "a commentator, never canonised"],
  ["Euthymius Zigabenus", "Byzantine commentator, not canonised"],
  ["Severianus of Gabala", "opponent of Chrysostom, not canonised"],
  ["Faustus of Riez", "semi-Pelagian, not canonised"],
  ["Ambrosiaster", "anonymous; the name means only 'not Ambrose'"],
  ["Nemesius of Emesa", "philosopher-bishop, not canonised"],
  ["Theodotus of Ancyra", "not in the Orthodox calendar"],
  ["Titus of Bostra", "not in the Orthodox calendar"],
  ["Tertullian", "ended his life a Montanist"],
]);

const counts = new Map();
for (const book of fs.readdirSync(DIR)) {
  const bookDir = path.join(DIR, book);
  if (!fs.statSync(bookDir).isDirectory()) continue;
  for (const file of fs.readdirSync(bookDir)) {
    if (!file.endsWith(".json")) continue;
    const doc = JSON.parse(fs.readFileSync(path.join(bookDir, file), "utf8"));
    for (const verse of Object.keys(doc)) {
      for (const note of doc[verse]) {
        const key = note.author;
        if (!counts.has(key)) counts.set(key, { notes: 0, books: new Set() });
        const row = counts.get(key);
        row.notes++;
        row.books.add(book);
      }
    }
  }
}

function classify(author) {
  if (EO_SAINTS.has(author)) return { status: "saint", why: "" };
  if (author.startsWith("Pseudo-")) {
    return { status: "pseudonymous", why: "the edition itself marks the attribution false" };
  }
  if (NOT_SAINTS.has(author)) return { status: "not a saint", why: NOT_SAINTS.get(author) };
  return { status: "unclassified", why: "not yet placed; decide before any purge" };
}

const rows = [...counts.entries()]
  .map(([author, row]) => ({ author, notes: row.notes, books: row.books.size, ...classify(author) }))
  .sort((a, b) => b.notes - a.notes);

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
}

const total = rows.reduce((n, r) => n + r.notes, 0);
const byStatus = new Map();
for (const r of rows) {
  byStatus.set(r.status, (byStatus.get(r.status) ?? 0) + r.notes);
}

console.log("");
console.log(`WHO IS SPEAKING  (${rows.length} authors, ${total.toLocaleString("en-US")} notes)`);
console.log("");
for (const status of ["saint", "pseudonymous", "not a saint", "unclassified"]) {
  const n = byStatus.get(status) ?? 0;
  console.log(`  ${status.padEnd(15)} ${String(n).padStart(6)} notes  ${((n / total) * 100).toFixed(1)}%`);
}
console.log("");

for (const status of ["pseudonymous", "not a saint", "unclassified"]) {
  const group = rows.filter((r) => r.status === status);
  if (!group.length) continue;
  console.log(`${status.toUpperCase()}`);
  for (const r of group) {
    console.log(`  ${String(r.notes).padStart(5)}  ${r.author.padEnd(34)}${r.why}`);
  }
  console.log("");
}

// What a strict purge would cost, per book, in voices and in whole verses left
// with nothing to say.
console.log("WHAT A STRICT PURGE WOULD COST");
const keep = new Set(rows.filter((r) => r.status === "saint").map((r) => r.author));
for (const book of fs.readdirSync(DIR)) {
  const bookDir = path.join(DIR, book);
  if (!fs.statSync(bookDir).isDirectory()) continue;
  let before = 0;
  let after = 0;
  let versesEmptied = 0;
  const voicesBefore = new Set();
  const voicesAfter = new Set();
  for (const file of fs.readdirSync(bookDir)) {
    if (!file.endsWith(".json")) continue;
    const doc = JSON.parse(fs.readFileSync(path.join(bookDir, file), "utf8"));
    for (const verse of Object.keys(doc)) {
      const notes = doc[verse];
      const kept = notes.filter((x) => keep.has(x.author));
      before += notes.length;
      after += kept.length;
      notes.forEach((x) => voicesBefore.add(x.author));
      kept.forEach((x) => voicesAfter.add(x.author));
      if (notes.length && !kept.length) versesEmptied++;
    }
  }
  if (before === after) continue;
  console.log(
    `  ${book.padEnd(16)} ${String(before).padStart(5)} -> ${String(after).padStart(5)} notes ` +
      `(${String(before - after).padStart(5)} lost), voices ${voicesBefore.size} -> ${voicesAfter.size}, ` +
      `${versesEmptied} verses left with nothing`,
  );
}
console.log("");
