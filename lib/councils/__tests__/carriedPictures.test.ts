import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { isCarried } from "@/lib/media/carried";
import { avifFor } from "@/lib/media/streamed";

import { allShelves, councilBooks, shelfCouncil } from "../books";
import { COUNCILS } from "../councils";
import { councilFocus } from "../page";

/**
 * The seven Ecumenical Councils' pictures in the reading room, with no signal
 * (the gate's final run of 2026-11-12; the arbiter's word of 02:08 UTC). The
 * apps carry each as AVIF (lib/media/carried.ts) and ask the website for its
 * JPEG. A council's books on /reading/councils/ and the backdrop of its shelf
 * were drawn from the JPEG's address alone, so a reader with no signal saw
 * none of the seven. A cover offers the AVIF beside its JPEG first
 * (components/covers/WorkCover.tsx, through avifFor), and avifFor now knows
 * the carried seven; the shelf's backdrop offers it the same way.
 *
 * What it cannot see: the requests. The export check opens the room with no
 * network and finds each of the seven drawn from the bundle.
 *
 * What a reader would notice if this broke: on a plane, the councils' shelves
 * in the reading room show the plain plate where each council's icon was.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

/** Every council picture the reading room draws in the apps: each book's cover and each shelf's backdrop. */
function nativePictures(): string[] {
  const out = new Set<string>();
  for (const c of COUNCILS) {
    for (const b of councilBooks(c, true)) if (b.cover?.src?.includes("/history/")) out.add(b.cover.src);
    const shelf = shelfCouncil(c, true, councilFocus(c.slug));
    if (shelf.picture) out.add(shelf.picture.src);
  }
  // And the room's index, every council's shelf as /reading/councils/ lists them.
  for (const s of allShelves(true, councilFocus)) {
    for (const b of s.books) if (b.cover?.src?.includes("/history/")) out.add(b.cover.src);
    if (s.council.picture) out.add(s.council.picture.src);
  }
  return [...out];
}

describe("the councils' pictures in the reading room, with no signal", () => {
  it("are the seven the apps carry, asked of the website as JPEGs", () => {
    const pictures = nativePictures();
    expect(pictures).toHaveLength(7);
    for (const src of pictures) expect(src, src).toMatch(/^https?:\/\/[^/]+\/history\/media\/.+\.jpg$/);
  });

  it("each offer the AVIF the bundle carries first", () => {
    for (const src of nativePictures()) {
      const avif = avifFor(src);
      expect(avif, src).not.toBeNull();
      expect(avif!.startsWith("/history/media/"), String(avif)).toBe(true);
      expect(isCarried(avif!), String(avif)).toBe(true);
    }
  });

  it("offers the same AVIF on the website, where the JPEG is the page's own", () => {
    for (const src of nativePictures()) {
      const own = src.replace(/^https?:\/\/[^/]+/, "");
      expect(avifFor(own), own).toBe(own.replace(/\.jpg$/, ".avif"));
    }
  });

  it("offers no AVIF for a history picture the apps do not carry, nor for another site's", () => {
    expect(avifFor("/history/media/not-carried-anywhere.jpg")).toBeNull();
    expect(avifFor("https://example.org/history/media/first-council-of-nicaea.v1.jpg")).toBeNull();
  });

  it("draws a shelf's backdrop with the AVIF before its JPEG", () => {
    const shelf = read("components/councils/CouncilShelf.tsx");
    expect(shelf).toContain("const avif = avifFor(src);");
    expect(shelf).toMatch(/<picture className="contents">\s*\{avif \? <source type="image\/avif" srcSet=\{avif\} \/> : null\}/);
  });
});
