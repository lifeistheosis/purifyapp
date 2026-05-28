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
      },
      flags: {
        adminDebugEnabled: adminDebugEnabled(),
      },
      generatedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
