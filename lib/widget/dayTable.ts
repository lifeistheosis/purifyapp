import {
  commemorationsOn,
  fastingStatus,
  shiftForStyle,
  type FastKind,
} from "@/lib/calendar/orthodox";

/**
 * The day table a home screen widget reads.
 *
 * ── Why a table and not a calculation ───────────────────────────────────
 *
 * A widget is native code. The commemoration and the fast are computed in
 * lib/calendar/orthodox.ts, which is pure and offline and therefore looks
 * portable, but it is TypeScript evaluated in a WebView over JSON compiled
 * into JS chunks. A WidgetKit extension is Swift and an AppWidgetProvider is
 * Kotlin, and neither can run any of it.
 *
 * The tempting fix is to port the paschalion to Swift and to Kotlin. That
 * gives three implementations of Meeus's algorithm plus the Julian offset, two
 * of them untested, and they will drift. This project keeps one reckoning on
 * purpose (lib/calendar/__tests__/oneReckoning.test.ts).
 *
 * So the calculation stays here, runs once at build time, and the widget reads
 * the answer. There is precedent: components/today/VerseOfDayCard.tsx prebakes
 * a 400 day window of verses because its source is server-only.
 *
 * ── Keyed by CIVIL date, carrying both reckonings ───────────────────────
 *
 * A reader on the Old Calendar sees a different day's saint. The first version
 * of this file emitted one table keyed by LOOKUP date and expected the widget
 * to subtract the offset itself. oneReckoning.test.ts rejected that, correctly:
 * it would have put date arithmetic in Swift and again in Kotlin, and at the
 * time nothing applied the shift at all, so the exemption would have described
 * behaviour that did not exist. That is the exact failure its comment warns
 * about.
 *
 * So the shift happens HERE, through shiftForStyle, and each civil date
 * carries both answers. The widget looks up today and picks a side. No date
 * math crosses the language boundary.
 */

export type WidgetDay = {
  /** The lead commemoration's display name. */
  saint: string;
  /** Its one-line note, when the entry has one. */
  note?: string;
  /** Short fast badge, e.g. "Fast day". */
  fastLabel: string;
  fastKind: FastKind;
};

export type WidgetDayEntry = {
  /** What a New (Revised Julian) Calendar reader sees on this civil day. */
  new: WidgetDay;
  /** What an Old (Julian) Calendar reader sees on the same civil day. */
  old: WidgetDay;
};

export type WidgetDayTable = {
  version: 2;
  /** First civil date in the table, YYYY-MM-DD. */
  from: string;
  days: Record<string, WidgetDayEntry>;
};

/** YYYY-MM-DD in UTC, matching every other date key in this codebase. */
function key(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** One reckoning's answer for a civil date. */
function dayFor(civil: Date, style: "new" | "old"): WidgetDay {
  const lookup = shiftForStyle(civil, style);
  const commemorations = commemorationsOn(lookup);
  // Same rule as useChurchDay: the feast if the day has one, else the first.
  const headline =
    commemorations.find((c) => c.kind === "feast") ?? commemorations[0];
  const fast = fastingStatus(lookup);
  return {
    // Every one of the 366 fixed dates carries a commemoration, but a fold-in
    // edge could still leave none, and a widget with an empty headline reads
    // as broken rather than as a quiet day.
    saint: headline?.name ?? fast.label,
    ...(headline?.note ? { note: headline.note } : {}),
    fastLabel: fast.label,
    fastKind: fast.kind,
  };
}

/** Build the table for `days` civil days starting at `start`. */
export function buildDayTable(start: Date, days: number): WidgetDayTable {
  const n = Math.max(1, Math.floor(days));
  const out: Record<string, WidgetDayEntry> = {};
  const from = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), 12),
  );

  for (let i = 0; i < n; i++) {
    const civil = new Date(from.getTime() + i * 86_400_000);
    out[key(civil)] = { new: dayFor(civil, "new"), old: dayFor(civil, "old") };
  }

  return { version: 2, from: key(from), days: out };
}
