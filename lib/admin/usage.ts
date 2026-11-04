/**
 * How the admin itself is used: the shape of the log and the readout.
 *
 * The owner, 2026-10-20: "track what pages I go to, so you can pretty much
 * learn from my usage and optimize ... what should be fixed". So the admin
 * records, for admin accounts only, which view was open, for how long, which
 * buttons were pressed in it, and where the next move went. Readers are never
 * in this log; components/analytics/AnalyticsTracker.tsx still skips /admin.
 *
 * Pure: no fetch, no clock read, no React. The route validates with
 * USAGE_BATCH and the readout is summarizeUsage over the rows.
 */

import { z } from "zod";

/** A view that stayed open less than this counts as a quick exit. */
export const QUICK_EXIT_MS = 5_000;

/** Longest stay recorded for one view: a tab left open overnight is not use. */
export const MAX_VIEW_MS = 30 * 60_000;

const tabId = z.string().regex(/^[a-z][a-z0-9-]{0,39}$/);

export const USAGE_EVENT = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("view"),
    tab: tabId,
    ms: z.number().int().min(0).max(MAX_VIEW_MS),
    from: tabId.nullable(),
  }),
  z.object({
    kind: z.literal("action"),
    tab: tabId,
    label: z.string().min(1).max(48),
  }),
]);

export const USAGE_BATCH = z.object({ events: z.array(USAGE_EVENT).min(1).max(50) });

export type UsageEvent = z.infer<typeof USAGE_EVENT>;

/**
 * A button's words, made safe to keep.
 *
 * Button text in the admin can carry a reader's name, an email or an order
 * number ("Refund 4417"). The log wants the verb, not the person: digits
 * become #, anything holding an @ is dropped, and the rest is cut short.
 */
export function scrubLabel(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.replace(/\s+/g, " ").trim();
  if (!s || s.includes("@")) return null;
  const out = s.replace(/\d+/g, "#").slice(0, 48).trim();
  return out.length > 0 ? out : null;
}

export type UsageRow = {
  /** The table's identity column: the order rows were written in. */
  id?: number;
  kind: "view" | "action";
  tab: string;
  ms: number | null;
  from_tab: string | null;
  label: string | null;
  at: string;
};

/** Under this, a Home view that opened the page and handed it on was never seen. */
const PHANTOM_MS = 1000;

/**
 * The log without the Home views nobody saw.
 *
 * Until 2026-11-04 the shell drew Home before it had read the address's
 * #tab= link (the server cannot see a link), so every visit opened from a
 * saved link to another page wrote a Home view first: opened with nothing
 * before it, gone in under a second, and handed on to the page the link
 * named. His log of 21 October to 4 November held 56 of them in 136 Home
 * rows, almost all handing on to Money. The shell no longer writes them
 * (AdminShell's `booted`); this keeps the month already written from
 * counting them as visits to Home and as moves from Home.
 *
 * A row is dropped when it is a Home view with no view before it, under a
 * second long, and the next view in the order written came from Home. That
 * next view was opened by the link, so it is kept with no view before it,
 * and does not count as a move from Home. A person who opens Home and leaves
 * it inside a second reads the same and is dropped with them: under a second
 * is not a look at a page. Rows come back in the order they were given.
 */
export function withoutPhantomHome<T extends UsageRow>(rows: readonly T[]): T[] {
  const order = rows.map((r, i) => ({ r, i }));
  order.sort((a, b) => (a.r.id ?? 0) - (b.r.id ?? 0) || a.r.at.localeCompare(b.r.at) || a.i - b.i);
  const drop = new Set<number>();
  const handedOn = new Set<number>();
  for (let k = 0; k < order.length; k++) {
    const r = order[k].r;
    if (r.kind !== "view" || r.tab !== "today" || r.from_tab !== null || (r.ms ?? 0) >= PHANTOM_MS) continue;
    const next = order.slice(k + 1).find((o) => o.r.kind === "view");
    if (next && next.r.from_tab === "today") {
      drop.add(order[k].i);
      handedOn.add(next.i);
    }
  }
  const out: T[] = [];
  rows.forEach((r, i) => {
    if (drop.has(i)) return;
    out.push(handedOn.has(i) ? { ...r, from_tab: null } : r);
  });
  return out;
}

export type UsageSummary = {
  events: number;
  since: string | null;
  views: { tab: string; opens: number; totalMs: number; quickExits: number }[];
  never: string[];
  paths: { from: string; to: string; count: number }[];
  actions: { tab: string; label: string; count: number }[];
};

export function summarizeUsage(all: UsageRow[], knownTabs: string[]): UsageSummary {
  const views = new Map<string, { opens: number; totalMs: number; quickExits: number }>();
  const paths = new Map<string, number>();
  const actions = new Map<string, number>();
  let since: string | null = null;
  const rows = withoutPhantomHome(all);

  for (const r of rows) {
    if (since === null || r.at < since) since = r.at;
    if (r.kind === "view") {
      const v = views.get(r.tab) ?? { opens: 0, totalMs: 0, quickExits: 0 };
      v.opens += 1;
      v.totalMs += r.ms ?? 0;
      if ((r.ms ?? 0) < QUICK_EXIT_MS) v.quickExits += 1;
      views.set(r.tab, v);
      if (r.from_tab && r.from_tab !== r.tab) {
        const k = `${r.from_tab}\u0000${r.tab}`;
        paths.set(k, (paths.get(k) ?? 0) + 1);
      }
    } else if (r.label) {
      const k = `${r.tab}\u0000${r.label}`;
      actions.set(k, (actions.get(k) ?? 0) + 1);
    }
  }

  return {
    events: rows.length,
    since,
    views: [...views.entries()]
      .map(([tab, v]) => ({ tab, ...v }))
      .sort((a, b) => b.opens - a.opens || b.totalMs - a.totalMs),
    never: knownTabs.filter((t) => !views.has(t)),
    paths: [...paths.entries()]
      .map(([k, count]) => {
        const [from, to] = k.split("\u0000");
        return { from, to, count };
      })
      .filter((p) => p.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    actions: [...actions.entries()]
      .map(([k, count]) => {
        const [tab, label] = k.split("\u0000");
        return { tab, label, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 15),
  };
}
