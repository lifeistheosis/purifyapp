import { describe, expect, it } from "vitest";

import {
  BANDS,
  STRIPE_STANDARD,
  gradePrice,
  priceForMargin,
  unitEconomics,
  type FeeSchedule,
} from "../pricing";

/** A round rate, so the arithmetic in a failure message is readable. */
const FLAT: FeeSchedule = { rate: 0.1, fixedCents: 0 };

describe("unitEconomics", () => {
  it("charges the percentage and the flat fee together", () => {
    // $10.00 at 2.9% + 30c = 29c + 30c = 59c.
    const e = unitEconomics(1_000, 400);
    expect(e.feeCents).toBe(59);
    expect(e.netCents).toBe(941);
    expect(e.contributionCents).toBe(541);
  });

  it("makes the regressive fee visible", () => {
    // THE POINT OF THE MODULE. The same fee schedule takes four times the
    // share out of a $3 sale that it takes out of a $50 one, purely because
    // of the flat 30c, and a single margin number hides that entirely.
    const small = unitEconomics(300, 100);
    const large = unitEconomics(5_000, 1_667);
    expect(small.feeSharePct!).toBeGreaterThan(0.12);
    expect(large.feeSharePct!).toBeLessThan(0.04);
    expect(small.feeSharePct!).toBeGreaterThan(large.feeSharePct! * 3);
  });

  it("charges nothing on a free product", () => {
    // A processor does not take 30c from a charge that never happens.
    const e = unitEconomics(0, 100);
    expect(e.feeCents).toBe(0);
    expect(e.marginPct).toBeNull();
    expect(e.feeSharePct).toBeNull();
  });

  it("treats a missing cost as unknown, not as free", () => {
    // The most flattering possible lie: an unsourced product reporting a
    // 97% margin because nobody recorded what it cost.
    const e = unitEconomics(1_000, null);
    expect(e.costKnown).toBe(false);
    expect(unitEconomics(1_000, 0).costKnown).toBe(true);
  });

  it("reports a negative contribution rather than clamping it", () => {
    // A loss is information. Flooring it at zero would hide the one case the
    // operator most needs to see.
    const e = unitEconomics(500, 600);
    expect(e.contributionCents).toBeLessThan(0);
    expect(e.marginPct!).toBeLessThan(0);
  });

  it("rounds fees to whole cents, as a processor does", () => {
    const e = unitEconomics(999, 0);
    expect(Number.isInteger(e.feeCents)).toBe(true);
  });

  it("accepts a different fee schedule rather than assuming Stripe", () => {
    const e = unitEconomics(1_000, 0, FLAT);
    expect(e.feeCents).toBe(100);
  });

  it("has no markup multiple when the cost is unknown or zero", () => {
    expect(unitEconomics(1_000, null).markupMultiple).toBeNull();
    expect(unitEconomics(1_000, 0).markupMultiple).toBeNull();
    expect(unitEconomics(1_000, 250).markupMultiple).toBe(4);
  });
});

describe("gradePrice", () => {
  it("refuses to grade a product with no cost", () => {
    // A "strong" badge earned by having no data is worse than no badge.
    const g = gradePrice(unitEconomics(1_000, null));
    expect(g.band).toBe("unknown");
    expect(g.reason).toMatch(/no supplier cost/i);
  });

  it("calls a loss a loss", () => {
    const g = gradePrice(unitEconomics(500, 600));
    expect(g.band).toBe("loss");
  });

  it("calls it a loss when fees alone swallow the sale", () => {
    // 30c sale: the fee is round(0.87 + 30) = 31c, so it nets minus one cent
    // with nothing bought at all. No supplier is at fault, so the reason has
    // to say which of the two it is.
    //
    // This case was first written at 40c, which nets 9c and is merely thin.
    // The arithmetic in the test was wrong, not the module.
    const g = gradePrice(unitEconomics(30, 0));
    expect(g.band).toBe("loss");
    expect(g.reason).toMatch(/fees alone/i);
  });

  it("names fees as the culprit on a small thin sale", () => {
    // $2.50 with a $1.70 cost: 37c of fee, 43c left, 17%. The reason must
    // point at the fee rather than at the supplier, because at this price the
    // flat 30c is 12% of the sale and that is where the fix is.
    //
    // First written with a $1.50 cost, which comes to 25.2% and lands just
    // the healthy side of the boundary. The test was wrong, not the module.
    const g = gradePrice(unitEconomics(250, 170));
    expect(g.band).toBe("thin");
    expect(g.reason).toMatch(/fees alone are/i);
  });

  it("names the supplier when the price is large enough that fees are not the problem", () => {
    // $50 with a $40 cost: thin, but fees are only 3.5%.
    const g = gradePrice(unitEconomics(5_000, 4_000));
    expect(g.band).toBe("thin");
    expect(g.reason).toMatch(/supplier cost is most of the price/i);
  });

  it("separates healthy from strong at the stated boundary", () => {
    // Straddling BANDS.healthy, so the constant and the behaviour cannot drift
    // apart without this failing.
    const justUnder = unitEconomics(1_000, 470); // ~47%
    const wellOver = unitEconomics(1_000, 200); // ~74%
    expect(gradePrice(justUnder).band).toBe("healthy");
    expect(gradePrice(wellOver).band).toBe("strong");
    expect(justUnder.marginPct!).toBeLessThan(BANDS.healthy);
    expect(wellOver.marginPct!).toBeGreaterThan(BANDS.healthy);
  });

  it("grades a free product as ungradeable rather than as a loss", () => {
    expect(gradePrice(unitEconomics(0, 100)).band).toBe("unknown");
  });
});

describe("priceForMargin", () => {
  it("returns a price that actually achieves the target", () => {
    // The round trip that matters: price it, then measure it back.
    const price = priceForMargin(400, 0.5)!;
    const achieved = unitEconomics(price, 400).marginPct!;
    expect(achieved).toBeGreaterThanOrEqual(0.5);
  });

  it("rounds up, never down", () => {
    // Rounding down lands just under the target, which is the one direction
    // that makes the answer wrong rather than merely imprecise.
    for (const cost of [99, 250, 1_337, 4_999]) {
      const price = priceForMargin(cost, 0.4)!;
      expect(unitEconomics(price, cost).marginPct!).toBeGreaterThanOrEqual(0.4);
    }
  });

  it("says no when the target is unreachable", () => {
    // 98% margin at a 2.9% rate is arithmetically impossible. The honest
    // answer is null, not an enormous number.
    expect(priceForMargin(400, 0.98)).toBeNull();
    expect(priceForMargin(400, 1)).toBeNull();
  });

  it("still covers the flat fee at zero cost", () => {
    const price = priceForMargin(0, 0.5, STRIPE_STANDARD)!;
    expect(price).toBeGreaterThan(STRIPE_STANDARD.fixedCents);
  });

  it("asks more for a more expensive item, monotonically", () => {
    const a = priceForMargin(100, 0.5)!;
    const b = priceForMargin(1_000, 0.5)!;
    expect(b).toBeGreaterThan(a);
  });
});
