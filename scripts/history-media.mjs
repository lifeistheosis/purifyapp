// Makes the light copy and the preview of every History picture (1.7.2).
//
//   node scripts/history-media.mjs
//
// The owner, 2026-10-19: "the images in the history section also still loads
// spiratically. ensure all photos are optimized and has a better load in
// design". The pictures were JPEGs of 110 to 400 KB, drawn as their bytes
// arrived, a band at a time, inside the event's sheet.
//
// For each picture lib/history/events.ts names (its hero and its gallery):
//   - an AVIF beside the JPEG, the same pixels about 40% lighter, offered
//     first (components/history/EventPlate.tsx, a <picture>). The JPEG stays
//     the picture for whatever cannot read AVIF (iOS 15) and for the apps
//     already installed, which ask for it by name. WebP was tried first and
//     saved 10%: these JPEGs were already tight;
//   - a preview 24px wide, written into lib/history/mediaPreviews.ts, which
//     the plate draws blurred at once and the picture fades in over.
//
// It reads the JPEG each time, never the AVIF, so it can be run again after a
// picture is added or replaced, and it leaves an AVIF that exists alone.
// Quality 50 was chosen by eye against the JPEG, at full size, on the
// craquelure of the Triumph of Orthodoxy icon (2026-10-19).
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const EVENTS = path.join(ROOT, "lib", "history", "events.ts");
const OUT = path.join(ROOT, "lib", "history", "mediaPreviews.ts");

const named = fs.readFileSync(EVENTS, "utf8").match(/\/history\/media\/[a-z0-9.-]+\.jpg/g) ?? [];
const pictures = [...new Set(named.map((p) => p.replace(/\.jpg$/, "")))].sort();

const previews = {};
let before = 0;
let after = 0;
for (const stem of pictures) {
  const jpg = path.join(ROOT, "public", `${stem}.jpg`.slice(1));
  const avif = path.join(ROOT, "public", `${stem}.avif`.slice(1));
  if (!fs.existsSync(jpg)) throw new Error(`no JPEG for ${stem}`);
  if (!fs.existsSync(avif)) {
    await sharp(jpg).avif({ quality: 50, effort: 4 }).toFile(avif);
  }
  before += fs.statSync(jpg).size;
  after += fs.statSync(avif).size;
  const tiny = await sharp(jpg).resize({ width: 24 }).webp({ quality: 50 }).toBuffer();
  previews[`${stem}.jpg`] = `data:image/webp;base64,${tiny.toString("base64")}`;
}

const body = Object.entries(previews)
  .map(([k, v]) => `  ${JSON.stringify(k)}:\n    ${JSON.stringify(v)},`)
  .join("\n");
fs.writeFileSync(
  OUT,
  `// Written by scripts/history-media.mjs: run it again rather than editing this.\n\n` +
    `/** Each History picture 24px wide, drawn blurred while the picture itself loads (components/history/EventPlate.tsx). */\n` +
    `export const HISTORY_MEDIA_PREVIEW: Readonly<Record<string, string>> = {\n${body}\n};\n`,
);

const kb = (n) => `${Math.round(n / 1024)} KB`;
console.log(`${pictures.length} pictures: ${kb(before)} as JPEG, ${kb(after)} as AVIF (${Math.round((1 - after / before) * 100)}% lighter)`);
console.log(`previews: ${kb(fs.statSync(OUT).size)} in ${path.relative(ROOT, OUT)}`);
