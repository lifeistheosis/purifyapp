"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { useUpgradeModal } from "@/components/billing/UpgradeModal";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { PlanFinish } from "@/components/plans/PlanFinish";
import { PlanPath } from "@/components/plans/PlanPath";
import { PlanTodayCard } from "@/components/plans/PlanTodayCard";
import { localBookNames } from "@/lib/bible/books";
import { useExpectedPlusFeatures, usePlusFeatures } from "@/lib/entitlements/usePlusFeatures";
import { dayGuide, type PlanWords } from "@/lib/plans/guide";
import { usePlanGuide } from "@/lib/plans/guideContent";
import { dayLabel, getPlan } from "@/lib/plans/plans";
import { catchUp, completeDay, nextDay, planStreak, resetPlan, startPlan, uncompleteDay, usePlans } from "@/lib/plans/progress";
import { clearJustFinished, hrefOfReading, startPlanSession, useJustFinished } from "@/lib/plans/session";
import { useHeldPlace, useNoShrink } from "@/lib/ui/useHeldPlace";
import { useMounted } from "@/lib/useMounted";

/**
 * One reading plan's page (1.7, the owner's note 22: "a session, not a
 * link"). In order:
 *  - the finish of the day just read, when the plan bar's Done brought the
 *    reader here (components/plans/PlanFinish.tsx);
 *  - otherwise the day's card: which day, the passage, its intro, how long,
 *    and Begin, which opens the passage with the plan's bar
 *    (components/plans/PlanTodayCard.tsx);
 *  - the plan's days as a path (components/plans/PlanPath.tsx);
 *  - Start over, which asks twice.
 *
 * Plus is shown, never hidden: every reader sees the whole plan; without
 * Plus, Begin and the day circles carry or lead to the upgrade sheet named
 * for the plans. Progress is kept on this device (lib/plans/progress.ts).
 *
 * The page arrives whole (the owner's note 42 of build 80, "there's a frame
 * where it bugs out"): the day's intro, its verses, the questions and the
 * sayings come with the page (`words`, lib/plans/words.ts) instead of being
 * loaded after it was drawn, and Begin keeps the place of its Plus mark while
 * the answer is on its way (the pattern of components/player/PrayWith.tsx).
 */
export function PlanClient({ id, minutes, words }: { id: string; minutes: number[]; words: PlanWords }) {
  const { t, tn, locale } = useTranslate();
  const router = useRouter();
  const mounted = useMounted();
  const upgrade = useUpgradeModal();
  const plus = usePlusFeatures();
  const expectedPlus = useExpectedPlusFeatures();
  const locked = plus === false;
  // The mark's place, kept while the answer is unknown unless this device
  // last knew Plus: drawn only when locked, so Begin does not widen when the
  // answer comes a moment after the page.
  const lockPlace = locked || (plus === null && expectedPlus !== true);
  const plan = getPlan(id);
  const state = usePlans();
  const finished = useJustFinished(id);
  const guide = usePlanGuide(locale, true, words);
  const [confirmReset, setConfirmReset] = useState(false);
  const hold = useHeldPlace();
  const { ref: head, keep: keepHead } = useNoShrink<HTMLDivElement>();

  const books = useMemo(() => localBookNames(t), [t]);
  const bookName = useCallback((slug: string) => books[slug] ?? t(`bible.books.${slug}`), [books, t]);

  if (!plan) return null;
  const progress = mounted ? state[id] : undefined;
  const next = nextDay(plan, progress);
  const streak = mounted ? planStreak(state) : 0;
  const catching = mounted ? catchUp(state) : null;

  const begin = (day: number) => {
    if (locked) {
      upgrade.open("plans");
      return;
    }
    startPlan(id);
    const session = startPlanSession(plan, day);
    if (session) router.push(hrefOfReading(session.items[0]));
  };

  const toggle = (day: number, read: boolean, pressed: Element) => {
    if (locked) {
      upgrade.open("plans");
      return;
    }
    // The circle stays under the finger whatever the mark changes over it:
    // what is over the days cannot get shorter (keepHead), and what it gains
    // is answered by the page (hold). What a mark takes from UNDER the
    // circle, "Start over" going from the page's foot with the first day
    // taken back, is the root's to mind: the page keeps the length the
    // reader is looking at (lib/ui/keepLength.ts).
    hold(pressed);
    keepHead();
    if (read) completeDay(plan, day);
    else uncompleteDay(id, day);
  };

  return (
    <div className="pb-16">
      {/* Everything over the days. A mark on a day changes it: the card turns
          to the next day, taller or shorter than the last, and the line of
          days in a row comes or goes. It moved the circle the finger was on
          41px on one plan and up to 48px on another (fresh eyes L3). So at a
          mark this part is told to stay as tall as it is (useNoShrink), and
          the pressed circle is held in its place for what grows
          (useHeldPlace): the page goes up by the line, and the circle stays
          under the finger.

          The line's room is not kept before there is a line. It was tried:
          it set every plan's days 41px lower at rest, and on the Gospel of
          John that put the third day on the screen's foot, half risen
          (.path-rise), where the guardrail walk reads it as 2.46:1. */}
      <div ref={head}>
        {mounted && finished ? (
          <PlanFinish
            plan={plan}
            day={finished.day}
            next={next}
            guide={guide}
            sayings={words.sayings}
            streak={streak}
            bookName={bookName}
            onBack={() => {
              clearJustFinished();
              window.scrollTo({ top: 0 });
            }}
          />
        ) : next !== null ? (
          <PlanTodayCard
            dayNumber={next + 1}
            total={plan.days.length}
            reference={dayLabel(plan.days[next], bookName)}
            guide={guide ? dayGuide(guide.own, guide.en, id, next, guide.cites) : null}
            minutes={minutes[next] ?? null}
            locked={locked}
            lockPlace={lockPlace}
            onBegin={() => begin(next)}
          />
        ) : (
          <section className="mt-8 rounded-[22px] bg-night-soft p-5 ring-1 ring-inset ring-paper/10 md:p-7">
            <p className="font-serif text-title-sm text-paper">{t("plans.finished")}</p>
          </section>
        )}

        {/* 1.9 (s4-05): yesterday missed is offered back, never a broken streak. */}
        {catching !== null && !finished ? (
          <p data-plan-streak="" className="mt-5 font-sans text-detail font-semibold text-paper/80">{t("plans.catchUp", { streak: tn("plans.streak", catching) })}</p>
        ) : streak > 0 && !finished ? (
          <p data-plan-streak="" className="mt-5 font-sans text-detail font-semibold text-paper/80">{tn("plans.streak", streak)}</p>
        ) : null}
      </div>

      <PlanPath plan={plan} progress={progress} today={next} justRead={finished?.day ?? null} bookName={bookName} onToggle={toggle} />

      {progress ? (
        <p className="mt-10">
          <button
            type="button"
            onClick={() => {
              if (!confirmReset) {
                setConfirmReset(true);
                window.setTimeout(() => setConfirmReset(false), 4000);
                return;
              }
              resetPlan(id);
              clearJustFinished();
              setConfirmReset(false);
            }}
            className="inline-flex min-h-11 items-center font-sans text-detail text-paper/50 underline underline-offset-4 hover:text-paper"
          >
            {confirmReset ? t("plans.resetConfirm") : t("plans.reset")}
          </button>
        </p>
      ) : null}
    </div>
  );
}
