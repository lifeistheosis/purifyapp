// The Android launcher icon, drawn at the sizes Android asks for (1.8).
//
//   node scripts/android-icons.mjs
//
// The owner, 2026-10-19: "the 432 one, the clearer one, the one that looks
// better". Until 1.8 the adaptive icon's two layers were drawn at the legacy
// icon's sizes (192 px at xxxhdpi), while an adaptive layer is 108 dp: 432 px
// at xxxhdpi. Android scaled each layer up about 2.25 times and the cross on
// the home screen came out soft. The iPhone's icon is a sharp 1024 px.
//
// From the 1024 px masters in assets/ (the same cross and ground the iPhone
// icon is made of):
//   ic_launcher_foreground.png, ic_launcher_background.png   108 dp
//   ic_launcher.png, ic_launcher_round.png                    48 dp, for
//       launchers older than Android 8, which do not read the adaptive icon
// at every density, ldpi to xxxhdpi.
//
// The foreground master was drawn for an icon seen whole, the cross 58% of
// its height. A launcher shows only the middle 72 dp of the 108 dp layer, so
// drawn edge to edge the cross filled 88% of the icon and its top corners sat
// at the 66 dp circle every mask keeps. It is drawn at FOREGROUND_SCALE
// instead: the cross fills 70% of the icon, the size it always had on
// Android, now sharp, and its farthest corner sits well inside the circle.
//
// Lanczos for the downscale, then written as plain 8-bit PNG.

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const RES = "android/app/src/main/res";
const DENSITIES = { ldpi: 0.75, mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const FOREGROUND = "assets/icon-foreground.png";
const BACKGROUND = "assets/icon-background.png";
const FULL = "assets/icon-only.png";
/** How much of the 108 dp layer the foreground master spans: the cross at 70% of the 72 dp a launcher shows. */
const FOREGROUND_SCALE = 0.8;

for (const p of [FOREGROUND, BACKGROUND, FULL]) {
  const m = await sharp(p).metadata();
  if (m.width !== 1024 || m.height !== 1024) throw new Error(`${p} is ${m.width}x${m.height}, not the 1024 px master`);
}

const draw = (src, size) => sharp(src).resize(size, size, { kernel: "lanczos3" }).png({ compressionLevel: 9 });

/** A circle the size of the picture, for the round legacy icon. */
const circle = (size) =>
  Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`);

for (const [density, scale] of Object.entries(DENSITIES)) {
  const dir = path.join(RES, `mipmap-${density}`);
  if (!fs.existsSync(dir)) throw new Error(`no ${dir}`);
  const layer = Math.round(108 * scale);
  const legacy = Math.round(48 * scale);
  const inner = Math.round(layer * FOREGROUND_SCALE);
  const pad = Math.floor((layer - inner) / 2);
  await sharp(FOREGROUND)
    .resize(inner, inner, { kernel: "lanczos3" })
    .extend({ top: pad, left: pad, bottom: layer - inner - pad, right: layer - inner - pad, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(path.join(dir, "ic_launcher_foreground.png"));
  await draw(BACKGROUND, layer).toFile(path.join(dir, "ic_launcher_background.png"));
  await draw(FULL, legacy).toFile(path.join(dir, "ic_launcher.png"));
  const square = await draw(FULL, legacy).toBuffer();
  await sharp(square)
    .composite([{ input: circle(legacy), blend: "dest-in" }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(dir, "ic_launcher_round.png"));
  console.log(`${density}: layers ${layer} px, legacy ${legacy} px`);
}
