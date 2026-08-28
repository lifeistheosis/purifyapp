import type { ShopInventoryStatus } from "./types";

/**
 * "Almost sold out", said only when it is true.
 *
 * ── Why this is derived and not a new status ────────────────────────────
 *
 * `shop_products.quantity_available` already exists and already carries the
 * number. Adding a fifth ShopInventoryStatus would mean a migration, and a
 * migration merged to main runs DDL against production (AGENTS.md). It would
 * also put the shop one forgotten UPDATE away from lying: a status is a second
 * copy of a fact the quantity already states, and the two would drift the first
 * time somebody sold a unit without editing the dropdown. Deriving it means the
 * badge is always exactly as true as the stock count.
 *
 * ── What it refuses to do ───────────────────────────────────────────────
 *
 * Scarcity copy is the easiest thing in a shop to fake, and a shop attached to
 * a prayer app cannot afford to. So:
 *
 *   - NULL quantity says nothing. Most of the catalogue has no count, and
 *     "Almost sold out" on an unknown quantity is an invention.
 *   - A product that is not ready to ship says nothing, whatever its count.
 *     On production today `christ-pantocrator-mounted` is out_of_stock with
 *     quantity_available = 8, and a card reading "Only 8 left" beside a
 *     Sold Out badge is worse than either alone.
 *   - Zero says nothing here. That is out of stock, which the status already
 *     covers.
 */

/** At or below this many units, a real count is worth surfacing. */
export const LOW_STOCK_THRESHOLD = 5;

export type StockUrgency = {
  level: "none" | "low" | "last";
  /** Null whenever level is "none". Never a guess. */
  label: string | null;
  /** The count the label was derived from, for tests and debugging. */
  remaining: number | null;
};

const NONE: StockUrgency = { level: "none", label: null, remaining: null };

export function stockUrgency(product: {
  inventory_status: ShopInventoryStatus;
  quantity_available?: number | null;
}): StockUrgency {
  // Only a product somebody can actually buy right now may claim scarcity.
  // special_order is made to order, so a count there means nothing to a buyer.
  if (product.inventory_status !== "ready_to_ship") return NONE;

  const qty = product.quantity_available;
  if (typeof qty !== "number" || !Number.isFinite(qty)) return NONE;
  if (qty <= 0) return NONE;
  if (qty > LOW_STOCK_THRESHOLD) return NONE;

  if (qty === 1) {
    return { level: "last", label: "Last one", remaining: 1 };
  }
  return { level: "low", label: `Only ${qty} left`, remaining: qty };
}

/** True when the card or page should show a scarcity badge at all. */
export function isAlmostSoldOut(product: {
  inventory_status: ShopInventoryStatus;
  quantity_available?: number | null;
}): boolean {
  return stockUrgency(product).level !== "none";
}
