// Where each line of Scripture a reading plan's guide quotes stands (1.8).
//
// The owner, 2026-10-17: "Whatever quote, the father, or scripture ... you
// can easily see where it comes from." The guide's intros and questions
// (data/plans/guide/en.json) quote the day's own chapters between single
// quotation marks ('How long, O Lord?'). For each, this finds the verses of
// the app's Bible, in the day's chapters and else in the plan's, that hold
// the quoted words in order, and writes them to data/plans/guide/cites.json:
//
//   { "<plan>": { "<day>": { "intro": [{ "words", "cite" }], "q": [...] } } }
//
// A quotation found nowhere word for word is never placed by a guess: it is
// written only if NOT_WORD_FOR_WORD below names it, with the passage it is
// close to and how it differs, and the run fails on any other. Nothing in the
// guide's words is changed. lib/plans/__tests__/guideCites.test.ts holds the
// file to the guide and to the verses.
//
//   node scripts/cite-plan-guide.mjs          report
//   node scripts/cite-plan-guide.mjs --apply  write the file

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { READING_PLANS } = await import(new URL("../lib/plans/plans.ts", import.meta.url).href);

/** A quotation in the guide's words: between single marks, an apostrophe inside a word ("Lord's") kept. */
export const QUOTED = /(?:^|[\s(])'((?:[^']|'(?=[a-z]))+?)'(?=[\s.,;:?!)]|$)/g;

/** The words in order: letters and digits, lower case. */
const words = (s) =>
  s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

// Close to a passage, not as the app's Bible gives it.
const NOT_WORD_FOR_WORD = {
  "to be with him": {
    of: { book: "mark", chapter: 3, from: 14 },
    differs: "The question's own short form of the King James \"that they should be with him\", which the day's intro quotes whole.",
  },
  "Remember me, O Lord, in Thy Kingdom.": {
    of: { book: "luke", chapter: 23, from: 42 },
    differs: "The thief's words as the prayers before Communion say them; the King James Luke 23:42 reads \"Lord, remember me when thou comest into thy kingdom.\"",
  },
  "I am the resurrection, and the life. Believest thou this?": {
    of: { book: "john", chapter: 11, from: 25, to: 26 },
    differs: "Joins the first words of John 11:25 to the last of 11:26 and leaves out what stands between them (\"he that believeth in me, though he were dead, yet shall he live: And whosoever liveth and believeth in me shall never die.\").",
  },
};

const verses = new Map();
function chapter(book, n) {
  const key = `${book}/${n}`;
  if (!verses.has(key)) verses.set(key, JSON.parse(fs.readFileSync(path.join(ROOT, "data", "bible", book, `${n}.json`), "utf8")).verses);
  return verses.get(key);
}

/** The shortest run of verses (one, then two, then three), in the readings given, that holds the words. */
function find(quoted, readings) {
  const w = words(quoted);
  for (let span = 0; span < 3; span++) {
    for (const r of readings) {
      const vs = chapter(r.book, r.chapter);
      for (let i = 0; i + span < vs.length; i++) {
        const text = vs.slice(i, i + span + 1).map((v) => v.text).join(" ");
        if (words(text).includes(w)) return { kind: "scripture", book: r.book, chapter: r.chapter, from: vs[i].n, ...(span ? { to: vs[i + span].n } : {}) };
      }
    }
  }
  return null;
}

/** One day to a line, so a change to a day's guide changes one line here. */
function layout(out) {
  const NL = "\n";
  const plans = Object.entries(out).map(([plan, days]) => {
    const rows = Object.entries(days).map(([day, v]) => `    ${JSON.stringify(day)}: ${JSON.stringify(v)}`);
    return `  ${JSON.stringify(plan)}: {${NL}${rows.join("," + NL)}${NL}  }`;
  });
  return `{${NL}${plans.join("," + NL)}${NL}}${NL}`;
}

function run() {
  const guide = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "plans", "guide", "en.json"), "utf8"));
  const out = {};
  let n = 0;
  let close = 0;
  for (const plan of READING_PLANS) {
    const days = guide[plan.id]?.days ?? [];
    const all = plan.days.flat();
    days.forEach((d, i) => {
      if (!d) return;
      for (const field of ["intro", "q"]) {
        for (const m of (d[field] ?? "").matchAll(QUOTED)) {
          const quoted = m[1].trim();
          n++;
          let cite = find(quoted, plan.days[i]) ?? find(quoted, all);
          if (!cite) {
            const known = NOT_WORD_FOR_WORD[quoted];
            if (!known) throw new Error(`${plan.id} day ${i + 1} ${field}: not found word for word, and not marked: ${quoted}`);
            cite = { kind: "inexact", of: { kind: "scripture", ...known.of }, differs: known.differs };
            close++;
          }
          const day = ((out[plan.id] ??= {})[String(i + 1)] ??= {});
          (day[field] ??= []).push({ words: quoted, cite });
        }
      }
    });
    // The pool's questions are asked on any day: none quotes, and none may until it is placed here.
    for (const q of guide[plan.id]?.pool ?? []) if ([...q.matchAll(QUOTED)].length) throw new Error(`${plan.id} pool: a quotation the run does not place: ${q}`);
  }
  return { out, n, close };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const { out, n, close } = run();
  console.log(`${n} quotations: ${n - close} word for word in the plan's chapters, ${close} marked not word for word`);
  if (process.argv.includes("--apply")) {
    fs.writeFileSync(path.join(ROOT, "data", "plans", "guide", "cites.json"), layout(out));
    console.log("wrote data/plans/guide/cites.json");
  }
}
