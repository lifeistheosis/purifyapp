// The list of chapters that have a reading, written from the files themselves
// (lib/readAloud/chapters.ts): a chapter is on it when
// public/audio/read/<book>/<chapter>.mp3 and its .json are both there.
//
// Two copies of the same list: data/readAloud/index.json, which every build
// carries, and public/audio/read/index.json, which the apps ask the website for,
// so a chapter read after an app was built still gets Listen there.
// lib/readAloud/__tests__/chapters.test.ts holds the two together.
//
//   node scripts/read-aloud-index.mjs
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join("public", "audio", "read");
const list = [];
const books = fs
  .readdirSync(ROOT, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();
for (const book of books) {
  const dir = path.join(ROOT, book);
  const chapters = fs
    .readdirSync(dir)
    .filter((f) => /^\d+\.mp3$/.test(f))
    .map((f) => Number(f.slice(0, -4)))
    .filter((n) => fs.existsSync(path.join(dir, `${n}.json`)))
    .sort((a, b) => a - b);
  for (const n of chapters) list.push(`${book}/${n}`);
}
const json = `${JSON.stringify(list)}\n`;
fs.writeFileSync(path.join("data", "readAloud", "index.json"), json);
fs.writeFileSync(path.join(ROOT, "index.json"), json);
console.log(`${list.length} chapters have a reading`);
