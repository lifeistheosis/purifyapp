import { describe, expect, it } from "vitest";

import { DEFAULT_CHART_RANGE, parseChartRange } from "../chartRangePreference";
import { CHART_RANGES } from "../trafficChart";

describe("parseChartRange", () => {
  it("keeps every range the chart offers", () => {
    for (const d of CHART_RANGES) expect(parseChartRange(String(d))).toBe(d);
  });
  it("falls back to 30 days for anything else", () => {
    expect(DEFAULT_CHART_RANGE).toBe(30);
    for (const raw of [null, undefined, "", "45", "abc", "-7", "7.5"]) expect(parseChartRange(raw)).toBe(30);
  });
});
