import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The Plus page's plan cards on the palettes earned by reading (2026-11-13,
 * found by Updates 22's checkMock on the export of 968347b3, the first run
 * that wore Councils and Cappadocian on /premium/ at 1032). The yearly price
 * line, "or $199 / year", read 4.42:1 on Councils and 4.40 on Cappadocian
 * where Pro's card is lit at its head (59 59 62), as Candlelight's did on
 * 2026-11-12. Both now draw a plan card's faint shares at 62 percent.
 *
 * What it cannot see: the card. checkMock on the export measures /premium/ at
 * 390, 800 and 1032 on every palette; this holds the share and its reach.
 *
 * What a reader would notice if this broke: on Councils or Cappadocian, the
 * yearly price too faint to read on a tablet.
 */

const CSS = fs.readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8").replace(/\r\n/g, "\n");

type RGB = [number, number, number];
const lin = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const lum = ([r, g, b]: RGB) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a: RGB, b: RGB) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
const over = (fg: RGB, alpha: number, bg: RGB): RGB => fg.map((v, i) => v * alpha + bg[i] * (1 - alpha)) as RGB;
const hex = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
const paperOf = (mode: string) => hex(CSS.slice(CSS.indexOf(`html[data-reading-mode="${mode}"] {`)).match(/--color-paper:\s*(#[0-9a-f]{6});/)![1]);

/** Pro's card at its lightest, where its head is lit. */
const LIT_HEAD: RGB = [59, 59, 62];

describe("the plan cards' faint words on the palettes earned by reading", () => {
  const rule = CSS.match(/:where\(html\[data-reading-mode="councils"\], html\[data-reading-mode="cappadocian"\]\) :where\(\.premium-plan-card\) :is\(([^)]*)\) \{\s*color: color-mix\(in oklab, var\(--color-paper\) (\d+)%, transparent\);/);

  it("draws them at a share of their own on a plan card, the yearly price's among them", () => {
    expect(rule).toBeTruthy();
    expect(rule![1]).toContain(".text-paper\\/50");
  });

  for (const mode of ["councils", "cappadocian"]) {
    it(`${mode}: that share holds 4.5:1 at Pro's lightest point`, () => {
      const share = Number(rule?.[2] ?? 55) / 100;
      expect(ratio(over(paperOf(mode), share, LIT_HEAD), LIT_HEAD)).toBeGreaterThanOrEqual(4.5);
    });
  }
});
