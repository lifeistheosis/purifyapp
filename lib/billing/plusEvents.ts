import type { SupabaseClient } from "@supabase/supabase-js";

import { isTableAbsent } from "@/lib/admin/tableAbsent";

/**
 * Every RevenueCat event, kept (1.9, admin item A2, Edgar's yes of
 * 2026-11-09): a purchase, a renewal, a cancel, an expiry, a failed charge, a
 * refund. The webhook (app/api/billing/revenuecat/route.ts) used to keep one
 * fact per member, the date Plus runs to, and drop the rest, so the admin
 * could not say who joined or left, which trials paid, or what Plus brought
 * in on a day. The table is docs/1.9-build/sql/plus-events.sql, on his OK.
 *
 * Best effort, always. Keeping the event never changes what RevenueCat is
 * told: a missing table, a slow database or a malformed event is a warning in
 * the log, never a failed delivery (a failed delivery is retried, and a
 * retried purchase is the one thing the webhook must never cause). A retried
 * delivery is kept once: the event's own id is unique in the table.
 *
 * What a row holds is the privacy line Edgar approved: "When you buy or renew
 * a membership, we keep a record of it: which store, the price and the dates.
 * Once you delete your account, it is no longer linked to you." So: the
 * member's account id (cleared when the account is deleted), and never a card,
 * an email, a country or the store's own order number (which the store could
 * trace back to the buyer after the account is gone).
 *
 * The field names are RevenueCat's webhook event fields.
 */

/** A RevenueCat webhook event, the parts this keeps. */
export type RcWebhookEvent = {
  id?: unknown;
  type?: unknown;
  app_user_id?: unknown;
  store?: unknown;
  environment?: unknown;
  period_type?: unknown;
  product_id?: unknown;
  price?: unknown;
  currency?: unknown;
  price_in_purchased_currency?: unknown;
  takehome_percentage?: unknown;
  renewal_number?: unknown;
  is_trial_conversion?: unknown;
  cancel_reason?: unknown;
  expiration_reason?: unknown;
  event_timestamp_ms?: unknown;
  purchased_at_ms?: unknown;
  expiration_at_ms?: unknown;
};

/** One row of public.plus_events, as the webhook writes it. */
export type PlusEventRow = {
  event_id: string;
  user_id: string | null;
  type: string;
  store: string | null;
  environment: string | null;
  period_type: string | null;
  product_id: string | null;
  price_usd: number | null;
  currency: string | null;
  price_in_currency: number | null;
  takehome: number | null;
  renewal_number: number | null;
  trial_conversion: boolean | null;
  reason: string | null;
  event_at: string;
  purchased_at: string | null;
  expires_at: string | null;
};

/**
 * Events that say nothing about a membership or its money: the dashboard's
 * test button, a purchase moving between two ids, an alias, an experiment,
 * a web invoice (the purchase it bills arrives as its own event), and virtual
 * currency. Anything else is kept, a type RevenueCat adds later included; the
 * admin counts only the types it knows (lib/admin/plusHistory.ts).
 */
const NOT_KEPT = new Set([
  "TEST",
  "TRANSFER",
  "SUBSCRIBER_ALIAS",
  "EXPERIMENT_ENROLLMENT",
  "INVOICE_ISSUANCE",
  "VIRTUAL_CURRENCY_TRANSACTION",
]);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function text(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t && t.length <= max ? t : null;
}

function amount(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? Math.round(v * 100) / 100 : null;
}

function moment(v: unknown): string | null {
  if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * The row an event becomes, or null when it is not kept: an event this file
 * does not keep, or one with no id or type to keep it by. Pure.
 */
export function plusEventRow(event: RcWebhookEvent, now: number = Date.now()): PlusEventRow | null {
  const eventId = text(event.id, 200);
  const type = text(event.type, 64);
  if (!eventId || !type || NOT_KEPT.has(type)) return null;
  const user = typeof event.app_user_id === "string" && UUID.test(event.app_user_id) ? event.app_user_id.toLowerCase() : null;
  const share = event.takehome_percentage;
  const takehome = typeof share === "number" && Number.isFinite(share) ? Math.round(share * 1e5) / 1e5 : null;
  const renewal = event.renewal_number;
  return {
    event_id: eventId,
    user_id: user,
    type,
    store: text(event.store, 64),
    environment: text(event.environment, 32),
    period_type: text(event.period_type, 32),
    product_id: text(event.product_id, 200),
    price_usd: amount(event.price),
    currency: text(event.currency, 8),
    price_in_currency: amount(event.price_in_purchased_currency),
    takehome: takehome !== null && takehome >= 0 && takehome <= 1 ? takehome : null,
    renewal_number: typeof renewal === "number" && Number.isInteger(renewal) && renewal >= 0 ? renewal : null,
    trial_conversion: typeof event.is_trial_conversion === "boolean" ? event.is_trial_conversion : null,
    // RevenueCat sends one or the other: why a renewal was turned off, or why
    // a membership ended (UNSUBSCRIBE, BILLING_ERROR, CUSTOMER_SUPPORT, ...).
    reason: text(event.cancel_reason, 64) ?? text(event.expiration_reason, 64),
    event_at: moment(event.event_timestamp_ms) ?? new Date(now).toISOString(),
    purchased_at: moment(event.purchased_at_ms),
    expires_at: moment(event.expiration_at_ms),
  };
}

export type KeepOutcome = "kept" | "not kept" | "no table" | "failed";

/** While the table is not there, it is asked again after this long, not on every event. */
const ABSENT_FOR_MS = 10 * 60_000;
let absentUntil = 0;

/**
 * Keep one event. Never throws, and never waits on anything but the one
 * write. `db` is a factory so a client that cannot be made (no service key on
 * this server) is a warning here, not an error in the webhook.
 */
export async function keepPlusEvent(
  db: () => SupabaseClient,
  event: RcWebhookEvent,
  now: number = Date.now(),
): Promise<KeepOutcome> {
  const row = plusEventRow(event, now);
  if (!row) return "not kept";
  if (now < absentUntil) return "no table";
  try {
    const client = db();
    const write = (r: PlusEventRow) => client.from("plus_events").upsert(r, { onConflict: "event_id", ignoreDuplicates: true });
    let { error } = await write(row);
    // An account deleted before RevenueCat's last word on it (an expiry, a
    // refund): the money still moved, so the event is kept, linked to no one.
    if (error?.code === "23503" && row.user_id) ({ error } = await write({ ...row, user_id: null }));
    if (!error) return "kept";
    if (isTableAbsent(error)) {
      absentUntil = now + ABSENT_FOR_MS;
      return "no table";
    }
    console.warn(`[revenuecat] event ${row.type} not kept for the admin: ${error.message}`);
    return "failed";
  } catch (e) {
    console.warn(`[revenuecat] event not kept for the admin: ${(e as Error).message}`);
    return "failed";
  }
}

/** Tests only: forget that the table was missing. */
export function __resetPlusEvents() {
  absentUntil = 0;
}
