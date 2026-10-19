// Makes the AVIF beside every cover picture (1.7.2).
//
//   node scripts/covers-avif.mjs
//
// The owner, 2026-10-19: "ensure all photos are optimized", and of the new
// covers, "ok just optimize them". Every JPEG under public/covers/ (the
// books' covers, the saints' page pictures, the read-aloud covers) gets an
// AVIF beside it, the same pixels about 40% lighter, which the covers offer
// first and the JPEG stands behind (lib/media/streamed.ts, avifFor). History's
// pictures have their own script, which also draws their previews
// (scripts/history-media.mjs).
//
// It reads each JPEG and leaves an AVIF that exists alone, so run it again
// after adding or replacing a cover. Quality 50, chosen by eye for History's
// icons on 2026-10-19 and checked again on the covers' faces.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.join(process.cwd(), "public", "covers");

function jpegs(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return jpegs(p);
    return e.name.endsWith(".jpg") ? [p] : [];
  });
}

let before = 0;
let after = 0;
let made = 0;
const files = jpegs(ROOT);
for (const jpg of files) {
  const avif = jpg.replace(/\.jpg$/, ".avif");
  if (!fs.existsSync(avif)) {
    await sharp(jpg).avif({ quality: 50, effort: 4 }).toFile(avif);
    made += 1;
  }
  before += fs.statSync(jpg).size;
  after += fs.statSync(avif).size;
}
const kb = (n) => `${Math.round(n / 1024)} KB`;
console.log(`${files.length} covers (${made} new AVIFs): ${kb(before)} as JPEG, ${kb(after)} as AVIF (${Math.round((1 - after / before) * 100)}% lighter)`);
