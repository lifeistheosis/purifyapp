import { MobileTopTabs } from "./MobileTopTabs";
import { VerseOfDayCard } from "./VerseOfDayCard";
import { PrayRail } from "./PrayNowCard";
import { ChurchTodayRail } from "./ChurchTodayRail";
import { GreetingHeader } from "./GreetingHeader";
import { StreakRow } from "./StreakRow";
import { FirstStepsNudge } from "@/components/onboarding/FirstStepsNudge";
import { StreakAtRisk } from "@/components/streak/StreakAtRisk";
import { CatechismCard } from "@/components/catechism/CatechismCard";
import { WidgetTipCard } from "@/components/widget/WidgetTip";
import { T } from "@/components/i18n/T";

/**
 * Mobile-only Today shell (v6.10 rework; Beta 2.3 i18n pass; 1.7 layout).
 *
 * The 1.7 layout is the owner's pick of 2026-10-15 ("B": the verse first),
 * from the rows he marked on 2026-10-07: a top bar of three things, the
 * streak as a row with one sentence, the verse at four lines that opens its
 * chapter, the day's prayers as one row you swipe, and the Church's day as
 * one list. The pictures he chose from are in
 * Homebase/boards/purify-master/r17/shots/ask-today-calm.png.
 *
 * This is LAYOUT ONLY. Everything derived from "what day is it" lives in
 * client children (GreetingHeader, ChurchTodayRail), because a server
 * component under `output: "export"` renders once at build time and freezes
 * its answer into the APK. Do not reintroduce a `new Date()` here: it was
 * the cause of the app reading a stale day for the whole life of a build.
 * See lib/calendar/useToday.ts.
 *
 * Every user-facing string is rendered by client children (useTranslate) or
 * <T> islands, so the whole surface follows a native locale switch.
 */
export function TodayMobileV3() {
  return (
    <div className="flex flex-col bg-night">
      <MobileTopTabs />

      {/* `cascade` staggers the direct children below by --stagger-step, so
          the surface resolves in reading order (greeting, the streak, the
          day's word, then the rule, then the doors) instead of all at once.
          `cascade-tight` shortens the step for a screen arriving, and
          `cascade-rise` adds the few px of upward travel. Today has no
          `.route-fade` ancestor (app/page.tsx sits outside the (app) group),
          so this cascade correctly starts at zero rather than waiting on a
          route fade that never runs. */}
      <div className="cascade cascade-tight cascade-rise px-5 pt-3 pb-8 md:mx-auto md:w-full md:max-w-[760px] lg:max-w-[880px]">
        <GreetingHeader />

        {/* The streak, as a row with one sentence. From 6 pm, a streak going
            and today not kept, the red card below takes its place. */}
        <StreakRow className="mt-4" />
        <StreakAtRisk className="mt-4" />

        <FirstStepsNudge />

        {/* Hero: the day's word, the dominant element of the surface.
            `rise-none` so this child fades with the rest and does not move.
            It was required while VerseCardActions rendered a `fixed inset-0`
            sheet inline, where a translating ancestor becomes its containing
            block and displaces it. That sheet portals to <body> now, so this
            is defence in depth: kept because the card is the obvious place
            for the next inline overlay, and the failure is silent. */}
        <div className="rise-none mt-4">
          <VerseOfDayCard />
        </div>

        {/* Pray: the hour's prayer first, then the rest of the day's rule
            and the Prayer Rope Anthem, as one row you swipe. */}
        <PrayRail className="mt-8" />

        {/* Today's Catechism: one line, and only while the bank holds
            questions. The card decides that itself and renders nothing
            otherwise, so an empty bank leaves no gap here. */}
        <CatechismCard />

        {/* The "Explore" grid stood here: four tiles to /prayers, /bible,
            /saints and /calendar. Two were the same href as a tab 200px
            below it and the other two lit the Discover tab, so it restated
            the tab bar and called Bible "Scripture" while the tab said
            "Bible". The tab bar is the navigation. */}

        {/* The Church today: the saint, the fast, the readings, the count
            to Pascha, as one list of rows. */}
        <p className="mt-8 mb-3 font-sans text-eyebrow uppercase tracking-[2px] text-paper/55">
          <T k="today.churchToday" />
        </p>
        <ChurchTodayRail />

        {/* The widget tip: once, in a shell that has a widget, after a
            reader's second day. Under the Church's day because that is what
            the widget shows, and at the foot so it never pushes the day's
            word down. It renders nothing otherwise (lib/widget/tip.ts). */}
        <WidgetTipCard className="mt-6" />
      </div>
    </div>
  );
}
