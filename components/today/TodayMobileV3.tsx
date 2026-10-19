import { MobileHeader } from "@/components/mobile/MobileHeader";
import { UpgradeModalProvider } from "@/components/billing/UpgradeModal";
import { VerseOfDayCard } from "./VerseOfDayCard";
import { PrayRail } from "./PrayNowCard";
import { ChurchTodayRail } from "./ChurchTodayRail";
import { RememberCard } from "./RememberCard";
import { GreetingHeader } from "./GreetingHeader";
import { StreakRow } from "./StreakRow";
import { FirstStepsNudge } from "@/components/onboarding/FirstStepsNudge";
import { StreakAtRisk } from "@/components/streak/StreakAtRisk";
import { CatechismCard } from "@/components/catechism/CatechismCard";
import { WidgetTipCard } from "@/components/widget/WidgetTip";
import { FirstLiturgyReminder } from "./FirstLiturgyReminder";
import { T } from "@/components/i18n/T";

/**
 * Mobile-only Today shell (v6.10 rework; Beta 2.3 i18n pass; 1.7 layout).
 *
 * The 1.7 layout is the owner's pick of 2026-10-15 ("B": the verse first),
 * from the rows he marked on 2026-10-07: a top bar, the streak as a row with
 * one sentence, the verse at four lines that opens its chapter, the day's
 * prayers as one row you swipe, and the Church's day as one list. The
 * pictures he chose from are in
 * Homebase/boards/purify-master/r17/shots/ask-today-calm.png.
 *
 * The top bar is the one every tab wears (MobileHeader, 1.7, his note of
 * 2026-10-16 that the five tabs each drew it differently): "Today" on the
 * left; the Premium pill, search and the bell on the right. Today had a bar
 * of its own with the pill on the left and no title. The greeting under it
 * is an h2 now, because the bar's title is the screen's h1.
 *
 * The upgrade sheet is mounted here because Today is app/page.tsx, outside
 * the (app) group whose frame mounts it everywhere else. Without it, the
 * Premium pill and the Remember card on Today left the screen for /pricing
 * while the same pill on the other four tabs opened the sheet.
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
    <UpgradeModalProvider>
      <div className="flex flex-col bg-night">
        <MobileHeader titleKey="nav.today" />

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

          {/* Your first Liturgy (1.7): from six days before the day the
              reader chose in the guide until that day, under the day's word
              so the verse stays first. Nothing at all on every other day. */}
          <FirstLiturgyReminder className="mt-4" />

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
          <p className="mt-8 mb-3 font-sans text-caption text-paper/55">
            <T k="today.churchToday" />
          </p>
          <ChurchTodayRail />

          {/* A saved verse to say from memory, once a day (1.7, Plus). */}
          <RememberCard className="mt-6" />

          {/* The widget tip: once, in a shell that has a widget, after a
              reader's second day. Under the Church's day because that is what
              the widget shows, and at the foot so it never pushes the day's
              word down. It renders nothing otherwise (lib/widget/tip.ts). */}
          <WidgetTipCard className="mt-6" />
        </div>
      </div>
    </UpgradeModalProvider>
  );
}
