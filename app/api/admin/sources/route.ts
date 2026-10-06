import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin/access";
import { rollupArrivals } from "@/lib/admin/arrivals";
import { windowStart } from "@/lib/admin/dayWindow";
import { createAdminClient } from "@/lib/supabase/admin";
import { pageAll } from "@/lib/supabase/pageAll";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Where visits came from and what they were read on, over a window. Used by
 * the Sources panel of the Traffic tab.
 *
 * The owner, 2026-10-06: "I kind of want to start tracking where my traffic
 * is coming from and what platform they're using to view Purify." Both were
 * already on every session row, the referrer and the user agent, kept since
 * the first analytics commit and read by nothing. This reads them
 * (lib/analytics/source.ts and platform.ts say how) and sends only the
 * counts: no referrer and no user agent leaves the server.
 *
 * ON ITS OWN ROUTE, AND NOT POLLED. /api/admin/stats is read every five
 * seconds and carries the same two readings for the handful of sessions that
 * are live. A window of days is thousands of rows, read a page at a time, so
 * it is asked for when the panel opens or the range changes and not on a
 * timer (the note in the stats route says why its own top lists were removed).
 *
 * The rows are counted here, not in the database, because the rules are a
 * table of names in TypeScript that a SQL copy would have to be kept in step
 * with. Thirty days was about 14,000 sessions on 2026-10-03, fourteen pages.
 * If that grows past what a request should carry, the answer says the count
 * is partial instead of passing a short one off as whole.
 */

const RANGES = { "1d": 1, "7d": 7, "30d": 30 } as const;
type Range = keyof typeof RANGES;

/** The most sessions one answer reads. */
const MOST_ROWS = 40_000;

const NO_STORE = { headers: { "Cache-Control": "no-store" } };

export async function GET(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const asked = new URL(req.url).searchParams.get("range") ?? "7d";
  const range: Range = asked in RANGES ? (asked as Range) : "7d";
  const windowDays = RANGES[range];
  const since = windowStart(windowDays);

  const supa = createAdminClient();
  let rows: { referrer: string | null; user_agent: string | null }[];
  try {
    rows = await pageAll(
      (from, to) =>
        supa
          .from("analytics_sessions")
          .select("referrer, user_agent")
          .gte("first_seen", since)
          .order("session_id")
          .range(from, to),
      MOST_ROWS,
    );
  } catch (e) {
    console.warn("[admin/sources] sessions read failed", (e as Error).message);
    // 200 with a reason, not a 500: adminJson turns a failed status into null
    // and the panel would then sit on "Loading" for ever.
    return NextResponse.json({ range, windowDays, unavailable: "The sessions could not be read just now." }, NO_STORE);
  }

  return NextResponse.json(
    {
      range,
      windowDays,
      since,
      ...rollupArrivals(rows),
      partial: rows.length >= MOST_ROWS ? { rows: rows.length } : null,
      generatedAt: new Date().toISOString(),
    },
    NO_STORE,
  );
}
