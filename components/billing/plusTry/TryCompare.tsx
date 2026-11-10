"use client";

// Try Compare (1.9, rec 85: Compare on the Plus screen, its row ending in Try
// it as every row does): Psalm 50:1 as the verse's Study sheet shows it
// (components/bible/CompareSheet.tsx), its rows drawn by the sheet's own
// components: the app's English, then each Bible a reader can download, at
// the place its own numbering puts the verse (the Synodal's and the Greek's
// 50:3, the others' 51:1).
//
// The words are each Bible's own, copied from its file and held to it by a
// test (lib/premium/tryCompare.ts), so the preview opens with no signal and
// with no Bible downloaded; the sheet itself reads them from the phone.

import { CompareBibleRow, CompareEnglishRow } from "@/components/bible/CompareSheet";
import type { TryProps } from "@/components/billing/PlusTry";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { DOWNLOADABLE_BIBLES } from "@/lib/bible/downloads/catalog";
import { TRANSLATIONS } from "@/lib/bible/translations";
import { TRY_COMPARE, TRY_COMPARE_BIBLES, TRY_COMPARE_ENGLISH } from "@/lib/premium/tryCompare";

import { TryWindow } from "./TryKit";

export default function TryCompare({ row }: TryProps) {
  const { t } = useTranslate();
  const reference = `${t("bible.books.psalms")} ${TRY_COMPARE.chapter}:${TRY_COMPARE.verse}`;
  const english = TRANSLATIONS.find((x) => x.id === "lxx-brenton");
  return (
    <TryWindow label={t(row.name)} tall>
      <div className="px-5 pb-16 pt-5">
        <p className="font-sans text-ui font-semibold text-paper">{t("bible.compareFor", { reference })}</p>
        <ol className="mt-1 divide-y divide-paper/10" data-compare="">
          <CompareEnglishRow label={english?.fullLabel ?? ""} words={TRY_COMPARE_ENGLISH} />
          {TRY_COMPARE_BIBLES.map((r) => {
            const bible = DOWNLOADABLE_BIBLES.find((b) => b.id === r.bible);
            return bible ? <CompareBibleRow key={r.bible} bible={bible} row={{ state: "words", words: r.words, at: r.at }} /> : null;
          })}
        </ol>
        <p className="mt-4 font-sans text-caption text-paper/45">{t("bible.compareCredit")}</p>
      </div>
    </TryWindow>
  );
}
