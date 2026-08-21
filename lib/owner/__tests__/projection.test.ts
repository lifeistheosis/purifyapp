// The projection engine is arithmetic on assumptions, which makes it the
// easiest thing in this repo to get quietly wrong and the hardest to notice:
// a wrong number here still renders, still charts, and still sounds plausible
// in a sentence. These pin the properties that make the output honest rather
// than merely present.

import { describe, expect, it } from "vitest";
import { MARKETS } from "@/data/market/markets";
import { SCENARIOS, project, localizationLift, rampToProjection } from "../projection";

describe("market dataset", () => {
  it("keeps every rate a real share", () => {
    for (const m of MARKETS) {
      expect(m.englishReach, `${m.id} englishReach`).toBeGreaterThanOrEqual(0);
      expect(m.englishReach, `${m.id} englishReach`).toBeLessThanOrEqual(1);
      expect(m.practisingRate, `${m.id} practisingRate`).toBeGreaterThanOrEqual(0);
      expect(m.practisingRate, `${m.id} practisingRate`).toBeLessThanOrEqual(1);
      expect(m.population, `${m.id} population`).toBeGreaterThan(0);
    }
  });

  it("cites a source and a year for every figure", () => {
    // A population with no provenance is a guess wearing a number's clothes,
    // and this table's whole job is to be arguable.
    for (const m of MARKETS) {
      expect(m.source.length, `${m.id} source`).toBeGreaterThan(8);
      expect(m.year, `${m.id} year`).toBeGreaterThan(2000);
    }
  });

  it("names a locale for every market that is not already English", () => {
    for (const m of MARKETS) {
      if (m.englishReach < 0.5) {
        expect(m.localeNeeded, `${m.id} needs a locale to be unlockable`).toBeTruthy();
      }
    }
  });
});

describe("projection", () => {
  it("excludes Oriental Orthodox unless explicitly asked", () => {
    // The single most flattering mistake available: Ethiopia and Egypt add
    // 45M people who are not in communion and whose books are not ours.
    const off = project(SCENARIOS.moderate);
    expect(off.markets.some((r) => r.market.communion === "oriental-orthodox")).toBe(false);

    const on = project({ ...SCENARIOS.moderate, includeOrientalOrthodox: true });
    expect(on.markets.some((r) => r.market.communion === "oriental-orthodox")).toBe(true);
    expect(on.totals.addressable).toBeGreaterThan(off.totals.addressable);
  });

  it("excludes Catholic spillover unless explicitly asked", () => {
    const off = project(SCENARIOS.moderate);
    expect(off.markets.some((r) => r.market.communion === "roman-catholic")).toBe(false);
  });

  it("never reports more addressable people than exist", () => {
    for (const s of Object.values(SCENARIOS)) {
      const p = project(s);
      expect(p.totals.addressable).toBeLessThan(p.totals.population);
      expect(p.totals.installs).toBeLessThanOrEqual(p.totals.addressable);
      expect(p.totals.subscribers).toBeLessThanOrEqual(p.totals.installs);
    }
  });

  it("orders the scenarios", () => {
    const c = project(SCENARIOS.conservative).totals.annualRevenueUsd;
    const m = project(SCENARIOS.moderate).totals.annualRevenueUsd;
    const a = project(SCENARIOS.aggressive).totals.annualRevenueUsd;
    expect(c).toBeLessThan(m);
    expect(m).toBeLessThan(a);
  });

  it("keeps Russia small until it is localized, and that is the point", () => {
    // 101M people and a 5% English reach. If this ever stops being the
    // largest single localization lift, either the data moved or the model
    // broke, and both are worth a look.
    const base = SCENARIOS.moderate;
    const russia = project(base).markets.find((r) => r.market.id === "russia");
    expect(russia?.localized).toBe(false);
    expect(russia?.reachUsed).toBeLessThan(0.1);

    const lift = localizationLift("russia", base);
    expect(lift.deltaAnnualRevenueUsd).toBeGreaterThan(0);
  });

  it("computes a localization lift from the same engine, not a second formula", () => {
    const base = { ...SCENARIOS.moderate, localizedMarketIds: [] };
    const lift = localizationLift("greece", base);
    const manual =
      project({ ...base, localizedMarketIds: ["greece"] }).totals.annualRevenueUsd -
      project(base).totals.annualRevenueUsd;
    expect(lift.deltaAnnualRevenueUsd).toBeCloseTo(manual, 6);
  });

  it("reports penetration against the comparable, not a share of its revenue", () => {
    // The brief predicted this would come out as "higher penetration in a
    // smaller pool". Built honestly, it does not: on the moderate case Purify
    // reaches about 0.3% of its addressable pool against the comparable's
    // ~10%, so it is roughly thirty times SHALLOWER, not deeper.
    //
    // That is not a modelling error, it is the answer. The comparable is a
    // category leader with years of compounding and Purify is a year old with
    // four figures of installs. The dashboard's job is to report whichever
    // direction is true on the day, so nothing here asserts a direction.
    const p = project(SCENARIOS.moderate);
    expect(p.penetration.purify).toBeGreaterThan(0);
    expect(p.penetration.comparable).toBeGreaterThan(0);
    expect(p.penetration.ratio).toBeCloseTo(
      p.penetration.purify / p.penetration.comparable,
      6,
    );
  });

  it("does not let Purify's own pricing move the comparable's penetration", () => {
    // A real bug, found by reading the printout: the comparable's share was
    // computed by dividing its revenue by PURIFY's assumed price, so the same
    // competitor read 14.4% at $40, 10.5% at $55 and 8.2% at $70. Hallow's
    // share of its own market is a fact about Hallow.
    const cheap = project({ ...SCENARIOS.moderate, annualRevenuePerSubscriber: 20 });
    const dear = project({ ...SCENARIOS.moderate, annualRevenuePerSubscriber: 140 });
    expect(cheap.penetration.comparable).toBeCloseTo(dear.penetration.comparable, 10);
    // And Purify's own side must still respond, or the fix went too far.
    expect(cheap.penetration.purify).toBeCloseTo(dear.penetration.purify, 10);
    expect(cheap.totals.annualRevenueUsd).toBeLessThan(dear.totals.annualRevenueUsd);
  });

  it("stays honest about how far above today's reality the scenarios sit", () => {
    // Purify has roughly a thousand installs. The US Orthodox pool alone is
    // ~600k addressable, so even the conservative 2% install rate implies
    // twelve thousand: an order of magnitude above where the app is now.
    //
    // Pinned because the scenarios are aspirations, and a projection that
    // quietly starts an order of magnitude above the truth is the most
    // flattering mistake this file could make.
    const conservative = project(SCENARIOS.conservative);
    const APPROX_INSTALLS_TODAY = 1_000;
    expect(conservative.totals.installs).toBeGreaterThan(APPROX_INSTALLS_TODAY * 5);
  });

  it("returns its own assumptions so a chart can never show a number without them", () => {
    const p = project(SCENARIOS.conservative);
    expect(p.assumptions).toEqual(SCENARIOS.conservative);
  });
});

describe("ramp", () => {
  it("starts at today and ends at the target", () => {
    const r = rampToProjection(120, 5_000, 24);
    expect(r[0]).toEqual({ month: 0, subscribers: 120 });
    expect(r[r.length - 1]).toEqual({ month: 24, subscribers: 5_000 });
    expect(r).toHaveLength(25);
  });

  it("does not go backwards when the target is above today", () => {
    const r = rampToProjection(100, 900, 12);
    for (let i = 1; i < r.length; i++) {
      expect(r[i].subscribers).toBeGreaterThanOrEqual(r[i - 1].subscribers);
    }
  });
});
