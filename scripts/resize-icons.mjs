// Resize all saint icons to a max of 800px on the longer edge,
// re-encoded as JPEG quality 85. Skips files already small enough.
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const DIR = path.join(process.cwd(), "public", "saints", "icons");
const MAX = 800;

const files = (await fs.readdir(DIR)).filter((f) => /\.(jpe?g|png)$/i.test(f));
let totalBefore = 0;
let totalAfter = 0;

for (const f of files) {
  const full = path.join(DIR, f);
  const before = (await fs.stat(full)).size;
  totalBefore += before;
  const buf = await sharp(full)
    .resize({ width: MAX, height: MAX, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();
  // Write to a temp file then atomic-rename to avoid clashing with the
  // dev server / next/image keeping the original open.
  const tmp = full + ".tmp";
  await fs.writeFile(tmp, buf);
  await fs.rename(tmp, full);
  const after = buf.length;
  totalAfter += after;
  console.log(
    `${f}  ${(before / 1024).toFixed(0)} KB -> ${(after / 1024).toFixed(0)} KB`,
  );
}

console.log(
  `\ntotal: ${(totalBefore / 1024).toFixed(0)} KB -> ${(totalAfter / 1024).toFixed(0)} KB (saved ${(((totalBefore - totalAfter) / totalBefore) * 100).toFixed(0)}%)`,
);
