// Client-side catalog reads. Thin typed wrappers over the public
// /api/shop/catalog/* routes, fetched through apiFetch so they resolve to the
// deployed API (purifyapp.net) inside the native shell and same-origin on web.
// Used by the client shop pages; the server catalog (lib/shop/catalog.ts, which
// is `server-only`) still backs those routes and generateStaticParams.

import { apiFetch } from "@/lib/api/client";
import type {
  ShopCategory,
  ShopConfig,
  ShopHomeData,
  ShopInventoryStatus,
  ShopProductDetail,
  ShopProductFull,
  ShopReviewsData,
  ShopStoreData,
  ShopStoreReviewsData,
  ShopSubjectType,
} from "@/lib/shop/types";
import {
  hasDeliveredFromStore,
  isVerifiedBuyer,
  type PurchasedOrder,
} from "@/lib/shop/reviews";
import { createClient } from "@/lib/supabase/client";

export type FetchProductsParams = {
  category?: ShopCategory;
  inventory?: ShopInventoryStatus;
  storeSlug?: string;
  subjectSlug?: string;
  subjectType?: ShopSubjectType;
  limit?: number;
  offset?: number;
};

// Tiny in-memory read cache. Catalog data changes at admin speed, so a
// short TTL makes back-navigation and tab-hopping instant without ever
// showing meaningfully stale prices. Errors and non-GET calls never cache.
const TTL_MS = 30 * 1000;
const readCache = new Map<string, { at: number; data: unknown }>();
let noStoreUntil = 0;

/** Call after any admin write that changes the public catalog (product save,
 * pause/publish, review seed/delete). Clears this cache AND makes the next
 * minute of reads bypass the browser HTTP cache, so an admin who edits and
 * then opens the shop in the same tab sees their change immediately instead
 * of a cached copy. */
export function invalidateShopCatalog() {
  readCache.clear();
  noStoreUntil = Date.now() + 60 * 1000;
}

async function getJson<T>(path: string): Promise<T> {
  const hit = readCache.get(path);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data as T;

  const res = await apiFetch(
    path,
    Date.now() < noStoreUntil ? { cache: "no-store" } : {},
  );
  if (!res.ok) {
    const err = new Error(`Request failed (${res.status})`) as Error & {
      status?: number;
    };
    err.status = res.status;
    throw err;
  }
  const data = (await res.json()) as T;
  readCache.set(path, { at: Date.now(), data });
  return data;
}

export function fetchShopHome(): Promise<ShopHomeData> {
  return getJson<ShopHomeData>("/api/shop/catalog/home");
}

export function fetchShopProducts(
  params: FetchProductsParams = {},
): Promise<ShopProductFull[]> {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  }
  const qs = q.toString();
  return getJson<{ products: ShopProductFull[] }>(
    `/api/shop/catalog/products${qs ? `?${qs}` : ""}`,
  ).then((d) => d.products);
}

export function fetchShopProduct(slug: string): Promise<ShopProductDetail> {
  return getJson<ShopProductDetail>(
    `/api/shop/catalog/product/${encodeURIComponent(slug)}`,
  );
}

/**
 * `preview` asks the API to fall back to the caller's OWN draft store when the
 * public read 404s. It is not an authorization argument: the route resolves
 * the seller session itself and refuses a slug that is not theirs, so passing
 * it for somebody else's store changes nothing.
 */
export function fetchShopStore(
  slug: string,
  opts: { preview?: boolean } = {},
): Promise<ShopStoreData> {
  const q = opts.preview ? "?preview=1" : "";
  return getJson<ShopStoreData>(
    `/api/shop/catalog/store/${encodeURIComponent(slug)}${q}`,
  );
}

export function fetchShopConfig(): Promise<ShopConfig> {
  return getJson<ShopConfig>("/api/shop/catalog/config");
}

export function fetchShopReviews(slug: string): Promise<ShopReviewsData> {
  return getJson<ShopReviewsData>(
    `/api/shop/catalog/reviews?product=${encodeURIComponent(slug)}`,
  );
}

export function fetchShopStoreReviews(
  slug: string,
): Promise<ShopStoreReviewsData> {
  return getJson<ShopStoreReviewsData>(
    `/api/shop/catalog/store-reviews?store=${encodeURIComponent(slug)}`,
  );
}

/** Submit or update the caller's review. Throws the verified-buyer rejection
 *  message when the user hasn't bought the item. */
export async function submitReview(input: {
  productId: string;
  stars: number;
  body: string | null;
  displayName?: string | null;
  location?: string | null;
  anonymous?: boolean;
}): Promise<void> {
  const res = await apiFetch("/api/shop/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "Couldn't save your review.");
  }
  // The buyer's own review must appear on the very next read.
  for (const key of readCache.keys()) {
    if (key.startsWith("/api/shop/catalog/reviews")) readCache.delete(key);
  }
}

/** Submit or update the caller's store-level review. Throws the verified-buyer
 *  rejection message when the user has no delivered order from the store. */
export async function submitStoreReview(input: {
  storeId: string;
  stars: number;
  body: string | null;
  displayName?: string | null;
  location?: string | null;
  anonymous?: boolean;
}): Promise<void> {
  const res = await apiFetch("/api/shop/store-reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "Couldn't save your review.");
  }
  for (const key of readCache.keys()) {
    if (key.startsWith("/api/shop/catalog/store-reviews")) readCache.delete(key);
  }
}

/** Has the signed-in user a PAID + DELIVERED order containing this product?
 *  Drives whether the write-review form is offered. Reads via RLS self-select
 *  (no endpoint) and applies the same verified-buyer rule the RPC enforces:
 *  the order must have arrived (fulfillment_status = 'delivered'), not just paid. */
export async function hasPurchasedProduct(productId: string): Promise<boolean> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await supabase
      .from("shop_orders")
      .select("payment_status, fulfillment_status, items:shop_order_items(product_id)")
      .eq("payment_status", "paid")
      .eq("fulfillment_status", "delivered");
    const orders: PurchasedOrder[] = (data ?? []).map((o) => ({
      payment_status: o.payment_status as string,
      fulfillment_status: o.fulfillment_status as string,
      product_ids: ((o.items ?? []) as { product_id: string | null }[]).map(
        (i) => i.product_id,
      ),
    }));
    return isVerifiedBuyer(orders, productId);
  } catch {
    return false;
  }
}

/** Has the signed-in user a PAID + DELIVERED order from this store? Drives
 *  whether the store-review form is offered. Same delivered gate the
 *  shop_submit_store_review RPC enforces server-side. */
export async function hasDeliveredOrderFromStore(
  storeId: string,
): Promise<boolean> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await supabase
      .from("shop_orders")
      .select("payment_status, fulfillment_status")
      .eq("store_id", storeId)
      .eq("payment_status", "paid")
      .eq("fulfillment_status", "delivered");
    const orders = (data ?? []).map((o) => ({
      payment_status: o.payment_status as string,
      fulfillment_status: o.fulfillment_status as string,
    }));
    return hasDeliveredFromStore(orders);
  } catch {
    return false;
  }
}
