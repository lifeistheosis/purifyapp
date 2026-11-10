"use client";

import { useEffect, useState } from "react";

import type { LocaleCode } from "@/lib/i18n/locales";

import { useTranslate } from "./MessagesProvider";

/** Where each language's own file of a text is: loaded on the device, one language per file. */
export type Loaders<T> = Partial<Record<LocaleCode, () => Promise<T>>>;

/**
 * A long text the app has in more languages than English (a lesson, a prayer
 * rule), in the reader's language (1.9, the arbiter's yes to the German texts
 * in the apps). The page writes the English, as it always has; another
 * language is its own file, loaded on the device when the reader's language
 * has one, never written into the page (Admin's way for the legal sheet,
 * components/legal/LegalSheet.tsx: a static import, or a page carrying every
 * language, puts all of them in every reader's download).
 *
 * Why: in the apps a page is written once, when the app is built, and the
 * server there knows no reader (lib/i18n/server.ts), so a page that chose its
 * words on the server was English for every reader, the German written and
 * never shown.
 *
 * `lang` is the language of what is shown. While another language is on its
 * way (a file inside the app: a moment) the English stays, marked as coming,
 * so a page does not first say "not in your language" and then take it back.
 */
export function useInReadersLanguage<T>(english: T, loaders: Loaders<T>, key: string): { value: T; lang: LocaleCode; coming: boolean } {
  const { locale } = useTranslate();
  // `loaders` must keep its identity between draws: a module's constant, or memoized.
  const load = locale === "en" ? undefined : loaders[locale];
  const [loaded, setLoaded] = useState<{ key: string; lang: LocaleCode; value: T } | null>(null);
  const wanted = load ? locale : null;

  useEffect(() => {
    if (!wanted || !load) return;
    let live = true;
    load().then(
      (value) => {
        if (live) setLoaded({ key, lang: wanted, value });
      },
      () => {
        // A file that cannot be read leaves the English, as before 1.9.
      },
    );
    return () => {
      live = false;
    };
  }, [wanted, key, load]);

  if (wanted && loaded && loaded.key === key && loaded.lang === wanted) return { value: loaded.value, lang: wanted, coming: false };
  return { value: english, lang: "en", coming: Boolean(wanted) };
}
