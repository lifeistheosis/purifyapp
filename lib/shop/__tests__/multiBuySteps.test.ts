import { describe, expect, it } from "vitest";

import {
  cartLadder,
  discountNote,
  multiBuyMinFor,
  multiBuyStepAt,
  multiBuyTiers,
  priceCart,
  unlocks,
  type PromoConfig,
  type PromoLine,
} from "../promotions";
import { settingsFromRow, stepsFromJson, rowFromSettings, DEFAULT_SHOP_SETTINGS } from "../settings";

// The owner's ladder, 2026-10-19: 3 pieces 20%, 5 pieces 25%, 8 pieces 30%.
const LADDER: PromoConfig = {
  setPercent: 25,
  multiBuy: { minItems: 3, percent: 20, steps: [{ minItems: 5, percent: 25 }, { minItems: 8, percent: 30 }] },
};
const piece = (slug: string, quantity = 1): PromoLine => ({ slug, quantity, listCents: 2000, role: null, eligible: true });
const ship = { thresholdCents: null };

describe("multi-buy steps (1.8)", () => {
  it("reads the steps lowest first and drops one that would not climb", () => {
    expect(
      multiBuyTiers({ minItems: 3, percent: 20, steps: [{ minItems: 8, percent: 30 }, { minItems: 5, percent: 15 }] }),
    ).toEqual([
      { minItems: 3, percent: 20 },
      { minItems: 8, percent: 30 },
    ]);
  });

  it("charges each order the highest step it has reached, never two", () => {
    expect(priceCart([piece("a", 2)], LADDER).multiPercent).toBeNull();
    expect(priceCart([piece("a", 3)], LADDER).segments[0].unitCents).toBe(1600);
    expect(priceCart([piece("a", 5)], LADDER).segments[0].unitCents).toBe(1500);
    expect(priceCart([piece("a", 9)], LADDER).segments[0]).toMatchObject({ unitCents: 1400, percent: 30 });
  });

  it("keeps the cart counting toward the next step, and says it is on at the top", () => {
    const at = (n: number) => {
      const lines = [piece("a", n)];
      return cartLadder(lines, priceCart(lines, LADDER), LADDER, ship).multiBuy;
    };
    expect(at(1)).toMatchObject({ kind: "away", need: 2, percent: 20 });
    expect(at(1)).not.toHaveProperty("current");
    expect(at(4)).toMatchObject({ kind: "away", need: 1, minItems: 5, percent: 25, current: 20 });
    expect(at(8)).toMatchObject({ kind: "on", minItems: 8, percent: 30 });
  });

  it("counts reaching a higher step as an unlock", () => {
    const l = (n: number) => {
      const lines = [piece("a", n)];
      return cartLadder(lines, priceCart(lines, LADDER), LADDER, ship);
    };
    expect(unlocks(l(4), l(5))).toBe("multi_buy");
    expect(unlocks(l(5), l(6))).toBeNull();
  });

  it("names each discount by its own step on the receipt", () => {
    expect(multiBuyStepAt(LADDER.multiBuy, 6)).toEqual({ at: { minItems: 5, percent: 25 }, next: { minItems: 8, percent: 30 } });
    expect(multiBuyMinFor(LADDER.multiBuy, 25)).toBe(5);
    expect(discountNote({ kind: "multi_buy", percent: 25, listCents: 2000 }, "usd", multiBuyMinFor(LADDER.multiBuy, 25))).toBe(
      "5 or more pieces: 25% off (was $20)",
    );
  });

  it("works with no steps exactly as before", () => {
    const one: PromoConfig = { setPercent: null, multiBuy: { minItems: 3, percent: 10 } };
    expect(priceCart([piece("a", 3)], one).segments[0].unitCents).toBe(1800);
    const lines = [piece("a", 3)];
    expect(cartLadder(lines, priceCart(lines, one), one, ship).multiBuy).toMatchObject({ kind: "on", percent: 10 });
  });
});

describe("multi-buy steps in the settings row", () => {
  it("reads at most two steps, clamped, and none when the column is absent", () => {
    expect(stepsFromJson([{ minItems: 5, percent: 25 }, { minItems: 99, percent: 90 }, { minItems: 9, percent: 31 }])).toEqual([
      { minItems: 5, percent: 25 },
      { minItems: 20, percent: 50 },
    ]);
    expect(settingsFromRow({ multi_buy_enabled: true }).multiBuy.steps).toEqual([]);
  });

  it("writes the steps only once their column exists", () => {
    const s = { ...DEFAULT_SHOP_SETTINGS, multiBuy: { ...DEFAULT_SHOP_SETTINGS.multiBuy, steps: [{ minItems: 5, percent: 25 }] } };
    expect("multi_buy_steps" in rowFromSettings(s, { promotions: true })).toBe(false);
    expect(rowFromSettings(s, { promotions: true, steps: true }).multi_buy_steps).toEqual([{ minItems: 5, percent: 25 }]);
  });
});
