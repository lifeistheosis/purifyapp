// Every EIKON order comes with Purify Plus, claimed at purifyapp.net/gift from
// the QR on the thank-you card in the parcel (2026-11-06).
//
// Pure rules, testable without a database. The claim itself, and the "write
// nothing while Plus or Pro is running" rule, live in SQL
// (supabase/migrations/20261106000000_order_gifts.sql, claim_order_gift),
// so a double tap or two devices cannot pay an order out twice.

import { deriveEntitlements, type EntitlementRow } from "@/lib/entitlements/entitlements";

/**
 * How many months of Plus an order comes with, by the day it was paid.
 *
 * The owner's words, 2026-11-06: "every order is packaged with like 3 months
 * of premium. Well, when we first start, but later on we're gonna switch to
 * 1 month." The switch is one more dated line here, e.g.
 * `{ from: "2027-03-01", months: 1 }`. An order keeps the months of the day
 * it was paid. The printed card names no number, so it never goes stale.
 * Orders paid before the first line came without a card and get no gift.
 */
export const ORDER_GIFT_SCHEDULE: ReadonlyArray<{ from: string; months: number }> = [
  { from: "2026-11-06", months: 3 },
];

/** The most days a single order gift may carry (claim_order_gift refuses more). */
export const ORDER_GIFT_MAX_DAYS = 400;

function utcDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Months of Plus an order paid at `paidAt` comes with: the last schedule line
 * whose day is on or before the payment day (UTC). 0 before the program, or
 * for a date that does not parse.
 */
export function orderGiftMonths(
  paidAt: string | Date | null | undefined,
  schedule: ReadonlyArray<{ from: string; months: number }> = ORDER_GIFT_SCHEDULE,
): number {
  if (!paidAt) return 0;
  const d = paidAt instanceof Date ? paidAt : new Date(paidAt);
  if (!Number.isFinite(d.getTime())) return 0;
  const day = utcDay(d);
  let months = 0;
  for (const line of [...schedule].sort((a, b) => a.from.localeCompare(b.from))) {
    if (line.from <= day) months = line.months;
  }
  return months;
}

/**
 * Days from `now` to the same day `months` calendar months later, so "3
 * months" from 6 November runs to 6 February, not 90 days. A day the target
 * month lacks lands on that month's last day (30 November + 3 months is the
 * end of February). Rounded up, never less than 1.
 */
export function giftDays(months: number, now: Date = new Date()): number {
  const m = Math.max(0, Math.round(months));
  if (m === 0) return 0;
  const y = now.getUTCFullYear();
  const mo = now.getUTCMonth() + m;
  const lastDay = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
  const end = new Date(
    Date.UTC(
      y,
      mo,
      Math.min(now.getUTCDate(), lastDay),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds(),
      now.getUTCMilliseconds(),
    ),
  );
  const days = Math.ceil((end.getTime() - now.getTime()) / 86_400_000);
  return Math.min(ORDER_GIFT_MAX_DAYS, Math.max(1, days));
}

/**
 * The 8 characters of an EIK number, lower case, as they begin the order's id
 * (lib/shop/orderNumber.ts). Takes "EIK-72D8D24B", "eik 72d8d24b" or
 * "72D8D24B"; anything else is null.
 */
export function parseOrderNumber(input: string | null | undefined): string | null {
  if (!input) return null;
  const s = input.trim().toLowerCase().replace(/^eik[\s\-_]*/, "").replace(/[\s-]/g, "");
  return /^[0-9a-f]{8}$/.test(s) ? s : null;
}

/** "EIK-72D8D24B" for an order id. */
export function orderNumberOf(orderId: string): string {
  return `EIK-${orderId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

/**
 * Does the ZIP the reader typed match the one on the order's label? US ZIPs
 * compare on their first five digits, so "60614-1234" matches "60614".
 * Anything else compares as upper-case letters and digits. Empty never matches.
 */
export function zipMatches(entered: string | null | undefined, onOrder: string | null | undefined): boolean {
  const norm = (z: string | null | undefined) => (z ?? "").toUpperCase().replace(/[^0-9A-Z]/g, "");
  const a = norm(entered);
  const b = norm(onOrder);
  if (!a || !b) return false;
  const usA = /^\d{5}(\d{4})?$/.test(a);
  const usB = /^\d{5}(\d{4})?$/.test(b);
  if (usA && usB) return a.slice(0, 5) === b.slice(0, 5);
  return a === b;
}

/**
 * Is this reader the buyer? Their own order, or a guest order placed with the
 * address they have confirmed on their account. A guest order with an
 * unconfirmed address is not theirs to claim this way: anyone can type an
 * address into a sign-up form.
 */
export function isOrderBuyer(
  order: { user_id: string | null; email: string | null },
  reader: { id: string; email: string | null | undefined; emailConfirmed: boolean },
): boolean {
  if (order.user_id) return order.user_id === reader.id;
  if (!reader.emailConfirmed || !reader.email || !order.email) return false;
  return order.email.trim().toLowerCase() === reader.email.trim().toLowerCase();
}

/**
 * Plus as the claim sees it: running when Plus or Pro has time left, read from
 * the row with enforcement ON (the open web gate says nothing about the row).
 * `until` is the later of the two ends while running.
 */
export function plusRunning(
  row: EntitlementRow | null | undefined,
  now: Date = new Date(),
): { running: boolean; pro: boolean; until: string | null } {
  const e = deriveEntitlements(row, { enforced: true, now });
  if (!e.plus || !row) return { running: false, pro: false, until: null };
  const ends = [row.plus_until, row.pro_until ?? null]
    .filter((t): t is string => !!t)
    .map((t) => new Date(t).getTime())
    .filter((t) => Number.isFinite(t) && t > now.getTime());
  const until = ends.length ? new Date(Math.max(...ends)).toISOString() : null;
  return { running: true, pro: e.pro, until };
}

/** What the claim answered, as the page words it. */
export type OrderGiftResult =
  | "ok"
  | "already"
  | "has_plus"
  | "not_delivered"
  | "not_paid"
  | "no_order"
  | "not_eligible";

/**
 * The gift opens once the order is marked delivered: the card is inside the
 * parcel (the owner's rule, 2026-11-06). claim_order_gift holds the same rule.
 */
export function orderDelivered(fulfillmentStatus: string | null | undefined): boolean {
  return fulfillmentStatus === "delivered";
}

/** One order as /api/gifts/order shows it to its buyer. */
export type OrderGiftOrder = {
  id: string;
  number: string;
  paidAt: string | null;
  months: number;
  /** Marked delivered, so its gift can be claimed. */
  delivered: boolean;
  /** Claimed by anyone. */
  claimed: boolean;
  /** Claimed by this reader. */
  mine: boolean;
};

/**
 * The order the page claims on its own when a signed-in reader arrives: "if
 * they have the account signed in, then it gives them the gift ... because
 * they went through the gift" (the owner, 2026-11-06). The newest delivered
 * order whose gift nobody has claimed, and only while no Plus or Pro runs;
 * null when there is nothing to claim. One at a time: once one starts Plus,
 * the others wait for it to end.
 */
export function autoClaimPick(state: OrderGiftState | null | undefined): string | null {
  if (!state || !state.signedIn || state.plus.running) return null;
  const ready = state.orders
    .filter((o) => o.delivered && !o.claimed && o.months > 0)
    .sort((a, b) => (b.paidAt ?? "").localeCompare(a.paidAt ?? ""));
  return ready[0]?.id ?? null;
}

/** GET /api/gifts/order. */
export type OrderGiftState =
  | { signedIn: false }
  | {
      signedIn: true;
      plus: { running: boolean; pro: boolean; until: string | null };
      orders: OrderGiftOrder[];
    };
