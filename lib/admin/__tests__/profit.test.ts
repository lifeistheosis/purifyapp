import { describe, expect, it } from "vitest";

import { membersToBreakEven, monthlyProfit } from "../profit";

/**
 * Pinned to the real books on 2026-08-28, so the figures below are what Purify
 * actually looked like the day this was written:
 *
 *   income   $19.98 shop (one paid order), $0 donations,
 *            $29.97 subscriptions at list (2 Plus at $4.99, 1 Pro at $19.99),
 *            all three sold through Google Play
 *   costs    $171 a month: Developers $100, Render $30, GitHub $12,
 *            Bible API $29. The last is marked hidden on /support, which is a
 *            publishing choice and not a discount.
 */
const AUGUST = {
  shopNetCents: 1998,
  donationsCents: 0,
  subsGrossCents: 2997,
  storeFeePct: 0.15,
  fixedCostsCents: 17100,
  boxCostsCents: 0,
};

describe("the month as it really stands", () => {
  const p = monthlyProfit(AUGUST);

  it("takes the store's cut before calling it revenue", () => {
    expect(p.subsNetCents).toBe(2547); // $25.47, not the $29.97 on the panel
  });

  it("loses money", () => {
    expect(p.revenueCents).toBe(4545); // $45.45
    expect(p.costsCents).toBe(17100); // $171.00
    expect(p.profitCents).toBe(-12555); // -$125.55
    expect(p.profitCents).toBeLessThan(0);
  });

  it("says how far from break even", () => {
    expect(p.breakEvenGapCents).toBe(12555);
    // Net per member: Pro $16.99, Plus $4.24.
    expect(membersToBreakEven(p.breakEvenGapCents, 1699)).toBe(8);
    expect(membersToBreakEven(p.breakEvenGapCents, 424)).toBe(30);
  });

  it("is labelled estimated, because subscription income is", () => {
    // No billed amount is stored anywhere: the RevenueCat webhook overwrites a
    // single row and discards the event. Any total built on it is an estimate
    // and must not be printed as though it were measured.
    expect(p.basis).toBe("estimated");
  });
});

describe("the box is a real cost", () => {
  it("moves the month when boxes are posted", () => {
    // One Pro member, one $5.95 box at the ceiling.
    const withBox = monthlyProfit({ ...AUGUST, boxCostsCents: 595 });
    expect(withBox.costsCents).toBe(17695);
    expect(withBox.profitCents).toBe(-13150);
  });

  it("shows what a year of overspending costs", () => {
    // $9 boxes instead of the $5.95 ceiling, twelve months, one member.
    const over = monthlyProfit({ ...AUGUST, boxCostsCents: 900 });
    const atCeiling = monthlyProfit({ ...AUGUST, boxCostsCents: 595 });
    const yearly = (atCeiling.profitCents - over.profitCents) * 12;
    expect(yearly).toBe(3660); // $36.60 a year, on ONE member
  });
});

describe("edges", () => {
  it("reports realized when nothing is estimated", () => {
    const p = monthlyProfit({ ...AUGUST, subsGrossCents: 0 });
    expect(p.basis).toBe("realized");
  });

  it("has no margin to report with no revenue", () => {
    const p = monthlyProfit({
      shopNetCents: 0,
      donationsCents: 0,
      subsGrossCents: 0,
      storeFeePct: 0.15,
      fixedCostsCents: 17100,
      boxCostsCents: 0,
    });
    expect(p.margin).toBeNull();
    expect(p.profitCents).toBe(-17100);
  });

  it("reports no gap once the month clears", () => {
    const p = monthlyProfit({ ...AUGUST, subsGrossCents: 30000 });
    expect(p.profitCents).toBeGreaterThan(0);
    expect(p.breakEvenGapCents).toBe(0);
    expect(membersToBreakEven(p.breakEvenGapCents, 1699)).toBe(0);
  });

  it("never returns a fractional member", () => {
    expect(membersToBreakEven(1, 1699)).toBe(1);
    expect(membersToBreakEven(1700, 1699)).toBe(2);
  });
});

describe("donations are carried, never counted", () => {
  // The owner's donation figure is typed in from memory, not measured: the BMC
  // cron that was meant to fill donations_monthly needs CRON_SECRET and a BMC
  // key, neither of which is set, and the owner has said the number currently
  // there is a placeholder. A recalled number must not decide whether the
  // month made a profit.
  //
  // Every case here passed BEFORE donations were removed from revenueCents,
  // because nothing asserted where they went. That is why they are here now.

  it("does not put donations into revenue", () => {
    const without = monthlyProfit({ ...AUGUST, donationsCents: 0 });
    const with50 = monthlyProfit({ ...AUGUST, donationsCents: 5_000 });
    expect(with50.revenueCents).toBe(without.revenueCents);
  });

  it("does not let donations move profit, margin or the break-even gap", () => {
    const without = monthlyProfit({ ...AUGUST, donationsCents: 0 });
    const withLots = monthlyProfit({ ...AUGUST, donationsCents: 1_000_000 });
    expect(withLots.profitCents).toBe(without.profitCents);
    expect(withLots.margin).toBe(without.margin);
    expect(withLots.breakEvenGapCents).toBe(without.breakEvenGapCents);
  });

  it("still reports the figure, so the panel can show it", () => {
    // Excluded from the totals is not the same as thrown away. The number is
    // worth displaying, labelled, and this is what lets the card do that.
    expect(monthlyProfit({ ...AUGUST, donationsCents: 2_499 }).donationsCents).toBe(
      2_499,
    );
  });

  it("cannot rescue a loss-making month on paper", () => {
    // The failure this prevents, stated as a scenario: costs above income, a
    // remembered donation figure large enough to cover the gap, and a panel
    // that would have reported a profitable month on the strength of it.
    const loss = monthlyProfit({
      ...AUGUST,
      shopNetCents: 1_000,
      subsGrossCents: 0,
      fixedCostsCents: 50_000,
      boxCostsCents: 0,
      donationsCents: 500_000,
    });
    expect(loss.profitCents).toBeLessThan(0);
    expect(loss.breakEvenGapCents).toBeGreaterThan(0);
  });
});
