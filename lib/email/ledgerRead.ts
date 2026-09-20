import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { LedgerRow } from "./mailings";

/**
 * Reading the whole send log (email_sends) for the admin's tracking views.
 *
 * Paged, because PostgREST returns at most 1,000 rows a request and the log
 * grows by up to a hundred a day. `cap` stops a runaway read: at the plan's
 * limit that is years of mail, and a view that has read that much should say
 * so rather than hang.
 */

const COLUMNS = "dedupe_key, kind, user_id, email, subject, status, error, created_at, sent_at";

export async function readLedger(
  admin: SupabaseClient,
  opts: { cap?: number } = {},
): Promise<{ rows: LedgerRow[]; truncated: boolean; error: string | null }> {
  const cap = opts.cap ?? 100_000;
  const rows: LedgerRow[] = [];
  for (let from = 0; from < cap; from += 1000) {
    const { data, error } = await admin
      .from("email_sends")
      .select(COLUMNS)
      .order("created_at", { ascending: true })
      .range(from, from + 999);
    if (error) return { rows, truncated: false, error: error.message };
    const page = (data ?? []) as LedgerRow[];
    rows.push(...page);
    if (page.length < 1000) return { rows, truncated: false, error: null };
  }
  return { rows, truncated: true, error: null };
}

/** Every row for one person: under their id, or under their address when logged without one. */
export async function readPersonLedger(
  admin: SupabaseClient,
  person: { id: string; email: string },
): Promise<{ rows: LedgerRow[]; error: string | null }> {
  const [byId, byEmail] = await Promise.all([
    admin.from("email_sends").select(COLUMNS).eq("user_id", person.id).order("created_at", { ascending: false }).limit(500),
    admin
      .from("email_sends")
      .select(COLUMNS)
      .is("user_id", null)
      .ilike("email", `%${person.email.replace(/[%_\\]/g, (c) => `\\${c}`)}%`)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);
  const error = byId.error?.message ?? byEmail.error?.message ?? null;
  // ilike is a substring match (bob@ would match jimbob@), so keep exact addresses only.
  const address = person.email.trim().toLowerCase();
  const exact = ((byEmail.data ?? []) as LedgerRow[]).filter((r) =>
    r.email.split(",").some((e) => e.trim().toLowerCase() === address),
  );
  const rows = [...((byId.data ?? []) as LedgerRow[]), ...exact].sort((a, b) =>
    a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0,
  );
  return { rows, error };
}
