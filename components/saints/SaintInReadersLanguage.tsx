"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { ListedSource } from "@/components/citations/Marked";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { useInReadersLanguage, type Loaders } from "@/components/i18n/useInReadersLanguage";
import type { ShownCite } from "@/lib/citations/cite";
import type { LocaleCode } from "@/lib/i18n/locales";
import { textDir } from "@/lib/i18n/textDir";

import { LIFE_LOADERS } from "./lifeLoaders";
import { LifeSection } from "./LifeSection";
import { TitlesSection } from "./TitlesSection";

/**
 * A saint's page in the reader's language (1.9, the reader's language in the
 * apps). The page writes his life in English, as it always has; a life
 * written in the reader's language (55 in German) is its own file, loaded on
 * the device by ./lifeLoaders.ts and never carried by the page. Until 1.9 the
 * page chose the German on the server, which in the apps knows no reader, so
 * a German reader read the English.
 *
 * The islands below each draw the reader's words once they have come, or the
 * English they hold; while they come the English stands and says nothing.
 */
export type SaintWords = { byname?: string; epithet?: string; shortBio?: string; life?: string[]; titles?: string[] };

type State = { words: SaintWords | null; lang: LocaleCode; has: boolean };
const Words = createContext<State>({ words: null, lang: "en", has: false });

/** A saint with no life in another language. */
const NONE: Loaders<SaintWords | null> = {};

export function SaintInReadersLanguage({ slug, children }: { slug: string; children: ReactNode }) {
  const { locale } = useTranslate();
  // Module constants, one per saint, as the hook asks.
  const loaders: Loaders<SaintWords | null> = LIFE_LOADERS[slug] ?? NONE;
  const { value, lang } = useInReadersLanguage<SaintWords | null>(null, loaders, slug);
  const has = Boolean(loaders[locale as LocaleCode]);
  const state = useMemo(() => ({ words: value, lang, has }), [value, lang, has]);
  return <Words.Provider value={state}>{children}</Words.Provider>;
}

/** The title line under his name: the first part of his epithet, in the reader's words where his life has them. */
export function SaintHeroTitle({ english }: { english: string }) {
  const { words, lang } = useContext(Words);
  const title = words?.epithet ? (words.epithet.split("·")[0] ?? "").trim() : "";
  return title ? <span lang={lang} dir={textDir(lang)}>{title}</span> : <>{english}</>;
}

/** The short account at the top of his life. */
export function SaintShortBio({ english }: { english: string }) {
  const { words, lang } = useContext(Words);
  return words?.shortBio ? <span lang={lang} dir={textDir(lang)}>{words.shortBio}</span> : <>{english}</>;
}

/** The titles the Church gives the saint, where his life in the reader's language has them (the Theotokos's, in German). */
export function SaintTitlesIn({ pronoun, children }: { pronoun?: "his" | "her"; children: ReactNode }) {
  const { words, lang } = useContext(Words);
  if (!words?.titles?.length) return <>{children}</>;
  return (
    <div lang={lang} dir={textDir(lang)}>
      <TitlesSection titles={words.titles} pronoun={pronoun} />
    </div>
  );
}

/**
 * His life: in the reader's words where it is written in them, marked with
 * the quotations it shares with the English one (`quotes`, numbered in the
 * order they stand), else the English (`children`, drawn on the server).
 */
export function SaintLifeIn({ slug, quotes, children }: { slug: string; quotes: readonly { words: string; shown: ShownCite | null }[]; children: ReactNode }) {
  const { words, lang } = useContext(Words);
  const life = words?.life;
  const sources = useMemo<ListedSource[]>(() => {
    if (!life?.length) return [];
    const written = life.join("\n");
    return quotes
      .map((q) => ({ q, at: written.indexOf(q.words) }))
      .filter(({ at }) => at >= 0)
      .sort((a, b) => a.at - b.at)
      .map(({ q }, i) => ({ words: q.words, n: i + 1, shown: q.shown })) as ListedSource[];
  }, [life, quotes]);
  if (!life?.length) return <>{children}</>;
  return (
    <div lang={lang} dir={textDir(lang)}>
      <LifeSection paragraphs={life} sources={sources} saint={slug} />
    </div>
  );
}

/** "This life is not yet in your language": for a reader whose language his life is not written in. */
export function SaintNotInLanguage() {
  const { locale, t } = useTranslate();
  const { has } = useContext(Words);
  if (locale === "en" || has) return null;
  const title = t("content.notYetTranslated.bio.title");
  const body = t("content.notYetTranslated.bio.body");
  if (body === "content.notYetTranslated.bio.body") return null;
  return (
    <div role="status" className="my-6 rounded-md border border-gold/30 bg-gold/[0.04] px-4 py-3">
      <p className="font-sans text-caption font-semibold text-gold/85 mb-1">{title === "content.notYetTranslated.bio.title" ? "" : title}</p>
      <p className="font-serif text-ui text-paper/80 leading-relaxed">{body}</p>
    </div>
  );
}
