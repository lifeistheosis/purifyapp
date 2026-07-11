import type {
  ShopBudgetBand,
  ShopCategory,
  ShopClassification,
  ShopInventoryStatus,
} from "./types";

/** "$49.00" — whole-dollar prices drop the cents ("$49"). */
export function formatPrice(cents: number, currency = "usd"): string {
  const whole = cents % 100 === 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(cents / 100);
}

/**
 * Buyer-facing dispatch estimate. Days count business days to DISPATCH
 * (the full EIKON journey: supplier to us, inspection, repackaging),
 * never the supplier's shipping time alone, and never a delivery
 * promise. Longer windows read in weeks so "14–28 days" doesn't feel
 * like a shipping label.
 */
export function dispatchWindowLabel(minDays: number, maxDays: number): string {
  if (maxDays >= 14) {
    const minW = Math.round(minDays / 7);
    const maxW = Math.ceil(maxDays / 7);
    if (minW >= 1 && minW !== maxW)
      return `Dispatches in ${minW}–${maxW} weeks`;
    return `Dispatches in ${maxW} weeks`;
  }
  if (minDays === maxDays)
    return `Dispatches in ${minDays} business day${minDays === 1 ? "" : "s"}`;
  return `Dispatches in ${minDays}–${maxDays} business days`;
}

export const CATEGORY_LABELS: Record<ShopCategory, string> = {
  christ: "Christ",
  theotokos: "Theotokos",
  saints: "Saints",
  feasts: "Feasts",
  prayer_corner: "Prayer Corner",
  crosses: "Crosses",
  sets: "Sets & Collections",
};

/**
 * The only classifications products may display. Deliberately no
 * "hand-painted", "original", or "handmade by EIKON" — supplier-produced
 * reproductions must never be dressed up as something they are not.
 */
export const CLASSIFICATION_LABELS: Record<ShopClassification, string> = {
  printed_mounted: "Printed & Mounted",
  standard_reproduction: "Standard Reproduction",
  laminated: "Laminated Icon",
  wooden: "Wooden Icon",
  hand_finished_reproduction: "Hand-Finished Reproduction",
  prayer_rope: "Prayer Rope",
  incense: "Incense & Resin",
  beaded: "Prayer Beads",
};

export const INVENTORY_LABELS: Record<ShopInventoryStatus, string> = {
  ready_to_ship: "Ready to Ship",
  special_order: "Special Order",
  coming_soon: "Coming Soon",
  out_of_stock: "Out of Stock",
};

export const BUDGET_BAND_LABELS: Record<ShopBudgetBand, string> = {
  under_50: "Under $50",
  "50_100": "$50–$100",
  "100_250": "$100–$250",
  "250_500": "$250–$500",
  "500_plus": "$500+",
  unsure: "Not sure yet",
};

/** May this product be purchased right now? */
export function purchasable(inventory: ShopInventoryStatus): boolean {
  return inventory === "ready_to_ship" || inventory === "special_order";
}

/** Average rating + count from the denormalized counters (rating_total is the
 *  sum of stars). Returns avg = null when there are no reviews. */
export function productRating(p: {
  rating_total?: number;
  review_count?: number;
}): { avg: number | null; count: number } {
  const count = p.review_count ?? 0;
  const total = p.rating_total ?? 0;
  return { count, avg: count > 0 ? total / count : null };
}

/** "1 sold" / "24 sold" — omit entirely at zero (no theatre). */
export function unitsSoldLabel(units: number | undefined): string | null {
  if (!units || units < 1) return null;
  return `${units} sold`;
}
