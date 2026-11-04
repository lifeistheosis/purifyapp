import { NextResponse, type NextRequest } from "next/server";
import { getAdminUser } from "@/lib/admin/access";
import { daysSince, parseLatestDay, windowEnd } from "@/lib/admin/dayWindow";
import { rangeDays } from "@/lib/admin/trafficChart";
import { createTrafficSeries, type DayPoint } from "@/lib/admin/trafficSeries";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Daily counts of visitors, pageviews, and signups over a window. Used by
// the Traffic tab's line chart and the Overview hero sparklines.
// Range: 7d | 14d | 21d | 30d | 60d | 90d | 120d | all (default 30d).
// Latest: now | complete (default now). "now" ends on today, still running;
// "complete" ends on yesterday, so every bucket is a finished day. See
// windowEnd in lib/admin/dayWindow.ts.
//
// v9.7: now uses the `analytics_daily_buckets` SQL function for
// aggregation. The previous implementation fetched up to ~250k rows
// across three tables and bucketed them in JS, which silently truncated
// at the supabase-js row limit on active days and showed up in the chart
// as Pageviews stuck at 0. The RPC does the same work in a single
// round-trip and returns 0 (not null) for days with no activity.
//
// 2026-11-04: the days that are over are counted once per server and kept
// (lib/admin/trafficSeries.ts says why and how), and only the day still
// running is counted on each request. Same function, same figures, a
// fraction of the rows: the owner found the chart slow on first open, and
// every open used to count about a million page views.
//
// ENDS ON TODAY. analytics_daily_buckets generates exactly p_days buckets
// starting at p_since's date (20260608000000_analytics_daily_buckets.sql), and
// counts from p_since onward. This route once passed midnight of
// (today - days), so the series ran today-30 .. today-1 and the current day
// never appeared; trafficSeries asks for each run of days from that run's own
// first midnight, so every day it asks for is a bucket it gets back.

type Row = { day: string; visitors: number | string; views: number | string; signups: number | string };

// One per server process. Render runs one long-lived Node server, so the days
// kept here outlive a request; a deploy starts it empty, and the first open
// after it counts the window once.
const series = createTrafficSeries(async (sinceIso, days) => {
  const { data, error } = await createAdminClient().rpc("analytics_daily_buckets", {
    p_since: sinceIso,
    p_days: days,
  });
  if (error) throw new Error(error.message ?? "aggregation failed");
  return ((data ?? []) as Row[]).map(
    (r): DayPoint => ({
      // The RPC returns Postgres `date`, which serializes to "YYYY-MM-DD".
      date: String(r.day).slice(0, 10),
      // Postgres `bigint` arrives as a string in the supabase-js JSON;
      // coerce defensively so the chart doesn't get strings on its axis.
      visitors: Number(r.visitors) || 0,
      views: Number(r.views) || 0,
      signups: Number(r.signups) || 0,
    }),
  );
});

export async function GET(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const range = req.nextUrl.searchParams.get("range") ?? "30d";
  const latest = parseLatestDay(req.nextUrl.searchParams.get("latest"));

  // "all" has no fixed length: it is measured from the oldest row that
  // exists. Resolved here rather than guessed with a large constant, because
  // the series is a generate_series in Postgres and every day in the window
  // is a real row whether or not anything happened on it. daysSince caps it,
  // so one bad timestamp cannot ask for years of empty buckets.
  let days: number;
  if (range === "all") {
    const { data: oldest } = await createAdminClient()
      .from("analytics_sessions")
      .select("first_seen")
      .order("first_seen", { ascending: true })
      .limit(1)
      .maybeSingle();
    days = daysSince(oldest?.first_seen as string | undefined, windowEnd(latest));
  } else {
    days = rangeDays(range);
  }

  try {
    const { points, through, counted } = await series.series(days, latest);
    return NextResponse.json(
      { range, days, latest, through, points, counted, generatedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    // Surface the error so we can see it in Render logs. The old route
    // silently returned an empty `pv` array on any query failure, which
    // is exactly what produced the "stuck at 0" symptom.
    console.error("[admin/traffic] analytics_daily_buckets failed", error);
    return NextResponse.json(
      {
        range,
        days,
        latest,
        points: [],
        error: error instanceof Error ? error.message : "aggregation failed",
        generatedAt: new Date().toISOString(),
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
