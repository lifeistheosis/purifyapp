import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The yearly price line on the plan cards (1.9, Gate 4b's fault E, mended by Updates 92). "or ... a year"
 * (premium.orPerYear) stands under the price at the card's 50 of the ink. Where its Arabic runs onto the card's
 * lit head at 1032 it read 4.49:1 on Dark and Black and 4.40:1 on Monastery, under the 4.5:1 it needs. It is drawn
 * at 65 now (components/premium/PlanWords.tsx); on Candlelight and two looks the card already draws both at 70 and 62. This reads the card's own gradient (premiumCardBg: the same dark
 * island on every palette) at its lightest, both lights at their fullest over its first colour, and each palette's
 * ink, and holds the line over 4.5:1 with a margin there. What it cannot see: where the Arabic wraps; checkMock
 * with pixels on the export measures that.
 */

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8").replace(/\r\n/g, "\n");
const CSS = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
type RGB = [number, number, number];
const hex = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
const mix = (a: RGB, b: RGB, share: number): RGB => a.map((v, i) => v * share + b[i] * (1 - share)) as RGB;
const lum = (c: RGB) => {
  const [r, g, b] = c.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: RGB, b: RGB) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
/** A palette's ink: its own --color-paper, or the house's (Dark's) where it keeps that. */
function paper(selector: string): RGB {
  const at = CSS.indexOf(`\n${selector} {`);
  const own = at < 0 ? null : /--color-paper:\s*(#[0-9a-f]{6})/i.exec(CSS.slice(at, CSS.indexOf("}", at)))?.[1];
  if (own) return hex(own);
  const theme = CSS.indexOf("\n@theme {");
  return hex(/--color-paper:\s*(#[0-9a-f]{6})/i.exec(CSS.slice(theme, CSS.indexOf("}", theme)))?.[1] ?? "");
}

describe("the yearly price line on the plan cards", () => {
  const words = read("components/premium/PlanWords.tsx");
  const share = Number(/<span className="text-paper\/(\d+)">\{t\("premium\.orPerYear"/.exec(words)?.[1] ?? 50);

  it("is drawn at 65 of the ink or more, over the card's 50", () => {
    expect(share).toBeGreaterThanOrEqual(65);
  });

  // Pro's head at its fullest is lighter than any ground the line stands on (at 50 it reads 4.11:1 there on Dark,
  // where the export measured 4.49), so a margin over 4.5 here is a margin on the screen.
  it("holds 4.5:1 with a margin on the card's lit head at its fullest, in each palette's ink", () => {
    const bg = /export function premiumCardBg[\s\S]*?\n\}/.exec(read("components/premium/PremiumUI.tsx"))?.[0] ?? "";
    const head = Number(/strength === "full"\s*\?\s*"radial-gradient\([^"]*rgba\(255,255,255,(0?\.\d+)\)/.exec(bg)?.[1]);
    const corner = Number(/radial-gradient\(115% 90% at 88% 8%, rgba\(255,255,255,(0?\.\d+)\)/.exec(bg)?.[1]);
    const first = /linear-gradient\(155deg, (#[0-9a-f]{6})/i.exec(bg)?.[1] ?? "";
    expect(head > 0 && corner > 0 && first).toBeTruthy();
    const lit = mix([255, 255, 255], mix([255, 255, 255], hex(first), corner), head);
    for (const [name, selector] of [
      ["Dark", "@theme"],
      ["Black", 'html[data-reading-mode="black"]'],
      ["Monastery", 'html[data-reading-mode="monastery"]'],
    ] as const) {
      const r = ratio(mix(paper(selector), lit, share / 100), lit);
      expect(r, `${name}: ${r.toFixed(2)}:1 at ${share}`).toBeGreaterThanOrEqual(4.75);
    }
  });
});
