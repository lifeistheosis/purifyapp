import { describe, expect, it } from "vitest";

import { cohorts, unitEconomics, type RetentionOrder } from "../retention";

const NOW = Date.parse("2026-09-30T12:00:00Z");
let n = 0;
const o = (user: string, at: string, cents: number, status: RetentionOrder["payment_status"] = "paid", items?: RetentionOrder["items"]): RetentionOrder => {
  n += 1;
  return { id: `o${n}`, user_id: user, total_cents: cents, payment_status: status, created_at: at, items };
};

describe("net revenue retention", () => {
  it("files each customer under the month of their first order", () => {
    const { cohorts: c } = cohorts(
      [o("a", "2026-08-03T00:00:00Z", 3000), o("a", "2026-09-10T00:00:00Z", 2000), o("b", "2026-09-01T00:00:00Z", 5000)],
      [],
    );
    expect(c.map((x) => [x.month, x.customers, x.baselineCents, x.expansionCents])).toEqual([
      ["2026-08", 1, 3000, 2000],
      ["2026-09", 1, 5000, 0],
    ]);
    expect(c[0].nrr).toBeCloseTo(5000 / 3000);
  });

  it("counts a full refund as churn and a partial one or a deal as contraction", () => {
    const first = o("a", "2026-07-01T00:00:00Z", 4000);
    const refunded = o("a", "2026-07-20T00:00:00Z", 1000, "refunded");
    const deal = o("a", "2026-08-01T00:00:00Z", 900, "paid", [
      { quantity: 1, unit_price_cents: 900, list_price_cents: 1000, discount_kind: "cart_deal" },
    ]);
    const { cohorts: c, overall } = cohorts([first, refunded, deal], [
      { order_id: first.id, amount_cents: 500, status: "processed" },
      { order_id: first.id, amount_cents: 700, status: "requested" },
    ]);
    expect(c[0]).toMatchObject({ baselineCents: 4000, expansionCents: 1900, contractionCents: 600, churnCents: 1000 });
    expect(overall?.nrr).toBeCloseTo((4000 + 1900 - 600 - 1000) / 4000);
  });

  it("ignores checkouts that never took money", () => {
    expect(cohorts([o("a", "2026-09-01T00:00:00Z", 3000, "pending")], []).overall).toBeNull();
  });
});

describe("customer cost against lifetime value", () => {
  it("prices a customer from the Costs lines tagged as ads or marketing", () => {
    const u = unitEconomics(
      [o("a", "2026-09-20T00:00:00Z", 6000), o("b", "2026-09-25T00:00:00Z", 2000), o("c", "2026-01-01T00:00:00Z", 4000)],
      [
        { monthly_cents: 3000, category: "Ads", active: true },
        { monthly_cents: 900, category: "Hosting", active: true },
        { monthly_cents: 5000, category: "Marketing", active: false },
      ],
      NOW,
    );
    expect(u).toMatchObject({ customers: 3, ltvCents: 4000, acquisitionMonthlyCents: 3000, newCustomers30d: 2, cacCents: 1500 });
    expect(u.ratio).toBeCloseTo(4000 / 1500);
  });

  it("says unknown, not zero, with no ad spend recorded", () => {
    const u = unitEconomics([o("a", "2026-09-20T00:00:00Z", 6000)], [], NOW);
    expect(u.cacCents).toBeNull();
    expect(u.ratio).toBeNull();
  });
});
