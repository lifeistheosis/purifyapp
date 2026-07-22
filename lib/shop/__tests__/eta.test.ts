import { describe, expect, it } from "vitest";

import { estimatedShipWindow } from "../eta";

const PLACED = "2026-07-01T12:00:00Z";
const day = (n: number) =>
  new Date(Date.parse(PLACED) + n * 24 * 60 * 60 * 1000);

describe("estimatedShipWindow", () => {
  it("uses the product's promised dispatch window from the order date", () => {
    const est = estimatedShipWindow(
      PLACED,
      [{ dispatch_min_days: 2, dispatch_max_days: 5 }],
      day(1),
    );
    expect(est).not.toBeNull();
    expect(est!.from.getTime()).toBe(day(2).getTime());
    expect(est!.to.getTime()).toBe(day(5).getTime());
    expect(est!.late).toBe(false);
  });

  it("the slowest item governs a multi-item order", () => {
    const est = estimatedShipWindow(
      PLACED,
      [
        { dispatch_min_days: 2, dispatch_max_days: 5 },
        { dispatch_min_days: 14, dispatch_max_days: 28 },
      ],
      day(1),
    );
    expect(est!.from.getTime()).toBe(day(14).getTime());
    expect(est!.to.getTime()).toBe(day(28).getTime());
  });

  it("flags late once the promised window has fully passed", () => {
    const est = estimatedShipWindow(
      PLACED,
      [{ dispatch_min_days: 2, dispatch_max_days: 5 }],
      day(6),
    );
    expect(est!.late).toBe(true);
  });

  it("never invents an estimate: null when no item carries a window", () => {
    expect(estimatedShipWindow(PLACED, [], day(1))).toBeNull();
    expect(
      estimatedShipWindow(
        PLACED,
        [null, { dispatch_min_days: null, dispatch_max_days: 28 }],
        day(1),
      ),
    ).toBeNull();
    expect(estimatedShipWindow("not-a-date", [
      { dispatch_min_days: 2, dispatch_max_days: 5 },
    ])).toBeNull();
  });

  it("repairs an inverted window instead of promising to < from", () => {
    const est = estimatedShipWindow(
      PLACED,
      [
        { dispatch_min_days: 10, dispatch_max_days: 12 },
        { dispatch_min_days: 14, dispatch_max_days: 5 },
      ],
      day(1),
    );
    // min governs at 14; max would be 12 from the other item — clamped up.
    expect(est!.from.getTime()).toBe(day(14).getTime());
    expect(est!.to.getTime()).toBe(day(14).getTime());
  });
});
