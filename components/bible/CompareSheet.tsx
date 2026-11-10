"use client";

// Compare (1.9, the sheet's 14; PLAN.md row 21b): the verse in each Bible the
// app may show, and its Greek, from the verse's Study (a Plus tool).
//
// The English as the page reads it; the Greek beside the app's English
// (Nestle 1904, the Septuagint), where the chapter pairs verse for verse; then
// each Bible that can be downloaded, at the place it numbers the verse (the
// Synodal's Psalm 50:3 for the English's 50:1), read from the phone in the
// apps and from the website in a browser. A Bible not on the phone says so,
// and where to get it; a verse that could not be placed surely in a Bible's
// numbering says that, rather than show a verse that may be the wrong one
// (lib/bible/compare.ts). Licensed translations are not compared: their terms
// are not settled for it.
//
// Drawn as the cross-references are (components/bible/CrossRefSheet.tsx): each
// edition's name in the Plus ink over its words, the credit under the list.

import { useEffect, useMemo, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Sheet } from "@/components/ui/Sheet";
import { SkeletonText } from "@/components/ui/Skeleton";
import { getBook } from "@/lib/bible/books";
import { loadInterlinear } from "@/lib/bible/chapterData";
import { loadCompareMap, placeIn, placeLabel, sameNumber, wordsAt } from "@/lib/bible/compare";
import { DOWNLOADABLE_BIBLES, hasBook, type DownloadableBible } from "@/lib/bible/downloads/catalog";
import { readBibleBook, useBibles } from "@/lib/bible/downloads/store";
import { TRANSLATIONS } from "@/lib/bible/translations";
import { isNativeClient } from "@/lib/platform/native";
import { textDir } from "@/lib/i18n/textDir";

/** What a Bible's row shows. */
export type CompareRow =
  | { state: "loading" }
  | { state: "words"; words: string; at: string | null }
  | { state: "unplaced" }
  | { state: "absent" }
  | { state: "unread" };

const GREEK = { fontFamily: "var(--font-greek), serif" } as const;

export function CompareSheet({
  open,
  onClose,
  book,
  chapter,
  verse,
  reference,
  words,
}: {
  open: boolean;
  onClose: () => void;
  book: string;
  chapter: number;
  verse: number;
  reference: string;
  /** The verse as the page shows it in English. */
  words: string;
}) {
  const { t } = useTranslate();
  const { saved } = useBibles();
  const testament = getBook(book)?.testament === "NT" ? "NT" : "OT";
  const english = TRANSLATIONS.find((x) => x.id === (getBook(book)?.source === "brenton-lxx-pd" ? "lxx-brenton" : "kjv"));
  const bibles = useMemo(() => DOWNLOADABLE_BIBLES.filter((b) => hasBook(b, book)), [book]);
  // Each result is kept with the verse it belongs to, so a sheet opened on
  // another verse shows its own as loading until they come.
  const key = `${book}:${chapter}:${verse}`;
  const [greek, setGreek] = useState<{ key: string; text: string | null } | null>(null);
  const [found, setFound] = useState<{ key: string; rows: Record<string, CompareRow> }>({ key: "", rows: {} });
  const native = isNativeClient();
  const onPhone = (b: DownloadableBible) => !native || Boolean(saved[b.id]?.books.includes(book));

  useEffect(() => {
    if (!open) return;
    let live = true;
    void loadInterlinear(book, chapter).then((g) => {
      if (live) setGreek({ key, text: g?.text[verse] ?? null });
    });
    for (const b of bibles) {
      if (native && !saved[b.id]?.books.includes(book)) continue;
      void Promise.all([loadCompareMap(b.id), readBibleBook(b.id, book)]).then(([map, file]) => {
        if (!live) return;
        let row: CompareRow;
        if (!map || !file) row = { state: "unread" };
        else {
          const place = placeIn(map, book, chapter, verse);
          const words = place ? wordsAt(file, place) : null;
          row = place && words ? { state: "words", words, at: sameNumber(place, chapter, verse) ? null : placeLabel(place) } : { state: "unplaced" };
        }
        setFound((was) => ({ key, rows: { ...(was.key === key ? was.rows : {}), [b.id]: row } }));
      });
    }
    return () => {
      live = false;
    };
  }, [open, key, book, chapter, verse, bibles, saved, native]);

  const greekWords = greek?.key === key ? greek.text : null;
  const rowOf = (b: DownloadableBible): CompareRow => (!onPhone(b) ? { state: "absent" } : found.key === key ? (found.rows[b.id] ?? { state: "loading" }) : { state: "loading" });

  return (
    <Sheet open={open} onClose={onClose} title={t("bible.compareFor", { reference })} desktop bodyClassName="px-5 pb-6 pt-1">
      <ol className="divide-y divide-paper/10" data-compare="">
        <CompareEnglishRow label={english?.fullLabel ?? ""} words={words} />
        {greekWords ? (
          <li className="py-3.5" data-compare-row="greek">
            <p className="font-sans text-detail font-semibold text-premium-ink">
              {t("bible.strip.greek")} · {testament === "NT" ? "Nestle 1904" : t("bible.wordStudyOT")}
            </p>
            <p lang="grc" dir="ltr" className="mt-1 text-body leading-[1.6] text-paper/80" style={GREEK}>
              {greekWords}
            </p>
          </li>
        ) : null}
        {bibles.map((b) => (
          <CompareBibleRow key={b.id} bible={b} row={rowOf(b)} />
        ))}
      </ol>
      <p className="mt-4 font-sans text-caption text-paper/45">{t("bible.compareCredit")}</p>
    </Sheet>
  );
}

/** The verse in the app's English, its edition's name over it: the list's first row (and the Plus screen's preview's, components/billing/plusTry/TryCompare.tsx). */
export function CompareEnglishRow({ label, words }: { label: string; words: string }) {
  return (
    <li className="py-3.5" data-compare-row="english">
      <p className="font-sans text-detail font-semibold text-premium-ink">
        <span lang="en" dir="ltr">{label}</span>
      </p>
      <p lang="en" dir="ltr" className="mt-1 font-serif text-body leading-[1.6] text-paper/80">
        {words}
      </p>
    </li>
  );
}

/** A downloadable Bible's row: its name, the place it numbers the verse when that differs, and its words or why there are none. */
export function CompareBibleRow({ bible, row }: { bible: DownloadableBible; row: CompareRow }) {
  const { t } = useTranslate();
  const greek = bible.textLang === "grc";
  return (
    <li className="py-3.5" data-compare-row={bible.id}>
      <p className="font-sans text-detail font-semibold text-premium-ink">
        <span lang={bible.textLang} dir={textDir(bible.textLang)}>
          {bible.title}
        </span>
        {row.state === "words" && row.at ? <span className="font-normal tabular-nums text-paper/60"> · {row.at}</span> : null}
      </p>
      {row.state === "loading" ? (
        <SkeletonText lines={2} className="mt-2" />
      ) : row.state === "words" ? (
        <p lang={bible.textLang} dir={textDir(bible.textLang)} className={greek ? "mt-1 text-body leading-[1.6] text-paper/80" : "mt-1 font-serif text-body leading-[1.6] text-paper/80"} style={greek ? GREEK : undefined}>
          {row.words}
        </p>
      ) : (
        <p className="mt-1 font-sans text-detail leading-[1.5] text-paper/60">
          {row.state === "absent" ? t("bible.compare.absent") : row.state === "unplaced" ? t("bible.compare.unplaced") : t("bible.compare.unread")}
        </p>
      )}
    </li>
  );
}
