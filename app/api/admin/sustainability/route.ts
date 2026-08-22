import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchBmcTotal } from "@/lib/support/buymeacoffee";
import { SUPPORT } from "@/data/support/support";

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

  const [live, { data: history }, { data: expenses }, { data: currentMonthRow }] =
    await Promise.all([
      fetchBmcTotal().catch(() => null),
      supa
        .from("donations_monthly")
        .select("year_month, total_cents, supporters, goal_cents")
        .order("year_month", { ascending: true })
        .limit(12),
      supa
        .from("expense_lines")
        .select("id, label, monthly_cents, note, category, active, sort_order")
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

  const expenseRows =
    expenses && expenses.length > 0
      ? expenses
      : SUPPORT.expenses.map((e, i) => ({
          id: -1 - i,
          label: e.label,
          monthly_cents: Math.round(e.monthlyUsd * 100),
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
      expensesFromFallback: !expenses || expenses.length === 0,
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
