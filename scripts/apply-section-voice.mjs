// Writes `voice` (and `voiceAuthor`) into the saints corpus.
//
// EVERY LABEL HERE WAS READ BEFORE IT WAS WRITTEN. That is not ceremony:
// the whole reason `voice` exists is that inference gets attribution wrong,
// and a wrong label is worse than none because it is emitted as structured
// data and looks authoritative. Two rules survived checking; everything
// else is an explicit entry below, decided by reading the section.
//
// What checking actually found, and why the rules are this narrow:
//
//   - The convention documented on the Section type (framing without a
//     citation means a retelling) is roughly a coin flip in practice.
//     Ignatius's "Salutation" and Justin's "Address" have framing and no
//     citation and are the saints' own opening words. Applying that
//     convention mechanically would have mislabelled 11 sections.
//   - A work's prose `source` cannot be read either. St Seraphim's
//     Instructions are "Compiled from the saint's oral teaching", which
//     describes how they were gathered, not who spoke them.
//   - The Martyrdom of Polycarp is the encyclical of the church of Smyrna
//     and opens by naming itself as such. It is on Polycarp's page. Nothing
//     in the data said it was not his.
//
// Usage:  node scripts/apply-section-voice.mjs [--write]
// Without --write it prints the diff and changes nothing.

import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(process.cwd(), "data", "saints");
const WRITE = process.argv.includes("--write");

// ── Rule 1: verbatim Scripture ───────────────────────────────────────────
// Citation names a book of Scripture AND a translation. Checked across all
// 42 matches: each one's paragraphs are the quoted passage. High value,
// because e.g. Andrew's first section is John 1:35-42, the Evangelist's
// words about Andrew, which a naive "Book by Andrew" would misattribute.
const SCRIPTURE_BOOK =
  /\b(genesis|exodus|leviticus|numbers|deuteronomy|joshua|judges|ruth|samuel|kings|chronicles|ezra|nehemiah|job|psalms?|proverbs|ecclesiastes|song of|isaiah|jeremiah|lamentations|ezekiel|daniel|hosea|joel|amos|obadiah|jonah|micah|nahum|habakkuk|zephaniah|haggai|zechariah|malachi|sirach|wisdom|tobit|judith|maccabees|matthew|mark|luke|john|acts|romans|corinthians|galatians|ephesians|philippians|colossians|thessalonians|timothy|titus|philemon|hebrews|james|peter|jude|revelation)\b/i;
const TRANSLATION = /\((kjv|lxx|brenton|septuagint)\)/i;

// ── Rule 2: verbatim liturgical text ─────────────────────────────────────
// The title names a liturgical form. These are the Church's words, usually
// ABOUT the saint. Checked all 14: every one is a hymn, not a writing.
const LITURGICAL_TITLE =
  /\b(troparion|kontakion|apolytikion|megalynarion|sticheron|stichera|exapostilarion|theotokion|magnification)\b/i;

// ── Everything else: read, then listed ───────────────────────────────────
// Key is "saintDir/workSlug/sectionN", or "saintDir/workSlug/*" for a whole
// work. Value is [voice, voiceAuthor?] with a note on why.
const DECIDED = {
  // Athanasius narrating his own Life of Antony. Not Antony's words.
  "anthony-the-great/miracles/1": ["witness", "Athanasius of Alexandria"],
  "anthony-the-great/miracles/9": ["witness", "Athanasius of Alexandria"],
  "anthony-the-great/miracles/10": ["witness", "Athanasius of Alexandria"],
  // Sozomen's Church History on the election of Nectarius.
  "nectarius-of-constantinople/the-senator-bishop/1": ["witness", "Sozomen"],
  // Ambrose's funeral oration, abridged, on Theodosius's penance.
  "theodosius-the-great/the-edict-and-the-penance/3": ["witness", "Ambrose of Milan"],
  // The whole work is the encyclical of the church of Smyrna about him.
  "polycarp-of-smyrna/the-martyrdom-of-polycarp/*": ["witness", "the Church of Smyrna"],
  // Chrysostom's funeral oration FOR Meletius. Caught only because the
  // scripture rule demands a translation marker: the citation contains the
  // word "John", from "John Chrysostom", and would otherwise have been
  // labelled Scripture.
  "meletius-of-antioch/the-confessor-and-the-funeral/3": ["witness", "John Chrysostom"],
  // The Magnificat. Verbatim Scripture; the citation spells out "(King
  // James Version)" rather than "(KJV)", so the rule does not see it.
  "theotokos/the-magnificat/1": ["scripture"],

  // Citation says "paraphrased from the NPNF English": Purify's prose.
  "constantine-the-great/the-vision-and-the-council/1": ["editorial"],
  "constantine-the-great/the-vision-and-the-council/2": ["editorial"],
  // The section title says it: "a guided summary in the project's voice".
  "gregory-palamas/the-holy-hesychast/4": ["editorial"],
  // Framing says "Summary with verbatim phrases preserved".
  "gregory-palamas/the-holy-hesychast/5": ["editorial"],
  // Narrative retelling of a tradition, ending in a quoted phrase.
  "mary-magdalene/the-myrrhbearer/4": ["editorial"],
  // Framing says outright: "a narrative retelling ... not a direct quotation".
  "nicholas-the-wonderworker/stories-and-prayers/1": ["editorial"],

  // The saint's own text, despite carrying framing + a citation.
  "cyril-of-jerusalem/the-catechist-of-jerusalem/4": ["saint"],
  "epiphanius-of-salamis/the-anchored-one/2": ["saint"],
  "epiphanius-of-salamis/the-anchored-one/3": ["saint"],
  // Eustathius's own fragments, merely preserved inside Athanasius.
  "eustathius-of-antioch/the-confessor-of-antioch/4": ["saint"],
  // Likewise: Athanasius preserves the letter, Hosius wrote it.
  "hosius-of-cordova/the-elder-of-the-west/2": ["saint"],
  // The Bibliotheca is Photius's own work; the codices are his summaries.
  "photius-the-great/the-bibliotheca/1": ["saint"],
  "photius-the-great/the-bibliotheca/2": ["saint"],
  "photius-the-great/the-bibliotheca/3": ["saint"],
  "photius-the-great/the-bibliotheca/4": ["saint"],
  "photius-the-great/the-bibliotheca/5": ["saint"],
  // The emperor's own edict.
  "theodosius-the-great/the-edict-and-the-penance/1": ["saint"],
  // The Elder's own counsel from his letters.
  "paisios-the-athonite/epistles/2": ["saint"],

  // NOT DECIDED, deliberately: the Hagioritic Tome is a corporate document
  // of the Holy Mountain, drafted by Palamas and signed by the Protos,
  // abbots and elders. Neither `saint` nor `witness` is honest, so it stays
  // unlabelled until someone rules on it.
  // "gregory-palamas/the-holy-hesychast/3": ...
};

// Purify's own introductory essays. Verified by reading: agatho's opens
// "The passages are reproduced word for word from NPNF...", florian's says
// "The sections below are a faithful retelling of the Latin Acts".
const EDITORIAL_INTRO = /^On (the|St\.|Saint|his|her)\b/i;

// The opening of a saint's OWN letter. These carry framing and no citation,
// which the corpus convention would read as a retelling; they are the
// saint speaking. Excludes the Martyrdom of Polycarp, handled above.
const OWN_OPENING = /^(salutation|address|introduction|preface|prologue)\b/i;

function decide(saintDir, work, sec) {
  const exact = DECIDED[`${saintDir}/${work}/${sec.n}`];
  if (exact) return exact;
  const whole = DECIDED[`${saintDir}/${work}/*`];
  if (whole) return whole;

  const title = sec.title || "";
  const cit = sec.citation || "";

  if (LITURGICAL_TITLE.test(title)) return ["liturgical"];
  if (SCRIPTURE_BOOK.test(cit) && TRANSLATION.test(cit)) return ["scripture"];
  if (EDITORIAL_INTRO.test(title)) return ["editorial"];
  if (OWN_OPENING.test(title)) return ["saint"];
  return null; // leave unlabelled
}

let changed = 0;
const tally = {};
const touched = [];

for (const d of fs.readdirSync(ROOT)) {
  const dir = path.join(ROOT, d);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".json") || f === "licensed-works.json") continue;
    const file = path.join(dir, f);
    let j;
    try {
      j = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
      continue;
    }
    if (!Array.isArray(j.sections)) continue;
    let dirty = false;
    for (const sec of j.sections) {
      const verdict = decide(d, j.slug, sec);
      if (!verdict) continue;
      const [voice, author] = verdict;
      if (sec.voice === voice && (sec.voiceAuthor ?? null) === (author ?? null)) continue;
      sec.voice = voice;
      if (author) sec.voiceAuthor = author;
      else delete sec.voiceAuthor;
      tally[voice] = (tally[voice] || 0) + 1;
      touched.push(`${d}/${j.slug} s${sec.n} -> ${voice}${author ? ` (${author})` : ""}`);
      changed++;
      dirty = true;
    }
    if (dirty && WRITE) {
      fs.writeFileSync(file, JSON.stringify(j, null, 2) + "\n");
    }
  }
}

console.log(`${WRITE ? "wrote" : "would write"} ${changed} section voices`);
console.log(JSON.stringify(tally, null, 1));
if (!WRITE) {
  console.log("\n(dry run; pass --write to apply)");
  for (const t of touched.slice(0, 25)) console.log("  " + t);
  if (touched.length > 25) console.log(`  ... and ${touched.length - 25} more`);
}
