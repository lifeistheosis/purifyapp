// The paywall says "7 days free" only where the store gives it (1.7.2,
// lib/billing/revenuecat.ts). Held here: how a store period is read, and that
// a trial is read from the product the way each store carries it, never
// assumed. StoreKit's eligibility answer is asked of the device and cannot be
// run here; freeTrialPeriod passes a product's trial on only when it says
// eligible.
//
// Since 1.8 the trial travels as a length and a unit, not English words, so
// the paywall can say it in the reader's language (lib/billing/offers.ts).

import { describe, expect, it } from "vitest";

import { trialPeriod } from "@/lib/billing/offers";
import { storeTrialPeriod } from "@/lib/billing/revenuecat";

/** A package as RevenueCat hands it over, with only what the trial reads. */
function pkg(product: Record<string, unknown>) {
  return { product: { identifier: "plus_yearly", introPrice: null, defaultOption: null, ...product } } as never;
}

describe("a store period, read", () => {
  it("in days for a week, as the paywall always said it", () => {
    expect(trialPeriod("WEEK", 1)).toEqual({ unit: "day", count: 7 });
    expect(trialPeriod("WEEK", 2)).toEqual({ unit: "day", count: 14 });
    expect(trialPeriod("DAY", 3)).toEqual({ unit: "day", count: 3 });
    expect(trialPeriod("DAY", 1)).toEqual({ unit: "day", count: 1 });
    expect(trialPeriod("MONTH", 1)).toEqual({ unit: "month", count: 1 });
    expect(trialPeriod("YEAR", 2)).toEqual({ unit: "year", count: 2 });
  });

  it("the same from the web SDK, which names its units in lower case", () => {
    expect(trialPeriod("week", 1)).toEqual({ unit: "day", count: 7 });
    expect(trialPeriod("month", 3)).toEqual({ unit: "month", count: 3 });
  });

  it("not at all when it cannot be said plainly", () => {
    expect(trialPeriod("UNKNOWN", 1)).toBeNull();
    expect(trialPeriod("WEEK", 0)).toBeNull();
    expect(trialPeriod("DAY", Number.NaN)).toBeNull();
  });
});

describe("a package's free trial", () => {
  it("is Google Play's free phase, which Play offers only to a reader who may have it", () => {
    const play = pkg({ defaultOption: { freePhase: { billingPeriod: { unit: "WEEK", value: 1, iso8601: "P1W" } } } });
    expect(storeTrialPeriod(play)).toEqual({ unit: "day", count: 7 });
  });

  it("is the App Store's introductory price when that price is nothing", () => {
    const apple = pkg({ introPrice: { price: 0, priceString: "$0.00", cycles: 1, period: "P1W", periodUnit: "WEEK", periodNumberOfUnits: 1 } });
    expect(storeTrialPeriod(apple)).toEqual({ unit: "day", count: 7 });
  });

  it("is not a paid introductory price, nor a product that has none, nor no package", () => {
    const paid = pkg({ introPrice: { price: 0.99, priceString: "$0.99", cycles: 1, period: "P1M", periodUnit: "MONTH", periodNumberOfUnits: 1 } });
    expect(storeTrialPeriod(paid)).toBeNull();
    expect(storeTrialPeriod(pkg({}))).toBeNull();
    expect(storeTrialPeriod(null)).toBeNull();
  });
});
