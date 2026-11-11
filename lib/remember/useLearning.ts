"use client";

import { useMemo, useSyncExternalStore } from "react";

import { localBookNames, referenceIn } from "@/lib/bible/books";
import { useBookmarks } from "@/lib/bookmarks";

import type { LearnItem } from "./items";
import { REMEMBER_EVENT, emptyRememberStore, learnablesOf, rememberSnapshot, savedVersesOf, type RememberStore } from "./schedule";

/**
 * What a reader is learning by heart, as a component reads it (build 93 note
 * 11): everything on the list, and the one they chose. It follows the store,
 * so a choice made in the sheet is on You's card and Today's at once, and one
 * made on another device is here when the sync puts it in place.
 */

function subscribe(cb: () => void): () => void {
  window.addEventListener(REMEMBER_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(REMEMBER_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** The remember store, live. Empty on the server and until the page is drawn on the device. */
export function useRememberStore(): RememberStore {
  return useSyncExternalStore(subscribe, rememberSnapshot, emptyRememberStore);
}

export type Learning = {
  store: RememberStore;
  /** Everything being learned: the saved verses, then what was added in the sheet. */
  list: LearnItem[];
  /** The one the reader chose, while it is still on the list. */
  chosen: LearnItem | null;
  /** The keys of the verses that are saved (bookmarked), which the card calls "a verse you saved". */
  saved: ReadonlySet<string>;
};

export function useLearning(): Learning {
  const store = useRememberStore();
  const { bookmarks } = useBookmarks();
  return useMemo(() => {
    const verses = savedVersesOf(bookmarks);
    const list = learnablesOf(verses, store.items);
    const key = store.chosen?.key;
    return { store, list, chosen: (key && list.find((v) => v.key === key)) || null, saved: new Set(verses.map((v) => v.key)) };
  }, [store, bookmarks]);
}

type Translate = (key: string, vars?: Record<string, string | number>) => string;

/**
 * The name an item goes by where a verse has its reference: the reference,
 * its book in the reader's language; whose words a quote is; and for words
 * the reader put in themselves, "Added by you". Not "your own words" there
 * (the arbiter, 2026-11-11): a line "Who said it" could not find is
 * someone's words, not the reader's, and "Added by you" is true of both and
 * claims no author.
 */
export function learnName(item: LearnItem, t: Translate, books: Readonly<Record<string, string>> = localBookNames(t)): string {
  if (item.kind === "verse") return referenceIn(item.label, item.book, books);
  return item.kind === "quote" ? item.by : t("remember.addedByYou");
}
