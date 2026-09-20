import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin/access";
import { addDays, dueSummary, mergeBoard, plannedTasks, type StoredTask } from "@/lib/admin/planner";
import { plannerEvidence } from "@/lib/admin/plannerEvidence";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Two counts for the attention strip: deadlines past their day, and deadlines
 * due today. The board itself is /api/admin/planner; this is the cheap read
 * the shell polls, the way support and community answer ?summary=1.
 *
 * TODAY IS THE SERVER'S UTC DAY here, not the operator's. The strip says "3
 * late", never a date, so an hour either side of midnight changes a count by
 * at most one, and the board itself resolves the day on the device.
 */
export async function GET() {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const today = new Date().toISOString().slice(0, 10);
  // Six weeks back is as far as a missed deadline is worth nagging about.
  const from = addDays(today, -42);

  const admin = createAdminClient();
  const [stored, evidence] = await Promise.all([
    admin.from("admin_tasks").select("id, title, notes, category, due_on, status, rule_key, auto").gte("due_on", from).lte("due_on", today).limit(500),
    plannerEvidence(admin, { from, to: today }).catch(() => new Set<string>()),
  ]);

  const tasks = mergeBoard({
    planned: plannedTasks(from, today),
    stored: (stored.data ?? []) as StoredTask[],
    evidence,
  });
  const due = dueSummary(tasks, today);

  return NextResponse.json(
    { overdue: due.overdue.length, today: due.today.length, ready: !stored.error },
    { headers: { "Cache-Control": "no-store" } },
  );
}
