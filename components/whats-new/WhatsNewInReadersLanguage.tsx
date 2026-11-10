"use client";

import type { ReactNode } from "react";

import { WordOr } from "@/components/i18n/PageInReadersLanguage";
import { TranslationDisclaimer } from "@/components/i18n/TranslationDisclaimer";
import { useInReadersLanguage, type Loaders } from "@/components/i18n/useInReadersLanguage";
import { textDir } from "@/lib/i18n/textDir";

/**
 * What's New's own words in the reader's language (1.9, the reader's
 * language in the apps). The page writes the English; the few words it has
 * in German are their own file, data/pages/whats-new.de.json, loaded on the
 * device when the reader's language is German, never written into the page
 * or its props. Until 1.9 the page chose them on the server, which in the
 * apps knows no reader. The release notes themselves are the notes'
 * (lib/whatsNew/notes.ts).
 */
export type WhatsNewWords = {
  eyebrow: string;
  closing: string;
  signature: string;
  releaseNotes: string;
  grouped: string;
  update: string;
  updates: string;
};

export const WHATS_NEW_WORDS: Loaders<WhatsNewWords | null> = {
  de: () => import("@/data/pages/whats-new.de.json").then((m) => m.default as WhatsNewWords),
};

function useWords() {
  return useInReadersLanguage<WhatsNewWords | null>(null, WHATS_NEW_WORDS, "whats-new");
}

/** One of the page's words: the reader's, once come, or the English it holds. */
export function WhatsNewWord({ k, children }: { k: Exclude<keyof WhatsNewWords, "update" | "updates">; children: ReactNode }) {
  const { value, lang } = useWords();
  return (
    <WordOr word={value?.[k]} lang={lang}>
      {children}
    </WordOr>
  );
}

/** "3 updates", in the reader's language where the page has it. */
export function WhatsNewCount({ n }: { n: number }) {
  const { value, lang } = useWords();
  if (value) return <span lang={lang} dir={textDir(lang)}>{`${n} ${n === 1 ? value.update : value.updates}`}</span>;
  return <span lang="en" dir="ltr">{`${n} ${n === 1 ? "update" : "updates"}`}</span>;
}

/**
 * The welcome under the weekly note: the German page's own (`german`, written
 * in the catalogs' German keys) for a German reader, the English otherwise.
 */
export function WhatsNewWelcome({ german, children }: { german: ReactNode; children: ReactNode }) {
  const { value } = useWords();
  return <>{value ? german : children}</>;
}

/** "The body of this page is in English": not for a reader whose own words have come, nor while they come. */
export function WhatsNewDisclaimer() {
  const { value, coming } = useWords();
  if (value || coming) return null;
  return <TranslationDisclaimer />;
}
