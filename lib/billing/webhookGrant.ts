// What a RevenueCat event does to an entitlements row.
//
// Pure so the money-adjacent decision is testable without a database, the same
// reason lib/gifts/grant.ts exists.
//
// The rule that matters: **an event speaks only for the products it carries.**
// `upsert_entitlement` (supabase/migrations/20260713_entitlements_pro.sql)
// overwrites every column it is handed, so passing pro_until: null on a
// Plus-only event silently revoked a Pro membership that nothing had
// cancelled. A comped Pro member whose ordinary Play subscription renewed lost
// the tier that carries the monthly mailed icon, with no cancellation, no
// refund and no notice. Pro ends when Pro's OWN expiry arrives, which reaches
// this same path carrying the `pro` entitlement.
//
// Deliberately NOT "extend, never truncate" the way a gift is
// (lib/gifts/grant.ts). A subscription MUST be able to shorten access:
// refunds, downgrades and billing failures arrive as an earlier
// expiration_at_ms, and keeping the later date would keep serving Plus to
// someone who was refunded. Preserving gifted days across a renewal is a
// genuinely different problem, because a gift and a subscription both land in
// one plus_until column and nothing records which days came from where.
// Solving it needs a column to separate them, so it is not solved here.

/** The parts of an existing entitlements row this decision reads. */
export type ExistingGrant = {
  pro_until?: string | null;
};

export type WebhookGrant = {
  plusUntil: string;
  proUntil: string | null;
};

/**
 * Resolve what to write for a RevenueCat event.
 *
 * @param isPro     does this event carry the `pro` entitlement?
 * @param plusUntil the event's expiration_at_ms, as an ISO string. Pro is a
 *                  superset of Plus, so a Pro event grants Plus to the same
 *                  instant.
 * @param existing  the row as it stands, or null when the account has none.
 */
export function resolveWebhookGrant(args: {
  isPro: boolean;
  plusUntil: string;
  existing?: ExistingGrant | null;
}): WebhookGrant {
  const { isPro, plusUntil, existing } = args;
  return {
    plusUntil,
    // A Pro event sets Pro. Every other event leaves Pro exactly as it was,
    // including absent.
    proUntil: isPro ? plusUntil : (existing?.pro_until ?? null),
  };
}
