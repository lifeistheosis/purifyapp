import { describe, it, expect } from "vitest";
import { estimatedMrrCents, estimatedArrCents } from "@/lib/premium/mrr";
import { PLAN_PRICE_CENTS } from "@/lib/premium/plans";

describe("estimated subscription revenue", () => {
  it("prices Plus-only and Pro at their monthly list price", () => {
    const counts = { plusOnly: 3, pro: 2 };
    expect(estimatedMrrCents(counts)).toBe(
      3 * PLAN_PRICE_CENTS.plusMonthly + 2 * PLAN_PRICE_CENTS.proMonthly,
    );
  });

  it("counts a Pro subscriber once at the Pro price, never also as Plus", () => {
    // plusOnly already excludes Pro (Pro is a superset), so a pure-Pro
    // account contributes only the Pro price.
    expect(estimatedMrrCents({ plusOnly: 0, pro: 1 })).toBe(
      PLAN_PRICE_CENTS.proMonthly,
    );
  });

  it("is zero with no paying subscribers", () => {
    expect(estimatedMrrCents({ plusOnly: 0, pro: 0 })).toBe(0);
    expect(estimatedArrCents({ plusOnly: 0, pro: 0 })).toBe(0);
  });

  it("ARR is 12x MRR", () => {
    const counts = { plusOnly: 5, pro: 4 };
    expect(estimatedArrCents(counts)).toBe(estimatedMrrCents(counts) * 12);
  });
});
