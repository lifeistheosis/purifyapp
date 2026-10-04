import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin/access";
import { windowStart } from "@/lib/admin/dayWindow";
import { pageviewRollup, type PageviewRollup } from "@/lib/admin/rollups";
import { createAdminClient } from "@/lib/supabase/admin";
import { SAINTS, getSaint } from "@/lib/saints/saints";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Content-side leaderboards for the editorial team: which saints are getting
// bumped, which saint profiles are getting the most views, which Bible
// chapters / councils / topics are reading hottest. Merges the in-repo
// registry with the per-slug pageview tally.
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supa = createAdminClient();
  // The same 30 days as the Engagement tab: from midnight UTC, 29 days back.
  // It used to be 720 hours back from this instant, so the two tabs gave one
  // page two different counts. And only a window that starts at midnight can
  // be answered from the days already counted
  // (supabase/migrations/20261009000000_analytics_daily.sql); any other is
  // counted row by row, which is the slow way.
  const since30 = windowStart(30);

  // The page views are counted in the database (lib/admin/rollups.ts). This
  // route used to select them with .limit(200_000) and tally them here, and the
  // API hands back at most 1,000 rows whatever the limit says. On 2026-10-03
  // that was 1,000 of 230,040 views in 30 days, so St John Chrysostom, the most
  // bumped saint on the site, showed 0 views.
  const rollupRead: Promise<PageviewRollup | null> = pageviewRollup(supa, since30).catch((e) => {
    console.warn("[admin/content] rollup failed", (e as Error).message);
    return null;
  });

  const [
    { data: bumpRows },
    { count: totalBumps },
    rollup,
    { data: overrides },
  ] = await Promise.all([
    supa
      .from("saint_bump_counts")
      .select("saint_slug, bumps, last_bumped_at")
      .order("bumps", { ascending: false })
      .limit(50),
    supa.from("saint_bumps").select("*", { count: "exact", head: true }),
    rollupRead,
    supa.from("saint_overrides").select("slug, complete"),
  ]);

  // Views per saint, council, Bible book and topic: the second path segment
  // under each of those four sections.
  const saintViews = new Map<string, number>();
  const councilViews = new Map<string, number>();
  const bibleViews = new Map<string, number>();
  const topicViews = new Map<string, number>();
  const bySection: Record<string, Map<string, number>> = {
    saints: saintViews,
    councils: councilViews,
    bible: bibleViews,
    topics: topicViews,
  };
  for (const row of rollup?.slugs ?? []) bySection[row.section]?.set(row.slug, row.views);

  const overrideMap = new Map(
    (overrides ?? []).map((o) => [o.slug, o.complete as boolean | null]),
  );

  // Top bumped saints — merge registry + override `complete` flag.
  const topBumps = (bumpRows ?? [])
    .map((r) => {
      const s = getSaint(r.saint_slug);
      const ov = overrideMap.get(r.saint_slug);
      return {
        slug: r.saint_slug,
        name: s?.name ?? r.saint_slug,
        complete: ov === null || ov === undefined ? Boolean(s?.complete) : Boolean(ov),
        overridden: ov !== null && ov !== undefined,
        bumps: r.bumps as number,
        lastBumpedAt: r.last_bumped_at as string,
        views30d: saintViews.get(r.saint_slug) ?? 0,
      };
    })
    .filter((r) => r.bumps > 0)
    .slice(0, 20);

  // Top-viewed saint profiles.
  const topSaintsByViews = [...saintViews.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([slug, views]) => {
      const s = getSaint(slug);
      const ov = overrideMap.get(slug);
      return {
        slug,
        name: s?.name ?? slug,
        views,
        complete: ov === null || ov === undefined ? Boolean(s?.complete) : Boolean(ov),
      };
    });

  // Top councils + bible books + topics.
  const topCouncils = [...councilViews.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([slug, count]) => ({ slug, count }));
  const topBibleBooks = [...bibleViews.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([book, count]) => ({ book, count }));
  const topTopics = [...topicViews.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([slug, count]) => ({ slug, count }));

  // Top pages across the whole site.
  const topPages = (rollup?.topByViews ?? []).map((p) => ({ path: p.path, count: p.views }));

  // Editorial completion grid — every saint, with bump count + views +
  // effective complete flag. Useful for the "what should we ship next" view.
  const bumpBySlug = new Map<string, number>();
  for (const r of bumpRows ?? []) bumpBySlug.set(r.saint_slug, r.bumps as number);
  const saintGrid = SAINTS.map((s) => {
    const ov = overrideMap.get(s.slug);
    return {
      slug: s.slug,
      name: s.name,
      worksCount: s.works?.length ?? 0,
      bumps: bumpBySlug.get(s.slug) ?? 0,
      views30d: saintViews.get(s.slug) ?? 0,
      complete: ov === null || ov === undefined ? Boolean(s.complete) : Boolean(ov),
      overridden: ov !== null && ov !== undefined,
    };
  });

  return NextResponse.json(
    {
      topBumps,
      totalBumps: totalBumps ?? 0,
      topSaintsByViews,
      topCouncils,
      topBibleBooks,
      topTopics,
      topPages,
      saintGrid,
      // True when the page views could not be read at all: the view counts
      // above are then missing, not zero.
      viewsUnavailable: rollup === null,
      partial: rollup?.partial ?? null,
      generatedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
