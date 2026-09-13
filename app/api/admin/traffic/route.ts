import { NextResponse, type NextRequest } from "next/server";
import { getAdminUser } from "@/lib/admin/access";
import { daysSince, windowStart } from "@/lib/admin/dayWindow";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Daily counts of visitors, pageviews, and signups over a window. Used by
// the Traffic tab's line chart and the Overview hero sparklines.
// Range: 7d | 30d | 90d (default 30d).
//
// v9.7: now uses the `analytics_daily_buckets` SQL function for
// aggregation. The previous implementation fetched up to ~250k rows
// across three tables and bucketed them in JS, which silently truncated
// at the supabase-js row limit on active days and showed up in the chart
// as Pageviews stuck at 0. The RPC does the same work in a single
// round-trip and returns 0 (not null) for days with no activity.
export async function GET(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const range = req.nextUrl.searchParams.get("range") ?? "30d";
  const supa = createAdminClient();

  // "all" has no fixed length: it is measured from the oldest row that
  // exists. Resolved here rather than guessed with a large constant, because
  // the series is a generate_series in Postgres and every day in the window
  // is a real row whether or not anything happened on it. daysSince caps it,
  // so one bad timestamp cannot ask for years of empty buckets.
  let days: number;
  if (range === "all") {
    const { data: oldest } = await supa
      .from("analytics_sessions")
      .select("first_seen")
      .order("first_seen", { ascending: true })
      .limit(1)
      .maybeSingle();
    days = daysSince(oldest?.first_seen as string | undefined);
  } else {
    days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
  }
  // ENDS ON TODAY, and the fix is here rather than in the SQL.
  //
  // analytics_daily_buckets generates exactly p_days buckets starting at
  // p_since's date (20260608_analytics_daily_buckets.sql:35-38). This route
  // used to pass midnight of (today - days), so the series ran today-30 ..
  // today-1 and the current day never appeared. The loss was invisible in the
  // response: today's rows ARE aggregated by the function, then dropped by the
  // join against a series that has no bucket for them, so the endpoint still
  // returned a complete-looking array of exactly `days` points.
  //
  // Passing the start one day later gives the same number of buckets ending on
  // today. The function is untouched, so this needed no migration.
  const sinceIso = windowStart(days);

  const { data, error } = await supa.rpc("analytics_daily_buckets", {
    p_since: sinceIso,
    p_days: days,
  });

  if (error) {
    // Surface the error so we can see it in Render logs. The old route
    // silently returned an empty `pv` array on any query failure, which
    // is exactly what produced the "stuck at 0" symptom.
    console.error("[admin/traffic] analytics_daily_buckets failed", error);
    return NextResponse.json(
      {
        range,
        days,
        points: [],
        error: error.message ?? "aggregation failed",
        generatedAt: new Date().toISOString(),
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  type Row = { day: string; visitors: number | string; views: number | string; signups: number | string };
  const points = ((data ?? []) as Row[]).map((r) => ({
    // The RPC returns Postgres `date` which serializes to "YYYY-MM-DD"
    // — same shape the chart already expects.
    date: r.day,
    // Postgres `bigint` arrives as a string in the supabase-js JSON;
    // coerce defensively so the chart doesn't get strings on its axis.
    visitors: Number(r.visitors) || 0,
    views: Number(r.views) || 0,
    signups: Number(r.signups) || 0,
  }));

  return NextResponse.json(
    { range, days, points, generatedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
