import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { pageAll } from "@/lib/supabase/pageAll";

/**
 * Page views and sessions, counted in the database.
 *
 * ── Why this file exists ────────────────────────────────────────────────
 *
 * The API returns at most 1,000 rows however many a query asks for, and says
 * nothing when it stops. The Engagement, Content and Audience routes each
 * asked for 50,000 or 200,000 rows and tallied what came back, so each
 * tallied exactly 1,000. Measured on 2026-10-03: Engagement reported "1,000
 * views" for 30 days and for all time alike, against 230,040 and 615,062 real
 * ones; Content gave St John Chrysostom 0 views in 30 days; Audience drew its
 * country chart from 1,000 of 13,976 sessions.
 *
 * Paging 230,000 rows into Node on every tab open is the wrong repair, so the
 * counting is done by two database functions that answer with ONE row of
 * jsonb (supabase/migrations/20261007000100_admin_rollups.sql). A single row
 * cannot be cut at 1,000.
 *
 * ── Before that file is applied ─────────────────────────────────────────
 *
 * The functions are simply absent, and PostgREST says so with PGRST202. Then
 * this reads rows in pages, newest first, up to a stated cap, tallies them
 * with the same rules written out below, and says so in `partial`. The tabs
 * print that, so a count that is short is never shown as a whole one.
 *
 * The rules live here once and the SQL mirrors them: cleanPath, the first
 * segment as the section, the browser tests in their order. Change one, change
 * the other, and lib/admin/__tests__/rollups.test.ts says which rule moved.
 */

export const ROLLUP_MIGRATION = "supabase/migrations/20261007000100_admin_rollups.sql";

/** Newest page views read when the database function is missing. */
export const FALLBACK_PAGEVIEW_ROWS = 20_000;
/** Sessions read when the database function is missing. */
export const FALLBACK_SESSION_ROWS = 50_000;

export type PageCount = { path: string; views: number; visitors: number };

export type PartialRead = {
  /** Rows actually read. */
  rows: number;
  /** What needs applying for the whole count. */
  needs: string;
} | null;

export type PageviewRollup = {
  totals: { views: number; visitors: number };
  /** Sessions last seen in the window, and how many of them span more than one day. */
  sessions: { total: number; returning: number };
  /** By first path segment. `segment` is null for the home page. */
  sections: { segment: string | null; views: number; visitors: number }[];
  /** 25 pages, most distinct sessions first. */
  topByVisitors: PageCount[];
  /** 20 pages, most views first. */
  topByViews: PageCount[];
  /** 15 pages reached by five sessions or more, most views per session first. */
  revisited: PageCount[];
  /** Views per second segment under saints, councils, bible and topics. */
  slugs: { section: string; slug: string; views: number }[];
  partial: PartialRead;
};

export type AudienceRollup = {
  total: number;
  countries: { name: string; code: string | null; count: number }[];
  regions: { country: string; region: string; code: string | null; count: number }[];
  languages: { code: string; count: number }[];
  browsers: { name: string; count: number }[];
  devices: { mobile: number; desktop: number };
  partial: PartialRead;
};

/** The path as a reader would say it: no fragment, no query, one trailing slash dropped. */
export function cleanPath(path: string | null | undefined): string {
  let p = (path || "/").split("#")[0].split("?")[0];
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p || "/";
}

function segments(clean: string): [string | null, string | null] {
  const parts = clean.split("/").filter(Boolean);
  return [parts[0] ?? null, parts[1] ?? null];
}

const SLUG_SECTIONS = new Set(["saints", "councils", "bible", "topics"]);

type PageviewRow = { session_id: string; path: string | null };
type SessionSpan = { first_seen: string | null; last_seen: string | null };

/** The tally the database function does, written out. Used when it is absent, and by the tests. */
export function rollupPageviews(
  pageviews: readonly PageviewRow[],
  sessionRows: readonly SessionSpan[],
): Omit<PageviewRollup, "partial"> {
  const pages = new Map<string, { views: number; sessions: Set<string> }>();
  const sections = new Map<string | null, { views: number; sessions: Set<string> }>();
  const slugs = new Map<string, { section: string; slug: string; views: number }>();
  const everyone = new Set<string>();

  for (const r of pageviews) {
    const path = cleanPath(r.path);
    const [seg1, seg2] = segments(path);
    everyone.add(r.session_id);

    const page = pages.get(path) ?? { views: 0, sessions: new Set<string>() };
    page.views += 1;
    page.sessions.add(r.session_id);
    pages.set(path, page);

    const section = sections.get(seg1) ?? { views: 0, sessions: new Set<string>() };
    section.views += 1;
    section.sessions.add(r.session_id);
    sections.set(seg1, section);

    if (seg1 && seg2 && SLUG_SECTIONS.has(seg1)) {
      const key = `${seg1}/${seg2}`;
      const slug = slugs.get(key) ?? { section: seg1, slug: seg2, views: 0 };
      slug.views += 1;
      slugs.set(key, slug);
    }
  }

  const counts: PageCount[] = [...pages.entries()].map(([path, e]) => ({
    path,
    views: e.views,
    visitors: e.sessions.size,
  }));
  const byPath = (a: PageCount, b: PageCount) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  const perVisitor = (p: PageCount) => Math.round((p.views / p.visitors) * 100) / 100;

  let returning = 0;
  for (const s of sessionRows) {
    if (s.first_seen && s.last_seen && s.last_seen.slice(0, 10) > s.first_seen.slice(0, 10)) {
      returning += 1;
    }
  }

  return {
    totals: { views: pageviews.length, visitors: everyone.size },
    sessions: { total: sessionRows.length, returning },
    sections: [...sections.entries()]
      .map(([segment, e]) => ({ segment, views: e.views, visitors: e.sessions.size }))
      .sort((a, b) => b.views - a.views || (a.segment ?? "").localeCompare(b.segment ?? "")),
    topByVisitors: [...counts]
      .sort((a, b) => b.visitors - a.visitors || b.views - a.views || byPath(a, b))
      .slice(0, 25),
    topByViews: [...counts].sort((a, b) => b.views - a.views || byPath(a, b)).slice(0, 20),
    revisited: counts
      .filter((p) => p.visitors >= 5)
      .sort((a, b) => perVisitor(b) - perVisitor(a) || b.visitors - a.visitors || byPath(a, b))
      .slice(0, 15),
    slugs: [...slugs.values()].sort(
      (a, b) => a.section.localeCompare(b.section) || b.views - a.views || a.slug.localeCompare(b.slug),
    ),
  };
}

/** Browser family from a user agent. The order of the tests is the rule. */
export function browserOf(userAgent: string | null | undefined): string {
  const ua = userAgent ?? "";
  if (/edg\//i.test(ua)) return "Edge";
  if (/chrome\//i.test(ua) && !/chromium/i.test(ua)) return "Chrome";
  if (/firefox\//i.test(ua)) return "Firefox";
  if (/safari\//i.test(ua)) return "Safari";
  if (/bot|crawl|spider/i.test(ua)) return "Bot";
  return "Other";
}

export function isMobileAgent(userAgent: string | null | undefined): boolean {
  return /mobile|android|iphone|ipad/i.test(userAgent ?? "");
}

type AudienceRow = {
  country: string | null;
  country_code: string | null;
  region: string | null;
  accept_language: string | null;
  user_agent: string | null;
};

/** The tally the database function does, written out. */
export function rollupAudience(rows: readonly AudienceRow[]): Omit<AudienceRollup, "partial"> {
  const countries = new Map<string, { name: string; code: string | null; count: number }>();
  const regions = new Map<string, { country: string; region: string; code: string | null; count: number }>();
  const languages = new Map<string, number>();
  const browsers = new Map<string, number>();
  let mobile = 0;

  const lower = (a: string | null, b: string | null) => (a === null ? b : b === null ? a : a < b ? a : b);

  for (const r of rows) {
    const name = r.country ?? "Unknown";
    const c = countries.get(name) ?? { name, code: null, count: 0 };
    c.count += 1;
    c.code = lower(c.code, r.country_code);
    countries.set(name, c);

    if (r.region) {
      const key = `${name}|${r.region}`;
      const g = regions.get(key) ?? { country: name, region: r.region, code: null, count: 0 };
      g.count += 1;
      g.code = lower(g.code, r.country_code);
      regions.set(key, g);
    }
    if (r.accept_language) languages.set(r.accept_language, (languages.get(r.accept_language) ?? 0) + 1);

    const b = browserOf(r.user_agent);
    browsers.set(b, (browsers.get(b) ?? 0) + 1);
    if (isMobileAgent(r.user_agent)) mobile += 1;
  }

  return {
    total: rows.length,
    countries: [...countries.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 15),
    regions: [...regions.values()]
      .sort((a, b) => b.count - a.count || a.country.localeCompare(b.country) || a.region.localeCompare(b.region))
      .slice(0, 15),
    languages: [...languages.entries()]
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code))
      .slice(0, 15),
    browsers: [...browsers.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    devices: { mobile, desktop: rows.length - mobile },
  };
}

/**
 * "That function is not there", as supabase-js reports it. PostgREST answers
 * a missing function from its schema cache with PGRST202; a direct connection
 * would say 42883. The sibling of isTableAbsent in ./tableAbsent.ts.
 */
export function isFunctionAbsent(
  err: { code?: string | null; message?: string | null } | null | undefined,
): boolean {
  if (!err) return false;
  if (err.code === "PGRST202" || err.code === "42883") return true;
  return /could not find the function/i.test(err.message ?? "");
}

/**
 * "The database gave up counting." The API cancels any statement at 8
 * seconds (57014). The first version of the page view function took 5 to 8
 * seconds for a month on production and would not finish for all time, so a
 * wide range answered with this instead of numbers.
 */
export function isTimeout(
  err: { code?: string | null; message?: string | null } | null | undefined,
): boolean {
  if (!err) return false;
  return err.code === "57014" || /statement timeout|canceling statement/i.test(err.message ?? "");
}

/** What `partial.needs` says when the range was too wide to count in time. */
export const NEEDS_SHORTER_RANGE = "a shorter range, because this one took too long to count";

type Admin = SupabaseClient;

/**
 * Page views since a moment. Whole when the database function answers; the
 * newest rows, and a note saying so, when it is absent or ran out of time.
 */
export async function pageviewRollup(admin: Admin, sinceIso: string): Promise<PageviewRollup> {
  const { data, error } = await admin.rpc("admin_pageview_rollup", { p_since: sinceIso });
  if (!error && data) return { ...(data as Omit<PageviewRollup, "partial">), partial: null };
  const timedOut = isTimeout(error);
  if (error && !isFunctionAbsent(error) && !timedOut) throw new Error(error.message);

  const [pageviews, sessionRows] = await Promise.all([
    pageAll<PageviewRow>(
      (from, to) =>
        admin
          .from("analytics_pageviews")
          .select("session_id, path")
          .gte("ts", sinceIso)
          .order("id", { ascending: false })
          .range(from, to),
      FALLBACK_PAGEVIEW_ROWS,
    ),
    pageAll<SessionSpan>(
      (from, to) =>
        admin
          .from("analytics_sessions")
          .select("first_seen, last_seen")
          .gte("last_seen", sinceIso)
          .order("session_id")
          .range(from, to),
      FALLBACK_SESSION_ROWS,
    ),
  ]);
  const short = pageviews.length >= FALLBACK_PAGEVIEW_ROWS || sessionRows.length >= FALLBACK_SESSION_ROWS;
  return {
    ...rollupPageviews(pageviews, sessionRows),
    partial: short
      ? { rows: pageviews.length, needs: timedOut ? NEEDS_SHORTER_RANGE : ROLLUP_MIGRATION }
      : null,
  };
}

/** Sessions first seen since a moment. Same arrangement as pageviewRollup. */
export async function audienceRollup(admin: Admin, sinceIso: string): Promise<AudienceRollup> {
  const { data, error } = await admin.rpc("admin_audience_rollup", { p_since: sinceIso });
  if (!error && data) return { ...(data as Omit<AudienceRollup, "partial">), partial: null };
  if (error && !isFunctionAbsent(error)) throw new Error(error.message);

  const rows = await pageAll<AudienceRow>(
    (from, to) =>
      admin
        .from("analytics_sessions")
        .select("country, country_code, region, accept_language, user_agent")
        .gte("first_seen", sinceIso)
        .order("session_id")
        .range(from, to),
    FALLBACK_SESSION_ROWS,
  );
  return {
    ...rollupAudience(rows),
    partial: rows.length >= FALLBACK_SESSION_ROWS ? { rows: rows.length, needs: ROLLUP_MIGRATION } : null,
  };
}
