"use client";

import type { ComponentProps, ReactNode } from "react";

import { StillInEnglish } from "@/components/i18n/StillInEnglish";
import { useInReadersLanguage, type Loaders } from "@/components/i18n/useInReadersLanguage";
import { editionOf } from "@/lib/councils/edition";
import type { CouncilDocumentContent } from "@/lib/councils/load";

import { CouncilReader } from "./CouncilReader";
import { CouncilSections } from "./CouncilSections";

/**
 * Every council document written in a language besides English, each its own
 * file, loaded on the device when the reader's language is one of them (1.9,
 * components/i18n/useInReadersLanguage.ts). Keyed "<council>/<document>".
 * lib/i18n/__tests__/serverLocale.test.ts holds every file under
 * data/councils/<council>/i18n/<lang>/ to a row here, and every row to its file.
 */
export const COUNCIL_DOCUMENT_FILES: Record<string, Loaders<CouncilDocumentContent>> = {
  "first-nicaea/the-symbol-of-the-faith": {
    de: () => import("@/data/councils/first-nicaea/i18n/de/the-symbol-of-the-faith.json").then((m) => m.default as CouncilDocumentContent),
  },
};

const NONE: Loaders<CouncilDocumentContent> = {};

/** The reader's own language's text of this document, once loaded; null while the page's English stands. */
function useOwn(docKey: string) {
  return useInReadersLanguage<CouncilDocumentContent | null>(null, COUNCIL_DOCUMENT_FILES[docKey] ?? NONE, docKey);
}

/**
 * A council's document in the reader's language (1.9). The page writes the
 * English and hands it in as `children` (components/councils/CouncilSections.tsx),
 * so the text is in the page once, never again as a prop. Where the reader's
 * language has its own file, its sections take the English's place, with
 * their own title in the reader's pill and contents and on About this book.
 * Anywhere else a reader in another language is told, in one quiet line, that
 * the text is English.
 */
export function CouncilReaderHere({
  docKey,
  children,
  ...reader
}: {
  docKey: string;
  children: ReactNode;
} & Omit<ComponentProps<typeof CouncilReader>, "children">) {
  const { value: own, lang, coming } = useOwn(docKey);
  const note = <StillInEnglish kind="work" shown={lang} coming={coming} className="my-6" />;

  if (!own) {
    return (
      <>
        {note}
        <CouncilReader {...reader}>{children}</CouncilReader>
      </>
    );
  }
  const about = { ...reader.about, title: own.title, subtitle: own.subtitle ?? reader.about.subtitle, edition: editionOf(own.source) };
  return (
    <>
      {note}
      <CouncilReader {...reader} title={own.title} sections={own.sections.map((s) => ({ n: s.n, title: s.title }))} about={about}>
        <CouncilSections content={own} lang={lang} council={{ slug: docKey.split("/")[0], name: reader.about.council.name }} />
      </CouncilReader>
    </>
  );
}

/** The source at the foot of the text, in the language of the text above it. */
export function CouncilSourceHere({ docKey, english }: { docKey: string; english: string }) {
  const { value: own } = useOwn(docKey);
  return <>{own ? own.source : english}</>;
}
