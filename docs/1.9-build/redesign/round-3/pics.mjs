// The page's pictures: whole stills and crops of them, as webp. Run from the repo root.
// node pics.mjs <scratchpad>
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
const sharp = createRequire(path.join(process.cwd(), "package.json"))("sharp");
const S = process.argv[2];
const out = path.join(S, "round3", "stills");
fs.mkdirSync(out, { recursive: true });
// [name, source, crop in CSS px at 390 wide: top, bottom] (null = whole)
const list = [
  ...JSON.parse(fs.readFileSync(new URL("./pics.json", import.meta.url), "utf8")),
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
fs.writeFileSync(path.join(S, "round3", "sizes.json"), JSON.stringify(sizes));
console.log(Object.entries(sizes).map(([n, s]) => `${n} ${s[0]}x${s[1]} ${s[2]}KB`).join("\n"));
