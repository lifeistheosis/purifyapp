import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

import { classifyPlatform, isAppPlatform } from "@/lib/analytics/platform";
import { SCREEN_EVENTS } from "@/lib/analytics/screenCounting";
import { screenPath } from "@/lib/analytics/screens";

import type { EventRow, Step, Where } from "./screensSummary";

/**
 * Reading the rows behind the Screens view (1.8), in pages.
 *
 * The API gives at most 1,000 rows a request (lib/supabase/pageAll.ts), and a
 * month of page views was 229,852 rows on 2026-10-03, most of them the
 * tracker's 20 second pings. Read one page after another, that is over 200
 * requests and most of a minute, so the page views are read in LANES: the
 * window's ids cut into runs of 20,000, four runs read at a time, each a page
 * at a time by id (a page starts after the last id of the one before, so a
 * row written meanwhile cannot repeat or skip one). Past 400,000 page views
 * only the newest are read, and the view says from when: a stated sample,
 * never a short count passed off as whole, the rule lib/admin/rollups.ts and
 * the Onboarding view keep.
 *
 * Every read here has a total order and asks for 1,000 rows at most
 * (lib/supabase/__tests__/rowCap.test.ts).
 */

type Db = SupabaseClient;

const PAGE = 1000;
/** Past this many page views in the window, only the newest this many are read. */
export const MAX_PAGEVIEWS = 400_000;
/** Past this many of the screens' counts, the sums say they are partial. */
export const MAX_EVENTS = 300_000;
/** Ids in one lane. */
export const LANE_IDS = 20_000;
/** Lanes read at once: enough to be quick, few enough to leave the database to the readers. */
export const AT_ONCE = 4;
/** Ids read before the window's first page view by time (see readTabs). */
const LOW_MARGIN = 1000;

const DAY = 86_400_000;

function fail(error: { message: string; code?: string }): never {
  throw Object.assign(new Error(error.message), { code: error.code, cause: error });
}

/** Run jobs a few at a time, keeping their order in the answer. */
export async function inTurn<T>(jobs: readonly (() => Promise<T>)[], atOnce = AT_ONCE): Promise<T[]> {
  const out = new Array<T>(jobs.length);
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const i = next++;
      out[i] = await jobs[i]();
    }
  };
  await Promise.all(Array.from({ length: Math.min(atOnce, jobs.length) }, worker));
  return out;
}

/**
 * The ids [low, high] cut into lanes, oldest first. Over `max` ids, the
 * newest `max` only, and `cut` says so.
 */
export function planLanes(low: number, high: number, max = MAX_PAGEVIEWS, size = LANE_IDS): { lanes: [number, number][]; cut: boolean } {
  if (!Number.isFinite(low) || !Number.isFinite(high) || high < low) return { lanes: [], cut: false };
  const cut = high - low + 1 > max;
  const lanes: [number, number][] = [];
  for (let a = cut ? high - max + 1 : low; a <= high; a += size) lanes.push([a, Math.min(a + size - 1, high)]);
  return { lanes, cut };
}

export type TabsRead = {
  /** Page views read. */
  rows: number;
  /** The oldest page view read, when the window held more than MAX_PAGEVIEWS; null when it was read whole. */
  cutAt: string | null;
  /** Each tab's page views, oldest first. */
  eachTab: (fn: (tab: string, steps: Step[]) => void) => void;
};

type Lane = { n: number; tab: Int32Array; path: Int32Array; at: Float64Array };

/**
 * The page views since a moment, by tab. Kept as numbers while they are read
 * (an id for each tab and each address), so 400,000 rows are a few megabytes,
 * and handed out one tab at a time.
 */
export async function readTabs(db: Db, sinceIso: string): Promise<TabsRead> {
  const empty: TabsRead = { rows: 0, cutAt: null, eachTab: () => {} };
  const [first, last] = await Promise.all([
    db
      .from("analytics_pageviews")
      .select("id")
      .gte("ts", sinceIso)
      .order("ts", { ascending: true })
      .order("id", { ascending: true })
      .limit(1),
    db.from("analytics_pageviews").select("id").order("id", { ascending: false }).limit(1),
  ]);
  if (first.error) fail(first.error);
  if (last.error) fail(last.error);
  // An id and its time are written together, so the first page view in the
  // window by time is within a few ids of the first by id: two requests that
  // land at once can swap. Reading from a thousand ids before it cannot miss
  // one, and the time filter on every page drops what is older.
  const low = Number((first.data?.[0] as { id?: unknown } | undefined)?.id) - LOW_MARGIN;
  const high = Number((last.data?.[0] as { id?: unknown } | undefined)?.id);
  const { lanes, cut } = planLanes(low, high);
  if (!lanes.length) return empty;

  const tabIds = new Map<string, number>();
  const tabs: string[] = [];
  const pathIds = new Map<string, number>();
  const paths: string[] = [];
  const intern = (ids: Map<string, number>, list: string[], key: string) => {
    let i = ids.get(key);
    if (i === undefined) {
      i = list.length;
      list.push(key);
      ids.set(key, i);
    }
    return i;
  };

  const read = await inTurn(
    lanes.map(([a, b]) => async (): Promise<Lane> => {
      const size = b - a + 1;
      const lane: Lane = { n: 0, tab: new Int32Array(size), path: new Int32Array(size), at: new Float64Array(size) };
      let after = a - 1;
      for (;;) {
        const { data, error } = await db
          .from("analytics_pageviews")
          .select("id, session_id, path, ts")
          .gt("id", after)
          .lte("id", b)
          .gte("ts", sinceIso)
          .order("id", { ascending: true })
          .limit(PAGE);
        if (error) fail(error);
        const page = (data ?? []) as { id: number | string; session_id: string; path: string | null; ts: string }[];
        for (const r of page) {
          const at = Date.parse(r.ts);
          if (!Number.isFinite(at) || !r.session_id || lane.n >= size) continue;
          lane.tab[lane.n] = intern(tabIds, tabs, r.session_id);
          lane.path[lane.n] = intern(pathIds, paths, screenPath(r.path));
          lane.at[lane.n] = at;
          lane.n += 1;
        }
        if (page.length < PAGE) break;
        after = Number(page[page.length - 1].id);
      }
      return lane;
    }),
  );

  // Each tab's rows together, in id order, which is the order they were
  // written: a count of rows per tab, then each row into its tab's place.
  const rows = read.reduce((n, l) => n + l.n, 0);
  const start = new Int32Array(tabs.length + 1);
  for (const l of read) for (let i = 0; i < l.n; i++) start[l.tab[i] + 1] += 1;
  for (let k = 1; k < start.length; k++) start[k] += start[k - 1];
  const fill = start.slice(0, tabs.length);
  const path = new Int32Array(rows);
  const at = new Float64Array(rows);
  let oldest = Number.POSITIVE_INFINITY;
  for (const l of read) {
    for (let i = 0; i < l.n; i++) {
      const pos = fill[l.tab[i]]++;
      path[pos] = l.path[i];
      at[pos] = l.at[i];
      if (l.at[i] < oldest) oldest = l.at[i];
    }
  }

  return {
    rows,
    cutAt: cut && Number.isFinite(oldest) ? new Date(oldest).toISOString() : null,
    eachTab: (fn) => {
      for (let k = 0; k < tabs.length; k++) {
        const steps: Step[] = [];
        let inOrder = true;
        for (let j = start[k]; j < start[k + 1]; j++) {
          if (steps.length && at[j] < steps[steps.length - 1].at) inOrder = false;
          steps.push({ path: paths[path[j]], at: at[j] });
        }
        // Written order is time order but for two requests landing together;
        // a stable sort keeps the written order between equal times.
        if (!inOrder) steps.sort((x, y) => x.at - y.at);
        fn(tabs[k], steps);
      }
    },
  };
}

/** Session ids cut into four runs by their first character, read side by side. */
const TAB_RANGES: readonly (readonly [string | null, string | null])[] = [
  [null, "4"],
  ["4", "8"],
  ["8", "c"],
  ["c", null],
];

/**
 * Where each tab seen since a moment was read: one of the apps or the
 * website, from the user agent its session row has always kept
 * (lib/analytics/platform.ts). A tab whose user agent says nothing is left
 * out, and counts only under "both".
 */
export async function readTabPlaces(db: Db, sinceIso: string, atOnce = AT_ONCE): Promise<Map<string, Exclude<Where, "all">>> {
  const lists = await inTurn(
    TAB_RANGES.map(([from, to]) => async () => {
      const found: [string, Exclude<Where, "all">][] = [];
      let after: string | null = null;
      for (;;) {
        let q = db.from("analytics_sessions").select("session_id, user_agent").gte("last_seen", sinceIso);
        if (after !== null) q = q.gt("session_id", after);
        else if (from !== null) q = q.gte("session_id", from);
        if (to !== null) q = q.lt("session_id", to);
        const { data, error } = await q.order("session_id", { ascending: true }).limit(PAGE);
        if (error) fail(error);
        const page = (data ?? []) as { session_id: string; user_agent: string | null }[];
        for (const r of page) {
          const kind = classifyPlatform(r.user_agent);
          if (kind !== "unknown") found.push([r.session_id, isAppPlatform(kind) ? "apps" : "web"]);
        }
        if (page.length < PAGE) break;
        after = page[page.length - 1].session_id;
      }
      return found;
    }),
    atOnce,
  );
  return new Map(lists.flat());
}

export type EventsRead = { rows: EventRow[]; truncated: boolean };

/**
 * The screens' counts from a moment on, a week at a time, newest week first,
 * each week a page at a time by id. Past MAX_EVENTS rows the read stops and
 * says so.
 */
export async function readScreenEvents(db: Db, from: Date, now: Date, atOnce = AT_ONCE): Promise<EventsRead> {
  const weeks: [string, string | null][] = [];
  for (let t = from.getTime(); t <= now.getTime(); t += 7 * DAY) {
    const end = t + 7 * DAY;
    weeks.push([new Date(t).toISOString(), end > now.getTime() ? null : new Date(end).toISOString()]);
  }
  weeks.reverse();

  let total = 0;
  let truncated = false;
  const lists = await inTurn(
    weeks.map(([a, b]) => async () => {
      const found: EventRow[] = [];
      let after: string | null = null;
      for (;;) {
        if (total >= MAX_EVENTS) {
          truncated = true;
          break;
        }
        let q = db.from("analytics_events").select("id, name, props, ts").in("name", [...SCREEN_EVENTS]).gte("ts", a);
        if (b !== null) q = q.lt("ts", b);
        if (after !== null) q = q.gt("id", after);
        const { data, error } = await q.order("id", { ascending: true }).limit(PAGE);
        if (error) fail(error);
        const page = (data ?? []) as (EventRow & { id: string })[];
        for (const r of page) found.push({ name: r.name, props: r.props ?? {}, ts: r.ts });
        total += page.length;
        if (page.length < PAGE) break;
        after = page[page.length - 1].id;
      }
      return found;
    }),
    atOnce,
  );
  return { rows: lists.flat(), truncated };
}
