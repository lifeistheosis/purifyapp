"use client";

// Try cross-references (r3-07 A): a verse of John 1, and the passages it
// echoes across the New Testament as the Bible's sheet lists them
// (components/bible/CrossRefSheet.tsx, CrossRefList): each place, its words,
// and a tap to open it. Under it, a few of the chapter's verses, to see each
// one's echoes in turn.
//
// The references are the chapter's own file, the one a subscriber's reader
// opens (lib/bible/chapterData.ts), carried in the apps.

import { useEffect, useState } from "react";

import { CrossRefList } from "@/components/bible/CrossRefSheet";
import type { TryProps } from "@/components/billing/PlusTry";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Skeleton } from "@/components/ui/Skeleton";
import { loadChapterCrossRefs } from "@/lib/bible/chapterData";
import type { CrossRefItem } from "@/lib/bible/crossRefShape";
import { TRY_CHAPTER, TRY_REF_VERSES } from "@/lib/premium/plusTry";

import { johnVerse, useJohnReference } from "./TryBible";
import { TrySwitch, TryWindow } from "./TryKit";

export default function TryCrossRefs({ row }: TryProps) {
  const { t } = useTranslate();
  const reference = useJohnReference();
  const [refs, setRefs] = useState<Record<number, CrossRefItem[]> | null | undefined>(undefined);
  const [verse, setVerse] = useState(TRY_REF_VERSES[0]);

  useEffect(() => {
    let live = true;
    void loadChapterCrossRefs(TRY_CHAPTER.book, TRY_CHAPTER.chapter).then((data) => {
      if (live) setRefs(data);
    });
    return () => {
      live = false;
    };
  }, []);

  // The verses offered: the ones with references, once the file has come.
  const verses = refs ? TRY_REF_VERSES.filter((n) => (refs[n]?.length ?? 0) > 0) : TRY_REF_VERSES;
  const items = refs?.[verse] ?? [];

  return (
    <>
      <TryWindow label={t(row.name)} tall>
        <div className="px-5 pb-16 pt-5">
          <p className="font-sans text-ui font-semibold text-paper">{t("bible.crossRefsFor", { reference: reference(verse) })}</p>
          <p className="mt-2 border-s-2 border-paper/20 ps-3 font-serif text-body leading-[1.6] text-paper/85">{johnVerse(verse)}</p>
          {refs ? (
            <div className="mt-3">
              <CrossRefList items={items} />
            </div>
          ) : refs === null ? (
            <p className="mt-4 font-sans text-detail text-paper/55">{t("bible.wordStudyFailed")}</p>
          ) : (
            <div aria-hidden className="mt-5 space-y-3">
              <Skeleton className="h-4 w-1/3" weight="faint" />
              <Skeleton className="h-4 w-full" weight="faint" />
              <Skeleton className="h-4 w-5/6" weight="faint" />
            </div>
          )}
        </div>
      </TryWindow>
      {verses.length > 1 ? (
        <TrySwitch
          label={t("bible.crossRefs")}
          value={String(verse)}
          onChange={(v) => setVerse(Number(v))}
          options={verses.map((n) => ({ id: String(n), label: `1:${n}`, className: "tabular-nums" }))}
        />
      ) : null}
    </>
  );
}
