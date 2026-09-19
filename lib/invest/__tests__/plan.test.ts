import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { INVEST_MANUAL } from "../manual";
import {
  INVESTOR_PLAN,
  monthsSinceLaunch,
  paceAgainstPlan,
  planAnchors,
  planAtMonth,
  planYears,
} from "../plan";
import { DATA_SLOT } from "../payload";

// The investor page. It receives the plan injected by app/invest/route.ts and
// keeps a fallback copy for when the injection is missing; these tests hold
// that copy, and the hand-entered figures it prints, to lib/invest.
const DECK = readFileSync(path.join(process.cwd(), "app", "invest", "deck.html"), "utf8");

describe("the investor plan", () => {
  it("adds up to the targets on the page: $102K, $250K, $500K", () => {
    expect(planYears().map((y) => y.total)).toEqual([102_000, 250_000, 500_000]);
  });

  it("carries the inputs each target takes", () => {
    const [y1, , y3] = planYears();
    expect(Math.round(y1.members)).toBe(1_545);
    expect(Math.round(y1.ordersPerMonth)).toBe(47);
    expect(Math.round(y3.members)).toBe(7_545);
    expect(Math.round(y3.ordersPerMonth)).toBe(236);
    // Year three is 0.22% of the practising Orthodox reachable in English.
    expect(y3.shareOfReachable).toBeCloseTo(0.00215, 4);
  });

  it("passes through every anchor exactly", () => {
    for (const a of planAnchors()) {
      const at = planAtMonth(a.month);
      expect(at.subscriptions).toBeCloseTo(a.subscriptions, 6);
      expect(at.shop).toBeCloseTo(a.shop, 6);
    }
  });

  it("never falls between two targets", () => {
    let prev = planAtMonth(INVESTOR_PLAN.start.month).total;
    for (let m = INVESTOR_PLAN.start.month; m <= 36; m += 0.25) {
      const now = planAtMonth(m).total;
      expect(now).toBeGreaterThanOrEqual(prev - 1e-6);
      prev = now;
    }
  });

  it("counts months from launch", () => {
    expect(monthsSinceLaunch(new Date("2026-05-19T00:00:00Z"))).toBe(0);
    expect(monthsSinceLaunch(new Date("2027-05-19T12:00:00Z"))).toBeCloseTo(12, 1);
  });
});

describe("pace against the plan", () => {
  const onYearOne = new Date("2027-05-19T00:00:00Z");

  it("reads ahead, behind or on plan with a 5% band", () => {
    expect(paceAgainstPlan(102_000, onYearOne).status).toBe("on plan");
    expect(paceAgainstPlan(120_000, onYearOne).status).toBe("ahead");
    expect(paceAgainstPlan(60_000, onYearOne).status).toBe("behind");
  });

  it("names the next milestone and the monthly growth that lands on it", () => {
    const now = new Date("2026-11-19T00:00:00Z");
    const pace = paceAgainstPlan(10_000, now);
    expect(pace.next?.label).toBe("Year 1");
    expect(pace.next?.target).toBe(102_000);
    const { monthsLeft, monthlyGrowthNeeded } = pace.next!;
    // Growing at that rate for the months left reaches the target.
    expect(10_000 * Math.pow(1 + monthlyGrowthNeeded!, monthsLeft)).toBeCloseTo(102_000, 0);
  });

  it("has no rate to grow from when nothing is measured", () => {
    expect(paceAgainstPlan(0, new Date("2026-10-01T00:00:00Z")).next?.monthlyGrowthNeeded).toBeNull();
  });
});

describe("the investor page agrees with lib/invest", () => {
  it("ships exactly one empty data slot for the route to fill", () => {
    expect(DECK.split(DATA_SLOT).length - 1).toBe(1);
  });

  it("falls back to the same plan the route injects", () => {
    const block = DECK.slice(DECK.indexOf("const FALLBACK_PLAN = ["), DECK.indexOf("];", DECK.indexOf("const FALLBACK_PLAN = [")));
    const rows = [...block.matchAll(/\{ m: (\d+),[^}]*subs: (\d+), shop: (\d+) \}/g)].map((m) => ({
      month: Number(m[1]),
      subscriptions: Number(m[2]),
      shop: Number(m[3]),
    }));
    expect(rows).toEqual(planAnchors().map(({ month, subscriptions, shop }) => ({ month, subscriptions, shop })));
  });

  it("prints the deal and the hand-entered figures from lib/invest/manual.ts", () => {
    const { deal } = INVEST_MANUAL;
    expect(DECK).toContain(`$${deal.amount.toLocaleString("en-US")}`);
    expect(DECK).toContain(`>${deal.stakeUntilRepaid}%<`);
    expect(DECK).toContain(`>${deal.stakeForGood}%<`);
    expect(DECK).toContain(`>${INVEST_MANUAL.organicViewsHeadline}<`);
  });
});
