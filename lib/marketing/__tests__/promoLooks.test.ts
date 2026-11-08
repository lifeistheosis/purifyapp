// The promo maker's words (scripts/promo/README.md): an ad says only what the
// app is, in the house's voice. The looks are drawn from real screens; these
// are the parts a test can read.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const looks = read("scripts/promo/looks.mjs");
const capture = read("scripts/promo/capture.mjs");

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

describe("the promo screens", () => {
  it("show the free palettes only", () => {
    const themes = [...capture.matchAll(/theme: "([a-z-]+)"/g)].map((m) => m[1]);
    expect(themes).toEqual(["parchment"]);
    expect(capture).not.toMatch(/candlelight|monastery/i);
  });
});
