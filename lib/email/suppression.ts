import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The addresses Purify stops writing to (1.8, the email audit of 2026-10-22).
 *
 * Until now nothing learned from a bounce: an address that bounced on the 1.7
 * release would be tried again by every later send, and Resend's dashboard
 * showed a 3.7% bounce rate, near the 4% at which mailbox providers start to
 * treat a sender as careless. Resend now reports each bounce and complaint to
 * app/api/email/resend-webhook, which writes it here, and sendEmail checks
 * here before every send.
 *
 *   A hard bounce (the address does not exist) stops all mail to it.
 *   Three soft bounces (a full box, a server saying "later") stop it too:
 *   one is weather, three is an address nobody reads.
 *   A spam complaint stops every list email, but not a receipt or a reply to
 *   the reader's own support ticket, which they asked for.
 *
 * Service role only (RLS on, no policies). The table is new in 1.8
 * (docs/1.8-build/sql/email-fixes.sql). Until it exists every check answers
 * "send": a missing table must never stop a receipt.
 */

const TABLE = "email_suppressions";
export const SOFT_BOUNCE_LIMIT = 3;

export type SuppressionRow = {
  email: string;
  hard: boolean;
  complained: boolean;
  soft_bounces: number;
};

/** Whether this address is closed to this kind of mail. Pure. */
export function blocks(row: SuppressionRow | undefined, marketing: boolean): boolean {
  if (!row) return false;
  return row.hard || row.soft_bounces >= SOFT_BOUNCE_LIMIT || (marketing && row.complained);
}

export const normalEmail = (e: string) => e.trim().toLowerCase();

/** The bare address in "Name <a@b.c>", or the string itself. */
export function bareAddress(e: string): string {
  const m = /<([^>]+)>/.exec(e);
  return normalEmail(m ? m[1] : e);
}

/**
 * Of these addresses, the ones not to write to. Answers [] when the table or
 * the service role cannot be reached, and says so in the server log.
 */
export async function suppressedAmong(
  addresses: string[],
  marketing: boolean,
  client?: SupabaseClient,
): Promise<string[]> {
  const wanted = [...new Set(addresses.map(bareAddress))];
  if (!wanted.length) return [];
  try {
    const admin = client ?? createAdminClient();
    const { data, error } = await admin
      .from(TABLE)
      .select("email, hard, complained, soft_bounces")
      .in("email", wanted);
    if (error) {
      console.warn(`[email] suppression list unreadable, sending anyway: ${error.message}`);
      return [];
    }
    const rows = new Map((data as SuppressionRow[]).map((r) => [r.email, r]));
    return wanted.filter((e) => blocks(rows.get(e), marketing));
  } catch (e) {
    console.warn(`[email] suppression list unreachable, sending anyway: ${(e as Error).message}`);
    return [];
  }
}

export type DeliveryEvent =
  | { kind: "bounce"; email: string; permanent: boolean; detail: string }
  | { kind: "complaint"; email: string; detail: string }
  | { kind: "suppressed"; email: string; detail: string };

/** The row after one more event. Pure, so the rule is tested without a database. */
export function applyEvent(row: SuppressionRow | undefined, ev: DeliveryEvent): SuppressionRow {
  const base: SuppressionRow = row ?? { email: normalEmail(ev.email), hard: false, complained: false, soft_bounces: 0 };
  if (ev.kind === "complaint") return { ...base, complained: true };
  // Resend refusing an address it has already suppressed is as final as a hard bounce.
  if (ev.kind === "suppressed" || ev.permanent) return { ...base, hard: true };
  return { ...base, soft_bounces: base.soft_bounces + 1 };
}

/** Write one event. Throws when the table cannot be written, so the webhook answers 500 and Resend retries. */
export async function recordDeliveryEvent(admin: SupabaseClient, ev: DeliveryEvent): Promise<SuppressionRow> {
  const email = normalEmail(ev.email);
  const { data, error } = await admin
    .from(TABLE)
    .select("email, hard, complained, soft_bounces")
    .eq("email", email)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const next = applyEvent((data as SuppressionRow | null) ?? undefined, { ...ev, email });
  const { error: writeError } = await admin.from(TABLE).upsert({
    ...next,
    last_event: ev.kind === "bounce" ? (ev.permanent ? "hard_bounce" : "soft_bounce") : ev.kind,
    last_detail: ev.detail.slice(0, 500),
    last_event_at: new Date().toISOString(),
  });
  if (writeError) throw new Error(writeError.message);
  return next;
}
