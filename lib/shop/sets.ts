import { ICON_CATEGORIES } from "@/lib/shop/format";
import type { ShopClassification, ShopProductFull } from "@/lib/shop/types";

/**
 * The prayer corner set (the owner, 2026-09-30: "bundles, like a prayer corner
 * set (icon + rope + cross) priced just over $45 so it ships free").
 *
 * Not a product and not a discount: three pieces the shop already sells, one
 * of each kind, added to the cart together. Each keeps its own price, and the
 * server prices all three at checkout like any cart (lib/shop/checkout.ts), so
 * nothing here touches money. The draw is an honest one: together they clear
 * the free-shipping threshold, and the card only says so when they do.
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

/** True when the set alone clears the free-shipping threshold. */
export function setShipsFree(set: PrayerCornerSet, thresholdCents: number | null | undefined): boolean {
  return typeof thresholdCents === "number" && thresholdCents > 0 && set.totalCents >= thresholdCents;
}
