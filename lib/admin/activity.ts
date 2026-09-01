// Turning the panel's polled numbers into a feed of things that just happened.
//
// EVERY EVENT IS DERIVED FROM A REAL CHANGE. Nothing here invents activity.
// The panel already polls /api/admin/stats and /api/admin/overview on a timer;
// this diffs consecutive snapshots and reports what moved. A dashboard that
// announced plausible-looking events would be worse than one that announced
// nothing, because the whole value of the thing is that it is true. larp mode
// exists for the other case, is labelled on screen while it is on, and flows
// through this untouched: if the numbers it feeds are inflated, the events say
// so by being inflated too.
//
// Consequently there is no event for "nothing changed", and a quiet hour shows
// an empty bar. That is the honest output and it is also the useful one: a feed
// that always has something in it stops meaning anything.
//
// Pure, so vitest can hold it. The rendering, the timers and the fade live in
// components/admin/ActivityFeed.tsx.

export type ActivityKind =
  | "visitor"
  | "signup"
  | "sale"
  | "subscriber"
  | "milestone";

export type ActivityEvent = {
  /** Stable within a session, so React keys and dedupe both work. */
  id: string;
  kind: ActivityKind;
  /** The sentence shown. Written here so the copy sits beside its trigger. */
  text: string;
  /** Country flag, a currency amount, whatever the row leads with. */
  badge?: string;
};

/** What a poll gives us, reduced to only the fields an event can come from. */
export type ActivitySnapshot = {
  todayVisitors: number;
  todaySignups: number;
  yesterdayVisitors: number;
  revenueTodayCents: number;
  paidPlus: number;
  paidPro: number;
  /** Live session country codes, lowercase ISO-3166 alpha-2. */
  countries: string[];
};

/** ISO-3166 alpha-2 to its flag. Two regional indicators, no image needed. */
export function flagFor(code: string | null | undefined): string {
  if (!code || code.length !== 2 || !/^[a-z]{2}$/i.test(code)) return "🌐";
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}

function money(cents: number): string {
  const d = cents / 100;
  return `$${d.toLocaleString("en-US", { maximumFractionDigits: d < 100 ? 2 : 0 })}`;
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

/**
 * What changed between two polls.
 *
 * `seq` only makes ids unique across calls; it carries no meaning and is not
 * shown. Returns newest-last, in the order they are worth reading.
 */
export function diffActivity(
  prev: ActivitySnapshot | null,
  next: ActivitySnapshot,
  seq: number,
): ActivityEvent[] {
  // The first poll is not news. Without this, opening the panel would announce
  // the entire day at once as though it had all just happened.
  if (!prev) return [];

  const out: ActivityEvent[] = [];
  const id = (k: string) => `${seq}:${k}`;

  // A country that was not in the previous set of live sessions. Reported once
  // per arrival rather than per session, so a reader opening four tabs is one
  // event.
  const before = new Set(prev.countries);
  for (const c of new Set(next.countries)) {
    if (before.has(c)) continue;
    out.push({
      id: id(`visitor:${c}`),
      kind: "visitor",
      badge: flagFor(c),
      text: "Someone just started reading",
    });
  }

  const signups = next.todaySignups - prev.todaySignups;
  if (signups > 0) {
    out.push({
      id: id("signup"),
      kind: "signup",
      badge: "✦",
      text: `${signups} new ${plural(signups, "account", "accounts")}`,
    });
  }

  const sale = next.revenueTodayCents - prev.revenueTodayCents;
  if (sale > 0) {
    out.push({
      id: id("sale"),
      kind: "sale",
      badge: money(sale),
      text: "An order came in",
    });
  }

  const subs = next.paidPlus + next.paidPro - (prev.paidPlus + prev.paidPro);
  if (subs > 0) {
    out.push({
      id: id("subscriber"),
      kind: "subscriber",
      badge: "★",
      text: `${subs} new ${plural(subs, "subscriber", "subscribers")}`,
    });
  }

  // Crossing yesterday is reported on the poll that crosses it and never
  // again, which is why it tests the PREVIOUS value too. Without that it would
  // fire on every poll for the rest of the day.
  if (
    next.yesterdayVisitors > 0 &&
    next.todayVisitors > next.yesterdayVisitors &&
    prev.todayVisitors <= prev.yesterdayVisitors
  ) {
    out.push({
      id: id("milestone:yesterday"),
      kind: "milestone",
      badge: "▲",
      text: "Today has passed yesterday",
    });
  }

  return out;
}

/**
 * How long a row sits before it fades.
 *
 * Longer for the rare things. A visitor arriving is one of many and can go
 * quickly; a sale or a milestone is worth still being on screen when the
 * operator looks up.
 */
export function dwellMs(kind: ActivityKind): number {
  switch (kind) {
    case "sale":
    case "milestone":
      return 9000;
    case "subscriber":
      return 8000;
    default:
      return 5500;
  }
}

// trim() and MAX_VISIBLE were here. The bar capped its own visible rows and
// dropped the rest on the floor, which is the behaviour that made the whole
// feed unusable: an event that scrolled past was gone for good. Capping is now
// lib/admin/activityStore.ts's job, where it caps a RETAINED history rather
// than a discarded one, and the strip takes its own slice off the top.
