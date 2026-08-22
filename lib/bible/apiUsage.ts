import "server-only";
import { after } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Counting API.Bible calls, for the 150,000 a month free-tier ceiling.
 *
 * THREE RULES THIS FOLLOWS, each of which the obvious implementation breaks.
 *
 * IT NEVER BLOCKS THE READER. The count is recorded inside `after()`, which
 * runs the task once the response has been sent. A reader opening John 1 waits
 * for the chapter, not for a write to a counter they will never see. This is
 * the difference between instrumentation and a tax on every page.
 *
 * IT NEVER BREAKS THE READER EITHER. Every failure path swallows. If the table
 * is missing because the migration has not run, if the service key is absent,
 * if Supabase is down, the chapter still renders. A compliance counter that can
 * take down Scripture is not worth having, and the panel already treats a
 * missing count as "not measured" rather than as zero.
 *
 * IT COUNTS REAL REQUESTS, NOT PAGE VIEWS, and this is the part that is easy
 * to get badly wrong. api-bible.ts fetches with `revalidate: 60 * 60 * 6`, so
 * one chapter reaches API.Bible at most four times a day however many readers
 * open it. Counting every call to fetchLicensedChapter would count readers and
 * overstate usage by orders of magnitude, which on a licence ceiling means
 * raising an upgrade alarm for nothing and teaching everyone to ignore it.
 *
 * So the count is deduplicated on the same key the fetch cache uses: bibleId,
 * chapter, and which six-hour window it is. The first request in a window
 * counts, the rest are the cache answering and cost nothing against the quota.
 * The uniqueness is enforced in Postgres, not here, because two readers can
 * miss the cache at the same moment on different instances.
 */

/** The UTC calendar day, matching every other bucket in this system. */
function utcDay(now: Date = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
}

/** Which six-hour cache window we are in. Mirrors the fetch revalidate. */
const WINDOW_MS = 6 * 60 * 60 * 1000;

export function cacheWindowKey(
  bibleId: string,
  chapterId: string,
  now: Date = new Date(),
): string {
  return `${bibleId}:${chapterId}:${Math.floor(now.getTime() / WINDOW_MS)}`;
}

/**
 * Record one request, if it is genuinely one.
 *
 * Fire and forget by design. Returns immediately; the write is queued behind
 * the response with after(), so the reader waits for their chapter and not for
 * a counter they will never see.
 */
export function recordApiBibleCall(bibleId: string, chapterId: string): void {
  if (!bibleId || !chapterId) return;
  const now = new Date();
  const key = cacheWindowKey(bibleId, chapterId, now);
  const day = utcDay(now);
  try {
    after(async () => {
      try {
        const supa = createAdminClient();
        // Returns true when it actually counted. Nothing here reads it: the
        // value exists so the behaviour is testable and so a future caller can
        // tell a real request from a duplicate without a second round trip.
        await supa.rpc("bump_api_bible_calls", { p_key: key, p_day: day });
      } catch {
        // Swallowed on purpose. See the header: the reader's chapter has
        // already been delivered by the time this runs, and an undercount is a
        // smaller problem than an error surfaced from a background task.
      }
    });
  } catch {
    // after() throws outside a request scope, for example from a script or a
    // test. Not a reason to fail anything.
  }
}

export type ApiBibleUsage = {
  /** Calls so far in the current UTC month, or null if it could not be read. */
  monthToDate: number | null;
  /** Per-day counts for the requested window, oldest first. */
  days: { date: string; calls: number }[];
};

/**
 * Read the counter.
 *
 * Returns null rather than zero when the read fails, so the panel can keep
 * saying "not measured" instead of reporting comfortable headroom it has not
 * verified. That distinction is the point of the whole module.
 */
export async function readApiBibleUsage(sinceDay: string): Promise<ApiBibleUsage> {
  try {
    const supa = createAdminClient();
    const { data, error } = await supa
      .from("api_bible_usage")
      .select("day, calls")
      .gte("day", sinceDay)
      .order("day", { ascending: true });

    if (error || !data) return { monthToDate: null, days: [] };

    const now = new Date();
    const monthPrefix = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

    const days = data.map((r) => ({
      date: String((r as { day: string }).day),
      calls: Number((r as { calls: number }).calls) || 0,
    }));

    const monthToDate = days
      .filter((d) => d.date.startsWith(monthPrefix))
      .reduce((s, d) => s + d.calls, 0);

    return { monthToDate, days };
  } catch {
    return { monthToDate: null, days: [] };
  }
}
