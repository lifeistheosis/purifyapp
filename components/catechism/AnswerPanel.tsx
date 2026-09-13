"use client";

import Link from "next/link";
import type { RefObject } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import type { ClientQuestion } from "@/lib/catechism/types";

/**
 * What follows an answer: right or not, the explanation, and where it comes
 * from. The source link is the point of the whole feature (C1: every
 * question links to free content), so it is a plain link with the page's
 * name, never a button that hides the destination.
 *
 * The wrapper is ALWAYS rendered and is the aria-live region, so the reveal
 * is announced as a change inside it rather than as a new region appearing,
 * which screen readers do not announce. The content rises in with the
 * existing `.rise-in`.
 */

/** The accepted answer, as words, for the "not quite" line. */
export function answerLabel(
  q: ClientQuestion,
  t: (key: string) => string,
): string {
  switch (q.type) {
    case "multiple_choice":
      return typeof q.answer === "number" ? (q.options?.[q.answer] ?? "") : "";
    case "true_false":
      return q.answer === true ? t("catechism.true") : t("catechism.false");
    case "fill_word":
      return Array.isArray(q.answer) ? (q.answer[0] ?? "") : "";
  }
}

export function AnswerPanel({
  question,
  revealed,
  correct,
  isLast,
  onNext,
  nextRef,
}: {
  question: ClientQuestion;
  revealed: boolean;
  correct: boolean;
  isLast: boolean;
  onNext: () => void;
  nextRef: RefObject<HTMLButtonElement | null>;
}) {
  const { t } = useTranslate();

  return (
    <div aria-live="polite" aria-atomic="true" className="mt-6 min-h-[1px]">
      {revealed && (
        <div className="rise-in rounded-2xl border border-paper/12 bg-paper/[0.03] p-5">
          <p className="font-sans text-ui font-semibold text-paper">
            {correct
              ? t("catechism.correct")
              : t("catechism.incorrect", { answer: answerLabel(question, t) })}
          </p>
          <p className="mt-3 font-serif text-body leading-[1.65] text-paper/85">
            {question.explanation}
          </p>
          <p className="mt-4 font-sans text-caption text-paper/60">
            {t("catechism.source")}
            {": "}
            <Link
              href={question.source.href}
              className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 rounded-sm"
            >
              {question.source.label}
            </Link>
          </p>
          <button
            ref={nextRef}
            type="button"
            onClick={onNext}
            className="mt-5 w-full rounded-pill bg-paper px-6 py-3.5 font-sans text-ui font-semibold text-night hover:bg-paper/90 active:scale-[0.98] transition-[transform,background-color] [transition-duration:var(--duration-instant)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
          >
            {isLast ? t("catechism.finish") : t("catechism.next")}
          </button>
        </div>
      )}
    </div>
  );
}
