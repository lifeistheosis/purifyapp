import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Admin's part 2 of the gate (2026-11-12): the screens at a tablet's width,
 * 800 by 1280 and 1032 by 1376, open reader, the five palettes, by the
 * pixels. The iOS app is universal, so the iPad is a platform of its own.
 * The fails that fell to Updates 2 (the arbiter's 17:00 UTC), each held here
 * so the next edit cannot put it back; each case fails on the code that run
 * walked. The Plus page's plan cards are held in faintText.test.ts, with the
 * graphite card they follow.
 */

const ROOT = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8");
const HALO = [
  "0 0 1px color-mix(in srgb, var(--color-night) 95%, transparent)",
  "0 0 3px color-mix(in srgb, var(--color-night) 90%, transparent)",
  "0 0 6px color-mix(in srgb, var(--color-night) 80%, transparent)",
];

describe("the florilegium's starters (fail 10)", () => {
  it("stand each name on the house's close halo, where a name of two lines climbs into its picture", () => {
    // "The Song of the Theotokos" read 3.58:1 on Candlelight and "The Prologue of John" 3.93 on Stone at 800 and 1032.
    const hub = read("components/florilegium/FlorilegiaHub.tsx");
    const tile = /<ul className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4" data-florilegium-starters="">[\s\S]*?<\/ul>/.exec(hub)?.[0] ?? "";
    expect(tile).toContain('<h3 data-carry-over="" className="relative font-serif text-[16px] font-semibold leading-[1.15] text-paper words-halo">');
    // The halo is the house's own, drawn in the page's ground on every palette.
    const css = read("app/globals.css");
    const halo = /\.words-halo \{([^}]*)\}/.exec(css)?.[1] ?? "";
    for (const layer of HALO) expect(halo).toContain(layer);
  });
});

describe("the reading room's featured book (fail 12)", () => {
  it("stands its words on the halo where they stand on the stage's picture, beside the poster on a tablet", () => {
    // The line of facts read 3.31:1 on Dark, Light, Candlelight and Monastery at 800 and 1032; the author 4.32 and the
    // blurb 4.33 on Candlelight.
    const room = read("components/reading/room.module.css");
    const tablet = /@media \(min-width: 768px\) \{\s*\.heroWords :is\(h2, p\) \{([\s\S]*?)\}\s*html\[data-reading-mode="parchment"\] \.heroWords :is\(h2, p\) \{([\s\S]*?)\}\s*\}/.exec(room);
    expect(tablet, "the tablet's halo").not.toBeNull();
    for (const layer of HALO) {
      expect(tablet![1]).toContain(layer);
      expect(tablet![2]).toContain(layer);
    }
    // The words are the stage's own: the poster's words, under heroWords.
    const work = read("components/reading/FeaturedWork.tsx");
    expect(work).toContain('data-stage-part="words" className={cn(styles.heroWords');
  });
});
