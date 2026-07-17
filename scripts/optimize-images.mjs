// Recompress oversized static images IN PLACE, keeping each file's exact name
// and format so every string reference in the registries (lib/saints/saints.ts
// iconUrl, lib/saints/icons.ts AUTHOR_ICONS, lib/history/events.ts media.hero /
// media.gallery) keeps resolving untouched.
//
// Scope: only files over THRESHOLD_KB in the two heavy asset dirs. JPEGs are
// re-encoded mozjpeg q80; PNGs are re-encoded lossless (no palette — several
// are photographs of icons/paintings that palette quantization would wreck).
// Everything is capped to MAX px on the longer edge (generous headroom for
// retina heroes). A file is only rewritten when the result is actually
// smaller, so the script is idempotent and safe to re-run.
//
// This is a manual maintenance script, NOT wired into the build. Run once:
//   node scripts/optimize-images.mjs

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const THRESHOLD = 400 * 1024; // only touch files bigger than this
const MAX = 1200; // longest-edge cap

const DIRS = [
  path.join(ROOT, "public", "saints", "icons"),
  path.join(ROOT, "public", "history", "media"),
];

let totalBefore = 0;
let totalAfter = 0;
let touched = 0;

for (const dir of DIRS) {
  let entries;
  try {
    entries = await fs.readdir(dir);
  } catch {
    continue; // dir may not exist
  }
  for (const name of entries) {
    if (!/\.(jpe?g|png)$/i.test(name)) continue;
    const full = path.join(dir, name);
    const before = (await fs.stat(full)).size;
    if (before <= THRESHOLD) continue;

    const isPng = /\.png$/i.test(name);
    const pipeline = sharp(full).resize({
      width: MAX,
      height: MAX,
      fit: "inside",
      withoutEnlargement: true,
    });
    const buf = await (isPng
      ? pipeline.png({ compressionLevel: 9 }) // lossless, keeps photos intact
      : pipeline.jpeg({ quality: 80, mozjpeg: true })
    ).toBuffer();

    if (buf.length >= before) {
      console.log(
        `${name}  ${(before / 1024).toFixed(0)} KB  (kept — recompress not smaller)`,
      );
      continue;
    }

    // temp + atomic rename so a dev server / next/image holding the original
    // open never sees a half-written file.
    const tmp = full + ".tmp";
    await fs.writeFile(tmp, buf);
    await fs.rename(tmp, full);
    totalBefore += before;
    totalAfter += buf.length;
    touched += 1;
    console.log(
      `${name}  ${(before / 1024).toFixed(0)} KB -> ${(buf.length / 1024).toFixed(0)} KB`,
    );
  }
}

const savedKb = (totalBefore - totalAfter) / 1024;
console.log(
  `\noptimized ${touched} file(s): ${(totalBefore / 1024).toFixed(0)} KB -> ${(totalAfter / 1024).toFixed(0)} KB (saved ${savedKb.toFixed(0)} KB${
    totalBefore ? `, ${(((totalBefore - totalAfter) / totalBefore) * 100).toFixed(0)}%` : ""
  })`,
);
