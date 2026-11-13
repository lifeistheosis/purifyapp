// The page's pictures: whole stills and crops of them, as webp. Run from the repo root.
// node pics.mjs <scratchpad>
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
const sharp = createRequire(path.join(process.cwd(), "package.json"))("sharp");
const S = process.argv[2];
const out = path.join(S, "round2", "stills");
fs.mkdirSync(out, { recursive: true });
// [name, source, crop in CSS px at 390 wide: top, bottom] (null = whole)
const list = [
  ["welcome-before", "b2/welcome.png", null],
  ["welcome-after", "a3/welcome.png", null],
  ["q1-before", "b2/q1-chosen.png", null],
  ["q1-after", "a3/q1-chosen.png", null],
  ["q2-before", "b2/q2.png", null],
  ["q2-after", "a3/q2.png", null],
  ["q3-before", "b2/q3.png", null],
  ["q3-after", "a3/q3.png", null],
  ["q4-after", "a3/q4.png", null],
  ["q1-ar", "a3/q1-chosen-ar.png", null],
  ["prayers-before", "b2/prayers.png", null],
  ["prayers-after", "a3/prayers.png", null],
  ["prayers-whole-before", "b2/prayers-full.png", null],
  ["prayers-whole-after", "a3/prayers-full.png", null],
  ["discover-before", "b2/discover.png", null],
  ["discover-after", "a3/discover.png", null],
  ["discover-new", "a3/discover-new.png", null],
  ["discover-ar", "a3/discover-ar.png", null],
];
const sizes = {};
for (const [name, src, crop] of list) {
  let img = sharp(path.join(S, src));
  const meta = await img.metadata();
  const k = meta.width >= 1500 ? 2 : meta.width / 390 >= 1.5 ? 2 : 1;
  if (crop) img = img.extract({ left: 0, top: crop[0] * k, width: meta.width, height: Math.min((crop[1] - crop[0]) * k, meta.height - crop[0] * k) });
  const info = await img.webp({ quality: 84 }).toFile(path.join(out, `${name}.webp`));
  sizes[name] = [info.width, info.height, Math.round(info.size / 1024)];
}
fs.writeFileSync(path.join(S, "round2", "sizes.json"), JSON.stringify(sizes));
console.log(Object.entries(sizes).map(([n, s]) => `${n} ${s[0]}x${s[1]} ${s[2]}KB`).join("\n"));
