"use client";

// The finished day's questions (1.7, the owner's note 22: "2 or 3 questions
// to answer in a line or skip (saved to the journal)"). Each in Lora with
// one line under it. Keep in my journal saves each one answered as a
// question in the journal, with the question and the plan's day on it
// (lib/journal/entries.ts). Skip saves nothing: the questions wait at the
// top of the journal instead, until answered or put aside there.

import Link from "next/link";
import { useId, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { addRecord } from "@/lib/journal/entries";
import type { GuideQuestion } from "@/lib/plans/guide";
import { softTick } from "@/lib/ui/softTick";

export function PlanQuestions({
  planId,
  day,
  questions,
  dayLabel,
}: {
  planId: string;
  /** The plan's day, from 0. */
  day: number;
  questions: GuideQuestion[];
  /** "Day 6: Matthew 6", kept on each answer. */
  dayLabel: string;
}) {
  const { t } = useTranslate();
  const id = useId();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [kept, setKept] = useState(0);
  const [skipped, setSkipped] = useState(false);
  const any = questions.some((q) => (answers[q.key] ?? "").trim());

  if (skipped || questions.length === 0) return null;

  if (kept > 0) {
    return (
      <p role="status" className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-1 font-sans text-ui text-paper/75">
        {t("plans.finish.kept")}
        <Link href="/journal" className="inline-flex min-h-11 items-center font-semibold text-paper underline underline-offset-4">
          {t("journal.title")}
        </Link>
      </p>
    );
  }

  const keep = () => {
    let n = 0;
    for (const q of questions) {
      const body = (answers[q.key] ?? "").trim();
      if (!body) continue;
      addRecord({ kind: "question", body, prompt: { key: q.key, text: q.text }, source: { type: "plan-day", planId, day, label: dayLabel } });
      n += 1;
    }
    if (n) softTick();
    setKept(n);
  };

  return (
    <section aria-labelledby={`${id}-title`} data-plan-questions="" className="mt-10">
      <p id={`${id}-title`} role="heading" aria-level={2} className="font-sans text-ui font-semibold text-paper">
        {t("plans.finish.toSitWith")}
      </p>
      <ul className="mt-4 space-y-6">
        {questions.map((q, i) => (
          <li key={q.key}>
            <label htmlFor={`${id}-${i}`} className="block font-serif text-body leading-[1.5] text-paper">
              {q.text}
            </label>
            <input
              id={`${id}-${i}`}
              type="text"
              maxLength={500}
              enterKeyHint={i === questions.length - 1 ? "done" : "next"}
              value={answers[q.key] ?? ""}
              onChange={(e) => setAnswers((a) => ({ ...a, [q.key]: e.target.value }))}
              placeholder={t("plans.finish.placeholder")}
              className="mt-2 h-12 w-full rounded-pill border border-paper/12 bg-paper/[0.04] px-4 font-sans text-ui text-paper placeholder:text-paper/40 focus:border-paper/30 focus:outline-none"
            />
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={keep}
          disabled={!any}
          className="tap-press inline-flex h-12 items-center rounded-pill bg-paper px-6 font-sans text-ui font-semibold text-night disabled:opacity-40"
        >
          {t("plans.finish.keep")}
        </button>
        <button
          type="button"
          onClick={() => setSkipped(true)}
          className="tap-press inline-flex min-h-11 items-center rounded-pill px-3 font-sans text-ui text-paper/60 hover:text-paper"
        >
          {t("plans.finish.skip")}
        </button>
      </div>
    </section>
  );
}
