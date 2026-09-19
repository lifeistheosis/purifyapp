// The investor plan. One set of numbers, read by two surfaces:
//
//   - purifyapp.net/invest, where an investor sees the plan and, live, where
//     Purify actually is against it;
//   - the owner dashboard's Investors tab, which shows the same plan plus what
//     the owner needs to run toward it: ahead or behind, by how much, and the
//     monthly growth the next milestone asks for.
//
// Nothing else may carry these targets. The page receives them injected by
// app/invest/route.ts and only keeps a fallback copy for when the injection is
// missing; lib/invest/__tests__/plan.test.ts fails if that copy drifts.
//
// THESE ARE TARGETS, NOT A FORECAST. The yearly figures were set by the owner
// on 2026-09-18 for the investor round. lib/owner/projection.ts is the market
// model (what the reachable pool could support); this file is the plan the
// business has committed to. Following that file's rule, every target here
// travels with its inputs: members at a yearly price, orders at an average
// value, and the share of the reachable market that implies.

/** Average days in a month, so dates and plan months convert both ways. */
const MONTH_DAYS = 365.25 / 12;
const DAY_MS = 86_400_000;

export type PlanYear = {
  year: 1 | 2 | 3;
  label: string;
  /** The day this year of the plan ends, as an ISO date. */
  ends: string;
  /** Months after launch, the plan's time axis. */
  month: number;
  /** Revenue a year from Plus and Pro at the end of this year, in dollars. */
  subscriptions: number;
  /** Revenue a year from the shop at the end of this year, in dollars. */
  shop: number;
};

export const INVESTOR_PLAN = {
  /** The first account, and month zero of the plan. */
  launch: "2026-05-19",
  /**
   * Where the plan starts: the revenue a year Purify was running at on the
   * day the plan was set (2026-09-18, four months after launch), measured the
   * way lib/invest/live.ts measures it: $44.97 a month of subscriptions times
   * twelve, and the shop's paid orders in the last 30 days times twelve.
   */
  start: { month: 4, setOn: "2026-09-18", subscriptions: 540, shop: 899 },
  /** Blended revenue a year per paying member, before store fees. */
  memberPricePerYear: 55,
  /** Average shop order, in dollars. */
  averageOrder: 30,
  /** Practising Orthodox who can use Purify in English today (data/market/markets.ts). */
  reachablePractising: 3_505_500,
  years: [
    { year: 1, label: "Year 1", ends: "2027-05-19", month: 12, subscriptions: 85_000, shop: 17_000 },
    { year: 2, label: "Year 2", ends: "2028-05-19", month: 24, subscriptions: 205_000, shop: 45_000 },
    { year: 3, label: "Year 3", ends: "2029-05-19", month: 36, subscriptions: 415_000, shop: 85_000 },
  ] as PlanYear[],
} as const;

export type PlanAnchor = {
  month: number;
  label: string;
  when: string | null;
  subscriptions: number;
  shop: number;
};

/** The points the plan's curve passes through, start first. */
export function planAnchors(): PlanAnchor[] {
  const p = INVESTOR_PLAN;
  return [
    { month: p.start.month, label: "Plan set", when: p.start.setOn, subscriptions: p.start.subscriptions, shop: p.start.shop },
    ...p.years.map((y) => ({ month: y.month, label: y.label, when: y.ends, subscriptions: y.subscriptions, shop: y.shop })),
  ];
}

export type PlanYearDetail = PlanYear & {
  total: number;
  /** Paying members the subscription target needs at the yearly price. */
  members: number;
  /** Shop orders a month the shop target needs at the average order. */
  ordersPerMonth: number;
  /** Members as a share of the practising Orthodox reachable in English. */
  shareOfReachable: number;
};

/** Each year's targets with the inputs that produce them. */
export function planYears(): PlanYearDetail[] {
  const p = INVESTOR_PLAN;
  return p.years.map((y) => {
    const members = y.subscriptions / p.memberPricePerYear;
    return {
      ...y,
      total: y.subscriptions + y.shop,
      members,
      ordersPerMonth: y.shop / p.averageOrder / 12,
      shareOfReachable: members / p.reachablePractising,
    };
  });
}

/** Months after launch for a date. */
export function monthsSinceLaunch(date: Date): number {
  return (date.getTime() - Date.parse(`${INVESTOR_PLAN.launch}T00:00:00Z`)) / (MONTH_DAYS * DAY_MS);
}

/**
 * The plan grows by compounding between its targets, the way a business
 * does. A straight-ish line would expect the same dollars every month from
 * day one, and would read "behind" for months while Purify was on course.
 *
 * The curve runs through the logarithm of each target and back. Each target
 * is entered at the NEXT year's growth rate, rather than the average of the
 * two rates either side of it: Year 1's climb is steep (about 70% a month)
 * and Year 2's is gentle (about 8%), and averaging those put a bulge after
 * Year 1 that read as growth stalling. Taking the coming year's rate bends
 * the curve into the target instead, so every year after the first is a
 * steady climb. Fritsch and Carlson's limit still applies, so it never dips.
 */
function compounding(xs: number[], ys: number[]): (x: number) => number {
  const n = xs.length;
  const logs = ys.map((y) => Math.log(y));
  const d = xs.slice(1).map((x, i) => (logs[i + 1] - logs[i]) / (x - xs[i]));
  const t = xs.map((_, i) => (i === n - 1 ? d[n - 2] : d[i]));
  for (let i = 0; i < n - 1; i++) {
    const a = t[i] / d[i];
    const b = t[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) {
      t[i] = (3 * a * d[i]) / Math.sqrt(s);
      t[i + 1] = (3 * b * d[i]) / Math.sqrt(s);
    }
  }
  return (x: number) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const u = (x - xs[i]) / h;
    const u2 = u * u;
    const u3 = u2 * u;
    return Math.exp(
      (2 * u3 - 3 * u2 + 1) * logs[i] +
        (u3 - 2 * u2 + u) * h * t[i] +
        (-2 * u3 + 3 * u2) * logs[i + 1] +
        (u3 - u2) * h * t[i + 1],
    );
  };
}

const anchors = planAnchors();
const subsCurve = compounding(anchors.map((a) => a.month), anchors.map((a) => a.subscriptions));
const shopCurve = compounding(anchors.map((a) => a.month), anchors.map((a) => a.shop));

/** What the plan says revenue a year should be at a given month after launch. */
export function planAtMonth(month: number): { subscriptions: number; shop: number; total: number } {
  const subscriptions = subsCurve(month);
  const shop = shopCurve(month);
  return { subscriptions, shop, total: subscriptions + shop };
}

export function planAt(date: Date) {
  return planAtMonth(monthsSinceLaunch(date));
}

export type Pace = {
  /** Revenue a year Purify is actually running at. */
  actual: number;
  /** Revenue a year the plan expects on this date. */
  planned: number;
  /** actual minus planned: positive is ahead. */
  gap: number;
  status: "ahead" | "on plan" | "behind";
  next: {
    label: string;
    ends: string;
    target: number;
    monthsLeft: number;
    /** Monthly growth from today's actual that lands exactly on the target. */
    monthlyGrowthNeeded: number | null;
  } | null;
};

/**
 * Where Purify stands against the plan today.
 *
 * "On plan" is within 5% either side, so a week of noise does not flip the
 * owner's headline between ahead and behind.
 */
export function paceAgainstPlan(actual: number, now: Date): Pace {
  const planned = planAt(now).total;
  const gap = actual - planned;
  const band = planned * 0.05;
  const status = gap > band ? "ahead" : gap < -band ? "behind" : "on plan";
  const month = monthsSinceLaunch(now);
  const year = planYears().find((y) => y.month > month) ?? null;
  let next: Pace["next"] = null;
  if (year) {
    const monthsLeft = year.month - month;
    next = {
      label: year.label,
      ends: year.ends,
      target: year.total,
      monthsLeft,
      monthlyGrowthNeeded:
        actual > 0 && monthsLeft > 0 ? Math.pow(year.total / actual, 1 / monthsLeft) - 1 : null,
    };
  }
  return { actual, planned, gap, status, next };
}
