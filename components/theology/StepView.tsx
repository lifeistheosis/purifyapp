"use client";

import Link from "next/link";
import { useEffect } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Check } from "@/components/ui/icons/Check";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import {
  readStates,
  stepNumeral,
  withAt,
  withWalked,
  type PathRead,
  type PathStep,
  type ReadKind,
  type ReadState,
} from "@/lib/theology/path";
import { updatePathProgress, usePathProgress } from "@/lib/theology/usePathProgress";

import { FatherFace } from "./FatherFace";
import { KindIcon, ReadMeta, noteOpened } from "./PathRead";
import { WholeIcon } from "./WholeIcon";

/** A step's parts in the order C draws them: the short answer first, then the long studies. */
const KINDS: readonly ReadKind[] = ["question", "study", "error", "council"];

/** Each part's name over its reads, from the catalog (one or more). */
const LABEL: Record<ReadKind, string> = {
  question: "study.theology.tray.questions",
  study: "study.theology.tray.studies",
  error: "study.theology.tray.errors",
  council: "study.theology.tray.councils",
};

type Item = { read: PathRead; state: ReadState };

/** A part of the step is read once all its reads are, and lit while it holds the next. */
function partState(items: readonly Item[]): ReadState {
  if (items.every((i) => i.state === "read")) return "read";
  return items.some((i) => i.state === "next") ? "next" : "ahead";
}

/**
 * A step of the path (1.8, round 3 r3-13): C's "a step", in B's room over
 * the subject's icon (app/(app)/theology/path/[subject]/page.tsx draws the
 * room and the name). The question first, with its short answer, then the
 * studies, the errors and the councils, joined by one line, the next read
 * lit and the ones read checked; Up next at its end.
 *
 * Opening the step makes it where the reader is; opening a question, an
 * error or a council from it counts it read, a study counts once read to its
 * end; Next walks the step and opens the next (lib/theology/
 * usePathProgress.ts, kept on the device).
 */
export function StepView({
  step,
  next,
}: {
  step: PathStep;
  /** The step after this one; none after the ninth, whose end is Go deeper. */
  next: Pick<PathStep, "id" | "n" | "title" | "picture"> | null;
}) {
  const { t, tn } = useTranslate();
  const progress = usePathProgress();

  // The step is where the reader is now.
  useEffect(() => {
    updatePathProgress((p) => withAt(p, step.id));
  }, [step.id]);

  const states = readStates(step.reads, progress);
  const parts = KINDS.map((kind) => ({
    kind,
    items: step.reads.flatMap((read, i): Item[] => (read.kind === kind ? [{ read, state: states[i] }] : [])),
  })).filter((p) => p.items.length > 0);

  const walkOn = () => updatePathProgress((p) => withWalked(p, step.id));

  return (
    <div data-step-view="">
      <ol className="relative">
        {parts.map((part, pi) => {
          const state = partState(part.items);
          return (
            <li key={part.kind} data-step-part={part.kind} className="relative pb-6 ps-[35px] last:pb-0">
              {pi < parts.length - 1 ? (
                <span aria-hidden data-done={state === "read" ? "" : undefined} className="path-line top-[11px] -bottom-px" />
              ) : null}
              <span aria-hidden data-state={state} className="path-node absolute start-0 top-0">
                {state === "read" ? <Check size={13} strokeWidth={2.4} /> : null}
              </span>
              <h2 className="flex min-h-[22px] items-center justify-between gap-3 font-sans text-[10.5px] font-bold uppercase tracking-[0.14em] text-paper/50">
                <span>{tn(LABEL[part.kind], part.items.length)}</span>
                {part.kind === "question" ? null : (
                  <span className="text-[11.5px] font-semibold normal-case tracking-normal tabular-nums text-paper/40">{part.items.length}</span>
                )}
              </h2>
              {part.kind === "question" ? (
                <div className="mt-1.5 space-y-2.5">
                  {part.items.map(({ read, state: s }, qi) => (
                    <Link
                      key={read.id}
                      href={read.href}
                      data-read-state={s}
                      onClick={() => noteOpened(read, step.id)}
                      className={`${s === "next" ? "path-lit" : "theology-tray"} tap-press block rounded-[16px] px-3.5 py-3`}
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span className="font-serif text-[17px] font-bold leading-tight text-paper">{read.title}</span>
                        {s === "read" ? (
                          <>
                            <Check size={15} className="mt-0.5 shrink-0 text-paper/60" />
                            <span className="sr-only">{t("paths.read")}</span>
                          </>
                        ) : null}
                      </span>
                      {qi === 0 && step.short ? (
                        <span lang="en" className="mt-[5px] block font-serif text-[14px] italic leading-[1.48] text-paper/80">
                          {step.short}
                        </span>
                      ) : null}
                      <span className="mt-1.5 flex items-center justify-between gap-3 font-sans text-caption text-paper/50">
                        <ReadMeta read={read} progress={progress} />
                        <ChevronRight size={14} className="shrink-0 text-paper/45 rtl:-scale-x-100" />
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <ul className="mt-1">
                  {part.items.map(({ read, state: s }) => (
                    <li key={read.id} className="theology-rule">
                      <Link
                        href={read.href}
                        data-read-state={s}
                        onClick={() => noteOpened(read, step.id)}
                        className={`${s === "next" ? "path-lit" : "theology-row"} -mx-2 flex min-h-[48px] items-center gap-3 rounded-[14px] px-2 py-2`}
                      >
                        <ReadMark read={read} />
                        <span className="min-w-0 flex-1">
                          <span
                            lang="en"
                            className={`block font-serif text-[15px] font-semibold leading-[1.28] ${s === "read" ? "text-paper/60" : "text-paper/92"}`}
                          >
                            {read.title}
                          </span>
                        </span>
                        <span className="shrink-0 whitespace-nowrap font-sans text-[12.5px] tabular-nums text-paper/52">
                          <ReadMeta read={read} progress={progress} />
                        </span>
                        {s === "read" ? (
                          <>
                            <Check size={15} className="shrink-0 text-paper/60" />
                            <span className="sr-only">{t("paths.read")}</span>
                          </>
                        ) : (
                          <ChevronRight size={14} className="shrink-0 text-paper/32 rtl:-scale-x-100" />
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>

      {/* Up next, at the step's end: the next step, or after the ninth the whole library. */}
      <div data-step-next="" className="theology-tray mt-8 flex items-center gap-3 rounded-[22px] p-3.5">
        {next ? (
          <span aria-hidden className="w-[42px] shrink-0">
            <WholeIcon src={next.picture.src} className="aspect-[4/5] w-full rounded-[6px]" />
          </span>
        ) : null}
        <span className="min-w-0 flex-1">
          <span className="block font-sans text-[10.5px] font-bold uppercase tracking-[0.14em] text-paper/50">
            {next ? `${t("walk.upNext")} · ${stepNumeral(next.n)}` : t("discover.eyebrow")}
          </span>
          <span className="mt-1 block font-serif text-[15px] font-semibold leading-[1.3] text-paper">
            {next ? next.title : t("study.apologetics.goDeeper")}
          </span>
        </span>
        <Link
          href={next ? `/theology/path/${next.id}` : "/theology#go-deeper"}
          onClick={walkOn}
          className="reader-lit tap-press inline-flex h-[42px] shrink-0 items-center gap-1.5 rounded-pill bg-paper px-5 font-sans text-[14.5px] font-semibold text-night"
        >
          {t("common.next")}
          <ChevronRight size={15} className="rtl:-scale-x-100" />
        </Link>
      </div>
    </div>
  );
}

/**
 * What a read wears at its start: a study the face of the Father it quotes
 * most, a council its own picture, an error its glyph on a small plate.
 */
function ReadMark({ read }: { read: PathRead }) {
  if (read.kind === "study" && read.father) return <FatherFace father={read.father} size={34} />;
  if (read.kind === "council" && read.picture) {
    return (
      <span aria-hidden className="relative block size-[34px] shrink-0 overflow-hidden rounded-[10px] bg-night-soft ring-1 ring-inset ring-paper/15">
        {read.picture.preview ? (
          <span className="absolute inset-0 scale-110 bg-cover bg-center blur-sm" style={{ backgroundImage: `url(${read.picture.preview})` }} />
        ) : null}
        {/* eslint-disable-next-line @next/next/no-img-element -- a static export serves files as they are. */}
        <img src={read.picture.src} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: read.picture.focus }} />
      </span>
    );
  }
  return (
    <span aria-hidden className="theology-plate grid size-[34px] shrink-0 place-items-center rounded-[10px] text-paper/85">
      <KindIcon kind={read.kind} size={17} />
    </span>
  );
}
