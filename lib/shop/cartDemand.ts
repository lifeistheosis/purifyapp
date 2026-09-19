/**
 * "3 other people have this in their cart", counted, never invented.
 *
 * Read from shop_carts, the server-side mirror every cart already syncs to
 * (lib/shop/cartSync.ts), guests included. Pure: rows in, counts out, so the
 * rules below are tested rather than trusted.
 *
 * WHAT COUNTS AS ONE PERSON. A signed-in shopper gets a new cart token on every
 * device, so counting tokens would count one person with a phone and a laptop
 * twice. Signed-in carts are keyed by user id, the same merge the admin's live
 * carts view makes (app/api/admin/carts/route.ts). A guest is their token.
 *
 * THE VIEWER IS NEVER IN THEIR OWN COUNT. The line says "other people", and a
 * shopper who put the thing in their own cart must not be told someone else
 * is eyeing it. Their token and their user id are both excluded.
 *
 * RECENT ONLY. A cart nobody has touched in a week is not a person thinking
 * about buying; the sync route prunes rows at thirty days, which is far too
 * long to claim as current interest.
 *
 * NO FLOOR, NO PADDING. Zero is zero and the line does not render. There is
 * deliberately no path in this file that produces a number larger than the
 * rows support: a count that can be topped up is a count nobody can trust,
 * and FTC Act section 5 treats a false activity claim as deception.
 */

export const DEMAND_WINDOW_MS = 7 * 86_400_000;

export type DemandCartRow = {
  cart_token: string;
  user_id: string | null;
  items: unknown;
  updated_at: string;
};

function slugsIn(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  const out: string[] = [];
  for (const it of items) {
    const slug = (it as { slug?: unknown } | null)?.slug;
    const qty = (it as { quantity?: unknown } | null)?.quantity;
    if (typeof slug !== "string" || !slug) continue;
    // A zero-quantity line is not in the cart, whatever the array says.
    if (typeof qty === "number" && qty < 1) continue;
    out.push(slug);
  }
  return out;
}

/**
 * Distinct other shoppers holding each slug.
 *
 * `slugs` narrows the answer to the products being asked about; every slug in
 * it gets an entry, zero included, so a caller can tell "nobody" from "not
 * asked".
 */
export function demandBySlug(
  rows: readonly DemandCartRow[],
  opts: {
    slugs: readonly string[];
    viewerToken?: string | null;
    viewerUserId?: string | null;
    now: number;
    windowMs?: number;
  },
): Record<string, number> {
  const wanted = new Set(opts.slugs);
  const since = opts.now - (opts.windowMs ?? DEMAND_WINDOW_MS);
  const holders = new Map<string, Set<string>>();
  for (const slug of wanted) holders.set(slug, new Set());

  for (const row of rows) {
    if (opts.viewerToken && row.cart_token === opts.viewerToken) continue;
    if (opts.viewerUserId && row.user_id === opts.viewerUserId) continue;
    const touched = Date.parse(row.updated_at);
    if (!Number.isFinite(touched) || touched < since) continue;
    const who = row.user_id ? `u:${row.user_id}` : `t:${row.cart_token}`;
    for (const slug of slugsIn(row.items)) {
      holders.get(slug)?.add(who);
    }
  }

  const out: Record<string, number> = {};
  for (const [slug, set] of holders) out[slug] = set.size;
  return out;
}
