"use client";

// Which downloaded Bible the reader reads in (1.9; ./catalog.ts).
//
// A reader's setting, as the reading mode is: kept on the device, and the
// same for every chapter until the reader picks another. It is not in the
// address (the ?v= of a licensed translation): the apps' pages are files
// made before any reader chose anything, so a chapter learns the choice here,
// on the device, at once and with no request. Picking the English, or a
// licensed translation, clears it (components/bible/TranslationList.tsx).
//
// In the apps a Bible can be chosen only once it is on the phone
// (./store.ts); taking it off the phone clears the choice with it.

import { useSyncExternalStore } from "react";

import { downloadableBible, type BibleId } from "./catalog";

const KEY = "purify.bible.download";
const EVENT = "purify:bible-choice";

function read(): BibleId | null {
  if (typeof window === "undefined") return null;
  try {
    return downloadableBible(window.localStorage.getItem(KEY))?.id ?? null;
  } catch {
    return null;
  }
}

/** The downloaded Bible the reader reads in, or null for the English. */
export function readBibleChoice(): BibleId | null {
  return read();
}

/** Read in `id` from now on, or in the English (null). */
export function writeBibleChoice(id: BibleId | null): void {
  if (typeof window === "undefined") return;
  try {
    if (id) window.localStorage.setItem(KEY, id);
    else window.localStorage.removeItem(KEY);
  } catch {
    /* a private or full store: the choice lasts as long as this page */
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(changed: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) changed();
  };
  window.addEventListener(EVENT, changed);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, changed);
    window.removeEventListener("storage", onStorage);
  };
}

/** The chosen Bible, kept in step with the device. Null on the server and before the page is live. */
export function useBibleChoice(): BibleId | null {
  return useSyncExternalStore(subscribe, read, () => null);
}
