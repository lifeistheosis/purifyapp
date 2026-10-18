"use client";

// This week, in one quiet line under the streak (1.8): the verses a reader
// kept and the notes they wrote in the seven days the streak's flames show
// above it. Only what was done is said, and nothing at all in a week with
// nothing to say: no count of what was not done, the rule this screen has
// always kept.

import { useMemo, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";
import type { JournalItem } from "@/lib/journal/feed";
import { inFilter, type SavedItem } from "@/lib/saved/feed";
import { countSince, weekStart } from "@/lib/you/you";

export function WeekLine({ feed, journal, className }: { feed: readonly SavedItem[]; journal: readonly JournalItem[]; className?: string }) {
  const { t, tn } = useTranslate();
  const [from] = useState(() => weekStart(new Date()));
  const counts = useMemo(
    () => ({
      verses: countSince(
        feed.filter((i) => inFilter(i, "verses")).map((i) => i.at),
        from,
      ),
      notes: countSince(
        journal.map((j) => j.at),
        from,
      ),
    }),
    [feed, journal, from],
  );

  const parts = [
    counts.verses > 0 ? tn("you.week.verses", counts.verses) : null,
    counts.notes > 0 ? tn("you.week.notes", counts.notes) : null,
  ].filter(Boolean);
  if (parts.length === 0) return null;
  return (
    <p data-you-week="" className={cn("px-1 font-sans text-caption leading-relaxed text-paper/55", className)}>
      <span className="font-semibold text-paper/70">{t("you.week.title")}</span>
      {parts.map((p) => (
        <span key={p}>{` · ${p}`}</span>
      ))}
    </p>
  );
}
