import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The room kept for a row of History's timeline that is not yet drawn (the
 * arbiter's word of 2026-11-11, 15:07 UTC, from Fable Themes' measure: "at
 * 390 the timeline is 11,484px before its rows draw and 15,772px after";
 * "set the room to the measured rows by width").
 *
 * The timeline draws only the rows near the screen (app/globals.css,
 * `.history-cv`) and gives every other row a height to stand in for it. That
 * height was 128px at every width: a row of 1.7, a date line, a title and a
 * two-line preview. Since 1.8 most rows carry their event's picture, which
 * grows with the column it stands in. And the room stands in only for rows
 * not yet drawn: a row drawn once keeps its own size (`auto`), so what it
 * must match is the rows still undrawn when the timeline opens, every row
 * below the first screen. Those average 266 to 271px on a phone up to 390
 * wide, rise with the column to 458px at 1023, and fall back wherever the
 * page gains a column beside the line (lg, 1024, the rail of filters; xl,
 * 1280, the eras on the other side). The first rows are shorter, so the mean
 * of all forty (240px at 390) left the timeline 8% short; at 128 everywhere
 * it was 43 to 59% short, and the page changed length by that much as its
 * rows were drawn.
 *
 * The stylesheet now steps the height with the width, each step the undrawn
 * rows' mean across its span. This holds each step to the measure it was
 * taken from: those rows' mean, every row drawn, on the export of 2026-11-11
 * (40 events, in English, a phone 844px tall newly opened), at thirty-two
 * widths. It is arithmetic on a record. The
 * measure itself is taken again on every export by the export walk's section
 * 77 (`node scripts/export-walk.mjs --sections 77`), which is what says the
 * numbers are still the rows'.
 *
 * What would go wrong if this broke: a reader far down History's line sees
 * the page jump as rows above draw in, and the scrollbar says the timeline is
 * nearly half as long as it is.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const css = read("app/globals.css");

/** The steps as the stylesheet has them, in its order: from which width, and how many pixels. */
function steps(): { from: number; px: number }[] {
  const base = /\n\.history-cv \{[^}]*?\n contain-intrinsic-size: auto (\d+)px;/.exec(css);
  const more = [...css.matchAll(/\n@media \(min-width: (\d+)px\) \{ \.history-cv \{ contain-intrinsic-size: auto (\d+)px; \} \}/g)];
  return [{ from: 0, px: Number(base?.[1]) }, ...more.map((m) => ({ from: Number(m[1]), px: Number(m[2]) }))];
}

/** The height an undrawn row is given on a screen this wide: the last step that has begun, as the cascade has it. */
const roomAt = (wide: number, of = steps()) => of.filter((s) => s.from <= wide).at(-1)?.px ?? Number.NaN;

/** The rows still undrawn when the timeline opens, every row below the first screen: [the screen's width, their mean with every row drawn]. */
const MEASURED: [number, number][] = [
  [320, 268.3],
  [340, 266.0],
  [360, 269.0],
  [375, 270.3],
  [390, 271.0],
  [412, 278.3],
  [430, 282.5],
  [460, 291.1],
  [480, 295.4],
  [520, 307.4],
  [560, 317.7],
  [600, 332.6],
  [640, 344.5],
  [680, 349.9],
  [720, 361.8],
  [767, 376.9],
  [768, 379.4],
  [820, 388.3],
  [860, 400.8],
  [900, 414.2],
  [940, 426.7],
  [980, 441.5],
  [1023, 457.5],
  [1024, 339.6],
  [1100, 363.1],
  [1180, 379.8],
  [1279, 409.7],
  [1280, 333.1],
  [1366, 359.4],
  [1440, 370.5],
  [1600, 370.5],
  [1920, 370.5],
];

describe("the room kept for a row of History not yet drawn", () => {
  it("is read from the stylesheet: a height to begin with, and seventeen steps", () => {
    const of = steps();
    expect(of).toHaveLength(18);
    for (const s of of) expect(Number.isFinite(s.px), JSON.stringify(s)).toBe(true);
    // Each keeps the size a row had once it has been drawn (`auto`), which the Back restore relies on (lib/history/scroll.ts).
    expect(css.match(/\.history-cv \{[^}]*contain-intrinsic-size: (?!auto \d+px;)/g)).toBeNull();
  });

  it("is within 4% of the undrawn rows' mean at every width measured, where 128 everywhere was 43 to 59% short", () => {
    const out = MEASURED.map(([wide, mean]) => ({ wide, mean, room: roomAt(wide), off: Math.abs(roomAt(wide) - mean) / mean }));
    expect(out.filter((m) => !(m.off < 0.04))).toEqual([]);
    // The measure is what the old number failed, at every width.
    const flat = [{ from: 0, px: 128 }];
    for (const [wide, mean] of MEASURED) expect((mean - roomAt(wide, flat)) / mean, `${wide} wide`).toBeGreaterThan(0.45);
  });

  it("steps in rising order, straight after the rule they step, with nothing between to speak over them", () => {
    const from = steps().map((s) => s.from);
    expect(from).toEqual([...from].sort((a, b) => a - b));
    expect(new Set(from).size).toBe(from.length);
    const at = css.indexOf("\n.history-cv {");
    const block = css.slice(at, css.indexOf("html[data-history-whole] .history-cv", at));
    expect(block.match(/@media \(min-width: \d+px\) \{ \.history-cv \{/g)).toHaveLength(17);
  });

  it("steps down where the page gains a column beside the line, since the row narrows there", () => {
    const from = steps().map((s) => s.from);
    // lg and xl, where the timeline's page sets a column beside the line.
    const page = read("components/history/HistoryTimelinePage.tsx");
    expect(page).toContain("lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12 xl:grid-cols-[250px_minmax(0,1fr)_330px]");
    expect(from).toContain(1024);
    expect(from).toContain(1280);
    expect(roomAt(1024)).toBeLessThan(roomAt(1023));
    expect(roomAt(1280)).toBeLessThan(roomAt(1279));
    // Between them a row only widens, and its picture with it: the room only rises.
    for (const [a, b] of [
      [0, 1023],
      [1024, 1279],
      [1280, 5000],
    ]) {
      const px = [{ from: a, px: roomAt(a) }, ...steps().filter((s) => s.from > a && s.from <= b)].map((s) => s.px);
      expect(px, `${a} to ${b}`).toEqual([...px].sort((x, y) => x - y));
    }
  });

  it("is the timeline's rows' alone: the numbers are theirs, and no other list wears the class", () => {
    const wearers: string[] = [];
    const walk = (dir: string) => {
      for (const d of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
        const rel = `${dir}/${d.name}`;
        if (d.isDirectory()) {
          if (!["__tests__", "node_modules"].includes(d.name)) walk(rel);
        } else if (d.name.endsWith(".tsx") && /\bhistory-cv\b/.test(read(rel))) wearers.push(rel);
      }
    };
    walk("app");
    walk("components");
    expect(wearers).toEqual(["components/history/EventRow.tsx"]);
  });
});
