/**
 * An ambassador's money, summed from the commission ledger
 * (supabase/migrations/20260930000000_ambassadors.sql), and when it is paid.
 *
 *   PENDING   an EIKON order they brought in, inside its refund window.
 *   CLEARED   the window has passed: owed, and paid on the next payout.
 *   PAID      sent to their Stripe account.
 *   REVERSED  the order was refunded or cancelled first: nothing owed.
 *
 * Payouts are monthly, automatic once the owner turns them on, and only once
 * the cleared balance reaches MIN_PAYOUT_CENTS, so a few cents never become a
 * transfer with a fee of its own.
 *
 * Pure.
 */

export const MIN_PAYOUT_CENTS = 2500;
export const COMMISSION_BPS = 1000;

export type LedgerRow = {
  status: "pending" | "cleared" | "paid" | "reversed";
  amount_cents: number;
  created_at: string;
};

export type Balance = {
  pendingCents: number;
  clearedCents: number;
  paidCents: number;
  /** Orders that earned something and were not undone. */
  conversions: number;
  reversed: number;
};

export function balance(rows: LedgerRow[]): Balance {
  const b: Balance = { pendingCents: 0, clearedCents: 0, paidCents: 0, conversions: 0, reversed: 0 };
  for (const r of rows) {
    if (r.status === "reversed") {
      b.reversed += 1;
      continue;
    }
    b.conversions += 1;
    if (r.status === "pending") b.pendingCents += r.amount_cents;
    else if (r.status === "cleared") b.clearedCents += r.amount_cents;
    else b.paidCents += r.amount_cents;
  }
  return b;
}

/** The automatic payout's month, in UTC: one per ambassador per month. */
export function payoutPeriod(now: number): string {
  return new Date(now).toISOString().slice(0, 7);
}

export function payoutDue(clearedCents: number, payoutsEnabled: boolean): boolean {
  return payoutsEnabled && clearedCents >= MIN_PAYOUT_CENTS;
}

/** Commission on an order's EIKON items, as the database trigger computes it. */
export function commissionCents(itemsCents: number, bps = COMMISSION_BPS): number {
  return Math.floor((Math.max(0, itemsCents) * bps) / 10000);
}

export type ClickRow = { day: string; clicks: number };

/** The last `days` days, oldest first, with the days nobody clicked as zero. */
export function clickSeries(rows: ClickRow[], now: number, days = 30): ClickRow[] {
  const byDay = new Map(rows.map((r) => [r.day, r.clicks]));
  const out: ClickRow[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = new Date(now - i * 86_400_000).toISOString().slice(0, 10);
    out.push({ day, clicks: byDay.get(day) ?? 0 });
  }
  return out;
}
