import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin/access";
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
  const since30 = new Date(Date.now() - 30 * 86_400_000).toISOString();

  const [
    { data: bumpRows },
    { count: totalBumps },
    { data: pvRows },
    { data: overrides },
  ] = await Promise.all([
    supa
      .from("saint_bump_counts")
      .select("saint_slug, bumps, last_bumped_at")
      .order("bumps", { ascending: false })
      .limit(50),
    supa.from("saint_bumps").select("*", { count: "exact", head: true }),
    supa
      .from("analytics_pageviews")
      .select("path")
      .gte("ts", since30)
      .limit(200_000),
    supa.from("saint_overrides").select("slug, complete"),
  ]);

  // Per-saint pageview tally (anything under /saints/<slug>).
  const saintViews = new Map<string, number>();
  const councilViews = new Map<string, number>();
  const bibleViews = new Map<string, number>();
  const topicViews = new Map<string, number>();
  const pathT = new Map<string, number>();

  for (const r of pvRows ?? []) {
    pathT.set(r.path, (pathT.get(r.path) ?? 0) + 1);
    const p = r.path;
    if (p.startsWith("/saints/")) {
      const slug = p.split("/")[2]?.split("?")[0];
      if (slug) saintViews.set(slug, (saintViews.get(slug) ?? 0) + 1);
    } else if (p.startsWith("/councils/")) {
      const slug = p.split("/")[2]?.split("?")[0];
      if (slug) councilViews.set(slug, (councilViews.get(slug) ?? 0) + 1);
    } else if (p.startsWith("/bible/")) {
      const book = p.split("/")[2]?.split("?")[0];
      if (book) bibleViews.set(book, (bibleViews.get(book) ?? 0) + 1);
    } else if (p.startsWith("/topics/")) {
      const slug = p.split("/")[2]?.split("?")[0];
      if (slug) topicViews.set(slug, (topicViews.get(slug) ?? 0) + 1);
    }
  }

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
  const topPages = [...pathT.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([path, count]) => ({ path, count }));

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
      generatedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
