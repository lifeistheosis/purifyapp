import { describe, expect, it } from "vitest";

import { busiestSpot } from "@/components/admin/map/HeatMap";

/** The first Zoom in goes where the most readers are close together. */
describe("busiestSpot", () => {
  it("picks the tightest cluster, not the middle of everyone", () => {
    const europe = [
      { x: 540, y: 120 },
      { x: 548, y: 126 },
      { x: 556, y: 118 },
      { x: 500, y: 100 },
    ];
    const america = [
      { x: 260, y: 140 },
      { x: 268, y: 146 },
    ];
    const [x, y] = busiestSpot([...america, ...europe], 80)!;
    expect(x).toBeGreaterThan(500);
    expect(y).toBeLessThan(130);
  });
  it("gives nothing when there is no one", () => {
    expect(busiestSpot([], 80)).toBeNull();
  });
});
