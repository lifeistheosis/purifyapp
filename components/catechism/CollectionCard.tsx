"use client";

import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { progressFor, type CollectionIndexEntry } from "@/lib/catechism/collections";
import type { LocalCollectionProgress } from "@/lib/catechism/progressLocal";

import { ThemeRow } from "./ThemeRow";

/**
 * One collection in the list: its name, what it covers, where the reader
 * stands, and, once it is complete, the mark and the one sentence about
 * its palette.
 *
 * The bar is a hairline of paper under a fill of gold; its width moves on
 * --duration-base with the house easing and not at all under reduced
 * motion. Nothing else animates. No percentage, no badge, no share.
 */
export function CollectionCard({
  collection,
  progress,
}: {
  collection: CollectionIndexEntry;
  progress: LocalCollectionProgress | undefined;
}) {
  const { t, tn } = useTranslate();
  const state = progressFor(progress?.ids ?? [], collection.question_ids);
  const complete = !!progress?.completed_at || state.complete;
  const fill = state.total > 0 ? Math.round((state.done / state.total) * 100) : 0;

  return (
    <li className="py-6 first:pt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-serif text-title-sm font-bold leading-[1.25] text-paper">
          {collection.name}
        </h2>
        {complete && (
          <p className="font-sans text-eyebrow uppercase tracking-[2px] text-gold/85">
            {t("catechism.collections.completedMark")}
          </p>
        )}
      </div>
      <p className="mt-2 font-serif text-body leading-[1.65] text-paper/70 max-w-[60ch]">
        {collection.description}
      </p>

      {state.total === 0 ? (
        <p className="mt-4 font-serif italic text-detail text-paper/50">
          {t("catechism.collections.noQuestions")}
        </p>
      ) : (
        <>
          <p className="mt-4 font-sans text-caption text-paper/60 tabular-nums">
            {tn("catechism.collections.marks", state.total, { done: state.done })}
          </p>
          <div
            className="mt-2 h-px w-full max-w-[320px] bg-paper/15"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={state.total}
            aria-valuenow={state.done}
            aria-label={collection.name}
          >
            <div
              className="h-px bg-gold transition-[width] [transition-duration:var(--duration-base)] [transition-timing-function:var(--ease-house)] motion-reduce:transition-none"
              style={{ width: `${fill}%` }}
            />
          </div>
          <Link
            href={`/catechism/collections/${collection.slug}`}
            className="mt-4 inline-block font-sans text-caption text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 rounded-sm"
          >
            {t("catechism.collections.practice")}
          </Link>
        </>
      )}

      {complete && <ThemeRow themeId={collection.theme_id} />}
    </li>
  );
}
