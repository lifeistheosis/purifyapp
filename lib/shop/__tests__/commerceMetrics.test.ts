import { describe, expect, it } from "vitest";

import { ABANDON_AFTER_MS } from "../abandonedCheckouts";
import { abandonmentStats, aovSplit, RECOVERY_WINDOW_MS, type MetricsOrder } from "../commerceMetrics";
import { crossedLine, daysOfCover, MIN_THRESHOLD, reorderThreshold, stockLines } from "../lowStock";

const NOW = Date.parse("2026-09-30T12:00:00Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const DAY = 86_400_000;

let n = 0;
function order(o: Partial<MetricsOrder>): MetricsOrder {
  n += 1;
  return {
    id: `o${n}`,
    user_id: null,
    store_id: "eikon",
    total_cents: 1000,
    payment_status: "paid",
    created_at: ago(3 * DAY),
    ...o,
  };
}

describe("average order, split", () => {
  it("keeps EIKON and the marketplace apart and counts kept orders only", () => {
    const s = aovSplit(
      [
        order({ total_cents: 4000 }),
        order({ total_cents: 2000 }),
        order({ store_id: "seller", total_cents: 1000 }),
        order({ total_cents: 9000, payment_status: "refunded" }),
        order({ total_cents: 9000, payment_status: "pending" }),
      ],
      new Set(["eikon"]),
    );
    expect(s.eikon).toEqual({ orders: 2, cents: 6000, aovCents: 3000 });
    expect(s.marketplace).toEqual({ orders: 1, cents: 1000, aovCents: 1000 });
    expect(s.all.aovCents).toBe(Math.round(7000 / 3));
  });

  it("is zero with no orders rather than dividing by nothing", () => {
    expect(aovSplit([], new Set()).all).toEqual({ orders: 0, cents: 0, aovCents: 0 });
  });
});

describe("abandonment and recovery", () => {
  it("leaves a checkout still inside Stripe's session life out of the rate", () => {
    const s = abandonmentStats([order({ payment_status: "pending", created_at: ago(ABANDON_AFTER_MS - 60_000) })], NOW);
    expect(s).toMatchObject({ open: 1, decided: 0, abandonmentRate: null });
  });

  it("counts stale and cancelled checkouts as abandoned, paid as converted", () => {
    const s = abandonmentStats(
      [
        order({ payment_status: "pending", created_at: ago(2 * DAY) }),
        order({ payment_status: "cancelled" }),
        order({ payment_status: "paid" }),
        order({ payment_status: "refunded" }),
      ],
      NOW,
    );
    expect(s).toMatchObject({ abandoned: 2, converted: 2, decided: 4, abandonmentRate: 0.5 });
  });

  it("calls it recovered only when the same account pays within a week after", () => {
    const s = abandonmentStats(
      [
        order({ user_id: "a", payment_status: "cancelled", created_at: ago(10 * DAY) }),
        order({ user_id: "a", payment_status: "paid", created_at: ago(9 * DAY) }),
        order({ user_id: "b", payment_status: "cancelled", created_at: ago(20 * DAY) }),
        order({ user_id: "b", payment_status: "paid", created_at: ago(20 * DAY - RECOVERY_WINDOW_MS - DAY) }),
        order({ user_id: "c", payment_status: "cancelled", created_at: ago(5 * DAY) }),
        order({ user_id: "c", payment_status: "paid", created_at: ago(6 * DAY) }),
      ],
      NOW,
    );
    expect(s.abandoned).toBe(3);
    expect(s.recovered).toBe(1);
    expect(s.recoveryRate).toBeCloseTo(1 / 3);
  });
});

describe("low stock lines", () => {
  it("never warns later than the floor, and rises with the rate of sale", () => {
    expect(reorderThreshold(0)).toBe(MIN_THRESHOLD);
    expect(reorderThreshold(60, 60, 21)).toBe(21);
    expect(reorderThreshold(8, 60, 21)).toBe(3);
  });

  it("fires once, on the sale that crosses the line", () => {
    expect(crossedLine(4, 3, 3)).toBe(true);
    expect(crossedLine(3, 2, 3)).toBe(false);
    expect(crossedLine(6, 5, 3)).toBe(false);
  });

  it("has no cover figure for a piece that has not sold", () => {
    expect(daysOfCover(5, 0)).toBeNull();
    expect(daysOfCover(10, 60, 60)).toBe(10);
  });

  it("watches counted, ready-to-ship pieces only, furthest below its line first", () => {
    const rows = stockLines(
      [
        { id: "a", slug: "a", title: "A", inventory_status: "ready_to_ship", quantity_available: 10 },
        { id: "b", slug: "b", title: "B", inventory_status: "ready_to_ship", quantity_available: 1 },
        { id: "c", slug: "c", title: "C", inventory_status: "special_order", quantity_available: 1 },
        { id: "d", slug: "d", title: "D", inventory_status: "ready_to_ship", quantity_available: null },
      ],
      new Map([["a", 60]]),
    );
    // A sells a unit a day and has ten: eleven short of three weeks' cover.
    // B has one left of a line of two and has never sold.
    expect(rows.map((r) => r.id)).toEqual(["a", "b"]);
    expect(rows[0]).toMatchObject({ low: true, threshold: 21, daysOfCover: 10 });
    expect(rows[1]).toMatchObject({ low: true, threshold: MIN_THRESHOLD });
  });
});
