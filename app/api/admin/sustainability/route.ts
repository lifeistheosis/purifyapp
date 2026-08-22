import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchBmcTotal } from "@/lib/support/buymeacoffee";
import { SUPPORT, type ExpenseLine } from "@/data/support/support";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Sustainability overview:
//   - Current month BMC raised + supporters (live)
//   - 12-month donations trend from donations_monthly snapshots
//   - Editable expense lines (DB-backed, falls back to data/support/support.ts)
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supa = createAdminClient();

  const [
    live,
    { data: history },
    { data: expenses, error: expensesError },
    { data: currentMonthRow },
  ] = await Promise.all([
      fetchBmcTotal().catch(() => null),
      supa
        .from("donations_monthly")
        .select("year_month, total_cents, supporters, goal_cents")
        .order("year_month", { ascending: true })
        .limit(12),
      supa
        .from("expense_lines")
        .select(
          "id, label, monthly_cents, amount_cents, cadence, note, category, active, sort_order",
        )
        .order("sort_order", { ascending: true })
        .order("id", { ascending: true }),
      supa
        .from("donations_monthly")
        .select("goal_cents")
        .eq("year_month", currentYearMonth())
        .maybeSingle(),
    ]);

  // Three values have historically claimed to be "the goal": the column
  // default (37500), the committed constant SUPPORT.monthlyGoalUsd, and
  // whatever row exists for this month. With no row, the public page showed
  // the constant while the column said something else, and neither surface
  // said which it was reporting. The flag makes the layer visible so the UI
  // can say "set for this month" rather than implying a decision nobody made.
  //
  // Checked by presence, not truthiness: a goal of 0 is a real and deliberate
  // value ("not asking this month") and `?? ` on a 0 would silently discard it.
  const goalSetForMonth = typeof currentMonthRow?.goal_cents === "number";
  const goalCents = goalSetForMonth
    ? (currentMonthRow!.goal_cents as number)
    : SUPPORT.monthlyGoalUsd * 100;

  // The error is checked, not discarded. Falling back on a FAILED read is a
  // different thing from falling back on an EMPTY table, and conflating them
  // is dangerous here: a read that fails because a column is missing during a
  // deploy window would render nine committed lines plus an "Adopt all" button
  // that writes every one of them again, duplicating a table that was never
  // empty. On a failure the panel gets an empty list and says so.
  const expenseRows =
    expensesError
      ? []
      : expenses && expenses.length > 0
      ? expenses
      : // Widened here rather than loosening the data file. That array ends in
        // `satisfies ExpenseLine[]`, which deliberately keeps each entry's
        // narrow literal type, so the optional cadence and amountUsd fields
        // are invisible on it until it is read as the declared type.
        (SUPPORT.expenses as ExpenseLine[]).map((e, i) => ({
          id: -1 - i,
          label: e.label,
          monthly_cents: Math.round(e.monthlyUsd * 100),
          // The committed list predates cadence, so its lines are monthly by
          // construction, and two of them are yearly costs a human had already
          // annualized by hand and explained in prose. Those become real
          // yearly rows the moment someone adopts and edits them; until then
          // the honest reading of the committed number is what it says.
          amount_cents: Math.round((e.amountUsd ?? e.monthlyUsd) * 100),
          cadence: e.cadence ?? "monthly",
          note: e.note ?? null,
          category: null,
          active: true,
          sort_order: i,
        }));

  const monthlyExpenseCents = expenseRows
    .filter((e) => e.active)
    .reduce((s, e) => s + e.monthly_cents, 0);

  return NextResponse.json(
    {
      current: {
        yearMonth: currentYearMonth(),
        raisedCents: live ? Math.round(live.monthlyRaisedUsd * 100) : 0,
        supporters: live?.supporters ?? 0,
        goalCents,
        goalSetForMonth,
        fetchedAt: live?.fetchedAt ?? null,
        live: Boolean(live),
      },
      history: history ?? [],
      expenses: expenseRows,
      // Three states, not two. Real rows, committed fallback rows, or a read
      // that failed. The third used to be indistinguishable from the second,
      // and the second offers an "Adopt all" button that writes every line
      // into the table, so a failed read could have duplicated a full ledger.
      expensesFromFallback: !expensesError && (!expenses || expenses.length === 0),
      expensesUnavailable: Boolean(expensesError),
      monthlyExpenseCents,
      generatedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

function currentYearMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
