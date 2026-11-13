import fs from "node:fs";
import path from "node:path";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ProfileFace, profileSurface, surfaceClass } from "@/components/community/profile/ProfileCard";
import { DECORATIONS, SEASONAL_DECORATIONS, type Cosmetics } from "@/lib/profile/cosmetics";

/**
 * The gate's final run 1 (Admin, 2026-11-12; the arbiter's 02:08 UTC), the
 * fails that fell to Updates 2, each held here so the next edit cannot put
 * it back before a walk is run. Each case fails on the code that run walked.
 * The grounds are the least kind hundredth under the words' letters,
 * measured on the export (scripts/words-on-pictures.mjs), on the five
 * palettes and the seventeen looks.
 */

const ROOT = process.cwd();
/** The code without its comments, so a note is not read as the page. */
const code = (rel: string) =>
  fs
    .readFileSync(path.join(ROOT, rel), "utf8")
    .replace(/\r\n/g, "\n")
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

type Rgb = [number, number, number];
const CSS = fs.readFileSync(path.join(ROOT, "app/globals.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
/** A palette's or a look's own ink (--color-paper), as its block in globals.css writes it. */
function paperOf(selector: string): Rgb {
  for (const m of CSS.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
    if ((m[1].split(";").pop() ?? "").trim() !== selector) continue;
    const hex = /--color-paper\s*:\s*#([0-9a-f]{6})\b/i.exec(m[2])?.[1];
    if (hex) return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
  }
  throw new Error(`${selector}: no --color-paper`);
}
const lin = (c: number) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const lum = ([r, g, b]: Rgb) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
/** Words at `share` of the ink over a ground, as the pixel walk measures them. */
function onGround(ink: Rgb, share: number, ground: Rgb): number {
  const shown = ink.map((v, i) => v * share + ground[i] * (1 - share)) as Rgb;
  const [a, b] = [lum(shown), lum(ground)].sort((p, q) => q - p);
  return (a + 0.05) / (b + 0.05);
}

describe("the pricing hero's eyebrow, over the scribe", () => {
  it('reads 4.5:1 or more where "Purify Plus" stands, on every palette and look', () => {
    const share = Number(/<p className="paywall-in font-sans text-caption font-semibold text-paper\/(\d+) \[text-shadow/.exec(code("components/billing/KeptPaywall.tsx"))?.[1] ?? 0);
    // The five least kind (Admin's: 4.47:1 on Candlelight at 70); no palette lifts a share this high.
    const GROUND: [string, string, Rgb][] = [
      ["Candlelight", 'html[data-reading-mode="candlelight"]', [62, 62, 62]],
      ["Mosaic", 'html[data-look="mosaic"]', [66, 76, 97]],
      ["Monastery", 'html[data-reading-mode="monastery"]', [66, 69, 74]],
      ["Incense", 'html[data-look="incense"]', [72, 70, 76]],
      ["Holy Mountain", 'html[data-look="athos"]', [67, 70, 78]],
    ];
    for (const [name, selector, ground] of GROUND) {
      expect(onGround(paperOf(selector), share / 100, ground), `${name}, at ${share} percent`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("the florilegium's starter tiles", () => {
  it("draw the reference under a starter's name 4.5:1 or more on Light and on every light look", () => {
    const share = Number(
      /<p data-carry-over="" className="relative mt-1 font-sans text-caption leading-\[1\.35\] text-paper\/(\d+)">\{reference\}<\/p>/.exec(code("components/florilegium/FlorilegiaHub.tsx"))?.[1] ?? 0,
    );
    // Under "Psalms 50:1-19", the least kind of the four, on the picture's melted foot. Light lifts
    // shares to 66 and the light looks to 68, so the share is drawn as written on all of them.
    const GROUND: [string, string, Rgb][] = [
      ["Light", 'html[data-reading-mode="parchment"]', [209, 199, 174]],
      ["Jordan", 'html[data-look="jordan"]', [194, 208, 204]],
      // Patmos stood here (213, 214, 216) until it came out of the looks on 2026-11-13.
      ["Blush", 'html[data-look="blush"]', [217, 196, 199]],
      ["Roses", 'html[data-look="rose"]', [210, 202, 186]],
      ["Lavender", 'html[data-look="lavender"]', [204, 196, 213]],
      ["Olive", 'html[data-look="olive"]', [200, 199, 181]],
      ["Stone", 'html[data-look="stone"]', [195, 192, 183]],
      ["Linen", 'html[data-look="linen"]', [213, 210, 203]],
    ];
    for (const [name, selector, ground] of GROUND) {
      expect(onGround(paperOf(selector), share / 100, ground), `${name}, at ${share} percent`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

const NONE: Cosmetics = { bannerColor: null, bannerUrl: null, themePrimary: null, themeAccent: null, decoration: null, effect: null, nameColor: null, bannerMotion: null };

describe("a profile's face over its effect's drifting specks", () => {
  /** The class lists of the face's @handle line and its status line. */
  function lines(effect: string | null): { handle: string; status: string } {
    const html = renderToStaticMarkup(
      createElement(ProfileFace, {
        profile: { name: "Herman", handle: "herman", avatar: null, status: "Keeping the Nativity Fast", cosmetics: { ...NONE, themePrimary: "#232327", themeAccent: "#0d0d10", effect } },
        nameAs: "p",
      }),
    );
    const classOf = (marker: string) => {
      const at = html.indexOf(marker);
      const open = html.lastIndexOf("<p ", at);
      return /class="([^"]*)"/.exec(html.slice(open, html.indexOf(">", open) + 1))?.[1] ?? "";
    };
    return { handle: classOf("@herman"), status: classOf("Keeping the Nativity Fast") };
  }

  it("stands the @handle and the status in the house's soft edge wherever a speck can drift under them", () => {
    for (const effect of ["gold-dust", "snowfall", "theophany-drops", "paschal-embers", "incense", "candlelight"]) {
      const { handle, status } = lines(effect);
      expect(handle.split(" "), `${effect}: the @handle`).toContain("words-halo");
      expect(status.split(" "), `${effect}: the status`).toContain("words-halo");
    }
    // A card without an effect draws them as before.
    expect(lines(null).handle.split(" ")).not.toContain("words-halo");
    expect(lines(null).status.split(" ")).not.toContain("words-halo");
    // What the walk measured on the Purify sheet with a gold speck held under "@purify" (the
    // line at 80 of a themed card's white): 3.07:1 on the speck as it was; with the soft edge,
    // the ground under its letters is the card's own.
    const white: Rgb = [255, 255, 255];
    expect(onGround(white, 0.8, [142, 129, 100])).toBeLessThan(4.5);
    expect(onGround(white, 0.8, [37, 34, 31])).toBeGreaterThanOrEqual(4.5);
  });
});

describe("a profile card with a frame", () => {
  it("is a dark island, from the seed the sheet opens on to the profile it loads", () => {
    // Every frame the catalog draws: each has white in it (a flame, a glint, a dove, lilies, stars) or gold for a dark card.
    for (const decoration of [...DECORATIONS, ...SEASONAL_DECORATIONS]) {
      expect(profileSurface({ ...NONE, decoration }).island, decoration).toBe(true);
      expect(surfaceClass(profileSurface({ ...NONE, decoration })), decoration).toBe("dark-island bg-night-soft");
    }
    // An id the catalog does not draw makes nothing dark; nor does a card with nothing on it.
    expect(profileSurface({ ...NONE, decoration: "neon" }).island).toBe(false);
    expect(profileSurface(NONE).island).toBe(false);
    // The seed from the feed carries the frame (and not the banner), so the card is dark from its first frame.
    expect(code("components/community/profile/ProfileViewer.tsx")).toContain("cosmetics: { ...NO_COSMETICS, decoration: seed.decoration ?? null, nameColor: seed.nameColor ?? null }");
  });
});
