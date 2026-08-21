// Where the projection meets the numbers Purify actually has.
//
// A model built only from sliders tells you what you assumed. This file's job
// is to take the figures the app really produces and use them to replace the
// assumptions that CAN be replaced, while being loud about the ones that
// cannot, because the difference between a measured input and a guessed one is
// the whole value of showing them side by side.
//
// WHAT IS GENUINELY OBSERVABLE TODAY, and it is less than it looks:
//
//   pay rate                  YES. Paying subscribers over total accounts. Real
//                             division of two real counts.
//   geographic weighting      YES, for web. analytics_sessions carries a
//                             country per session, so the markets that
//                             actually show traffic are known.
//   current penetration       YES. Total accounts over the modelled addressable
//                             pool, which puts today on the same axis the
//                             projection uses.
//
//   install rate              NO. Web sessions are not app installs, and store
//                             download counts live in Play Console and App
//                             Store Connect, not in any table here. Treating
//                             sessions as installs would inflate the one input
//                             the projection is most sensitive to.
//   revenue per subscriber    NO, and the reason is circular: MRR today is
//                             computed as subscribers x list price, so dividing
//                             it back by subscribers returns the list price and
//                             proves nothing. It becomes observable the day
//                             billing events are retained, and not before.
//   segmentation              NO. There is no tradition attribute on a profile
//                             yet, so US traffic cannot be split between
//                             Orthodox, Catholic and curious. It is reported
//                             as unattributed rather than assigned.

import { MARKETS, type Market } from "@/data/market/markets";
import type { Assumptions } from "./projection";

export type Actuals = {
  /** Every account, not just paying ones. */
  totalUsers: number;
  /** Paying only. Comped and gifted excluded, as adminStats already separates them. */
  paidSubscribers: number;
  comped: number;
  newUsers30: number;
  /** Distinct web sessions in the trailing 30 days. Not installs. */
  visitors30: number;
  countries: { code: string | null; name: string; sessions: number }[];
  /** Store installs, entered by hand: no API in this app reports them. */
  reportedInstalls: number | null;
  asOf: string;
};

/**
 * Country codes to modelled markets.
 *
 * Deliberately partial. A code that maps nowhere lands in `unattributed`
 * rather than being forced into the nearest market, because an Orthodox app
 * getting traffic from Germany is real information and pretending Germany is
 * part of "UK, Canada, Australia diaspora" is not.
 */
const COUNTRY_TO_MARKET: Record<string, string> = {
  GR: "greece",
  RO: "romania",
  RU: "russia",
  UA: "ukraine",
  RS: "serbia",
  BG: "bulgaria",
  GE: "georgia",
  LB: "levant",
  SY: "levant",
  JO: "levant",
  PS: "levant",
  ET: "ethiopia",
  EG: "egypt",
  GB: "uk-au-ca-orthodox",
  CA: "uk-au-ca-orthodox",
  AU: "uk-au-ca-orthodox",
  NZ: "uk-au-ca-orthodox",
  IE: "uk-au-ca-orthodox",
};

/**
 * The United States is deliberately absent from that map.
 *
 * US traffic could be Orthodox, Roman Catholic, or someone who found a saint
 * through TikTok and has no tradition at all. Those are three different
 * markets with three different values, and nothing in the data distinguishes
 * them until the segmentation attribute exists. Assigning all of it to
 * us-orthodox would silently inflate the market Purify most wants to believe
 * in, so it is held out and reported on its own.
 */
export const US_IS_UNSPLIT_UNTIL_SEGMENTATION = true;

export type MarketObservation = {
  market: Market;
  sessions30: number;
  /** Share of all attributable sessions. */
  shareOfTraffic: number;
};

export type Calibration = {
  actuals: Actuals;
  observed: {
    /** Paying subscribers over accounts. Real, and usually sobering. */
    payRate: number;
    /** Accounts over the modelled Eastern Orthodox addressable pool. */
    penetrationOfAddressable: number;
    /** Traffic that maps to a modelled market. */
    byMarket: MarketObservation[];
    /** US sessions, held separate until a tradition attribute exists. */
    usSessions: number;
    /** Everything else, by country, largest first. */
    unattributed: { code: string | null; name: string; sessions: number }[];
  };
  /** Inputs the model still has to assume, and why each one resists measurement. */
  notObservable: { input: string; reason: string }[];
};

export function calibrate(actuals: Actuals, markets: Market[] = MARKETS): Calibration {
  const byId = new Map(markets.map((m) => [m.id, m]));
  const sessionsByMarket = new Map<string, number>();
  let usSessions = 0;
  const unattributed: { code: string | null; name: string; sessions: number }[] = [];

  for (const c of actuals.countries) {
    const code = (c.code ?? "").toUpperCase();
    if (code === "US") {
      usSessions += c.sessions;
      continue;
    }
    const id = COUNTRY_TO_MARKET[code];
    if (id && byId.has(id)) {
      sessionsByMarket.set(id, (sessionsByMarket.get(id) ?? 0) + c.sessions);
    } else {
      unattributed.push(c);
    }
  }

  const attributable = [...sessionsByMarket.values()].reduce((a, b) => a + b, 0);
  const byMarket: MarketObservation[] = [...sessionsByMarket.entries()]
    .map(([id, sessions30]) => ({
      market: byId.get(id)!,
      sessions30,
      shareOfTraffic: attributable > 0 ? sessions30 / attributable : 0,
    }))
    .sort((a, b) => b.sessions30 - a.sessions30);

  // The pool today's accounts are measured against: Eastern Orthodox only,
  // after the same reach and practising haircuts the projection applies.
  const addressable = markets
    .filter((m) => m.communion === "eastern-orthodox")
    .reduce((n, m) => n + m.population * m.englishReach * m.practisingRate, 0);

  return {
    actuals,
    observed: {
      payRate: actuals.totalUsers > 0 ? actuals.paidSubscribers / actuals.totalUsers : 0,
      penetrationOfAddressable: addressable > 0 ? actuals.totalUsers / addressable : 0,
      byMarket,
      usSessions,
      unattributed: unattributed.sort((a, b) => b.sessions - a.sessions),
    },
    notObservable: [
      {
        input: "Install rate",
        reason:
          "Web sessions are not app installs, and download counts live in Play Console and App Store Connect rather than in any table here. Enter reportedInstalls by hand to anchor it.",
      },
      {
        input: "Revenue per subscriber",
        reason:
          "MRR is currently subscribers multiplied by list price, so dividing it back by subscribers returns the list price. It becomes measurable once billing events are retained.",
      },
      {
        input: "Tradition segmentation",
        reason:
          "No tradition attribute exists on a profile, so US traffic cannot be split between Orthodox, Catholic and curious. It is held out rather than assigned.",
      },
    ],
  };
}

/**
 * Fold what was measured into a scenario, leaving the rest alone.
 *
 * Only `payRate` is replaced, because it is the only assumption in the set
 * that the data actually answers. Returning a scenario that looked calibrated
 * while three of its four inputs were still guesses would be worse than not
 * offering this at all.
 */
export function calibrated(base: Assumptions, c: Calibration): Assumptions {
  if (c.actuals.totalUsers <= 0) return base;
  return { ...base, payRate: c.observed.payRate };
}
