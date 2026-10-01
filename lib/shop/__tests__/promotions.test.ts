import { describe, expect, it } from "vitest";

import {
  cartLadder,
  discountNote,
  NO_PROMOTIONS,
  percentOff,
  priceCart,
  unlocks,
  type PromoConfig,
  type PromoLine,
} from "../promotions";

// The live catalogue on 2026-10-01, reduced to what the pricing reads.
const line = (slug: string, listCents: number, o: Partial<PromoLine> = {}): PromoLine => ({
  slug,
  quantity: 1,
  listCents,
  role: null,
  eligible: true,
  ...o,
});
const ICON = line("vladimir", 2999, { role: "icon" });
const ROPE = line("tassel-rope", 2995, { role: "rope" });
const CROSS = line("wall-cross", 1499, { role: "cross" });
const FLAG = line("greek-flag", 2499);
const BEANIE = line("beanie", 2499);

const SET_15: PromoConfig = { setPercent: 15, multiBuy: null };
const BOTH: PromoConfig = { setPercent: 15, multiBuy: { minItems: 3, percent: 10 } };

describe("percentOff", () => {
  it("rounds to the nearest cent, as the cart deal does", () => {
    expect(percentOff(2999, 15)).toBe(2549);
    expect(percentOff(2995, 15)).toBe(2546);
    expect(percentOff(1499, 20)).toBe(1199);
  });
});

describe("priceCart: the prayer corner set", () => {
  it("charges list price with the offers off", () => {
    const p = priceCart([ICON, ROPE, CROSS], NO_PROMOTIONS);
    expect(p.itemsCents).toBe(2999 + 2995 + 1499);
    expect(p.savingsCents).toBe(0);
    expect(p.segments.every((s) => s.kind === null && s.percent === null)).toBe(true);
  });

  it("takes the set percentage off an icon, a rope and a cross together", () => {
    const p = priceCart([ICON, ROPE, CROSS], SET_15);
    expect(p.sets).toBe(1);
    expect(p.segments.map((s) => [s.slug, s.unitCents, s.kind, s.percent])).toEqual([
      ["vladimir", 2549, "set_bundle", 15],
      ["tassel-rope", 2546, "set_bundle", 15],
      ["wall-cross", 1274, "set_bundle", 15],
    ]);
    expect(p.itemsCents).toBe(6369);
    expect(p.listCents).toBe(7493);
    expect(p.savingsCents).toBe(1124);
  });

  it("at twenty percent the saving on today's set is almost exactly the cross", () => {
    const p = priceCart([ICON, ROPE, CROSS], { setPercent: 20, multiBuy: null });
    expect(p.itemsCents).toBe(2399 + 2396 + 1199);
    expect(p.savingsCents).toBe(1499);
  });

  it("is any icon, rope and cross, not only the three the set card picked", () => {
    const nicholas = line("st-nicholas", 4200, { role: "icon" });
    const p = priceCart([nicholas, ROPE, CROSS], SET_15);
    expect(p.sets).toBe(1);
    expect(p.segments[0]).toMatchObject({ slug: "st-nicholas", unitCents: 3570, kind: "set_bundle" });
  });

  it("gives nothing for two of the three", () => {
    const p = priceCart([ICON, ROPE, FLAG], SET_15);
    expect(p.sets).toBe(0);
    expect(p.savingsCents).toBe(0);
  });

  it("never counts a piece from another store, whose margin is not Purify's to spend", () => {
    const theirs = { ...CROSS, eligible: false };
    const p = priceCart([ICON, ROPE, theirs], SET_15);
    expect(p.sets).toBe(0);
    expect(p.savingsCents).toBe(0);
  });

  it("gives the set price to the dearer piece of a kind, and splits a line only where it must", () => {
    const cheapIcon = line("small-icon", 1999, { role: "icon" });
    const p = priceCart([cheapIcon, ICON, ROPE, CROSS], SET_15);
    expect(p.sets).toBe(1);
    expect(p.segments.find((s) => s.slug === "small-icon")).toMatchObject({ unitCents: 1999, kind: null });
    expect(p.segments.find((s) => s.slug === "vladimir")).toMatchObject({ unitCents: 2549, kind: "set_bundle" });

    // Two of the same icon on one line: one takes the set price, one does not.
    const two = priceCart([{ ...ICON, quantity: 2 }, ROPE, CROSS], SET_15);
    const icons = two.segments.filter((s) => s.line === 0);
    expect(icons).toEqual([
      expect.objectContaining({ quantity: 1, unitCents: 2549, kind: "set_bundle" }),
      expect.objectContaining({ quantity: 1, unitCents: 2999, kind: null }),
    ]);
    expect(two.itemsCents).toBe(2549 + 2999 + 2546 + 1274);
  });

  it("counts as many sets as the scarcest kind allows", () => {
    const p = priceCart([{ ...ICON, quantity: 2 }, { ...ROPE, quantity: 2 }, { ...CROSS, quantity: 3 }], SET_15);
    expect(p.sets).toBe(2);
    expect(p.segments.filter((s) => s.kind === "set_bundle").reduce((n, s) => n + s.quantity, 0)).toBe(6);
    expect(p.segments.find((s) => s.slug === "wall-cross" && s.kind === null)?.quantity).toBe(1);
  });
});

describe("priceCart: the multi-buy", () => {
  const MULTI: PromoConfig = { setPercent: null, multiBuy: { minItems: 3, percent: 10 } };

  it("starts at the owner's number of pieces, counted by unit", () => {
    expect(priceCart([FLAG, BEANIE], MULTI).multiBuyActive).toBe(false);
    const p = priceCart([FLAG, { ...BEANIE, quantity: 2 }], MULTI);
    expect(p.multiBuyActive).toBe(true);
    expect(p.units).toBe(3);
    expect(p.itemsCents).toBe(2249 * 3);
    expect(p.segments.every((s) => s.kind === "multi_buy" && s.percent === 10)).toBe(true);
  });

  it("counts only Purify's own pieces toward the number", () => {
    const p = priceCart([FLAG, BEANIE, { ...CROSS, eligible: false }], MULTI);
    expect(p.units).toBe(2);
    expect(p.multiBuyActive).toBe(false);
    expect(p.savingsCents).toBe(0);
  });
});

describe("priceCart: nothing stacks", () => {
  it("gives each piece its single best price: the set's on the set, the multi-buy's on the rest", () => {
    const p = priceCart([ICON, ROPE, CROSS, FLAG], BOTH);
    expect(p.segments.map((s) => [s.slug, s.unitCents, s.kind])).toEqual([
      ["vladimir", 2549, "set_bundle"],
      ["tassel-rope", 2546, "set_bundle"],
      ["wall-cross", 1274, "set_bundle"],
      ["greek-flag", 2249, "multi_buy"],
    ]);
  });

  it("lets a deeper multi-buy price the set pieces too, and says so", () => {
    const p = priceCart([ICON, ROPE, CROSS], { setPercent: 10, multiBuy: { minItems: 3, percent: 20 } });
    expect(p.sets).toBe(1);
    expect(p.segments.every((s) => s.kind === "multi_buy" && s.percent === 20)).toBe(true);
  });

  it("keeps a deeper cart deal, and on a tie names the standing offer", () => {
    const deep = priceCart([{ ...FLAG, dealUnitCents: 2000, dealPercent: 20 }, BEANIE, CROSS], BOTH);
    expect(deep.segments[0]).toMatchObject({ unitCents: 2000, kind: "cart_deal", percent: 20 });

    // 10% off 2499 is 2249 both ways.
    const tie = priceCart([{ ...FLAG, dealUnitCents: 2249, dealPercent: 10 }, BEANIE, CROSS], BOTH);
    expect(tie.segments[0]).toMatchObject({ unitCents: 2249, kind: "multi_buy" });
  });

  it("still honours a cart deal with the offers off", () => {
    const p = priceCart([{ ...FLAG, quantity: 2, dealUnitCents: 2249, dealPercent: 10 }], NO_PROMOTIONS);
    expect(p.segments).toEqual([expect.objectContaining({ quantity: 2, unitCents: 2249, kind: "cart_deal" })]);
    expect(p.savingsCents).toBe(500);
  });
});

describe("priceCart: what it refuses to believe", () => {
  it("calls nothing a discount that rounds to no saving", () => {
    const p = priceCart([line("a", 1, { role: "icon" }), line("b", 1, { role: "rope" }), line("c", 1, { role: "cross" })], SET_15);
    expect(p.savingsCents).toBe(0);
    expect(p.segments.every((s) => s.kind === null)).toBe(true);
  });

  it("ignores percentages outside 1..90 and quantities below one", () => {
    expect(priceCart([ICON, ROPE, CROSS], { setPercent: 0, multiBuy: null }).savingsCents).toBe(0);
    expect(priceCart([ICON, ROPE, CROSS], { setPercent: 95, multiBuy: null }).savingsCents).toBe(0);
    const p = priceCart([{ ...ICON, quantity: -2 }, { ...ROPE, quantity: 0 }], SET_15);
    expect(p.segments).toEqual([]);
    expect(p.itemsCents).toBe(0);
  });

  it("never prices a line below zero or from a broken number", () => {
    const p = priceCart([{ ...FLAG, listCents: Number.NaN }, { ...BEANIE, listCents: -500 }], NO_PROMOTIONS);
    expect(p.itemsCents).toBe(0);
  });
});

describe("cartLadder", () => {
  const ship = { thresholdCents: 4500 };

  it("measures free shipping after the offers, as checkout does", () => {
    const lines = [ICON, ROPE];
    const away = cartLadder(lines, priceCart(lines, NO_PROMOTIONS), NO_PROMOTIONS, { thresholdCents: 7000 });
    expect(away.shipping).toEqual({ kind: "away", thresholdCents: 7000, awayCents: 7000 - 5994, progress: 5994 / 7000 });

    const set = [ICON, ROPE, CROSS];
    // 7493 at list clears 7000; 6369 at the set price does not.
    expect(cartLadder(set, priceCart(set, SET_15), SET_15, { thresholdCents: 7000 }).shipping.kind).toBe("away");
    expect(cartLadder(set, priceCart(set, SET_15), SET_15, ship).shipping.kind).toBe("free");
  });

  it("says Pro and says nothing without a threshold", () => {
    const p = priceCart([FLAG], NO_PROMOTIONS);
    expect(cartLadder([FLAG], p, NO_PROMOTIONS, { thresholdCents: 4500, pro: true }).shipping).toEqual({ kind: "pro" });
    expect(cartLadder([FLAG], p, NO_PROMOTIONS, { thresholdCents: null }).shipping).toEqual({ kind: "off" });
  });

  it("counts up to the multi-buy, then reports it on only when some piece takes it", () => {
    const two = [FLAG, BEANIE];
    expect(cartLadder(two, priceCart(two, BOTH), BOTH, ship).multiBuy).toEqual({
      kind: "away",
      have: 2,
      need: 1,
      minItems: 3,
      percent: 10,
    });
    const three = [FLAG, BEANIE, CROSS];
    expect(cartLadder(three, priceCart(three, BOTH), BOTH, ship).multiBuy).toEqual({
      kind: "on",
      minItems: 3,
      percent: 10,
      applied: true,
    });
    // Exactly a set: the multi-buy is reached but the set's price is better.
    const set = [ICON, ROPE, CROSS];
    expect(cartLadder(set, priceCart(set, BOTH), BOTH, ship).multiBuy).toMatchObject({ kind: "on", applied: false });
  });

  it("offers no multi-buy to an order with nothing of Purify's in it", () => {
    const theirs = [{ ...FLAG, eligible: false }];
    expect(cartLadder(theirs, priceCart(theirs, BOTH), BOTH, ship).multiBuy).toEqual({ kind: "off" });
  });

  it("knows where the set stands", () => {
    const none = [FLAG];
    expect(cartLadder(none, priceCart(none, BOTH), BOTH, ship).set).toEqual({ kind: "none" });
    const part = [ICON, FLAG];
    expect(cartLadder(part, priceCart(part, BOTH), BOTH, ship).set).toEqual({
      kind: "partial",
      have: ["icon"],
      missing: ["rope", "cross"],
      percent: 15,
    });
    const whole = [ICON, ROPE, CROSS];
    expect(cartLadder(whole, priceCart(whole, BOTH), BOTH, ship).set).toEqual({ kind: "complete", sets: 1, percent: 15 });
    expect(cartLadder(whole, priceCart(whole, NO_PROMOTIONS), NO_PROMOTIONS, ship).set).toEqual({ kind: "off" });
  });
});

describe("unlocks", () => {
  const ladder = (lines: PromoLine[]) => cartLadder(lines, priceCart(lines, BOTH), BOTH, { thresholdCents: 4500 });

  it("names the most telling thing an added piece gives", () => {
    expect(unlocks(ladder([ICON, ROPE]), ladder([ICON, ROPE, CROSS]))).toBe("set");
    expect(unlocks(ladder([FLAG]), ladder([FLAG, BEANIE]))).toBe("free_shipping");
    expect(unlocks(ladder([FLAG, BEANIE]), ladder([FLAG, BEANIE, line("ring", 2999)]))).toBe("multi_buy");
    expect(unlocks(ladder([FLAG, BEANIE, CROSS]), ladder([FLAG, BEANIE, CROSS, line("ring", 2999)]))).toBeNull();
  });
});

describe("discountNote", () => {
  it("says on the Stripe page what the cart said, with the price it came off", () => {
    const seg = { listCents: 2999, percent: 15 };
    expect(discountNote({ ...seg, kind: "set_bundle" }, "usd")).toBe("Prayer corner set: 15% off (was $29.99)");
    expect(discountNote({ ...seg, kind: "multi_buy", percent: 10 }, "usd", 3)).toBe("3 or more pieces: 10% off (was $29.99)");
    expect(discountNote({ ...seg, kind: "cart_deal", percent: 10 }, "usd")).toBe("Cart deal: 10% off (was $29.99)");
    expect(discountNote({ ...seg, kind: null }, "usd")).toBeNull();
  });

  it("never carries an em dash", () => {
    for (const kind of ["set_bundle", "multi_buy", "cart_deal"] as const) {
      expect(discountNote({ kind, percent: 10, listCents: 1000 }, "usd", 3)).not.toContain("—");
    }
  });
});
