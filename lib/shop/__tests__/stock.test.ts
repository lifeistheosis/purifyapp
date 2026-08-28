import { describe, expect, it } from "vitest";

import { LOW_STOCK_THRESHOLD, isAlmostSoldOut, stockUrgency } from "../stock";
import type { ShopInventoryStatus } from "../types";

const p = (
  inventory_status: ShopInventoryStatus,
  quantity_available: number | null = null,
) => ({ inventory_status, quantity_available });

describe("says almost sold out only when it is true", () => {
  it("counts down from the threshold", () => {
    expect(stockUrgency(p("ready_to_ship", 5)).label).toBe("Only 5 left");
    expect(stockUrgency(p("ready_to_ship", 2)).label).toBe("Only 2 left");
  });

  it("names the last one as one, not as a number", () => {
    const u = stockUrgency(p("ready_to_ship", 1));
    expect(u.level).toBe("last");
    expect(u.label).toBe("Last one");
  });

  it("stays quiet above the threshold", () => {
    expect(stockUrgency(p("ready_to_ship", LOW_STOCK_THRESHOLD + 1)).level).toBe(
      "none",
    );
    expect(stockUrgency(p("ready_to_ship", 200)).label).toBeNull();
  });
});

describe("what it refuses to claim", () => {
  it("says nothing when the quantity is unknown", () => {
    // Most of the live catalogue has no count. A badge here would be invented.
    expect(stockUrgency(p("ready_to_ship", null)).level).toBe("none");
    expect(stockUrgency({ inventory_status: "ready_to_ship" }).level).toBe("none");
  });

  it("says nothing for a product nobody can buy right now", () => {
    // The production case this exists for: christ-pantocrator-mounted is
    // out_of_stock AND carries quantity_available = 8. "Only 8 left" beside a
    // Sold Out badge is worse than either on its own.
    expect(stockUrgency(p("out_of_stock", 8)).level).toBe("none");
    expect(stockUrgency(p("coming_soon", 3)).level).toBe("none");
  });

  it("says nothing for a special order, however few are held", () => {
    // Made to order: a count of stock on hand tells a buyer nothing.
    expect(stockUrgency(p("special_order", 2)).level).toBe("none");
  });

  it("treats zero as out of stock, which the status already says", () => {
    expect(stockUrgency(p("ready_to_ship", 0)).level).toBe("none");
    expect(stockUrgency(p("ready_to_ship", -3)).level).toBe("none");
  });

  it("ignores a nonsense quantity rather than rendering it", () => {
    expect(stockUrgency(p("ready_to_ship", NaN)).level).toBe("none");
    expect(
      stockUrgency(p("ready_to_ship", Number.POSITIVE_INFINITY)).level,
    ).toBe("none");
  });
});

describe("the helper agrees with the detail", () => {
  it("is true exactly when a label exists", () => {
    const cases: [ShopInventoryStatus, number | null][] = [
      ["ready_to_ship", 1],
      ["ready_to_ship", 5],
      ["ready_to_ship", 6],
      ["ready_to_ship", null],
      ["out_of_stock", 2],
      ["special_order", 1],
      ["coming_soon", 1],
    ];
    for (const [status, qty] of cases) {
      const u = stockUrgency(p(status, qty));
      expect(isAlmostSoldOut(p(status, qty))).toBe(u.label !== null);
    }
  });

  it("carries the count it derived the label from", () => {
    expect(stockUrgency(p("ready_to_ship", 3)).remaining).toBe(3);
    expect(stockUrgency(p("ready_to_ship", null)).remaining).toBeNull();
  });
});
