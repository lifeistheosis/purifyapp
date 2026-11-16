"use client";

// The day's card on a plan's page (1.7, the owner's note 22: "'Day 3 of 30'
// opens an intro card first (what to watch for, a line of context), then the
// passage"). From 1.9 (build 97 note 7, the fifteen screens' round 3) it is
// one card made for reading: the day's small line, the passage large in the
// serif, its intro, and Begin, its one way in, which opens the passage with
// the plan's bar at its foot. Where the intro's quoted lines stand is every
// one still said, as one quiet line under the card that opens them, closed
// at first; a number in the intro opens it and goes to its line.
//
// Plus is shown, never hidden: without it Begin carries the Plus mark and
// opens the upgrade sheet named for the plans. While the answer is on its way
// the mark's place is kept, unseen (`lockPlace`), so Begin does not widen a
// moment after the page arrives (the owner's note 42 of build 80).

import { useState } from "react";
import { flushSync } from "react-dom";

import { SourceList, marked } from "@/components/citations/Marked";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { PREMIUM_CHIP } from "@/components/premium/PremiumUI";
import { ChevronDown } from "@/components/ui/icons/ChevronDown";
import { cn } from "@/lib/cn";
import type { DayGuide } from "@/lib/plans/guide";

/** Where a mark in the day's intro leads: its verse, under the card. */
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
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const sources = guide?.introSources ?? [];
  return (
    <>
      <section aria-labelledby="plan-today" data-plan-today="" className="mt-5 rounded-[22px] bg-night-soft p-5 ring-1 ring-inset ring-paper/10 md:p-7">
        <p className="font-sans text-caption font-semibold text-paper/55">{t("plans.dayOf", { day: dayNumber, total })}</p>
        <h2 id="plan-today" className="mt-1.5 text-balance font-serif text-heading font-bold leading-[1.1] tracking-[-0.01em] text-paper">
          {reference}
        </h2>
        {guide?.intro ? (
          <p
            className="mt-3 max-w-[60ch] font-sans text-ui leading-[1.65] text-paper/75"
            // A number in the intro leads to its line, which is folded under
            // the card: it is opened before the browser goes to it.
            onClickCapture={(e) => {
              if (!sourcesOpen && (e.target as Element).closest?.(`a[href^="#${PLAN_SOURCE}"]`)) flushSync(() => setSourcesOpen(true));
            }}
          >
            {marked(guide.intro, guide.introSources, PLAN_SOURCE)}
          </p>
        ) : null}
        {guide?.english && guide.intro ? <p className="mt-2 font-sans text-caption text-paper/55">{t("plans.englishForNow")}</p> : null}
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
      {/* Where the lines the intro quotes stand (1.8): a number where each is,
          and the verse it is. Every one, under the card, behind one quiet
          line (1.9). */}
      {sources.length ? (
        <div data-plan-sources="" className="mt-1 px-1">
          <button
            type="button"
            id="plan-sources"
            aria-expanded={sourcesOpen}
            aria-controls="plan-sources-list"
            onClick={() => setSourcesOpen((v) => !v)}
            className="tap-press inline-flex min-h-11 items-center gap-1.5 font-sans text-caption font-semibold text-paper/55 hover:text-paper"
          >
            {t("cite.sources")}
            <ChevronDown size={14} className={cn("motion-safe:transition-transform", sourcesOpen && "rotate-180")} />
          </button>
          {sourcesOpen ? (
            <SourceList id="plan-sources-list" labelledBy="plan-sources" idPrefix={PLAN_SOURCE} sources={sources} lang="en" heading="h3" compact className="pb-2" />
          ) : null}
        </div>
      ) : null}
    </>
  );
}
