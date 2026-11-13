import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The wide calendar's feast red on the palettes earned by reading
 * (2026-11-13, Updates 21's checkMock on /calendar/ at 800 and 1032, the
 * first run that wore Councils and Cappadocian).
 *
 * On Cappadocian a feast day's number read 4.38:1 and its name, drawn at 90%,
 * 3.77:1 on the cell they stand on (the paper at 4.5% over the deep ground;
 * a chosen day's cell is the paper at 5%). The phone's calendar at 390 sets
 * the number on the page's own ground and passed. The mend is the least a
 * reader would see: the red lifted a hair in lightness (214 78 62 to
 * 219 83 66, hue and chroma kept) and the names given the full red on this
 * palette, as the light looks already have it.
 *
 * What it cannot see: the screen. checkMock on the export measures /calendar/
 * at 800 and 1032 on every palette and look; this holds the two tokens and
 * the class that the measure found wanting.
 *
 * What a reader would notice if this broke: on Cappadocian, a feast's name on
 * the wide calendar too faint to read.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const CSS = read("app/globals.css");
const CELL = read("components/calendar/CalendarCell.tsx");

type RGB = [number, number, number];
const lin = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const lum = ([r, g, b]: RGB) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a: RGB, b: RGB) => {
  const [x, y] = [lum(a), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
const over = (fg: RGB, alpha: number, bg: RGB): RGB =>
  fg.map((v, i) => v * alpha + bg[i] * (1 - alpha)) as RGB;
const hex = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;

function block(selector: string): string {
  const at = CSS.indexOf(`${selector} {`);
  expect(at, selector).toBeGreaterThan(0);
  return CSS.slice(at, CSS.indexOf("}", at));
}
function token(body: string, name: string): string | undefined {
  return body.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1].trim();
}
/** The rubric every palette has unless it sets its own (the first one declared, in :root). */
const ROOT_RUBRIC = CSS.match(/--ink-rubric:\s*([^;]+);/)![1].trim();

/** The feast name's opacity on a palette, read from the cell's own class. */
function nameAlpha(mode: string): number {
  const line = CELL.split("\n").find((l) => l.includes('cell.hasFeast ? "rubric opacity-90'));
  expect(line).toBeTruthy();
  return line!.includes(`[html[data-reading-mode=${mode}]_&]:opacity-100`) ? 1 : 0.9;
}

describe("the wide calendar's feast red on the palettes earned by reading", () => {
  for (const mode of ["councils", "cappadocian"]) {
    const body = block(`html[data-reading-mode="${mode}"]`);
    const deep = hex(token(body, "--color-night-deep")!);
    const paper = hex(token(body, "--color-paper")!);
    const red = (token(body, "--ink-rubric") ?? ROOT_RUBRIC).split(/\s+/).map(Number) as RGB;

    for (const [cell, alpha] of [
      ["a feast day's cell", 0.045],
      ["the chosen day's cell", 0.05],
    ] as const) {
      const ground = over(paper, alpha, deep);
      it(`${mode}: the number and the name hold 4.5:1 on ${cell}`, () => {
        expect(ratio(red, ground), "the number").toBeGreaterThanOrEqual(4.5);
        expect(ratio(over(red, nameAlpha(mode), ground), ground), "the name").toBeGreaterThanOrEqual(4.5);
      });
    }
  }

  it("keeps Cappadocian's red its own hue, a hair lighter, not a new colour", () => {
    expect(token(block('html[data-reading-mode="cappadocian"]'), "--ink-rubric")).toBe("219 83 66");
  });
});
