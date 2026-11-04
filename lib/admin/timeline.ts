import type { SinceEvent } from "./since";

/**
 * The log that never resets: its windows and its pages, pure, for the route
 * (app/api/admin/timeline) and the page (lib/admin/timelineStore.ts).
 *
 * The owner, 2026-11-04: "I don't want it to just keep resetting and
 * deleting ... I want it to just continue. I want a visual log that just
 * doesn't go away", this week first, "and if I keep scrolling, then show the
 * more data", never everything since Purify started in one read.
 */

const DAY_MS = 86_400_000;
/** A page is a week unless the page asks for another length. */
export const TIMELINE_DAYS = 7;
/** Nothing older is asked for: the admin's records start in May 2026. */
export const TIMELINE_FLOOR = "2026-05-01T00:00:00.000Z";
/** The newest window runs a minute past now, so a row stamped a moment ahead is not lost. */
const AHEAD_MS = 60_000;

export type TimelineAsk = { before?: string | null; after?: string | null; days?: string | null };

export type TimelineWindowSpec = {
  from: string;
  to: string;
  /** The newest week, asked with neither `before` nor `after`: it carries the line. */
  first: boolean;
  /** An older week can be asked for. */
  more: boolean;
  /** The window lies wholly before the floor: there is nothing to read. */
  empty: boolean;
};

function isoOrNull(raw: string | null | undefined): number | null | undefined {
  if (raw === null || raw === undefined || raw === "") return undefined;
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : null;
}

/** The window an ask names, or null when it names a time that is not one. */
export function timelineWindow(ask: TimelineAsk, now: number): TimelineWindowSpec | null {
  const floor = Date.parse(TIMELINE_FLOOR);
  const n = Number(ask.days);
  const days = Number.isInteger(n) && n >= 1 && n <= 31 ? n : TIMELINE_DAYS;
  const before = isoOrNull(ask.before);
  const after = isoOrNull(ask.after);
  if (before === null || after === null) return null;
  const end = now + AHEAD_MS;

  if (after !== undefined) {
    const from = Math.max(floor, Math.min(after, end));
    return { from: new Date(from).toISOString(), to: new Date(end).toISOString(), first: false, more: false, empty: false };
  }
  const to = before === undefined ? end : Math.min(before, end);
  const from = Math.max(floor, to - days * DAY_MS);
  return {
    from: new Date(from).toISOString(),
    to: new Date(to).toISOString(),
    first: before === undefined,
    more: from > floor,
    empty: to <= floor,
  };
}

/** One row's identity across pages and refreshes. */
export function eventKey(e: Pick<SinceEvent, "kind" | "at" | "title" | "detail">): string {
  return `${e.kind}|${e.at}|${e.title}|${e.detail}`;
}

/** Rows from every page and refresh, each once, newest first. */
export function mergeEvents(lists: readonly (readonly SinceEvent[])[]): SinceEvent[] {
  const seen = new Set<string>();
  const out: SinceEvent[] = [];
  for (const list of lists)
    for (const e of list) {
      const k = eventKey(e);
      if (seen.has(k) || !Number.isFinite(Date.parse(e.at))) continue;
      seen.add(k);
      out.push(e);
    }
  return out.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

/** Join times from every page, each once. */
export function mergeTimes(lists: readonly (readonly string[])[]): string[] {
  return [...new Set(lists.flat())];
}

/**
 * Where the "you last looked" line falls in a list that is newest first: the
 * index of the first row at or before it. Rows above it are new to him. The
 * list's length when every row is new; 0 when none is.
 */
export function lineIndex(events: readonly Pick<SinceEvent, "at">[], line: string | null): number {
  if (!line) return 0;
  const t = Date.parse(line);
  if (!Number.isFinite(t)) return 0;
  const i = events.findIndex((e) => Date.parse(e.at) <= t);
  return i === -1 ? events.length : i;
}

/** How many rows are newer than a moment: the bell's count of what he has not seen. */
export function newerThan(events: readonly Pick<SinceEvent, "at">[], at: string | null): number {
  if (!at) return 0;
  const t = Date.parse(at);
  if (!Number.isFinite(t)) return 0;
  return events.filter((e) => Date.parse(e.at) > t).length;
}
