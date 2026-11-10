"use client";

import { useCallback, useMemo } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { localBookNames } from "@/lib/bible/books";

/** A book's name as the reader's language has it, for a starter's reference ("John 1:1-18"). */
export function useBookName(): (slug: string) => string {
  const { t } = useTranslate();
  const books = useMemo(() => localBookNames(t), [t]);
  return useCallback((slug: string) => books[slug] ?? t(`bible.books.${slug}`), [books, t]);
}
