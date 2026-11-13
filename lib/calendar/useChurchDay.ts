"use client";

// The day of the Church, derived once, for every surface that shows it.
//
// This existed twice, in components/today/ChurchTodayRail.tsx and in
// components/prayers/PrayersTodayClient.tsx, and the two copies had drifted:
// the Today rail shifted the lookup date for the Old (Julian) Calendar and
// /prayers/today did not, so an Old Calendar reader was shown one saint and
// one fasting rule on the home tab and a different saint and rule on the
// daily prayer page. Deriving it in one place is what stops that recurring.
//
// The shift is deliberately partial, and that asymmetry is the whole reason
// this is a named module rather than a one-liner:
//
//   - commemorations and the fast are looked up on the SHIFTED date, because
//     they hang off the fixed MM-DD menologion, which is what the two
//     reckonings disagree about.
//   - readings and the count to Pascha stay on the CIVIL date, because both
//     styles compute Pascha from the same Julian algorithm, so shifting them
//     would move the paschal cycle twice.
//
// Client-only, like everything else derived from "what day is it": under
// `output: "export"` a server component answers that question once, at build
// time, and the APK then shows the build day for its whole life. See
// lib/calendar/useToday.ts.

import { useMemo } from "react";

import {
  commemorationsOn,
  fastingStatus,
  paschaInfo,
  dayReadings,
  readingsOptionsFor,
  shiftForStyle,
  type CalStyle,
  type Commemoration,
  type FastingStatus,
  type PaschaInfo,
  type ReadingRef,
} from "@/lib/calendar/orthodox";
import type { SaintBrief } from "@/lib/saints/brief";
import { useCalendarStyleDefault } from "@/lib/calendar/useCalendarStyleDefault";
import { useToday, useTodayAtOnce } from "@/lib/calendar/useToday";

export type ChurchDay = {
  /** The reader's local civil day. */
  today: Date;
  /** The lead commemoration: a feast if the day has one, else the first. */
  headline: Commemoration | undefined;
  /** The saint behind the headline, in brief, when the registry has a profile. */
  headlineSaint: SaintBrief | null;
  /**
   * Every commemoration of the day, feasts and saints, on the day the
   * reader's calendar keeps: the one search's Saints (1.8, r3-31 B) lists
   * them where Today leads with the headline.
   */
  commemorations: Commemoration[];
  fast: FastingStatus;
  readings: ReadingRef[];
  /**
   * On a great feast whose own pair leads: the day's ordinary Epistle and
   * Gospel, shown under the feast's. Empty otherwise.
   */
  ordinaryReadings: ReadingRef[];
  /**
   * On a day the official calendar answers: the reading proper to the day's
   * saint or feast, shown under the day's own. Empty otherwise.
   */
  commemorationReadings: ReadingRef[];
  pascha: PaschaInfo;
};

/** The Church's day for a civil day, in the reader's reckoning. */
function churchDayOf(today: Date, style: CalStyle): ChurchDay {
  const lookup = shiftForStyle(today, style);
  // On the civil day, as before: both calendars reckon Pascha alike, so
  // shifting the readings would move the Paschal cycle twice. The official
  // list is a New Calendar one and is kept from an Old Calendar reader.
  const appointed = dayReadings(today, readingsOptionsFor(style));
  const commemorations = commemorationsOn(lookup);
  const headline =
    commemorations.find((c) => c.kind === "feast") ?? commemorations[0];
  return {
    today,
    headline,
    // commemorationsOn has already resolved every slug that names a profile.
    headlineSaint: headline?.saint ?? null,
    commemorations,
    // The civil day and the style: the rule moves only its fixed dates.
    fast: fastingStatus(today, style),
    readings: appointed.readings,
    ordinaryReadings: appointed.ordinary,
    commemorationReadings: appointed.commemoration,
    pascha: paschaInfo(today),
  };
}

/**
 * Null for the one frame before hydration, because `useToday()` is null
 * until mounted. Callers must render a placeholder for that frame rather
 * than a date, or the export bakes one in.
 */
export function useChurchDay(): ChurchDay | null {
  const today = useToday();
  const [style] = useCalendarStyleDefault();
  return useMemo(() => (today ? churchDayOf(today, style) : null), [today, style]);
}

/**
 * The same day, known in the first frame wherever a page is drawn on the
 * device (lib/calendar/useToday.ts, useTodayAtOnce): for a part that is only
 * ever drawn there, so nothing stands in for it and nothing under it moves
 * when it arrives. The journal's page for the day is the first to use it
 * (build 95 note 4): with useChurchDay it stood as an empty 200px for a
 * frame and then as itself, 268px with two readings, and the whole list
 * under it dropped 68px as a reader arrived. Null on the server, as
 * useChurchDay is, so no date is baked into the export.
 */
export function useChurchDayAtOnce(): ChurchDay | null {
  const today = useTodayAtOnce();
  const [style] = useCalendarStyleDefault();
  return useMemo(() => (today ? churchDayOf(today, style) : null), [today, style]);
}
