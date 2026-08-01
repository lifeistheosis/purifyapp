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
  readingsOn,
  shiftForStyle,
  type Commemoration,
  type FastingStatus,
  type PaschaInfo,
  type ReadingRef,
} from "@/lib/calendar/orthodox";
import { getSaint, type Saint } from "@/lib/saints/saints";
import { useCalendarStyleDefault } from "@/lib/calendar/useCalendarStyleDefault";
import { useToday } from "@/lib/calendar/useToday";

export type ChurchDay = {
  /** The reader's local civil day. */
  today: Date;
  /** The lead commemoration: a feast if the day has one, else the first. */
  headline: Commemoration | undefined;
  /** The saint behind the headline, when the registry has a profile. */
  headlineSaint: Saint | null;
  fast: FastingStatus;
  readings: ReadingRef[];
  pascha: PaschaInfo;
};

/**
 * Null for the one frame before hydration, because `useToday()` is null
 * until mounted. Callers must render a placeholder for that frame rather
 * than a date, or the export bakes one in.
 */
export function useChurchDay(): ChurchDay | null {
  const today = useToday();
  const [style] = useCalendarStyleDefault();

  return useMemo(() => {
    if (!today) return null;
    const lookup = shiftForStyle(today, style);
    const commemorations = commemorationsOn(lookup);
    const headline =
      commemorations.find((c) => c.kind === "feast") ?? commemorations[0];
    return {
      today,
      headline,
      headlineSaint:
        headline?.saint ?? (headline?.slug ? getSaint(headline.slug) : null),
      fast: fastingStatus(lookup),
      readings: readingsOn(today),
      pascha: paschaInfo(today),
    };
  }, [today, style]);
}
