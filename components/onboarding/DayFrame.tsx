"use client";

// The day's frame (2.0; lib/onboarding/flags.ts, DAY_FRAME_LIVE, off for
// readers; docs/plans/onboarding-2.0.md, row 3 and mock-ups 5 to 7).
//
// A day of a reader's first week was a link: the page it opened did not know
// it was anyone's day, and the day was counted at the tap whether or not
// anything was read. With the frame the page a day opens has a beginning and
// an end:
//
//   DayMark  over the page's head, the week's own mark: "Your first week ·
//            1 of 7", the line the card on Today wears.
//   DayEnd   at the end of the page (the owner's yes of 2026-11-23: at the
//            end, never floating over it, so a day is kept by a reader who
//            reached it): one button, "Done for today". His tap is answered
//            where his finger is, in the house's motion: the week's own card
//            stands in the button's place with the day kept and tomorrow's
//            step by name, and a way back to Today.
//
// Built once, in the frame around every page of the app (components/layout/
// AppFrame.tsx), so no page of content knows who is reading it (the roads'
// rule, lib/onboarding/road.ts): a page is framed when it is the page today's
// step opens, whichever way the reader came to it. Nothing is drawn for a
// reader without the frame, on the server or on a hydration.
//
// It serves at once the pages with nothing of their own at their end (a
// council, a prayer, a chapter, a saint, a moment in history). A lesson's own
// "Next lesson", the first Liturgy's guide and the days that open a list are
// the slices after this one (the plan, "what stands at the end of each page").

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { CARD_BG } from "@/components/ui/Graphite";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { countWeekStep } from "@/lib/analytics/moreCount";
import { readWeek, writeWeek } from "@/lib/onboarding/state";
import { useWeekDay, type WeekDay } from "@/lib/onboarding/useWeek";
import { localDay, stepTaken, type WeekStep } from "@/lib/onboarding/week";
import { movePage } from "@/lib/ui/inPageMove";

const bare = (path: string) => path.replace(/\/+$/, "") || "/";

/** Which of the reader's days this page is, if it is one: the step waiting today, or the one kept today. */
export function dayOfPage(day: WeekDay | null, pathname: string | null): { index: number; kept: boolean; tomorrow: WeekStep | null } | null {
  if (!day || !pathname) return null;
  for (const [index, kept] of [
    [day.waiting, false],
    [day.kept, true],
  ] as const) {
    if (index != null && day.steps[index] && bare(day.steps[index].href) === bare(pathname)) {
      return { index, kept, tomorrow: day.steps[index + 1] ?? null };
    }
  }
  return null;
}

function useDayHere() {
  return dayOfPage(useWeekDay(), usePathname());
}

/** Over the page's head: whose day this is. */
export function DayMark() {
  const { t } = useTranslate();
  const here = useDayHere();
  if (!here) return null;
  return (
    <div data-day-mark="" className="px-5 pt-4 md:px-8">
      <p className="mx-auto w-full max-w-[820px] font-sans text-caption font-semibold text-paper/65">{t("onboard.week.eyebrow", { n: here.index + 1 })}</p>
    </div>
  );
}

/** At the page's end: Done for today, and then the day kept, with tomorrow's step by name. */
export function DayEnd() {
  const { t } = useTranslate();
  const here = useDayHere();
  if (!here) return null;

  const done = () => {
    countWeekStep(here.index + 1, "kept");
    // The button gives way to the card in the house's motion, never with a cut.
    movePage(() => writeWeek(stepTaken(readWeek(), localDay(new Date()))));
  };

  return (
    <div data-day-end="" className="px-5 pb-12 pt-6 md:px-8">
      <div className="mx-auto w-full max-w-[820px]">
        {here.kept ? (
          // The week's own card, as Today draws it (FirstStepsNudge.tsx), so the card that opened the day closes it.
          <div
            data-day-kept=""
            className="lm-card relative overflow-hidden rounded-[22px] p-5 ring-1 ring-inset ring-premium/30 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.6)]"
            style={CARD_BG}
          >
            <p className="font-sans text-caption font-semibold text-premium-ink">{t("onboard.week.kept", { n: here.index + 1 })}</p>
            {here.tomorrow ? (
              <p className="mt-2 font-heading text-title-sm font-bold leading-tight text-paper">{t("onboard.week.tomorrow", { title: t(here.tomorrow.titleKey) })}</p>
            ) : null}
            <Link
              href="/"
              className="tap-press mt-4 inline-flex min-h-11 items-center gap-2 rounded-pill border border-paper/22 bg-paper/[0.03] px-5 font-sans text-ui font-semibold text-paper"
            >
              {t("onboard.week.back")}
              <ChevronRight size={14} aria-hidden className="shrink-0 rtl:-scale-x-100" />
            </Link>
          </div>
        ) : (
          <button
            type="button"
            data-day-done=""
            onClick={done}
            className="tap-press flex min-h-12 w-full items-center justify-center gap-2 rounded-pill bg-paper px-6 font-sans text-[15px] font-semibold text-night"
          >
            {t("onboard.week.done")}
          </button>
        )}
      </div>
    </div>
  );
}
