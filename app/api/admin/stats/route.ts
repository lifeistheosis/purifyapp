import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSaint } from "@/lib/saints/saints";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIVE_WINDOW_MS = 90_000; // a session is "live" if seen in the last 90s

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supa = createAdminClient();
  const now = Date.now();
  const liveSince = new Date(now - LIVE_WINDOW_MS).toISOString();
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const todayIso = dayStart.toISOString();

  // ERRORS ARE BOUND, NOT DROPPED. supabase-js RESOLVES on a PostgREST
  // failure rather than rejecting, so `const { data } = await ...` yields
  // undefined and every `?? 0` below turned an unreadable table into a
  // confident zero, at HTTP 200. useLiveData only sets `failing` on a non-ok
  // response, so LiveTab rendered "Live now 0", an empty map and "No one on
  // the site right now" beside a green "updated 2s ago" stamp. There was no
  // dash, no amber dot and no log line: a working site read as a dead one and
  // nothing could contradict it.
  //
  // This is the same mechanism as the profiles.created_at bug fixed in
  // 3c899c25. Nulls below mean "could not read"; a genuinely empty table
  // still returns count 0 and still prints 0.
  const { data: liveRows, error: liveErr } = await supa
    .from("analytics_sessions")
    .select("session_id, city, region, country, country_code, lat, lng, last_seen")
    .gt("last_seen", liveSince)
    .order("last_seen", { ascending: false })
    .limit(500);

  if (liveErr) console.warn("[admin/stats] live sessions read failed", liveErr.message);
  const live = liveRows ?? [];
  const ids = live.map((r) => r.session_id);
  const latestPath = new Map<string, string>();
  if (ids.length) {
    const { data: pv } = await supa
      .from("analytics_pageviews")
      .select("session_id, path, ts")
      .in("session_id", ids)
      .order("ts", { ascending: false })
      .limit(1500);
    for (const row of pv ?? []) {
      if (!latestPath.has(row.session_id)) latestPath.set(row.session_id, row.path);
    }
  }

  const sessions = live.map((r) => ({
    id: r.session_id,
    city: r.city,
    region: r.region,
    country: r.country,
    countryCode: r.country_code,
    lat: r.lat,
    lng: r.lng,
    path: latestPath.get(r.session_id) ?? null,
    lastSeen: r.last_seen,
  }));

  // Today's totals.
  const [
    { count: todayVisitors, error: visErr },
    { count: todayViews, error: viewErr },
    { count: signupsToday, error: signErr },
    { count: totalUsers, error: usersErr },
  ] =
    await Promise.all([
      supa.from("analytics_sessions").select("*", { count: "exact", head: true }).gte("first_seen", todayIso),
      supa.from("analytics_pageviews").select("*", { count: "exact", head: true }).gte("ts", todayIso),
      supa.from("profiles").select("*", { count: "exact", head: true }).gte("joined_at", todayIso),
      supa.from("profiles").select("*", { count: "exact", head: true }),
    ]);

  const countErr = visErr ?? viewErr ?? signErr ?? usersErr;
  if (countErr) console.warn("[admin/stats] a count read failed", countErr.message);

  // TOP PAGES / COUNTRIES / REGIONS / LANGUAGES WERE COMPUTED HERE, and are
  // gone because nothing has ever read them.
  //
  // Three unaggregated selects ran per request, the largest pulling up to
  // 20,000 session rows across 30 days, all reduced in Node to top-8/10/12
  // lists. This route is polled by LiveTab every 5s and by ActivityFeed every
  // 20s, so that work ran about 15 times a minute, uncached, on the same
  // process that serves purifyapp.net to the public.
  //
  // Verified before deleting rather than taken on an auditor's word: the four
  // response keys have no reader among this route's three consumers
  // (ActivityFeed, LiveTab, OverviewTab). `topPages` does appear elsewhere in
  // the panel, which is what makes a plain grep misleading: ContentTab and
  // EngagementTab each read a topPages of their OWN, built by
  // /api/admin/content and /api/admin/engagement. Same name, different route,
  // untouched by this.
  //
  // If the language or country view is ever wanted back, build it as a SQL
  // aggregate on its own low-cadence route the way
  // supabase/migrations/20260608_analytics_daily_buckets.sql did, rather than
  // shipping raw rows to Node on a 5 second timer.

  // Top bumped saints — the editorial leaderboard the v6.5 bump system
  // feeds. Reads the public aggregate view so RLS doesn't matter; resolves
  // the slug back to a display name + complete flag via the in-repo registry.
  const { data: bumpRows } = await supa
    .from("saint_bump_counts")
    .select("saint_slug, bumps")
    .order("bumps", { ascending: false })
    .limit(20);
  const topBumps = (bumpRows ?? [])
    .map((r) => {
      const s = getSaint(r.saint_slug);
      return {
        slug: r.saint_slug,
        name: s?.name ?? r.saint_slug,
        complete: Boolean(s?.complete),
        bumps: r.bumps as number,
      };
    })
    .filter((r) => r.bumps > 0);

  const { count: totalBumps } = await supa
    .from("saint_bumps")
    .select("*", { count: "exact", head: true });

  return NextResponse.json(
    {
      // null when the read failed, so the panel shows a dash instead of a
      // zero it cannot stand behind. Every consumer already renders nullish
      // as an em dash, which is why this needed no client change.
      liveCount: liveErr ? null : sessions.length,
      sessions,
      today: {
        visitors: todayVisitors ?? null,
        views: todayViews ?? null,
        signups: signupsToday ?? null,
      },
      totalUsers: totalUsers ?? null,
      topBumps,
      totalBumps: totalBumps ?? null,
      generatedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
