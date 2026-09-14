import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { sendEmail } from "./send";
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
