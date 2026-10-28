// The gallery band (components/ui/GalleryBand.tsx): the owner's two gallery
// picks of 2026-10-27 are one pattern, Theology (round 12, A, "each subject a
// wide band with its icon, name and line") and Discover (round 7b, D, "like
// Theology"). What a reader would notice if this broke: the two galleries
// drifting apart, a band that turns to dark ink on a dark shade on Parchment,
// or a band that opens with motion while Purify's motion is off.
//
// Read as text: the components are server ones and this suite runs in node.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8").replace(/\r\n/g, "\n");
/** A file's code without its notes. */
const code = (file: string) =>
  read(file)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const BAND = "components/ui/GalleryBand.tsx";
const THEOLOGY = "components/theology/FaithMap.tsx";
const DISCOVER = "components/mobile/DiscoverMobile.tsx";

describe("the gallery band", () => {
  it("is the one band both galleries draw", () => {
    const theology = code(THEOLOGY);
    const discover = code(DISCOVER);
    expect(theology).toContain('import { GalleryBand } from "@/components/ui/GalleryBand";');
    expect(discover).toContain('import { GalleryBand } from "@/components/ui/GalleryBand";');
    // Theology's subjects are the tall bands that open where they stand;
    // Discover's doors are the short bands that lead away.
    expect(theology).toMatch(/<details className="group">\s*<GalleryBand\s+summary\s+size="tall"\s+heading="h3"/);
    expect(discover).toMatch(/<GalleryBand\s+href=\{e\.href\}/);
    expect(discover).not.toMatch(/size="tall"/);
  });

  it("draws its shade in the page's ground and its words in the page's ink", () => {
    // So it follows every palette: a literal black shade under the token ink
    // is dark on dark on Parchment.
    const band = code(BAND);
    expect(band).toContain("from-night/90 from-35% to-night/15");
    expect(band).toContain("from-night/93 from-40% to-night/12");
    expect(band).toContain("rtl:bg-gradient-to-l");
    expect(band).toMatch(/text-lede leading-\[1\.15\] text-paper/);
    expect(band).not.toMatch(/rgba?\(\s*0\s*,\s*0\s*,\s*0|#0[0-9a-f]{5}\b|bg-black\b/i);
  });

  it("wears no gold", () => {
    for (const file of [BAND, THEOLOGY, DISCOVER]) {
      expect(code(file), file).not.toMatch(/\bgold\b|-gold|premium|#c9a25a|201,\s*162,\s*90/i);
    }
  });

  it("is a picture for the eye, the name says what it is", () => {
    expect(code(BAND)).toMatch(/<img\s+src=\{picture\}\s+alt=""/);
  });

  it("opens with motion only while Purify's motion is on", () => {
    const css = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
    const open = /details\[open\] > \.band-open\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(open).toMatch(/animation:\s*band-open var\(--duration-base\) var\(--ease-house\) backwards;/);
    expect(css).toMatch(/:where\(\[data-motion="reduce"\]\) details\[open\] > \.band-open\s*\{\s*animation:\s*none;\s*\}/);
    const theology = code(THEOLOGY);
    expect(theology).toContain('className="band-open ');
    // The chevron turns as the band opens, and only with motion on.
    expect(theology).toMatch(/group-open:rotate-180 motion-reduce:transition-none/);
  });
});
