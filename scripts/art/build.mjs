#!/usr/bin/env node
// Silver Night's pictures, from his Gemini picks (docs/brand/art/mist/picked/
// and the reference) to the app's own files: public/art/<place>.webp and .avif,
// the sizes the app draws them at. Only the pictures a surface uses are built;
// the plan and every prompt are docs/brand/art/PLAN.md.
//
//   node scripts/art/build.mjs

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(path.join(ROOT, "package.json"));
const sharp = require("sharp");
const ART = path.join(ROOT, "docs/brand/art");
const OUT = path.join(ROOT, "public/art");

/** place: its source and the width it is drawn at (twice a phone's largest use). */
export const SOURCES = {
  parish: ["ref/mist-reference.jpg", 1024],
  history: ["mist/picked/discover-history.jpg", 1024],
  councils: ["mist/picked/discover-councils.jpg", 1024],
  chants: ["mist/picked/discover-chants.jpg", 1024],
  shop: ["mist/picked/discover-shop.jpg", 1024],
  start: ["mist/picked/discover-start.jpg", 1024],
  reading: ["mist/picked/masthead-reading.jpg", 1024],
  quiet: ["mist/picked/onboarding-quiet.jpg", 768],
  rule: ["mist/picked/onboarding-daily-rule.jpg", 768],
};

fs.mkdirSync(OUT, { recursive: true });
for (const [place, [src, width]] of Object.entries(SOURCES)) {
  const img = sharp(path.join(ART, src)).resize({ width, withoutEnlargement: true }).grayscale();
  await img.clone().webp({ quality: 80 }).toFile(path.join(OUT, `${place}.webp`));
  await img.clone().avif({ quality: 55 }).toFile(path.join(OUT, `${place}.avif`));
  const meta = await sharp(path.join(OUT, `${place}.webp`)).metadata();
  const kb = (f) => Math.round(fs.statSync(path.join(OUT, f)).size / 1024);
  console.log(`${place}: ${meta.width}x${meta.height}, webp ${kb(`${place}.webp`)} KB, avif ${kb(`${place}.avif`)} KB`);
}
