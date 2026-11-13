// Several stills side by side, small. node row.mjs <out.png> <width> <a.png> <b.png> ...
import { createRequire } from "node:module";
import path from "node:path";
const sharp = createRequire(path.join(process.cwd(), "package.json"))("sharp");
const [out, w, ...files] = process.argv.slice(2);
const W = Number(w), gap = 10;
const bufs = [];
let H = 0;
for (const f of files) {
  const b = await sharp(f).resize({ width: W }).png().toBuffer();
  const m = await sharp(b).metadata();
  H = Math.max(H, m.height);
  bufs.push(b);
}
await sharp({ create: { width: files.length * (W + gap) - gap, height: H, channels: 3, background: "#444" } })
  .composite(bufs.map((input, i) => ({ input, left: i * (W + gap), top: 0 }))).png().toFile(out);
