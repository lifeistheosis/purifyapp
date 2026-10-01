import { ICON_CATEGORIES } from "@/lib/shop/format";
import type { ShopClassification, ShopProductFull } from "@/lib/shop/types";

/**
 * The prayer corner set (the owner, 2026-09-30: "bundles, like a prayer corner
 * set (icon + rope + cross) priced just over $45 so it ships free").
 *
 * Not a product: three pieces the shop already sells, one of each kind, added
 * to the cart together. Since 2026-10-01 the three take the owner's set
 * percentage off when they are in one order ("add a slight discount to it so
 * there's even more incentive"). That price is lib/shop/promotions.ts, not
 * this file, and checkout recomputes it from the database like any other
 * (lib/shop/checkout.ts), so nothing here touches money. The card says "ships
 * free" only when the set's own price clears the threshold.
 *
 * Picked by rule from the live catalogue rather than typed in, so the set
 * follows the stock: a piece that sells out gives way to the next of its kind,
 * and with no rope or no cross in the shop there is simply no set. On a
 * product page the piece being looked at takes its own place in the set.
 */

export type SetRole = "icon" | "rope" | "cross";

const ICON_CLASSIFICATIONS: ReadonlySet<ShopClassification> = new Set([
  "printed_mounted",
  "standard_reproduction",
  "laminated",
  "wooden",
  "hand_finished_reproduction",
]);

/** Which place a piece can take in the set, if any. */
export function roleOf(p: ShopProductFull): SetRole | null {
  if (p.classification === "prayer_rope" || p.category === "prayer_ropes") return "rope";
  if (p.category === "crosses") {
    return ["textile", "apparel", "jewelry"].includes(p.classification) ? null : "cross";
  }
  if (ICON_CLASSIFICATIONS.has(p.classification) && ICON_CATEGORIES.includes(p.category)) return "icon";
  return null;
}

function buyable(p: ShopProductFull): boolean {
  return p.inventory_status === "ready_to_ship" || p.inventory_status === "special_order";
}

/** In hand first, then the best reviewed, then the most bought. */
function rank(a: ShopProductFull, b: ShopProductFull): number {
  const hand = (p: ShopProductFull) => (p.inventory_status === "ready_to_ship" ? 0 : 1);
  const stars = (p: ShopProductFull) => ((p.review_count ?? 0) > 0 ? (p.rating_total ?? 0) / (p.review_count ?? 1) : 0);
  return hand(a) - hand(b) || stars(b) - stars(a) || (b.units_sold ?? 0) - (a.units_sold ?? 0);
}

export type PrayerCornerSet = {
  icon: ShopProductFull;
  rope: ShopProductFull;
  cross: ShopProductFull;
  /** Icon, rope, cross: the order they are shown in. */
  pieces: [ShopProductFull, ShopProductFull, ShopProductFull];
  totalCents: number;
};

/**
 * The set, or null when the shop lacks a piece of any kind. `anchor`, when it
 * can take a place, takes it: the set on a rope's page is built around that
 * rope. An anchor that cannot (a flag, a beanie) gives no set at all, so a
 * product page never offers a set its own piece is not part of.
 */
export function prayerCornerSet(products: readonly ShopProductFull[], anchor?: ShopProductFull): PrayerCornerSet | null {
  const anchorRole = anchor ? roleOf(anchor) : null;
  if (anchor && (!anchorRole || !buyable(anchor))) return null;
  const pick = (role: SetRole): ShopProductFull | undefined => {
    if (anchor && anchorRole === role) return anchor;
    return products.filter((p) => buyable(p) && roleOf(p) === role).sort(rank)[0];
  };
  const icon = pick("icon");
  const rope = pick("rope");
  const cross = pick("cross");
  if (!icon || !rope || !cross) return null;
  const pieces: [ShopProductFull, ShopProductFull, ShopProductFull] = [icon, rope, cross];
  return { icon, rope, cross, pieces, totalCents: pieces.reduce((sum, p) => sum + p.price_cents, 0) };
}

/**
 * True when the set alone clears the free-shipping threshold. `priceCents` is
 * what the three are charged together, after the set's discount; without it,
 * their list total.
 */
export function setShipsFree(
  set: PrayerCornerSet,
  thresholdCents: number | null | undefined,
  priceCents: number = set.totalCents,
): boolean {
  return typeof thresholdCents === "number" && thresholdCents > 0 && priceCents >= thresholdCents;
}

/**
 * The pieces a cart still needs to hold a whole set, or null when there is
 * nothing to finish: no piece of any kind yet, a set already there, or a kind
 * the shop has nothing of.
 *
 * Built from the cart outward. A kind the cart already has is never suggested
 * again, whichever icon or rope it is, and a missing kind is filled from the
 * same store as the pieces already there, because checkout takes one store at
 * a time. `cart` is the pieces in the cart; the caller passes only the ones an
 * order can carry the set price on.
 */
export function setCompletion(
  cart: readonly ShopProductFull[],
  products: readonly ShopProductFull[],
): ShopProductFull[] | null {
  const roles: SetRole[] = ["icon", "rope", "cross"];
  const held = cart.filter((p) => roleOf(p) !== null);
  if (held.length === 0) return null;
  const have = new Set(held.map((p) => roleOf(p)));
  const missing = roles.filter((r) => !have.has(r));
  if (missing.length === 0) return null;
  const store = held[0].store_id;
  const inCart = new Set(cart.map((p) => p.slug));
  const add: ShopProductFull[] = [];
  for (const role of missing) {
    const pick = products
      .filter((p) => p.store_id === store && !inCart.has(p.slug) && buyable(p) && roleOf(p) === role)
      .sort(rank)[0];
    if (!pick) return null;
    add.push(pick);
  }
  return add;
}
