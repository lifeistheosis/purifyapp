import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSellerContext } from "./seller";
import type { ShopProductFull, ShopStore } from "./types";

/**
 * A seller looking at their own storefront before it is public.
 *
 * ── The gap this closes ─────────────────────────────────────────────────
 *
 * The console tells a new seller to fill in their store page, add listings,
 * and then ask Purify to open the store. They could do all three without ever
 * seeing the result: the storefront API 404s any store that is not live, for
 * everyone including its owner, and nothing in the console previewed it. The
 * first person to see a seller's storefront was the admin deciding whether to
 * make it public.
 *
 * ── The rule ────────────────────────────────────────────────────────────
 *
 * The store id comes from the caller's OWN seller session, never from the
 * request. The slug in the URL is then checked against it. So this cannot be
 * pointed at somebody else's draft store: a seller asking to preview a slug
 * that is not theirs gets null and the route 404s exactly as before.
 *
 * The service role is used deliberately and only after that check. It is the
 * only way to read a row that shop_stores' own RLS hides, which is the whole
 * reason the preview did not already work.
 *
 * DRAFT LISTINGS ARE INCLUDED, and that is the point rather than an oversight.
 * A seller cannot publish anything until the store is live (the products route
 * refuses it), so a preview that showed published listings only would show an
 * empty shop to every seller who has not opened yet, which is all of them.
 */

export type StorePreview = {
  store: ShopStore;
  products: ShopProductFull[];
};

const PREVIEW_PRODUCT_SELECT = `
  *,
  media:shop_product_media(id, media_url, alt_text, sort_order, is_primary),
  subjects:shop_product_subjects(subject_type, subject_slug),
  store:shop_stores(slug, public_name, ownership_disclosure, status)
`;

export async function getOwnStorePreview(
  slug: string,
): Promise<StorePreview | null> {
  const ctx = await getSellerContext();
  if (ctx.state !== "seller" || !ctx.store) return null;
  // The session decides which store, and the URL only has to agree with it.
  if (ctx.store.slug !== slug) return null;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("shop_products")
      .select(PREVIEW_PRODUCT_SELECT)
      .eq("store_id", ctx.store.id)
      // Everything except what the seller has deliberately put away, newest
      // first, so a preview matches the order the storefront would use.
      .in("status", ["draft", "published"])
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) {
      console.warn("[shop] store preview products failed", error.message);
      return { store: ctx.store as ShopStore, products: [] };
    }
    const products = (data ?? []) as unknown as ShopProductFull[];
    for (const p of products) {
      p.media?.sort((a, b) =>
        a.is_primary !== b.is_primary
          ? Number(b.is_primary) - Number(a.is_primary)
          : a.sort_order - b.sort_order,
      );
    }
    return { store: ctx.store as ShopStore, products };
  } catch (e) {
    console.warn("[shop] store preview threw", (e as Error).message);
    // The store still previews. A seller checking their copy should not be
    // stopped by a failure to list what is in it.
    return { store: ctx.store as ShopStore, products: [] };
  }
}
