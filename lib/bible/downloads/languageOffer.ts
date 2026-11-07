"use client";

// The offer to read the app in a downloaded Bible's language (1.9). The
// owner, 2026-11-06: "if they pick a Romanian Bible ... a pop-up ... do you
// want to change the translation of the app to Romanian also? And also add a
// button to click never show again."
//
// Made when a reader picks a Bible in another language than the app's
// (components/bible/TranslationList.tsx), and shown by
// components/bible/BibleLanguageOffer.tsx: Switch, Not now, or Never ask
// again, which is kept on the device for every Bible after.

import type { BibleId, DownloadableBible } from "./catalog";

const NEVER_KEY = "purify:bibles.languageOffer";
const EVENT = "purify:bible-language-offer";

/** Whether the reader said never to ask. */
export function languageOfferRefused(): boolean {
  try {
    return window.localStorage.getItem(NEVER_KEY) === "never";
  } catch {
    return false;
  }
}

/** Ask, if the Bible's language is not the app's and the reader has not said never. */
export function offerLanguageFor(bible: DownloadableBible, appLocale: string): boolean {
  if (typeof window === "undefined" || bible.language === appLocale || languageOfferRefused()) return false;
  window.dispatchEvent(new CustomEvent<BibleId>(EVENT, { detail: bible.id }));
  return true;
}

/** Never ask again, for any Bible. */
export function refuseLanguageOffer(): void {
  try {
    window.localStorage.setItem(NEVER_KEY, "never");
  } catch {
    /* a private store: it is asked again next time, which is the lesser harm */
  }
}

/** Listen for an offer to make. */
export function onLanguageOffer(offer: (id: BibleId) => void): () => void {
  const listener = (e: Event) => offer((e as CustomEvent<BibleId>).detail);
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
