import {
  commemorationsOn,
  currentSeason,
  fastingStatus,
  movableLabelOn,
  orthodoxPascha,
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
 *
 * ── Version 3 (2026-10-14): everything the seven widget families show ────
 *
 * The widgets of docs/WIDGETS.md need more than the saint and the fast: the
 * season a Mosaic widget wears, the next fast and the next great feast with
 * how many days off each is, and the Verse of the Day. All of it is worked
 * out here, from the same functions the app's screens call on the same
 * shifted day, so a widget can never disagree with the app. The days to the
 * next fast are counted here too: a widget never subtracts one date from
 * another.
 */

export type WidgetTheme = "pascha" | "nativity" | "theophany" | "dormition" | "lent";

export type WidgetSeason = {
  theme: WidgetTheme;
  /** The words over the art, English like the rest of the calendar. */
  title: string;
  line: string;
};

export type WidgetCountdown = {
  name: string;
  /** The civil date it falls on, YYYY-MM-DD. */
  date: string;
  /** Days from this civil day, counted here. 0 is today. */
  days: number;
};

export type WidgetDay = {
  /** The lead commemoration's display name. */
  saint: string;
  /** Its one-line note, when the entry has one. */
  note?: string;
  /** Short fast badge, e.g. "Fast day". */
  fastLabel: string;
  fastKind: FastKind;
  /** The Mosaic widget's season, on the days one is on. */
  season?: WidgetSeason;
  /** The next fast season to begin (Nativity, Great Lent, Apostles', Dormition). */
  nextFast?: WidgetCountdown;
  /** The next of the great feasts. */
  nextFeast?: WidgetCountdown;
};

export type WidgetVerse = {
  text: string;
  /** "Luke 5:32" */
  ref: string;
  /** "/bible/luke/5#v32" */
  href: string;
};

export type WidgetDayEntry = {
  /** What a New (Revised Julian) Calendar reader sees on this civil day. */
  new: WidgetDay;
  /** What an Old (Julian) Calendar reader sees on the same civil day. */
  old: WidgetDay;
  /** The Verse of the Day, the same in both reckonings, as the app shows it. */
  verse?: WidgetVerse;
};

export type WidgetDayTable = {
  version: 3;
  /** First civil date in the table, YYYY-MM-DD. */
  from: string;
  days: Record<string, WidgetDayEntry>;
};

/** YYYY-MM-DD in UTC, matching every other date key in this codebase. */
function key(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const DAY_MS = 86_400_000;

/** Whole days from b to a, both at UTC noon. */
function between(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / DAY_MS);
}

function monthDay(d: Date): string {
  return `${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/** Days from this lookup day's Pascha (negative before it). */
function fromPascha(lookup: Date): number {
  return between(lookup, orthodoxPascha(lookup.getUTCFullYear()));
}

// The fixed great feasts, by the calendar date the app looks them up on. Their
// names are taken from the app's own commemorations for that day, so the
// widget says what the Calendar says; these are only the fall-back.
const FIXED_GREAT_FEASTS: Record<string, string> = {
  "09-08": "Nativity of the Theotokos",
  "09-14": "Elevation of the Precious Cross",
  "11-21": "Entry of the Theotokos into the Temple",
  "12-25": "Nativity of Christ",
  "01-06": "Theophany",
  "02-02": "Meeting of the Lord",
  "03-25": "Annunciation",
  "08-06": "Transfiguration",
  "08-15": "Dormition of the Theotokos",
};

// The movable great feasts, by days from Pascha, with the app's own label
// for that day when it has one.
const MOVABLE_GREAT_FEASTS: Record<number, string> = {
  [-7]: "Entry into Jerusalem",
  0: "Pascha",
  39: "Ascension",
  49: "Pentecost",
};

/** The great feast on this lookup day, or null. */
function greatFeastOn(lookup: Date): string | null {
  const md = monthDay(lookup);
  if (FIXED_GREAT_FEASTS[md]) {
    const feast = commemorationsOn(lookup).find((c) => c.kind === "feast");
    return feast?.name ?? FIXED_GREAT_FEASTS[md];
  }
  const off = fromPascha(lookup);
  if (MOVABLE_GREAT_FEASTS[off]) return movableLabelOn(lookup) ?? MOVABLE_GREAT_FEASTS[off];
  return null;
}

// The four fast seasons, by the names currentSeason gives them.
const FAST_SEASONS = new Set(["Nativity Fast", "Great Lent", "Apostles' Fast", "Dormition Fast"]);

/** The fast season this lookup day is in, or null. */
function fastSeasonOn(lookup: Date): string | null {
  const label = currentSeason(lookup)?.label ?? null;
  return label && FAST_SEASONS.has(label) ? label : null;
}

/** Does a fast season begin on this lookup day? Its name, or null. */
function fastBeginsOn(lookup: Date): string | null {
  const today = fastSeasonOn(lookup);
  if (!today) return null;
  const before = new Date(lookup.getTime() - DAY_MS);
  return fastSeasonOn(before) === today ? null : today;
}

/** The Mosaic season worn on this lookup day, or undefined. */
function seasonOn(lookup: Date): WidgetSeason | undefined {
  const off = fromPascha(lookup);
  // Pascha to the eve of the Ascension: forty days of "Christ is risen!".
  if (off >= 0 && off <= 38) return { theme: "pascha", title: "Christ is risen!", line: "Truly He is risen!" };
  const season = currentSeason(lookup);
  if (season?.label === "Great Lent") {
    const day = Math.min(40, between(lookup, new Date(orthodoxPascha(lookup.getUTCFullYear()).getTime() - 48 * DAY_MS)) + 1);
    return { theme: "lent", title: "Great Lent", line: `Day ${day} of 40` };
  }
  if (season?.label === "Holy Week" || season?.label === "Palm Sunday") {
    return { theme: "lent", title: season.label, line: season.subtheme ?? "" };
  }
  const md = monthDay(lookup);
  if (md >= "12-25" || md <= "01-05") return { theme: "nativity", title: "Christ is born!", line: "Glorify Him!" };
  if (md >= "01-06" && md <= "01-14") return { theme: "theophany", title: "Theophany", line: "January 6" };
  if (md >= "08-15" && md <= "08-23") return { theme: "dormition", title: "Dormition of the Theotokos", line: "August 15" };
  return undefined;
}

type DayFacts = {
  day: Omit<WidgetDay, "nextFast" | "nextFeast">;
  fastBegins: string | null;
  feast: string | null;
};

/** One reckoning's answer for a civil day, before the countdowns. */
function factsFor(civil: Date, style: "new" | "old"): DayFacts {
  const lookup = shiftForStyle(civil, style);
  const commemorations = commemorationsOn(lookup);
  // Same rule as useChurchDay: the feast if the day has one, else the first.
  const headline =
    commemorations.find((c) => c.kind === "feast") ?? commemorations[0];
  const fast = fastingStatus(lookup);
  const season = seasonOn(lookup);
  return {
    day: {
      // Every one of the 366 fixed dates carries a commemoration, but a fold-in
      // edge could still leave none, and a widget with an empty headline reads
      // as broken rather than as a quiet day.
      saint: headline?.name ?? fast.label,
      ...(headline?.note ? { note: headline.note } : {}),
      fastLabel: fast.label,
      fastKind: fast.kind,
      ...(season ? { season } : {}),
    },
    fastBegins: fastBeginsOn(lookup),
    feast: greatFeastOn(lookup),
  };
}

/**
 * How far ahead the countdowns look past the table's last day. A fast season
 * begins at least every few months and a great feast at least every few, so a
 * year past the end means every day in the table finds its next one.
 */
const HORIZON = 370;

/**
 * Build the table for `days` civil days starting at `start`. `verses`, when
 * given, is the Verse of the Day by civil date (the emitter reads it from
 * lib/today/verseOfDay.ts, which is server code this file cannot import).
 */
export function buildDayTable(
  start: Date,
  days: number,
  verses?: Record<string, WidgetVerse>,
): WidgetDayTable {
  const n = Math.max(1, Math.floor(days));
  const from = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), 12),
  );
  const civil = (i: number) => new Date(from.getTime() + i * DAY_MS);

  // Every day's facts once, the table's days and a horizon past them, then one
  // pass backwards to find, for each day, the next fast and feast from it.
  const byStyle = (style: "new" | "old") => {
    const facts: DayFacts[] = [];
    for (let i = 0; i < n + HORIZON; i++) facts.push(factsFor(civil(i), style));
    const out: WidgetDay[] = new Array(n);
    let nextFast: number | null = null;
    let nextFeast: number | null = null;
    for (let i = n + HORIZON - 1; i >= 0; i--) {
      if (facts[i].fastBegins) nextFast = i;
      if (facts[i].feast) nextFeast = i;
      if (i >= n) continue;
      out[i] = {
        ...facts[i].day,
        ...(nextFast !== null
          ? { nextFast: { name: `${facts[nextFast].fastBegins} begins`, date: key(civil(nextFast)), days: nextFast - i } }
          : {}),
        ...(nextFeast !== null
          ? { nextFeast: { name: facts[nextFeast].feast!, date: key(civil(nextFeast)), days: nextFeast - i } }
          : {}),
      };
    }
    return out;
  };

  const newDays = byStyle("new");
  const oldDays = byStyle("old");
  const out: Record<string, WidgetDayEntry> = {};
  for (let i = 0; i < n; i++) {
    const k = key(civil(i));
    const verse = verses?.[k];
    out[k] = { new: newDays[i], old: oldDays[i], ...(verse ? { verse } : {}) };
  }

  return { version: 3, from: key(from), days: out };
}
