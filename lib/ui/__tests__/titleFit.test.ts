// The tab's name in the phone's top bar, made to fit (lib/ui/titleFit.ts).
// Widths are the ones measured on the bar's title (Lora 19px bold) and the
// room the bar left it with the streak beside the pill, on a 320px phone.

import { describe, expect, it } from "vitest";

import { TITLE_MAX_PX, TITLE_MIN_PX, fitTitle } from "../titleFit";

describe("fitting the tab's name", () => {
  it("keeps the bar's size for a name that fits", () => {
    expect(fitTitle(53, 68)).toBe(TITLE_MAX_PX); // "Today"
    expect(fitTitle(68, 68)).toBe(TITLE_MAX_PX);
  });

  it("steps a long name down until it fits, a quarter pixel at a time", () => {
    const size = fitTitle(85, 72); // "Молитвы"
    expect(size).toBeLessThan(TITLE_MAX_PX);
    expect(size * 4).toBe(Math.round(size * 4));
    expect((85 * size) / TITLE_MAX_PX).toBeLessThanOrEqual(72);
  });

  it("never draws it under the floor: below that it is cut instead", () => {
    expect(fitTitle(142, 60)).toBe(TITLE_MIN_PX);
  });

  it("leaves the bar's size alone before the bar has laid out", () => {
    for (const [natural, room] of [[0, 60], [80, 0], [Number.NaN, 60], [80, Number.NaN]]) {
      expect(fitTitle(natural, room)).toBe(TITLE_MAX_PX);
    }
  });
});
