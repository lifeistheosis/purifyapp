"use client";

import Link from "next/link";
import { useMemo } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";
import { progressFor, type CollectionIndexEntry } from "@/lib/catechism/collections";
import type { AttemptAnswer, ClientQuestion } from "@/lib/catechism/types";
import { useCollectionProgress } from "@/lib/catechism/useCollectionProgress";

/** A stable empty index, so the memo below does not re-run for a page that passes none. */
const NO_COLLECTIONS: CollectionIndexEntry[] = [];

/**
 * The end of the day's five: one mark per question settling in, one line
 * with the count, and the five sources to read on. That is all. No timer
 * ran, nothing is shared, nothing is owed tomorrow.
 *
 * The marks use `.onboard-mark-in` at 70ms steps (the welcome mark's own
 * entrance); reduced motion shows them at rest.
 *
 * When a collection was touched by one of the five, one quiet line per
 * collection follows the count: where it stands, or that it is complete.
 * `.rise-in`, the panel's own entrance; nothing else moves.
 */
export function CompletionScreen({
  questions,
  answers,
  score,
  total,
  collections = NO_COLLECTIONS,
}: {
  questions: ClientQuestion[];
  answers: AttemptAnswer[];
  score: number;
  total: number;
  collections?: CollectionIndexEntry[];
}) {
  const { t } = useTranslate();
  const byId = new Map(answers.map((a) => [a.question_id, a]));
  // Memoised: CollectionLines hands this to a hook that re-reads the store
  // whenever the list changes identity.
  const touched = useMemo(() => {
    const shown = new Set(questions.map((q) => q.id));
    return collections.filter((c) => c.question_ids.some((id) => shown.has(id)));
  }, [collections, questions]);

  return (
    <div>
      <ol className="flex flex-wrap gap-2.5" aria-label={t("catechism.score", { score, total })}>
        {questions.map((q, i) => {
          const right = byId.get(q.id)?.correct === true;
          return (
            <li
              key={q.id}
              className="onboard-mark-in"
              style={{ animationDelay: `${i * 70}ms` }}
              aria-label={t(right ? "catechism.markCorrect" : "catechism.markIncorrect", { n: i + 1 })}
            >
              <span
                aria-hidden
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full font-sans text-[14px] font-semibold",
                  right ? "bg-gold text-night" : "border border-paper/25 text-paper/55",
                )}
              >
                {right ? "✓" : i + 1}
              </span>
            </li>
          );
        })}
      </ol>

      <h2 className="mt-6 font-serif text-title font-bold leading-[1.2] text-paper">
        {t("catechism.doneTitle")}
      </h2>
      <p className="mt-2 font-serif text-body text-paper/75">
        {t("catechism.score", { score, total })}
      </p>

      {touched.length > 0 && <CollectionLines collections={touched} />}

      <p className="mt-8 font-sans text-eyebrow uppercase tracking-[2px] text-paper/55">
        {t("catechism.readSources")}
      </p>
      <ol className="mt-3 divide-y divide-paper/[0.08] border-t border-paper/[0.08]">
        {questions.map((q, i) => (
          <li key={q.id} className="py-3.5">
            <p className="font-serif text-detail leading-[1.5] text-paper/70">
              <span className="tabular-nums text-paper/45">{i + 1}. </span>
              {q.prompt}
            </p>
            <Link
              href={q.source.href}
              className="mt-1 inline-block font-sans text-caption text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 rounded-sm"
            >
              {q.source.label}
            </Link>
          </li>
        ))}
      </ol>

      <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
        <Link
          href="/"
          className="inline-block font-sans text-caption text-paper/55 hover:text-paper transition-colors [transition-duration:var(--duration-fast)] motion-reduce:transition-none"
        >
          {t("catechism.backToToday")}
        </Link>
        {collections.length > 0 && (
          <Link
            href="/catechism/collections"
            className="inline-block font-sans text-caption text-paper/55 hover:text-paper transition-colors [transition-duration:var(--duration-fast)] motion-reduce:transition-none"
          >
            {t("catechism.collections.title")}
          </Link>
        )}
      </div>
    </div>
  );
}

/** Where each touched collection stands after this attempt. */
function CollectionLines({ collections }: { collections: CollectionIndexEntry[] }) {
  const { t, tn } = useTranslate();
  const progress = useCollectionProgress(collections);
  return (
    <ul className="rise-in mt-4 flex flex-col gap-1" aria-label={t("catechism.collections.title")}>
      {collections.map((c) => {
        const p = progress[c.slug];
        const state = progressFor(p?.ids ?? [], c.question_ids);
        const complete = !!p?.completed_at || state.complete;
        return (
          <li key={c.slug} className="font-serif text-detail text-paper/60">
            {complete
              ? t("catechism.collections.completedLine", { name: c.name })
              : tn("catechism.collections.progressLine", state.total, { name: c.name, done: state.done })}
          </li>
        );
      })}
    </ul>
  );
}
