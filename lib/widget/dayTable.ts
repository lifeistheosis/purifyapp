import {
  commemorationsOn,
  fastingStatus,
  JULIAN_OFFSET_DAYS,
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
 * gives three implementations of Meeus's algorithm plus the Julian offset,
 * two of them untested, and they will drift. This project already keeps one
 * reckoning on purpose (lib/calendar/__tests__/oneReckoning.test.ts).
 *
 * So the calculation stays here, runs once at build time, and the widget reads
 * the answer. There is precedent: components/today/VerseOfDayCard.tsx sets
 * WINDOW_DAYS to 400 on the static export and prebakes a year of verses for
 * exactly this reason, because its source is server-only.
 *
 * ── One table, both calendar styles ─────────────────────────────────────
 *
 * Readers on the Old Calendar see a different day's saint. That is not a
 * second table: shiftForStyle is a flat JULIAN_OFFSET_DAYS subtraction on the
 * LOOKUP date, so the widget subtracts the same offset before indexing. The
 * offset ships in the payload rather than being hardcoded native-side, so it
 * can never disagree with the TypeScript.
 *
 * Keys are the LOOKUP date, not the civil date, which is what makes that work.
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

export type WidgetDayTable = {
  version: 1;
  /** The first lookup date in the table, YYYY-MM-DD. */
  from: string;
  /** Days the Old Calendar reader subtracts before indexing. */
  julianOffsetDays: number;
  days: Record<string, WidgetDay>;
};

/** YYYY-MM-DD in UTC, matching every other date key in this codebase. */
function key(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Build the table for `days` days starting at `start`.
 *
 * The headline rule is copied from useChurchDay deliberately rather than
 * shared, because that hook is React and this runs in a build script. The test
 * asserts the two agree; if the hook's rule changes, the test fails rather
 * than the widget quietly disagreeing with the app it sits beside.
 */
export function buildDayTable(start: Date, days: number): WidgetDayTable {
  const n = Math.max(1, Math.floor(days));
  const out: Record<string, WidgetDay> = {};
  const from = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), 12),
  );

  for (let i = 0; i < n; i++) {
    const d = new Date(from.getTime() + i * 86_400_000);
    const commemorations = commemorationsOn(d);
    // Same rule as useChurchDay: the feast if the day has one, else the first.
    const headline =
      commemorations.find((c) => c.kind === "feast") ?? commemorations[0];
    const fast = fastingStatus(d);
    out[key(d)] = {
      // Every one of the 366 fixed dates carries at least one commemoration,
      // but a fold-in edge could still leave none, and a widget with an empty
      // headline is worse than one naming the fast alone.
      saint: headline?.name ?? fast.label,
      ...(headline?.note ? { note: headline.note } : {}),
      fastLabel: fast.label,
      fastKind: fast.kind,
    };
  }

  return {
    version: 1,
    from: key(from),
    julianOffsetDays: JULIAN_OFFSET_DAYS,
    days: out,
  };
}
