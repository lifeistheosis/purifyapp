"use client";

import { useChurchDay } from "@/lib/calendar/useChurchDay";
import { Skeleton } from "@/components/ui/Skeleton";
import { T } from "@/components/i18n/T";
import { TimelineRail } from "./TimelineRail";
import { TodaySaintCard } from "./TodaySaintCard";
import { FastTodayCard } from "./FastTodayCard";
import { TodayReadingsCard } from "./TodayReadingsCard";
import { PaschaCountdownCard } from "./PaschaCountdownCard";
import { TodaySayingCard } from "./TodaySayingCard";
import { sayingForDay } from "@/lib/today/saying";

/**
 * "The Church today": the day's saint, fast, readings, and the count to
 * Pascha, on the quiet sequenced rail.
 *
 * This is a client component ON PURPOSE. It used to be computed in the
 * TodayMobileV3 server component, which meant the Android static export
 * baked the build day into the APK and every one of these four cards was
 * wrong until the next release. See lib/calendar/useToday.ts for the full
 * account. The calendar-style preference is read from localStorage rather
 * than from the cookie, because the native shell has no server to read a
 * cookie at request time.
 *
 * The derivation itself, including why the Old Calendar shift applies to
 * the commemoration and the fast but not to the readings or the count to
 * Pascha, lives in lib/calendar/useChurchDay.ts.
 */
export function ChurchTodayRail() {
  const day = useChurchDay();

  // One frame before hydration. Reserving the rail's height keeps the
  // surface from jumping when the real day lands.
  //
  // Each placeholder mirrors the shape of the card it stands in for, rather
  // than every card being the same two-line box. That box reserved 68px each
  // against a rail that lands nearer 480px, so the front door dropped by about
  // 210px the moment the day resolved. Three things it never counted: the
  // saint card's height is set by a fixed 72x96 icon and not by its text, the
  // readings card is a list of rows rather than one line, and the fast and
  // Pascha cards both carry a third line.
  //
  // Five, not four. The fifth card is TodaySayingCard, which renders only when
  // the day's saint has no profile in the registry, and with 145 saints across
  // 366 days that is the more common day. Reserving it means profiled days
  // settle up by roughly the height of one card instead of every other day
  // settling down, and settling up does not slide a tap target out from under
  // a thumb.
  if (!day) {
    return (
      // TimelineRail wraps each array entry in its own <li> with a rail dot,
      // so this has to stay one flat array, in the order the real cards render.
      <TimelineRail>
        {[
          // Saint. The icon, not the copy, sets this card's height.
          <div
            key="saint"
            className="flex items-stretch gap-3 rounded-2xl border border-paper/10 bg-paper/[0.03] p-3.5"
          >
            <div className="min-w-0 flex-1">
              <Skeleton className="h-3 w-24" weight="faint" />
              <Skeleton className="mt-1 h-4 w-2/3" />
              <Skeleton className="mt-2.5 h-3 w-20" weight="faint" />
            </div>
            <Skeleton
              className="h-24 w-[72px] shrink-0 rounded-xl"
              weight="faint"
            />
          </div>,
          // Saying and fast are both eyebrow, title, third line.
          ...["saying", "fast"].map((k) => (
            <div
              key={k}
              className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-3.5"
            >
              <Skeleton className="h-3 w-24" weight="faint" />
              <Skeleton className="mt-2 h-4 w-2/3" />
              <Skeleton className="mt-2 h-3 w-1/2" weight="faint" />
            </div>
          )),
          // Readings: a chip and a reference per row. Two is the ordinary day,
          // Epistle and Gospel; an Old Testament reading joins them in Lent and
          // at feasts, and that day settles down by one row.
          <div
            key="readings"
            className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-3.5"
          >
            <Skeleton className="h-3 w-24" weight="faint" />
            <div className="mt-2 divide-y divide-paper/8">
              {[0, 1].map((i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <Skeleton
                    className="h-4 w-14 shrink-0 rounded-full"
                    weight="faint"
                  />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          </div>,
          // Pascha, same three-line shape.
          <div
            key="pascha"
            className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-3.5"
          >
            <Skeleton className="h-3 w-24" weight="faint" />
            <Skeleton className="mt-2 h-4 w-2/3" />
            <Skeleton className="mt-2 h-3 w-1/2" weight="faint" />
          </div>,
        ]}
      </TimelineRail>
    );
  }

  const { today, headline, headlineSaint, fast, readings, pascha } = day;

  // Only when the saint of the day has no profile to open. On a day that does
  // resolve, the reader already has somewhere to go and the rail stays short.
  const saying = headlineSaint ? null : sayingForDay(today);

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
        ...(saying
          ? [<TodaySayingCard key="saying" saying={saying} />]
          : []),
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
