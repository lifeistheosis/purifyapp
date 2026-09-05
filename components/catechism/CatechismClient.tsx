"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiFetch } from "@/lib/api/client";
import { useCalendarStyleDefault } from "@/lib/calendar/useCalendarStyleDefault";
import { useToday } from "@/lib/calendar/useToday";
import { isoFromDate } from "@/lib/catechism/dates";
import { isCorrect } from "@/lib/catechism/grade";
import {
  markSynced,
  newAttemptId,
  readAttempt,
  writeAttempt,
  type LocalAttempt,
} from "@/lib/catechism/local";
import type { Answer, AttemptAnswer, ClientQuestion, DailyWindow, Reckoning } from "@/lib/catechism/types";
import { questionsFor } from "@/lib/catechism/window";
import { readLocalSessionUser } from "@/lib/supabase/localSession";

import { AnswerPanel } from "./AnswerPanel";
import { CompletionScreen } from "./CompletionScreen";
import { QuestionCard } from "./QuestionCard";
import { trackCatechism } from "./events";

/**
 * The five, on the device.
 *
 * The page (a server shell) hands this a date-keyed window. Everything from
 * "what day is it" onward happens here after mount, for the reason
 * lib/calendar/useToday.ts spells out: under the static export a server
 * component renders once and freezes its answer into the bundle. `useToday`
 * is null for the first frame, and that frame renders a placeholder rather
 * than a date.
 *
 * Grading is local, so the explanation and the source show without a
 * server. The attempt is written to the device the moment the fifth answer
 * lands; only then is it posted, signed in, to /api/catechism/attempt (which
 * grades again and keeps its own score) or, signed out, to the aggregate
 * counters. A failed post changes nothing on screen: the device copy is the
 * record the reader sees, and the server copy is a convenience.
 *
 * Nothing here counts days, shares a score, or knows what yesterday held.
 */

const SECTION = "px-5 md:px-8 py-12 md:py-20";

type Stage =
  | { kind: "answering"; index: number; answers: AttemptAnswer[]; given: Answer | null }
  | { kind: "done"; attempt: LocalAttempt };

function dateLabel(d: Date, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      weekday: "long",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    }).format(d);
  } catch {
    return isoFromDate(d);
  }
}

/** Today's key, or the last key the window holds when an install outlived it. */
function keyFor(window: DailyWindow, today: string): string | null {
  if (window.days[today]) return today;
  const keys = Object.keys(window.days).sort();
  if (keys.length === 0) return null;
  const before = keys.filter((k) => k < today);
  return before.length ? before[before.length - 1] : keys[0];
}

export function CatechismClient({ window }: { window: DailyWindow }) {
  const { t, locale } = useTranslate();
  const today = useToday();
  const [reckoning] = useCalendarStyleDefault();

  const todayKey = today ? isoFromDate(today) : null;
  const key = todayKey ? keyFor(window, todayKey) : null;
  const questions = useMemo<ClientQuestion[]>(
    () => (key ? questionsFor(window, key, reckoning) : []),
    [window, key, reckoning],
  );

  return (
    <section className={`${SECTION} bg-night min-h-[calc(100dvh-72px)]`}>
      <article className="mx-auto w-full max-w-[640px]">
        <p className="font-sans text-eyebrow uppercase tracking-[2px] text-gold/80">
          {t("catechism.eyebrow")}
        </p>
        {today ? (
          <h1 className="mt-2 font-serif text-title md:text-heading font-bold leading-[1.15] text-paper">
            {dateLabel(today, locale)}
          </h1>
        ) : (
          <Skeleton className="mt-3 h-8 w-56" weight="strong" />
        )}

        {!today || !key ? (
          today ? (
            <Empty />
          ) : (
            <div role="status" className="mt-8 flex flex-col gap-3" aria-label={t("catechism.loading")}>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-12 w-full" rounded="rounded-2xl" weight="faint" />
              <Skeleton className="h-12 w-full" rounded="rounded-2xl" weight="faint" />
            </div>
          )
        ) : questions.length === 0 ? (
          <Empty />
        ) : (
          <Run key={`${key}:${reckoning}`} date={key} reckoning={reckoning} questions={questions} />
        )}
      </article>
    </section>
  );
}

function Empty() {
  const { t } = useTranslate();
  return (
    <p className="mt-8 font-serif italic text-body leading-[1.7] text-paper/55 max-w-[52ch]">
      {t("catechism.empty")}
    </p>
  );
}

/**
 * One day's run. Keyed by (date, reckoning) in the parent so a reckoning
 * switch mid-way starts that reckoning's own five from the top.
 */
function Run({
  date,
  reckoning,
  questions,
}: {
  date: string;
  reckoning: Reckoning;
  questions: ClientQuestion[];
}) {
  const { t } = useTranslate();
  const total = questions.length;
  const [stage, setStage] = useState<Stage>(() => {
    const existing = readAttempt(date, reckoning);
    return existing
      ? { kind: "done", attempt: existing }
      : { kind: "answering", index: 0, answers: [], given: null };
  });
  const nextRef = useRef<HTMLButtonElement | null>(null);
  const started = useRef(false);

  // After a reveal, move focus to the one control that continues, so a
  // keyboard reader is not left on an option that no longer responds.
  useEffect(() => {
    if (stage.kind === "answering" && stage.given !== null) nextRef.current?.focus();
  }, [stage]);

  const finish = useCallback(
    (answers: AttemptAnswer[]) => {
      const score = answers.filter((a) => a.correct).length;
      const attempt: LocalAttempt = {
        id: newAttemptId(),
        date,
        reckoning,
        answers,
        score,
        total,
        completed_at: new Date().toISOString(),
        synced: false,
      };
      writeAttempt(attempt);
      setStage({ kind: "done", attempt });
      trackCatechism({ name: "catechism_completed", props: { score, total, reckoning } });

      const signedIn = !!readLocalSessionUser();
      if (signedIn) {
        void apiFetch("/api/catechism/attempt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: attempt.id,
            date,
            reckoning,
            answers: answers.map((a) => ({ question_id: a.question_id, answer: a.answer })),
          }),
        })
          .then((r) => {
            // 200 recorded it; 409 means it was recorded already. Either way
            // the server holds it. Anything else leaves the device copy as is.
            if (r.status === 200 || r.status === 409) markSynced(date, reckoning);
          })
          .catch(() => {});
      } else {
        void apiFetch("/api/catechism/stats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question_ids: answers.map((a) => a.question_id),
            correct_ids: answers.filter((a) => a.correct).map((a) => a.question_id),
          }),
          keepalive: true,
        }).catch(() => {});
      }
    },
    [date, reckoning, total],
  );

  if (stage.kind === "done") {
    return (
      <div className="mt-8">
        <CompletionScreen
          questions={questions}
          answers={stage.attempt.answers}
          score={stage.attempt.score}
          total={stage.attempt.total || total}
        />
      </div>
    );
  }

  const question = questions[stage.index];
  const revealed = stage.given !== null;
  const current = stage.answers[stage.index];

  return (
    <div className="mt-8">
      <p className="sr-only">{t("catechism.lede")}</p>
      <div key={question.id}>
        <QuestionCard
          question={question}
          index={stage.index}
          total={total}
          given={stage.given}
          revealed={revealed}
          onAnswer={(answer) => {
            if (revealed) return;
            if (!started.current) {
              started.current = true;
              trackCatechism({ name: "catechism_started", props: { reckoning } });
            }
            const correct = isCorrect(question, answer);
            setStage({
              kind: "answering",
              index: stage.index,
              given: answer,
              answers: [...stage.answers, { question_id: question.id, answer, correct }],
            });
          }}
        />
        <AnswerPanel
          question={question}
          revealed={revealed}
          correct={current?.correct === true}
          isLast={stage.index === total - 1}
          nextRef={nextRef}
          onNext={() => {
            if (stage.index === total - 1) finish(stage.answers);
            else setStage({ kind: "answering", index: stage.index + 1, answers: stage.answers, given: null });
          }}
        />
      </div>
    </div>
  );
}
