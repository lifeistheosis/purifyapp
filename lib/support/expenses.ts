import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { SUPPORT, type ExpenseLine } from "@/data/support/support";

/**
 * Source of truth for the /support expense list. Reads expense_lines
 * (admin-editable, RLS service-role only); falls back to the hardcoded
 * SUPPORT.expenses array so the public page never breaks if the table is
 * empty (fresh install, migration not yet run, or admin cleared it).
 */
export async function getExpenseLines(): Promise<ExpenseLine[]> {
  try {
    const supa = createAdminClient();
    const { data, error } = await supa
      .from("expense_lines")
      .select("label, monthly_cents, note, active, sort_order")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true });
    if (error || !data || data.length === 0) {
      return SUPPORT.expenses;
    }
    return data.map((r) => ({
      label: r.label as string,
      monthlyUsd: (r.monthly_cents as number) / 100,
      note: (r.note as string | null) ?? undefined,
    }));
  } catch {
    return SUPPORT.expenses;
  }
}

/**
 * Admin-set goal for the current month, or the static fallback.
 */
export async function getMonthlyGoalUsd(): Promise<number> {
  try {
    const supa = createAdminClient();
    const d = new Date();
    const yearMonth = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const { data } = await supa
      .from("donations_monthly")
      .select("goal_cents")
      .eq("year_month", yearMonth)
      .maybeSingle();
    if (data?.goal_cents) return (data.goal_cents as number) / 100;
  } catch {
    /* fall through */
  }
  return SUPPORT.monthlyGoalUsd;
}
