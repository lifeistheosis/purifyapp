// St Cyril on John: no section opens inside a sentence (1.9, F-49).
//
// The ingest (scripts/ingest-cyril-john.mjs) cut a section at each italic
// quotation of John, the lemma. Where the italics stand inside St Cyril's own
// sentence ("But since it was necessary in some sort to || mete out heaven
// with the span"), the section before was left ending on an open sentence
// and the next one opened in the middle of it; and so did its note on John's
// rail, since each note there is a whole section. Counted by Updates on
// 2026-11-10: 614 of 1,070 sections, 16,328 words.
//
// What this does, and all it does:
//
//   1. THE OPEN SENTENCE GOES FORWARD. The words after the last full stop of
//      a section's last paragraph, when that paragraph ends without one, are
//      taken from it and set at the head of the next section's first
//      paragraph, verbatim, with one space between. A sentence so carried
//      can be carried again, where a section is all one open sentence.
//
//   2. LOST FIRST WORDS COME BACK. Where the first words of a sentence stand
//      outside the italics ("30 I can of Mine Own Self do nothing", the 30
//      and the I in roman), the ingest dropped them: what was left before the
//      italics was a paragraph under forty characters, which it threw away.
//      Thirty-two sections lost their opening so. Each is put back from the
//      transcription the work was made from (scripts/cyril-john/
//      lost-leads.json, with where it was read).
//
//   3. THE RAIL FOLLOWS. Every note of his on John's rail is rewritten from
//      the section (or the paragraphs of it) it already was, so the rail and
//      the work say the same words.
//
// NO PARAGRAPH IS ADDED OR REMOVED, and no section. A last paragraph that
// was nothing but an open sentence stays as an empty slot, as Acts' Homily 28
// has one, so every paragraph keeps its number and no reader's mark moves
// (purify:saint:cyril-of-alexandria:commentary-on-john:{section}:{paragraph}).
// Nothing is written or rewritten: every word that was in the work is in it
// after, in the same order, and the only new words are the thirty-two leads.
//
// WHAT IS LEFT AS THE PRINT HAS IT (lib/saints/__tests__/cyrilJohnOpenings.test.ts
// names each):
//   - a section that ends on a colon or on dashes: the print's own lead-in to
//     the lemma it sets on a line of its own ("He saith:", "by saying:----");
//   - a chapter's heading standing last in a section, without a stop;
//   - a lemma the print itself begins with a small letter ("and he that
//     believeth not the Son"), and a Scripture quotation that runs on past a
//     question mark.
//
// Safe to run twice: on a mended file it changes nothing.
//
//   node scripts/mend-cyril-john-openings.mjs          report
//   node scripts/mend-cyril-john-openings.mjs --apply  write the work and the rail

import fs from "node:fs";
import path from "node:path";

const WORK_FILE = "data/saints/cyril-of-alexandria/commentary-on-john.json";
const RAIL_DIR = "data/bible/commentary/john";
const LEADS_FILE = "scripts/cyril-john/lost-leads.json";
const WORK_ID = "cyril-of-alexandria/commentary-on-john";

/** A paragraph that ends on a full stop, a question or an exclamation, with any closing marks after it. */
const ENDS_ON_A_STOP = /[.?!]["”’)\]]*\s*$/;
/** The print's lead-in to a lemma set on its own line: a colon, or dashes. */
const LEADS_IN = /(?::-*|-{2,})\s*$/;
/** A chapter's heading, which the ingest left at the foot of the section before its chapter. */
const HEADING = /^CHAPTER [IVXLC]+\./;
/** The end of a sentence inside a paragraph: a stop, then a capital, a figure or an opening mark. */
const SENTENCE_END = /[.?!]["”’)\]]?\s+(?=["“‘(]?[A-Z0-9Ἀ-ῼ])/g;

/** Whether a section's last paragraph leaves a sentence open. An empty slot does not. */
export function endsOpen(paragraph) {
  const p = (paragraph ?? "").trim();
  return p !== "" && !ENDS_ON_A_STOP.test(p) && !LEADS_IN.test(p) && !HEADING.test(p);
}

/** A paragraph as its whole sentences and the open sentence after them. */
export function splitOpen(paragraph) {
  const p = paragraph.trim();
  const last = [...p.matchAll(SENTENCE_END)].at(-1);
  if (!last) return { kept: "", open: p };
  const at = last.index + last[0].length;
  return { kept: p.slice(0, at).trim(), open: p.slice(at).trim() };
}

/**
 * Mend the sections in place. Answers what it did: the leads put back, and
 * each open sentence carried, with the sections it left and came to.
 */
export function mendSections(sections, leads) {
  const restored = [];
  const byN = new Map(sections.map((s) => [s.n, s]));
  for (const { section, lead, before } of leads) {
    const s = byN.get(section);
    if (!s) throw new Error(`lost-leads.json names section ${section}, which the work does not have`);
    const first = s.paragraphs[0] ?? "";
    if (first.startsWith(`${lead} `)) continue; // put back already
    // Held to the words it was read before, wherever an open sentence has since come to stand ahead of them.
    if (!first.startsWith(before)) throw new Error(`section ${section} no longer opens "${before}": its lead cannot be placed`);
    s.paragraphs[0] = `${lead} ${first}`;
    restored.push({ section, lead });
  }

  const carried = [];
  for (let k = 1; k < sections.length; k++) {
    const from = sections[k - 1];
    const to = sections[k];
    const lastAt = from.paragraphs.length - 1;
    const last = from.paragraphs[lastAt];
    if (!endsOpen(last)) continue;
    const { kept, open } = splitOpen(last);
    from.paragraphs[lastAt] = kept;
    const first = (to.paragraphs[0] ?? "").trim();
    to.paragraphs[0] = first ? `${open} ${first}` : open;
    carried.push({ from: from.n, to: to.n, words: open.split(/\s+/).length, whole: kept === "", open });
  }
  return { restored, carried };
}

/** A note's words, from the paragraphs of the section it is: the empty slots are not said. */
const said = (paragraphs) => paragraphs.filter((p) => p.trim() !== "").join("\n\n");

/** Every note of St Cyril's own on John's rail, with the file and verse it is in. */
function railNotes(root) {
  const out = [];
  const dir = path.join(root, RAIL_DIR);
  for (const name of fs.readdirSync(dir).filter((f) => /^\d+\.json$/.test(f)).sort((a, b) => parseInt(a) - parseInt(b))) {
    const file = path.join(dir, name);
    const chapter = JSON.parse(fs.readFileSync(file, "utf8"));
    for (const [verse, notes] of Object.entries(chapter)) {
      notes.forEach((note) => {
        if (note.at?.work === WORK_ID && !note.summary) out.push({ file, chapter, verse, note });
      });
    }
  }
  return out;
}

/** Which paragraphs of its section a note is: all of them, or a run. */
function spanOf(note, section) {
  const whole = said(section.paragraphs);
  if (note.text === whole) return { from: 0, to: section.paragraphs.length - 1 };
  for (let a = 0; a < section.paragraphs.length; a++) {
    for (let b = a; b < section.paragraphs.length; b++) {
      if (said(section.paragraphs.slice(a, b + 1)) === note.text) return { from: a, to: b };
    }
  }
  return null;
}

export function mend(root, { apply = false } = {}) {
  const workPath = path.join(root, WORK_FILE);
  const work = JSON.parse(fs.readFileSync(workPath, "utf8"));
  const { leads } = JSON.parse(fs.readFileSync(path.join(root, LEADS_FILE), "utf8"));
  const sectionOf = new Map(work.sections.map((s) => [s.n, s]));

  // Which paragraphs each note is, read before anything moves.
  const notes = railNotes(root);
  const unplaced = [];
  for (const entry of notes) {
    const section = sectionOf.get(entry.note.at.section);
    entry.span = section ? spanOf(entry.note, section) : null;
    if (!entry.span) unplaced.push(`${path.basename(entry.file)} ${entry.verse}, section ${entry.note.at.section}`);
  }
  if (unplaced.length) throw new Error(`${unplaced.length} rail note(s) are not the words of their section, so they cannot follow it: ${unplaced.slice(0, 5).join("; ")}`);

  const { restored, carried } = mendSections(work.sections, leads);

  let rewritten = 0;
  const emptied = [];
  const files = new Map();
  for (const { file, chapter, verse, note, span } of notes) {
    const section = sectionOf.get(note.at.section);
    const text = said(section.paragraphs.slice(span.from, span.to + 1));
    if (text === "") emptied.push(`${path.basename(file)} ${verse}, section ${section.n}`);
    if (text !== note.text) {
      note.text = text;
      rewritten += 1;
      files.set(file, chapter);
    }
  }
  if (emptied.length) throw new Error(`${emptied.length} rail note(s) would be left with no words: ${emptied.join("; ")}`);

  if (apply) {
    fs.writeFileSync(workPath, `${JSON.stringify(work, null, 2)}\n`);
    for (const [file, chapter] of files) fs.writeFileSync(file, `${JSON.stringify(chapter, null, 2)}\n`);
  }
  return { restored, carried, rewritten, notes: notes.length, files: files.size };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const apply = process.argv.includes("--apply");
  const { restored, carried, rewritten, notes, files } = mend(process.cwd(), { apply });
  const words = carried.map((c) => c.words).sort((a, b) => a - b);
  const sum = words.reduce((a, b) => a + b, 0);
  console.log(`St Cyril on John: ${carried.length} open sentence(s) carried forward, ${sum} words` + (words.length ? ` (median ${words[words.length >> 1]}, largest ${words.at(-1)})` : "") + `; ${carried.filter((c) => c.whole).length} left an empty slot.`);
  console.log(`${restored.length} lost opening(s) put back from the transcription.`);
  console.log(`${rewritten} of ${notes} rail notes follow, in ${files} chapter file(s).`);
  console.log(apply ? "Written." : carried.length + restored.length + rewritten ? "Nothing written: run again with --apply." : "Nothing to do.");
}
