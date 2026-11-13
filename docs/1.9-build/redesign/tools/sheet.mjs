// A whole-page still cut into screens set side by side, small, to look at in one picture.
// node sheet.mjs <full.png> <out.png> [screenHeight=844] [scaleTo=300]
import { createRequire } from "node:module";
import path from "node:path";
const sharp = createRequire(path.join(process.cwd(), "package.json"))("sharp");
const [src, out, h = "844", w = "300"] = process.argv.slice(2);
const meta = await sharp(src).metadata();
const H = Number(h) * (meta.width / 390 >= 1.5 ? 2 : 1);
const n = Math.ceil(meta.height / H);
const colW = Number(w), colH = Math.round((H / meta.width) * colW), gap = 10;
const parts = [];
for (let i = 0; i < n; i++) {
  const top = i * H, height = Math.min(H, meta.height - top);
  const buf = await sharp(src).extract({ left: 0, top, width: meta.width, height }).resize({ width: colW }).png().toBuffer();
  parts.push({ input: buf, left: i * (colW + gap), top: 0 });
}
await sharp({ create: { width: n * (colW + gap) - gap, height: colH, channels: 3, background: "#444" } }).composite(parts).png().toFile(out);
console.log(`${n} screens -> ${out}`);
