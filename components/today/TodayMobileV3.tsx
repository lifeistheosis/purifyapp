import { MobileTopTabs } from "./MobileTopTabs";
import { UserAvatarSmall } from "./UserAvatarSmall";
import { VerseOfDayCard } from "./VerseOfDayCard";
import { PrayNowCard } from "./PrayNowCard";
import { ChurchTodayRail } from "./ChurchTodayRail";
import { GreetingHeader } from "./GreetingHeader";
import { QuickAccessGrid } from "./QuickAccessGrid";
import { FirstStepsNudge } from "@/components/onboarding/FirstStepsNudge";
import { T } from "@/components/i18n/T";

/**
 * Mobile-only Today shell (v6.10 rework; Beta 2.3 i18n pass).
 *
 * This is now LAYOUT ONLY. Everything derived from "what day is it" lives
 * in client children (GreetingHeader, ChurchTodayRail), because a server
 * component under `output: "export"` renders once at build time and freezes
 * its answer into the APK. Do not reintroduce a `new Date()` here: it was
 * the cause of the app reading a stale day for the whole life of a build.
 * See lib/calendar/useToday.ts.
 *
 * The calendar-style preference moved to the client with it. It used to be
 * read from the `purify_calendar_style` cookie, which the Android export
 * cannot do anyway (the branch here already returned undefined for native).
 *
 * Every user-facing string is rendered by client children (useTranslate) or
 * <T> islands, so the whole surface follows a native locale switch.
 */
export function TodayMobileV3() {
  return (
    <div className="flex flex-col bg-night">
      <MobileTopTabs avatar={<UserAvatarSmall />} />

      {/* `cascade` staggers the direct children below by --stagger-step, so
          the surface resolves in reading order (greeting, then the day's
          word, then the rule, then the doors) instead of all at once.
          Opacity only; see the note in globals.css for why nothing here
          may translate. */}
      <div className="cascade px-5 pt-3 pb-8">
        <GreetingHeader />

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
        <ChurchTodayRail />
      </div>
    </div>
  );
}
