// Every glyph in the tab bar at the same size.
//
// What a reader would notice if this broke: a row of six symbols at six
// sizes again, the sun small and high, the church tall, or one glyph cut off
// at the edge of its box.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { DRAWING, LONG_SIDE, SQUARE_SIDE, frameGlyph, type GlyphBox } from "../tabGlyphFrame";

const bar = fs.readFileSync(path.join(process.cwd(), "components/nav/MobileTabBar.tsx"), "utf8");

/** The boxes as the tab bar declares them, by the tab's key. */
const declared = new Map<string, { box: GlyphBox; lines: [number, number] }>();
for (const tab of bar.split(/\n\s*key: "/).slice(1)) {
  const key = tab.slice(0, tab.indexOf('"'));
  const box = /box: \[([\d., ]+)\]/.exec(tab);
  const lines = /lines: \[([\d., ]+)\]/.exec(tab);
  if (!box) continue;
  const numbers = (text: string) => text.split(",").map((n) => Number(n.trim()));
  declared.set(key, {
    box: numbers(box[1]) as unknown as GlyphBox,
    lines: (lines ? numbers(lines[1]) : [1, 2]) as [number, number],
  });
}

describe("frameGlyph", () => {
  it("draws a tall glyph and a wide one the same length along their long side", () => {
    const tall = frameGlyph([6, 1.8, 12, 18.7], 1);
    const wide = frameGlyph([3.4, 3, 17.2, 12.5], 1);
    expect(tall.drawn.h).toBeCloseTo(LONG_SIDE, 5);
    expect(wide.drawn.w).toBeCloseTo(LONG_SIDE, 5);
    expect(tall.drawn.w).toBeLessThan(LONG_SIDE);
    expect(wide.drawn.h).toBeLessThan(LONG_SIDE);
  });

  it("draws a square glyph a little smaller, so it does not look the biggest", () => {
    const square = frameGlyph([4, 4.8, 16, 16], 1);
    expect(square.drawn.w).toBeCloseTo(SQUARE_SIDE, 5);
    expect(square.drawn.h).toBeCloseTo(SQUARE_SIDE, 5);
    expect(SQUARE_SIDE).toBeLessThan(LONG_SIDE);
  });

  it("centres the glyph, wherever its lines sat in its own drawing", () => {
    // The sun's lines sit in the top half of its drawing.
    const sun = frameGlyph([3.4, 3, 17.2, 12.5], 1);
    const [x, y, w, h] = sun.viewBox.split(" ").map(Number);
    expect(x + w / 2).toBeCloseTo(3.4 + 17.2 / 2, 2);
    expect(y + h / 2).toBeCloseTo(3 + 12.5 / 2, 2);
    expect(w).toBeCloseTo(h, 5);
  });

  it("keeps a line as thick on the screen as it was asked to be", () => {
    for (const box of [[3.4, 3, 17.2, 12.5], [6, 1.8, 12, 18.7], [4, 4.8, 16, 16]] as GlyphBox[]) {
      const frame = frameGlyph(box, 1);
      for (const weight of [0.95, 1, 1.35, 2]) expect(frame.strokeFor(weight) * frame.scale).toBeCloseTo(weight, 2);
    }
  });

  it("counts the lines' own thickness in the size", () => {
    // The same drawing in thin lines and in thick ends up the same size
    // overall: the thick one is drawn a little smaller to make room.
    const thin = frameGlyph([6, 1.8, 12, 18.7], 0.95);
    const thick = frameGlyph([6, 1.8, 12, 18.7], 2);
    expect(thin.drawn.h).toBeCloseTo(thick.drawn.h, 5);
    expect(thick.scale).toBeLessThan(thin.scale);
  });
});

describe("the tab bar's five glyphs", () => {
  it("each say where their lines are", () => {
    expect([...declared.keys()]).toEqual(["today", "bible", "discover", "prayers", "you"]);
  });

  it("are all drawn at the bar's one size, and none past the edge of its box", () => {
    for (const [key, { box, lines }] of declared) {
      const frame = frameGlyph(box, lines[0]);
      const long = Math.max(frame.drawn.w, frame.drawn.h);
      expect([LONG_SIDE, SQUARE_SIDE].some((side) => Math.abs(long - side) < 0.01), `${key} is ${long.toFixed(2)} long`).toBe(true);
      expect(long, key).toBeLessThanOrEqual(DRAWING - 2);
      // Lit, its lines are thicker, and it must still be inside the drawing.
      const lit = Math.max(box[2], box[3]) * frame.scale + lines[1];
      expect(lit, `${key}, lit`).toBeLessThanOrEqual(DRAWING - 1);
    }
  });

  it("stand the same height where they are tall, and the two squares match", () => {
    const drawn = (key: string) => frameGlyph(declared.get(key)!.box, declared.get(key)!.lines[0]).drawn;
    // The cross and the praying hands are the tall ones; the sun is the wide one.
    expect(drawn("discover").h).toBeCloseTo(drawn("prayers").h, 2);
    expect(drawn("today").w).toBeCloseTo(drawn("discover").h, 2);
    // The book and the head and shoulders are about square.
    expect(drawn("bible").w).toBeCloseTo(Math.max(drawn("you").w, drawn("you").h), 2);
  });

  it("are handed their frame by the bar, lit and idle", () => {
    expect(bar).toContain("const frame = frameGlyph(box, lines[0]);");
    expect(bar).toContain("viewBox={frame.viewBox}");
    expect(bar).toContain("strokeWidth={frame.strokeFor(active ? lines[1] : lines[0])}");
    // The line that used to take every idle glyph's own weight away.
    expect(bar).not.toContain("strokeWidth={active ? 2 : undefined}");
  });

  it("wear what the owner asked for: the cross on Discover, praying hands on Prayers", () => {
    const tab = (key: string) => bar.slice(bar.indexOf(`key: "${key}"`), bar.indexOf("matches:", bar.indexOf(`key: "${key}"`)));
    expect(tab("discover")).toContain("Icon: OrthodoxCross");
    expect(tab("prayers")).toContain("Icon: PrayingHands");
  });

  it("light the praying hands at less than the rest, so they stay hands", () => {
    const hands = declared.get("prayers")!.lines;
    expect(hands[1]).toBeLessThan(2);
    expect(hands[1]).toBeGreaterThan(hands[0]);
    const source = fs.readFileSync(path.join(process.cwd(), "components/ui/icons/tab/PrayingHands.tsx"), "utf8");
    expect(source).toContain("strokeWidth={0.95}");
  });
});
