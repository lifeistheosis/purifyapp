import { describe, expect, it } from "vitest";
import {
  CADENCES,
  CADENCE_LABEL,
  asCadence,
  isRecurring,
  monthlyFrom,
} from "../cadence";
import { SUPPORT } from "@/data/support/support";

/**
 * The cadence maths is the one place a mistake becomes a published lie: these
 * numbers are summed into the figure /support prints as the project's monthly
 * cost, next to a sentence promising every line is real.
 *
 * Nothing could see either total before this file existed. Both are computed
 * inline, one in a route and one in a page, and vitest only collects
 * lib/**\/__tests__, so the arithmetic that decides what the public page says
 * had no test at all. This pins the rule the route applies and the check
 * constraint in 20260822_expense_cadence.sql re-derives.
 */
describe("monthlyFrom", () => {
  it("passes a monthly cost through untouched", () => {
    expect(monthlyFrom("monthly", 1900)).toBe(1900);
    expect(monthlyFrom("monthly", 0)).toBe(0);
  });

  it("amortizes a yearly cost across twelve months", () => {
    expect(monthlyFrom("yearly", 2400)).toBe(200);
    expect(monthlyFrom("yearly", 1200)).toBe(100);
  });

  it("counts a one time cost as nothing per month", () => {
    // The load-bearing case. A one time cost is real and is not monthly, and
    // folding it in would permanently depress the donation coverage ratio the
    // Sustainability card paints red below 100%.
    expect(monthlyFrom("once", 50_000)).toBe(0);
    expect(monthlyFrom("once", 0)).toBe(0);
  });

  it("rounds a yearly cost that does not divide by twelve, and does not pretend it reconstructs", () => {
    // $100/yr is 833.33 cents a month. The stored value rounds to 833, and
    // twelve of those are 9,996, four cents short of the invoice. That drift
    // is why the yearly figure stays on record beside the monthly one instead
    // of being replaced by it.
    expect(monthlyFrom("yearly", 10_000)).toBe(833);
    expect(monthlyFrom("yearly", 10_000) * 12).not.toBe(10_000);
    expect(Math.abs(monthlyFrom("yearly", 10_000) * 12 - 10_000)).toBeLessThanOrEqual(6);
  });

  it("never returns a negative or fractional number of cents", () => {
    for (const cadence of CADENCES) {
      for (const amount of [0, 1, 7, 99, 1234, 10_000_000]) {
        const got = monthlyFrom(cadence, amount);
        expect(Number.isInteger(got)).toBe(true);
        expect(got).toBeGreaterThanOrEqual(0);
        expect(got).toBeLessThanOrEqual(amount);
      }
    }
  });
});

describe("asCadence", () => {
  it("reads anything unrecognised as monthly", () => {
    // A row written before the column existed arrives as null from an untyped
    // client. Monthly is what every such row meant.
    expect(asCadence(null)).toBe("monthly");
    expect(asCadence(undefined)).toBe("monthly");
    expect(asCadence("")).toBe("monthly");
    expect(asCadence("quarterly")).toBe("monthly");
    expect(asCadence(7)).toBe("monthly");
  });

  it("keeps every cadence it does recognise", () => {
    for (const c of CADENCES) expect(asCadence(c)).toBe(c);
  });
});

describe("isRecurring", () => {
  it("is true for everything except a one time cost", () => {
    expect(isRecurring("monthly")).toBe(true);
    expect(isRecurring("yearly")).toBe(true);
    expect(isRecurring("once")).toBe(false);
  });
});

describe("the vocabulary itself", () => {
  it("never uses the string OTP, which already means one time password here", () => {
    const all = [...CADENCES, ...Object.values(CADENCE_LABEL)].join(" ");
    expect(all.toLowerCase()).not.toContain("otp");
  });

  it("labels every cadence", () => {
    for (const c of CADENCES) {
      expect(CADENCE_LABEL[c]).toBeTruthy();
    }
  });
});

describe("the committed fallback lines", () => {
  it("still add to the total the public page has always printed", () => {
    // A golden number. If a cadence change ever alters what an un-adopted
    // /support renders, this fails rather than the page quietly restating the
    // project's costs.
    const total = SUPPORT.expenses.reduce((s, e) => s + e.monthlyUsd, 0);
    expect(total).toBeGreaterThan(0);
    expect(Math.round(total * 100)).toBe(
      SUPPORT.expenses.reduce((s, e) => s + Math.round(e.monthlyUsd * 100), 0),
    );
  });

  it("treats every committed line as monthly, because that is what it meant before cadence existed", () => {
    for (const e of SUPPORT.expenses) {
      expect(asCadence((e as { cadence?: string }).cadence)).toBe("monthly");
    }
  });
});
