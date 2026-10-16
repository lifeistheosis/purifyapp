"use client";

// The reading plan's questions, waiting in the journal (1.7, the owner's
// note 23: "the reading plan's questions land here as entries you can
// answer"). Only the day read most recently, never a backlog
// (lib/journal/feed.ts, planPrompts). A question opens the writing sheet
// with itself and the plan's day on top; Not now puts that day's questions
// aside. Hairlines, no box: the questions themselves in Lora.

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Pen } from "@/components/ui/icons/Pen";
import type { PlanQuestion, WaitingQuestions } from "@/lib/journal/feed";

export function JournalPrompts({
  waiting,
  dayLabel,
  onAnswer,
  onNotNow,
}: {
  waiting: WaitingQuestions;
  /** "Day 6: Matthew 6" in the reader's language. */
  dayLabel: string;
  onAnswer: (q: PlanQuestion) => void;
  onNotNow: () => void;
}) {
  const { t } = useTranslate();
  return (
    <section aria-labelledby="journal-prompts" data-journal-prompts="" className="mt-6 border-y border-paper/10 py-4">
      <p id="journal-prompts" role="heading" aria-level={2} className="font-sans text-caption font-semibold text-paper/60">
        {t("journal.prompts.title")}
      </p>
      <p className="mt-0.5 font-sans text-caption text-paper/45">{dayLabel}</p>
      <ul className="mt-2 divide-y divide-paper/8">
        {waiting.questions.map((q) => (
          <li key={q.key}>
            <button type="button" onClick={() => onAnswer(q)} className="tap-press flex min-h-12 w-full items-center gap-3 py-3 text-start">
              <span className="min-w-0 flex-1 font-serif text-body leading-[1.5] text-paper">{q.text}</span>
              <Pen size={16} className="shrink-0 text-paper/45" />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onNotNow}
        className="tap-press mt-1 inline-flex min-h-11 items-center font-sans text-caption font-semibold text-paper/55 hover:text-paper"
      >
        {t("journal.prompts.notNow")}
      </button>
    </section>
  );
}
