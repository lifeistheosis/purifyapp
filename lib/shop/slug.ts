/**
 * Product slugs, made from names and kept unique.
 *
 * Lifted from app/api/shop/seller/products/route.ts, where the seller console
 * had generated slugs from titles since it was built, while the admin form
 * asked the owner to type one by hand (docs/SHOP-AUDIT.md, step 7). Both
 * routes read this now, so a title becomes the same slug whichever door it
 * came through.
 *
 * NOT `server-only`: the pure parts are unit tested in node, and the import
 * script runs them too. The uniqueness loop takes any object with the
 * supabase-js query shape it needs, so a test can hand it a stub.
 */

/**
 * Slugs that are also static route segments beside app/(app)/shop/icons/
 * [slug]. A product slugged "detail" would be shadowed by
 * shop/icons/detail/page.tsx on the website and in the app, and the native
 * build fails on it (that page's generateStaticParams throws). Refused here
 * so nobody finds out at build time.
 */
export const RESERVED_PRODUCT_SLUGS: ReadonlySet<string> = new Set(["detail"]);

export function isReservedProductSlug(slug: string): boolean {
  return RESERVED_PRODUCT_SLUGS.has(slug);
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    // The cap can land on a hyphen; the seller route shipped that for a year.
    .replace(/-+$/g, "");
}

/** The shape of a typed slug the routes accept without generating one. */
export const SLUG_PATTERN = /^[a-z0-9-]+$/;

/**
 * Exported so a route can cast its supabase-js client to it: checking
 * SupabaseClient against this small structural shape sends tsc into
 * "excessively deep" instantiation, and the cast is the way past it.
 */
export type SlugLookup = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, value: string) => {
        maybeSingle: () => PromiseLike<{ data: { id: string } | null }>;
      };
    };
  };
};

/**
 * `base`, then `base-2`, `base-3`... until one is free. Capped so a hostile
 * title cannot spin the loop. A reserved slug counts as taken, so a product
 * named "Detail" lands on `detail-2` rather than on a route it can never own.
 *
 * `excludeId` is the product being edited: its own slug is not a collision.
 *
 * Deleted products keep their slugs (docs/DECISIONS.md: slugs of deleted
 * products are not reused), which falls out of this loop naturally because a
 * soft-deleted row is still a row.
 */
export async function uniqueSlug(
  db: SlugLookup,
  base: string,
  opts: { excludeId?: string | null; fallback?: string } = {},
): Promise<string> {
  const root = base || opts.fallback || "icon";
  let slug = root;
  for (let attempt = 2; attempt <= 40; attempt++) {
    if (!isReservedProductSlug(slug)) {
      const { data: taken } = await db
        .from("shop_products")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!taken || (opts.excludeId && taken.id === opts.excludeId)) return slug;
    }
    slug = `${root}-${attempt}`;
  }
  // Forty collisions on one name is not a catalogue, it is a loop. Time
  // breaks the tie rather than a 41st query.
  return `${root}-${Date.now().toString(36)}`;
}
