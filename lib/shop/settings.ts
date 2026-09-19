import "server-only";

import { isTableAbsent } from "@/lib/admin/tableAbsent";
import { createAdminClient } from "@/lib/supabase/admin";

import type { CartDealConfig } from "./cartDeals";

/**
 * The owner's shop switches: the cart deal, the free-shipping threshold, and
 * whether product pages show how many other carts hold an item.
 *
 * One row in shop_settings (20260918_shop_growth.sql), edited from the admin
 * Shop tab. Read with the service role because the table has no public
 * policy; the public config route passes on only what a shopper may see.
 *
 * ABSENT IS NOT BROKEN. Until the migration runs, every read answers the
 * defaults below, which are "everything new is off". So the code can merge
 * ahead of the SQL and nothing changes for a shopper until the owner flips a
 * switch.
 */

export type ShopSettings = {
  cartDeal: CartDealConfig;
  /** Orders at or over this (after deals) ship free. Null is off. */
  freeShippingThresholdCents: number | null;
  showCartDemand: boolean;
};

export const DEFAULT_SHOP_SETTINGS: ShopSettings = {
  cartDeal: { enabled: false, afterDays: 3, percent: 10, windowHours: 48, minMarginCents: 100 },
  freeShippingThresholdCents: null,
  showCartDemand: true,
};

export type ShopSettingsRow = {
  cart_deal_enabled?: boolean | null;
  cart_deal_after_days?: number | null;
  cart_deal_percent?: number | null;
  cart_deal_window_hours?: number | null;
  cart_deal_min_margin_cents?: number | null;
  free_shipping_threshold_cents?: number | null;
  show_cart_demand?: boolean | null;
};

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
  };
}

/** Settings to the row the admin route writes. */
export function rowFromSettings(s: ShopSettings): Required<ShopSettingsRow> {
  return {
    cart_deal_enabled: s.cartDeal.enabled,
    cart_deal_after_days: s.cartDeal.afterDays,
    cart_deal_percent: s.cartDeal.percent,
    cart_deal_window_hours: s.cartDeal.windowHours,
    cart_deal_min_margin_cents: s.cartDeal.minMarginCents,
    free_shipping_threshold_cents: s.freeShippingThresholdCents,
    show_cart_demand: s.showCartDemand,
  };
}

// Checkout, the config route and the cart insights all read this on every
// request. Thirty seconds is short enough that a switch the owner flips is
// live before they can open the shop to look, and long enough that a busy
// minute is two reads, not two hundred.
const TTL_MS = 30_000;
let cache: { at: number; value: { settings: ShopSettings; present: boolean } } | null = null;

export async function readShopSettings(opts: { fresh?: boolean } = {}): Promise<{
  settings: ShopSettings;
  /** False until 20260918_shop_growth.sql has run. */
  present: boolean;
}> {
  if (!opts.fresh && cache && Date.now() - cache.at < TTL_MS) return cache.value;
  let value: { settings: ShopSettings; present: boolean };
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from("shop_settings").select("*").eq("id", 1).maybeSingle();
    if (error) {
      if (!isTableAbsent(error)) console.warn("[shop] settings read failed", error.message);
      value = { settings: DEFAULT_SHOP_SETTINGS, present: !isTableAbsent(error) };
    } else {
      value = { settings: settingsFromRow(data as ShopSettingsRow | null), present: true };
    }
  } catch (e) {
    console.warn("[shop] settings read threw", (e as Error).message);
    value = { settings: DEFAULT_SHOP_SETTINGS, present: false };
  }
  cache = { at: Date.now(), value };
  return value;
}

/** Called by the admin save so the next read is the new value. */
export function forgetShopSettings(): void {
  cache = null;
}
