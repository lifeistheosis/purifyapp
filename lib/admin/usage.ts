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
  kind: "view" | "action";
  tab: string;
  ms: number | null;
  from_tab: string | null;
  label: string | null;
  at: string;
};

export type UsageSummary = {
  events: number;
  since: string | null;
  views: { tab: string; opens: number; totalMs: number; quickExits: number }[];
  never: string[];
  paths: { from: string; to: string; count: number }[];
  actions: { tab: string; label: string; count: number }[];
};

export function summarizeUsage(rows: UsageRow[], knownTabs: string[]): UsageSummary {
  const views = new Map<string, { opens: number; totalMs: number; quickExits: number }>();
  const paths = new Map<string, number>();
  const actions = new Map<string, number>();
  let since: string | null = null;

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
