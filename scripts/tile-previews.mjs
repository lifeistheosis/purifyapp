// Writes lib/discover/tilePreviews.generated.ts: each Discover tile picture
// as a tiny preview (16 px across) the page carries inline, drawn blurred
// under the tile until the picture itself has loaded (1.8). The table keeps a
// short hash of each picture; lib/discover/__tests__/tilePreviews.test.ts
// fails when a picture changes and the table does not.
//
//   node scripts/tile-previews.mjs
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import sharp from "sharp";

const dir = path.join(process.cwd(), "public", "discover", "tiles");
const rows = [];
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".webp")).sort()) {
  const bytes = fs.readFileSync(path.join(dir, file));
  const of = crypto.createHash("sha1").update(bytes).digest("hex").slice(0, 12);
  const tiny = await sharp(bytes).resize({ width: 16 }).webp({ quality: 50 }).toBuffer();
  rows.push([`/discover/tiles/${file}`, `data:image/webp;base64,${tiny.toString("base64")}`, of]);
}
const out = path.join(process.cwd(), "lib", "discover", "tilePreviews.generated.ts");
fs.writeFileSync(
  out,
  "// Written by scripts/tile-previews.mjs from public/discover/tiles. Do not edit by hand.\n" +
    "export const TILE_PREVIEWS: Readonly<Record<string, { src: string; of: string }>> = {\n" +
    rows.map(([k, src, of]) => `  ${JSON.stringify(k)}: { src: ${JSON.stringify(src)}, of: ${JSON.stringify(of)} },`).join("\n") +
    "\n};\n",
);
console.log(`lib/discover/tilePreviews.generated.ts: ${rows.length} previews`);
