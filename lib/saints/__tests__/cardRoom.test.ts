import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The room kept for a saint's card that is not yet drawn (the arbiter,
 * 2026-11-11: "let the undrawn card's height follow the width at the two
 * ends (about 310), so a card that draws in never moves the page").
 *
 * The saints' list draws only the cards near the screen (app/globals.css,
 * `.cv-card`), and gives every other card a height to stand in for it. That
 * height was 280px at every width. It is the card's own only where a card is
 * about 340px wide. A card is as tall as its lines, and its lines wrap by how
 * wide it is: with the saint's saying and first title shown whole (1.9) a
 * row's mean height runs from 314px at 320 wide down to 249px at 767, and
 * steps up again wherever the grid gains a column and its cards narrow. So
 * the undrawn list was 8,984px short of itself at 320 wide, 7,870px long at
 * 600, and 2,586px short at 1024, and the page changed length by that much
 * as its cards were drawn.
 *
 * The stylesheet now steps the height with the width. This holds each step
 * to the measure it was taken from: the mean row, every card drawn, on the
 * export of 2026-11-11 (269 saints, in English), at thirty-four widths. It
 * is arithmetic on a record. The measure itself is taken again on every
 * export by the export walk's section 76 (`node scripts/export-walk.mjs
 * --sections 76`), which is what says the numbers are still the cards'.
 *
 * What would go wrong if this broke: a reader far down the saints' list on a
 * small phone or a tablet sees the page jump as cards above draw in, and the
 * scrollbar says the list is a tenth shorter or longer than it is.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const css = read("app/globals.css");

/** The steps as the stylesheet has them, in its order: from which width, and how many pixels. */
function steps(): { from: number; px: number }[] {
  const base = css.match(/\n\.cv-card \{\n contain-intrinsic-size: auto (\d+)px;\n\}\n/);
  const more = [...css.matchAll(/\n@media \(min-width: (\d+)px\) \{ \.cv-card \{ contain-intrinsic-size: auto (\d+)px; \} \}/g)];
  return [{ from: 0, px: Number(base?.[1]) }, ...more.map((m) => ({ from: Number(m[1]), px: Number(m[2]) }))];
}

/** The height an undrawn card is given on a screen this wide: the last step that has begun, as the cascade has it. */
const roomAt = (wide: number, of = steps()) => of.filter((s) => s.from <= wide).at(-1)?.px ?? Number.NaN;

/** A row's mean height with every card drawn: [the screen's width, the grid's columns, the mean]. */
const MEASURED: [number, number, number][] = [
  [320, 1, 313.6],
  [330, 1, 305.1],
  [340, 1, 296.3],
  [350, 1, 289.8],
  [360, 1, 286.7],
  [375, 1, 281.9],
  [390, 1, 275.6],
  [400, 1, 271.4],
  [412, 1, 267],
  [430, 1, 261.2],
  [480, 1, 255],
  [540, 1, 251.8],
  [600, 1, 250.5],
  [700, 1, 249.9],
  [767, 1, 248.8],
  [768, 2, 289.4],
  [820, 2, 276.3],
  [912, 2, 263.8],
  [1000, 2, 258],
  [1023, 2, 257.2],
  [1024, 3, 309.7],
  [1040, 3, 306.3],
  [1060, 3, 303.9],
  [1080, 3, 301.5],
  [1100, 3, 299.6],
  [1120, 3, 296],
  [1140, 3, 292.8],
  [1160, 3, 289.1],
  [1180, 3, 286.4],
  [1200, 3, 284.4],
  [1240, 3, 278.2],
  [1280, 3, 274],
  [1366, 3, 274],
  [1440, 3, 274],
];

describe("the room kept for a saint's card not yet drawn", () => {
  it("is read from the stylesheet: a height to begin with, and ten steps", () => {
    const of = steps();
    expect(of).toHaveLength(11);
    for (const s of of) expect(Number.isFinite(s.px), JSON.stringify(s)).toBe(true);
    // Every one keeps the size a card had once it has been drawn (`auto`), and none hides a card's contents by another road.
    expect(css.match(/\.cv-card \{[^}]*contain-intrinsic-size: (?!auto \d+px;)/g)).toBeNull();
  });

  it("is within 8px of the mean row at every width measured, where 280 everywhere was up to 34px out", () => {
    const out = MEASURED.map(([wide, , mean]) => ({ wide, mean, room: roomAt(wide), off: Math.round((roomAt(wide) - mean) * 10) / 10 }));
    expect(out.filter((m) => !(Math.abs(m.off) <= 8))).toEqual([]);
    // The two ends the arbiter named are about 310, as it said.
    expect(roomAt(320)).toBe(310);
    expect(roomAt(1024)).toBeGreaterThanOrEqual(300);
    // The measure is what the old number failed: one height for every width, at the ends and in the middle.
    const flat = [{ from: 0, px: 280 }];
    const was = (wide: number) => Math.abs(roomAt(wide, flat) - (MEASURED.find((m) => m[0] === wide)?.[2] ?? 0));
    expect(was(320)).toBeGreaterThan(30);
    expect(was(700)).toBeGreaterThan(30);
    expect(was(1024)).toBeGreaterThan(29);
  });

  it("keeps the whole list within 3% of its drawn length at every width measured", () => {
    for (const [wide, , mean] of MEASURED) expect(Math.abs(roomAt(wide) - mean) / mean, `${wide} wide`).toBeLessThan(0.03);
  });

  it("steps in rising order, so the rule that speaks last is the widest that has begun", () => {
    const from = steps().map((s) => s.from);
    expect(from).toEqual([...from].sort((a, b) => a - b));
    expect(new Set(from).size).toBe(from.length);
    // And they stand together, straight after the rule they step, with nothing between to speak over them.
    const at = css.indexOf("\n.cv-card {\n contain-intrinsic-size: auto");
    const block = css.slice(at, css.indexOf("\n\n", at + 1));
    expect(block.match(/@media \(min-width: \d+px\) \{ \.cv-card \{/g)).toHaveLength(10);
  });

  it("steps where the grid gains a column, since a card narrows there and grows taller", () => {
    const from = steps().map((s) => s.from);
    expect(read("components/saints/SaintsBrowser.tsx")).toContain("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5");
    // md and lg, the house's two.
    expect(from).toContain(768);
    expect(from).toContain(1024);
    expect(roomAt(768)).toBeGreaterThan(roomAt(767));
    expect(roomAt(1024)).toBeGreaterThan(roomAt(1023));
    // Between them a card only widens, and the room only falls.
    for (const [a, b] of [
      [0, 767],
      [768, 1023],
      [1024, 5000],
    ]) {
      const span = steps().filter((s) => s.from >= a && s.from <= b);
      const px = (a === 0 ? span : [{ from: a, px: roomAt(a) }, ...span.filter((s) => s.from > a)]).map((s) => s.px);
      expect(px, `${a} to ${b}`).toEqual([...px].sort((x, y) => y - x));
    }
  });

  it("is the saints' list's alone: the numbers are its cards', and no other list wears the class", () => {
    // The code without its notes: a note may name the class.
    const code = (src: string) => src.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
    const wearers: string[] = [];
    const walk = (dir: string) => {
      for (const d of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
        const rel = `${dir}/${d.name}`;
        if (d.isDirectory()) {
          if (!["__tests__", "node_modules"].includes(d.name)) walk(rel);
        } else if (d.name.endsWith(".tsx") && /className=[^>]*\bcv-card\b/.test(code(read(rel)))) wearers.push(rel);
      }
    };
    walk("app");
    walk("components");
    expect(wearers).toEqual(["components/saints/SaintsBrowser.tsx"]);
  });
});
