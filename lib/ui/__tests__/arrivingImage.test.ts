// Small pictures arrive instead of popping in (build 81, the owner's photos
// of the mini player's cover and a work's byline icon: "the photos that load
// in here load in spiratically and not smoothly"). lib/ui/useArrivingImage
// marks a picture the browser does not have yet, .img-arrive draws it as
// nothing until it loads, and then it fades in.

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");
const css = read("app/globals.css");

describe("a small picture that arrives", () => {
  it("is held as nothing while it loads, then fades in, and snaps with motion off", () => {
    expect(css).toMatch(/\.img-arrive \{[^}]*transition: opacity/);
    expect(css).toMatch(/\.img-arrive\[data-arriving\] \{[^}]*opacity: 0/);
    expect(css).toMatch(/:where\(\[data-motion="reduce"\]\) \.img-arrive \{[^}]*transition: none/);
  });

  it("is marked by script on the element, only when the browser lacks it", () => {
    const hook = read("lib/ui/useArrivingImage.ts");
    expect(hook).toContain("img.complete && img.naturalWidth > 0");
    expect(hook).toContain('img.dataset.arriving = ""');
    expect(hook).toContain("delete e.currentTarget.dataset.arriving");
    // Not React state: nothing renders twice, and the server's page carries no mark.
    expect(hook).not.toMatch(/useState/);
  });

  it("covers the player's covers and the byline's round icon", () => {
    for (const rel of ["components/player/CoverArt.tsx", "components/reading/FeaturedWork.tsx"]) {
      const src = read(rel);
      expect(src, rel).toContain("useArrivingImage(");
      expect(src, rel).toContain("onLoad={onArrive}");
      expect(src, rel).toMatch(/className=\{cn\("img-arrive /);
    }
  });
});
