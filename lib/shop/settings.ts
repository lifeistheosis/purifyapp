import "server-only";

import { isTableAbsent } from "@/lib/admin/tableAbsent";
import { createAdminClient } from "@/lib/supabase/admin";

import type { CartDealConfig } from "./cartDeals";
import type { PromoConfig } from "./promotions";

/**
 * The owner's shop switches: the cart deal, the free-shipping threshold,
 * whether product pages show how many other carts hold an item, and the two
 * standing offers (lib/shop/promotions.ts): the prayer corner set's discount
 * and the multi-buy.
 *
 * One row in shop_settings (20260918_shop_growth.sql; the offers' columns are
 * 20261002_shop_promotions.sql), edited from the admin Shop tab. Read with the
 * service role because the table has no public policy; the public config
 * route passes on only what a shopper may see.
 *
 * ABSENT IS NOT BROKEN. Until a migration runs, every read answers the
 * defaults below for the columns it adds, which are "everything new is off".
 * So the code can merge ahead of the SQL and nothing changes for a shopper
 * until the columns exist.
 */

export type ShopSettings = {
  cartDeal: CartDealConfig;
  /** Orders at or over this (after deals) ship free. Null is off. */
  freeShippingThresholdCents: number | null;
  showCartDemand: boolean;
  /** Percent off an icon, a rope and a cross bought together. */
  setDiscount: { enabled: boolean; percent: number };
  /** Percent off every piece once an order holds minItems. */
  multiBuy: { enabled: boolean; minItems: number; percent: number };
};

export const DEFAULT_SHOP_SETTINGS: ShopSettings = {
  cartDeal: { enabled: false, afterDays: 3, percent: 10, windowHours: 48, minMarginCents: 100 },
  freeShippingThresholdCents: null,
  showCartDemand: true,
  setDiscount: { enabled: false, percent: 15 },
  multiBuy: { enabled: false, minItems: 3, percent: 10 },
};

export type ShopSettingsRow = {
  cart_deal_enabled?: boolean | null;
  cart_deal_after_days?: number | null;
  cart_deal_percent?: number | null;
  cart_deal_window_hours?: number | null;
  cart_deal_min_margin_cents?: number | null;
  free_shipping_threshold_cents?: number | null;
  show_cart_demand?: boolean | null;
  set_discount_enabled?: boolean | null;
  set_discount_percent?: number | null;
  multi_buy_enabled?: boolean | null;
  multi_buy_min_items?: number | null;
  multi_buy_percent?: number | null;
};

/** The columns 20261002_shop_promotions.sql adds. */
const PROMOTION_COLUMNS = [
  "set_discount_enabled",
  "set_discount_percent",
  "multi_buy_enabled",
  "multi_buy_min_items",
  "multi_buy_percent",
] as const;

/** True once the offers' columns exist on the row that was read. */
export function promotionsPresent(row: unknown): boolean {
  return typeof row === "object" && row !== null && PROMOTION_COLUMNS.every((c) => c in row);
}

/** The offers as the pricing reads them: a switched-off offer is null. */
export function promotionsOf(s: ShopSettings): PromoConfig {
  return {
    setPercent: s.setDiscount.enabled ? s.setDiscount.percent : null,
    multiBuy: s.multiBuy.enabled ? { minItems: s.multiBuy.minItems, percent: s.multiBuy.percent } : null,
  };
}

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === "number" && Number.isFinite(v) ? Math.round(v) : fallback;
  return Math.min(max, Math.max(min, n));
}

/** A row to settings, clamped to the same ranges the table's CHECKs hold. */
export function settingsFromRow(row: ShopSettingsRow | null | undefined): ShopSettings {
  if (!row) return DEFAULT_SHOP_SETTINGS;
  const d = DEFAULT_SHOP_SETTINGS;
  const threshold = row.free_shipping_threshold_cents;
  return {
    cartDeal: {
      enabled: row.cart_deal_enabled === true,
      afterDays: clampInt(row.cart_deal_after_days, 1, 60, d.cartDeal.afterDays),
      percent: clampInt(row.cart_deal_percent, 1, 50, d.cartDeal.percent),
      windowHours: clampInt(row.cart_deal_window_hours, 1, 336, d.cartDeal.windowHours),
      minMarginCents: clampInt(row.cart_deal_min_margin_cents, 0, 1_000_000, d.cartDeal.minMarginCents),
    },
    freeShippingThresholdCents:
      typeof threshold === "number" && Number.isFinite(threshold) && threshold > 0 ? Math.round(threshold) : null,
    showCartDemand: row.show_cart_demand !== false,
    setDiscount: {
      enabled: row.set_discount_enabled === true,
      percent: clampInt(row.set_discount_percent, 1, 50, d.setDiscount.percent),
    },
    multiBuy: {
      enabled: row.multi_buy_enabled === true,
      minItems: clampInt(row.multi_buy_min_items, 2, 10, d.multiBuy.minItems),
      percent: clampInt(row.multi_buy_percent, 1, 50, d.multiBuy.percent),
    },
  };
}

/**
 * Settings to the row the admin route writes. Without `promotions` the offers'
 * columns are left out, so a save before 20261002_shop_promotions.sql has run
 * still saves everything else instead of failing on a column the table does
 * not have yet.
 */
export function rowFromSettings(s: ShopSettings, opts: { promotions?: boolean } = {}): ShopSettingsRow {
  return {
    cart_deal_enabled: s.cartDeal.enabled,
    cart_deal_after_days: s.cartDeal.afterDays,
    cart_deal_percent: s.cartDeal.percent,
    cart_deal_window_hours: s.cartDeal.windowHours,
    cart_deal_min_margin_cents: s.cartDeal.minMarginCents,
    free_shipping_threshold_cents: s.freeShippingThresholdCents,
    show_cart_demand: s.showCartDemand,
    ...(opts.promotions
      ? {
          set_discount_enabled: s.setDiscount.enabled,
          set_discount_percent: s.setDiscount.percent,
          multi_buy_enabled: s.multiBuy.enabled,
          multi_buy_min_items: s.multiBuy.minItems,
          multi_buy_percent: s.multiBuy.percent,
        }
      : {}),
  };
}

// Checkout, the config route and the cart insights all read this on every
// request. Thirty seconds is short enough that a switch the owner flips is
// live before they can open the shop to look, and long enough that a busy
// minute is two reads, not two hundred.
const TTL_MS = 30_000;
type SettingsRead = {
  settings: ShopSettings;
  /** False until 20260918_shop_growth.sql has run. */
  present: boolean;
  /** False until 20261002_shop_promotions.sql has run. */
  promotionsPresent: boolean;
};
let cache: { at: number; value: SettingsRead } | null = null;

export async function readShopSettings(opts: { fresh?: boolean } = {}): Promise<SettingsRead> {
  if (!opts.fresh && cache && Date.now() - cache.at < TTL_MS) return cache.value;
  let value: SettingsRead;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from("shop_settings").select("*").eq("id", 1).maybeSingle();
    if (error) {
      if (!isTableAbsent(error)) console.warn("[shop] settings read failed", error.message);
      value = { settings: DEFAULT_SHOP_SETTINGS, present: !isTableAbsent(error), promotionsPresent: false };
    } else {
      value = {
        settings: settingsFromRow(data as ShopSettingsRow | null),
        present: true,
        promotionsPresent: promotionsPresent(data),
      };
    }
  } catch (e) {
    console.warn("[shop] settings read threw", (e as Error).message);
    value = { settings: DEFAULT_SHOP_SETTINGS, present: false, promotionsPresent: false };
  }
  cache = { at: Date.now(), value };
  return value;
}

/** Called by the admin save so the next read is the new value. */
export function forgetShopSettings(): void {
  cache = null;
}
