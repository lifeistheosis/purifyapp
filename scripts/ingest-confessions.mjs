// One-off: ingest Augustine's Confessions Book I from Project Gutenberg
// (Pusey translation, public domain, ebook #3296) and write a Purify
// work-file at data/saints/augustine-of-hippo/confessions.json.
//
// Usage: node scripts/ingest-confessions.mjs

import fs from "node:fs/promises";
import path from "node:path";
import https from "node:https";

const URL = "https://www.gutenberg.org/cache/epub/3296/pg3296.txt";
const OUT = "data/saints/augustine-of-hippo/confessions.json";

function get(u) {
  return new Promise((resolve, reject) => {
    https
      .get(u, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          return get(res.headers.location).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) return reject(new Error("HTTP " + res.statusCode));
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      })
      .on("error", reject);
  });
}

(async () => {
  const txt = await get(URL);
  const lines = txt.split(/\r?\n/);

  // Slice Book I.
  let start = -1, end = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === "BOOK I") start = i + 1;
    if (lines[i].trim() === "BOOK II") { end = i; break; }
  }
  if (start < 0 || end < 0) throw new Error("Book I not found");

  const paras = lines.slice(start, end)
    .join("\n").trim()
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 30);

  // Chunk into ~4-paragraph sections so the reader has manageable bites.
  // Pusey's translation does not preserve the Latin chapter divisions in
  // Gutenberg's plain-text edition, so we group by readable units rather
  // than try to recover Augustine's 20 chapters synthetically.
  const CHUNK = 4;
  const sections = [];
  for (let i = 0; i < paras.length; i += CHUNK) {
    sections.push({
      n: sections.length + 1,
      title: sections.length === 0 ? "Opening invocation" : `Reflection ${sections.length + 1}`,
      paragraphs: paras.slice(i, i + CHUNK),
    });
  }
  // Curate the opening section title; leave the rest as numbered reflections.
  sections[0].title = "Opening invocation";

  const payload = {
    saint: "augustine-of-hippo",
    slug: "confessions",
    title: "Confessions",
    subtitle: "Confessiones — Book I, complete",
    source:
      "Translation: E. B. Pusey, 1838 (public domain). Sourced from Project Gutenberg ebook #3296. Latin text c. 397-400.",
    sections,
  };

  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(OUT, JSON.stringify(payload, null, 2), "utf8");
  console.log(`Wrote ${OUT}: ${sections.length} sections, ${paras.length} paragraphs.`);
})();
