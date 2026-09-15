import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin/access";
import { logActivity } from "@/lib/admin/activityLog";
import { runLifecycle } from "@/lib/email/lifecycle";
import { rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Run now: the daily account-email job, by hand.
 *
 * The same runLifecycle() the cron route calls. Pressing it twice sends
 * nothing the second time, because every email is keyed and sent once; the
 * report says so with a duplicate count rather than silence.
 */
export async function POST() {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (await rateLimited(`email-lifecycle:${adminUser.id}`, 60, 6)) {
    return NextResponse.json({ error: "Give it a minute between runs." }, { status: 429 });
  }

  const report = await runLifecycle(createAdminClient());
  void logActivity({
    actorEmail: adminUser.email ?? null,
    action: "email.lifecycle_run",
    entityType: "email_job",
    entityId: null,
    detail: { planned: report.planned, byKind: report.byKind, errors: report.errors },
  });

  return NextResponse.json(report, { status: report.errors.length > 0 ? 207 : 200 });
}
