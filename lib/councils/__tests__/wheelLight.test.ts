import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { WHEEL_BESIDE, c01, wheelLight } from "../atlas";

/**
 * The atlas's wheel of years (Where they met, on /councils/) draws the rows
 * off the band to be read (the gate's open-reader walk of 2026-11-11, 127
 * screens: the year "268" at 1.54:1 on all five palettes; the arbiter's word
 * of 18:48 UTC). The rows beside the band stood at 50%, where a council's name
 * read 4.47:1, with their era's name at 55% of that; the rows further off
 * stood at 33% and 16%, in the wheel's fade at its edge or past it, where a
 * reader could not read them and checkMock still measured them. Now the rows
 * beside the band are at 55%, the least that passed checkMock
 * { pixels: true } on the five palettes and the seventeen looks (tried in the
 * page with an era's name beside the band, above it and below it), an era's
 * name is inked as the row's own name, and no row past them is drawn.
 *
 * What it cannot see: the pixels. checkMock measures them on the export.
 *
 * What a reader would notice if this broke: a year or a council's name beside
 * the band too faint to read.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

/** The rule a wheel's light keeps: whole in the band, at least 55% beside it, nothing two rows off, never brighter further off. */
function keeps(light: (ad: number) => number): boolean {
  if (light(0) !== 1) return false;
  if (light(1) < 0.55) return false;
  for (let ad = 2; ad <= 4; ad += 0.25) if (light(ad) !== 0) return false;
  for (let ad = 0; ad < 4; ad += 0.05) if (light(ad + 0.05) > light(ad) + 1e-9) return false;
  return true;
}

describe("the atlas wheel's rows off the band", () => {
  it("are drawn whole in the band, at 55% beside it, and not at all two rows off", () => {
    expect(WHEEL_BESIDE).toBe(0.55);
    expect(wheelLight(0)).toBe(1);
    expect(wheelLight(1)).toBeCloseTo(0.55, 9);
    expect(wheelLight(1.5)).toBeCloseTo(0.275, 9);
    expect(keeps(wheelLight)).toBe(true);
  });

  it("is a rule the old light breaks: 50% beside the band, 33% and 16% beyond", () => {
    const old = (ad: number) => (ad < 1 ? 0.5 + 0.5 * c01(1 - ad) : Math.max(0, 0.5 - (ad - 1) * 0.17));
    expect(keeps(old)).toBe(false);
  });

  it("is what the engine draws each row by, and it draws only the band's row and its neighbours", () => {
    const engine = read("components/councils/atlasEngine.ts");
    expect(engine).toContain("const op = wheelLight(ad);");
    expect(engine).toContain("const lo = Math.max(0, Math.floor(pos) - 1);");
    expect(engine).toContain("const hi = Math.min(this.n - 1, Math.ceil(pos) + 1);");
  });

  it("inks an era's name beside a row as the row's own name", () => {
    const css = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
    const ink = (sel: string) => css.match(new RegExp(`\\n${sel.replace(/\./g, "\\.")} \\{[^}]*?\\n color: ([^;]+);`))?.[1];
    expect(ink(".atlas-row-name")).toBe("rgb(255 255 255 / 0.9)");
    expect(ink(".atlas-row-era")).toBe(ink(".atlas-row-name"));
  });
});
