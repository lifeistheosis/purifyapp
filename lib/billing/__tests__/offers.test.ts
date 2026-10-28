// The paywall's offers (1.8, the owner's R2): every figure on the plans is the
// store's. The billed price as the store formats it is the big number, the
// month a year comes to as the store works it out is the small one, and the
// trial is the store's grant to this reader. What a reader would notice if
// this broke: a price or a saving the store never offered, "$6.00 a month"
// worked out here in the wrong currency, or a trial promised where the store
// gives none.

import { describe, expect, it } from "vitest";

import { NO_OFFERS, firstPlan, offeredPlans, savingsPct, type PlanOffer } from "@/lib/billing/offers";
import { nativeOffer } from "@/lib/billing/revenuecat";
import { webOffer } from "@/lib/billing/revenuecatWeb";

const offer = (price: string, amount: number | null, extra: Partial<PlanOffer> = {}): PlanOffer => ({
  price,
  amount,
  perMonth: null,
  trial: null,
  ...extra,
});

describe("the plans a screen shows", () => {
  it("are the year first, then the month, only those the store offers", () => {
    expect(offeredPlans({ yearly: offer("$71.99", 71.99), monthly: offer("$9.99", 9.99) })).toEqual(["yearly", "monthly"]);
    expect(offeredPlans({ yearly: null, monthly: offer("$9.99", 9.99) })).toEqual(["monthly"]);
    expect(offeredPlans(NO_OFFERS)).toEqual([]);
  });

  it("open on the year where there is one", () => {
    expect(firstPlan({ yearly: offer("$71.99", 71.99), monthly: offer("$9.99", 9.99) })).toBe("yearly");
    expect(firstPlan({ yearly: null, monthly: offer("$9.99", 9.99) })).toBe("monthly");
    expect(firstPlan(NO_OFFERS)).toBeNull();
  });
});

describe("what the year saves", () => {
  it("is worked from the two amounts the store gave", () => {
    expect(savingsPct({ yearly: offer("$71.99", 71.99), monthly: offer("$9.99", 9.99) })).toBe(40);
    expect(savingsPct({ yearly: offer("€59,99", 59.99), monthly: offer("€7,99", 7.99) })).toBe(37);
  });

  it("is never claimed when it cannot be shown, or is no saving", () => {
    expect(savingsPct({ yearly: offer("$71.99", 71.99), monthly: null })).toBeNull();
    expect(savingsPct({ yearly: offer("$71.99", null), monthly: offer("$9.99", 9.99) })).toBeNull();
    expect(savingsPct({ yearly: offer("$130", 130), monthly: offer("$9.99", 9.99) })).toBeNull();
    expect(savingsPct({ yearly: offer("$71.99", 71.99), monthly: offer("$0", 0) })).toBeNull();
  });
});

describe("an app store's package, as the paywall draws it", () => {
  const product = (p: Record<string, unknown>) => ({ product: { identifier: "plus", price: 71.99, priceString: "$71.99", pricePerMonthString: "$6.00", ...p } }) as never;

  it("keeps the store's price and, for the year only, the store's month", () => {
    const trial = { unit: "day" as const, count: 7 };
    expect(nativeOffer(product({}), trial, true)).toEqual({ price: "$71.99", amount: 71.99, perMonth: "$6.00", trial });
    expect(nativeOffer(product({ price: 9.99, priceString: "$9.99", pricePerMonthString: "$9.99" }), null, false)).toEqual({
      price: "$9.99",
      amount: 9.99,
      perMonth: null,
      trial: null,
    });
  });

  it("is nothing without a price from the store", () => {
    expect(nativeOffer(null, null, true)).toBeNull();
    expect(nativeOffer(product({ priceString: "" }), null, true)).toBeNull();
  });

  it("leaves the month out when the store gives none, rather than work one out", () => {
    expect(nativeOffer(product({ pricePerMonthString: null }), null, true)?.perMonth).toBeNull();
  });
});

describe("a web package, as the paywall draws it", () => {
  const web = (p: Record<string, unknown>) =>
    ({
      webBillingProduct: {
        currentPrice: { formattedPrice: "$71.99", amountMicros: 71_990_000 },
        defaultSubscriptionOption: { base: { pricePerMonth: { formattedPrice: "$6.00" } } },
        freeTrialPhase: null,
        ...p,
      },
    }) as never;

  it("keeps RevenueCat's price, its month for the year, and the trial the offering carries", () => {
    expect(webOffer(web({ freeTrialPhase: { period: { number: 1, unit: "week" } } }), true)).toEqual({
      price: "$71.99",
      amount: 71.99,
      perMonth: "$6.00",
      trial: { unit: "day", count: 7 },
    });
    expect(webOffer(web({}), false)?.perMonth).toBeNull();
    expect(webOffer(web({}), false)?.trial).toBeNull();
  });

  it("is nothing without a package or a price", () => {
    expect(webOffer(null, true)).toBeNull();
    expect(webOffer(web({ currentPrice: null }), true)).toBeNull();
  });
});
