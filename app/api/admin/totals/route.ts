import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lifetime cumulative counts. These never shrink — that's the point.
// The Overview hero shows these as headline KPIs so the user never
// sees the number drop, even when the rolling 14-day window re-slides.
// Also returns the oldest-row timestamps so the UI can label things
// honestly ("since 2026-05-18") instead of implying these are recent.
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supa = createAdminClient();

  const [
    visitorsRes,
    pageviewsRes,
    signupsRes,
    bumpsRes,
    { data: oldestSessionRow },
    { data: oldestPageviewRow },
    { data: oldestProfileRow },
  ] = await Promise.all([
    supa.from("analytics_sessions").select("*", { count: "exact", head: true }),
    supa.from("analytics_pageviews").select("*", { count: "exact", head: true }),
    supa.from("profiles").select("*", { count: "exact", head: true }),
    supa.from("saint_bumps").select("*", { count: "exact", head: true }),
    supa
      .from("analytics_sessions")
      .select("first_seen")
      .order("first_seen", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supa
      .from("analytics_pageviews")
      .select("ts")
      .order("ts", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supa
      .from("profiles")
      .select("joined_at")
      .order("joined_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  // NULL, NOT ZERO, when a count could not be read. These are the four
  // headline lifetime figures and the comment at the top of this file promises
  // they never shrink, which `?? 0` broke in the one case that matters: a
  // failed read published four zeros under a heading that says they only ever
  // go up. The consumers already render `?? "—"`, so null reaches the screen
  // as a dash, which is what "we could not count" looks like.
  const failed =
    Boolean(visitorsRes.error) ||
    Boolean(pageviewsRes.error) ||
    Boolean(signupsRes.error) ||
    Boolean(bumpsRes.error);
  const count = (r: { count: number | null; error: unknown }) =>
    r.error ? null : r.count ?? 0;

  return NextResponse.json(
    {
      lifetimeVisitors: count(visitorsRes),
      lifetimePageviews: count(pageviewsRes),
      lifetimeSignups: count(signupsRes),
      lifetimeBumps: count(bumpsRes),
      oldestSessionAt: (oldestSessionRow?.first_seen as string | null) ?? null,
      oldestPageviewAt: (oldestPageviewRow?.ts as string | null) ?? null,
      oldestProfileAt: (oldestProfileRow?.joined_at as string | null) ?? null,
      generatedAt: new Date().toISOString(),
      unavailable: failed,
    },
    {
      // Honor the user's "no data resets" rule by serving from a tight
      // 60-second cache. Counts in the wild grow by single digits in
      // that span; the staleness is invisible and the load on Postgres
      // is bounded.
      //
      // A FAILED read is never cached. Caching one pins the dashes on screen
      // for a minute after the database has come back, which reads as the
      // outage continuing.
      headers: { "Cache-Control": failed ? "no-store" : "private, max-age=60" },
    },
  );
}
