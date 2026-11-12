import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin/access";
import { addDays, dueSummary, mergeBoard, plannedTasks, waitsOnHim } from "@/lib/admin/planner";
import { plannerEvidence } from "@/lib/admin/plannerEvidence";
import { readStoredTasks } from "@/lib/admin/plannerRead";
import { listProducts } from "@/lib/shop/catalog";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Two counts for the attention strip, "Still waiting on you": what needs him
 * and is past its day, and what needs him today. The board itself is
 * /api/admin/planner; this is the cheap read the shell polls, the way support
 * and community answer ?summary=1.
 *
 * HIS ONLY, from 2026-11-12, as the morning email (lib/admin/plannerDigest.ts,
 * his word that day, docs/plans/owner-desk.md section 1): the team's work (the
 * board message, the Sunday email, the monthly note, the feast shop email) is
 * on the board and never "behind" here, and a task he has given a later day
 * waits for it.
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
  const products = await listProducts({ limit: 60 });
  const planned = plannedTasks(from, today, products);
  const [stored, evidence] = await Promise.all([
    readStoredTasks(admin, { from, to: today }, planned.map((t) => t.ruleKey)),
    plannerEvidence(admin, { from, to: today }).catch(() => new Set<string>()),
  ]);

  const tasks = mergeBoard({ planned, stored: stored.rows, evidence }).filter(waitsOnHim);
  const due = dueSummary(tasks, today);

  return NextResponse.json(
    { overdue: due.overdue.length, today: due.today.length, ready: !stored.error },
    { headers: { "Cache-Control": "no-store" } },
  );
}
