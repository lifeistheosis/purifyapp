import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { addedAtOf, dealPrice, dealWindow, type CartDealConfig } from "./cartDeals";
import { DEMAND_WINDOW_MS, type DemandCartRow } from "./cartDemand";
import { purchasable } from "./format";
import type { ShopInventoryStatus } from "./types";

/**
 * The reads behind the cart deal and the cart demand line, shared by the
 * public insights route, checkout, and the deal email so the three can never
 * disagree about a price.
 *
 * Service role throughout: shop_carts and shop_product_sourcing have no public
 * read, and none of what is read here leaves the server except the final
 * numbers (a count, a percentage, a price, an end time).
 */

export type ActiveDeal = {
  percent: number;
  unitCents: number;
  listCents: number;
  discountCents: number;
  /** Epoch ms. Checkout stops honouring the deal at this moment. */
  endsAt: number;
};

// Every product page polls the demand line. Thirty seconds of staleness in a
// count of carts is invisible; thirty queries a second is not.
const CARTS_TTL_MS = 30_000;
let cartsCache: { at: number; rows: DemandCartRow[] } | null = null;

/** Carts touched inside the demand window, cached briefly. */
export async function recentCarts(admin: SupabaseClient, now: number): Promise<DemandCartRow[]> {
  if (cartsCache && now - cartsCache.at < CARTS_TTL_MS) return cartsCache.rows;
  const { data, error } = await admin
    .from("shop_carts")
    .select("cart_token, user_id, items, updated_at")
    .gt("item_count", 0)
    .gte("updated_at", new Date(now - DEMAND_WINDOW_MS).toISOString())
    .order("updated_at", { ascending: false })
    .limit(5000);
  if (error) {
    console.warn("[shop] recent carts read failed", error.message);
    return cartsCache?.rows ?? [];
  }
  cartsCache = { at: now, rows: (data ?? []) as DemandCartRow[] };
  return cartsCache.rows;
}

type ProductRow = {
  id: string;
  slug: string;
  price_cents: number;
  status: string;
  inventory_status: ShopInventoryStatus;
  deleted_at?: string | null;
};

/**
 * Deals live right now for one cart, keyed by slug.
 *
 * Only a published, purchasable, undeleted product with a known supplier
 * cost can carry one (see lib/shop/cartDeals.ts for why the cost is
 * required). A line still waiting on its clock is not returned at all: the
 * deal is a surprise for the shopper who waited, not a sign telling every
 * shopper to wait.
 */
export async function activeDealsForCart(
  admin: SupabaseClient,
  opts: { cartToken: string | null | undefined; cfg: CartDealConfig; now: number },
): Promise<Record<string, ActiveDeal>> {
  const out: Record<string, ActiveDeal> = {};
  if (!opts.cfg.enabled || !opts.cartToken) return out;

  const { data: cart } = await admin
    .from("shop_carts")
    .select("items")
    .eq("cart_token", opts.cartToken)
    .maybeSingle();
  const items = (cart as { items?: unknown } | null)?.items;
  if (!Array.isArray(items) || items.length === 0) return out;

  const windows = new Map<string, number>();
  for (const it of items) {
    const slug = (it as { slug?: unknown } | null)?.slug;
    if (typeof slug !== "string") continue;
    const w = dealWindow(addedAtOf(items, slug), opts.cfg, opts.now);
    if (w.status === "active") windows.set(slug, w.endsAt);
  }
  if (windows.size === 0) return out;

  const { data: products } = await admin
    .from("shop_products")
    .select("*")
    .in("slug", [...windows.keys()]);
  const live = ((products ?? []) as ProductRow[]).filter(
    (p) => p.status === "published" && p.deleted_at == null && purchasable(p.inventory_status),
  );
  if (live.length === 0) return out;

  const { data: sourcing } = await admin
    .from("shop_product_sourcing")
    .select("product_id, supplier_cost_cents")
    .in(
      "product_id",
      live.map((p) => p.id),
    );
  const cost = new Map<string, number | null>();
  for (const s of (sourcing ?? []) as { product_id: string; supplier_cost_cents: number | null }[]) {
    cost.set(s.product_id, s.supplier_cost_cents);
  }

  for (const p of live) {
    const d = dealPrice(p.price_cents, opts.cfg.percent, cost.get(p.id), opts.cfg.minMarginCents);
    if (!d) continue;
    out[p.slug] = {
      percent: d.percent,
      unitCents: d.unitCents,
      listCents: p.price_cents,
      discountCents: d.discountCents,
      endsAt: windows.get(p.slug)!,
    };
  }
  return out;
}
