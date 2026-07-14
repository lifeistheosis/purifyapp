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
  ShopSubjectType,
} from "@/lib/shop/types";
import { isVerifiedBuyer, type PurchasedOrder } from "@/lib/shop/reviews";
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
const TTL_MS = 2 * 60 * 1000;
const readCache = new Map<string, { at: number; data: unknown }>();

async function getJson<T>(path: string): Promise<T> {
  const hit = readCache.get(path);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data as T;

  const res = await apiFetch(path);
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

export function fetchShopStore(slug: string): Promise<ShopStoreData> {
  return getJson<ShopStoreData>(
    `/api/shop/catalog/store/${encodeURIComponent(slug)}`,
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

/** Has the signed-in user a PAID order containing this product? Drives whether
 *  the write-review form is offered. Reads via RLS self-select (no endpoint)
 *  and applies the same verified-buyer rule the RPC enforces server-side. */
export async function hasPurchasedProduct(productId: string): Promise<boolean> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await supabase
      .from("shop_orders")
      .select("payment_status, items:shop_order_items(product_id)")
      .eq("payment_status", "paid");
    const orders: PurchasedOrder[] = (data ?? []).map((o) => ({
      payment_status: o.payment_status as string,
      product_ids: ((o.items ?? []) as { product_id: string | null }[]).map(
        (i) => i.product_id,
      ),
    }));
    return isVerifiedBuyer(orders, productId);
  } catch {
    return false;
  }
}
