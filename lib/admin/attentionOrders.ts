/**
 * Which pending orders are old enough to worry about, and which of those no
 * reconcile has looked at yet.
 *
 * Imported by app/api/admin/overview/route.ts, and pure so the rule that
 * caught nothing on 2026-09-01 can be replayed in a test with that day's
 * numbers: 31 pending, 1 paid, a Stripe dashboard showing about sixty dollars.
 *
 * WHY 24 HOURS. A Stripe Checkout session expires 24 hours after it is
 * created. Inside that window a pending order may be a person mid-checkout.
 * After it there are two states only: paid and never settled (the webhook did
 * not arrive) or abandoned. Neither is somebody typing a card number, so a
 * pending row older than a day is a question, not a wait.
 *
 * WHY "UNCHECKED" AND NOT JUST "STALE". Nothing in this codebase cancels an
 * abandoned checkout, so stale pending rows accumulate for ever. A finding
 * keyed on stale alone would be permanent within a week and learned as
 * wallpaper, which is the exact failure an attention strip exists to avoid.
 * Reconcile (POST /api/admin/shop/reconcile) asks Stripe about every pending
 * order and logs `shop.reconcile` on every Apply, so "created after the last
 * reconcile" is the set nobody has asked Stripe about. Applying a reconcile
 * is what clears the finding, and the copy on the finding says so.
 */

export const STALE_AFTER_MS = 86_400_000;

export type StaleCounts = {
  /** Pending rows older than STALE_AFTER_MS. */
  stale: number;
  /** The subset created after the last reconcile, or all of them when none has run. */
  unchecked: number;
  /**
   * When the newest stale row was placed, ISO. The webhook check compares
   * Stripe's last delivery against this: a delivery AFTER it means Stripe was
   * calling while these orders sat, so they are probably abandoned rather than
   * paid-and-unrecorded.
   *
   * When every stale row is outside the page the route holds, this is the
   * page boundary itself (now minus the window), an upper bound on when any of
   * them was placed and so the honest comparison point.
   */
  newestStaleAt: string | null;
};

const ms = (iso: string): number => Date.parse(iso);

export function staleCounts(
  orders: { payment_status: string; created_at: string }[],
  pendingTotal: number,
  now: number,
  lastReconcileAt: string | null,
  /** The window `orders` covers. Pending rows outside it are older than this. */
  windowMs = 30 * 86_400_000,
): StaleCounts {
  const cutoff = now - STALE_AFTER_MS;
  const reconcileMs = lastReconcileAt ? ms(lastReconcileAt) : NaN;
  const hasReconcile = Number.isFinite(reconcileMs);

  const pendingInPage = orders.filter((o) => o.payment_status === "pending");
  const staleInPage = pendingInPage.filter((o) => ms(o.created_at) <= cutoff);

  // Pending rows the page does not hold are older than its window, which is
  // older than a day, so every one of them is stale. Zero new queries.
  const outsidePage = Math.max(0, pendingTotal - pendingInPage.length);

  const uncheckedInPage = hasReconcile
    ? staleInPage.filter((o) => ms(o.created_at) > reconcileMs)
    : staleInPage;

  // Rows outside the page carry no created_at here. All of them were placed
  // before the window opened, so a reconcile run INSIDE the window has seen
  // every one, and an older reconcile may have missed some. That second case
  // counts them as unchecked: the panel cannot tell, and cannot-tell must not
  // read as clear. Pressing Apply moves the reconcile inside the window and
  // zeroes this bucket, so the finding is clearable either way.
  const windowStart = now - windowMs;
  const uncheckedOutside =
    outsidePage > 0 && (!hasReconcile || reconcileMs < windowStart) ? outsidePage : 0;

  let newestStaleAt: string | null = null;
  if (staleInPage.length > 0) {
    let newest = staleInPage[0].created_at;
    for (const o of staleInPage) if (ms(o.created_at) > ms(newest)) newest = o.created_at;
    newestStaleAt = newest;
  } else if (outsidePage > 0) {
    newestStaleAt = new Date(windowStart).toISOString();
  }

  return {
    stale: staleInPage.length + outsidePage,
    unchecked: uncheckedInPage.length + uncheckedOutside,
    newestStaleAt,
  };
}
