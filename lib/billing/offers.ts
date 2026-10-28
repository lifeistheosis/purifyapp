// What the store offers this reader, said the same way for both stores and the
// web (1.8, the paywall the owner locked as R2 on 2026-10-27).
//
// The paywall draws one shape of offer whoever answered: RevenueCat's Capacitor
// plugin in the apps (lib/billing/revenuecat.ts, nativeOffer) or its web SDK on
// the website (lib/billing/revenuecatWeb.ts, webOffer). Every figure in it is
// the store's own: the billed price as the store formats it, the month a yearly
// price comes to as the store works it out, and the free trial as the store
// grants it to this reader. Nothing here holds a price, and nothing invents
// one: a figure the store did not give is null, and the screen then says
// nothing rather than something remembered.
//
// Pure: no React, no SDK, no window. The tests read it under node.

/** A free trial's length, in a unit a sentence can say: a week is seven days. */
export type TrialPeriod = { unit: "day" | "month" | "year"; count: number };

/** One plan, as the store offers it to this reader. */
export type PlanOffer = {
  /** The amount billed each period, formatted by the store: "$71.99". */
  price: string;
  /** The same amount as a number, used for the saving and nothing else. */
  amount: number | null;
  /** What a yearly price comes to a month, formatted by the store: "$6.00". Null on a monthly plan. */
  perMonth: string | null;
  /** The free trial the store will give this reader with this plan, or null. */
  trial: TrialPeriod | null;
};

export type Plan = "yearly" | "monthly";

export type PlusOffers = { yearly: PlanOffer | null; monthly: PlanOffer | null };

export const NO_OFFERS: PlusOffers = { yearly: null, monthly: null };

/**
 * A store period in a unit a sentence can say. RevenueCat's plugin names units
 * in capitals ("WEEK"), its web SDK in lower case ("week"); both are read. A
 * week is said in days, as the paywall always said it ("7 days"). Null for a
 * period that cannot be said plainly.
 */
export function trialPeriod(unit: string, value: number): TrialPeriod | null {
  if (!(value > 0) || !Number.isFinite(value)) return null;
  switch (unit.toUpperCase()) {
    case "DAY":
      return { unit: "day", count: value };
    case "WEEK":
      return { unit: "day", count: value * 7 };
    case "MONTH":
      return { unit: "month", count: value };
    case "YEAR":
      return { unit: "year", count: value };
    default:
      return null;
  }
}

/** The plans the store offers, yearly first, as the paywall lists them. */
export function offeredPlans(offers: PlusOffers): Plan[] {
  const out: Plan[] = [];
  if (offers.yearly) out.push("yearly");
  if (offers.monthly) out.push("monthly");
  return out;
}

/** The plan a screen opens on: the year when the store offers one. */
export function firstPlan(offers: PlusOffers): Plan | null {
  return offeredPlans(offers)[0] ?? null;
}

/**
 * What the year saves against twelve months, as a whole percent, from the two
 * amounts the store gave. Null when either is missing, or when the year saves
 * nothing, so the screen never claims a saving it cannot show.
 */
export function savingsPct(offers: PlusOffers): number | null {
  const m = offers.monthly?.amount;
  const y = offers.yearly?.amount;
  if (m == null || y == null || !(m > 0) || !(y > 0)) return null;
  const pct = Math.round((1 - y / (m * 12)) * 100);
  return pct > 0 && pct < 100 ? pct : null;
}
