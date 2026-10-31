"use client";

// The day's card on a plan's page (1.7, the owner's note 22: "'Day 3 of 30'
// opens an intro card first (what to watch for, a line of context), then the
// passage"). Which day, the passage in Lora, its intro, how long it takes,
// and Begin, which opens the passage with the plan's bar at its foot.
//
// Plus is shown, never hidden: without it Begin carries the Plus mark and
// opens the upgrade sheet named for the plans. While the answer is on its way
// the mark's place is kept, unseen (`lockPlace`), so Begin does not widen a
// moment after the page arrives (the owner's note 42 of build 80).

import { SourceList, marked } from "@/components/citations/Marked";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { PREMIUM_CHIP } from "@/components/premium/PremiumUI";
import { cn } from "@/lib/cn";
import type { DayGuide } from "@/lib/plans/guide";

/** Where a mark in the day's intro leads: its verse, under the intro. */
const PLAN_SOURCE = "plan-source-";

export function PlanTodayCard({
  dayNumber,
  total,
  reference,
  guide,
  minutes,
  locked,
  lockPlace = locked,
  onBegin,
}: {
  dayNumber: number;
  total: number;
  /** "Matthew 6", "Psalms 9–16", in the reader's language. */
  reference: string;
  guide: DayGuide | null;
  minutes: number | null;
  locked: boolean;
  /** Keep the mark's place, unseen unless locked, while the answer is unknown. */
  lockPlace?: boolean;
  onBegin: () => void;
}) {
  const { t } = useTranslate();
  return (
    <section aria-labelledby="plan-today" data-plan-today="" className="mt-8 rounded-[22px] bg-night-soft p-5 ring-1 ring-inset ring-paper/10 md:p-7">
      <p className="font-sans text-caption font-semibold text-paper/55">{t("plans.dayOf", { day: dayNumber, total })}</p>
      <h2 id="plan-today" className="mt-1 text-title-sm font-bold leading-snug text-paper md:text-title">
        {reference}
      </h2>
      {guide?.intro ? <p className="mt-3 max-w-[60ch] font-sans text-ui leading-[1.65] text-paper/75">{marked(guide.intro, guide.introSources, PLAN_SOURCE)}</p> : null}
      {/* Where the lines it quotes stand (1.8): a number where each is, and
          the verse it is, under the intro. */}
      {guide?.introSources.length ? (
        <SourceList id="plan-sources" idPrefix={PLAN_SOURCE} sources={guide.introSources} lang="en" heading="h3" compact className="mt-4" />
      ) : null}
      {guide?.english && guide.intro ? <p className="mt-2 font-sans text-caption text-paper/45">{t("plans.englishForNow")}</p> : null}
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3">
        <button
          type="button"
          onClick={onBegin}
          data-plan-begin=""
          className="tap-press inline-flex h-12 items-center gap-2 rounded-pill bg-paper px-7 font-sans text-ui font-semibold text-night motion-safe:transition-colors hover:bg-paper/90"
        >
          {t("plans.begin")}
          {lockPlace ? (
            // The chip is drawn for a dark ground; inside the light Begin
            // button it takes the button's own ink, or it reads white on white.
            <span
              aria-hidden={locked ? undefined : true}
              className={cn(PREMIUM_CHIP, "border-night/25 bg-night/5 text-night/80", !locked && "invisible")}
            >
              {t("study.purifyPlus")}
            </span>
          ) : null}
        </button>
        {minutes ? <span className="font-sans text-caption text-paper/55">{t("prayers.reader.aboutMin", { min: minutes })}</span> : null}
      </div>
    </section>
  );
}
