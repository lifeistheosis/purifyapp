import { cookies } from "next/headers";
import {
  commemorationsOn,
  fastingStatus,
  paschaInfo,
  readingsOn,
  shiftForStyle,
  startOfDayUtc,
  type CalStyle,
} from "@/lib/calendar/orthodox";
import { CALENDAR_STYLE_COOKIE } from "@/lib/calendar/styleDefault";
import { getSaint } from "@/lib/saints/saints";
import { MobileTopTabs } from "./MobileTopTabs";
import { UserAvatarSmall } from "./UserAvatarSmall";
import { TimelineRail } from "./TimelineRail";
import { VerseOfDayCard } from "./VerseOfDayCard";
import { PrayNowCard } from "./PrayNowCard";
import { TodaySaintCard } from "./TodaySaintCard";
import { FastTodayCard } from "./FastTodayCard";
import { TodayReadingsCard } from "./TodayReadingsCard";
import { PaschaCountdownCard } from "./PaschaCountdownCard";
import { GreetingHeader } from "./GreetingHeader";
import { QuickAccessGrid } from "./QuickAccessGrid";
import { FirstStepsNudge } from "@/components/onboarding/FirstStepsNudge";
import { T } from "@/components/i18n/T";

/**
 * Mobile-only Today shell (v6.10 rework; Beta 2.3 i18n pass).
 *
 * Reads the user's calendar-style preference (`purify_calendar_style`
 * cookie, set by ProfileSettings) and shifts the fixed-cycle lookups
 * (saint of the day, fast) accordingly — matching the calendar page.
 *
 * This server component computes DATA only; every user-facing string is
 * rendered by client children (useTranslate) or <T> islands, so the
 * whole surface follows a native locale switch. The old isDe label maps
 * are gone; copy lives in the catalogs under today.*.
 *
 * Pascha-relative readings stay on the civil date because both calendar
 * styles compute Pascha from the same Julian algorithm.
 */
export async function TodayMobileV3() {
  // Android static export can't read cookies (would force dynamic); default to
  // the New calendar and let the client adjust from the local preference.
  const cookieStyle =
    process.env.BUILD_TARGET === "android"
      ? undefined
      : (await cookies()).get(CALENDAR_STYLE_COOKIE)?.value;
  const style: CalStyle = cookieStyle === "old" ? "old" : "new";

  const today = startOfDayUtc(new Date());
  const lookup = shiftForStyle(today, style);
  const commemorations = commemorationsOn(lookup);
  const fast = fastingStatus(lookup);
  const readings = readingsOn(today);
  const pascha = paschaInfo(today);

  const headline =
    commemorations.find((c) => c.kind === "feast") ?? commemorations[0];
  const headlineSaint =
    headline?.saint ?? (headline?.slug ? getSaint(headline.slug) : null);

  return (
    <div className="flex flex-col bg-night">
      <MobileTopTabs avatar={<UserAvatarSmall />} />

      {/* `cascade` staggers the direct children below by --stagger-step, so
          the surface resolves in reading order (greeting, then the day's
          word, then the rule, then the doors) instead of all at once.
          Opacity only; see the note in globals.css for why nothing here
          may translate. */}
      <div className="cascade px-5 pt-3 pb-8">
        <GreetingHeader date={today.getTime()} />

        <FirstStepsNudge />

        {/* Hero: the day's word, the dominant element of the surface. */}
        <VerseOfDayCard />

        {/* Pray now: the day's rule + the Prayer Rope Anthem. */}
        <div className="mt-4">
          <PrayNowCard />
        </div>

        {/* Quick access: the four core surfaces as soft, inviting doors. */}
        <p className="mt-8 mb-3 font-sans text-eyebrow uppercase tracking-[2px] text-paper/55">
          <T k="today.explore" />
        </p>
        <QuickAccessGrid />

        {/* The Church today: the saint, the fast, the readings, the count
            to Pascha, kept on the quiet sequenced rail. */}
        <p className="mt-8 mb-3 font-sans text-eyebrow uppercase tracking-[2px] text-paper/55">
          <T k="today.churchToday" />
        </p>
        <TimelineRail>
          {[
            headlineSaint ? (
              <TodaySaintCard key="saint" saint={headlineSaint} />
            ) : headline ? (
              // Commemorated but not deeply profiled in our registry.
              // Render the headline so the user sees the saint's name
              // instead of an "empty" message. Tap-through goes to the
              // calendar day, which shows fuller commemoration text.
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
      </div>
    </div>
  );
}
