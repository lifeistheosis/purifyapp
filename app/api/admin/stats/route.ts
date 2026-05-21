import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";

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

  // Live sessions (with coarse geo) + their most recent page.
  const { data: liveRows } = await supa
    .from("analytics_sessions")
    .select("session_id, city, region, country, country_code, lat, lng, last_seen")
    .gt("last_seen", liveSince)
    .order("last_seen", { ascending: false })
    .limit(500);

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
  const [{ count: todayVisitors }, { count: todayViews }, { count: signupsToday }, { count: totalUsers }] =
    await Promise.all([
      supa.from("analytics_sessions").select("*", { count: "exact", head: true }).gte("first_seen", todayIso),
      supa.from("analytics_pageviews").select("*", { count: "exact", head: true }).gte("ts", todayIso),
      supa.from("profiles").select("*", { count: "exact", head: true }).gte("joined_at", todayIso),
      supa.from("profiles").select("*", { count: "exact", head: true }),
    ]);

  // Top pages today (aggregate client-capped sample).
  const { data: pagesToday } = await supa
    .from("analytics_pageviews")
    .select("path")
    .gte("ts", todayIso)
    .limit(5000);
  const pageTally = new Map<string, number>();
  for (const r of pagesToday ?? []) pageTally.set(r.path, (pageTally.get(r.path) ?? 0) + 1);
  const topPages = [...pageTally.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([path, count]) => ({ path, count }));

  // Top countries today.
  const { data: sessToday } = await supa
    .from("analytics_sessions")
    .select("country, country_code")
    .gte("first_seen", todayIso)
    .limit(5000);
  const countryTally = new Map<string, { name: string; code: string | null; count: number }>();
  for (const r of sessToday ?? []) {
    const name = r.country ?? "Unknown";
    const e = countryTally.get(name) ?? { name, code: r.country_code ?? null, count: 0 };
    e.count += 1;
    countryTally.set(name, e);
  }
  const topCountries = [...countryTally.values()].sort((a, b) => b.count - a.count).slice(0, 8);

  return NextResponse.json(
    {
      liveCount: sessions.length,
      sessions,
      today: {
        visitors: todayVisitors ?? 0,
        views: todayViews ?? 0,
        signups: signupsToday ?? 0,
      },
      totalUsers: totalUsers ?? 0,
      topPages,
      topCountries,
      generatedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
