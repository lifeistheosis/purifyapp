"use client";

// Which Bible a chapter is shown in, and its words for the page (1.9;
// ./catalog.ts). The chapter's screen asks here (components/bible/ChapterScreen.tsx):
// the reader's chosen Bible when it has the book (and, in the apps, is on
// the phone), and the English otherwise.

import { useEffect, useState } from "react";

import { useIsNative } from "@/lib/platform/native";

import { downloadableBible, hasBook, type DownloadableBible } from "./catalog";
import { useBibleChoice } from "./choice";
import { biblePage, type BiblePage } from "./page";
import { readBibleBook, useBibles } from "./store";

export type ShownBible = {
  /** The Bible the chapter is shown in, or null for the English. */
  shown: DownloadableBible | null;
  /** The chosen Bible, when it has no such book: the chapter is in English, and says why. */
  lacking: DownloadableBible | null;
};

const ENGLISH: ShownBible = { shown: null, lacking: null };

/** The Bible a chapter of `book` is shown in. */
export function useShownBible(book: string): ShownBible {
  const choice = useBibleChoice();
  const { saved } = useBibles();
  const native = useIsNative();
  const bible = downloadableBible(choice);
  if (!bible || (native && !saved[bible.id])) return ENGLISH;
  return hasBook(bible, book) ? { shown: bible, lacking: null } : { shown: null, lacking: bible };
}

export type BibleText = { state: "loading" } | { state: "ready"; page: BiblePage } | { state: "failed" };

/**
 * A chapter's words in a downloaded Bible: loading while its book is read
 * (from the phone, or the website on the web), then the page, or failed when
 * the book cannot be had (the page then shows the English and says so).
 * Null when no Bible is shown.
 */
export function useBibleText(bible: DownloadableBible | null, book: string, chapter: number, appChapters: number): BibleText | null {
  const key = bible ? `${bible.id}/${book}/${chapter}` : null;
  const [read, setRead] = useState<{ key: string; text: BibleText } | null>(null);
  useEffect(() => {
    if (!bible || !key) return;
    let live = true;
    void readBibleBook(bible.id, book).then((file) => {
      if (live) setRead({ key, text: file ? { state: "ready", page: biblePage(file, chapter, appChapters) } : { state: "failed" } });
    });
    return () => {
      live = false;
    };
  }, [bible, key, book, chapter, appChapters]);
  if (!bible) return null;
  return read?.key === key ? read.text : { state: "loading" };
}
