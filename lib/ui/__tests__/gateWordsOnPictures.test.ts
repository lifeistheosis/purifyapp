import fs from "node:fs";
import path from "node:path";

import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SectionMasthead } from "@/components/mobile/SectionMasthead";

/**
 * Words over pictures: the three finds of Fable Themes' sweep that fell to
 * Updates 2 (the arbiter, 2026-11-11 17:54 UTC). The sweep ran on build 14,
 * cut from c240515a by the gate's own recipe, 126 screens with the main web
 * read, and measured each word on the pixels under its letters
 * (scripts/words-on-pictures.mjs, the mock checker's pixels pass). Measured
 * again before the mends on the five palettes and the seventeen looks:
 *
 *   - A saint's web, the faint line under a saint's name over the middle
 *     icon's light: "787" 3.75:1 on Monastery, 3.88 on Dark, and under 4.5
 *     on ten of the twenty-two, at St Adrian of Rome's web.
 *   - The Bible hub's picture credit, over the foot of the Codex page:
 *     3.58:1 on Monastery, 3.66 on Candlelight, 3.67 on Dark, and under 4.5
 *     on twelve of the twenty-two.
 *   - The reading room's feelings doors, the name over its saint's icon:
 *     "Hatred" 3.60:1 on Candlelight and 4.45 on Monastery, "Fear and worry"
 *     4.42 on Candlelight.
 *
 * Each mend was tried in the page first and measured on all twenty-two
 * before it was written, and the export was walked after. This holds each in
 * the code, so the next edit to one of these files cannot put its finding
 * back before a walk is run. Each case fails on the code the sweep walked.
 *
 * What a reader would notice if this broke: small grey words that sink into
 * a picture behind them, on a dark palette first, Candlelight most.
 */

const ROOT = process.cwd();
/** The class list of the first element in `html` that carries `marker`. */
const classOf = (html: string, marker: string) => {
  const at = html.indexOf(marker);
  if (at < 0) return "";
  const open = html.lastIndexOf("<", at);
  return /class="([^"]*)"/.exec(html.slice(open, html.indexOf(">", at) + 1))?.[1] ?? "";
};

describe("the Bible hub's picture credit", () => {
  it("stands below the picture, on the plate's own ground, however many lines it takes", () => {
    const html = renderToString(createElement(SectionMasthead, { section: "bible" }));
    // The plate keeps its shape: 16 by 9, the picture above and the credit at its foot.
    expect(classOf(html, 'class="relative flex aspect-[16/9]')).toBe("relative flex aspect-[16/9] w-full flex-col");
    // The picture in a box of its own, which ends where the credit begins: on
    // a phone under 375 wide the credit takes two lines, and a fade under it
    // would have to know that. Nothing of the picture is under its words.
    const box = html.indexOf('<div class="relative min-h-0 flex-1">');
    const img = html.indexOf("<img", box);
    const credit = html.indexOf("<figcaption");
    expect(box, "the picture's own box").toBeGreaterThan(-1);
    expect(img).toBeGreaterThan(box);
    expect(credit).toBeGreaterThan(img);
    expect(html.slice(img, credit)).toMatch(/^<img [^>]*\/><\/div>$/);
    // In the plate's flow at its foot, over the ground, not laid over the picture.
    expect(classOf(html, "<figcaption")).toBe("relative px-4 pb-3 font-sans text-[10px] leading-snug text-paper/50");
    // The picture itself and its fade as they were (lib/ui/__tests__/pictureCorners.test.ts holds those).
    expect(classOf(html, "<img")).toBe("masthead-picture absolute inset-0 h-full w-full object-cover");
  });
});

/** The code without its comments, so a note is not read as the page. */
const code = (rel: string) =>
  fs
    .readFileSync(path.join(ROOT, rel), "utf8")
    .replace(/\r\n/g, "\n")
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

/** The app's rem (app/globals.css, html font-size). */
const REM = 17;

/**
 * How dark a top-to-bottom fade of black is at `y` pixels down a box `height`
 * tall: its stops read as CSS reads them (a stop with no place is at the
 * start or the end; a place in %, px or rem).
 */
function fadeAt(gradient: string, height: number, y: number): number {
  const stops = [...gradient.matchAll(/rgba\(0,\s*0,\s*0,\s*([\d.]+)\)(?:\s+([\d.]+)(%|px|rem))?/g)].map((m, i, all) => {
    const alpha = Number(m[1]);
    if (m[2] === undefined) return { alpha, at: i === 0 ? 0 : i === all.length - 1 ? height : NaN };
    const n = Number(m[2]);
    return { alpha, at: m[3] === "%" ? (n / 100) * height : m[3] === "rem" ? n * REM : n };
  });
  expect(stops.every((s) => Number.isFinite(s.at)), gradient).toBe(true);
  if (y <= stops[0].at) return stops[0].alpha;
  for (let i = 1; i < stops.length; i++) {
    const [a, b] = [stops[i - 1], stops[i]];
    if (y <= b.at) return a.alpha + ((b.alpha - a.alpha) * (y - a.at)) / Math.max(1e-9, b.at - a.at);
  }
  return stops[stops.length - 1].alpha;
}

describe("the reading room's feelings doors", () => {
  const row = code("components/reading/FeelingsRow.tsx");
  const fade = /const FADE = "([^"]+)";/.exec(row)?.[1] ?? "";

  it("lay their fade 60 percent dark where the words begin, at one line or two", () => {
    expect(fade, "the doors' fade").not.toBe("");
    // The words begin under the fade's own top padding, 3rem (pt-12), at any length of name.
    expect(row).toContain('<span className="absolute inset-x-0 bottom-0 flex flex-col items-center px-3 pb-3.5 pt-12 text-center" style={{ backgroundImage: FADE }}>');
    // A door's words, as the walk measured them: a name of one line at 23px
    // ("Hatred", 115.6px of fade) and of two ("Fear and worry", 140.9px).
    // The sweep's fade was 44 and 36 percent dark there.
    for (const height of [115.6, 140.9]) {
      expect(fadeAt(fade, height, 3 * REM), `${height}px of fade, where its words begin`).toBeGreaterThanOrEqual(0.6);
    }
    // Clear where it begins, and as dark as a cover's at the foot.
    expect(fadeAt(fade, 115.6, 0)).toBe(0);
    expect(fadeAt(fade, 115.6, 115.6)).toBeGreaterThanOrEqual(0.85);
  });
});

type Rgb = [number, number, number];
const CSS = fs.readFileSync(path.join(ROOT, "app/globals.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
/** A palette's or a look's own ink (--color-paper), as its block in globals.css writes it; Dark's is the theme's. */
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
/** Words at `share` of the ink over a ground, as the pixel walk measures them (scripts/mock-check.mjs, contrast). */
function onGround(ink: Rgb, share: number, ground: Rgb): number {
  const shown = ink.map((v, i) => v * share + ground[i] * (1 - share)) as Rgb;
  const [a, b] = [lum(shown), lum(ground)].sort((p, q) => q - p);
  return (a + 0.05) / (b + 0.05);
}

describe("a saint's web, the line under each name", () => {
  const web = code("components/saints/web/WebConstellation.tsx");
  const tag = /const TAG_CLASS = "([^"]*)";/.exec(web)?.[1] ?? "";
  const share = Number(/(?:^|\s)text-paper\/(\d+)(?:\s|$)/.exec(tag)?.[1] ?? 100);

  it("is drawn by its one class wherever a saint stands, leaves in a glide, or is chosen", () => {
    expect(tag, "the line's class").toContain("text-[10.5px]");
    expect(web.match(/className=\{cn\(TAG_CLASS, LABEL_SHADOW\)\}/g), "the web, the glide's ghosts, the chosen saint").toHaveLength(3);
  });

  it("is 4.5:1 or more over the middle icon's light on every dark palette, and still a step under the name", () => {
    // The ground under the hardest line, the least kind hundredth under its
    // letters with their halo kept, measured on the export: "787" at St
    // Adrian of Rome's web, the gate's own, and "Constantinople I" at St
    // Amphilochius of Iconium's, the brightest light of the 114 webs with an
    // icon (the light is the middle saint's own icon, blurred). Each palette's
    // own night shows through the light; Mosaic is the look that fell short
    // with them (its blue ground).
    const PAPER = {
      Dark: "@theme",
      "True black": 'html[data-reading-mode="black"]',
      Candlelight: 'html[data-reading-mode="candlelight"]',
      Monastery: 'html[data-reading-mode="monastery"]',
      Mosaic: 'html[data-look="mosaic"]',
    } as const;
    const GROUND: Record<string, Record<keyof typeof PAPER, Rgb>> = {
      "St Adrian's web": { Dark: [66, 66, 68], "True black": [56, 56, 56], Candlelight: [57, 57, 57], Monastery: [64, 67, 72], Mosaic: [64, 74, 101] },
      "St Amphilochius's web": { Dark: [71, 71, 75], "True black": [63, 63, 63], Candlelight: [65, 65, 65], Monastery: [70, 72, 78], Mosaic: [70, 81, 108] },
    };
    for (const [place, grounds] of Object.entries(GROUND)) {
      for (const [palette, ground] of Object.entries(grounds) as [keyof typeof PAPER, Rgb][]) {
        expect(onGround(paperOf(PAPER[palette]), share / 100, ground), `${place}, ${palette}, at ${share} percent of its ink`).toBeGreaterThanOrEqual(4.5);
      }
    }
    // The name over it stands at 95.
    expect(web).toContain('"text-paper/95"');
    expect(share).toBeLessThan(95);
  });
});
