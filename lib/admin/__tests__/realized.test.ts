// Revenue's realized figure: complete only when Plus came from RevenueCat and
// the partial refunds were read; otherwise it says what it does not hold.

import { describe, expect, it } from "vitest";
import { realizedRevenue } from "../realized";

describe("realizedRevenue", () => {
  it("is the shop and Plus from RevenueCat, complete", () => {
    expect(realizedRevenue({ shopNetCents: 9_400, plusCents: 30_000, webPlusCents: null, refundsRead: true })).toEqual({
      totalCents: 39_400,
      complete: true,
      missing: [],
      source: "revenuecat",
    });
  });

  it("stands the website's Plus in from Stripe when RevenueCat cannot answer, and says what that leaves out", () => {
    const r = realizedRevenue({ shopNetCents: 9_400, plusCents: null, webPlusCents: 3_672, refundsRead: true });
    expect(r).toMatchObject({ totalCents: 13_072, complete: false, source: "stripe" });
    expect(r.missing).toEqual(["Plus bought through Google Play and the App Store"]);
  });

  it("never takes what Stripe paid out to the bank as revenue: only what customers paid", () => {
    // The old fallback's figure is not an input at all; the shape holds it.
    const r = realizedRevenue({ shopNetCents: 0, plusCents: null, webPlusCents: 0, refundsRead: true });
    expect(r.totalCents).toBe(0);
    expect(r.complete).toBe(false);
  });

  it("is the shop alone, partial, when neither can answer", () => {
    expect(realizedRevenue({ shopNetCents: 9_400, plusCents: null, webPlusCents: null, refundsRead: true })).toEqual({
      totalCents: 9_400,
      complete: false,
      missing: ["Plus"],
      source: "partial",
    });
  });

  it("is not complete while the partial refunds are unread, even with RevenueCat", () => {
    const r = realizedRevenue({ shopNetCents: 9_400, plusCents: 30_000, webPlusCents: null, refundsRead: false });
    expect(r.complete).toBe(false);
    expect(r.missing).toEqual(["partial refunds (not read)"]);
  });
});
