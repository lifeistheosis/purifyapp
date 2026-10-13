import { describe, expect, it } from "vitest";

import { fitTabRow, TAB_LABEL_GAP_PX, TAB_LABEL_MAX_PX, TAB_LABEL_MIN_PX } from "../tabLabelFit";

// The five tabs' words at 12px, measured in chromium from a built app on
// 2026-10-13 (boards tool tab-label-widths.mjs), on a phone 390 px wide: each
// cell is 65.7 px, the cells are 69.9 px apart middle to middle, and the bar
// leaves 7 px beside its end cells.
const PHONE = { cell: 65.7, pitch: 69.9, edge: 7 };
const EN = [35, 28, 50, 43, 21]; // Today, Bible, Discover, Prayers, You
const EL = [42.8, 38.6, 68.9, 62.6, 31.3]; // Σήμερα, Βίβλος, Ανακαλύψτε, Προσευχές, Εσείς
const RO = [35.7, 31.7, 67.4, 56.2, 23.5]; // Astăzi, Biblia, Descoperiți, Rugăciuni, Dvs.
const FIL = [44.4, 38.4, 46.8, 90, 25.2]; // Ngayon, Bibliya, Tuklasin, Mga Panalangin, Ikaw
const FR = [66.4, 28.6, 56.2, 39.8, 28.6]; // Aujourd'hui, Bible, Découvrir, Prières, Vous
const KA = [36, 49.2, 81.6, 61.2, 39.6]; // the test browser's fallback letters, wider than a phone's

const fit = (naturals: number[], frame = PHONE) => fitTabRow({ naturals, ...frame });
/** Each word as it would be drawn at the fitted size. */
const drawn = (naturals: number[], size: number) => naturals.map((w) => (w * size) / TAB_LABEL_MAX_PX);
/** True when no word is wider than it is allowed to be drawn: nothing is cut. */
const whole = (naturals: number[], frame = PHONE) => {
  const { size, maxWidths } = fit(naturals, frame);
  return drawn(naturals, size).every((w, i) => w <= maxWidths[i]);
};
/** The least space between two words next to each other, as drawn and capped. */
const nearest = (naturals: number[], frame = PHONE) => {
  const { size, maxWidths } = fit(naturals, frame);
  const widths = drawn(naturals, size).map((w, i) => Math.min(w, maxWidths[i]));
  let least = Infinity;
  for (let i = 0; i + 1 < widths.length; i++) least = Math.min(least, frame.pitch - widths[i] / 2 - widths[i + 1] / 2);
  return least;
};

describe("fitTabRow", () => {
  it("keeps the caption size when every word has room", () => {
    expect(fit(EN).size).toBe(TAB_LABEL_MAX_PX);
    expect(whole(EN)).toBe(true);
  });

  it("lets a word wider than its cell reach into the room its neighbours leave", () => {
    // Romanian's Discover is 67.4 px in a 65.7 px cell, between two shorter
    // words. Held to its cell it was stepped down; nothing is near it.
    expect(RO[2]).toBeGreaterThan(PHONE.cell);
    expect(fit(RO).size).toBe(TAB_LABEL_MAX_PX);
    expect(whole(RO)).toBe(true);
    expect(fit(RO).maxWidths[2]).toBeGreaterThan(PHONE.cell);
  });

  it("draws the Greek for Discover whole", () => {
    // It was cut to "Ανακαλύψ…": the old rule held it to its cell, and
    // measured that cell and the word in whole pixels.
    const { size } = fit(EL);
    expect(size).toBeGreaterThanOrEqual(11.5);
    expect(whole(EL)).toBe(true);
    expect(nearest(EL)).toBeGreaterThanOrEqual(TAB_LABEL_GAP_PX);
  });

  it("draws the Filipino for Prayers whole, which no cell could hold", () => {
    // "Mga Panalangin" is 90 px at the caption size and 75 at the floor, in a
    // 65.7 px cell: cut at every size by the old rule. Its neighbours are
    // short, and it fits between them a step below the caption size.
    const { size } = fit(FIL);
    expect(size).toBeGreaterThan(TAB_LABEL_MIN_PX);
    expect(whole(FIL)).toBe(true);
    expect(nearest(FIL)).toBeGreaterThanOrEqual(TAB_LABEL_GAP_PX);
  });

  it("lets an end word reach into the bar's own padding and no further", () => {
    // French's Today is 66.4 px, the first word of the row.
    expect(fit(FR).size).toBe(TAB_LABEL_MAX_PX);
    expect(whole(FR)).toBe(true);
    expect(fit(FR).maxWidths[0]).toBeLessThanOrEqual(PHONE.cell + 2 * PHONE.edge);
    // With no padding to reach into, the same word has to step down.
    expect(fit(FR, { ...PHONE, edge: 0 }).size).toBeLessThan(TAB_LABEL_MAX_PX);
    expect(whole(FR, { ...PHONE, edge: 0 })).toBe(true);
  });

  it("steps every word down together, and no further than it must", () => {
    const { size } = fit(KA);
    expect(size).toBeLessThan(TAB_LABEL_MAX_PX);
    expect(size).toBeGreaterThanOrEqual(TAB_LABEL_MIN_PX);
    expect(whole(KA)).toBe(true);
    // A quarter pixel more and two words would be nearer than a word space.
    const nudged = drawn(KA, size + 0.25);
    let least = Infinity;
    for (let i = 0; i + 1 < nudged.length; i++) least = Math.min(least, PHONE.pitch - nudged[i] / 2 - nudged[i + 1] / 2);
    expect(least).toBeLessThan(TAB_LABEL_GAP_PX);
  });

  it("floors to a quarter pixel so rounding cannot tip a fit into an ellipsis", () => {
    for (const row of [EN, EL, RO, FIL, FR, KA]) {
      const { size } = fit(row);
      expect(size * 4).toBe(Math.floor(size * 4));
    }
  });

  it("never goes below the floor, and the caps take over from there", () => {
    // iPad Slide Over: cells about 49 px wide, and two long words side by side.
    const narrow = { cell: 49, pitch: 49, edge: 3 };
    const { size, maxWidths } = fit(KA, narrow);
    expect(size).toBe(TAB_LABEL_MIN_PX);
    // A word that fits nowhere is cut, and no two words are drawn over each other.
    expect(whole(KA, narrow)).toBe(false);
    expect(nearest(KA, narrow)).toBeGreaterThanOrEqual(0);
    // Every label still has at least its own cell.
    for (const cap of maxWidths) expect(cap).toBeGreaterThanOrEqual(narrow.cell);
  });

  it("never lets two words overlap, whatever the row", () => {
    for (const row of [EN, EL, RO, FIL, FR, KA]) {
      for (const frame of [PHONE, { cell: 57, pitch: 61, edge: 7 }, { cell: 49, pitch: 49, edge: 3 }, { cell: 80, pitch: 84, edge: 7 }]) {
        expect(nearest(row, frame), `${row.join(",")} in ${frame.cell}`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("ignores a row that has not laid out yet", () => {
    expect(fitTabRow({ naturals: [68, 0, 50], ...PHONE })).toEqual({ size: TAB_LABEL_MAX_PX, maxWidths: [] });
    expect(fitTabRow({ naturals: EN, cell: 0, pitch: 0, edge: 0 })).toEqual({ size: TAB_LABEL_MAX_PX, maxWidths: [] });
    expect(fitTabRow({ naturals: [], ...PHONE })).toEqual({ size: TAB_LABEL_MAX_PX, maxWidths: [] });
  });
});
