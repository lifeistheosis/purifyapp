"use client";

import { useCallback, useMemo } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { localBookNames } from "@/lib/bible/books";
import { READING_KIND_KEY, verseSpan } from "@/lib/journal/churchDay";
import type { JournalSource } from "@/lib/journal/entries";
import { dayLabel, getPlan } from "@/lib/plans/plans";

/**
 * What a page is about, in the reader's language: "John 3:16", "Epistle ·
 * Ephesians 2:14-22", a reading plan's day. One way to say it for the
 * journal's list and for the page being written (components/journal/
 * JournalClient.tsx, JournalWritePage.tsx).
 */
export function useSourceLabel(): { sourceLabel: (s: JournalSource) => string; bookName: (slug: string) => string } {
  const { t } = useTranslate();
  const books = useMemo(() => localBookNames(t), [t]);
  const bookName = useCallback((slug: string) => books[slug] ?? t(`bible.books.${slug}`), [books, t]);
  const sourceLabel = useCallback(
    (s: JournalSource) => {
      if (s.type === "verse") return `${bookName(s.book)} ${s.chapter}:${s.verse}`;
      if (s.type === "chapter") return `${bookName(s.book)} ${s.chapter}`;
      if (s.type === "reading") return `${t(READING_KIND_KEY[s.kind])} · ${bookName(s.book)} ${s.chapter}:${verseSpan(s.from, s.to)}`;
      const plan = getPlan(s.planId);
      const day = plan?.days[s.day];
      return day ? t("plans.continueDay", { day: s.day + 1, reading: dayLabel(day, bookName) }) : s.label;
    },
    [bookName, t],
  );
  return { sourceLabel, bookName };
}
