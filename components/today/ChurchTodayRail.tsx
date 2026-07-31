"use client";

import { useMemo } from "react";
import {
  commemorationsOn,
  fastingStatus,
  paschaInfo,
  readingsOn,
  shiftForStyle,
} from "@/lib/calendar/orthodox";
import { getSaint } from "@/lib/saints/saints";
import { useCalendarStyleDefault } from "@/lib/calendar/useCalendarStyleDefault";
import { useToday } from "@/lib/calendar/useToday";
import { Skeleton } from "@/components/ui/Skeleton";
import { T } from "@/components/i18n/T";
import { TimelineRail } from "./TimelineRail";
import { TodaySaintCard } from "./TodaySaintCard";
import { FastTodayCard } from "./FastTodayCard";
import { TodayReadingsCard } from "./TodayReadingsCard";
import { PaschaCountdownCard } from "./PaschaCountdownCard";

/**
 * "The Church today": the day's saint, fast, readings, and the count to
 * Pascha, on the quiet sequenced rail.
 *
 * This is a client component ON PURPOSE. It used to be computed in the
 * TodayMobileV3 server component, which meant the Android static export
 * baked the build day into the APK and every one of these four cards was
 * wrong until the next release. See lib/calendar/useToday.ts for the full
 * account. The calendar-style preference is read from localStorage here
 * rather than from the cookie, because the native shell has no server to
 * read a cookie at request time.
 *
 * Pascha-relative readings stay on the civil date because both calendar
 * styles compute Pascha from the same Julian algorithm.
 */
export function ChurchTodayRail() {
  const today = useToday();
  const [style] = useCalendarStyleDefault();

  const day = useMemo(() => {
    if (!today) return null;
    const lookup = shiftForStyle(today, style);
    const commemorations = commemorationsOn(lookup);
    const headline =
      commemorations.find((c) => c.kind === "feast") ?? commemorations[0];
    return {
      headline,
      headlineSaint:
        headline?.saint ?? (headline?.slug ? getSaint(headline.slug) : null),
      fast: fastingStatus(lookup),
      readings: readingsOn(today),
      pascha: paschaInfo(today),
    };
  }, [today, style]);

  // One frame before hydration. Reserving the rail's height keeps the
  // surface from jumping when the real day lands.
  if (!day) {
    return (
      <TimelineRail>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-3.5"
          >
            <Skeleton className="h-3 w-24" weight="faint" />
            <Skeleton className="mt-2.5 h-4 w-2/3" />
          </div>
        ))}
      </TimelineRail>
    );
  }

  const { headline, headlineSaint, fast, readings, pascha } = day;

  return (
    <TimelineRail>
      {[
        headlineSaint ? (
          <TodaySaintCard key="saint" saint={headlineSaint} />
        ) : headline ? (
          // Commemorated but not deeply profiled in our registry. Render
          // the headline so the user sees the saint's name instead of an
          // "empty" message. Tap-through goes to the calendar day, which
          // shows fuller commemoration text.
          <TodaySaintCard
            key="saint-no-profile"
            fallbackName={headline.name}
            fallbackNote={headline.note}
          />
        ) : (
          <div
            key="saint-empty"
            className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-3.5"
          >
            <p className="font-sans text-caption text-paper/55">
              <T k="today.saintEyebrow" />
            </p>
            <p className="mt-2 font-sans text-ui text-paper/55 italic">
              <T k="today.noSaint" />
            </p>
          </div>
        ),
        <FastTodayCard key="fast" fast={fast} />,
        <TodayReadingsCard key="readings" readings={readings} />,
        <PaschaCountdownCard
          key="pascha"
          daysAway={pascha.daysAway}
          year={pascha.date.getUTCFullYear()}
        />,
      ]}
    </TimelineRail>
  );
}
