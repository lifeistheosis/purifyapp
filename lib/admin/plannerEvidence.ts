import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Which of the week's deadlines are already met, decided by looking for the
 * work rather than by asking.
 *
 * A board that needs to be ticked by hand goes stale in a fortnight, and then
 * it lies in both directions. So the published board message, the sent
 * campaign, the open drop each tick their own task: the only things left to
 * tick by hand are the ones with nothing in the database to show for them.
 *
 * Every read swallows its own failure. A missing table means "no evidence",
 * never a broken board.
 */

export async function plannerEvidence(
  admin: SupabaseClient,
  range: { from: string; to: string },
): Promise<Set<string>> {
  const done = new Set<string>();
  const from = `${range.from}T00:00:00Z`;
  const to = `${range.to}T23:59:59Z`;

  // The patch note and the update shipped were read here too, until they left
  // the weekly plan for the release's own checklist (2026-11-12, lib/admin/planner.ts).
  const [board, campaigns, drops] = await Promise.all([
    admin.from("board_messages").select("week, status").gte("date", range.from).lte("date", range.to),
    admin.from("email_campaigns").select("kind, period_key").gte("created_at", from).lte("created_at", to),
    admin.from("eikon_drops").select("period_month, status"),
  ]);

  for (const b of (board.data ?? []) as { week: string; status: string }[]) {
    if (b.status === "published") done.add(`board:${b.week}`);
  }

  for (const c of (campaigns.data ?? []) as { kind: string; period_key: string }[]) {
    if (c.kind === "weekly") done.add(`email-weekly:${c.period_key}`);
    if (c.kind === "monthly") done.add(`email-monthly:${c.period_key}`);
    if (c.kind === "shop_feast") done.add(`shop-feast:${c.period_key}`);
  }

  for (const d of (drops.data ?? []) as { period_month: string; status: string }[]) {
    const ym = d.period_month.slice(0, 7);
    done.add(`eikon-create:${ym}`);
    if (d.status !== "draft" && d.status !== "cancelled") done.add(`eikon-open:${ym}`);
  }

  return done;
}
