/**
 * "Since you last looked": the line the Home's feed starts from, and the
 * feed's rows put in order.
 *
 * The owner's pick for Home on sheet r3-15 (2026-10-30), B and A mixed: B's
 * feed of what changed since he last looked, each row a door to its page,
 * under A's few numbers and the goals. His own log is why: Home is a five
 * second look on the way to Money, and what changed since he last looked is
 * what a five second look is for.
 *
 * WHERE THE LINE COMES FROM. His use log (admin_usage, lib/admin/usage.ts):
 * the admin writes a row for every view he closes, so his visits are runs of
 * rows, and a gap of half an hour ends one. The line is where his previous
 * visit ended, or where he last pressed "Mark all as seen" if that is later.
 * A log that cannot be read gives no line, and the route then says it is
 * showing the last day instead (never a line it made up).
 *
 * Pure: the rows and the clock come in. The reads are in
 * app/api/admin/since/route.ts, the drawing in components/admin/tabs/HomeTab.tsx.
 */

/** A pause this long between two rows of his log ends a visit. */
export const VISIT_GAP_MS = 30 * 60_000;

/** The button that moves the line to now. The usage log keeps it as an action with this label. */
export const MARK_SEEN = "Mark all as seen";

/** The farthest back a line may sit: the log keeps a month. */
export const LINE_MAX_AGE_MS = 30 * 86_400_000;

export type UsageMark = { at: string; kind: string; label: string | null };

/**
 * When his previous visit ended: the newest row that comes after a pause of
 * `gapMs` or more, walking back from now. The rows of the visit he is on now
 * are skipped by the same walk, since each sits within the gap of the next.
 * Null when there is no earlier visit in the rows.
 */
export function lastVisitEnd(times: readonly string[], now: number, gapMs = VISIT_GAP_MS): string | null {
  const ts = times
    .map((t) => Date.parse(t))
    .filter((t) => Number.isFinite(t) && t <= now + 60_000)
    .sort((a, b) => b - a);
  let edge = now;
  for (const t of ts) {
    if (edge - t >= gapMs) return new Date(t).toISOString();
    edge = t;
  }
  return null;
}

/** The newest "Mark all as seen" in the rows, or null. */
export function lastMarkSeen(rows: readonly UsageMark[]): string | null {
  let best: number | null = null;
  for (const r of rows) {
    if (r.kind !== "action" || r.label !== MARK_SEEN) continue;
    const t = Date.parse(r.at);
    if (Number.isFinite(t) && (best === null || t > best)) best = t;
  }
  return best === null ? null : new Date(best).toISOString();
}

export type Line = {
  /** ISO. The feed counts what happened after it. */
  at: string;
  /**
   * visit: where his previous visit ended. mark: where he last marked all as
   * seen. asked: a time the page asked for (it moved the line itself). day:
   * no line could be found, so the last 24 hours, and the page says so.
   */
  basis: "visit" | "mark" | "asked" | "day";
};

/**
 * The line, from his log rows. `asked` is a time the page sent (the line it
 * already showed, or now after a mark), and wins when it is a sane time.
 */
export function lineFrom(rows: readonly UsageMark[] | null, now: number, asked?: string | null): Line {
  const day = { at: new Date(now - 86_400_000).toISOString(), basis: "day" as const };
  if (asked) {
    const t = Date.parse(asked);
    if (Number.isFinite(t) && t <= now && now - t <= LINE_MAX_AGE_MS) return { at: new Date(t).toISOString(), basis: "asked" };
  }
  if (!rows) return day;
  const visit = lastVisitEnd(
    rows.map((r) => r.at),
    now,
  );
  const mark = lastMarkSeen(rows);
  const v = visit ? Date.parse(visit) : null;
  const m = mark ? Date.parse(mark) : null;
  if (m !== null && (v === null || m > v)) return { at: mark!, basis: "mark" };
  if (v !== null && now - v <= LINE_MAX_AGE_MS) return { at: visit!, basis: "visit" };
  return day;
}

// ── The feed ─────────────────────────────────────────────────────────────

/**
 * The admin's own marks (sheet r3-15): good is solid, done (paid, joined,
 * ticked); wait is a ring, waiting on him (a request, a ticket); news is a
 * plain dot, something to know.
 */
export type FeedMark = "good" | "wait" | "news";

export type SinceEvent = {
  /** ISO. */
  at: string;
  kind: "order" | "refund" | "member" | "ticket" | "check" | "seal" | "tick" | "readers";
  mark: FeedMark;
  title: string;
  detail: string;
  /** The tab the row opens. */
  tab: string;
  /** The words at the row's right: where it goes. */
  go: string;
  /** The detail carries a person (an email, a claim): blurred under streamer mode. */
  sensitive?: boolean;
  /** Money in the title: blurred under streamer mode. */
  money?: boolean;
};

const DAY_MS = 86_400_000;

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Which part of the day a local hour falls in: night is midnight to five. */
function partOf(hour: number): "night" | "morning" | "afternoon" | "evening" {
  if (hour < 5) return "night";
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

/**
 * The heading a row sits under, in the admin's local time, as the sheet wrote
 * them: "This morning", "Overnight", "Thursday evening", then dates.
 */
export function dayPartLabel(at: Date, now: Date): string {
  const days = Math.round((startOfLocalDay(now) - startOfLocalDay(at)) / DAY_MS);
  const part = partOf(at.getHours());
  if (days <= 0) {
    if (part === "night") return "Overnight";
    return `This ${part}`;
  }
  if (days < 7) {
    const day = at.toLocaleDateString("en-US", { weekday: "long" });
    return days === 1 && part === "night" ? `${day} night` : `${day} ${part}`;
  }
  return at.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** "09:38", local and 24 hour, the time column of the feed. */
export function clockOf(at: Date): string {
  return `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`;
}

/**
 * The new readers as rows, one per part of the day they joined in, so forty
 * readers overnight read as one line where they joined and not as forty.
 */
export function readerRows(times: readonly string[], now: Date): SinceEvent[] {
  const parts = new Map<string, { count: number; newest: number }>();
  for (const t of times) {
    const ms = Date.parse(t);
    if (!Number.isFinite(ms)) continue;
    const label = dayPartLabel(new Date(ms), now);
    const p = parts.get(label) ?? { count: 0, newest: ms };
    p.count += 1;
    if (ms > p.newest) p.newest = ms;
    parts.set(label, p);
  }
  return [...parts.values()].map((p) => ({
    at: new Date(p.newest).toISOString(),
    kind: "readers" as const,
    mark: "good" as const,
    title: p.count === 1 ? "A new reader" : `${p.count.toLocaleString("en-US")} new readers`,
    detail: p.count === 1 ? "joined" : `the newest at ${clockOf(new Date(p.newest))}`,
    tab: "users",
    go: "Readers",
  }));
}

export type FeedGroup = { label: string; rows: SinceEvent[] };

/** Newest first, grouped under the part of the day each happened in. */
export function groupFeed(events: readonly SinceEvent[], now: Date): FeedGroup[] {
  const sorted = [...events]
    .filter((e) => Number.isFinite(Date.parse(e.at)))
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const out: FeedGroup[] = [];
  for (const e of sorted) {
    const label = dayPartLabel(new Date(e.at), now);
    const last = out[out.length - 1];
    if (last && last.label === label) last.rows.push(e);
    else out.push({ label, rows: [e] });
  }
  return out;
}

export type SinceTotals = {
  orderCents: number;
  orders: number;
  readers: number | null;
  members: number;
  requests: number;
  tickets: number;
};

/** The line of totals over the feed. */
export function sinceTotals(events: readonly SinceEvent[], readers: number | null, orderCents: number): SinceTotals {
  const n = (k: SinceEvent["kind"]) => events.filter((e) => e.kind === k).length;
  return {
    orderCents,
    orders: n("order"),
    readers,
    members: n("member"),
    requests: n("check") + n("seal"),
    tickets: n("ticket"),
  };
}

/**
 * How long ago, in words, for the line under the heading: "12 hours ago",
 * "3 days ago", "a few minutes ago".
 */
export function agoWords(at: string, now: number): string {
  const s = Math.max(0, (now - Date.parse(at)) / 1000);
  if (!Number.isFinite(s)) return "";
  if (s < 600) return "a few minutes ago";
  if (s < 5400) return `${Math.round(s / 60)} minutes ago`;
  if (s < 36 * 3600) return `${Math.round(s / 3600)} hours ago`;
  return `${Math.round(s / 86_400)} days ago`;
}

/** "Thursday 21:40", or "Oct 27, 21:40" a week back and more. */
export function lineWords(at: string, now: Date): string {
  const d = new Date(at);
  const days = Math.round((startOfLocalDay(now) - startOfLocalDay(d)) / DAY_MS);
  const clock = clockOf(d);
  if (days <= 0) return `Today ${clock}`;
  if (days === 1) return `Yesterday ${clock}`;
  if (days < 7) return `${d.toLocaleDateString("en-US", { weekday: "long" })} ${clock}`;
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${clock}`;
}

// ── Goals, the hour's pace in words ──────────────────────────────────────

/** Before this many minutes of the hour, a pace is noise (lib/admin/hourlyGoals.ts PACE_MIN_MINUTES). */
const PACE_MINUTES = 12;

/**
 * Where a goal stands against where the hour usually is by now, in the
 * sheet's words. `target` is the hour's own derived target, or null while the
 * hour has too little history to have one.
 */
export function paceWord(value: number, target: number | null, minutes: number): string {
  if (target === null || target <= 0) return "no target yet: this hour has too little history";
  if (value >= target) return "reached";
  if (minutes < PACE_MINUTES) return "too early in the hour to say";
  const expected = (target * Math.min(60, minutes)) / 60;
  if (value >= expected * 1.1) return "ahead of where this hour usually is by now";
  if (value >= expected * 0.9) return "on pace";
  if (value >= expected * 0.6) return "a little behind";
  return "behind";
}
