/**
 * Who a bulk email reaches first when the day's budget cannot reach everyone.
 *
 * On Resend's Free plan a mailing to every account takes weeks (100 a day, some
 * held back for receipts: lib/email/budget.ts). So "who goes first" is a real
 * choice, and it is the owner's: the people who have been here longest, the
 * ones who just arrived, the ones reading right now, or the ones Purify has
 * written to least. The choice is stored on the job (email_jobs.audience_order)
 * and every day's batch is cut from the front of this order.
 *
 * Pure, and no imports, so the admin screen can show the same labels.
 */

export const JOB_ORDERS = ["oldest", "newest", "active", "least_emailed"] as const;
export type JobOrder = (typeof JOB_ORDERS)[number];

export const JOB_ORDER_LABEL: Record<JobOrder, string> = {
  oldest: "Oldest accounts first",
  newest: "Newest accounts first",
  active: "Most recently active first",
  least_emailed: "Fewest emails so far first",
};

export function isJobOrder(x: unknown): x is JobOrder {
  return typeof x === "string" && (JOB_ORDERS as readonly string[]).includes(x);
}

export type Candidate = {
  id: string;
  /** When the account was made (ISO). */
  createdAt: string;
  /** Last sign-in (ISO), null when never. */
  lastSignInAt: string | null;
  /** Emails this person has been sent, all kinds. */
  received: number;
};

const time = (iso: string | null) => (iso ? Date.parse(iso) || 0 : 0);

/** A new array in the chosen order. Ties fall back to oldest first, then id, so a batch is stable. */
export function orderAudience<T extends Candidate>(people: readonly T[], order: JobOrder): T[] {
  const byAge = (a: T, b: T) => time(a.createdAt) - time(b.createdAt) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const cmp: Record<JobOrder, (a: T, b: T) => number> = {
    oldest: byAge,
    newest: (a, b) => -byAge(a, b),
    // Never signed in sorts last: they are the least likely to be reading.
    active: (a, b) => time(b.lastSignInAt) - time(a.lastSignInAt) || byAge(a, b),
    least_emailed: (a, b) => a.received - b.received || byAge(a, b),
  };
  return [...people].sort(cmp[order]);
}

/**
 * Today's batch for one mailing.
 *
 * `done` are the people who already have it (or are being sent it right now),
 * `resting` the ones a rule asks to wait (the one-library-email-a-week rule):
 * still owed, just not today. `room` is how many this mailing may send today.
 */
export function planBatch<T extends Candidate>(opts: {
  candidates: readonly T[];
  done: ReadonlySet<string>;
  resting?: ReadonlySet<string>;
  order: JobOrder;
  room: number;
}): { batch: T[]; owed: number; resting: number } {
  const owed = opts.candidates.filter((c) => !opts.done.has(c.id));
  const ready = opts.resting ? owed.filter((c) => !opts.resting!.has(c.id)) : owed;
  const room = Math.max(0, Math.floor(opts.room));
  return {
    batch: orderAudience(ready, opts.order).slice(0, room),
    owed: owed.length,
    resting: owed.length - ready.length,
  };
}
