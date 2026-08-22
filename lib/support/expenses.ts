import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { SUPPORT, type ExpenseLine } from "@/data/support/support";
import { asCadence } from "@/lib/support/cadence";

/**
 * The numbers behind /support, and where each one came from.
 *
 * WHY PROVENANCE IS PART OF THE RETURN VALUE. This page's whole argument is
 * transparency: it tells readers what running Purify costs and asks them to
 * cover it. Until v4 it read live rows from expense_lines, fell back silently
 * to a hardcoded list when that read failed, and stamped whichever it got with
 * SUPPORT.lastUpdated, a string constant reading "May 22, 2026".
 *
 * So a cost edited this morning was published under a May date, and a database
 * outage published May's numbers as though they were today's, with nothing on
 * the page able to tell a reader either had happened. A transparency page that
 * cannot distinguish live data from a stale fallback is not being transparent;
 * it is being confident.
 *
 * These functions therefore return the data AND how it was obtained, and the
 * page is responsible for saying so. The admin API has always done this
 * (expensesFromFallback in app/api/admin/sustainability/route.ts); the public
 * surface, which is the one that matters, never did.
 */

export type ExpenseData = {
  lines: ExpenseLine[];
  /** True when the live read failed or returned nothing and the committed
      list in data/support/support.ts is being shown instead. */
  fromFallback: boolean;
  /** Most recent edit across the live rows. Null on the fallback path, where
      there is no honest date to give. */
  updatedAt: Date | null;
};

export async function getExpenses(): Promise<ExpenseData> {
  const fallback: ExpenseData = {
    lines: SUPPORT.expenses,
    fromFallback: true,
    updatedAt: null,
  };
  try {
    const supa = createAdminClient();
    const { data, error } = await supa
      .from("expense_lines")
      .select(
        "label, monthly_cents, amount_cents, cadence, note, active, sort_order, updated_at",
      )
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true });
    if (error || !data || data.length === 0) return fallback;

    // The newest edit across the visible rows. A row deleted this morning
    // cannot be represented here, which is a known and accepted limit: this
    // date answers "when did what you are reading last change", not "when was
    // the ledger last touched".
    let updatedAt: Date | null = null;
    for (const r of data) {
      const raw = r.updated_at as string | null;
      if (!raw) continue;
      const d = new Date(raw);
      if (!Number.isNaN(d.getTime()) && (!updatedAt || d > updatedAt)) updatedAt = d;
    }

    return {
      lines: data.map((r) => ({
        label: r.label as string,
        monthlyUsd: (r.monthly_cents as number) / 100,
        // asCadence, not a cast. This client is untyped and the column is new,
        // so a row written before the migration, or by a build that does not
        // know the column, arrives as null. Reading that as monthly is right:
        // it is what every row meant before the column existed.
        cadence: asCadence(r.cadence),
        amountUsd:
          typeof r.amount_cents === "number"
            ? r.amount_cents / 100
            : (r.monthly_cents as number) / 100,
        note: (r.note as string | null) ?? undefined,
      })),
      fromFallback: false,
      updatedAt,
    };
  } catch {
    return fallback;
  }
}

export type GoalData = {
  usd: number;
  /** True when a row exists for the current month. False means the reader is
      seeing the committed default, which is a different claim entirely. */
  setForMonth: boolean;
};

export async function getMonthlyGoal(): Promise<GoalData> {
  try {
    const supa = createAdminClient();
    const d = new Date();
    const yearMonth = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const { data } = await supa
      .from("donations_monthly")
      .select("goal_cents")
      .eq("year_month", yearMonth)
      .maybeSingle();
    // A goal of zero is a real, deliberate value ("we are not asking this
    // month"), so this checks for the row rather than for truthiness. The
    // previous `if (data?.goal_cents)` treated 0 as absent and silently
    // published the default instead.
    if (data && typeof data.goal_cents === "number") {
      return { usd: data.goal_cents / 100, setForMonth: true };
    }
  } catch {
    /* fall through */
  }
  return { usd: SUPPORT.monthlyGoalUsd, setForMonth: false };
}
