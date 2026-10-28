import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { ANSWER_PICTURES, PICTURE_SLOTS } from "../pictures";
import { INTENTS } from "../space";

// The pictures on "What are you looking for?" (1.8, the owner's pick B of
// round 14): one map, so the owner's own pictures drop in a row at a time.

const PUBLIC = path.join(process.cwd(), "public");

describe("the answers' pictures", () => {
  it("give every answer a picture, and nothing else one", () => {
    expect(Object.keys(ANSWER_PICTURES).sort()).toEqual([...INTENTS].sort());
  });

  it("name each answer's slot for the picture the owner is making for it, once each", () => {
    expect(ANSWER_PICTURES.prayer.slot).toBe("onboarding-rule");
    expect(ANSWER_PICTURES.study.slot).toBe("onboarding-study");
    expect(ANSWER_PICTURES.quiet.slot).toBe("onboarding-quiet");
    expect(ANSWER_PICTURES.liturgy.slot).toBe("onboarding-liturgy");
    expect(INTENTS.map((i) => ANSWER_PICTURES[i].slot).sort()).toEqual([...PICTURE_SLOTS].sort());
  });

  it("draw a file the app carries, so it shows offline in the apps", () => {
    for (const intent of INTENTS) {
      const { src } = ANSWER_PICTURES[intent];
      expect(src, intent).toMatch(/^\/[^?#]+\.(?:webp|jpg|avif|png)$/);
      expect(fs.existsSync(path.join(PUBLIC, src)), `${intent}: public${src}`).toBe(true);
    }
  });

  it("draw none from a folder the apps fetch from the website instead of carrying", () => {
    // scripts/native-build.mjs takes these out of the bundle (["public", ...]
    // rows): History's pictures and the reading room's covers among them. In
    // the export of 2026-10-28 two cards drew broken pictures from them.
    const build = fs.readFileSync(path.join(process.cwd(), "scripts/native-build.mjs"), "utf8");
    const fetched = [...build.matchAll(/\[\s*"public"((?:\s*,\s*"[^"]+")+)\s*\]/g)].map(
      (m) => "/" + [...m[1].matchAll(/"([^"]+)"/g)].map((p) => p[1]).join("/") + "/",
    );
    expect(fetched).toContain("/covers/");
    expect(fetched).toContain("/history/media/");
    for (const intent of INTENTS) {
      const { src } = ANSWER_PICTURES[intent];
      for (const folder of fetched) expect(src.startsWith(folder), `${intent}: ${src} is under ${folder}`).toBe(false);
    }
  });

  it("give four answers four pictures", () => {
    expect(new Set(INTENTS.map((i) => ANSWER_PICTURES[i].src)).size).toBe(INTENTS.length);
  });

  it("take a final picture only under its own slot's name, as a WebP", () => {
    // public/onboarding/ holds the owner's pictures and nothing else: a file
    // there named for another slot would be the wrong picture on a card.
    for (const intent of INTENTS) {
      const { slot, src } = ANSWER_PICTURES[intent];
      if (src.startsWith("/onboarding/")) expect(src, intent).toBe(`/onboarding/${slot}.webp`);
    }
  });

  it("place each crop with a CSS position", () => {
    for (const intent of INTENTS) expect(ANSWER_PICTURES[intent].focus, intent).toMatch(/^\d{1,3}% \d{1,3}%$/);
  });
});
