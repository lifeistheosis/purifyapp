import { NextResponse } from "next/server";
import { getAdminUser, adminDebugEnabled } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Security overview: recent CSP reports (active + dismissed), rate-limit
// activity over the last hour, and the current debug-flag state.
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supa = createAdminClient();
  const sinceHour = new Date(Date.now() - 60 * 60_000).toISOString();
  const sinceDay = new Date(Date.now() - 24 * 60 * 60_000).toISOString();

  const [{ data: cspActive }, { data: cspDismissed }, { data: rlRows }, { count: cspTotal }] =
    await Promise.all([
      supa
        .from("csp_reports")
        .select("*")
        .is("dismissed_at", null)
        .order("received_at", { ascending: false })
        .limit(100),
      supa
        .from("csp_reports")
        .select("*")
        .not("dismissed_at", "is", null)
        .order("dismissed_at", { ascending: false })
        .limit(50),
      supa
        .from("rate_limits")
        .select("key, window_start, count")
        .gte("window_start", sinceHour)
        .order("count", { ascending: false })
        .limit(200),
      supa.from("csp_reports").select("*", { count: "exact", head: true }),
    ]);

  // Group rate-limit hits by their leading prefix ("track:", "bump:", etc).
  const rlByCategory = new Map<string, number>();
  for (const r of rlRows ?? []) {
    const cat = (r.key as string).split(":")[0];
    rlByCategory.set(cat, (rlByCategory.get(cat) ?? 0) + (r.count as number));
  }
  const rlBuckets = [...rlByCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([category, total]) => ({ category, total }));

  // Top single keys (specific IPs / users that have been busiest).
  const rlTopKeys = (rlRows ?? [])
    .slice(0, 20)
    .map((r) => ({
      key: r.key as string,
      windowStart: r.window_start as string,
      count: r.count as number,
    }));

  // Group CSP active by directive to power a quick BarChart.
  const cspByDirective = new Map<string, number>();
  for (const r of cspActive ?? []) {
    const d = (r.violated_directive as string) || "(unknown)";
    cspByDirective.set(d, (cspByDirective.get(d) ?? 0) + 1);
  }
  const cspDirectives = [...cspByDirective.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([directive, count]) => ({ directive, count }));

  // Quick 24h activity for analytics-related limits.
  const { data: rlDay } = await supa
    .from("rate_limits")
    .select("key, count")
    .gte("window_start", sinceDay)
    .limit(2000);
  let rlDayTotal = 0;
  for (const r of rlDay ?? []) rlDayTotal += r.count as number;

  // Top rate-limit offenders aggregated over the last 7 days, grouped by
  // the full key (category:identifier). Useful for spotting one IP or
  // user that's been hammering an endpoint.
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString();
  const { data: rl7d } = await supa
    .from("rate_limits")
    .select("key, count")
    .gte("window_start", since7d)
    .limit(20_000);
  const offenders = new Map<string, number>();
  for (const r of rl7d ?? []) {
    offenders.set(r.key as string, (offenders.get(r.key as string) ?? 0) + (r.count as number));
  }
  const topOffenders = [...offenders.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([key, count]) => ({ key, count }));

  // Account lifecycle — 30-day windows. We deliberately don't fetch user
  // identity here; only counts and dates.
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60_000).toISOString();
  const [
    { count: signups30d },
    { data: recentSignups },
    { count: profilesTotal },
  ] = await Promise.all([
    supa
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("joined_at", since30d),
    supa
      .from("profiles")
      .select("joined_at")
      .gte("joined_at", since30d)
      .order("joined_at", { ascending: true })
      .limit(1000),
    supa.from("profiles").select("id", { count: "exact", head: true }),
  ]);

  // Bucket signups by day for a sparkline.
  const signupsByDay = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60_000);
    signupsByDay.set(d.toISOString().slice(0, 10), 0);
  }
  for (const r of recentSignups ?? []) {
    const d = String(r.joined_at).slice(0, 10);
    if (signupsByDay.has(d)) signupsByDay.set(d, (signupsByDay.get(d) ?? 0) + 1);
  }
  const signupSeries = [...signupsByDay.entries()].map(([day, count]) => ({
    day,
    count,
  }));

  return NextResponse.json(
    {
      csp: {
        total: cspTotal ?? 0,
        active: cspActive ?? [],
        dismissed: cspDismissed ?? [],
        byDirective: cspDirectives,
      },
      rateLimits: {
        windowHour: rlBuckets,
        topKeysHour: rlTopKeys,
        last24hHits: rlDayTotal,
        topOffenders7d: topOffenders,
      },
      accounts: {
        total: profilesTotal ?? 0,
        signups30d: signups30d ?? 0,
        signupSeries,
      },
      flags: {
        adminDebugEnabled: adminDebugEnabled(),
      },
      generatedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
