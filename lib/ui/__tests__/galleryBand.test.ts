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
    // is dark on dark on Parchment. The shade is the ground itself, under the
    // picture, and the picture is faded into it by a mask (the next case).
    const band = code(BAND);
    expect(band).toContain('<span aria-hidden className="absolute inset-0 bg-night" />');
    expect(band).toContain('tall ? "band-picture-tall" : "band-picture"');
    expect(band).toMatch(/text-lede leading-\[1\.15\] text-paper/);
    expect(band).not.toMatch(/rgba?\(\s*0\s*,\s*0\s*,\s*0|#0[0-9a-f]{5}\b|bg-black\b/i);

    // The shade's figures, as how much of the picture shows: 93% of the
    // ground across the start 40% to 12% at the far end, and the tall band's
    // 90% across 35% to 15%. Turned the other way where a page reads right
    // to left. A mask reads only the alpha, so its black is no colour.
    const css = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
    const rule = (selector: string) => {
      const at = css.indexOf(`\n${selector} {`);
      return at < 0 ? "" : css.slice(at, css.indexOf("}", at));
    };
    for (const [selector, side, mask] of [
      [".band-picture", "right", "rgb(0 0 0 / 0.07) 40%, rgb(0 0 0 / 0.88)"],
      [".band-picture-tall", "right", "rgb(0 0 0 / 0.1) 35%, rgb(0 0 0 / 0.85)"],
      ['[dir="rtl"] .band-picture', "left", "rgb(0 0 0 / 0.07) 40%, rgb(0 0 0 / 0.88)"],
      ['[dir="rtl"] .band-picture-tall', "left", "rgb(0 0 0 / 0.1) 35%, rgb(0 0 0 / 0.85)"],
    ]) {
      const body = rule(selector);
      // The prefixed form first, for an Android WebView before 120.
      expect(body, selector).toContain(`-webkit-mask-image: linear-gradient(to ${side}, ${mask});`);
      expect(body, selector).toContain(` mask-image: linear-gradient(to ${side}, ${mask});`);
      expect(body, selector).not.toMatch(/animation|transition/);
    }
  });

  // The owner's build 80 note 1 (Homebase/boards/purify-master/r18/
  // BUILD-80-NOTES.md, 2026-10-29): "at the top left and bottom left of a
  // card a thin sliver shows with no shadow, as if trimmed". The shade was a
  // dark layer over the picture, and the band clips each layer to its round
  // corners on its own: where the curve only partly covers a pixel, the
  // shade covered only part of what the picture put there, so a hairline of
  // the picture showed round the start corners, where the shade is dark. The
  // 1.8 export walk's picture of Discover had it: rgb(67, 53, 35) on the
  // curve of the Saints band, beside rgb(28, 24, 21) two pixels inside it.
  it("keeps its shade to the very edge: the picture is one faded layer over the ground, with nothing laid over it", () => {
    const band = code(BAND);
    const ground = band.indexOf('<span aria-hidden className="absolute inset-0 bg-night" />');
    const layer = band.indexOf('<span aria-hidden className={cn("absolute inset-0 bg-night-soft", tall ? "band-picture-tall" : "band-picture")}>');
    const preview = band.indexOf("blur-md");
    const img = band.indexOf("<img");
    const closed = band.indexOf("</span>", img);
    const words = band.indexOf('"relative flex h-full flex-col"');
    // The ground, then the picture's layer holding the preview and the
    // picture, then the words: in that order, and nothing of the picture
    // outside its layer.
    expect(ground).toBeGreaterThan(-1);
    expect(layer).toBeGreaterThan(ground);
    expect(preview).toBeGreaterThan(layer);
    expect(img).toBeGreaterThan(preview);
    expect(words).toBeGreaterThan(closed);
    expect(band.match(/<img\b/g)?.length).toBe(1);
    expect(band.match(/blur-md/g)?.length).toBe(1);
    expect(band.slice(img, closed)).not.toContain("<span");
    // No dark layer over the picture any more, in either direction.
    expect(band).not.toMatch(/bg-gradient-to-|\bfrom-night\/|\bto-night\//);
    // And the band's own box has no colour under its edge: its grey is in
    // the picture's layer, under the mask.
    const box = /const box = cn\(\s*"([^"]+)"/.exec(band)?.[1] ?? "";
    expect(box).toContain("overflow-hidden");
    expect(box).not.toMatch(/(^|\s)bg-/);
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
