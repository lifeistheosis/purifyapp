"use client";

import { createContext, useContext, type ComponentType, type ReactNode } from "react";

import { useTranslate } from "./MessagesProvider";
import { useInReadersLanguage, type Loaders } from "./useInReadersLanguage";
import { textDir } from "@/lib/i18n/textDir";

/**
 * A page of words in the reader's language in the apps (1.9, the reader's
 * language sweep, parts 3 and 4: About, Privacy, the FAQ, Support and What's
 * New, the Updates chat's share of Updates 2's split of 2026-11-10).
 *
 * In the apps a page is written once, when the app is built, and the server
 * there knows no reader (lib/i18n/server.ts), so a page that chose its
 * German on the server was English for every reader. Now the page writes the
 * English, as it always has, and each other language it has is its own file,
 * loaded on the device when the reader's language is one of them, never
 * written into the page or its props (components/i18n/useInReadersLanguage.ts).
 */

/** Whether a page's own language is still on its way: the English stands meanwhile, and says nothing about it. */
const Coming = createContext(false);

/** Read by TranslationDisclaimer, so "not in your language" never shows and then goes. */
export function usePageLanguageComing(): boolean {
  return useContext(Coming);
}

/**
 * A whole page with another language written as a page of its own (About's
 * German, the FAQ's): the English is `children`, drawn on the server; the
 * other is a component in its own file, `loaders`, drawn on the device with
 * `props` once it has come.
 *
 * The page in its own file is the reader's language through and through, so
 * it says so as a whole. The English page does not: most of its words are the
 * catalog's, which are the reader's own (About and the FAQ are in all 21
 * languages that way), so it says nothing as a whole, and each line of it
 * that is English says so itself, with its direction (build 90 note 4: a
 * whole-page lang="en" set an Arabic reader's own words left to right).
 */
export function PageInReadersLanguage<P extends object>({
  pageKey,
  loaders,
  props,
  children,
}: {
  pageKey: string;
  loaders: Loaders<ComponentType<P>>;
  props: P;
  children: ReactNode;
}) {
  const pages: Loaders<ComponentType<P> | null> = loaders;
  const { value: Page, lang, coming } = useInReadersLanguage<ComponentType<P> | null>(null, pages, pageKey);
  if (Page) {
    return (
      <div lang={lang} dir={textDir(lang)} className="contents">
        <Page {...props} />
      </div>
    );
  }
  return <Coming.Provider value={coming}>{children}</Coming.Provider>;
}

/**
 * The few words of a page that has them in another language (What's New's,
 * Support's): `words` is that page's loaded file, or null while it is English
 * (for the reader, or while the file is on its way). An island draws its
 * word, or the English it holds.
 */
export function WordOr({ word, lang, children }: { word: string | null | undefined; lang: string; children: ReactNode }) {
  if (word) return <span lang={lang} dir={textDir(lang)}>{word}</span>;
  return <>{children}</>;
}

/** Whether the reader's language is German: the German pages' blocks that are written in the catalogs' German keys. */
export function useReaderLanguage(): string {
  return useTranslate().locale;
}
