// Calibration is where a projection stops being a wish and starts being a
// claim about this app. It is also where the most tempting lie lives: quietly
// treating a web session as an install, or US traffic as Orthodox, would make
// every number bigger and none of them truer. These pin the refusals.

import { describe, expect, it } from "vitest";
import { calibrate, calibrated } from "../actuals";
import { SCENARIOS, project } from "../projection";

const sample = {
  totalUsers: 1_400,
  paidSubscribers: 22,
  comped: 6,
  newUsers30: 180,
  visitors30: 5_200,
  reportedInstalls: 1_000,
  asOf: "2026-08-21T00:00:00.000Z",
  countries: [
    { code: "US", name: "United States", sessions: 3_100 },
    { code: "GR", name: "Greece", sessions: 420 },
    { code: "RO", name: "Romania", sessions: 260 },
    { code: "GB", name: "United Kingdom", sessions: 180 },
    { code: "DE", name: "Germany", sessions: 140 },
    { code: "RU", name: "Russia", sessions: 90 },
    { code: null, name: "Unknown", sessions: 60 },
  ],
};

describe("calibration", () => {
  it("derives the pay rate from real counts", () => {
    const c = calibrate(sample);
    expect(c.observed.payRate).toBeCloseTo(22 / 1400, 10);
  });

  it("holds US traffic out instead of calling it Orthodox", () => {
    // The single most flattering assignment available: 3,100 of 4,250
    // sessions. Splitting it needs a tradition attribute that does not exist,
    // so it is reported on its own and excluded from market shares.
    const c = calibrate(sample);
    expect(c.observed.usSessions).toBe(3_100);
    expect(c.observed.byMarket.some((m) => m.market.id === "us-orthodox")).toBe(false);
    const shares = c.observed.byMarket.reduce((n, m) => n + m.shareOfTraffic, 0);
    expect(shares).toBeCloseTo(1, 6);
  });

  it("reports countries it cannot map rather than forcing them somewhere", () => {
    const c = calibrate(sample);
    const names = c.observed.unattributed.map((u) => u.name);
    expect(names).toContain("Germany");
    expect(names).toContain("Unknown");
  });

  it("maps the diaspora countries onto one market", () => {
    const c = calibrate(sample);
    const dia = c.observed.byMarket.find((m) => m.market.id === "uk-au-ca-orthodox");
    expect(dia?.sessions30).toBe(180);
  });

  it("puts today on the same axis the projection uses", () => {
    const c = calibrate(sample);
    expect(c.observed.penetrationOfAddressable).toBeGreaterThan(0);
    // 1,400 accounts against a multi-million pool: small, and it should read
    // as small rather than rounding to something comfortable.
    expect(c.observed.penetrationOfAddressable).toBeLessThan(0.01);
  });

  it("names every input it cannot measure, with the reason", () => {
    // The list is the honest half of this file. If an entry ever disappears
    // it should be because the input became measurable, not because it got
    // quietly assumed.
    const c = calibrate(sample);
    const inputs = c.notObservable.map((n) => n.input);
    expect(inputs).toContain("Install rate");
    expect(inputs).toContain("Revenue per subscriber");
    expect(inputs).toContain("Tradition segmentation");
    for (const n of c.notObservable) expect(n.reason.length).toBeGreaterThan(40);
  });

  it("replaces only the assumption the data answers", () => {
    const c = calibrate(sample);
    const out = calibrated(SCENARIOS.moderate, c);
    expect(out.payRate).toBeCloseTo(c.observed.payRate, 10);
    // Everything else must survive untouched, or "calibrated" is a costume.
    expect(out.installRate).toBe(SCENARIOS.moderate.installRate);
    expect(out.annualRevenuePerSubscriber).toBe(SCENARIOS.moderate.annualRevenuePerSubscriber);
    expect(out.localizedMarketIds).toEqual(SCENARIOS.moderate.localizedMarketIds);
  });

  it("leaves the scenario alone when there is nothing to calibrate from", () => {
    const empty = { ...sample, totalUsers: 0, paidSubscribers: 0, countries: [] };
    expect(calibrated(SCENARIOS.moderate, calibrate(empty))).toEqual(SCENARIOS.moderate);
  });

  it("a calibrated projection is smaller than the guessed one, on this data", () => {
    // 22 of 1,400 is a 1.6% pay rate against the moderate scenario's assumed
    // 6%. Measuring instead of hoping cuts the projection by roughly four
    // times, which is exactly the correction this file exists to apply.
    const c = calibrate(sample);
    const guessed = project(SCENARIOS.moderate).totals.annualRevenueUsd;
    const measured = project(calibrated(SCENARIOS.moderate, c)).totals.annualRevenueUsd;
    expect(measured).toBeLessThan(guessed);
  });
});
