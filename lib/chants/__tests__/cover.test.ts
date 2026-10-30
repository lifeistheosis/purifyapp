// A chant with no cover, and a track with no picture, never show an empty box
// (1.8). The coordinator's walk of the merged export on 2026-10-30 found the
// Chants home opening on Psalm 117 with a blank grey square for its cover:
// none of the six chants added that day has one. In their place is the plate,
// the dark ground with the three-bar cross glowing white and, where there is
// room, the chant's languages (components/ui/CrossPlate.tsx). Rendered to
// static markup: react-dom/server needs no DOM.

import fs from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ChantCover, languagesOf } from "@/components/chants/ChantCover";
import { CoverArt, plateSize } from "@/components/player/CoverArt";
import { CrossPlate } from "@/components/ui/CrossPlate";
import { chantIndex } from "@/lib/chants/registry.server";

const render = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);

describe("a chant's cover", () => {
  it("is the plate when the chant has none: the cross, glowing, and its languages where there is room", () => {
    const languages = ["العربية", "English", "Ελληνικά", "Srpski"];
    for (const size of ["hero", "card"] as const) {
      const html = render(createElement(ChantCover, { languages, size, className: "w-full" }));
      expect(html, size).toContain('data-cover="plate"');
      expect(html, size).toContain("cross-plate-mark");
      expect(html.match(/<line /g)?.length, size).toBe(4);
      expect(html, size).toContain("العربية · English · Ελληνικά · Srpski");
      expect(html, size).toContain('aria-hidden="true"');
      expect(html, size).not.toContain("<img");
    }
    // A thumb is the cross alone: too small for a line of words.
    const thumb = render(createElement(ChantCover, { languages, size: "thumb", className: "w-12" }));
    expect(thumb).toContain("cross-plate-mark");
    expect(thumb).not.toContain("English");
  });

  it("is the icon when the chant has one", () => {
    const html = render(createElement(ChantCover, { cover: { src: "/audio/art/anthem.jpg", alt: "The Holy Trinity" }, size: "hero" }));
    expect(html).toContain('data-cover="img"');
    expect(html).toContain('src="/audio/art/anthem.jpg"');
    expect(html).not.toContain("cross-plate-mark");
  });

  it("names each chant's versions once, in its own order", () => {
    expect(languagesOf([{ label: "English" }, { label: "Ελληνικά" }, { label: "English" }])).toEqual(["English", "Ελληνικά"]);
    for (const row of chantIndex()) {
      if (row.cover) continue;
      const html = render(createElement(ChantCover, { languages: languagesOf(row.variants), size: "card" }));
      expect(html, row.slug).toContain(languagesOf(row.variants).join(" · "));
    }
  });
});

describe("the player's picture", () => {
  it("is the plate when there is none, never an empty tile", () => {
    const html = render(createElement(CoverArt, { src: null, size: 48, className: "h-12 w-12" }));
    expect(html).toContain('data-cover="plate"');
    expect(html).toContain("cross-plate-mark");
    expect(html).not.toContain("bg-paper/10");
    expect([plateSize(340), plateSize(120), plateSize(48), plateSize(24)]).toEqual(["hero", "card", "thumb", "thumb"]);
  });

  it("is the plate in Now Playing for a chant with no cover, large and small", () => {
    const sheet = fs.readFileSync("components/player/NowPlayingSheet.tsx", "utf8");
    expect(sheet.match(/<CrossPlate\b/g)?.length).toBe(2);
    expect(fs.readFileSync("components/player/PrayWithChant.tsx", "utf8")).toContain("<CrossPlate");
  });

  it("draws a plate a disc can hold, with no words on it", () => {
    const html = render(createElement(CrossPlate, { size: "disc", caption: "English", className: "rounded-full size-9" }));
    expect(html).toContain("rounded-full size-9");
    expect(html).not.toContain("English");
  });
});

describe("the plate's cross", () => {
  const css = fs.readFileSync("app/globals.css", "utf8");

  it("glows white on the dark palettes and is the plain ink on Parchment", () => {
    expect(css).toMatch(/\.cross-plate-mark \{\s*filter: drop-shadow\(0 0 3px rgb\(255 255 255 \/ 0\.85\)\) drop-shadow\(0 0 10px rgb\(255 255 255 \/ 0\.35\)\);\s*\}/);
    expect(css).toMatch(/html\[data-reading-mode="parchment"\] \.cross-plate-mark \{\s*filter: none;\s*\}/);
  });

  it("is black, white and grey only", () => {
    const plate = fs.readFileSync("components/ui/CrossPlate.tsx", "utf8");
    // The page's tokens and white, nothing tinted.
    expect(plate).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(plate).not.toMatch(/\b(gold|amber|yellow|red|blue|green)\b/i);
    expect(plate).toContain("bg-night-soft");
  });
});
