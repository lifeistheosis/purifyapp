"use client";

// The end of a plan's day (1.7, the owner's note 22: "the finish: a short
// moment when you tap Done ... then 2 or 3 questions to answer in a line or
// skip, one saying of the Fathers on the passage, and a look at tomorrow").
// Shown at the top of the plan's page when the plan bar's Done brings the
// reader back (lib/plans/session.ts, justFinished), until Back to the plan.

import { FinishMoment } from "@/components/flow/FinishMoment";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { PlanQuestions } from "@/components/plans/PlanQuestions";
import { PlanSaying } from "@/components/plans/PlanSaying";
import { dayGuide, firstLine, sayingFor } from "@/lib/plans/guide";
import { useSayings, type LoadedGuide } from "@/lib/plans/guideContent";
import { dayLabel, type ReadingPlan } from "@/lib/plans/plans";

export function PlanFinish({
  plan,
  day,
  next,
  guide,
  streak,
  bookName,
  onBack,
}: {
  plan: ReadingPlan;
  /** The day just read, from 0. */
  day: number;
  /** The next day not yet read, or null when the plan is finished. */
  next: number | null;
  guide: LoadedGuide | null;
  streak: number;
  bookName: (slug: string) => string;
  onBack: () => void;
}) {
  const { t, tn } = useTranslate();
  const sayings = useSayings(true);
  const today = guide ? dayGuide(guide.own, guide.en, plan.id, day) : null;
  const tomorrow = guide && next !== null ? dayGuide(guide.own, guide.en, plan.id, next) : null;
  const saying = sayingFor(sayings, plan.id, day);
  const label = t("plans.continueDay", { day: day + 1, reading: dayLabel(plan.days[day], bookName) });

  return (
    <section aria-labelledby="plan-finish" data-plan-finish="" className="mt-8">
      <FinishMoment
        headingId="plan-finish"
        className="rounded-[22px] bg-night-soft px-5 py-8 ring-1 ring-inset ring-paper/10"
        title={t("plans.finish.title", { day: day + 1 })}
        line={streak > 0 ? tn("plans.streak", streak) : null}
      />

      {today?.questions.length ? <PlanQuestions planId={plan.id} day={day} questions={today.questions} dayLabel={label} /> : null}

      {saying ? <PlanSaying saying={saying} /> : null}

      {next !== null ? (
        <section aria-labelledby="plan-tomorrow" data-plan-tomorrow="" className="mt-10 border-t border-paper/10 pt-6">
          <p id="plan-tomorrow" role="heading" aria-level={2} className="font-sans text-caption font-semibold text-paper/55">
            {t("plans.finish.tomorrow")}
          </p>
          <p className="mt-1 font-sans text-caption text-paper/50">{t("plans.dayOf", { day: next + 1, total: plan.days.length })}</p>
          <p className="mt-1 font-serif text-title-sm font-semibold leading-snug text-paper">{dayLabel(plan.days[next], bookName)}</p>
          {firstLine(tomorrow?.intro ?? null) ? (
            <p className="mt-2 max-w-[60ch] font-sans text-ui leading-[1.6] text-paper/70">{firstLine(tomorrow?.intro ?? null)}</p>
          ) : null}
        </section>
      ) : (
        <p className="mt-10 border-t border-paper/10 pt-6 font-serif text-title-sm text-paper">{t("plans.finished")}</p>
      )}

      <button
        type="button"
        onClick={onBack}
        className="tap-press mt-8 inline-flex h-12 items-center rounded-pill border border-paper/25 px-6 font-sans text-ui font-semibold text-paper hover:border-paper/50"
      >
        {t("plans.finish.back")}
      </button>
    </section>
  );
}
