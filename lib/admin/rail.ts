/**
 * The rail, sorted by how the admin is used.
 *
 * The owner's pick A, "One home" (2026-10-28): "the rail is sorted by how you
 * use it, and the pages you never open fold into one quiet Tools line." The
 * use is his own log (admin_usage), read through /api/admin/usage, the route
 * the "Your use" readout already calls. Its views are the readout's counts:
 * opens, time, and visits left within five seconds.
 *
 * THE RULES, in the order they are applied:
 *
 *   1. Home is first, always. It is where the admin opens, and its visits are
 *      short by design (a look, then a move), so ranking it by use would sink
 *      the page the whole design is built around.
 *   2. Every other operations page is ranked by the visits that stayed (opens
 *      less the ones left within five seconds: those are doorways, not use),
 *      then by time spent, then by the order the owner picked.
 *   3. Daily is Home and the three pages ranked highest. Four, because they
 *      are also the phone bar's four slots.
 *   4. When needed is the rest that he spent a minute or more on in the
 *      window, in rank order, plus Orders and Messages wherever they rank:
 *      those hold the people waiting, and a queue never folds out of sight.
 *   5. Tools is everything else, in the picked order, so the quiet line reads
 *      the same from day to day.
 *
 * A log too thin to sort by (under MIN_STAYS stayed visits) leaves the rail as
 * he picked it. So does a log that cannot be read.
 *
 * NOTHING IS DROPPED. Whatever goes in, every operations page comes out in
 * exactly one group; rail.test.ts holds that for the picked rail, for any
 * usage, and for any cookie, however garbled.
 *
 * WHY A COOKIE. The order is worked out in the browser, after the page has
 * drawn, and moving the rail under the owner's pointer as he reaches for it
 * would be worse than a rail that never moved. So the new order is written
 * into a cookie, and the server draws the rail from it on the next load.
 * Within one visit the rail never moves. Since his pick B for the Audit log
 * (r3-17, 2026-10-30) the cookie is written only on his yes: Your week
 * suggests a move and its "Do it" writes it (components/admin/tabs/UsageTab.tsx).
 *
 * Pure: no fetch, no clock read, no document. The shell does those.
 */

import { ADMIN_PAGE_GROUPS, pageOfAny, type AdminPage, type AdminPageGroup } from "./pages";

/** One view's use over the window, as /api/admin/usage returns it. */
export type ViewUse = { tab: string; opens: number; totalMs: number; quickExits: number };

/** The page the admin opens on. */
export const HOME = "today";

/** Home and the three pages read most: the rail's Daily, and the phone bar's slots. */
export const DAILY_SIZE = 4;

/** Pages that hold people waiting. They never fold into Tools. */
export const ALWAYS_NEEDED: readonly string[] = ["orders", "messages"];

/** Below this many stayed visits the log is too thin to sort by. */
export const MIN_STAYS = 20;

/** Less time than this on a page, over the whole window, folds it into Tools. */
export const TOOL_MS = 60_000;

/** The cookie the server draws the rail from. */
export const RAIL_COOKIE = "adm_rail";

const COOKIE_MAX_AGE = 365 * 86_400;

/** The operations groups as the owner picked them: Daily, When needed, Tools. */
const PICKED = ADMIN_PAGE_GROUPS.filter((g) => g.mode === "ops");
const PAGES: AdminPage[] = PICKED.flatMap((g) => g.pages);
const BY_ID = new Map(PAGES.map((p) => [p.id, p]));
const PICKED_INDEX = new Map(PAGES.map((p, i) => [p.id, i]));
const PICKED_GROUP = new Map(PICKED.flatMap((g, gi) => g.pages.map((p) => [p.id, gi] as const)));
const NEEDED = 1;
const TOOLS = PICKED.length - 1;

/**
 * Lists of page ids, one per group, made into the rail.
 *
 * The one place every rail goes through, whoever built it, so the guarantees
 * cannot differ by source: an id that is not an operations page is dropped,
 * a page listed twice keeps its first place, a page left out goes back to
 * the group it was picked in, Home leads Daily, Daily holds four at most, and
 * a page that holds a queue is never in Tools.
 */
export function normalizeRail(lists: readonly (readonly string[])[]): AdminPageGroup[] {
  const seen = new Set<string>();
  const out: string[][] = PICKED.map((_, i) =>
    (lists[i] ?? []).filter((id) => {
      if (!BY_ID.has(id) || seen.has(id)) return false;
      seen.add(id);
      return true;
    }),
  );
  for (const p of PAGES) {
    if (!seen.has(p.id)) out[PICKED_GROUP.get(p.id) ?? TOOLS].push(p.id);
  }

  for (const list of out) {
    const at = list.indexOf(HOME);
    if (at >= 0) list.splice(at, 1);
  }
  out[0].unshift(HOME);

  out[NEEDED].unshift(...out[0].splice(DAILY_SIZE));

  for (const id of ALWAYS_NEEDED) {
    const at = out[TOOLS].indexOf(id);
    if (at >= 0) {
      out[TOOLS].splice(at, 1);
      out[NEEDED].push(id);
    }
  }

  return PICKED.map((g, i) => ({
    group: g.group,
    mode: g.mode,
    ...(g.quiet ? { quiet: true } : {}),
    pages: out[i].map((id) => BY_ID.get(id) as AdminPage),
  }));
}

/** The rail as the owner picked it. */
export function pickedRail(): AdminPageGroup[] {
  return normalizeRail(PICKED.map((g) => g.pages.map((p) => p.id)));
}

/**
 * The rail sorted by use. `views` is the usage readout's list, any order;
 * views of owner pages and of tabs no page holds are ignored. A retired id
 * counts for the page it now lands on (lib/admin/pages.ts RETIRED_VIEWS), so
 * the weeks he spent on Verification still count for Users.
 */
export function railFromUsage(views: readonly ViewUse[] | null | undefined): AdminPageGroup[] {
  if (!views || views.length === 0) return pickedRail();

  const use = new Map<string, { stays: number; ms: number }>();
  for (const v of views) {
    const page = pageOfAny(v.tab);
    if (!page || !BY_ID.has(page.id)) continue;
    const u = use.get(page.id) ?? { stays: 0, ms: 0 };
    u.stays += Math.max(0, (v.opens || 0) - (v.quickExits || 0));
    u.ms += Math.max(0, v.totalMs || 0);
    use.set(page.id, u);
  }
  let total = 0;
  for (const u of use.values()) total += u.stays;
  if (total < MIN_STAYS) return pickedRail();

  const stays = (id: string) => use.get(id)?.stays ?? 0;
  const ms = (id: string) => use.get(id)?.ms ?? 0;
  const picked = (id: string) => PICKED_INDEX.get(id) ?? PAGES.length;

  const ranked = PAGES.map((p) => p.id)
    .filter((id) => id !== HOME)
    .sort((a, b) => stays(b) - stays(a) || ms(b) - ms(a) || picked(a) - picked(b));

  const daily = [HOME, ...ranked.slice(0, DAILY_SIZE - 1)];
  const rest = ranked.slice(DAILY_SIZE - 1);
  const needed = rest.filter((id) => ALWAYS_NEEDED.includes(id) || ms(id) >= TOOL_MS);
  const tools = rest.filter((id) => !needed.includes(id)).sort((a, b) => picked(a) - picked(b));

  return normalizeRail([daily, needed, tools]);
}

/** The local calendar day, as eight digits: when the cookie was last worked out. */
export function railDay(d: Date): string {
  const two = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${two(d.getMonth() + 1)}${two(d.getDate())}`;
}

/**
 * The rail as a cookie value: the day, then each group's page ids. Only
 * letters, digits, hyphens, dots and tildes, none of which a cookie value
 * needs escaped.
 */
export function encodeRail(groups: readonly AdminPageGroup[], day: string): string {
  return [day, ...groups.map((g) => g.pages.map((p) => p.id).join("."))].join("~");
}

/**
 * A cookie value back into the rail. Anything it cannot read gives the
 * picked rail, and anything it can read goes through normalizeRail, so a
 * stale or hand-edited cookie can reorder the rail but never empty it.
 */
export function decodeRail(raw: string | null | undefined): { groups: AdminPageGroup[]; day: string | null } {
  if (!raw || raw.length > 600) return { groups: pickedRail(), day: null };
  const [day, ...lists] = raw.split("~");
  if (lists.length === 0) return { groups: pickedRail(), day: null };
  return {
    groups: normalizeRail(lists.map((l) => l.split(".").filter(Boolean))),
    day: /^\d{8}$/.test(day) ? day : null,
  };
}

/**
 * The Set-Cookie line the browser writes. Path /admin, so it travels with
 * the admin page and with nothing else on the site.
 */
export function railCookie(value: string, secure: boolean): string {
  return `${RAIL_COOKIE}=${value}; Path=/admin; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax${secure ? "; Secure" : ""}`;
}
