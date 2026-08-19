// Screen the commentary rail for teaching the Orthodox Church does not hold.
//
// WHY THIS IS NOT THE SAME AS THE VENERATION AUDIT.
// scripts/audit-author-veneration.mjs answers "is this speaker a saint", and the
// rail is now 100% saints. That is an author-level fact and it does not settle
// the question. Fathers the Church venerates still wrote sentences the Church
// did not follow: St Victorinus expects a literal thousand-year reign, the Latin
// Fathers speak of the Spirit in language the East reads as the filioque, and
// Augustine on grace and inherited guilt is read very differently in the two
// halves of Christendom. Heterodoxy, where it exists here, is in the notes.
//
// WHAT THIS SCRIPT DOES AND DOES NOT DO. It flags notes containing markers of
// contested teaching and prints them with author, location and the sentence that
// matched. It makes no judgement. Most hits will be innocent: "thousand years"
// is usually a quotation of the Apocalypse, not chiliasm, and "the chair of
// Peter" is often just a place. Deciding which flag is a real problem is a
// clergy question, and docs/editorial-standards.md keeps a queue for exactly
// that. NOTHING IS DELETED HERE. A script must never resolve a doctrinal
// question by itself, which is the standing rule for AI agents in this repo.
//
// Run from the project root:
//   node scripts/audit-doctrinal-flags.mjs
//   node scripts/audit-doctrinal-flags.mjs --full     every hit, not a sample
//   node scripts/audit-doctrinal-flags.mjs --topic filioque

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DIR = path.join(ROOT, "data", "bible", "commentary");

const args = process.argv.slice(2);
const full = args.includes("--full");
const onlyTopic = args.includes("--topic") ? args[args.indexOf("--topic") + 1] : null;

/**
 * Each topic names a teaching the Orthodox Church does not hold, or holds
 * differently from the Latin West, with patterns that tend to accompany it.
 * The patterns are deliberately broad: a screen that misses is worse than a
 * screen that over-reports, because a person reads the output either way.
 */
const TOPICS = [
  {
    key: "chiliasm",
    label: "Chiliasm, a literal thousand-year reign on earth",
    why: "The Church confesses a kingdom that shall have no end. Victorinus writes before that was settled and is already in the clergy queue.",
    patterns: [
      /\bthousand years?\b/i,
      /\bfirst resurrection\b/i,
      /\breign (?:with|of) Christ (?:up)?on (?:the )?earth\b/i,
      /\bmillenn/i,
    ],
  },
  {
    key: "filioque",
    label: "The procession of the Holy Spirit from the Son",
    why: "The Creed confesses the Spirit proceeding from the Father. Latin Fathers sometimes use language the East reads as the filioque.",
    patterns: [
      /Spirit[^.]{0,80}proceed(?:s|eth|ing)?[^.]{0,60}\bfrom the Son\b/i,
      /proceed(?:s|eth|ing)?[^.]{0,40}from the Father and the Son/i,
    ],
  },
  {
    key: "purgatory",
    label: "A purgatorial state of satisfaction after death",
    why: "The Orthodox Church prays for the departed but does not teach a purgatory of satisfaction.",
    patterns: [/\bpurgator/i, /\bpurging fire\b/i, /\btemporal punishment\b/i],
  },
  {
    key: "papal-supremacy",
    label: "Universal jurisdiction of the see of Rome",
    why: "Primacy of honour is not the same claim as supremacy of jurisdiction.",
    patterns: [
      /\bchair of (?:St\.? )?Peter\b/i,
      /\bsupremacy\b/i,
      /\bvicar of Christ\b/i,
      /\bhead of the (?:whole|universal) church\b/i,
    ],
  },
  {
    key: "inherited-guilt",
    label: "Inherited guilt, and absolute predestination",
    why: "The East teaches inherited mortality and corruption rather than inherited guilt, and rejects predestination that overrides freedom.",
    patterns: [
      /\bguilt of Adam\b/i,
      /\boriginal guilt\b/i,
      /\bmass of perdition\b/i,
      /\bpredestinat/i,
      /\birresistib/i,
    ],
  },
  {
    key: "immaculate-conception",
    label: "The Theotokos conceived without ancestral sin",
    why: "A Latin dogma of 1854, not an Orthodox one.",
    patterns: [/\bimmaculate conception\b/i, /\bconceived without (?:original |ancestral )?sin\b/i],
  },
];

const topics = onlyTopic ? TOPICS.filter((t) => t.key === onlyTopic) : TOPICS;
if (!topics.length) {
  console.error(`Unknown topic. Try one of: ${TOPICS.map((t) => t.key).join(", ")}`);
  process.exit(1);
}

const hits = new Map(topics.map((t) => [t.key, []]));
let scanned = 0;

for (const book of fs.readdirSync(DIR)) {
  const bookDir = path.join(DIR, book);
  if (!fs.statSync(bookDir).isDirectory()) continue;
  for (const file of fs.readdirSync(bookDir)) {
    if (!file.endsWith(".json")) continue;
    const chapter = file.replace(".json", "");
    const doc = JSON.parse(fs.readFileSync(path.join(bookDir, file), "utf8"));
    for (const verse of Object.keys(doc)) {
      for (const note of doc[verse]) {
        scanned++;
        for (const topic of topics) {
          for (const re of topic.patterns) {
            const m = re.exec(note.text);
            if (!m) continue;
            // The sentence around the match, so a reader can judge without
            // opening the file.
            const at = m.index;
            const from = note.text.lastIndexOf(".", at) + 1;
            const to = note.text.indexOf(".", at + m[0].length);
            const sentence = note.text
              .slice(from, to === -1 ? at + 160 : to + 1)
              .replace(/\s+/g, " ")
              .trim();
            hits.get(topic.key).push({
              where: `${book} ${chapter}:${verse}`,
              author: note.author,
              work: note.work,
              sentence,
            });
            break; // one hit per note per topic is enough to review it
          }
        }
      }
    }
  }
}

console.log("");
console.log(`DOCTRINAL SCREEN  (${scanned.toLocaleString("en-US")} notes scanned)`);
console.log("");
console.log("This flags language, not error. Every hit needs a person. Nothing is deleted.");
console.log("");

let total = 0;
for (const topic of topics) {
  const rows = hits.get(topic.key);
  total += rows.length;
  console.log(`${topic.label}`);
  console.log(`  ${rows.length} note(s) flagged. ${topic.why}`);
  if (rows.length) {
    const byAuthor = new Map();
    for (const r of rows) byAuthor.set(r.author, (byAuthor.get(r.author) ?? 0) + 1);
    console.log(
      `  by author: ${[...byAuthor.entries()].sort((a, b) => b[1] - a[1]).map(([a, n]) => `${a} ${n}`).join(", ")}`,
    );
    for (const r of full ? rows : rows.slice(0, 3)) {
      console.log(`    ${r.where.padEnd(18)} ${r.author}`);
      console.log(`      "${r.sentence.slice(0, 160)}"`);
    }
    if (!full && rows.length > 3) console.log(`    ... ${rows.length - 3} more, use --full`);
  }
  console.log("");
}

console.log(`${total} flag(s) in total, across ${scanned.toLocaleString("en-US")} notes.`);
console.log("Queue anything real in docs/editorial-standards.md under clergy review.");
console.log("");
