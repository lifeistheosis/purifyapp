// The paywall says "7 days free" only where the store gives it (1.7.2,
// lib/billing/revenuecat.ts). Held here: how a store period is said, and that
// a trial is read from the product the way each store carries it, never
// assumed. StoreKit's eligibility answer is asked of the device and cannot be
// run here; freeTrial passes a product's trial on only when it says eligible.

import { describe, expect, it } from "vitest";

import { periodLabel, storeFreeTrial } from "@/lib/billing/revenuecat";

/** A package as RevenueCat hands it over, with only what the trial reads. */
function pkg(product: Record<string, unknown>) {
  return { product: { identifier: "plus_yearly", introPrice: null, defaultOption: null, ...product } } as never;
}

describe("a store period, said", () => {
  it("in days for a week, as the paywall's chip reads", () => {
    expect(periodLabel("WEEK", 1)).toBe("7 days");
    expect(periodLabel("WEEK", 2)).toBe("14 days");
    expect(periodLabel("DAY", 3)).toBe("3 days");
    expect(periodLabel("DAY", 1)).toBe("1 day");
    expect(periodLabel("MONTH", 1)).toBe("1 month");
    expect(periodLabel("YEAR", 2)).toBe("2 years");
  });

  it("not at all when it cannot be said plainly", () => {
    expect(periodLabel("UNKNOWN", 1)).toBeNull();
    expect(periodLabel("WEEK", 0)).toBeNull();
  });
});

describe("a package's free trial", () => {
  it("is Google Play's free phase, which Play offers only to a reader who may have it", () => {
    const play = pkg({ defaultOption: { freePhase: { billingPeriod: { unit: "WEEK", value: 1, iso8601: "P1W" } } } });
    expect(storeFreeTrial(play)).toBe("7 days");
  });

  it("is the App Store's introductory price when that price is nothing", () => {
    const apple = pkg({ introPrice: { price: 0, priceString: "$0.00", cycles: 1, period: "P1W", periodUnit: "WEEK", periodNumberOfUnits: 1 } });
    expect(storeFreeTrial(apple)).toBe("7 days");
  });

  it("is not a paid introductory price, nor a product that has none, nor no package", () => {
    const paid = pkg({ introPrice: { price: 0.99, priceString: "$0.99", cycles: 1, period: "P1M", periodUnit: "MONTH", periodNumberOfUnits: 1 } });
    expect(storeFreeTrial(paid)).toBeNull();
    expect(storeFreeTrial(pkg({}))).toBeNull();
    expect(storeFreeTrial(null)).toBeNull();
  });
});
