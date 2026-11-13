import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { isColumnAbsent } from "@/lib/supabase/columnAbsent";

import type { Subscriber } from "../preferences";

import type { RetentionKind } from "./kinds";

/**
 * Who is on each retention list, and stopping one by the token an email
 * carried.
 *
 * ON MEANS TRUE. A reader is on a list only when their column says true. No
 * row and null are off: the default is the absence of consent, as it is for
 * every list but release news (lib/email/preferences.ts). Nothing here makes
 * a row or turns anything on.
 *
 * BEFORE THE COLUMNS EXIST (20261113052927_retention_lists.sql not applied),
 * a list has nobody on it, and that is said as `absent`, not as an error: the
 * daily job must not go red every morning for a migration that waits on a
 * signature.
 */

export type RetentionSubscribers = {
  subscribers: Subscriber[];
  /** True when the list's column is not in the table yet. */
  absent: boolean;
  error: string | null;
};

/**
 * Everyone who turned a list on, with the token their email must carry, in
 * pages of one list ordered by its key (lib/email/preferences.ts says why).
 */
export async function retentionSubscribers(admin: SupabaseClient, kind: RetentionKind): Promise<RetentionSubscribers> {
  const out: Subscriber[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin
      .from("email_preferences")
      .select("user_id, unsubscribe_token")
      .eq(kind, true)
      .order("user_id")
      .range(from, from + 999);
    if (error && isColumnAbsent(error)) return { subscribers: [], absent: true, error: null };
    if (error) return { subscribers: [], absent: false, error: `email_preferences.${kind}: ${error.message}` };
    const rows = (data ?? []) as { user_id: string; unsubscribe_token: string }[];
    for (const r of rows) out.push({ userId: r.user_id, unsubscribeToken: r.unsubscribe_token });
    if (rows.length < 1000) return { subscribers: out, absent: false, error: null };
  }
}

/**
 * Stop one retention list by the token an email carried. No sign-in: the
 * token can only ever stop email. True when a row matched. A column that is
 * not there yet is a list nobody is on, so there is nothing to stop.
 */
export async function stopRetentionByToken(admin: SupabaseClient, token: string, kind: RetentionKind): Promise<boolean> {
  const { data, error } = await admin
    .from("email_preferences")
    .update({ [kind]: false, updated_at: new Date().toISOString() })
    .eq("unsubscribe_token", token)
    .select("user_id");
  if (error && isColumnAbsent(error)) return false;
  if (error) throw new Error(error.message);
  return (data ?? []).length > 0;
}
