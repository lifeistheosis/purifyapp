// Recompress the static images the apps carry, IN PLACE, keeping each file's
// exact name and format so every string reference (lib/saints/saints.ts
// iconUrl, lib/saints/icons.ts AUTHOR_ICONS, lib/history/events.ts media.hero /
// media.gallery, the shop's media_url rows in the database) keeps resolving
// untouched.
//
//   node scripts/optimize-images.mjs            # says what it would do
//   node scripts/optimize-images.mjs --apply    # does it
//
// This is a manual maintenance script, NOT wired into the build. Run it before
// a release build. It is safe to run twice: a file it has already made small
// no longer saves enough to be rewritten, and a cut-out it has already
// quantised is recognised by its palette and passed over.
//
// It began as a pass over two folders (public/saints/icons and
// public/history/media), files over 400 KB only, written straight to disk.
// 1.5.2 widened it to everything under public/ and made it prove its work,
// because the heaviest pictures in the apps turned out to be somewhere else:
// four product cut-outs in public/shop/media, 2.8 MB between them.
//
// The rules, in the order they are applied to a file:
//
//   1. A JPEG is encoded again with mozjpeg at QUALITY.
//   2. A PNG with no transparency is re-encoded LOSSLESS, never to a palette:
//      several are photographs of icons and paintings, and a palette would
//      band them. That was this script's rule from the start and it stands.
//   3. A PNG WITH transparency is a cut-out product photograph, and it is
//      quantised to a palette, once. That is the one lossy thing done to a
//      PNG, and rule 6 is what makes it safe: a cut-out whose palette shows
//      is thrown away, not shipped.
//   4. In the two original folders a file over CAP_OVER is capped to CAP px on
//      its longer edge (generous headroom for retina heroes), as before.
//   5. The section plates (public/sections/, the wide ones) are drawn at most
//      350px wide on a phone and about 700px on a tablet, so they are brought
//      down to PLATE_WIDTH. Nothing else is resized.
//   6. The result is compared with the original, pixel by pixel, the way it is
//      seen: laid over the app's dark surface and over white. Below MIN_PSNR
//      decibels on either it is thrown away. At 38 dB and above the two are
//      indistinguishable at the sizes the app draws them.
//   7. It must save at least MIN_SAVING of the file. A few kilobytes are not
//      worth a second generation of JPEG.
//
// What it will not touch: audio, the app icons and widget art at the root of
// public/, the What's New screenshots (the release tools check those by size),
// and anything under SMALL bytes.
//
// It prints every file it changed with both sizes and the measured PSNR, and
// every file it tried and refused with the reason.

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve("public");
const APPLY = process.argv.includes("--apply");

const QUALITY = 82;
const PLATE_WIDTH = 1280;
const MIN_PSNR = 38;
const MIN_SAVING = 0.12;
const SMALL = 40 * 1024;
const CAP = 1200;
const CAP_OVER = 400 * 1024;
const CAPPED_DIRS = ["saints/icons/", "history/media/"];

/** Folders under public/ this never enters. */
const SKIP_DIRS = new Set(["audio", "admin-audio", "whats-new", "marketing"]);

async function* walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (dir === ROOT && SKIP_DIRS.has(entry.name)) continue;
      yield* walk(full);
    } else {
      yield full;
    }
  }
}

/**
 * Peak signal-to-noise ratio between two images of the same size, in dB.
 *
 * Measured the way the picture is seen: laid over a ground. A cut-out's
 * transparent pixels still carry a colour nobody ever sees, and a palette
 * changes it freely, so comparing the raw channels calls two identical
 * pictures unalike (it measured 10 dB for files that look the same). Each is
 * flattened over the app's dark surface and over white, and the worse of the
 * two is the answer.
 */
async function psnr(a, b, width, height) {
  let worst = Infinity;
  for (const background of ["#1d1d20", "#ffffff"]) {
    const raw = (buf) => sharp(buf).resize(width, height, { fit: "fill" }).flatten({ background }).removeAlpha().raw().toBuffer();
    const [x, y] = await Promise.all([raw(a), raw(b)]);
    let sum = 0;
    for (let i = 0; i < x.length; i++) {
      const d = x[i] - y[i];
      sum += d * d;
    }
    const mse = sum / x.length;
    worst = Math.min(worst, mse === 0 ? Infinity : 10 * Math.log10((255 * 255) / mse));
  }
  return worst;
}

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
const rows = [];
let before = 0;
let after = 0;
let seen = 0;

for await (const file of walk(ROOT)) {
  const rel = path.relative(ROOT, file).split(path.sep).join("/");
  // The app's own marks and widget art sit at the root of public/.
  if (!rel.includes("/")) continue;
  const ext = path.extname(file).toLowerCase();
  if (![".jpg", ".jpeg", ".png"].includes(ext)) continue;
  const original = await fs.readFile(file);
  seen++;
  before += original.length;
  if (original.length < SMALL) {
    after += original.length;
    continue;
  }

  const meta = await sharp(original).metadata();
  // A cut-out that is already a palette has been through rule 3 once. A
  // second pass would save a little more and lose a little more, every time
  // it ran: the first dry run after 1.5.2's pass offered to take one of its
  // own files from 51 KB to 43 KB. So it is left as it is.
  if (ext === ".png" && meta.hasAlpha && meta.paletteBitDepth) {
    after += original.length;
    continue;
  }
  const plate = rel.startsWith("sections/") && (meta.width ?? 0) > PLATE_WIDTH;
  const capped = CAPPED_DIRS.some((d) => rel.startsWith(d)) && original.length > CAP_OVER;
  let pipeline = sharp(original).rotate();
  if (plate) pipeline = pipeline.resize({ width: PLATE_WIDTH });
  else if (capped) pipeline = pipeline.resize({ width: CAP, height: CAP, fit: "inside", withoutEnlargement: true });

  const next =
    ext !== ".png"
      ? await pipeline.jpeg({ quality: QUALITY, mozjpeg: true }).toBuffer()
      : meta.hasAlpha
        ? await pipeline.png({ palette: true, quality: 90, effort: 10, compressionLevel: 9 }).toBuffer()
        : await pipeline.png({ compressionLevel: 9 }).toBuffer();

  const saving = 1 - next.length / original.length;
  if (saving < MIN_SAVING) {
    after += original.length;
    continue;
  }
  // Compared at the size the new file has, so a picture brought down in size
  // is measured against the original brought down the same way.
  const out = await sharp(next).metadata();
  const quality = await psnr(original, next, out.width, out.height);
  if (quality < MIN_PSNR) {
    rows.push({ rel, note: `kept as it was: ${quality.toFixed(1)} dB, under ${MIN_PSNR}` });
    after += original.length;
    continue;
  }

  const resized = out.width !== meta.width ? `${meta.width}px to ${out.width}px` : "";
  rows.push({ rel, from: original.length, to: next.length, quality, resized });
  after += next.length;
  if (APPLY) {
    // temp + atomic rename so a dev server / next/image holding the original
    // open never sees a half-written file.
    const tmp = `${file}.tmp`;
    await fs.writeFile(tmp, next);
    await fs.rename(tmp, file);
  }
}

for (const r of rows.sort((a, b) => (b.from ?? 0) - (b.to ?? 0) - ((a.from ?? 0) - (a.to ?? 0)))) {
  if (r.note) console.log(`  ${r.rel}: ${r.note}`);
  else console.log(`  ${r.rel}: ${kb(r.from)} to ${kb(r.to)}  (${r.quality === Infinity ? "identical" : r.quality.toFixed(1) + " dB"})${r.resized ? "  " + r.resized : ""}`);
}
const changed = rows.filter((r) => !r.note).length;
console.log(
  `\n${APPLY ? "Rewrote" : "Would rewrite"} ${changed} of ${seen} pictures: ${(before / 1048576).toFixed(2)} MB to ${(after / 1048576).toFixed(2)} MB, ${((before - after) / 1048576).toFixed(2)} MB lighter.`,
);
if (!APPLY && changed) console.log("Nothing was written. Run again with --apply.");
