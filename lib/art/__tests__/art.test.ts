// Silver Night in the app (2.0): one picture per place, dark for readers until
// lit, never a holy icon recreated, and the method of docs/brand/art/IMPLEMENT.md
// held where it can be read.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ANSWER_ART, ART, ART_LIVE, DOOR_ART, carryKey, doorArt } from "../art";
import { ANSWER_PICTURES } from "@/lib/onboarding/pictures";

const ROOT = path.join(__dirname, "..", "..", "..");
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

describe("Silver Night's pictures", () => {
  it("are dark for readers until 2.0 lights them; Testers mode walks them", () => {
    expect(ART_LIVE).toBe(false);
    expect(read("lib/art/useArt.ts")).toMatch(/ART_LIVE \|\| testing/);
  });

  it("each place's picture is in public/art, in AVIF and WebP, at its stated size and described", async () => {
    const sharp = (await import("sharp")).default;
    for (const [key, art] of Object.entries(ART)) {
      for (const file of [art.webp, art.avif]) expect(fs.existsSync(path.join(ROOT, "public", file)), `${key}: ${file}`).toBe(true);
      const meta = await sharp(path.join(ROOT, "public", art.webp)).metadata();
      expect([meta.width, meta.height], key).toEqual([art.width, art.height]);
      expect(art.alt.length, key).toBeGreaterThan(20);
    }
  });

  it("a door opens a place Discover has, and an answer is one onboarding asks", () => {
    const discover = read("components/mobile/DiscoverMobile.tsx");
    for (const href of Object.keys(DOOR_ART)) expect(discover, href).toContain(`href: "${href}"`);
    for (const answer of Object.keys(ANSWER_ART)) expect(Object.keys(ANSWER_PICTURES), answer).toContain(answer);
    expect(doorArt("/saints")).toBeNull();
  });

  it("a door's picture travels under the name its place's head takes", () => {
    expect(read("components/art/ArtTiles.tsx")).toContain("data-carry={made ? carryKey(made.key) : undefined}");
    expect(read("components/art/ArtHead.tsx")).toContain("data-carry-into={carryKey(place)}");
    expect(carryKey("start")).toBe("place:start");
    expect(read("components/start/StartHere.tsx")).toContain('<ArtHead\n            place="start"');
    expect(read("components/parishes/ParishFinderList.tsx")).toContain('<ArtHead place="parish" />');
  });

  it("a tile shows its place's name and the app's whole line, never cut short", () => {
    const tiles = read("components/art/ArtTiles.tsx");
    expect(tiles).toContain("{door.title}");
    expect(tiles).toContain("{door.line}");
    expect(tiles).not.toMatch(/line-clamp|truncate|text-ellipsis/);
  });

  it("stays dark on every palette, its words in the palette's own tokens", () => {
    for (const file of ["components/art/ArtTiles.tsx", "components/art/ArtHead.tsx"]) {
      const src = read(file);
      expect(src, file).toContain("dark-island");
      expect(src, file).not.toMatch(/#[0-9a-fA-F]{3,8}\b|text-white|text-black/);
    }
  });

  it("a head's mist drifts at a steady speed and stands still with less motion", () => {
    const css = read("app/globals.css");
    expect(css).toMatch(/\.art-drift::after \{[^}]*animation: art-drift \d+s linear infinite alternate;/);
    expect(css).toContain(':where([data-motion="reduce"]) .art-drift::after {\n animation: none;');
  });
});
