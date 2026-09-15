import { isNewAccount } from "./newAccount";
import { lapsedAt, plusState, type EntitlementDates } from "./segments";

/**
 * Which time-based account emails are due, decided from the rows alone.
 *
 * The daily lifecycle job (/api/cron/lifecycle, or Run now in the admin Email
 * tab) reads entitlements and the open EIKON drops, hands them here, and sends
 * what comes back through sendOnce. Pure, so every rule below is a test.
 *
 * WINDOWS, NOT EXACT DAYS. Each email is due for a span of days rather than on
 * one day, so a job that does not run for a day, or runs twice, still sends
 * each email exactly once: the window catches the missed day and the dedupe
 * key stops the repeat.
 *
 *   plus_ending    renewal is OFF and access ends in the next three days.
 *                  Never for a renewing subscriber: plus_until is always about a
 *                  period ahead for them, and warning every renewing member
 *                  every month is the bug this rule exists to avoid. Also not
 *                  within 30 days of a billing issue, because that member has
 *                  already had the payment email and does not need a second.
 *   plus_ended     access ended in the last two days.
 *   winback        access ended 30 to 33 days ago. Keyed on the user alone, so
 *                  it is sent once in a member's life, never a second time.
 *   claim_closing  an open EIKON drop closes in the next 48 hours, to active
 *                  Pro members who have not claimed it yet.
 *   welcome        the catch-up for any account under seven days old. The
 *                  welcome is normally sent the moment someone signs up, but
 *                  "the moment" only exists on some paths: the web sign-in
 *                  callback, and the terms acceptance an app sign-up records.
 *                  A password sign-up with email confirmation off passes
 *                  through neither. Same key as the immediate send
 *                  (welcome:<user>), so an account that already had it is a
 *                  duplicate here, never a second email.
 */

export type LifecycleRow = EntitlementDates & {
  /** Null when not known yet, which is every row until its next webhook event. */
  auto_renew: boolean | null;
  billing_issue_at: string | null;
  plus_source: string | null;
};

export type OpenDrop = { id: string; title: string; claims_close_at: string | null };

export type PlannedEmail =
  | { kind: "plus_ending"; userId: string; dedupeKey: string; endsOn: Date; store: string | null }
  | { kind: "plus_ended"; userId: string; dedupeKey: string }
  | { kind: "winback"; userId: string; dedupeKey: string; wasPro: boolean }
  | { kind: "claim_closing"; userId: string; dedupeKey: string; dropTitle: string; closesAt: Date }
  | { kind: "welcome"; userId: string; dedupeKey: string }
  | {
      kind: "order_address";
      userId: string | null;
      /** Straight from the order: a guest checkout has no account to look up. */
      to: string;
      dedupeKey: string;
      orderId: string;
      reminder: boolean;
    }
  | { kind: "care_guide"; userId: string | null; to: string; dedupeKey: string; orderId: string };

/** A delivered shop order, for the care guide. updated_at is when it was marked delivered. */
export type DeliveredOrder = {
  id: string;
  email: string | null;
  user_id: string | null;
  updated_at: string;
};

/** An account and when it was made: profiles.id and profiles.joined_at. */
export type AccountAge = { id: string; joined_at: string | null };

/** A paid shop order with no shipping address on it. */
export type OrderMissingAddress = {
  id: string;
  email: string | null;
  user_id: string | null;
  created_at: string;
};

const DAY = 86_400_000;

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

function ms(ts: string | null | undefined): number | null {
  if (!ts) return null;
  const t = new Date(ts).getTime();
  return Number.isFinite(t) ? t : null;
}

export function planLifecycle(input: {
  rows: readonly LifecycleRow[];
  openDrops: readonly OpenDrop[];
  /** drop id to the user ids that already claimed it */
  claimedBy: ReadonlyMap<string, ReadonlySet<string>>;
  now: Date;
  /** False when auto_renew could not be read (migration not applied). */
  renewalStateKnown?: boolean;
  /** Recently made accounts, for the welcome catch-up. */
  accounts?: readonly AccountAge[];
  /** Paid orders with no address, for the address prompt. */
  ordersMissingAddress?: readonly OrderMissingAddress[];
  /** Delivered orders, for the care guide. */
  deliveredOrders?: readonly DeliveredOrder[];
}): PlannedEmail[] {
  const { rows, openDrops, claimedBy, now } = input;
  const t = now.getTime();
  const out: PlannedEmail[] = [];

  // The care guide: once per order, five to thirty days after it was marked
  // delivered, long enough that it has been unpacked and short enough that it
  // is still news. Keyed on the order, so it is one email however many runs.
  for (const order of input.deliveredOrders ?? []) {
    const delivered = ms(order.updated_at);
    if (!order.email || delivered === null) continue;
    const age = t - delivered;
    if (age < 5 * DAY || age > 30 * DAY) continue;
    out.push({
      kind: "care_guide",
      userId: order.user_id,
      to: order.email,
      dedupeKey: `care_guide:${order.id}`,
      orderId: order.id,
    });
  }

  // Asked a day after the order, reminded from day four, and never after a
  // month: an order that old needs the owner, not a third email. One email per
  // run at most, so an order first seen on day five gets the reminder alone.
  for (const order of input.ordersMissingAddress ?? []) {
    const created = ms(order.created_at);
    if (!order.email || created === null) continue;
    const age = t - created;
    if (age < DAY || age > 30 * DAY) continue;
    const reminder = age >= 4 * DAY;
    out.push({
      kind: "order_address",
      userId: order.user_id,
      to: order.email,
      dedupeKey: `order_address:${order.id}:${reminder ? "reminder" : "first"}`,
      orderId: order.id,
      reminder,
    });
  }

  for (const account of input.accounts ?? []) {
    if (isNewAccount(account.joined_at, now)) {
      out.push({ kind: "welcome", userId: account.id, dedupeKey: `welcome:${account.id}` });
    }
  }

  for (const row of rows) {
    const state = plusState(row, now);

    if (state === "active" && input.renewalStateKnown !== false && row.auto_renew === false) {
      const end = Math.max(ms(row.plus_until) ?? -Infinity, ms(row.pro_until) ?? -Infinity);
      const issue = ms(row.billing_issue_at);
      const recentIssue = issue !== null && t - issue < 30 * DAY;
      if (end > t && end - t <= 3 * DAY && !recentIssue) {
        const endsOn = new Date(end);
        out.push({
          kind: "plus_ending",
          userId: row.user_id,
          dedupeKey: `plus_ending:${row.user_id}:${isoDay(endsOn)}`,
          endsOn,
          store: row.plus_source,
        });
      }
    }

    if (state === "lapsed") {
      const ended = lapsedAt(row, now);
      if (ended) {
        const ago = t - ended.getTime();
        if (ago >= 0 && ago <= 2 * DAY) {
          out.push({
            kind: "plus_ended",
            userId: row.user_id,
            dedupeKey: `plus_ended:${row.user_id}:${isoDay(ended)}`,
          });
        }
        if (ago >= 30 * DAY && ago <= 33 * DAY) {
          out.push({
            kind: "winback",
            userId: row.user_id,
            dedupeKey: `winback:${row.user_id}`,
            wasPro: row.pro_until !== null,
          });
        }
      }
    }
  }

  const activePro = rows.filter((r) => {
    const pro = ms(r.pro_until);
    return pro !== null && pro > t;
  });

  for (const drop of openDrops) {
    const close = ms(drop.claims_close_at);
    if (close === null || close <= t || close - t > 2 * DAY) continue;
    const claimed = claimedBy.get(drop.id) ?? new Set<string>();
    for (const member of activePro) {
      if (claimed.has(member.user_id)) continue;
      out.push({
        kind: "claim_closing",
        userId: member.user_id,
        dedupeKey: `claim_closing:${drop.id}:${member.user_id}`,
        dropTitle: drop.title,
        closesAt: new Date(close),
      });
    }
  }

  return out;
}
