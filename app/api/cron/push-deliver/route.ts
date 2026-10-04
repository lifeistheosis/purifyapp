import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deliverRemindersOnce } from "@/lib/push/deliver";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Hourly delivery of opt-in prayer reminders, for a scheduler that calls it
 * directly. The work is lib/push/deliver.ts; since 2026-10-04 the ten-minute
 * heartbeat (/api/cron/hourly-goals) runs the same function, and the two
 * share one claim per UTC hour, so calling this as well sends nothing twice.
 *
 * Auth: x-cron-secret header (same shape as /api/cron/bmc-snapshot).
 */
export async function GET(req: NextRequest) {
  // Degrade CLOSED, not open. This used to be `if (secret) { ...403... }`,
  // so with CRON_SECRET unset the check was skipped entirely and any
  // anonymous GET ran the handler under the service role. Verified against
  // production: this route answered a caller with no credentials at all.
  // Same shape as lib/shop/flags.ts, which refuses rather than assumes.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Closed in EVERY environment, not just production. fix/native-analytics-
    // blackout proposed leaving dev open "so the loop is easy to drive"; that
    // is the same shape as the bug being fixed, and a dev build pointed at a
    // production database is not hypothetical here.
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }
  {
    const provided =
      req.headers.get("x-cron-secret") ??
      req.nextUrl.searchParams.get("secret");
    if (provided !== secret) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const run = await deliverRemindersOnce(createAdminClient(), new Date());
  if (!run.claimed) {
    return NextResponse.json({ ok: true, skipped: "this hour's reminders already went out" });
  }

  // A query failure means we do not know who was due, which is not the same
  // as "nobody was due". Answer 500 so the scheduler's run goes red instead
  // of logging a cheerful zero forever.
  const { errors, web, native, campaigns } = run;
  if (errors.length > 0) {
    return NextResponse.json({ ok: false, errors, web, native, campaigns }, { status: 500 });
  }
  return NextResponse.json({ ok: true, web, native, campaigns });
}
