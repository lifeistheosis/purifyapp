"use client";

// The day's frame (2.0; lib/onboarding/flags.ts, DAY_FRAME_LIVE, off for
// readers; docs/plans/onboarding-2.0.md, row 3 and mock-ups 5 to 7).
//
// A day of a reader's first week was a link: the page it opened did not know
// it was anyone's day, and the day was counted at the tap whether or not
// anything was read. With the frame the page a day opens has an end:
//
//   DayEnd   at the end of the page (the owner's yes of 2026-11-23: at the
//            end, never floating over it, so a day is kept by a reader who
//            reached it): the week's own line, "Your first week · 3 of 7",
//            and one button, "Done for today". His tap is answered where his
//            finger is, in the house's motion: the week's own card stands in
//            their place with the day kept and tomorrow's step by name, and
//            a way back to Today.
//
// The week's line stands with the button, and not over the page's head as
// mock-up 5 drew it on a lesson: a council, a saint and a moment in history
// open on their own picture under their own bar, and a line set above them
// by the frame pushed that bar down the screen (walked on the export,
// 2026-11-23). The line is said once on the page, where it is acted on.
//
// Mounted by each kind of page it serves, at the end of the page's own
// column (lib/onboarding/dayFrame.ts says which steps and which files, and
// why not the others yet). The page itself is the same for every reader and
// knows nothing of who reads it (the roads' rule, lib/onboarding/road.ts):
// this island decides on the device, and draws nothing for a reader without
// the frame, on the server or on a hydration, or on any day but the page's.

import { useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { CARD_BG } from "@/components/ui/Graphite";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { countWeekStep } from "@/lib/analytics/moreCount";
import { frameFits } from "@/lib/onboarding/dayFrame";
import { readWeek, writeWeek } from "@/lib/onboarding/state";
import { useWeekDay, type WeekDay } from "@/lib/onboarding/useWeek";
import { localDay, stepTaken, type WeekStep } from "@/lib/onboarding/week";
import { movePage, piecesBefore } from "@/lib/ui/inPageMove";
import { goToReadingPlace, shiftToReadingPlace, visibleBand } from "@/lib/ui/readingPlace";

const bare = (path: string) => path.replace(/\/+$/, "") || "/";

/** Which of the reader's days this page is, if it is one the frame serves: the step waiting today, or the one kept today. */
export function dayOfPage(day: WeekDay | null, pathname: string | null): { index: number; kept: boolean; tomorrow: WeekStep | null } | null {
  if (!day || !pathname) return null;
  for (const [index, kept] of [
    [day.waiting, false],
    [day.kept, true],
  ] as const) {
    const step = index != null ? day.steps[index] : null;
    if (index != null && step && frameFits(step.key) && bare(step.href) === bare(pathname)) {
      return { index, kept, tomorrow: day.steps[index + 1] ?? null };
    }
  }
  return null;
}

/** At the page's end: whose day this is and Done for today, and then the day kept, with tomorrow's step by name. */
export function DayEnd({ className }: { className?: string }) {
  const { t } = useTranslate();
  const here = dayOfPage(useWeekDay(), usePathname());
  const block = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  // Set by the reader's own Done, so the page goes with the card it opens that once, and never on a later visit.
  const answered = useRef(false);
  const kept = here?.kept === true;

  // The card is taller than what it answers, and it opens at the page's end. In the move's own
  // change, once the card is in the page and before it is pictured, the page goes with it at once
  // as far as it can: the card rises where the button stood and what stands over it goes up with
  // it, in the one move (the house's way for what opens, lib/ui/showOpened.ts, catchUpOpened).
  // Following it after the move was a second motion, and the gate's motion check read its first
  // frame as a flash (scripts/gate/day-frame.mjs, 2026-11-23).
  useLayoutEffect(() => {
    if (!kept || !answered.current) return;
    answered.current = false;
    const el = card.current;
    if (!el) return;
    const band = visibleBand();
    if (shiftToReadingPlace(band, el.getBoundingClientRect()) > 1) goToReadingPlace(el, { smooth: false, band });
  }, [kept]);

  if (!here) return null;

  const done = () => {
    answered.current = true;
    countWeekStep(here.index + 1, "kept");
    // The line and the button give way to the card in the house's motion, never with a cut: the
    // block grows, and what stands on the screen over it glides as the page goes with it.
    movePage(() => writeWeek(stepTaken(readWeek(), localDay(new Date()))), { grows: [block.current], glides: piecesBefore(block.current) });
  };

  return (
    <div data-day-end="" className={className}>
      {/* A fine line over it, as the page parts its own sections; room under it, so it never ends against the bars. */}
      <div ref={block} className="border-t border-paper/10 pb-4 pt-6">
        {here.kept ? (
          // The week's own card, as Today draws it (FirstStepsNudge.tsx), so the card that opened the day closes it.
          <div
            ref={card}
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
          <>
            <p data-day-mark="" className="font-sans text-caption font-semibold text-paper/65">
              {t("onboard.week.eyebrow", { n: here.index + 1 })}
            </p>
            <button
              type="button"
              data-day-done=""
              onClick={done}
              className="tap-press mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-pill bg-paper px-6 font-sans text-[15px] font-semibold text-night sm:w-auto sm:min-w-[280px]"
            >
              {t("onboard.week.done")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
