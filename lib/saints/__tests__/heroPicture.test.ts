// A saint whose page opens on a wide picture (lib/saints/heroes.ts), reached
// from a card: the card's icon lands on his icon, and the wide picture comes
// in over it (1.9, P2; the arbiter's call of 2026-11-11: "where the saint's
// page shows his icon anywhere, the card's icon flies to it; where it does
// not, the page's own switch stands").
//
// Until then nothing on such a page took the card's icon: the wide picture is
// another picture, with the name over its foot, and a picture travels only
// where the page shows the same one (lib/ui/routeMotion.ts). What a reader
// would notice if this broke: the icon of the saint they tapped leaving with
// the list, on the twelve saints most often opened; or, worse, flying toward
// his page and fading out half way, because the wide picture arrived then.
// node scripts/route-motion.mjs walks it on the export, with signal and none.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { FLIGHT_MS } from "@/components/saints/SaintHeroPicture";
import { SAINT_HEROES } from "@/lib/saints/heroes";
import { getSaint } from "@/lib/saints/saints";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");
const picture = read("components/saints/SaintHeroPicture.tsx");
const css = read("app/globals.css");
/** The part of the component that draws a page with a wide picture. */
const wide = picture.slice(picture.indexOf("if (hero) {"), picture.indexOf("if (!iconUrl) return null;"));

describe("a saint with a wide picture, opened from his card", () => {
  it("has an icon of his own for the card's to land on, every one of them", () => {
    const slugs = Object.keys(SAINT_HEROES);
    expect(slugs).toHaveLength(12);
    for (const slug of slugs) {
      const saint = getSaint(slug);
      expect(saint, slug).not.toBeNull();
      expect(saint!.iconUrl, `${slug}: no icon the app carries, so nothing on his page could take his card's`).toMatch(/^\/saints\/icons\//);
      expect(fs.existsSync(path.join(process.cwd(), "public", saint!.iconUrl!)), `${slug}: ${saint!.iconUrl}`).toBe(true);
    }
  });

  it("takes the card's icon on his icon, which stands in the box until the wide picture has come", () => {
    expect(wide).toContain('data-hero-stand-in=""');
    expect(wide).toMatch(/data-hero-stand-in=""\s*data-carry-into=\{iconUrl\}/);
    // Once, and on the icon: the wide picture is another picture with the name over it, and takes nothing.
    expect(wide.match(/data-carry-into/g)).toHaveLength(1);
    const wideImg = wide.slice(wide.indexOf("<picture"), wide.indexOf("</picture>"));
    expect(wideImg).toContain("data-hero-picture=");
    expect(wideImg).not.toContain("data-carry");
  });

  it("holds the wide picture back until that icon has landed, however soon it comes", () => {
    // Both ways a wide picture is found to have come go through the one gate.
    expect(picture).toContain("if (img.naturalWidth > 0) reveal();");
    expect(picture).toContain("const done = () => reveal();");
    expect(picture.match(/setShown\(true\)/g)).toHaveLength(2);
    expect(picture.slice(picture.indexOf("const reveal = () => {"), picture.indexOf("const fail = () => {")).match(/setShown\(true\)/g)).toHaveLength(2);
    // Only on a page an icon travelled to; any other shows it the moment it has come.
    expect(picture).toContain('const travelledTo = Boolean(icon && ("carriedIn" in icon.dataset || "landed" in icon.dataset));');
    expect(picture).toContain("const wait = travelledTo ? opened.current + FLIGHT_MS - performance.now() : 0;");
  });

  it("for as long as a picture travels, and a frame more", () => {
    const flight = /::view-transition-group\(carried\) \{\s*animation-duration: (\d+)ms;/.exec(css);
    expect(flight, "the length of a travelling picture's flight, in app/globals.css").not.toBeNull();
    const ms = Number(flight![1]);
    expect(FLIGHT_MS).toBeGreaterThanOrEqual(ms);
    // Not long after it either: the wide picture is what the page is for.
    expect(FLIGHT_MS).toBeLessThanOrEqual(ms + 34);
  });
});
