// The promo maker's words (scripts/promo/README.md): an ad says only what the
// app is, in the house's voice. The looks are drawn from real screens; these
// are the parts a test can read.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { fourPointStars } from "@/scripts/lib/four-point-star.mjs";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const looks = read("scripts/promo/looks.mjs");
const capture = read("scripts/promo/capture.mjs");
const scripts = readdirSync(join(process.cwd(), "scripts/promo")).filter((f) => f.endsWith(".mjs"));

describe("the promo looks", () => {
  it("are seven, each drawn with words and clean", () => {
    expect(looks.match(/^\s{4}id: "\d-[a-z-]+",$/gm)).toHaveLength(7);
    expect(looks.match(/html: \(words\) =>/g)).toHaveLength(7);
  });

  it("use no dashes in place of words", () => {
    expect(looks).not.toMatch(/[–—]/);
  });

  it("call the app free to download, never simply free, since Plus is paid", () => {
    expect(looks).toContain("Free to download on iPhone and Android.");
    expect(looks).not.toMatch(/Free on /);
  });

  it("name only what the app holds: one akathist, so never \"the akathists\"", () => {
    expect(looks).not.toMatch(/the akathists/i);
  });

  it("quote Psalm 22:1 as the app's own Brenton gives it", () => {
    const verse = JSON.parse(read("data/bible/psalms/22.json")).verses[0].text as string;
    const drawn = /data-m="h1"[^>]*>(<span[^>]*>T<\/span>he Lord[^<]*(?:<br>[^<]*)*)<\/p>/.exec(looks)?.[1] ?? "";
    expect(drawn.replace(/<span[^>]*>T<\/span>/, "T").replace(/<br>/g, " ")).toBe(verse);
    expect(looks).toContain("Psalm 22:1 · Brenton");
  });

  it("credit the mosaic beside it, in both versions", () => {
    const credit = "Mosaic of St John Chrysostom, Hosios Loukas, early 11th century · Public domain";
    expect(looks).toContain(credit);
    // Outside the words-only part of its look, so the clean version keeps it.
    const line = looks.split("\n").find((l) => l.includes(credit)) ?? "";
    expect(line).toMatch(/data-m="caption"/);
    expect(line).not.toMatch(/\$\{words \?/);
  });
});

describe("the promo light", () => {
  it("is a soft pool, never a burst of separate rays (the owner's word of 2026-11-08: vibe-coded AI slop)", () => {
    for (const file of scripts) {
      expect(read(`scripts/promo/${file}`), file).not.toMatch(/conic-gradient/);
    }
  });
});

// The owner's word of 2026-11-11 (CLAUDE.md, "No sparkle star"): the
// four-point sparkle is vibe-coded AI slop, on no frame, card or post. The
// glyphs are written as their codes, so this file holds none of them.
describe("the promo marks", () => {
  it("never draw the four-point sparkle star: not as a glyph, not as the icon, not as a shape", () => {
    for (const file of scripts) {
      const source = read(`scripts/promo/${file}`);
      expect(source, file).not.toMatch(/[✦✧✨]/u);
      expect(source, file).not.toMatch(/icons\/Sparkle|<Sparkle\b/);
      expect(fourPointStars(source), file).toEqual([]);
    }
  });

  it("know a four-point star when one is drawn, and nothing else for one", () => {
    // The app's Nativity star as it stood on 2026-11-11, the Sparkle icon, and four arcs bowed in.
    expect(fourPointStars(`<path d="M12 1.5 L13.3 10.7 L22.5 12 L13.3 13.3 L12 22.5 L10.7 13.3 L1.5 12 L10.7 10.7 Z"/>`)).toHaveLength(1);
    expect(fourPointStars(`d="M12 3.5c.7 4 2.5 5.8 6.5 6.5-4 .7-5.8 2.5-6.5 6.5-.7-4-2.5-5.8-6.5-6.5 4-.7 5.8-2.5 6.5-6.5z"`)).toHaveLength(1);
    expect(fourPointStars(`d="M12 2 A10 10 0 0 0 22 12 A10 10 0 0 0 12 22 A10 10 0 0 0 2 12 A10 10 0 0 0 12 2 Z"`)).toHaveLength(1);
    // Not sparkles: the five-point Star, the Octogram's diamond, a circle in four curves or four arcs, a horizon, an octagon.
    expect(fourPointStars(`d="M12 3.8l2.5 5.1 5.6.8-4 3.9.9 5.6-5-2.6-5 2.6.9-5.6-4-3.9 5.6-.8L12 3.8z"`)).toEqual([]);
    expect(fourPointStars(`points="12,2.5 21.5,12 12,21.5 2.5,12"`)).toEqual([]);
    expect(fourPointStars(`d="M12 2 C17.5 2 22 6.5 22 12 C22 17.5 17.5 22 12 22 C6.5 22 2 17.5 2 12 C2 6.5 6.5 2 12 2 Z"`)).toEqual([]);
    expect(fourPointStars(`d="M12 2 A10 10 0 0 1 22 12 A10 10 0 0 1 12 22 A10 10 0 0 1 2 12 A10 10 0 0 1 12 2 Z"`)).toEqual([]);
    expect(fourPointStars(`d="M-20 196 Q 175 150 370 196 Z"`)).toEqual([]);
    expect(fourPointStars(`d="M8 2 L16 2 L22 8 L22 16 L16 22 L8 22 L2 16 L2 8 Z"`)).toEqual([]);
  });
});

describe("the promo screens", () => {
  it("show the free palettes only", () => {
    const themes = [...capture.matchAll(/theme: "([a-z-]+)"/g)].map((m) => m[1]);
    expect(themes).toEqual(["parchment"]);
    expect(capture).not.toMatch(/candlelight|monastery/i);
  });
});
