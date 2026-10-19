// How long each work of the Fathers is, for the reading room (1.7).
//
// The room and a work's book page show minutes to read, and a theme row shows
// the minutes of one book of a work (Cassian's Institutes, Book 8). Counting
// them means reading the whole corpus, 31 MB of data/saints JSON, which no
// page should do when it is drawn. So it is counted here, once, and written
// to data/reading/stats.json, which is committed: neither build has a step
// before it, and lib/reading/__tests__/stats.test.ts counts again and fails
// when a work's text has changed and this was not run.
//
//   node scripts/reading-stats.mjs
//
// Per work: its words, its minutes at the house's 180 words a minute
// (lib/bible/readability.ts, WORDS_PER_MINUTE, never less than 1), and each
// section's number and words, in order. Only the paragraphs are counted:
// an editor's framing note above a section is not the text.

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const { SAINTS } = await import("../lib/saints/saints.ts");

/** Mirrors lib/bible/readability.ts. stats.test.ts holds the two together. */
export const WORDS_PER_MINUTE = 180;

const words = (text) => {
  const t = String(text).trim();
  return t === "" ? 0 : t.split(/\s+/).length;
};

export function countWork(json) {
  const sections = json.sections.map((s) => [s.n, (s.paragraphs ?? []).reduce((n, p) => n + words(p), 0)]);
  const total = sections.reduce((n, [, w]) => n + w, 0);
  return { words: total, minutes: Math.max(1, Math.round(total / WORDS_PER_MINUTE)), sections };
}

const out = {};
for (const saint of SAINTS) {
  for (const work of saint.works) {
    const file = path.join(ROOT, "data", "saints", saint.slug, `${work.slug}.json`);
    const json = JSON.parse(fs.readFileSync(file, "utf8"));
    out[`${saint.slug}/${work.slug}`] = countWork(json);
  }
}

// One line per work, so a change to one text is a one-line diff.
const lines = Object.entries(out).map(([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)}`);
fs.mkdirSync(path.join(ROOT, "data", "reading"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "data", "reading", "stats.json"), `{\n${lines.join(",\n")}\n}\n`);
console.log(`data/reading/stats.json: ${lines.length} works`);
