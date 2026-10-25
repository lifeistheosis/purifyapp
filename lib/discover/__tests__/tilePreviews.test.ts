import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { TILE_PREVIEWS } from "../tilePreviews.generated";

// Discover's tiles show a tiny blurred preview until their picture loads
// (1.8). The table is written by scripts/tile-previews.mjs; this fails when a
// picture is added or changed and the table was not written again.

const dir = path.join(process.cwd(), "public", "discover", "tiles");

describe("the tile previews", () => {
  it("has one for every tile picture, made from the picture as it is now", () => {
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".webp")).sort();
    expect(Object.keys(TILE_PREVIEWS).sort(), "run: node scripts/tile-previews.mjs").toEqual(files.map((f) => `/discover/tiles/${f}`));
    for (const f of files) {
      const of = crypto.createHash("sha1").update(fs.readFileSync(path.join(dir, f))).digest("hex").slice(0, 12);
      expect(TILE_PREVIEWS[`/discover/tiles/${f}`].of, `${f} changed: run node scripts/tile-previews.mjs`).toBe(of);
    }
  });

  it("keeps each preview small enough to carry inline", () => {
    for (const [file, { src }] of Object.entries(TILE_PREVIEWS)) {
      expect(src.startsWith("data:image/webp;base64,"), file).toBe(true);
      expect(src.length, file).toBeLessThan(600);
    }
  });
});
