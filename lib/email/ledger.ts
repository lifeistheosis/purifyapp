import "server-only";

import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";

import { sendEmail, type SendResult } from "./send";
import { sendOnce, type EmailLedger, type OnceMessage, type SendOnceResult } from "./sendOnce";

/**
 * The email_sends table as an EmailLedger, and the one-line way to use it.
 *
 * Service role only (the table has RLS on and no policies). See
 * supabase/migrations/20260914_email_sends.sql for why each column exists.
 */

const TABLE = "email_sends";

/** Postgres unique violation: the key is already in the ledger. */
const UNIQUE_VIOLATION = "23505";

export function supabaseLedger(admin: SupabaseClient): EmailLedger {
  return {
    async claim(row) {
      const { error } = await admin.from(TABLE).insert({
        dedupe_key: row.dedupeKey,
        kind: row.kind,
        user_id: row.userId,
        email: row.email,
        subject: row.subject,
        status: "pending",
      });
      if (!error) return "claimed";
      if (error.code !== UNIQUE_VIOLATION) {
        // 42P01 or PGRST205 when the migration is not applied, or anything
        // else. Either way there is no lock, so sendOnce will not send.
        throw new Error(`${TABLE} unavailable (${error.code ?? "?"}): ${error.message}`);
      }

      // The key exists. Retake it only if the earlier attempt did not deliver.
      // The status filter makes this atomic: two retries racing here cannot
      // both flip the same failed row back to pending.
      const { data, error: retakeError } = await admin
        .from(TABLE)
        .update({ status: "pending", error: null, email: row.email, subject: row.subject })
        .eq("dedupe_key", row.dedupeKey)
        .in("status", ["failed", "skipped"])
        .select("id");
      if (retakeError) throw new Error(`${TABLE} retake failed: ${retakeError.message}`);
      return data && data.length > 0 ? "claimed" : "duplicate";
    },

    async finish(dedupeKey, outcome) {
      const { error } = await admin
        .from(TABLE)
        .update({
          status: outcome.status,
          error: outcome.error ?? null,
          sent_at: outcome.status === "sent" ? new Date().toISOString() : null,
        })
        .eq("dedupe_key", dedupeKey);
      if (error) throw new Error(error.message);
    },
  };
}

/** sendOnce against the real ledger and the real sender. */
export function sendEmailOnce(admin: SupabaseClient, msg: OnceMessage): Promise<SendOnceResult> {
  return sendOnce({ ledger: supabaseLedger(admin), send: sendEmail }, msg);
}

type SendOpts = Parameters<typeof sendEmail>[0];

/**
 * Send one email and write it in the log, for mail that must go whatever the
 * log says.
 *
 * Receipts, support replies, seller notices and EIKON Box mail went straight
 * to Resend and left no row, so the admin could not see that a reader had
 * been sent their receipt, and the daily budget (lib/email/budget.ts) could
 * not count them. This writes the same email_sends row sendOnce does, under a
 * key that is unique to this send.
 *
 * THE LOG IS BEST EFFORT HERE, which is the opposite of sendOnce. sendOnce
 * refuses to send without its lock, because it exists to promise once. These
 * senders promise delivery instead: a receipt must not wait on a table, so a
 * log that cannot be written is reported to the server log and the email goes
 * anyway.
 */
export async function sendLoggedEmail(
  kind: string,
  opts: SendOpts & { userId?: string | null },
): Promise<SendResult> {
  const { userId = null, ...mail } = opts;
  const dedupeKey = `${kind}:${randomUUID()}`;
  let admin: SupabaseClient | null = null;
  try {
    admin = createAdminClient();
    const { error } = await admin.from(TABLE).insert({
      dedupe_key: dedupeKey,
      kind,
      user_id: userId,
      email: Array.isArray(mail.to) ? mail.to.join(", ") : mail.to,
      subject: mail.subject,
      status: "pending",
    });
    if (error) {
      console.warn(`[email] could not log ${kind}: ${error.message}`);
      admin = null;
    }
  } catch (e) {
    console.warn(`[email] could not log ${kind}: ${(e as Error).message}`);
    admin = null;
  }

  const result = await sendEmail(mail);

  if (admin) {
    const status = result.ok ? "sent" : result.skipped ? "skipped" : "failed";
    const { error } = await admin
      .from(TABLE)
      .update({
        status,
        error: result.ok ? null : (result.error ?? null),
        sent_at: result.ok ? new Date().toISOString() : null,
      })
      .eq("dedupe_key", dedupeKey);
    if (error) console.warn(`[email] could not record ${dedupeKey}: ${error.message}`);
  }
  return result;
}
