import { NextResponse, type NextRequest } from "next/server";
import { getAdminUser } from "@/lib/admin/access";
import { daysSince, windowStart } from "@/lib/admin/dayWindow";
import { pageviewRollup, type PageviewRollup } from "@/lib/admin/rollups";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Engagement: which pages and sections people actually return to, and how many
// visitors come back. Counted in the database from analytics_pageviews and
// analytics_sessions by admin_pageview_rollup (lib/admin/rollups.ts).
//   - views              : total pageviews
//   - visitors           : distinct sessions that opened a path
//   - viewsPerVisitor    : views divided by visitors (a revisit/stickiness signal)
//   - returning sessions : sessions seen across more than one calendar day
// Range: 7d | 30d | 90d | all (default 30d).

const SECTION_LABELS: Record<string, string> = {
  bible: "Bible",
  saints: "Saints",
  prayers: "Prayers",
  calendar: "Calendar",
  reading: "Reading",
  discover: "Discover",
  councils: "Councils",
  topics: "Topics",
  heresies: "Heresies",
  saved: "Saved",
  account: "Account",
  about: "About",
  faq: "FAQ",
  support: "Support",
  privacy: "Privacy",
  pricing: "Pricing",
  "whats-new": "What's new",
  "language-editor": "Language editor",
  signin: "Sign in",
  signup: "Sign up",
  admin: "Admin",
};

export async function GET(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const range = req.nextUrl.searchParams.get("range") ?? "30d";
  const supa = createAdminClient();

  // "all" is measured from the oldest session rather than a large constant.
  // daysSince caps it, so a single bad timestamp cannot widen the window to
  // years.
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

  // windowStart, not `now - days`: the unsnapped version dropped everything
  // that happened on the oldest day before the current time of day, quietly
  // truncating the first bar. Same helper the other charts use.
  const sinceIso = windowStart(days);

  // Counted in the database, not here. This route used to select the rows and
  // tally them in Node, and the API hands back at most 1,000 rows whatever
  // .limit() asks for, so every range reported exactly 1,000 views: the same
  // figure for 7 days and for all time. See lib/admin/rollups.ts.
  let rollup: PageviewRollup;
  try {
    rollup = await pageviewRollup(supa, sinceIso);
  } catch (e) {
    console.warn("[admin/engagement] rollup failed", (e as Error).message);
    // 200 with a reason, not a 500: adminJson turns a failed status into null
    // and the tab would then sit on "Loading" for ever.
    return NextResponse.json(
      { range, days, unavailable: "The page views could not be read just now." },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const perVisitor = (views: number, visitors: number) =>
    visitors ? Number((views / visitors).toFixed(2)) : 0;
  const withRatio = (p: { path: string; views: number; visitors: number }) => ({
    ...p,
    viewsPerVisitor: perVisitor(p.views, p.visitors),
  });

  const sections = rollup.sections.map((s) => ({
    section: s.segment ? (SECTION_LABELS[s.segment] ?? `/${s.segment}`) : "Home",
    views: s.views,
    visitors: s.visitors,
    viewsPerVisitor: perVisitor(s.views, s.visitors),
  }));

  // "Recurring users" and "signed-in users" used to be reported here, read
  // from analytics_sessions.user_id. Nothing has ever written that column:
  // app/api/track/route.ts records an anonymous session and no account. Both
  // were therefore 0 on every load and read as "nobody comes back". They are
  // gone rather than shown as a measurement that was never taken.
  const totals = {
    totalViews: rollup.totals.views,
    visitors: rollup.totals.visitors,
    avgPagesPerVisitor: perVisitor(rollup.totals.views, rollup.totals.visitors),
    returningSessions: rollup.sessions.returning,
    returnRate: rollup.sessions.total
      ? Math.round((rollup.sessions.returning / rollup.sessions.total) * 100)
      : 0,
  };

  return NextResponse.json(
    {
      range,
      days,
      generatedAt: new Date().toISOString(),
      totals,
      sections,
      topPages: rollup.topByVisitors.map(withRatio),
      revisited: rollup.revisited.map(withRatio),
      partial: rollup.partial,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
