import { NextResponse, type NextRequest } from "next/server";

import { runLifecycle } from "@/lib/email/lifecycle";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The daily account-email job: "your Plus ends in three days", "your Plus has
 * ended", the one winback, and the EIKON claim-window reminder.
 *
 * NOT ON GITHUB ACTIONS. Every other scheduled job here is called from
 * .github/workflows/cron.yml, and Actions billing has been stopped since
 * August, so a job added there would simply never run. Point a Render cron job
 * at this route once a day, with the x-cron-secret header. The admin Email
 * tab's Run now calls the same runLifecycle(), so a missed day can be made up
 * by hand and nothing sends twice: see lib/email/lifecyclePlan.ts for the
 * windows and lib/email/sendOnce.ts for the lock.
 *
 * Auth copies app/api/cron/push-deliver exactly: closed in every environment
 * when CRON_SECRET is unset, because the open form of that check once let an
 * anonymous GET run a job under the service role in production.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }
  const provided = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
  if (provided !== secret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const report = await runLifecycle(createAdminClient());
  // A failed read is a failed run: answer non-2xx so the scheduler shows red
  // instead of logging a cheerful zero forever.
  return NextResponse.json(report, { status: report.errors.length > 0 ? 500 : 200 });
}
