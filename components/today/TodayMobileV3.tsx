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
import { getServerLocale } from "@/lib/i18n/server";
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

/**
 * Mobile-only Today shell (v6.10 rework).
 *
 * Reads the user's calendar-style preference (`purify_calendar_style`
 * cookie, set by ProfileSettings) and shifts the fixed-cycle lookups
 * (saint of the day, fast) accordingly — matching the calendar page.
 *
 * Pascha-relative readings stay on the civil date because both calendar
 * styles compute Pascha from the same Julian algorithm.
 */
export async function TodayMobileV3() {
  const cookieStore = await cookies();
  const cookieStyle = cookieStore.get(CALENDAR_STYLE_COOKIE)?.value;
  const style: CalStyle = cookieStyle === "old" ? "old" : "new";

  const today = startOfDayUtc(new Date());
  const lookup = shiftForStyle(today, style);
  const commemorations = commemorationsOn(lookup);
  const fast = fastingStatus(lookup);
  const readings = readingsOn(today);
  const pascha = paschaInfo(today);
  const locale = await getServerLocale();
  const isDe = locale === "de";

  const headline =
    commemorations.find((c) => c.kind === "feast") ?? commemorations[0];
  const headlineSaint =
    headline?.saint ?? (headline?.slug ? getSaint(headline.slug) : null);

  const labels = isDe
    ? {
        verseTop: "Vers des Tages",
        churchToday: "Die Kirche heute",
        saint: "Heiliger des Tages",
        fast: "Das Fasten",
        readings: "Lesungen für heute",
        readingsEmpty: "Keine Lesungen angesetzt.",
        pascha: "Pascha",
        noSaint: "Für diesen Tag ist noch kein Heiliger verzeichnet.",
      }
    : {
        verseTop: "Verse of the Day",
        churchToday: "The Church today",
        saint: "Today's Saint",
        fast: "The Fast",
        readings: "Today's Readings",
        readingsEmpty: "No readings appointed.",
        pascha: "Pascha",
        noSaint: "No saint indexed for this day.",
      };

  // Quiet, localized dateline that grounds the surface in the Church's
  // day rather than a SaaS "refresh" label. UTC to match the fixed-cycle
  // date lookups above.
  const dateline = new Intl.DateTimeFormat(isDe ? "de-DE" : "en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(today);

  const paschaSecondary =
    pascha.daysAway > 0
      ? isDe
        ? `Bis Pascha ${pascha.date.getUTCFullYear()}`
        : `Until Pascha ${pascha.date.getUTCFullYear()}`
      : pascha.label;

  return (
    <div className="flex flex-col bg-night">
      <MobileTopTabs avatar={<UserAvatarSmall />} />

      <div className="px-5 pt-3 pb-8">
        <GreetingHeader dateline={dateline} isDe={isDe} />

        <FirstStepsNudge />

        {/* Hero: the day's word, the dominant element of the surface. */}
        <VerseOfDayCard labelTop={labels.verseTop} />

        {/* Pray now: the day's rule + the Prayer Rope Anthem. */}
        <div className="mt-4">
          <PrayNowCard isDe={isDe} />
        </div>

        {/* Quick access: the four core surfaces as soft, inviting doors. */}
        <p className="mt-8 mb-3 font-sans text-eyebrow uppercase tracking-[2px] text-paper/55">
          {isDe ? "Erkunden" : "Explore"}
        </p>
        <QuickAccessGrid isDe={isDe} />

        {/* The Church today: the saint, the fast, the readings, the count
            to Pascha, kept on the quiet sequenced rail. */}
        <p className="mt-8 mb-3 font-sans text-eyebrow uppercase tracking-[2px] text-paper/55">
          {labels.churchToday}
        </p>
        <TimelineRail>
          {[
            headlineSaint ? (
              <TodaySaintCard
                key="saint"
                saint={headlineSaint}
                eyebrow={labels.saint}
              />
            ) : headline ? (
              // Commemorated but not deeply profiled in our registry.
              // Render the headline so the user sees the saint's name
              // instead of an "empty" message. Tap-through goes to the
              // calendar day, which shows fuller commemoration text.
              <TodaySaintCard
                key="saint-no-profile"
                eyebrow={labels.saint}
                fallbackName={headline.name}
                fallbackNote={headline.note}
              />
            ) : (
              <div
                key="saint-empty"
                className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-3.5"
              >
                <p className="font-sans text-caption text-paper/55">
                  {labels.saint}
                </p>
                <p className="mt-2 font-sans text-ui text-paper/55 italic">
                  {labels.noSaint}
                </p>
              </div>
            ),
            <FastTodayCard key="fast" fast={fast} eyebrow={labels.fast} />,
            <TodayReadingsCard
              key="readings"
              readings={readings}
              eyebrow={labels.readings}
              emptyLabel={labels.readingsEmpty}
            />,
            <PaschaCountdownCard
              key="pascha"
              daysAway={pascha.daysAway}
              label={paschaSecondary}
              eyebrow={labels.pascha}
            />,
          ]}
        </TimelineRail>
      </div>
    </div>
  );
}
