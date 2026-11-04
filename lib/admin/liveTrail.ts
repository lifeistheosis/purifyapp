/**
 * The pages a reader on the site now opened, in order: the owner, 2026-11-04,
 * "being able to see the specific user on the site and what country they're
 * from and what platform they're using and what did they click".
 *
 * Only page opens are recorded (analytics_pageviews); a press of a button is
 * not, so "what they clicked" is the pages they opened. A session is a
 * browser tab and an app's can stay alive for days, so the trail is the
 * newest pages of the last few hours, not the tab's whole life. Built from
 * the read /api/admin/stats already makes for each live session's current
 * page, so it asks the database for nothing more.
 *
 * Pure, so the rules can be held by a test.
 */

export type TrailStep = { path: string; at: string };

/** At most this many steps a reader. */
export const TRAIL_MAX = 10;
/** Pages older than this are not part of the visit he is looking at. */
export const TRAIL_WINDOW_MS = 6 * 60 * 60_000;

/**
 * Each session's newest pages, oldest first. `views` is newest first, as the
 * stats route reads them. A page opened twice in a row (a reload) is one step.
 */
export function trailsOf(
  views: readonly { session_id: string; path: string | null; ts: string }[],
  now: number,
): Map<string, TrailStep[]> {
  const out = new Map<string, TrailStep[]>();
  for (const v of views) {
    if (!v.path) continue;
    const t = Date.parse(v.ts);
    if (!Number.isFinite(t) || t < now - TRAIL_WINDOW_MS) continue;
    const steps = out.get(v.session_id) ?? [];
    if (steps.length >= TRAIL_MAX) continue;
    // Newest first here, so the step after this one in time is steps' last.
    if (steps.length > 0 && steps[steps.length - 1].path === v.path) {
      steps[steps.length - 1] = { path: v.path, at: v.ts };
    } else {
      steps.push({ path: v.path, at: v.ts });
    }
    out.set(v.session_id, steps);
  }
  for (const [id, steps] of out) out.set(id, steps.reverse());
  return out;
}
