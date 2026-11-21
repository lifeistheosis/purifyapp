/**
 * Telling a heartbeat from a page view, on the server (2026-11-21).
 *
 * The tracker posts to /api/track when a reader opens a page, and again every
 * 20 seconds while they stay on it, so that the owner's desk can say who is
 * here now (components/analytics/AnalyticsTracker.tsx). Both posts carry the
 * same two things, the session and the path, and until this file the route
 * answered both the same way: a rate-limit call, a read, a write and a new row
 * in analytics_pageviews. A reader who stayed five minutes on one chapter was
 * written as fifteen page views and cost about sixty calls to the database.
 * In November 2026 that helped take the Supabase project past its free quota
 * (egress and log ingestion) with under four hundred readers a month.
 *
 * A post is a heartbeat when it names the session's last path again within
 * HEARTBEAT_WINDOW_MS. A heartbeat is not a page view: it writes nothing but
 * last_seen, and that at most once in LAST_SEEN_EVERY_MS, which keeps a
 * session inside the desk's 90 second "live" window
 * (app/api/admin/stats/route.ts, LIVE_WINDOW_MS).
 *
 * One row is still written for every PING_ROW_EVERY_MS a reader stays on one
 * page. The Screens view ends a visit after 30 minutes with nothing from the
 * tab (lib/admin/screensSummary.ts), so a reader an hour into one long
 * chapter has to leave a mark now and then, or the next page they open would
 * be read as a new visit and the chapter as a page they left from. That view
 * already reads a run of rows of one address as one view, so the marks change
 * none of its sums.
 *
 * WHAT CHANGES ON THE OWNER'S DESK. Every number that counts rows of
 * analytics_pageviews (views on the chart, page views today, the hourly goal
 * on page views, pages a session) counted the pings as views until this day.
 * From it they count pages opened, with one mark for each ten minutes on a
 * page. Visitors, sign-ups and who is here now are counted as before.
 *
 * What is remembered lives in this process only. After a restart, or on a
 * second instance, a session's next post counts as a page view once more,
 * which is the old behaviour and harms nothing. Because the answer is given
 * on the server, the apps already installed are eased the day the website
 * deploys.
 */

/** A repeat of the same path inside this window is the same visit, still open. */
export const HEARTBEAT_WINDOW_MS = 120_000;
/** last_seen is written at most this often for one session. Well under the desk's 90 s. */
export const LAST_SEEN_EVERY_MS = 45_000;
/** A reader still on one page leaves one row this often. Well under the Screens view's 30 minutes. */
export const PING_ROW_EVERY_MS = 600_000;
/** Sessions remembered at once. When full, the stale go first, then the oldest. */
export const MAX_SESSIONS = 5_000;

export type Seen = { path: string; at: number; wrote: number; row: number };
export type Beat = "pageview" | "heartbeat-write" | "heartbeat-skip";

const STORE = Symbol.for("purify.track.recentSessions");

/** One map for the whole process, whichever bundle asks for it. */
export function recentSessions(): Map<string, Seen> {
  const g = globalThis as unknown as Record<symbol, Map<string, Seen> | undefined>;
  let map = g[STORE];
  if (!map) {
    map = new Map<string, Seen>();
    g[STORE] = map;
  }
  return map;
}

/**
 * What one post to /api/track is: a page view (do everything, as before; the
 * ten minute mark is one of these), a heartbeat that is due to write
 * last_seen, or a heartbeat to answer at once.
 */
export function classifyTrack(
  sessionId: string,
  path: string,
  nowMs: number,
  recent: Map<string, Seen> = recentSessions(),
): Beat {
  const seen = recent.get(sessionId);
  if (seen && seen.path === path && nowMs - seen.at < HEARTBEAT_WINDOW_MS) {
    seen.at = nowMs;
    if (nowMs - seen.row >= PING_ROW_EVERY_MS) {
      // Ten minutes on one page: one row, written as a page view is.
      seen.row = nowMs;
      seen.wrote = nowMs;
      return "pageview";
    }
    if (nowMs - seen.wrote < LAST_SEEN_EVERY_MS) return "heartbeat-skip";
    seen.wrote = nowMs;
    return "heartbeat-write";
  }
  if (!seen && recent.size >= MAX_SESSIONS) prune(recent, nowMs);
  // Set again, so the map's order stays the order of the last page views.
  recent.delete(sessionId);
  recent.set(sessionId, { path, at: nowMs, wrote: nowMs, row: nowMs });
  return "pageview";
}

function prune(recent: Map<string, Seen>, nowMs: number): void {
  for (const [id, seen] of recent) {
    if (nowMs - seen.at >= HEARTBEAT_WINDOW_MS) recent.delete(id);
  }
  // Still full of visits that are open: let the oldest tenth go.
  let over = recent.size - Math.floor(MAX_SESSIONS * 0.9);
  for (const id of recent.keys()) {
    if (over <= 0) break;
    recent.delete(id);
    over -= 1;
  }
}
