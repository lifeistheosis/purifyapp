/**
 * "That table is not there", as supabase-js actually reports it.
 *
 * lib/admin/activityLog.ts tests for 42P01, the Postgres undefined_table
 * code, and that is what a direct connection returns. supabase-js goes
 * through PostgREST, and PostgREST answers a missing relation from its own
 * schema cache with code PGRST205 and the message "Could not find the table
 * 'public.x' in the schema cache", before Postgres ever sees the query.
 * Verified 2026-09-04 against production with patch_notes unapplied. A route
 * that only checks 42P01 reports "absent" as a generic 500.
 *
 * Both are accepted here, and the message as a last resort, because the
 * distinction between "not applied yet" and "broken" is the one the admin
 * panel exists to make.
 */
export function isTableAbsent(
  err: { code?: string | null; message?: string | null } | null | undefined,
): boolean {
  if (!err) return false;
  if (err.code === "42P01" || err.code === "PGRST205") return true;
  return /schema cache/i.test(err.message ?? "") && /could not find the table/i.test(err.message ?? "");
}

/**
 * "That column is not there", the same way. Selecting or writing a column a
 * migration has not yet added is PostgREST's PGRST204 ("Could not find the
 * 'x' column of 'y' in the schema cache") through supabase-js, or Postgres's
 * 42703 on a direct connection. The shop's simple-management columns
 * (blessing_available, deleted_at, thumb_url) ship ahead of their migration
 * and every write that names them retries without them on this answer.
 */
export function isColumnAbsent(
  err: { code?: string | null; message?: string | null } | null | undefined,
): boolean {
  if (!err) return false;
  if (err.code === "42703" || err.code === "PGRST204") return true;
  return /schema cache/i.test(err.message ?? "") && /could not find the .* column/i.test(err.message ?? "");
}
