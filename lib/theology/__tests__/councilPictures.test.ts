// Theology's council pictures show with no signal (1.9, the pre-build gate's
// third run, 2026-11-11).
//
// The apps carry History's pictures of the seven Ecumenical Councils as the
// AVIF alone and keep the website's JPEG behind them (lib/media/carried.ts,
// CARRIED_HISTORY). The councils' own pages offer the AVIF first. Three
// places in Theology asked for the JPEG alone: the hub's film of the seven,
// a step's read on a path, and a council's mark beside its name on a study
// or a leaf. With no signal each frame stood empty, and the gate's walk
// found six of them on four screens (/theology/, /theology/creed/,
// /theology/path/christ/, /heresies/apollinarianism/).
//
// What a reader would see if this broke: on a phone with no signal, grey
// squares where the councils' icons are on Theology's pages.

import fs from "node:fs";
import path from "node:path";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CouncilPicture } from "@/components/theology/CouncilPicture";
import { COUNCILS } from "@/lib/councils/councils";
import { councilPicture } from "@/lib/councils/page";
import { CARRIED_HISTORY } from "@/lib/media/carried";
import { SITE_URL } from "@/lib/site";
import { pathSteps } from "@/lib/theology/pathSteps";

const code = (rel: string) =>
  fs
    .readFileSync(path.join(process.cwd(), rel), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const SEVEN = COUNCILS.filter((c) => c.kind !== "local")
  .sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0))
  .slice(0, 7);

describe("a council's picture on Theology's pages", () => {
  it("is in the apps as its AVIF, with the website's JPEG behind it: the premise", () => {
    expect(SEVEN).toHaveLength(7);
    for (const c of SEVEN) {
      const picture = councilPicture(c.slug, true);
      expect(picture, c.slug).not.toBeNull();
      // The app's own file: an address in the bundle, on the carried list.
      expect(picture?.avif, c.slug).toMatch(/^\/history\/media\/.+\.avif$/);
      expect(CARRIED_HISTORY, c.slug).toContain(picture?.avif);
      // The JPEG is the website's: with no signal it does not come.
      expect(picture?.src.startsWith(`${SITE_URL}/history/media/`), `${c.slug}: ${picture?.src}`).toBe(true);
    }
  });

  it("is offered as the AVIF first, the JPEG behind it", () => {
    const html = renderToStaticMarkup(
      createElement(CouncilPicture, { src: `${SITE_URL}/history/media/first-council-of-nicaea.v1.jpg`, avif: "/history/media/first-council-of-nicaea.v1.avif", focus: "50% 24%", className: "absolute inset-0" }),
    );
    const source = html.indexOf('<source type="image/avif" srcSet="/history/media/first-council-of-nicaea.v1.avif"');
    const img = html.indexOf("<img");
    expect(source, html).toBeGreaterThan(-1);
    expect(img, html).toBeGreaterThan(source);
    expect(html).toContain(`src="${SITE_URL}/history/media/first-council-of-nicaea.v1.jpg"`);
    // It arrives whole, as every picture drawn plainly does (lib/ui/useArrivingImage.ts).
    expect(html).toContain("img-arrive");
    expect(html).toContain("object-position:50% 24%");
  });

  it("is drawn plainly where there is no AVIF of it", () => {
    const html = renderToStaticMarkup(createElement(CouncilPicture, { src: "/history/media/a-local-council.v1.jpg" }));
    expect(html).not.toContain("<source");
    expect(html).toContain('src="/history/media/a-local-council.v1.jpg"');
  });

  it("falls back to the JPEG when the AVIF cannot be drawn", () => {
    const src = code("components/theology/CouncilPicture.tsx");
    expect(src).toMatch(/if \(avif && !jpegOnly && img\.currentSrc\.endsWith\("\.avif"\)\) setJpegOnly\(true\);/);
    expect(src).toMatch(/\{avif && !jpegOnly \? <source type="image\/avif" srcSet=\{avif\} \/> : null\}/);
    // Heard both ways: a failure after the page listens, and one before it could.
    expect(src).toMatch(/onError=\{\(e\) => fail\(e\.currentTarget\)\}/);
    expect(src).toMatch(/onBroken=\{fail\}/);
    // A new <img> for the JPEG: the first one's failure is spent.
    expect(src).toMatch(/key=\{jpegOnly \? "jpeg" : "first"\}/);
  });

  it("a path's step hands each council's read its AVIF", async () => {
    const steps = await pathSteps(true);
    const councils = steps.flatMap((s) => s.reads).filter((r) => r.kind === "council" && r.picture);
    expect(councils.length).toBeGreaterThan(5);
    for (const r of councils) {
      expect(CARRIED_HISTORY, r.href).toContain(r.picture?.avif);
    }
  });

  it("the film's words stand on its foot, not on the picture", () => {
    // The tile and its words as the hub draws them (components/theology/TheologyLibrary.tsx).
    const library = code("components/theology/TheologyLibrary.tsx");
    expect(library).toContain('className="council-film press-card relative block h-[150px] w-[108px]');
    expect(library).toContain('<span className="absolute inset-x-[9px] bottom-2 z-[1]">');
    // A name of two lines: the numeral's line (14.5px, leading-tight), 2px, two lines of 10.5px at 1.3, 8px from the foot.
    const wordsFrom = 150 - 8 - (14.5 * 1.25 + 2 + 2 * 10.5 * 1.3);
    // The foot, read from the stylesheet: how much of the palette's ground lies over the picture, by how far down the tile.
    const css = fs.readFileSync(path.join(process.cwd(), "app", "globals.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const rule = /\.council-film::after \{([^}]*)\}/.exec(css)?.[1] ?? "";
    const fade = [...rule.matchAll(/background: linear-gradient\(180deg, (.*)\);/g)].pop()?.[1] ?? "";
    const stops = [...fade.matchAll(/(transparent|color-mix\(in srgb, var\(--color-night\) (\d+)%, transparent\)|var\(--color-night\)) (\d+)%/g)].map((m) => ({
      share: m[1] === "transparent" ? 0 : m[1] === "var(--color-night)" ? 1 : Number(m[2]) / 100,
      at: Number(m[3]) / 100,
    }));
    expect(stops.length, fade).toBeGreaterThanOrEqual(2);
    const shareAt = (down: number) => {
      const after = stops.findIndex((s) => s.at >= down);
      if (after <= 0) return after === 0 ? stops[0].share : stops[stops.length - 1].share;
      const [a, b] = [stops[after - 1], stops[after]];
      return a.share + ((b.share - a.share) * (down - a.at)) / (b.at - a.at);
    };
    // Where the words begin the ground is nearly whole, and at the foot it is whole.
    expect(shareAt(wordsFrom / 150)).toBeGreaterThanOrEqual(0.9);
    expect(shareAt(1)).toBe(1);
    // The picture is clear above them: nothing over its upper part.
    expect(shareAt(0.3)).toBe(0);
    // The palette's own ground, so the foot is right on Light and on every look.
    expect(fade).not.toMatch(/#|rgb\(/);
  });

  it("the three places draw it through the one component, and hand it the AVIF", () => {
    expect(code("components/theology/CouncilMark.tsx")).toContain("<CouncilPicture src={picture.src} avif={picture.avif}");
    expect(code("components/theology/StepView.tsx")).toContain("<CouncilPicture src={read.picture.src} avif={read.picture.avif}");
    expect(code("components/theology/TheologyLibrary.tsx")).toContain("<CouncilPicture src={c.picture.src} avif={c.picture.avif}");
    // The hub's page gives the film each council's AVIF.
    expect(code("app/(app)/theology/page.tsx")).toContain("...(picture.avif ? { avif: picture.avif } : {})");
    expect(code("lib/theology/pathSteps.ts")).toContain("...(picture.avif ? { avif: picture.avif } : {})");
  });
});
