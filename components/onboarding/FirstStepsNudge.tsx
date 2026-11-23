"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Close } from "@/components/ui/icons/Close";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { CARD_BG } from "@/components/ui/Graphite";
import { reached } from "@/lib/ab/device";
import { countWeekStep } from "@/lib/analytics/moreCount";
import { dismissNudge, readWeek, wasOnboardedAgain, writeWeek } from "@/lib/onboarding/state";
import { countDayOne } from "@/lib/onboarding/count";
import { firstOpening, stepOpening, type StepOpening, type StepParts } from "@/lib/onboarding/openStep";
import { DAY_ONE_KEYS, dayOneFor, type DayOneKey } from "@/lib/onboarding/space";
import { useDayOneShown } from "@/lib/onboarding/useDayOne";
import { useSpace } from "@/lib/onboarding/useSpace";
import { useWeekDay, useWeekToday } from "@/lib/onboarding/useWeek";
import { localDay, stepPassed, stepTaken } from "@/lib/onboarding/week";

/**
 * "Your Day 1": the first step the onboarding handoff chose for this reader
 * (lib/onboarding/space.ts, dayOneFor), first on Today once the overlay has
 * gone: above the greeting, so that it is whole and its Begin is clear of the
 * tab bar as Today opens (2026-11-22: under the greeting its Begin stood
 * under the tab bar, where a tap opens the Bible). It rises in and a band of light crosses it once, so the
 * eye lands on it after the slate. One suggestion, dismissible, gone once
 * taken.
 *
 * While it shows, the streak's rope waits until it is taken or dismissed
 * (1.8, the owner's pick B of round 6, "Day 1 alone"). Both read whether it
 * is up from lib/onboarding/useDayOne.ts, so they change in the same render.
 * It is the first thing on the screen, so its space is under it (mb-4), and
 * the greeting follows; nothing stands over it to touch.
 *
 * With the roads on (1.9, lib/onboarding/flags.ts) the same card carries the
 * reader's first week: seven steps chosen by their road, one a day
 * (lib/onboarding/week.ts). The next appears the next day they open Purify.
 * Nothing counts up and nothing is lost on a day away; closing a step passes
 * it over, and two passed over in a row end the week quietly. Each step
 * shows its page's own name, and a line only where the app already says one
 * about that page.
 *
 * With the day's frame on (2.0, lib/onboarding/flags.ts, off for readers) a
 * step is kept by the reader's own Done at the end of its page
 * (components/onboarding/DayFrame.tsx), not by opening it. So opening writes
 * nothing and the card waits here, and once the day is kept the card says so
 * until tomorrow, with tomorrow's step by name: nothing leaves Today under
 * the finger.
 */
export function FirstStepsNudge() {
  const { t } = useTranslate();
  const { level, intent, background } = useSpace();
  const ready = useDayOneShown();
  // With the roads on (1.9), today's step of the reader's first week.
  const week = useWeekToday();
  // With the day's frame on (2.0): the same week, with the step kept today. Null without the frame.
  const day = useWeekDay();
  const opening = useStepOpening();

  // Kept today: the card says so until tomorrow, in place of the step.
  if (day && day.kept != null && !week) {
    const next = day.steps[day.kept + 1];
    return <KeptCard eyebrow={t("onboard.week.kept", { n: day.kept + 1 })} title={next ? t("onboard.week.tomorrow", { title: t(next.titleKey) }) : null} />;
  }
  if (!ready) return null;
  // A reader who was back when they answered is not on their first day: the
  // same card, called their next step.
  const again = wasOnboardedAgain();

  if (week) {
    const today = () => localDay(new Date());
    return (
      <StepCard
        // A reader who is back is not in their first week: the same steps, called their next step.
        eyebrow={again ? t("onboard.returning.nextEyebrow") : t("onboard.week.eyebrow", { n: week.index + 1 })}
        title={t(week.step.titleKey)}
        body={week.step.bodyKey ? t(week.step.bodyKey) : null}
        href={week.step.href}
        // Closed unopened: this step is passed over, and the next comes tomorrow.
        onDismiss={() => {
          countWeekStep(week.index + 1, "passed");
          writeWeek(stepPassed(readWeek(), today()));
        }}
        // The first step is the Day 1 the counts have always taken, where it
        // is one of theirs. The days after it are not counted: their sentence
        // on the privacy page is not agreed (notes/onboarding-fable.md, 5.2).
        onOpen={opening({
          count: () => {
            if (week.index === 0 && isDayOneKey(week.step.key)) {
              countDayOne(week.step.key, {
                ...(background ? { background } : {}),
                ...(level ? { level } : {}),
                ...(intent ? { intent } : {}),
              });
            }
            // With the frame a step can be opened again before it is kept: counted the first time.
            if (!day || firstOpening(week.index, today(), window.localStorage)) countWeekStep(week.index + 1, "opened");
            if (week.index === 0) reached("first_step");
          },
          // Written once the card has left with its page, never at the tap (lib/onboarding/openStep.ts).
          // With the day's frame nothing is written here: the day is kept by the reader's Done on its page.
          keep: day ? () => {} : () => writeWeek(stepTaken(readWeek(), today())),
        })}
      />
    );
  }

  const step = dayOneFor(level, intent);
  return (
    <StepCard
      eyebrow={again ? t("onboard.returning.nextEyebrow") : t("onboard.day1.eyebrow")}
      title={t(`onboard.day1.${step.key}.title`)}
      body={t(`onboard.day1.${step.key}.body`)}
      href={step.href}
      onDismiss={dismissNudge}
      onOpen={opening({
        // Counted only here, where the reader chose it: the website sends a
        // reader straight to their first step as the questions end, which
        // is not a choice and is not counted.
        count: () =>
          countDayOne(step.key, {
            ...(background ? { background } : {}),
            ...(level ? { level } : {}),
            ...(intent ? { intent } : {}),
          }),
        keep: () => dismissNudge(),
      })}
    />
  );
}

/**
 * A tap on Begin, in two parts (lib/onboarding/openStep.ts): what is only
 * counted, now; and what takes the card off Today, once the card has left the
 * screen with its page. Taking the card off at the tap made Today jump under
 * the finger before the page's transition had begun (measured 2026-11-22).
 */
function useStepOpening(): (parts: StepParts) => () => void {
  const opening = useRef<StepOpening | null>(null);
  useEffect(
    () => () => {
      opening.current?.left();
      opening.current = null;
    },
    [],
  );
  return (parts) => () => {
    if (!opening.current) opening.current = stepOpening(parts);
    opening.current.tapped();
  };
}

/** The week's card once today's step is kept (2.0, the day's frame): the day, and tomorrow's step by name. Nothing to tap. */
function KeptCard({ eyebrow, title }: { eyebrow: string; title: string | null }) {
  return (
    <div
      data-first-step-kept=""
      className="lm-card relative mb-4 overflow-hidden rounded-[22px] p-5 ring-1 ring-inset ring-premium/30 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.6)]"
      style={CARD_BG}
    >
      <p className="font-sans text-caption font-semibold text-premium-ink">{eyebrow}</p>
      {title ? <p className="mt-2 font-heading text-title-sm font-bold leading-tight text-paper">{title}</p> : null}
    </div>
  );
}

function isDayOneKey(key: string): key is DayOneKey {
  return (DAY_ONE_KEYS as readonly string[]).includes(key);
}

/** The card itself: one design for Day 1 and for each day of a first week. */
function StepCard({
  eyebrow,
  title,
  body,
  href,
  onDismiss,
  onOpen,
}: {
  eyebrow: string;
  title: string;
  /** The line under the title. A week's step whose page has no line of its own stands on its title. */
  body: string | null;
  href: string;
  onDismiss: () => void;
  onOpen: () => void;
}) {
  const { t } = useTranslate();
  return (
    <div
      data-first-step=""
      className="ob-day1-in ob-sheen lm-card relative mb-4 overflow-hidden rounded-[22px] p-5 ring-1 ring-inset ring-premium/30 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.6)]"
      style={CARD_BG}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-sans text-caption font-semibold text-premium-ink">{eyebrow}</p>
          <p className="mt-2 font-heading text-title-sm font-bold leading-tight text-paper">{title}</p>
          {body ? <p className="mt-1.5 font-sans text-detail leading-[1.55] text-paper/65">{body}</p> : null}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t("onboard.nudge.dismiss")}
          className="-me-2 -mt-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-paper/50 transition-colors hover:text-paper"
        >
          <Close size={14} />
        </button>
      </div>
      <Link
        href={href}
        onClick={onOpen}
        className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-pill border border-paper/22 bg-paper/[0.03] px-5 font-sans text-ui font-semibold text-paper transition-[transform,translate,scale,background-color] motion-reduce:transition-none hover:bg-paper/[0.06] active:scale-[0.98]"
      >
        {t("onboard.day1.open")}
        <ChevronRight size={14} aria-hidden className="shrink-0 rtl:-scale-x-100" />
      </Link>
    </div>
  );
}
