// Honest ship-date estimation for a buyer's order. The estimate comes from
// the dispatch window promised on each product's own listing
// (dispatch_min_days to dispatch_max_days), never from a guess: an order
// ships when its SLOWEST item is ready, so the order's window is the max of
// the item windows, counted from the moment the order was placed. Returns
// null when no item carries a window (product removed since purchase, or
// fields unset) — the UI shows no estimate rather than inventing one.

export type DispatchWindow = {
  dispatch_min_days: number | null;
  dispatch_max_days: number | null;
};

export type ShipEstimate = {
  from: Date;
  to: Date;
  /** Past the promised window and still not shipped. */
  late: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function estimatedShipWindow(
  placedAtIso: string,
  items: (DispatchWindow | null | undefined)[],
  now: Date = new Date(),
): ShipEstimate | null {
  const placed = new Date(placedAtIso).getTime();
  if (Number.isNaN(placed)) return null;

  let min = -1;
  let max = -1;
  for (const item of items) {
    const lo = item?.dispatch_min_days;
    const hi = item?.dispatch_max_days;
    if (lo == null || hi == null || lo < 0 || hi < 0) continue;
    if (lo > min) min = lo;
    if (hi > max) max = hi;
  }
  if (min < 0 || max < 0) return null;
  if (max < min) max = min;

  const from = new Date(placed + min * DAY_MS);
  const to = new Date(placed + max * DAY_MS);
  return { from, to, late: now.getTime() > to.getTime() };
}
