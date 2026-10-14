// Copy the Mosaic pictures into the iPhone widget extension's asset catalog.
//
// The pictures are baked once, for Android, by scripts/emit-widget-art.mjs:
// android/app/src/main/res/drawable-nodpi/mosaic_<paint>_<square|wide>.webp.
// The iPhone widgets show the same pictures (docs/WIDGETS.md), so this copies
// them and never draws them again. Each becomes a data set in
// ios/App/PurifyWidgets/Assets.xcassets, which the extension opens by name
// (NSDataAsset) and decodes with ImageIO, cut to the widget's size
// (MosaicArt in ios/App/PurifyWidgets/WidgetLook.swift). A data set, not an
// image set, because an asset catalog keeps any file as data, while WebP in
// an image set is nothing Apple promises.
//
// The copies are not committed (ios/.gitignore): the Android folder stays the
// one place the pictures live, so they cannot drift apart. The iOS workflow
// runs this after `npx cap sync ios` and before the archive, and it stops the
// build when a picture the widgets draw is missing, rather than shipping
// widgets that fall back to a plain card.
//
// Usage:
//   node scripts/ios-widget-assets.mjs                  (stops on a missing picture)
//   node scripts/ios-widget-assets.mjs --allow-missing  (copies what is there)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FROM = path.join(REPO, "android/app/src/main/res/drawable-nodpi");
const CATALOG = path.join(REPO, "ios/App/PurifyWidgets/Assets.xcassets");

// Every picture the widgets ask for. The names are the art engine's own:
// "night" is the cross, "theotokos" dresses the Dormition, "dawn" and "dusk"
// are Pray now's morning and evening (MosaicArt.paint in WidgetLook.swift).
const PAINTS = ["pascha", "nativity", "theophany", "theotokos", "lent", "night", "lampada", "dawn", "dusk"];
const SHAPES = ["square", "wide"];

const allowMissing = process.argv.includes("--allow-missing");

if (!fs.existsSync(path.join(CATALOG, "Contents.json"))) {
  console.error(`✗ No asset catalog at ${path.relative(REPO, CATALOG)}. Run this from the repository.`);
  process.exit(1);
}

// Start clean, so a picture renamed or dropped on the Android side does not
// linger here from an earlier run.
for (const entry of fs.readdirSync(CATALOG)) {
  if (/^mosaic_.+\.dataset$/.test(entry)) {
    fs.rmSync(path.join(CATALOG, entry), { recursive: true, force: true });
  }
}

const missing = [];
let copied = 0;
let bytes = 0;
for (const paint of PAINTS) {
  for (const shape of SHAPES) {
    const name = `mosaic_${paint}_${shape}`;
    const source = path.join(FROM, `${name}.webp`);
    if (!fs.existsSync(source)) {
      missing.push(`${name}.webp`);
      continue;
    }
    const set = path.join(CATALOG, `${name}.dataset`);
    fs.mkdirSync(set, { recursive: true });
    fs.copyFileSync(source, path.join(set, `${name}.webp`));
    const contents = {
      data: [{ filename: `${name}.webp`, idiom: "universal" }],
      info: { author: "xcode", version: 1 },
    };
    fs.writeFileSync(path.join(set, "Contents.json"), JSON.stringify(contents, null, 2) + "\n");
    copied += 1;
    bytes += fs.statSync(source).size;
  }
}

console.log(
  `• widget pictures: ${copied} of ${PAINTS.length * SHAPES.length} copied into ` +
    `ios/App/PurifyWidgets/Assets.xcassets (${(bytes / 1024).toFixed(0)} KB)`,
);

if (missing.length > 0) {
  const what =
    `${missing.length} picture(s) missing from android/app/src/main/res/drawable-nodpi: ` +
    `${missing.join(", ")}. They are made by node scripts/emit-widget-art.mjs.`;
  if (allowMissing) {
    console.warn(`! ${what} Those widgets fall back to a plain card.`);
  } else {
    console.error(`✗ ${what}`);
    process.exit(1);
  }
}
