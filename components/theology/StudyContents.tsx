"use client";

import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Check } from "@/components/ui/icons/Check";
import { readIdOf, resumePart, type ReadState } from "@/lib/theology/path";
import { usePathProgress } from "@/lib/theology/usePathProgress";

import { FatherFace } from "./FatherFace";

export type ContentsFather = { key: string; name: string; slug?: string; iconUrl?: string };
export type ContentsPart = { heading: string; fathers: ContentsFather[]; passages: number };

/** At most this many faces beside a part; the count says the rest. */
const FACES = 3;

/**
 * Before you read (1.8, round 3 r3-13, C's "before you read" in the owner's
 * hybrid of B and C): a study's parts, in its own order, each with the
 * Fathers it brings by face as they stand in the text and how many of their
 * passages; the Fathers no part names, at the end; then Begin, which starts
 * part one, or Continue at the part the reader reached, which this device
 * keeps (lib/theology/usePathProgress.ts). The parts read are checked, the
 * one in hand lit.
 */
export function StudyContents({ slug, parts, end }: { slug: string; parts: ContentsPart[]; end: { fathers: ContentsFather[]; passages: number } }) {
  const { t } = useTranslate();
  const progress = usePathProgress();
  const total = parts.length;
  const finished = progress.read.includes(readIdOf.study(slug));
  const reached = progress.parts[slug] ?? 0;
  const resume = finished ? 1 : resumePart(progress, slug, total);
  const begun = !finished && reached > 0;
  const stateOf = (n: number): ReadState => (finished || n < reached ? "read" : n === resume ? "next" : "ahead");

  return (
    <section data-study-contents="" aria-labelledby="study-contents" className="mt-6">
      <h2 id="study-contents" className="flex items-center gap-2.5 font-sans text-[10.5px] font-bold uppercase tracking-[0.14em] text-paper/50">
        {t("saints.contents")}
        <span aria-hidden className="h-px flex-1 bg-paper/10" />
      </h2>
      <ol className="relative mt-2">
        {parts.map((part, i) => {
          const n = i + 1;
          const state = stateOf(n);
          return (
            <li key={n} data-part-state={state} className="relative flex min-h-[52px] items-center gap-[13px] py-1.5">
              {i < total - 1 ? <span aria-hidden data-done={state === "read" ? "" : undefined} className="path-line top-1/2 -bottom-1/2" /> : null}
              <span aria-hidden data-state={state} className="path-node font-sans text-[11px] font-bold text-paper/70">
                {state === "read" ? <Check size={13} strokeWidth={2.4} /> : state === "ahead" ? n : null}
              </span>
              <span
                lang="en"
                className={`min-w-0 flex-1 font-serif text-[14.5px] font-semibold leading-[1.28] ${state === "next" ? "text-paper" : "text-paper/86"}`}
              >
                {part.heading || t("paths.part", { n, total })}
              </span>
              {part.passages > 0 ? <Faces fathers={part.fathers} count={part.passages} /> : null}
            </li>
          );
        })}
        {end.passages > 0 ? (
          <li data-part-state="end" className="relative flex min-h-[44px] items-center gap-[13px] py-1.5">
            <span aria-hidden className="w-[22px] shrink-0" />
            <span className="min-w-0 flex-1 font-sans text-[12.5px] text-paper/55">{t("study.theology.fromTheFathers")}</span>
            <Faces fathers={end.fathers} count={end.passages} />
          </li>
        ) : null}
      </ol>
      <Link
        href={`/theology/${slug}/read#part-${resume}`}
        data-study-begin=""
        className="reader-lit tap-press mt-4 flex h-[46px] w-full items-center justify-center gap-2 rounded-pill bg-paper px-5 font-sans text-[15px] font-semibold text-night md:w-auto md:min-w-[280px]"
      >
        {begun ? t("common.continue") : t("onboard.day1.open")}
        <span className="font-medium opacity-55">{t("paths.part", { n: resume, total })}</span>
      </Link>
    </section>
  );
}

/** A part's Fathers by face, a few, and how many passages they bring. */
function Faces({ fathers, count }: { fathers: ContentsFather[]; count: number }) {
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      <span className="face-stack flex">
        {fathers.slice(0, FACES).map((f) => (
          <FatherFace key={f.key} father={f} size={26} />
        ))}
      </span>
      <span className="font-sans text-[12px] font-semibold tabular-nums text-paper/55">{count}</span>
      <span className="sr-only">{fathers.map((f) => f.name).join(", ")}</span>
    </span>
  );
}
