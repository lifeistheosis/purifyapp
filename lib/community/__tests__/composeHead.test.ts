import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The page for a new post (components/community/ComposePage.tsx), as the
 * prayer campaigns chat found it in the export (docs/1.9-build/notes/
 * campaigns-fable.md, section 9, item 1): the head's picture reaches 284px and
 * was painted over the three doors (Discussion, Ask a Priest, Share a line),
 * which stand from 193px; and checkMock failed its Close (42.5px), its title
 * field (41.6px tall) and its house rules line (3.82:1 on Dark, 2.31:1 on
 * Light).
 *
 * What would go wrong if this broke: a reader who cannot see what kind of post
 * they are writing, a Close and a title under a thumb's 44px, and the house
 * rules too faint to read.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const page = read("components/community/ComposePage.tsx");
const css = read("app/globals.css");

/** A palette's paper and night, from the stylesheet's own tokens. */
function tokens(selector: string): { paper: string; night: string } {
  const at = css.indexOf(`\n${selector} {`);
  expect(at, selector).toBeGreaterThan(-1);
  const body = css.slice(at, css.indexOf("}", at));
  const pick = (name: string) => body.match(new RegExp(`--color-${name}: (#[0-9a-f]{6});`, "i"))![1];
  return { paper: pick("paper"), night: pick("night") };
}

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const lin = (c: number) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luminance = ([r, g, b]: number[]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);

/** Paper at this strength over night, against night. */
function contrast(alpha: number, { paper, night }: { paper: string; night: string }): number {
  const p = rgb(paper);
  const n = rgb(night);
  const ink = p.map((c, i) => alpha * c + (1 - alpha) * n[i]);
  const [hi, lo] = [luminance(ink), luminance(n)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}

describe("the page for a new post", () => {
  it("draws its doors over the head's picture, which reaches past the head", () => {
    expect(page).toMatch(/style=\{\{ height: `calc\(\$\{INSET_TOP\} \+ 284px\)` \}\}/);
    const doors = page.indexOf("data-compose-doors");
    const block = page.lastIndexOf("<div className=", doors - 200);
    expect(page.slice(block, doors)).toMatch(/<div className="relative mx-auto w-full max-w-\[640px\] px-5 pb-8">/);
  });

  it("has a Close and a title a thumb can take, 44px each", () => {
    expect(page).toContain('className={`compose-plate ${TOP_PLATE} border border-paper/[0.13] text-paper`}');
    expect(read("components/nav/topPlate.ts")).toContain('"h-11 w-11 ');
    expect(page).toMatch(/data-compose-field=""[\s\S]*?className="block min-h-11 w-full border-b/);
  });

  it("sets its house rules at an ink every palette reads at 4.5:1", () => {
    const strength = Number(page.match(/text-\[11\.5px\] leading-\[1\.5\] text-paper\/(\d+)">\{t\("community\.houseRules"\)\}/)?.[1]);
    expect(strength).toBeGreaterThan(0);
    const palettes = {
      Dark: { paper: css.match(/--color-paper: (#[0-9a-f]{6});/i)![1], night: css.match(/--color-night: (#[0-9a-f]{6});/i)![1] },
      Light: tokens('html[data-reading-mode="parchment"]'),
      Black: tokens('html[data-reading-mode="black"]'),
      Candlelight: tokens('html[data-reading-mode="candlelight"]'),
      Monastery: tokens('html[data-reading-mode="monastery"]'),
    };
    for (const [name, colours] of Object.entries(palettes)) {
      expect(contrast(strength / 100, colours), name).toBeGreaterThanOrEqual(4.5);
    }
  });
});
