/**
 * One piece to offer beside an order: in the cart before checkout (the order
 * bump) and on the thank-you page after it (the follow-up). Asked for
 * 2026-09-30 as the shop's two average-order levers.
 *
 * ── The rules it keeps ──────────────────────────────────────────────────
 *
 *  - SAME STORE. Checkout takes one store at a time (lib/shop/checkout.ts
 *    refuses a mixed cart), so an add-on from another store would turn a
 *    one-tap offer into an error at the till.
 *  - SOMETHING THAT CAN BE BOUGHT: ready to ship or made to order, priced.
 *  - SIZED TO THE ORDER. The bump is a small addition, never a second
 *    purchase in disguise: at most 40% of what is already in the cart, or
 *    fifteen dollars, whichever is more.
 *  - WHAT PEOPLE ACTUALLY BUY. Best sellers first, then the cheaper, then by
 *    slug so the same cart always gets the same offer.
 *
 * No urgency, no scarcity, no countdown. The shop's own rule on copy
 * (lib/email/doctrine.ts) holds on the page too.
 *
 * Pure.
 */

export type AddOnCandidate = {
  slug: string;
  store_id: string;
  price_cents: number;
  inventory_status: string;
  units_sold?: number | null;
};

export const BUMP_SHARE = 0.4;
export const BUMP_FLOOR_CENTS = 1500;

/** The one store every recognised cart line belongs to, or null. */
export function cartStore(candidates: AddOnCandidate[], cartSlugs: ReadonlySet<string>): string | null {
  const stores = new Set(candidates.filter((c) => cartSlugs.has(c.slug)).map((c) => c.store_id));
  return stores.size === 1 ? [...stores][0] : null;
}

/** Every piece that may be offered, best first. */
function addOnPool<T extends AddOnCandidate>(
  candidates: T[],
  opts: { storeId: string | null; exclude: ReadonlySet<string>; maxCents?: number },
): T[] {
  if (!opts.storeId) return [];
  const pool = candidates.filter(
    (c) =>
      c.store_id === opts.storeId &&
      !opts.exclude.has(c.slug) &&
      c.price_cents > 0 &&
      (opts.maxCents == null || c.price_cents <= opts.maxCents) &&
      (c.inventory_status === "ready_to_ship" || c.inventory_status === "special_order"),
  );
  pool.sort(
    (a, b) =>
      (b.units_sold ?? 0) - (a.units_sold ?? 0) || a.price_cents - b.price_cents || a.slug.localeCompare(b.slug),
  );
  return pool;
}

export function pickAddOn<T extends AddOnCandidate>(
  candidates: T[],
  opts: { storeId: string | null; exclude: ReadonlySet<string>; maxCents?: number },
): T | null {
  return addOnPool(candidates, opts)[0] ?? null;
}

function bumpOpts(candidates: AddOnCandidate[], cartSlugs: ReadonlySet<string>, subtotalCents: number) {
  return {
    storeId: cartStore(candidates, cartSlugs),
    exclude: cartSlugs,
    maxCents: Math.max(BUMP_FLOOR_CENTS, Math.round(subtotalCents * BUMP_SHARE)),
  };
}

/** The bump for a cart: same store, not already in it, sized to it. */
export function pickOrderBump<T extends AddOnCandidate>(
  candidates: T[],
  cartSlugs: ReadonlySet<string>,
  subtotalCents: number,
): T | null {
  return pickAddOn(candidates, bumpOpts(candidates, cartSlugs, subtotalCents));
}

/**
 * The bump as a tripwire (the owner, 2026-10-01: "if you add more, it's free
 * shipping, or if you add one more, it's discounted"). Among the pieces the
 * bump may offer at all, the first that would newly give the order something
 * (free shipping, the multi-buy price, a whole set) wins, so the card can say
 * what adding it does. With none, it is the ordinary bump and says nothing
 * more.
 *
 * The same size rule holds: a piece too big to be a bump is not offered
 * because it would clear a threshold. `unlockOf` prices the order with the
 * piece added (lib/shop/promotions.ts), so what the card claims is what
 * checkout charges.
 */
export function pickTripwire<T extends AddOnCandidate, U extends string>(
  candidates: T[],
  cartSlugs: ReadonlySet<string>,
  subtotalCents: number,
  unlockOf: (candidate: T) => U | null,
): { product: T; unlocks: U | null } | null {
  const pool = addOnPool(candidates, bumpOpts(candidates, cartSlugs, subtotalCents));
  for (const c of pool) {
    const u = unlockOf(c);
    if (u) return { product: c, unlocks: u };
  }
  return pool[0] ? { product: pool[0], unlocks: null } : null;
}
