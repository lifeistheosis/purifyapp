import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { RELEASE_HIGHLIGHTS } from "../highlights";
import { CURRENT_VERSION } from "../version";

const ROOT = path.resolve(__dirname, "../../..");
const en = JSON.parse(readFileSync(path.join(ROOT, "lib/i18n/messages/en.json"), "utf8")) as Record<string, string>;

describe("release highlights", () => {
  it("belong to the current release", () => {
    expect(RELEASE_HIGHLIGHTS.version).toBe(CURRENT_VERSION);
  });

  it("name every string by a key the catalog has", () => {
    const keys = [
      RELEASE_HIGHLIGHTS.eyebrow,
      RELEASE_HIGHLIGHTS.title,
      RELEASE_HIGHLIGHTS.sub,
      ...RELEASE_HIGHLIGHTS.items.flatMap((it) => [it.label, it.caption]),
    ];
    for (const k of keys) expect(en[k], k).toBeTruthy();
  });

  it("point at a picture that exists, at the size it is declared", async () => {
    for (const it of RELEASE_HIGHLIGHTS.items) {
      const file = path.join(ROOT, "public", it.image.src);
      expect(existsSync(file), it.image.src).toBe(true);
      const meta = await sharp(file).metadata();
      expect([meta.width, meta.height], it.image.src).toEqual([it.image.width, it.image.height]);
    }
  });
});
