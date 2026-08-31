/**
 * The admin panel's one way to read an API route.
 *
 * WHY THIS IS A HELPER AND NOT SIX COPIES OF THREE LINES.
 *
 * `fetch(url).then(r => r.json())` is wrong here and the reason is specific:
 * every route under /api/admin returns a JSON body on failure too. A 403 from
 * an expired session is `{ error: "Forbidden" }`, and that parses perfectly.
 * It is then stored as if it were the dashboard, and the first read of a
 * nested field, `data.shop.netCents` or `data.auth.signedIn`, throws a
 * TypeError during render, where the loader's own try/catch cannot reach it.
 *
 * That TypeError escapes to the route error boundary. Before this, the admin
 * had no boundary of its own, so it reached the root one and replaced the
 * entire panel with "Something went wrong": one expired session, and Orders,
 * Push, Community and everything else went with it.
 *
 * Wave A found this in CommerceOverviewTab and fixed that one file. Six more
 * had it, found 2026-08-20: RevenueTab, SubscriptionsTab, AudienceTab,
 * EngagementTab, OverviewTab and SustainabilityTab.
 *
 * WHY NULL RATHER THAN A THROW. These are polled surfaces. A dashboard that
 * blanks itself because one poll failed is worse than one showing numbers a
 * few seconds stale, so the caller's shape is `if (d) setData(d)` and a failed
 * read leaves the last good values on screen. That is the posture AdminShell's
 * rail badge already had and the reason it never took anything down.
 */
import { inflate, larpOn } from "./larp";

export async function adminJson<T>(
  url: string,
  init?: RequestInit,
): Promise<T | null> {
  try {
    const r = await fetch(url, { cache: "no-store", ...init });
    if (!r.ok) return null;
    const json = (await r.json()) as T;
    // Larp mode inflates on the way IN, never on the way out: the request was
    // ordinary and the server answered with the truth. One hook here reaches
    // every tab, because every tab reads through this function. Off, which is
    // the resting state, this is a boolean check and the same object back.
    return larpOn() ? inflate(json) : json;
  } catch {
    // Offline, aborted, or a body that is not JSON. Same answer either way:
    // there is no data this time, and that is not a reason to break the page.
    return null;
  }
}

/**
 * Several tabs read two or three routes for one view. Failing the whole view
 * because one of them 403'd loses the panels that did load, so each is
 * resolved independently and the caller decides what a missing piece means.
 */
export async function adminJsonAll<T extends readonly string[]>(
  urls: T,
  init?: RequestInit,
): Promise<{ [K in keyof T]: unknown | null }> {
  return Promise.all(urls.map((u) => adminJson(u, init))) as Promise<{
    [K in keyof T]: unknown | null;
  }>;
}
