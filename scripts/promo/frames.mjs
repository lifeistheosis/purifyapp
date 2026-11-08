// The promo's stills (scripts/promo/README.md): every look, with words and
// clean, 1080x1920 drawn at 2x (2160x3840), a 1080x1920 JPEG of each to
// send, and a contact sheet of each version for choosing.
//
//   node scripts/promo/frames.mjs
import path from "node:path";
import sharp from "sharp";
import { LOOKS, page } from "./looks.mjs";
import { dir, launch, openLook } from "./lib.mjs";

const OUT = dir("stills");
const SEND = dir("stills", "send");
const browser = await launch();
const tab = await (await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 2 })).newPage();
const made = { words: [], clean: [] };
for (const look of LOOKS) {
  for (const words of [true, false]) {
    const version = words ? "words" : "clean";
    const name = `${look.id}-${version}`;
    await openLook(tab, name, page(look.html(words)));
    await tab.waitForTimeout(300);
    const png = path.join(OUT, `${name}.png`);
    await tab.screenshot({ path: png });
    await sharp(png).resize(1080, 1920, { kernel: "lanczos3" }).jpeg({ quality: 92 }).toFile(path.join(SEND, `${name}.jpg`));
    made[version].push(png);
    console.log("still", name);
  }
}
await browser.close();

// A sheet of each version: four across, a little room between.
for (const [version, files] of Object.entries(made)) {
  const cols = 4;
  const [w, h, gap] = [432, 768, 12];
  const rows = Math.ceil(files.length / cols);
  const tiles = await Promise.all(files.map((f) => sharp(f).resize(w, h, { kernel: "lanczos3" }).toBuffer()));
  await sharp({ create: { width: cols * w + (cols + 1) * gap, height: rows * h + (rows + 1) * gap, channels: 3, background: "#18181a" } })
    .composite(tiles.map((input, i) => ({ input, left: gap + (i % cols) * (w + gap), top: gap + Math.floor(i / cols) * (h + gap) })))
    .jpeg({ quality: 88 })
    .toFile(path.join(SEND, `all-${version}.jpg`));
  console.log("sheet", version);
}
