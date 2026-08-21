// The projection engine. One implementation, used by the domestic model, the
// international module and the forecast charts, so a change to how a number is
// reached changes every number at once.
//
// WHAT A PROJECTION IS FOR HERE. Not to predict revenue. To make an assumption
// falsifiable. "Purify could do $2M" is a wish; "Purify does $2M if 4% of
// practising English-speaking Orthodox install it and 6% of those pay $60 a
// year" is a claim with three numbers somebody can argue with. Every function
// below returns its inputs alongside its output for that reason, and the UI is
// required to show them.
//
// THE CHAIN, once, in order:
//
//   population
//     x englishReach      how many can read the app as it ships today
//     x practisingRate    how many actually pray, not merely identify
//     = addressable
//     x installRate       how many of those ever install
//     = installs
//     x payRate           how many installs become paying
//     = subscribers
//     x annualRevenuePerSubscriber
//     = annual revenue
//
// Each step throws away most of the previous one, which is the honest shape of
// this business and the reason the headline population figures are so
// misleading on their own.

import { MARKETS, COMPARABLE, type Communion, type Market } from "@/data/market/markets";

export type Assumptions = {
  /** Share of the addressable pool that ever installs. */
  installRate: number;
  /** Share of installs that become paying subscribers. */
  payRate: number;
  /** Blended annual revenue per paying subscriber, in whole dollars. */
  annualRevenuePerSubscriber: number;
  /** Count Oriental Orthodox populations. Off by default; different communion. */
  includeOrientalOrthodox: boolean;
  /** Count US Roman Catholics as spillover. Off by default; not the audience. */
  includeCatholicSpillover: boolean;
  /**
   * Markets whose localization is assumed shipped. A market not listed here
   * contributes only its englishReach share, which for Russia is 5%.
   */
  localizedMarketIds: string[];
};

/**
 * Three named starting points, so a conversation begins somewhere concrete.
 * None of them is a forecast. They are the corners of the argument.
 */
export const SCENARIOS: Record<"conservative" | "moderate" | "aggressive", Assumptions> = {
  conservative: {
    installRate: 0.02,
    payRate: 0.03,
    annualRevenuePerSubscriber: 40,
    includeOrientalOrthodox: false,
    includeCatholicSpillover: false,
    localizedMarketIds: [],
  },
  moderate: {
    installRate: 0.05,
    payRate: 0.06,
    annualRevenuePerSubscriber: 55,
    includeOrientalOrthodox: false,
    includeCatholicSpillover: false,
    localizedMarketIds: [],
  },
  aggressive: {
    installRate: 0.12,
    payRate: 0.1,
    annualRevenuePerSubscriber: 70,
    includeOrientalOrthodox: false,
    includeCatholicSpillover: true,
    localizedMarketIds: ["greece", "romania", "georgia", "serbia"],
  },
};

export type MarketProjection = {
  market: Market;
  /** Reach used, after localization is taken into account. */
  reachUsed: number;
  localized: boolean;
  addressable: number;
  installs: number;
  subscribers: number;
  annualRevenueUsd: number;
};

export type Projection = {
  assumptions: Assumptions;
  markets: MarketProjection[];
  totals: {
    population: number;
    addressable: number;
    installs: number;
    subscribers: number;
    annualRevenueUsd: number;
  };
  /**
   * The comparison the dashboard exists to make honestly. Purify's share of
   * ITS pool, against Hallow's share of ITS pool. The interesting story is
   * almost always that this number is larger while the revenue is smaller.
   */
  penetration: {
    purify: number;
    comparable: number;
    /** How many times deeper into its own market Purify would be. */
    ratio: number;
  };
};

const COMMUNIONS_ALWAYS: Communion[] = ["eastern-orthodox"];

function included(m: Market, a: Assumptions): boolean {
  if (COMMUNIONS_ALWAYS.includes(m.communion)) return true;
  if (m.communion === "oriental-orthodox") return a.includeOrientalOrthodox;
  if (m.communion === "roman-catholic") return a.includeCatholicSpillover;
  return false;
}

/**
 * A localized market is assumed reachable by the share that practises,
 * rather than only the share that reads English. Localization does not
 * create believers; it removes a language barrier in front of existing ones.
 */
function reachFor(m: Market, a: Assumptions): { reach: number; localized: boolean } {
  if (m.localeNeeded === null) return { reach: m.englishReach, localized: false };
  const localized = a.localizedMarketIds.includes(m.id);
  return { reach: localized ? 0.9 : m.englishReach, localized };
}

export function project(a: Assumptions, markets: Market[] = MARKETS): Projection {
  const rows: MarketProjection[] = markets
    .filter((m) => included(m, a))
    .map((m) => {
      const { reach, localized } = reachFor(m, a);
      const addressable = m.population * reach * m.practisingRate;
      const installs = addressable * a.installRate;
      const subscribers = installs * a.payRate;
      return {
        market: m,
        reachUsed: reach,
        localized,
        addressable,
        installs,
        subscribers,
        annualRevenueUsd: subscribers * a.annualRevenuePerSubscriber,
      };
    })
    .sort((x, y) => y.annualRevenueUsd - x.annualRevenueUsd);

  const sum = (f: (r: MarketProjection) => number) => rows.reduce((n, r) => n + f(r), 0);
  const addressable = sum((r) => r.addressable);
  const subscribers = sum((r) => r.subscribers);

  // Hallow's own penetration, measured the same way: paying subscribers over
  // its practising pool. Derived from the revenue range midpoint because that
  // is all that is public, which is why COMPARABLE.confidence is "low".
  //
  // Divided by HALLOW's revenue per subscriber, not Purify's. Using Purify's
  // was a real bug: it made the comparable's penetration move whenever
  // Purify's own price slider moved, so the same competitor read 14.4% in one
  // scenario and 8.2% in another. A fact about Hallow cannot depend on what
  // Purify charges.
  const comparableMid = (COMPARABLE.annualRevenueLowUsd + COMPARABLE.annualRevenueHighUsd) / 2;
  const comparableSubs = comparableMid / COMPARABLE.annualRevenuePerSubscriberUsd;
  const comparablePenetration = comparableSubs / COMPARABLE.addressablePopulation;
  const purifyPenetration = addressable > 0 ? subscribers / addressable : 0;

  return {
    assumptions: a,
    markets: rows,
    totals: {
      population: sum((r) => r.market.population),
      addressable,
      installs: sum((r) => r.installs),
      subscribers,
      annualRevenueUsd: sum((r) => r.annualRevenueUsd),
    },
    penetration: {
      purify: purifyPenetration,
      comparable: comparablePenetration,
      ratio: comparablePenetration > 0 ? purifyPenetration / comparablePenetration : 0,
    },
  };
}

/**
 * What one localization is worth, using the same engine rather than a second
 * formula. The lift is the difference between the world where it shipped and
 * the one where it did not, holding every other assumption fixed.
 */
export function localizationLift(marketId: string, a: Assumptions) {
  const without = project({ ...a, localizedMarketIds: a.localizedMarketIds.filter((id) => id !== marketId) });
  const with_ = project({ ...a, localizedMarketIds: [...new Set([...a.localizedMarketIds, marketId])] });
  return {
    marketId,
    deltaSubscribers: with_.totals.subscribers - without.totals.subscribers,
    deltaAnnualRevenueUsd: with_.totals.annualRevenueUsd - without.totals.annualRevenueUsd,
  };
}

/**
 * A growth curve from today's actual number toward the projection, so the
 * forecast chart plots against something real rather than starting at zero.
 * Deliberately linear: an S-curve here would imply a confidence about timing
 * that nothing in this model supports.
 */
export function rampToProjection(
  currentSubscribers: number,
  target: number,
  months: number,
): { month: number; subscribers: number }[] {
  const out = [];
  for (let i = 0; i <= months; i++) {
    out.push({
      month: i,
      subscribers: Math.round(currentSubscribers + ((target - currentSubscribers) * i) / months),
    });
  }
  return out;
}
