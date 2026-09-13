/**
 * "That column is not there", as supabase-js reports it.
 *
 * A select or update naming a column the table lacks fails in Postgres with
 * 42703 (undefined_column), which PostgREST passes through. PostgREST can
 * also answer from its own schema cache with PGRST204 before Postgres sees
 * the query. Either one means a migration has not been applied yet, and the
 * caller should read or write the columns the table does have rather than
 * fail the whole request. lib/admin/tableAbsent.ts is the same idea one
 * level up.
 *
 * Pure, importable from route handlers and client modules alike.
 */
export function isColumnAbsent(
  err: { code?: string | null; message?: string | null } | null | undefined,
): boolean {
  if (!err) return false;
  if (err.code === "42703" || err.code === "PGRST204") return true;
  const message = err.message ?? "";
  return /column/i.test(message) && /does not exist|schema cache/i.test(message);
}
