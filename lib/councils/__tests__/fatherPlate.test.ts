// A council Father with no cleared picture stands on the house's plate with
// its lit cross, never an empty round (build 93 note 1, the owner's words:
// "you could clearly see that his photo isn't loaded", of St Alexander's
// circle on the First Council's page). What a reader would notice if this
// broke: a dark empty circle among the Fathers' faces, read as a picture
// that failed to load.

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FatherFace } from "@/components/councils/CouncilFathers";
import { COUNCILS } from "@/lib/councils/councils";
import { fatherFaces } from "@/lib/councils/fathers";

describe("a council Father's face with no picture", () => {
  for (const shape of ["round", "portrait"] as const) {
    it(`is the plate with its lit cross, as a ${shape}`, () => {
      const html = renderToStaticMarkup(createElement(FatherFace, { face: {}, shape }));
      expect(html).toContain('data-face-plate=""');
      expect(html).toContain('data-cover="plate"');
      expect(html).toContain("cross-plate-mark");
      expect(html).not.toContain("<img");
    });
  }

  it("is the same plate under a picture, so a picture that cannot come leaves the cross", () => {
    const html = renderToStaticMarkup(createElement(FatherFace, { face: { picture: { src: "/saints/icons/cyprian-of-carthage.jpg", focusY: 12 } }, shape: "round" }));
    expect(html.indexOf('data-cover="plate"')).toBeGreaterThan(-1);
    expect(html.indexOf('data-cover="plate"')).toBeLessThan(html.indexOf("<img"));
  });

  it("stands for every Father with no cleared picture; St Alexander, cleared on 2026-11-11, wears his engraving over it", () => {
    const nicaea = COUNCILS.find((c) => c.slug === "first-nicaea")!;
    const alexander = fatherFaces(nicaea, true).find((f) => /Alexander/.test(f.name));
    expect(alexander, "St Alexander is among the First Council's Fathers").toBeDefined();
    // The picture his page shows, carried, with the plate under it so a picture that cannot come leaves the cross.
    expect(alexander!.picture?.src).toBe("/saints/icons/alexander-of-alexandria.jpg");
    const pictured = renderToStaticMarkup(createElement(FatherFace, { face: alexander!, shape: "round" }));
    expect(pictured.indexOf('data-cover="plate"')).toBeGreaterThan(-1);
    expect(pictured.indexOf('data-cover="plate"')).toBeLessThan(pictured.indexOf("<img"));
    // Every Father still without a cleared picture stands on the plate, never an empty round.
    const bare = COUNCILS.flatMap((c) => fatherFaces(c, true)).filter((f) => !f.picture);
    expect(bare.length, "Fathers still waiting for a picture").toBeGreaterThan(0);
    for (const f of bare) {
      const html = renderToStaticMarkup(createElement(FatherFace, { face: f, shape: "round" }));
      expect(html, f.name).toContain("cross-plate-mark");
      expect(html, f.name).not.toContain("<img");
    }
  });
});
