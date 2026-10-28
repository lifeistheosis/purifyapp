// The shop home's featured icon and what is new (round 11 of the 1.8 designs,
// the owner's pick B, locked 2026-10-27: "one featured icon, Shop by saint,
// then what is new").
//
// Both are picked by rule from the live catalogue, never by hand, so they
// follow the stock the way the prayer corner set does (lib/shop/sets.ts).
// Nothing here touches money: the cards show the catalogue's own price and
// checkout re-prices every piece on the server (lib/shop/checkout.ts).

import { roleOf } from "@/lib/shop/sets";
import type { ShopProductFull } from "@/lib/shop/types";

/** In hand, then made to order. Nothing coming or gone is featured. */
const BUYABLE = { ready_to_ship: 0, special_order: 1 } as const;

function buyableRank(p: ShopProductFull): number | null {
  return p.inventory_status === "ready_to_ship" || p.inventory_status === "special_order"
    ? BUYABLE[p.inventory_status]
    : null;
}

/** Carried by the catalogue's `select *` (20260718000200_product_views.sql). */
function views(p: ShopProductFull): number {
  return (p as { view_count?: number | null }).view_count ?? 0;
}

/** Milliseconds since the epoch, or 0 for a date that does not read. */
function addedAt(p: ShopProductFull): number {
  const at = Date.parse(p.created_at);
  return Number.isNaN(at) ? 0 : at;
}

/**
 * The featured icon, by one rule: an icon (lib/shop/sets.ts `roleOf`: an icon
 * made in an icon's way, of Christ, the Theotokos, a saint or a feast) with a
 * photograph, that can be bought now. In hand first, then the one bought the
 * most, then the one looked at the most, then the newest. Null when the shop
 * has no such icon; the card then stands without one.
 */
export function featuredIcon(products: readonly ShopProductFull[]): ShopProductFull | null {
  const candidates = products.filter(
    (p) => roleOf(p) === "icon" && p.media.length > 0 && buyableRank(p) !== null,
  );
  if (candidates.length === 0) return null;
  return [...candidates].sort(
    (a, b) =>
      (buyableRank(a) ?? 9) - (buyableRank(b) ?? 9) ||
      (b.units_sold ?? 0) - (a.units_sold ?? 0) ||
      views(b) - views(a) ||
      addedAt(b) - addedAt(a) ||
      a.slug.localeCompare(b.slug),
  )[0];
}

/**
 * What is new: the newest pieces by the day they were added, none sold out,
 * none the page already shows (`shown`, the featured icon). Newest first;
 * pieces added at the same moment keep the catalogue's order.
 */
export function newIn(
  products: readonly ShopProductFull[],
  count: number,
  shown: Iterable<string> = [],
): ShopProductFull[] {
  const skip = new Set(shown);
  return products
    .filter((p) => p.inventory_status !== "out_of_stock" && !skip.has(p.slug))
    .sort((a, b) => addedAt(b) - addedAt(a))
    .slice(0, Math.max(0, count));
}
