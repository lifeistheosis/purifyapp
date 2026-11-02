import { describe, expect, it } from "vitest";

import { CHART_FETCH, CHART_RANGES, median, rangeDays, windowOf } from "../trafficChart";

describe("rangeDays", () => {
  it("reads every range the chart offers", () => {
    for (const d of CHART_RANGES) expect(rangeDays(`${d}d`)).toBe(d);
  });

  it("falls back to 30 for anything it does not know", () => {
    for (const r of [null, undefined, "", "45d", "365d", "7", "d", "all", "7d;drop"]) expect(rangeDays(r)).toBe(30);
  });

  it("reads the longest range in one fetch", () => {
    expect(CHART_FETCH).toBe(Math.max(...CHART_RANGES));
  });
});

describe("windowOf", () => {
  const days = Array.from({ length: 120 }, (_, i) => i);

  it("keeps the newest points", () => {
    expect(windowOf(days, 7)).toEqual([113, 114, 115, 116, 117, 118, 119]);
    expect(windowOf(days, 120)).toHaveLength(120);
  });

  it("gives what there is when the series is shorter than the range", () => {
    expect(windowOf([1, 2, 3], 30)).toEqual([1, 2, 3]);
  });
});

describe("median", () => {
  it("is the middle value of an odd count", () => {
    expect(median([5, 1, 9])).toBe(5);
  });

  it("is the mean of the two middle values of an even count", () => {
    expect(median([4, 1, 9, 6])).toBe(5);
  });

  it("is not lifted by one busy day", () => {
    expect(median([10, 11, 12, 13, 900])).toBe(12);
  });

  it("is null with nothing to count", () => {
    expect(median([])).toBeNull();
  });

  it("leaves its input in order", () => {
    const v = [3, 1, 2];
    median(v);
    expect(v).toEqual([3, 1, 2]);
  });
});
