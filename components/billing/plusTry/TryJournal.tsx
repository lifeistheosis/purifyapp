"use client";

// Try the journal (r3-07 A): the journal's own page (components/journal/
// JournalClient.tsx), its heading and line, "From this day" with a note from
// a month ago, and the entries by day as its list draws them
// (components/journal/JournalFeed.tsx, the real list, with its kinds to
// filter by and a swipe to take one away).
//
// A reader's journal is their own, so the entries here are examples, marked
// so at the page's head, in the words of the app's own library: Fathers'
// lines the reading plans carry, each with its author and the chapter it
// speaks of (./TryExamples.ts). Nothing here reads or writes the reader's
// notes; a swipe takes an example away for as long as the preview lasts.

import { useCallback, useMemo, useState } from "react";

import type { TryProps } from "@/components/billing/PlusTry";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { JournalFeed } from "@/components/journal/JournalFeed";
import { localBookNames } from "@/lib/bible/books";
import { dateLocale } from "@/lib/i18n/deviceDates";
import type { JournalSource } from "@/lib/journal/entries";
import type { JournalItem } from "@/lib/journal/feed";
import { TRY_EXAMPLES, type TryExample } from "@/lib/premium/plusTry";

import { exampleSaying } from "./TryExamples";
import { ExampleTag, TryWindow } from "./TryKit";

/** An example entry: a Father's line on a chapter, written `at`. */
function exampleItem(key: string, example: TryExample, at: Date): JournalItem | null {
  const saying = exampleSaying(example);
  if (!saying) return null;
  // The author rides in the source's label, so the entry's small line names him.
  const source: JournalSource = { type: "chapter", book: example.book, chapter: example.chapter, label: saying.author };
  return { key, kind: "reflection", body: saying.text, at: at.toISOString(), source, record: null, note: null };
}

export default function TryJournal({ row }: TryProps) {
  const { t, locale } = useTranslate();
  const books = useMemo(() => localBookNames(t), [t]);
  const [now] = useState(() => new Date());

  const [items, setItems] = useState<JournalItem[]>(() => {
    // The example of the day before: a day earlier, at about this time.
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return [exampleItem("today", TRY_EXAMPLES.journalToday, now), exampleItem("yesterday", TRY_EXAMPLES.journalYesterday, yesterday)].filter(
      (i): i is JournalItem => i !== null,
    );
  });

  const sourceLabel = useCallback(
    (source: JournalSource) => {
      const book = "book" in source ? (books[source.book] ?? t(`bible.books.${source.book}`)) : "";
      const place = source.type === "chapter" ? `${book} ${source.chapter}` : source.type === "verse" ? `${book} ${source.chapter}:${source.verse}` : "";
      return [place, source.label].filter(Boolean).join(" · ");
    },
    [books, t],
  );

  // "From this day": a note written on this date a month ago.
  const remembered = exampleSaying(TRY_EXAMPLES.fromThisDay);
  const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  let monthAgoWords = "";
  try {
    monthAgoWords = new Intl.DateTimeFormat(dateLocale(locale), { month: "long", day: "numeric", year: "numeric" }).format(monthAgo);
  } catch {
    /* the reference alone */
  }
  const ex = TRY_EXAMPLES.fromThisDay;

  return (
    <TryWindow label={t(row.name)} tall>
      <div className="px-5 pb-16 pt-6">
        <header>
          <h3 className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-title font-bold leading-[1.12] tracking-[-0.01em] text-paper">
            {t("journal.title")}
            <ExampleTag />
          </h3>
          <p className="mt-2 font-sans text-detail leading-[1.6] text-paper/55">{t("journal.lede")}</p>
        </header>

        {remembered ? (
          <section aria-label={t("journal.fromThisDay")} className="mt-6 border-y border-paper/10 py-4">
            <p className="font-sans text-caption font-semibold text-paper/60">{t("journal.fromThisDay")}</p>
            <p className="mt-2 line-clamp-3 whitespace-pre-line font-serif text-body leading-[1.6] text-paper/90">{remembered.text}</p>
            <p className="mt-1 font-sans text-caption text-paper/50">
              {[`${books[ex.book] ?? t(`bible.books.${ex.book}`)} ${ex.chapter}:${ex.verse}`, monthAgoWords, remembered.author].filter(Boolean).join(" · ")}
            </p>
          </section>
        ) : null}

        <JournalFeed
          items={items}
          onOpen={() => {}}
          onRemove={(item) => setItems((was) => was.filter((i) => i.key !== item.key))}
          sourceLabel={sourceLabel}
        />
      </div>
    </TryWindow>
  );
}
