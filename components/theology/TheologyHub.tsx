"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ChevronDown } from "@/components/ui/icons/ChevronDown";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { Search } from "@/components/ui/icons/Search";
import { useSpace } from "@/lib/onboarding/useSpace";
import { openSearch } from "@/lib/search/open";
import {
  currentStepIndex,
  headFor,
  nextReadIndex,
  started,
  stepStates,
  type PathProgress,
  type PathStep,
  type StepState,
} from "@/lib/theology/path";
import { usePathProgress } from "@/lib/theology/usePathProgress";

import { KindIcon, ReadMeta, noteOpened } from "./PathRead";
import { PathMedal } from "./PathMedal";
import { PathPlates } from "./PathPlates";
import { WholeIcon } from "./WholeIcon";

/**
 * Theology's hub (1.8, round 3 r3-13): the owner's pick of 2026-10-30, a
 * hybrid of B and C, "I like the images that are on B, but I like C's
 * design" (Homebase/boards/purify-master/variants/r3-13-theology-revamp).
 *
 * C's design: transitionary, the head by the reader's own answer to
 * Familiarity (asked in onboarding, changed in Settings, read on the device,
 * lib/onboarding/useSpace.ts), so the export carries all three and nothing
 * is fetched. Then the path of nine in the order of the Creed and, after the
 * ninth, the path's end and Go deeper: the four ways, the Seven Councils,
 * the Fathers and Church History. A practicing reader gets that library
 * first, and the path folded to one row at the foot.
 *
 * B's images: each subject's icon whole in its own light, never cropped, on
 * the first step's card and on the nine plates ("9 plates is also good"),
 * which is how the path shows wherever all nine show at once; the councils
 * by their own pictures, the Fathers by their faces.
 *
 * The reader's place on the path stays on the device (lib/theology/
 * usePathProgress.ts). The library's parts are drawn on the server and handed
 * in as they are (`slots`), so their words and counts are the registries'.
 */
export function TheologyHub({
  steps,
  slots,
}: {
  steps: PathStep[];
  slots: {
    /** The four ways as rows, under Go deeper. */
    waysRows: ReactNode;
    /** The four ways as tiles, in the library first. */
    waysTiles: ReactNode;
    /** The Seven Councils, by their own pictures. */
    councils: ReactNode;
    /** The studies added last, in the library first. */
    recent: ReactNode;
    /** The Fathers the studies quote, and Church History. */
    more: ReactNode;
  };
}) {
  const { t } = useTranslate();
  const { level } = useSpace();
  const progress = usePathProgress();
  const head = headFor(level);
  const states = stepStates(steps, progress);
  const walked = states.filter((s) => s === "walked").length;
  const of = t("readingsFlow.of", { n: walked, total: steps.length });

  if (head === "library") {
    return (
      <div data-theology-head="library">
        <section id="go-deeper" aria-label={t("study.theology.studyLibrary")} className="scroll-mt-20">
          <button
            type="button"
            data-theology-search=""
            onClick={() => openSearch("theology")}
            className="theology-entry tap-press flex h-11 w-full items-center gap-2.5 rounded-[14px] px-3.5 text-start font-sans text-[15px] text-paper/50"
          >
            <Search size={18} aria-hidden />
            <span className="truncate">{t("study.theology.searchLibrary")}</span>
          </button>
          {slots.recent}
          <div className="mt-4">{slots.waysTiles}</div>
          {slots.councils}
        </section>
        {slots.more}
        <div data-tour="theology-path">
          <FoldedPath steps={steps} states={states} label={of} />
        </div>
      </div>
    );
  }

  return (
    <div data-theology-head={head}>
      <div data-tour="theology-path">
        {head === "first" ? (
          <FirstStep steps={steps} progress={progress} />
        ) : (
          <WhereYouLeftOff steps={steps} states={states} progress={progress} />
        )}
      </div>

      <section aria-labelledby="theology-path" className="mt-7">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="theology-path" className="font-serif text-[17px] font-bold leading-tight text-paper">
            {t("study.theology.byFaith")}
          </h2>
          <span className="shrink-0 font-sans text-[12.5px] tabular-nums text-paper/50">{of}</span>
        </div>
        <p className="sr-only">{t("study.theology.byFaithLead")}</p>
        <PathPlates steps={steps} states={states} className="mt-3" />
      </section>

      {/* The path's end, then Go deeper: the whole library after the ninth. */}
      <section id="go-deeper" aria-labelledby="go-deeper-title" className="mt-10 scroll-mt-20">
        <p className="font-sans text-[10.5px] font-bold uppercase tracking-[0.14em] text-paper/50">{t("discover.eyebrow")}</p>
        <h2 id="go-deeper-title" className="mt-1.5 font-serif text-[23px] font-bold leading-tight text-paper">
          {t("study.apologetics.goDeeper")}
        </h2>
        <p className="mt-1.5 max-w-[60ch] font-sans text-[12.5px] leading-[1.5] text-paper/55">{t("study.theology.footLine")}</p>
        <div className="mt-3.5">{slots.waysRows}</div>
        {slots.councils}
        {slots.more}
      </section>
    </div>
  );
}

/** The step a head shows: the one in hand, or the ninth once all are walked. */
function stepInHand(steps: PathStep[], progress: PathProgress): { step: PathStep; done: boolean } {
  const at = currentStepIndex(steps, progress);
  return at < 0 ? { step: steps[steps.length - 1], done: true } : { step: steps[at], done: false };
}

const BUTTON =
  "reader-lit tap-press mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-pill bg-paper px-5 font-sans text-[15px] font-semibold text-night";

/**
 * A reader completely new: the first step and its short answer, then what
 * comes next. The step's icon is the card's picture, whole in its light.
 * Once begun, the card is the step in hand.
 */
function FirstStep({ steps, progress }: { steps: PathStep[]; progress: PathProgress }) {
  const { t } = useTranslate();
  const fresh = !started(progress);
  const { step, done } = stepInHand(steps, progress);
  return (
    <section aria-labelledby="theology-head" data-path-head="first">
      <p className="font-sans text-[10.5px] font-bold uppercase tracking-[0.14em] text-paper/50">
        {fresh ? t("study.theology.byFaith") : t("prayers.today.whereYouLeftOff")}
      </p>
      {fresh ? (
        <h2 className="mt-[7px] font-serif text-[27px] font-bold leading-[1.12] text-balance text-paper">
          {t("study.theology.beginWhereChurchBegins")}
        </h2>
      ) : null}
      <div className="theology-tray relative mt-4 overflow-hidden rounded-[20px]">
        <WholeIcon src={step.picture.src} eager className="theology-card-picture h-[188px] w-full" />
        <div className="relative -mt-3.5 px-4 pb-4">
          <p className="font-sans text-caption font-semibold text-paper/50">{t("readingsFlow.of", { n: step.n, total: steps.length })}</p>
          <h3 id="theology-head" className="mt-0.5 font-serif text-[22px] font-bold leading-tight text-paper">
            {step.title}
          </h3>
          {done ? null : <NextRow step={step} steps={steps} progress={progress} short />}
          {done ? (
            <a href="#go-deeper" className={BUTTON}>
              {t("study.apologetics.goDeeper")}
            </a>
          ) : (
            <Link href={`/theology/path/${step.id}`} className={BUTTON}>
              {fresh ? t("onboard.day1.open") : t("common.continue")}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * A reader who is learning: where they left off, the next read in reach,
 * and Continue, which opens the step. The step's medallion is ringed by the
 * path of nine.
 */
function WhereYouLeftOff({ steps, states, progress }: { steps: PathStep[]; states: StepState[]; progress: PathProgress }) {
  const { t } = useTranslate();
  const fresh = !started(progress);
  const { step, done } = stepInHand(steps, progress);
  return (
    <section aria-labelledby="theology-head" data-path-head="resume">
      {fresh ? null : (
        <p className="font-sans text-[13px] font-semibold text-paper/55">
          {done ? t("study.theology.byFaith") : t("prayers.today.whereYouLeftOff")}
        </p>
      )}
      <div className="theology-tray relative mt-2.5 overflow-hidden rounded-[20px] p-4">
        {/* The step's own icon, blurred and grey: the card's light. */}
        <span aria-hidden className="faith-tray-glow" style={{ backgroundImage: `url(${step.picture.src})` }} />
        <Link href={`/theology/path/${step.id}`} className="relative flex items-center gap-[15px]">
          <PathMedal src={step.picture.src} focus={step.picture.focus} size={82} inner={66} states={states} />
          <span className="min-w-0">
            <span className="block font-sans text-caption font-semibold text-paper/50">
              {t("readingsFlow.of", { n: step.n, total: steps.length })}
            </span>
            <span id="theology-head" className="mt-[3px] block font-serif text-[21px] font-bold leading-[1.15] text-paper">
              {step.title}
            </span>
          </span>
        </Link>
        {done ? null : <NextRow step={step} steps={steps} progress={progress} />}
        {done ? (
          <a href="#go-deeper" className={BUTTON}>
            {t("study.apologetics.goDeeper")}
          </a>
        ) : (
          <Link href={`/theology/path/${step.id}`} className={BUTTON}>
            {fresh ? t("onboard.day1.open") : t("common.continue")}
          </Link>
        )}
      </div>
    </section>
  );
}

/**
 * The next read of the step in hand, lit: a question with its short answer
 * for a reader who is new. When the step's last read is read, the next step.
 */
function NextRow({ step, steps, progress, short = false }: { step: PathStep; steps: PathStep[]; progress: PathProgress; short?: boolean }) {
  const { t } = useTranslate();
  const at = nextReadIndex(step.reads, progress);
  const ROW = "path-lit relative mt-3.5 flex items-start gap-3 rounded-[14px] px-2.5 py-[9px]";
  if (at >= 0) {
    const read = step.reads[at];
    return (
      <Link href={read.href} data-next-read="" onClick={() => noteOpened(read, step.id)} className={ROW}>
        <span className="theology-plate mt-px grid size-8 shrink-0 place-items-center rounded-[10px] text-paper/85">
          <KindIcon kind={read.kind} size={17} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-serif text-[15.5px] font-semibold leading-[1.26] text-paper">{read.title}</span>
          <span className="mt-0.5 block font-sans text-caption text-paper/52">
            <ReadMeta read={read} progress={progress} />
          </span>
          {short && read.kind === "question" && step.short ? (
            <span lang="en" className="mt-[7px] block font-serif text-[14px] italic leading-[1.45] text-paper/80">
              {step.short}
            </span>
          ) : null}
        </span>
        <ChevronRight size={14} className="mt-2 shrink-0 text-paper/70 rtl:-scale-x-100" />
      </Link>
    );
  }
  const next = steps[step.n];
  if (!next) return null;
  return (
    <Link href={`/theology/path/${next.id}`} data-next-read="" className={ROW}>
      <span className="theology-plate mt-px grid size-8 shrink-0 place-items-center overflow-hidden rounded-[10px]">
        {/* eslint-disable-next-line @next/next/no-img-element -- a static export serves files as they are. */}
        <img src={next.picture.src} alt="" className="h-full w-full object-cover" style={{ objectPosition: next.picture.focus ?? "50% 30%" }} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-serif text-[15.5px] font-semibold leading-[1.26] text-paper">{next.title}</span>
        <span className="mt-0.5 block font-sans text-caption text-paper/52">{t("walk.upNext")}</span>
      </span>
      <ChevronRight size={14} className="mt-2 shrink-0 text-paper/70 rtl:-scale-x-100" />
    </Link>
  );
}

/** For a practicing reader, the path folded to one row at the foot; it opens to the nine. */
function FoldedPath({ steps, states, label }: { steps: PathStep[]; states: StepState[]; label: string }) {
  const { t } = useTranslate();
  const current = states.indexOf("current");
  const step = steps[current >= 0 ? current : 0];
  return (
    <details data-path-folded="" className="group mt-8">
      <summary className="theology-tray press-card flex cursor-pointer list-none items-center gap-3 rounded-[18px] p-3 [&::-webkit-details-marker]:hidden">
        <PathMedal src={step.picture.src} focus={step.picture.focus} size={44} inner={34} states={states} />
        <span className="min-w-0 flex-1">
          <span className="block font-serif text-[15.5px] font-semibold leading-tight text-paper">{t("study.theology.byFaith")}</span>
          <span className="mt-0.5 block font-sans text-caption tabular-nums text-paper/52">{label}</span>
        </span>
        <ChevronDown size={16} className="shrink-0 text-paper/55 transition-transform duration-300 ease-house group-open:rotate-180 motion-reduce:transition-none" />
      </summary>
      <PathPlates steps={steps} states={states} className="mt-4" />
    </details>
  );
}
