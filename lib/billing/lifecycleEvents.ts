/**
 * What a RevenueCat event means beyond plus_until.
 *
 * The webhook has always reduced every event to one timestamp, which is right
 * for access and blind to everything else: a failed charge and a subscriber
 * turning renewal off both looked like nothing at all. This names the two
 * extra facts an event carries and the one email it may owe.
 *
 *   BILLING_ISSUE     a renewal charge failed: record when, email once for
 *                     that billing period
 *   CANCELLATION      renewal turned off (by the subscriber, or by the store
 *                     after a billing error): auto_renew false
 *   UNCANCELLATION    renewal back on
 *   RENEWAL           a period was paid: renewal on, any billing issue cleared
 *   INITIAL_PURCHASE  a new membership: renewal on, and one thank-you email
 *   PRODUCT_CHANGE    moved between Plus and Pro: renewal still on
 *
 * Everything else changes nothing here. EXPIRATION needs no email from the
 * webhook, because the daily lifecycle job sends "your Plus has ended" from
 * the dates, which also catches a lapse whose event was missed.
 *
 * Pure. RevenueCat documents these fields on every lifecycle event:
 * type, event_timestamp_ms, purchased_at_ms, expiration_at_ms.
 */

export type RevenueCatEvent = {
  type?: string;
  event_timestamp_ms?: number | null;
  purchased_at_ms?: number | null;
  expiration_at_ms?: number | null;
};

export type LifecycleEffects = {
  /** undefined leaves the column alone. */
  autoRenew?: boolean;
  /** undefined leaves it alone, null clears it, a string sets it. */
  billingIssueAt?: string | null;
  /** The email this event owes, and the period it is owed for. */
  email?: { kind: "payment_failed" | "plus_active"; periodKey: string };
};

function msKey(...candidates: (number | null | undefined)[]): string {
  const ms = candidates.find((c): c is number => typeof c === "number" && Number.isFinite(c));
  return ms === undefined ? "unknown" : String(ms);
}

export function effectsFor(event: RevenueCatEvent, now: Date = new Date()): LifecycleEffects {
  switch (event.type) {
    case "BILLING_ISSUE": {
      const at =
        typeof event.event_timestamp_ms === "number"
          ? new Date(event.event_timestamp_ms).toISOString()
          : now.toISOString();
      return {
        billingIssueAt: at,
        // Keyed to the period that failed to renew, so RevenueCat reporting
        // the same failure again is one email, and next month's failure, if
        // there is one, is its own.
        email: { kind: "payment_failed", periodKey: msKey(event.expiration_at_ms, event.event_timestamp_ms) },
      };
    }
    case "CANCELLATION":
      return { autoRenew: false };
    case "UNCANCELLATION":
    case "PRODUCT_CHANGE":
      return { autoRenew: true };
    case "RENEWAL":
      return { autoRenew: true, billingIssueAt: null };
    case "INITIAL_PURCHASE":
      return {
        autoRenew: true,
        billingIssueAt: null,
        email: { kind: "plus_active", periodKey: msKey(event.purchased_at_ms, event.event_timestamp_ms) },
      };
    default:
      return {};
  }
}

/** The dedupe key an effect's email is sent under. */
export function lifecycleDedupeKey(userId: string, email: NonNullable<LifecycleEffects["email"]>): string {
  return `${email.kind}:${userId}:${email.periodKey}`;
}
