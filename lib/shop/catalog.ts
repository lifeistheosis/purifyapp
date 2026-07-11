import "server-only";
import { createServerClient } from "@supabase/ssr";

import type {
  ShopCategory,
  ShopInventoryStatus,
  ShopProductFull,
  ShopStore,
  ShopSubjectType,
} from "./types";

/**
 * Public catalog reads. Everything here runs with the anon-key client,
 * so RLS does the filtering: only published products and live stores can
 * ever come back, and supplier/sourcing tables are simply unreadable.
 * Nothing in this module accepts a price or inventory value from a caller.
 *
 * Deliberately COOKIE-LESS: these are public reads that never need the
 * caller's session, and the catalog is consumed from static contexts
 * (generateStaticParams, generateMetadata on SSG product/store shells)
 * where `cookies()` is unavailable — the cookie-bound server client 500s
 * an on-demand static render on the website. Placeholder fallbacks keep
 * key-less CI builds green (reads just return nothing).
 */
function createClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key",
    { cookies: { getAll: () => [], setAll: () => {} } },
  );
}

const PRODUCT_SELECT = `
  *,
  media:shop_product_media(id, media_url, alt_text, sort_order, is_primary),
  subjects:shop_product_subjects(subject_type, subject_slug),
  store:shop_stores(slug, public_name, ownership_disclosure)
`;

function orderMedia(p: ShopProductFull): ShopProductFull {
  p.media.sort((a, b) =>
    a.is_primary !== b.is_primary
      ? Number(b.is_primary) - Number(a.is_primary)
      : a.sort_order - b.sort_order,
  );
  return p;
}

// Rights gate. A listing whose primary photo still lives on a supplier's CDN
// is showing the supplier's copyrighted image, not ours; it must not appear in
// the public storefront until a real (own or licensed) photo replaces it. This
// only filters public reads — the admin console uses the service-role path and
// still sees these listings so they can be fixed. Extend the host list if a new
// supplier CDN is used.
const SUPPLIER_IMAGE_HOSTS = ["kwcdn.com"];

function hasSupplierImage(p: ShopProductFull): boolean {
  const primary = p.media[0];
  return Boolean(
    primary?.media_url &&
      SUPPLIER_IMAGE_HOSTS.some((h) => primary.media_url.includes(h)),
  );
}

export async function getStore(slug: string): Promise<ShopStore | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shop_stores")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    console.warn("[shop] getStore failed", error.message);
    return null;
  }
  return data as ShopStore | null;
}

export type ListProductsOptions = {
  category?: ShopCategory;
  inventory?: ShopInventoryStatus;
  storeSlug?: string;
  subjectType?: ShopSubjectType;
  subjectSlug?: string;
  limit?: number;
  offset?: number;
};

export async function listProducts(
  opts: ListProductsOptions = {},
): Promise<ShopProductFull[]> {
  const supabase = await createClient();
  const limit = Math.min(opts.limit ?? 24, 60);

  // Subject filtering goes through the join table first: cheap, and it
  // keeps the main query a straight indexed scan.
  let idFilter: string[] | null = null;
  if (opts.subjectSlug) {
    const { data: subjectRows, error } = await supabase
      .from("shop_product_subjects")
      .select("product_id")
      .eq("subject_slug", opts.subjectSlug)
      .eq("subject_type", opts.subjectType ?? "saint");
    if (error) {
      console.warn("[shop] subject lookup failed", error.message);
      return [];
    }
    idFilter = (subjectRows ?? []).map((r) => r.product_id);
    if (idFilter.length === 0) return [];
  }

  let query = supabase
    .from("shop_products")
    .select(PRODUCT_SELECT)
    .order("created_at", { ascending: false })
    .range(opts.offset ?? 0, (opts.offset ?? 0) + limit - 1);

  if (idFilter) query = query.in("id", idFilter);
  if (opts.category) query = query.eq("category", opts.category);
  if (opts.inventory) query = query.eq("inventory_status", opts.inventory);
  if (opts.storeSlug) {
    const store = await getStore(opts.storeSlug);
    if (!store) return [];
    query = query.eq("store_id", store.id);
  }

  const { data, error } = await query;
  if (error) {
    console.warn("[shop] listProducts failed", error.message);
    return [];
  }
  return ((data ?? []) as unknown as ShopProductFull[])
    .map(orderMedia)
    .filter((p) => !hasSupplierImage(p));
}

export async function getProduct(slug: string): Promise<ShopProductFull | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shop_products")
    .select(PRODUCT_SELECT)
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    console.warn("[shop] getProduct failed", error.message);
    return null;
  }
  if (!data) return null;
  const product = orderMedia(data as unknown as ShopProductFull);
  // Don't serve a product page for a listing still on a supplier's image.
  if (hasSupplierImage(product)) return null;
  return product;
}

/**
 * Build-time slug enumeration for the static export's generateStaticParams.
 * Returns every published product slug (respectively every live store slug) so
 * output:export can emit a shell per catalog page; the shells fetch live at
 * runtime. Fails soft to [] when the build runner has placeholder keys, so a
 * secret-less CI build still succeeds (those routes just aren't pre-rendered).
 */
export async function listPublishedProductSlugs(): Promise<string[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("shop_products")
      .select("slug")
      .eq("status", "published");
    if (error) return [];
    return (data ?? []).map((r) => r.slug as string);
  } catch {
    return [];
  }
}

export async function listLiveStoreSlugs(): Promise<string[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("shop_stores")
      .select("slug")
      .eq("status", "live");
    if (error) return [];
    return (data ?? []).map((r) => r.slug as string);
  } catch {
    return [];
  }
}

/**
 * Related icons: same primary subject first, then same category, never
 * the product itself. Small and deterministic; no recommendation
 * theatre.
 */
export async function relatedProducts(
  product: ShopProductFull,
  limit = 6,
): Promise<ShopProductFull[]> {
  const subject = product.subjects[0];
  const seen = new Set<string>([product.id]);
  const out: ShopProductFull[] = [];

  if (subject) {
    const bySubject = await listProducts({
      subjectType: subject.subject_type,
      subjectSlug: subject.subject_slug,
      limit: limit + 1,
    });
    for (const p of bySubject) {
      if (!seen.has(p.id) && out.length < limit) {
        seen.add(p.id);
        out.push(p);
      }
    }
  }
  if (out.length < limit) {
    const byCategory = await listProducts({
      category: product.category,
      limit: limit + 1 + out.length,
    });
    for (const p of byCategory) {
      if (!seen.has(p.id) && out.length < limit) {
        seen.add(p.id);
        out.push(p);
      }
    }
  }
  return out;
}
