"use client";

// Today's saint in their own words (1.8): the same card as the Desert
// Fathers' saying, under "In his own words", named and sourced, on a day
// whose saint has words of theirs the app can show where they stand
// (lib/today/saintWords.ts). The source line opens the paragraph.

import { SourceLine } from "@/components/citations/SourceLine";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import type { SaintWords } from "@/lib/today/saintWords";

export function TodaySaintWordsCard({ name, words }: { name: string; words: SaintWords }) {
  const { t } = useTranslate();
  return (
    <article data-today-saint-words="" className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-3.5">
      <p className="font-sans text-caption text-paper/55">{t("saints.inHisOwnWords")}</p>
      <blockquote lang="en" className="mt-2 font-serif text-ui leading-[1.5] text-paper/85">
        {words.text}
      </blockquote>
      <p className="mt-2.5 font-sans text-caption text-paper/55">{name}</p>
      <SourceLine cite={words.shown} className="mt-1" />
    </article>
  );
}
