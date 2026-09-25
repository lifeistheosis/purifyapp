"use client";

import { useId, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";
import type { Answer, ClientQuestion } from "@/lib/catechism/types";

/**
 * One question: the prompt and the way to answer it.
 *
 * Every option is a real <button aria-pressed>, so a keyboard reaches them in
 * order and a screen reader hears the choice; the typed answer is a labelled
 * <input> inside a <form>, so Enter submits. After the reveal the buttons stay
 * in the tab order (aria-disabled, not disabled) and simply stop responding,
 * so focus is never thrown away.
 *
 * MOTION. The options arrive in a `.cascade` with the tight step, the same
 * entrance the Today surface uses; the card is keyed by question id in the
 * parent so it replays per question. On reveal the correct option fills over
 * `--duration-fast` on `--ease-house`, and its mark rises in with the
 * existing `.rise-in`. Nothing new is defined: under reduced motion every
 * one of those already collapses to its end state.
 */

const OPTION =
  "flex w-full items-start gap-3 rounded-2xl border px-4 py-3.5 text-left font-serif text-body leading-[1.5] transition-[background-color,border-color,color] [transition-duration:var(--duration-fast)] [transition-timing-function:var(--ease-house)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70";

function optionClass(state: "idle" | "chosen" | "correct" | "dim"): string {
  switch (state) {
    case "correct":
      return "border-gold/60 bg-gold/[0.10] text-paper";
    case "chosen":
      return "border-paper/35 bg-paper/[0.04] text-paper/70";
    case "dim":
      return "border-paper/10 bg-paper/[0.02] text-paper/45";
    default:
      return "border-paper/15 bg-paper/[0.03] text-paper hover:border-paper/35";
  }
}

function Mark({ shown }: { shown: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[13px] font-sans font-semibold",
        shown ? "rise-in bg-gold text-night" : "invisible",
      )}
    >
      ✓
    </span>
  );
}

export function QuestionCard({
  question,
  index,
  total,
  given,
  revealed,
  onAnswer,
}: {
  question: ClientQuestion;
  index: number;
  total: number;
  given: Answer | null;
  revealed: boolean;
  onAnswer: (answer: Answer) => void;
}) {
  const { t } = useTranslate();
  const promptId = useId();
  const inputId = useId();
  const [typed, setTyped] = useState("");

  const stateFor = (value: Answer, isCorrect: boolean) => {
    if (!revealed) return given === value ? "chosen" : "idle";
    if (isCorrect) return "correct";
    return given === value ? "chosen" : "dim";
  };

  const choose = (value: Answer) => {
    if (revealed) return;
    onAnswer(value);
  };

  return (
    <div>
      <p className="font-sans text-eyebrow uppercase tracking-[2px] text-paper/55">
        {t("catechism.progress", { n: index + 1, total })}
      </p>
      <p
        id={promptId}
        className="mt-3 font-serif text-title-sm md:text-title font-semibold leading-[1.3] text-paper"
      >
        {question.prompt}
      </p>

      {question.type === "fill_word" ? (
        <form
          className="mt-6 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (revealed || !typed.trim()) return;
            onAnswer(typed);
          }}
        >
          <label htmlFor={inputId} className="font-sans text-caption text-paper/65">
            {t("catechism.typedLabel")}
          </label>
          <input
            id={inputId}
            type="text"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="done"
            value={revealed && typeof given === "string" ? given : typed}
            onChange={(e) => setTyped(e.target.value)}
            readOnly={revealed}
            aria-describedby={promptId}
            placeholder={t("catechism.typedPlaceholder")}
            className={cn(
              "w-full rounded-pill border bg-paper/[0.04] px-4 py-3 font-serif text-body text-paper placeholder:text-paper/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 transition-colors [transition-duration:var(--duration-fast)] motion-reduce:transition-none",
              revealed ? "border-paper/15 text-paper/70" : "border-paper/20 focus:border-paper/55",
            )}
          />
          {!revealed && (
            <button
              type="submit"
              disabled={!typed.trim()}
              className="self-start rounded-pill bg-paper px-6 py-3 font-sans text-ui font-semibold text-night hover:bg-paper/90 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
            >
              {t("catechism.answer")}
            </button>
          )}
        </form>
      ) : (
        <div
          role="group"
          aria-labelledby={promptId}
          className="cascade cascade-tight cascade-rise mt-6 flex flex-col gap-2.5"
        >
          {question.type === "true_false"
            ? ([true, false] as const).map((value) => {
                const state = stateFor(value, question.answer === value);
                return (
                  <button
                    key={String(value)}
                    type="button"
                    aria-pressed={given === value}
                    aria-disabled={revealed || undefined}
                    onClick={() => choose(value)}
                    className={cn(OPTION, optionClass(state))}
                  >
                    <Mark shown={state === "correct"} />
                    <span>{value ? t("catechism.true") : t("catechism.false")}</span>
                  </button>
                );
              })
            : (question.options ?? []).map((label, i) => {
                const state = stateFor(i, question.answer === i);
                return (
                  <button
                    key={i}
                    type="button"
                    aria-pressed={given === i}
                    aria-disabled={revealed || undefined}
                    onClick={() => choose(i)}
                    className={cn(OPTION, optionClass(state))}
                  >
                    <Mark shown={state === "correct"} />
                    <span>{label}</span>
                  </button>
                );
              })}
        </div>
      )}
    </div>
  );
}
