// Discover's library on a phone, as a gallery (components/mobile/DiscoverMobile.tsx).
//
// The owner's pick of 2026-10-27, round 7b, D: "each part of the library a
// wide band with its picture and the app's line on what is inside, like
// Theology". Until then the library was picture tiles two across with the
// last two as narrow rows (lib/discover/grid.ts held that layout, and went
// with it). What a reader would notice if this broke: a door missing from
// Discover, the doors out of their order, a band with no picture or with
// its own name again where its line should be, or Chat's unread dot gone.
//
// Read as text because the component is a server one with next and React
// behind it, and this suite runs in plain node.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { TILE_PREVIEWS } from "@/lib/discover/tilePreviews.generated";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const EN = JSON.parse(fs.readFileSync(path.join(ROOT, "lib", "i18n", "messages", "en.json"), "utf8")) as Record<string, string>;
const source = fs
  .readFileSync(path.join(ROOT, "components", "mobile", "DiscoverMobile.tsx"), "utf8")
  .replace(/\r\n/g, "\n");

// Only the list itself: from its declaration to the bracket that closes it.
const start = source.indexOf("const entries: DiscoverEntry[] = [");
const block = source.slice(start, source.indexOf("\n  ];", start));

// Each door's own lines: every entry opens with its label.
const doors = block
  .split(/\n\s*label: /)
  .slice(1)
  .map((text) => ({
    text,
    href: /href:\s*"(\/[a-z-]+)"/.exec(text)?.[1] ?? "",
    label: /^<T k="([^"]+)" \/>/.exec(text)?.[1] ?? "",
    blurb: /blurb:\s*<T k="([^"]+)" \/>/.exec(text)?.[1] ?? "",
    picture: /picture:\s*"([^"]+)"/.exec(text)?.[1] ?? "",
    focus: /focus:\s*"([^"]+)"/.exec(text)?.[1],
  }));

describe("the Discover gallery", () => {
  it("reads the list", () => {
    // A pattern that quietly matched nothing would pass every check below.
    expect(start).toBeGreaterThan(-1);
    expect(doors.length).toBeGreaterThanOrEqual(10);
    for (const d of doors) expect(d.href, d.text.slice(0, 60)).not.toBe("");
  });

  it("keeps every door the tiles had, in their order", () => {
    // People first; then the reading room and the Church's record; what is
    // sung and kept through the year; the walkthroughs; the Shop and Chat,
    // tabs until 2026-10-13; and last the two doors for the newcomer, Start
    // here and then Find a parish.
    expect(doors.map((d) => d.href)).toEqual([
      "/saints",
      "/reading",
      "/history",
      "/councils",
      "/theology",
      "/chants",
      "/calendar",
      "/walkthroughs",
      "/shop",
      "/community",
      "/start",
      "/parishes",
    ]);
  });

  it("has the Shop only while the shop is on, and Chants for every reader", () => {
    const shop = block.slice(block.indexOf("...(shopEnabled()"), block.indexOf('href: "/community"'));
    expect(shop).toContain('href: "/shop"');
    expect(block).not.toContain("/kitchen");
    expect(block).not.toContain("trapezaEnabled");
  });

  it("draws each door as a band with its picture on disk, and its preview", () => {
    for (const d of doors) {
      expect(d.picture.startsWith("/discover/tiles/"), d.href).toBe(true);
      expect(fs.existsSync(path.join(ROOT, "public", d.picture)), d.picture).toBe(true);
      expect(TILE_PREVIEWS[d.picture], `${d.picture} has no preview: run node scripts/tile-previews.mjs`).toBeTruthy();
      if (d.focus) expect(d.focus, d.href).toMatch(/^\d{1,3}% \d{1,3}%$/);
    }
    expect(source).toMatch(/<GalleryBand\b[\s\S]*?href=\{e\.href\}/);
    expect(source).toContain("preview={TILE_PREVIEWS[e.picture]?.src}");
    expect(source).not.toMatch(/\bSoftTile\b/);
  });

  it("gives every door a line of its own, the app's own words for the place", () => {
    for (const d of doors) {
      expect(d.label, d.href).not.toBe("");
      expect(d.blurb, d.href).not.toBe("");
      expect(EN[d.label], d.label).toBeTruthy();
      expect(EN[d.blurb], d.blurb).toBeTruthy();
      // The tiles drew no line, so two doors carried their own name again
      // in its place. A band reads it, so it has to say what is inside.
      expect(EN[d.blurb], `${d.href} repeats its name`).not.toBe(EN[d.label]);
    }
  });

  it("carries Chat's unread dot on the Chat band", () => {
    const chat = doors.find((d) => d.href === "/community");
    expect(chat?.text).toContain("badge: <UnreadDot />");
    expect(source).toContain("badge={e.badge}");
  });
});
