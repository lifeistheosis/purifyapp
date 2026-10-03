import { describe, expect, it } from "vitest";

import {
  DEFAULT_SHOP_SETTINGS,
  promotionsOf,
  promotionsPresent,
  rowFromSettings,
  settingsFromRow,
  type ShopSettingsRow,
} from "../settings";

const BEFORE_PROMOTIONS: ShopSettingsRow = {
  cart_deal_enabled: false,
  cart_deal_after_days: 3,
  cart_deal_percent: 10,
  cart_deal_window_hours: 48,
  cart_deal_min_margin_cents: 100,
  free_shipping_threshold_cents: 4500,
  show_cart_demand: true,
};

// What 20261002000100_shop_promotions.sql leaves on the row when it first runs.
const AFTER_PROMOTIONS: ShopSettingsRow = {
  ...BEFORE_PROMOTIONS,
  set_discount_enabled: true,
  set_discount_percent: 15,
  multi_buy_enabled: true,
  multi_buy_min_items: 3,
  multi_buy_percent: 10,
};

describe("the standing offers in shop settings", () => {
  it("reads both as off until their columns exist", () => {
    const s = settingsFromRow(BEFORE_PROMOTIONS);
    expect(s.setDiscount.enabled).toBe(false);
    expect(s.multiBuy.enabled).toBe(false);
    expect(promotionsOf(s)).toEqual({ setPercent: null, multiBuy: null });
    expect(promotionsPresent(BEFORE_PROMOTIONS)).toBe(false);
    expect(promotionsOf(DEFAULT_SHOP_SETTINGS)).toEqual({ setPercent: null, multiBuy: null });
  });

  it("reads the migration's first values as the owner asked for them", () => {
    const s = settingsFromRow(AFTER_PROMOTIONS);
    expect(promotionsPresent(AFTER_PROMOTIONS)).toBe(true);
    expect(promotionsOf(s)).toEqual({ setPercent: 15, multiBuy: { minItems: 3, percent: 10 } });
  });

  it("clamps to the same ranges the table's CHECKs hold", () => {
    const s = settingsFromRow({ ...AFTER_PROMOTIONS, set_discount_percent: 80, multi_buy_min_items: 1, multi_buy_percent: 0 });
    expect(s.setDiscount.percent).toBe(50);
    expect(s.multiBuy.minItems).toBe(2);
    expect(s.multiBuy.percent).toBe(1);
  });

  it("keeps a switched-off offer's numbers, so turning it back on restores them", () => {
    const s = settingsFromRow({ ...AFTER_PROMOTIONS, set_discount_enabled: false, set_discount_percent: 20 });
    expect(s.setDiscount).toEqual({ enabled: false, percent: 20 });
    expect(promotionsOf(s).setPercent).toBeNull();
  });

  it("writes the offers' columns only once they exist, so a save never fails on them", () => {
    const s = settingsFromRow(AFTER_PROMOTIONS);
    expect(rowFromSettings(s)).not.toHaveProperty("set_discount_enabled");
    expect(rowFromSettings(s, { promotions: true })).toMatchObject({
      set_discount_enabled: true,
      set_discount_percent: 15,
      multi_buy_enabled: true,
      multi_buy_min_items: 3,
      multi_buy_percent: 10,
      free_shipping_threshold_cents: 4500,
    });
  });
});
