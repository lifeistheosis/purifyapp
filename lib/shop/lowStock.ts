/**
 * When to tell the owner an EIKON piece is running low.
 *
 * ── Why the line moves ──────────────────────────────────────────────────
 *
 * A fixed "five left" is wrong both ways. A piece that sells one a quarter has
 * months of cover at three, and a piece that sold eight last month is out
 * before a supplier order placed today could arrive. So the line is the stock
 * that would be sold while a restock is on its way: the recent daily rate of
 * sale times the restock lead time, never below a floor. It rises for what
 * sells and falls away for what does not (the owner asked for "dynamic
 * thresholds", 2026-09-30).
 *
 * The lead time is EIKON's own: every piece is ordered from a supplier,
 * shipped to us, inspected and repacked (lib/shop/funnel.ts gives the two
 * supplier stages a week and two weeks), so three weeks is the honest wait.
 *
 * ── What it refuses ─────────────────────────────────────────────────────
 *
 * The same rule as ./stock.ts: an unknown quantity says nothing. Most of the
 * catalogue has no count, and a warning about an unknown number is a guess.
 * Only ready-to-ship pieces are watched: a made-to-order piece has no stock
 * to run out of.
 *
 * Pure. The products, their recent sales and the settings are inputs.
 */

export const RESTOCK_LEAD_DAYS = 21;
export const SALES_WINDOW_DAYS = 60;
/** Never warn later than this many left, however slowly a piece sells. */
export const MIN_THRESHOLD = 2;

/** The number of units at or below which a piece is low. */
export function reorderThreshold(
  unitsSoldInWindow: number,
  windowDays = SALES_WINDOW_DAYS,
  leadDays = RESTOCK_LEAD_DAYS,
): number {
  const perDay = Math.max(0, unitsSoldInWindow) / Math.max(1, windowDays);
  return Math.max(MIN_THRESHOLD, Math.ceil(perDay * leadDays));
}

/** Days until it runs out at the recent rate. Null when nothing has sold. */
export function daysOfCover(quantity: number, unitsSoldInWindow: number, windowDays = SALES_WINDOW_DAYS): number | null {
  if (unitsSoldInWindow <= 0) return null;
  return Math.floor(quantity / (unitsSoldInWindow / windowDays));
}

/** A sale took the piece from above its line to at or below it. */
export function crossedLine(before: number, after: number, threshold: number): boolean {
  return before > threshold && after <= threshold;
}

export type StockProduct = {
  id: string;
  slug: string;
  title: string;
  inventory_status: string;
  quantity_available: number | null;
};

export type LowStockRow = {
  id: string;
  slug: string;
  title: string;
  quantity: number;
  threshold: number;
  soldInWindow: number;
  daysOfCover: number | null;
  /** At or below the line. Rows above it are returned too, for the table. */
  low: boolean;
};

/** Every watched piece with its line, lowest cover first. */
export function stockLines(products: StockProduct[], soldById: ReadonlyMap<string, number>): LowStockRow[] {
  const rows: LowStockRow[] = [];
  for (const p of products) {
    if (p.inventory_status !== "ready_to_ship") continue;
    if (typeof p.quantity_available !== "number" || !Number.isFinite(p.quantity_available)) continue;
    const sold = soldById.get(p.id) ?? 0;
    const threshold = reorderThreshold(sold);
    rows.push({
      id: p.id,
      slug: p.slug,
      title: p.title,
      quantity: p.quantity_available,
      threshold,
      soldInWindow: sold,
      daysOfCover: daysOfCover(p.quantity_available, sold),
      low: p.quantity_available <= threshold,
    });
  }
  return rows.sort((a, b) => {
    if (a.low !== b.low) return a.low ? -1 : 1;
    return a.quantity - a.threshold - (b.quantity - b.threshold);
  });
}
