"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Skeleton } from "@/components/ui/Skeleton";
import { progressFor, type CollectionIndexEntry } from "@/lib/catechism/collections";
import { isCorrect } from "@/lib/catechism/grade";
import { addCorrectIds, readCollectionProgress } from "@/lib/catechism/progressLocal";
import { postCollectionProgress } from "@/lib/catechism/progressSync";
import type { Answer, AttemptAnswer, ClientQuestion } from "@/lib/catechism/types";
import { useCollectionProgress } from "@/lib/catechism/useCollectionProgress";

import { AnswerPanel } from "./AnswerPanel";
import { QuestionCard } from "./QuestionCard";
import { ThemeRow } from "./ThemeRow";

/**
 * Practice: a collection's questions, untimed, free, graded the same way
 * as the day's five and advancing the same set.
 *
 * The page (a server shell) hands this the collection and every published
 * question carrying its tag. After mount the questions not yet in the
 * reader's set come first, then the rest, so a return visit starts where
 * the work is. Each right answer is unioned into the set on the device the
 * moment it lands and posted when signed in; leaving half way loses
 * nothing. No attempt row is written: practice is not a day.
 *
 * No timer, no score to share, no "missed", no expiry.
 */

const SECTION = "px-5 md:px-8 py-12 md:py-20";

type Stage =
  | { kind: "answering"; index: number; answers: AttemptAnswer[]; given: Answer | null }
  | { kind: "done"; answers: AttemptAnswer[] };

function ordered(questions: ClientQuestion[], slug: string): ClientQuestion[] {
  const have = new Set(readCollectionProgress()[slug]?.ids ?? []);
  const fresh = questions.filter((q) => !have.has(q.id));
  const known = questions.filter((q) => have.has(q.id));
  return [...fresh, ...known];
}

export function PracticeClient({
  collection,
  questions,
}: {
  collection: CollectionIndexEntry;
  questions: ClientQuestion[];
}) {
  const { t, tn } = useTranslate();
  // The order depends on the device store, which the server shell cannot
  // read, so the run mounts a frame after hydration with the store in hand.
  const [round, setRound] = useState(0);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  // Memoised: the hook re-reads the store whenever the index changes identity.
  const index = useMemo(() => [collection], [collection]);
  const progress = useCollectionProgress(index);
  const p = progress[collection.slug];
  const state = progressFor(p?.ids ?? [], collection.question_ids);

  return (
    <section className={`${SECTION} bg-night min-h-[calc(100dvh-72px)]`}>
      <article className="mx-auto w-full max-w-[640px]">
        <p className="font-sans text-eyebrow uppercase tracking-[2px] text-gold/80">
          {t("catechism.collections.practiceEyebrow")}
        </p>
        <h1 className="mt-2 font-serif text-title md:text-heading font-bold leading-[1.15] text-paper">
          {collection.name}
        </h1>
        {state.total > 0 && (
          <p className="mt-2 font-sans text-caption text-paper/60 tabular-nums">
            {tn("catechism.collections.marks", state.total, { done: state.done })}
          </p>
        )}

        {questions.length === 0 ? (
          <p className="mt-8 font-serif italic text-body leading-[1.7] text-paper/55 max-w-[52ch]">
            {t("catechism.collections.noQuestions")}
          </p>
        ) : !mounted ? (
          <div role="status" className="mt-8 flex flex-col gap-3" aria-label={t("catechism.collections.loading")}>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-12 w-full" rounded="rounded-2xl" weight="faint" />
            <Skeleton className="h-12 w-full" rounded="rounded-2xl" weight="faint" />
          </div>
        ) : (
          <Run
            key={round}
            collection={collection}
            questions={ordered(questions, collection.slug)}
            complete={!!p?.completed_at || state.complete}
            onAgain={() => setRound((r) => r + 1)}
          />
        )}
      </article>
    </section>
  );
}

function Run({
  collection,
  questions,
  complete,
  onAgain,
}: {
  collection: CollectionIndexEntry;
  questions: ClientQuestion[];
  complete: boolean;
  onAgain: () => void;
}) {
  const { t, tn } = useTranslate();
  const total = questions.length;
  const [stage, setStage] = useState<Stage>({ kind: "answering", index: 0, answers: [], given: null });
  const nextRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (stage.kind === "answering" && stage.given !== null) nextRef.current?.focus();
  }, [stage]);

  const record = useCallback(
    (questionId: string) => {
      addCorrectIds(collection.slug, [questionId], collection.question_ids);
      postCollectionProgress([{ slug: collection.slug, question_ids: [questionId] }]);
    },
    [collection.slug, collection.question_ids],
  );

  if (stage.kind === "done") {
    const score = stage.answers.filter((a) => a.correct).length;
    return (
      <div className="mt-8 rise-in">
        <h2 className="font-serif text-title font-bold leading-[1.2] text-paper">
          {t("catechism.doneTitle")}
        </h2>
        <p className="mt-2 font-serif text-body text-paper/75">
          {tn("catechism.collections.practiceDone", total, { score })}
        </p>
        {complete && (
          <>
            <p className="mt-4 font-sans text-eyebrow uppercase tracking-[2px] text-gold/85">
              {t("catechism.collections.completedMark")}
            </p>
            <ThemeRow themeId={collection.theme_id} />
          </>
        )}
        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
          <button
            type="button"
            onClick={onAgain}
            className="font-sans text-caption text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 rounded-sm"
          >
            {t("catechism.collections.again")}
          </button>
          <Link
            href="/catechism/collections"
            className="font-sans text-caption text-paper/55 hover:text-paper transition-colors [transition-duration:var(--duration-fast)] motion-reduce:transition-none"
          >
            {t("catechism.collections.back")}
          </Link>
        </div>
      </div>
    );
  }

  const question = questions[stage.index];
  const revealed = stage.given !== null;
  const current = stage.answers[stage.index];

  return (
    <div className="mt-8">
      <p className="sr-only">{t("catechism.collections.practiceLede")}</p>
      <div key={question.id}>
        <QuestionCard
          question={question}
          index={stage.index}
          total={total}
          given={stage.given}
          revealed={revealed}
          onAnswer={(answer) => {
            if (revealed) return;
            const correct = isCorrect(question, answer);
            if (correct) record(question.id);
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
            if (stage.index === total - 1) setStage({ kind: "done", answers: stage.answers });
            else setStage({ kind: "answering", index: stage.index + 1, answers: stage.answers, given: null });
          }}
        />
      </div>
    </div>
  );
}
