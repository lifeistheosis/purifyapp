import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { StoredTask } from "./planner";

/** The columns of admin_tasks the board reads. */
export const TASK_COLUMNS = "id, title, notes, category, due_on, status, rule_key, auto";

/**
 * The stored rows a board between two days needs: every row dated inside the
 * span, and the row of each planned task in it, wherever its day is now.
 *
 * Read by the span alone, a planned task whose row had been given a later day
 * (his "not before", a month off) lost its row, and the task came back late
 * on its planned day: the morning email read a week ahead, the Calendar four,
 * so anything moved further was nagged about again (found 2026-11-12, on his
 * word about the "late" emails, docs/plans/owner-desk.md section 1).
 *
 * `error` is the first read that failed, so a caller can say the board is not
 * ready rather than show a board with its marks missing.
 */
export async function readStoredTasks(
  admin: SupabaseClient,
  span: { from: string; to: string },
  ruleKeys: readonly string[],
): Promise<{ rows: StoredTask[]; error: string | null }> {
  const keys = [...new Set(ruleKeys)];
  const pages: string[][] = [];
  for (let i = 0; i < keys.length; i += 100) pages.push(keys.slice(i, i + 100));
  const reads = await Promise.all([
    admin.from("admin_tasks").select(TASK_COLUMNS).gte("due_on", span.from).lte("due_on", span.to).limit(500),
    ...pages.map((page) => admin.from("admin_tasks").select(TASK_COLUMNS).in("rule_key", page).limit(500)),
  ]);
  const rows = new Map<string, StoredTask>();
  for (const r of reads) for (const s of (r.data ?? []) as StoredTask[]) rows.set(s.id, s);
  return { rows: [...rows.values()], error: reads.find((r) => r.error)?.error?.message ?? null };
}
