import { NextResponse, type NextRequest } from "next/server";
import { getAdminUser } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Returns daily counts of visitors, pageviews, and signups over a window.
// Used by the Traffic tab's line chart and the Overview hero sparklines.
// Range: 7d | 30d | 90d (default 30d).
export async function GET(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const range = req.nextUrl.searchParams.get("range") ?? "30d";
  const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
  const supa = createAdminClient();
  const since = new Date(Date.now() - days * 86_400_000);
  since.setUTCHours(0, 0, 0, 0);
  const sinceIso = since.toISOString();

  const [{ data: sess }, { data: pv }, { data: prof }] = await Promise.all([
    supa
      .from("analytics_sessions")
      .select("first_seen")
      .gte("first_seen", sinceIso)
      .limit(50_000),
    supa
      .from("analytics_pageviews")
      .select("ts")
      .gte("ts", sinceIso)
      .limit(200_000),
    supa
      .from("profiles")
      .select("joined_at")
      .gte("joined_at", sinceIso)
      .limit(50_000),
  ]);

  // Bucket by UTC date (yyyy-mm-dd).
  const dayKey = (iso: string) => iso.slice(0, 10);
  const buckets = new Map<string, { visitors: number; views: number; signups: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setUTCDate(since.getUTCDate() + i);
    buckets.set(d.toISOString().slice(0, 10), {
      visitors: 0,
      views: 0,
      signups: 0,
    });
  }
  for (const r of sess ?? []) {
    const k = dayKey(r.first_seen);
    const b = buckets.get(k);
    if (b) b.visitors += 1;
  }
  for (const r of pv ?? []) {
    const k = dayKey(r.ts);
    const b = buckets.get(k);
    if (b) b.views += 1;
  }
  for (const r of prof ?? []) {
    const k = dayKey(r.joined_at);
    const b = buckets.get(k);
    if (b) b.signups += 1;
  }

  const points = [...buckets.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, v]) => ({ date, ...v }));

  return NextResponse.json(
    { range, days, points, generatedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
