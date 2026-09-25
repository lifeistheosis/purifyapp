import { describe, expect, it } from "vitest";

import { fitTabLabelSize, TAB_LABEL_MAX_PX, TAB_LABEL_MIN_PX } from "../tabLabelFit";

// Widths measured in chromium on 2026-09-25 with the bundled DM Sans at 12px.
const EN = { today: 35, bible: 28, discover: 50, prayers: 43, community: 68 };

function row(cell: number, labels: number[]) {
  return labels.map((natural) => ({ natural, available: cell }));
}

describe("fitTabLabelSize", () => {
  it("keeps the caption size when every label already fits", () => {
    expect(fitTabLabelSize(row(80, Object.values(EN)))).toBe(TAB_LABEL_MAX_PX);
  });

  it("steps every label down together so the longest one fits", () => {
    // A 390px iPhone with five tabs gives each cell 63px.
    const size = fitTabLabelSize(row(63, Object.values(EN)));
    expect(size).toBeLessThan(TAB_LABEL_MAX_PX);
    expect((EN.community * size) / TAB_LABEL_MAX_PX).toBeLessThanOrEqual(63);
  });

  it("floors to a quarter pixel so rounding cannot tip a fit into an ellipsis", () => {
    const size = fitTabLabelSize([{ natural: 68, available: 63 }]);
    expect(size * 4).toBe(Math.floor(size * 4));
  });

  it("never goes below the floor, and truncation takes over from there", () => {
    expect(fitTabLabelSize([{ natural: 68, available: 30 }])).toBe(TAB_LABEL_MIN_PX);
  });

  it("ignores a cell that has not laid out yet", () => {
    expect(fitTabLabelSize([{ natural: 68, available: 0 }, { natural: 0, available: 50 }])).toBe(
      TAB_LABEL_MAX_PX,
    );
  });
});
