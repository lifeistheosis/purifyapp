// A picture in a round box, with a wash over it (found with the owner's build
// 80 note 1, Homebase/boards/purify-master/r18/BUILD-80-NOTES.md,
// 2026-10-29). A box that hides its overflow behind round corners clips each
// of its layers to the curve on its own, so where the curve only partly
// covers a pixel, a dark layer over the picture covers only part of what the
// picture put there, and a hairline of the picture shows round the corner.
// The gallery bands were the first (galleryBand.test.ts). The Bible and You
// mastheads had it at their two foot corners, under a 95% wash, and Today's
// readings band at its two start corners, under a 90% shade: 1.8's markup,
// drawn with the real pictures, measured 25, 12 and 16 levels lighter along
// the curve than just inside it on the Dark palette.
//
// Each now lays the wash's own colour under the picture and fades the
// picture into it by a mask with the wash's figures turned over, so the
// picture is faded before it is clipped. Inside the shape every pixel is as
// it was, on every palette: a ground under a picture shown at (1 - a) is the
// same mix as a wash of a over the picture.
//
// What a reader would notice if this broke: a thin bright line round the foot
// corners of the Bible and You pictures, or round the start corners of
// Today's readings. The export walk measures those corners (sections 23, 27
// and 28, cornerLift in scripts/export-walk.mjs); this holds the source.

import fs from "node:fs";
import path from "node:path";

import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SectionMasthead } from "@/components/mobile/SectionMasthead";
import { sectionMedia } from "@/lib/media/sections";

const ROOT = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8").replace(/\r\n/g, "\n");
/** A file's code without its notes. */
const code = (file: string) =>
  read(file)
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
const css = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
/** The body of a rule in globals.css, by its exact selector. */
const rule = (selector: string) => {
  const at = css.indexOf(`\n${selector} {`);
  return at < 0 ? "" : css.slice(at, css.indexOf("}", at));
};
/** The class list of the first element in `html` that carries `marker`. */
const classOf = (html: string, marker: string) => {
  const at = html.indexOf(marker);
  if (at < 0) return "";
  const open = html.lastIndexOf("<", at);
  return /class="([^"]*)"/.exec(html.slice(open, html.indexOf(">", at) + 1))?.[1] ?? "";
};
/** A mask's stops: how much shows, and where. */
const stops = (mask: string) =>
  [...mask.matchAll(/rgb\(0 0 0(?: \/ ([\d.]+))?\)(?: (\d+)%)?/g)].map((m) => ({ shows: m[1] === undefined ? 1 : Number(m[1]), at: m[2] === undefined ? null : Number(m[2]) }));

describe("the wide masthead (the Bible and You tabs)", () => {
  for (const section of ["bible", "you"] as const) {
    it(`lays the wash's colour under the ${section} picture and fades the picture into it, with nothing laid over it`, () => {
      const media = sectionMedia(section);
      expect(media && !media.portrait, `${section} is a wide plate`).toBe(true);
      const html = renderToString(createElement(SectionMasthead, { section }));
      // The plate still hides its overflow behind its round corners, and has
      // no colour of its own under its edge: its inset hairline stays under
      // the ground, as it stayed under the picture.
      const figure = classOf(html, "<figure");
      expect(figure).toContain("overflow-hidden");
      expect(figure).toContain("rounded-[26px]");
      expect(figure).toContain("ring-inset");
      expect(figure).not.toMatch(/(^|\s)bg-/);
      // The ground, then the picture with its mask, then the words.
      const ground = html.indexOf('<span aria-hidden="true" class="absolute inset-0 bg-night">');
      const img = html.indexOf("<img");
      expect(ground).toBeGreaterThan(-1);
      expect(img).toBeGreaterThan(ground);
      expect(classOf(html, "<img")).toBe("masthead-picture absolute inset-0 h-full w-full object-cover");
      expect(html.match(/<img\b/g)?.length).toBe(1);
      // No wash over the picture any more, in either direction.
      expect(html).not.toMatch(/bg-gradient-to-|\bfrom-night\/|\bvia-night\/|\bto-night\//);
    });
  }

  it("fades the picture with the wash's own figures, turned over", () => {
    // The wash was the page's night at 95% at the foot, 45% at 26% of the
    // way up and nothing from 58% up (from-night/95 from-0% via-night/45
    // via-[26%] to-transparent to-[58%]). The picture now shows 5%, 55% and
    // all of it at the same places.
    const wash = [
      { a: 0.95, at: 0 },
      { a: 0.45, at: 26 },
      { a: 0, at: 58 },
    ];
    const body = rule(".masthead-picture");
    const mask = /-webkit-mask-image: linear-gradient\(to top, ([^;]+)\);/.exec(body)?.[1] ?? "";
    expect(mask, "the prefixed form, for an Android WebView before 120").not.toBe("");
    expect(body).toContain(` mask-image: linear-gradient(to top, ${mask});`);
    expect(stops(mask)).toEqual(wash.map((w) => ({ shows: Number((1 - w.a).toFixed(2)), at: w.at })));
    expect(body).not.toMatch(/animation|transition/);
  });
});

describe("Today's readings band", () => {
  const rail = code("components/today/ChurchTodayRail.tsx");
  const start = rail.indexOf('data-today-band="readings"');
  const band = rail.slice(start, rail.indexOf("</section>", start));

  it("fades its page of the manuscript into the band's own ground, with nothing laid over it", () => {
    expect(band).toContain('className="relative overflow-hidden rounded-[18px] bg-night-deep"');
    expect(band).toContain('className="today-readings-picture pointer-events-none absolute inset-0 h-full w-full object-cover opacity-55"');
    expect(band.match(/<img\b/g)?.length).toBe(1);
    // No shade over the page any more, in either direction.
    expect(band).not.toMatch(/bg-gradient-to-|\bfrom-night-deep\/|\bto-night-deep\//);
  });

  it("fades the page with the shade's own figures, turned over, and turned for right to left", () => {
    // The shade was night-deep at 90% across the start 30% to 35% at the far
    // end (from-night-deep/90 from-30% to-night-deep/35). The page now
    // shows 10% and 65% at the same places, under its own 55%.
    for (const [selector, side] of [
      [".today-readings-picture", "right"],
      ['[dir="rtl"] .today-readings-picture', "left"],
    ]) {
      const body = rule(selector);
      const mask = new RegExp(`-webkit-mask-image: linear-gradient\\(to ${side}, ([^;]+)\\);`).exec(body)?.[1] ?? "";
      expect(mask, selector).not.toBe("");
      expect(body, selector).toContain(` mask-image: linear-gradient(to ${side}, ${mask});`);
      expect(stops(mask), selector).toEqual([
        { shows: Number((1 - 0.9).toFixed(2)), at: 30 },
        { shows: Number((1 - 0.35).toFixed(2)), at: null },
      ]);
      expect(body, selector).not.toMatch(/animation|transition/);
    }
  });

  it("leaves the saint's band as it is: its wash lies over no picture at a corner", () => {
    // His face fills the end 54% of the band and the wash is opaque only up
    // to 46%, where the face begins, and clear by 76%, so at the start
    // corners there is no picture under it and at the end corners nothing
    // over the face.
    expect(rail).toContain('className="pointer-events-none absolute inset-y-0 end-0 w-[54%] overflow-hidden"');
    expect(rail).toContain('className="pointer-events-none absolute inset-0 bg-gradient-to-r from-night-deep from-[46%] to-transparent to-[76%] rtl:bg-gradient-to-l"');
  });
});
