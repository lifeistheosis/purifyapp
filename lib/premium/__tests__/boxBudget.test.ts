import { describe, expect, it } from "vitest";

import {
  BOX_COGS_MAX_PCT,
  BOX_COGS_MIN_PCT,
  STORE_FEE_PCT,
  assessBoxSpend,
  boxBudget,
  monthlyEquivalentCents,
  netMonthlyCents,
} from "../boxBudget";
import { PLAN_PRICE_CENTS } from "../plans";

/**
 * The EIKON Box budget, pinned to real money.
 *
 * These are pricing decisions, so the numbers are asserted literally rather
 * than recomputed from the constants. Recomputing would make the test agree
 * with whatever the code says, including a typo, which is the one thing a
 * pricing test must not do.
 */

describe("what actually arrives", () => {
  it("takes the store's cut off a monthly Pro", () => {
    // $19.99 list, $16.99 in the bank. The panel shows the first number.
    expect(monthlyEquivalentCents("proMonthly")).toBe(1999);
    expect(netMonthlyCents("proMonthly")).toBe(1699);
  });

  it("spreads a yearly Pro across the twelve boxes it owes", () => {
    // $199.00 a year is $16.58 a month, and $14.09 after the store.
    expect(PLAN_PRICE_CENTS.proYearly).toBe(19900);
    expect(monthlyEquivalentCents("proYearly")).toBe(1658);
    expect(netMonthlyCents("proYearly")).toBe(1409);
  });

  it("does NOT treat a yearly member as worth a monthly member", () => {
    // The trap this module exists to close: budgeting a yearly member's box
    // off the $19.99 monthly price overspends on every one of their twelve.
    expect(netMonthlyCents("proYearly")).toBeLessThan(
      netMonthlyCents("proMonthly"),
    );
  });
});

describe("the band", () => {
  it("is 20% to 35% of what arrives, on the monthly plan", () => {
    const b = boxBudget("proMonthly");
    expect(b.grossCents).toBe(1999);
    expect(b.netCents).toBe(1699);
    expect(b.minCents).toBe(340); // $3.40
    expect(b.maxCents).toBe(595); // $5.95
  });

  it("is tighter on the yearly plan", () => {
    const b = boxBudget("proYearly");
    expect(b.minCents).toBe(282); // $2.82
    expect(b.maxCents).toBe(493); // $4.93
  });

  it("keeps at least 65% gross margin on the tier", () => {
    // The ceiling is the whole point. If it ever rises above 35% the tier
    // stops covering the fixed monthly cost the app carries.
    expect(BOX_COGS_MAX_PCT).toBeLessThanOrEqual(0.35);
    expect(BOX_COGS_MIN_PCT).toBeLessThan(BOX_COGS_MAX_PCT);
    const b = boxBudget("proMonthly");
    expect(b.netCents - b.maxCents).toBeGreaterThanOrEqual(
      Math.round(b.netCents * 0.65),
    );
  });

  it("halves in generosity if the small business rate is ever lost", () => {
    // Both stores charge 30% above $1M a year. This is the assertion that
    // makes that change break loudly instead of quietly overspending.
    expect(STORE_FEE_PCT.play).toBe(0.15);
    expect(STORE_FEE_PCT.appStore).toBe(0.15);
  });
});

describe("judging a spend", () => {
  it("passes a box inside the band", () => {
    const v = assessBoxSpend(500, "proMonthly"); // $5.00
    expect(v.verdict).toBe("within");
    expect(v.overageCents).toBe(0);
    expect(v.marginCents).toBe(1199); // $11.99 left of the $16.99
    expect(v.note).toContain("$5.00");
  });

  it("flags a box over the ceiling, with the overage", () => {
    const v = assessBoxSpend(900, "proMonthly"); // $9.00 all in
    expect(v.verdict).toBe("over");
    expect(v.overageCents).toBe(305); // $3.05 past $5.95
    expect(Math.round(v.shareOfNet * 100)).toBe(53);
    expect(v.note).toContain("over the $5.95 ceiling");
  });

  it("flags a box under the floor as a churn risk, not a saving", () => {
    const v = assessBoxSpend(150, "proMonthly"); // $1.50
    expect(v.verdict).toBe("under");
    expect(v.note).toContain("not a saving");
  });

  it("calls the SAME spend over on yearly when it passes on monthly", () => {
    // $5.50 is fine for a monthly member and over the ceiling for a yearly
    // one. This is the difference the plan-aware budget buys.
    expect(assessBoxSpend(550, "proMonthly").verdict).toBe("within");
    expect(assessBoxSpend(550, "proYearly").verdict).toBe("over");
  });

  it("reports a loss-making box as negative margin", () => {
    const v = assessBoxSpend(2500, "proMonthly"); // $25 box on $16.99 of income
    expect(v.verdict).toBe("over");
    expect(v.marginCents).toBeLessThan(0);
  });
});
