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
//
//   DayKeptBy  for a page with an end of its own that the page can tell: a
//            prayer said through, the first Liturgy's guide finished (the
//            owner's two yeses of 2026-11-23). When that end is reached on
//            the reader's day, the day is kept. It draws nothing.
//   DayKeptAt  for a page whose end is a place: a chapter read down to its
//            last verse. Set there, it keeps the day once that end has stood
//            on the screen a moment. It draws nothing a reader sees.
//   DayKeptOnTap  for a list whose act is a tap: Find a parish, kept when the
//            reader opens a finder. It draws nothing.

import { useEffect, useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { CARD_BG } from "@/components/ui/Graphite";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { frameFits, ownEnd } from "@/lib/onboarding/dayFrame";
import { keepDay } from "@/lib/onboarding/keepDay";
import { useWeekDay, type WeekDay } from "@/lib/onboarding/useWeek";
import type { WeekStep, WeekStepKey } from "@/lib/onboarding/week";
import { movePage, partsAfter, piecesBefore, stuckOver } from "@/lib/ui/inPageMove";
import { goToReadingPlace, shiftToReadingPlace, visibleBand } from "@/lib/ui/readingPlace";

const bare = (path: string) => path.replace(/\/+$/, "") || "/";

/**
 * Which of the reader's days this page is: the step waiting today, or the one kept today. Only for a
 * step `fits` takes: one the frame serves by default, or one kept by its page's own end.
 */
export function dayOfPage(
  day: WeekDay | null,
  pathname: string | null,
  fits: (key: WeekStepKey) => boolean = frameFits,
): { index: number; kept: boolean; tomorrow: WeekStep | null } | null {
  if (!day || !pathname) return null;
  for (const [index, kept] of [
    [day.waiting, false],
    [day.kept, true],
  ] as const) {
    const step = index != null ? day.steps[index] : null;
    if (index != null && step && fits(step.key) && bare(step.href) === bare(pathname)) {
      return { index, kept, tomorrow: day.steps[index + 1] ?? null };
    }
  }
  return null;
}

/**
 * Whether this page is a day of the reader's the frame serves, waiting or kept today. For a page
 * whose own end gives way to the frame's on that day (a lesson, components/prayers/LessonEnd.tsx):
 * it asks here, so the page and the frame's end answer as one.
 */
export function useDayHere(): boolean {
  return dayOfPage(useWeekDay(), usePathname()) !== null;
}

/**
 * At the page's end: whose day this is and Done for today, and then the day kept, with tomorrow's
 * step by name. `plain` inside a page's own end, which has its own line over it and its own room
 * under it (a lesson's).
 */
export function DayEnd({ className, plain = false }: { className?: string; plain?: boolean }) {
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
    // The line and the button give way to the card in the house's motion, never with a cut: the
    // block grows, what stands on the screen over it glides as the page goes with it, what follows
    // it (a lesson's quiet links) glides to where it then stands, and the bars at the head of the
    // screen keep their own picture, so the page passes under them. The day is kept once, even by
    // a second tap that lands while the first is being pictured (keepDay).
    const el = block.current;
    movePage(() => void keepDay(here.index), { grows: [el], glides: [...piecesBefore(el), ...partsAfter(el), ...stuckOver(el)] });
  };

  return (
    <div data-day-end="" className={className}>
      {/* A fine line over it, as the page parts its own sections; room under it, so it never ends against the bars. */}
      <div ref={block} className={plain ? undefined : "border-t border-paper/10 pb-4 pt-6"}>
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
              {/* The way back in the words the app already has for it, in every language (the Catechism's card on Today). */}
              {t("catechism.backToToday")}
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

/**
 * For a page with an end of its own that the page can tell: a prayer said through (the owner's yes
 * of 2026-11-23, to "finishing the prayer keeps the day by itself, with no extra button"), the
 * first Liturgy's guide finished, a day of a path of the Fathers marked as read. `done` is that
 * end, told by the page. When it is reached on the reader's day, the day is kept, and a prayer
 * said earlier the same day is kept as it is opened: it was said today.
 *
 * `step` names the day where its end is told on another page than the one the day opens: Your rule
 * opens the builder, and the rule is said on its own page under it.
 *
 * It draws nothing. No retention loops inside prayers (his word of 2026-10-16,
 * components/prayers/PrayerRuleReader.tsx): nothing of the week stands on a prayer's page, the
 * prayer's own end answers as it always has, and Today says the day is kept when the reader is back.
 */
export function DayKeptBy({ done, step }: { done: boolean; step?: WeekStepKey }) {
  const day = useWeekDay();
  const here = dayOfPage(day, usePathname(), ownEnd);
  const named = step && day && day.waiting != null && day.steps[day.waiting]?.key === step ? day.waiting : null;
  const waiting = step ? named : here && !here.kept ? here.index : null;
  useEffect(() => {
    if (done && waiting != null) keepDay(waiting);
  }, [done, waiting]);
  return null;
}

/**
 * For a list whose act is a tap: Find a parish, kept when the reader opens a parish finder or the
 * way to the first Liturgy's guide (the owner's "do all" of 2026-11-23). `on` names what counts, as
 * a selector. The tap is heard on its way down, before the page it opens takes the screen, so the
 * day is kept even as the reader leaves for a parish's own site. It draws nothing.
 */
export function DayKeptOnTap({ on }: { on: string }) {
  const here = dayOfPage(useWeekDay(), usePathname(), ownEnd);
  const waiting = here && !here.kept ? here.index : null;
  useEffect(() => {
    if (waiting == null) return;
    const heard = (event: Event) => {
      if (event.target instanceof Element && event.target.closest(on)) keepDay(waiting);
    };
    document.addEventListener("click", heard, true);
    return () => document.removeEventListener("click", heard, true);
  }, [on, waiting]);
  return null;
}

/** How long a page's end stands on the screen before its day counts as kept: as long as a lesson's before it counts as read. */
export const KEPT_AFTER_MS = 2000;

/**
 * For a page whose end is a place: a chapter read down to its last verse (the owner's yes of
 * 2026-11-23, to "should reaching the end keep the day by itself, with nothing extra drawn"). Set
 * at that end, it keeps the day once the end has stood on the screen two seconds while the page is
 * seen, clear of the bars at the foot: scrolling past it on the way somewhere else keeps nothing.
 *
 * It draws nothing a reader sees, and is not in the page at all on any day but the reader's own.
 */
export function DayKeptAt() {
  const here = dayOfPage(useWeekDay(), usePathname(), ownEnd);
  const waiting = here && !here.kept ? here.index : null;
  const mark = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = mark.current;
    if (!el || waiting == null || typeof IntersectionObserver === "undefined") return;
    let timer: number | undefined;
    const seen = new IntersectionObserver(
      ([entry]) => {
        window.clearTimeout(timer);
        if (entry.isIntersecting && document.visibilityState === "visible") timer = window.setTimeout(() => keepDay(waiting), KEPT_AFTER_MS);
      },
      // Over the bars at the foot of the screen, where a reader can see it.
      { rootMargin: "0px 0px -15% 0px" },
    );
    seen.observe(el);
    return () => {
      seen.disconnect();
      window.clearTimeout(timer);
    };
  }, [waiting]);
  if (waiting == null) return null;
  return <span ref={mark} aria-hidden data-day-own-end="" className="block h-px w-full" />;
}
