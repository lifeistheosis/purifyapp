import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { isTableAbsent } from "@/lib/admin/tableAbsent";

/**
 * Keeps the anonymous reports only as long as their privacy lines promise
 * (approved by Edgar on 2026-11-09), once a day from the maintenance
 * heartbeat (lib/ops/maintenance.ts):
 *
 *   app_errors      14 days  (admin A10, docs/1.9-build/sql/app-errors.sql)
 *   search_misses   90 days  (admin A11, docs/1.9-build/sql/search-misses.sql)
 *
 * A table not created yet is said ("absent"), never an error.
 */

export type PruneResult = number | "absent" | "failed";

export const KEEP_DAYS = { app_errors: 14, search_misses: 90 } as const;

async function pruneTable(
  admin: SupabaseClient,
  table: keyof typeof KEEP_DAYS,
  column: "at" | "day",
  now: Date,
): Promise<PruneResult> {
  const cutoff = new Date(now.getTime() - KEEP_DAYS[table] * 86_400_000);
  const bound = column === "day" ? cutoff.toISOString().slice(0, 10) : cutoff.toISOString();
  try {
    const { error, count } = await admin.from(table).delete({ count: "exact" }).lt(column, bound);
    if (error) return isTableAbsent(error) ? "absent" : "failed";
    return count ?? 0;
  } catch {
    return "failed";
  }
}

export async function pruneReports(admin: SupabaseClient, now: Date = new Date()): Promise<Record<string, PruneResult>> {
  return {
    app_errors: await pruneTable(admin, "app_errors", "at", now),
    search_misses: await pruneTable(admin, "search_misses", "day", now),
  };
}
