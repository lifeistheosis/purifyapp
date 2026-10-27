// The phone's own logo screens, drawn to match the intro's first frame (1.8).
//
//   node scripts/launch-assets.mjs
//
// The apps open on the phone's logo screen and then on the intro the document
// paints (components/native/LaunchFrame.tsx), whose first frame is the same
// cross on the same night ground. For the hand-over not to show, the cross
// must be the same size in the same place on both: CROSS_PX tall in the
// middle of the screen. This writes the native images from the real cross
// (public/purify-cross-mark.png, 177 by 311), never a redraw:
//
//   iOS: Splash.imageset, the cross alone at 1x, 2x and 3x.
//        LaunchScreen.storyboard draws it at its own size in the middle of the
//        night (contentMode center), so it is CROSS_PX points tall on every
//        iPhone and iPad. It used to be one 2732 px square filled to the
//        screen, which drew the cross anywhere from 100 to 200 points tall.
//
//   Android: drawable-nodpi/splash_cross.png, the splash icon. Android draws
//        a splash icon without a background as a 288 dp square (the visible
//        part a circle 192 dp across) whatever the image's own size, so the
//        cross is drawn into a square at the same proportion: CROSS_PX of 288.
//        At 4 pixels to the dp it is right on the sharpest screens, and the
//        phone scales it down for the rest. The launch theme names it
//        (res/values/styles.xml), and drawable/splash.xml puts the same square
//        on the night for the older path.
//
// CROSS_PX is LAUNCH_CROSS_PX in lib/platform/launchFrame.ts, and
// lib/platform/__tests__/launchFrame.test.ts holds the two and the images'
// sizes together. Change one and run this.

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const CROSS_PX = 80;
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const SOURCE = path.join(ROOT, "public/purify-cross-mark.png");
const { width: sw, height: sh } = await sharp(SOURCE).metadata();
const cross = (height) => sharp(SOURCE).resize(Math.round((height * sw) / sh), height, { fit: "fill", kernel: "lanczos3" }).png();

const ios = path.join(ROOT, "ios/App/App/Assets.xcassets/Splash.imageset");
for (const f of fs.readdirSync(ios)) if (f.endsWith(".png")) fs.rmSync(path.join(ios, f));
const images = [];
for (const scale of [1, 2, 3]) {
  const filename = `splash-cross@${scale}x.png`;
  await cross(CROSS_PX * scale).toFile(path.join(ios, filename));
  images.push({ idiom: "universal", filename, scale: `${scale}x` });
}
fs.writeFileSync(path.join(ios, "Contents.json"), `${JSON.stringify({ images, info: { version: 1, author: "xcode" } }, null, 2)}\n`);

const DP = 4;
const square = 288 * DP;
const tall = CROSS_PX * DP;
const mark = await cross(tall).toBuffer();
const { width: mw } = await sharp(mark).metadata();
const android = path.join(ROOT, "android/app/src/main/res/drawable-nodpi/splash_cross.png");
await sharp({ create: { width: square, height: square, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: mark, left: Math.round((square - mw) / 2), top: Math.round((square - tall) / 2) }])
  .png({ compressionLevel: 9 })
  .toFile(android);

console.log(`iOS: ${images.map((i) => i.filename).join(", ")}; Android: splash_cross.png, ${square} px square, the cross ${tall} px tall`);
