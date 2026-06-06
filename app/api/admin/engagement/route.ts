import { NextResponse, type NextRequest } from "next/server";
import { getAdminUser } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Engagement: which pages and sections people actually return to, and how many
// visitors come back. Derived from analytics_pageviews (session_id, path, ts)
// and analytics_sessions (session_id, user_id, first_seen, last_seen).
//   - views        — total pageviews
//   - visitors     — distinct sessions that opened a path
//   - viewsPerVisitor — views ÷ visitors (a revisit/stickiness signal)
//   - returning sessions — sessions seen across more than one calendar day
//   - recurring users    — signed-in users with two or more sessions
// Range: 7d | 30d | 90d (default 30d).

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

function cleanPath(path: string): string {
  let p = (path || "/").split("#")[0].split("?")[0];
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p || "/";
}

function sectionOf(path: string): string {
  const seg = cleanPath(path).split("/").filter(Boolean)[0];
  if (!seg) return "Home";
  return SECTION_LABELS[seg] ?? `/${seg}`;
}

export async function GET(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const range = req.nextUrl.searchParams.get("range") ?? "30d";
  const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
  const supa = createAdminClient();
  const since = new Date(Date.now() - days * 86_400_000);
  since.setUTCHours(0, 0, 0, 0);
  const sinceIso = since.toISOString();

  const [{ data: pv }, { data: sess }] = await Promise.all([
    supa
      .from("analytics_pageviews")
      .select("session_id, path, ts")
      .gte("ts", sinceIso)
      .limit(200_000),
    supa
      .from("analytics_sessions")
      .select("session_id, user_id, first_seen, last_seen")
      .gte("last_seen", sinceIso)
      .limit(50_000),
  ]);

  // ── Per-path and per-section aggregation ──────────────────────────────────
  const pageMap = new Map<string, { views: number; sessions: Set<string> }>();
  const sectionMap = new Map<string, { views: number; sessions: Set<string> }>();

  for (const r of pv ?? []) {
    const path = cleanPath(r.path);
    let pe = pageMap.get(path);
    if (!pe) {
      pe = { views: 0, sessions: new Set() };
      pageMap.set(path, pe);
    }
    pe.views += 1;
    pe.sessions.add(r.session_id);

    const sec = sectionOf(r.path);
    let se = sectionMap.get(sec);
    if (!se) {
      se = { views: 0, sessions: new Set() };
      sectionMap.set(sec, se);
    }
    se.views += 1;
    se.sessions.add(r.session_id);
  }

  const pages = [...pageMap.entries()].map(([path, e]) => ({
    path,
    views: e.views,
    visitors: e.sessions.size,
    viewsPerVisitor: e.sessions.size
      ? Number((e.views / e.sessions.size).toFixed(2))
      : 0,
  }));

  const topPages = [...pages].sort((a, b) => b.visitors - a.visitors).slice(0, 25);

  // Most revisited: highest views-per-visitor among pages with enough reach
  // that the ratio is meaningful (avoids a 1-visitor/3-view page topping it).
  const MIN_VISITORS = 5;
  const revisited = [...pages]
    .filter((p) => p.visitors >= MIN_VISITORS)
    .sort((a, b) => b.viewsPerVisitor - a.viewsPerVisitor)
    .slice(0, 15);

  const sections = [...sectionMap.entries()]
    .map(([section, e]) => ({
      section,
      views: e.views,
      visitors: e.sessions.size,
      viewsPerVisitor: e.sessions.size
        ? Number((e.views / e.sessions.size).toFixed(2))
        : 0,
    }))
    .sort((a, b) => b.views - a.views);

  // ── Recurrence ────────────────────────────────────────────────────────────
  const totalSessions = (sess ?? []).length;
  let returningSessions = 0;
  const sessionsByUser = new Map<string, number>();
  for (const s of sess ?? []) {
    if (
      s.first_seen &&
      s.last_seen &&
      s.last_seen.slice(0, 10) > s.first_seen.slice(0, 10)
    ) {
      returningSessions += 1;
    }
    if (s.user_id) {
      sessionsByUser.set(s.user_id, (sessionsByUser.get(s.user_id) ?? 0) + 1);
    }
  }
  const signedInUsers = sessionsByUser.size;
  let recurringUsers = 0;
  for (const n of sessionsByUser.values()) if (n >= 2) recurringUsers += 1;

  const totalViews = (pv ?? []).length;
  const visitors = new Set((pv ?? []).map((r) => r.session_id)).size;

  const totals = {
    totalViews,
    visitors,
    avgPagesPerVisitor: visitors
      ? Number((totalViews / visitors).toFixed(2))
      : 0,
    returningSessions,
    returnRate: totalSessions
      ? Math.round((returningSessions / totalSessions) * 100)
      : 0,
    signedInUsers,
    recurringUsers,
    recurringRate: signedInUsers
      ? Math.round((recurringUsers / signedInUsers) * 100)
      : 0,
  };

  return NextResponse.json(
    {
      range,
      days,
      generatedAt: new Date().toISOString(),
      totals,
      sections,
      topPages,
      revisited,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
