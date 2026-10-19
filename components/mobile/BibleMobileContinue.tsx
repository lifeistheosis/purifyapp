"use client";

// Tiny client island: reads the "last read" pointer from localStorage so the
// mobile Bible shell can offer a one-tap way back into the chapter. The
// pointer (purify:bible:last) is written by ReadingProgressBar as the reader
// scrolls, and carries the in-view verse + chapter length, so this row can
// resume at the exact verse via a #v{n} deep link (picked up by
// VerseFocusFlash).
//
// One row since 1.6, in the row language of the book list under it
// (IndexRows.tsx): the chapter at the start, where it picks up at the end.
// It was a card of four lines. And with nothing read yet it draws nothing:
// it used to draw an empty card that said a card would appear here, which
// was one more thing on a screen the owner called too busy (2026-10-13), and
// was never what this file's own header in BibleMobile.tsx said it did.

import { useEffect, useState } from "react";
import { localBookNames } from "@/lib/bible/books";
import { readLastRead, type LastRead } from "@/lib/bible/lastRead";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import type { ReactNode } from "react";
import { IndexEyebrow, IndexList, IndexRow } from "./IndexRows";

export function BibleMobileContinue({
  className = "mb-5",
  heading,
}: {
  className?: string;
  /** A small grey heading over the row, drawn only when there is a row:
   *  "Where you left off" on the You tab (1.7). */
  heading?: ReactNode;
} = {}) {
  const { t } = useTranslate();
  const [last, setLast] = useState<LastRead | null>(null);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- the
       last-read pointer lives in localStorage, so it can only be adopted
       after mount (the server renders nothing here). */
    setLast(readLastRead());
  }, []);

  if (!last) return null;

  // The book in the reader's language, as the list below names it. The name
  // kept in the pointer is the one the chapter had when it was read, which
  // is the fallback for a book the catalog does not name.
  const name =
    localBookNames(t)[last.book] ??
    last.bookName.charAt(0).toUpperCase() + last.bookName.slice(1);
  // Resume at the verse when we have one past the chapter top; the #v{n} hash
  // is handled by VerseFocusFlash (scroll + flash). Otherwise open at the top.
  const resumeVerse = last.verse > 1 ? last.verse : 0;
  const href = resumeVerse
    ? `/bible/${last.book}/${last.chapter}#v${resumeVerse}`
    : `/bible/${last.book}/${last.chapter}`;
  const where = !resumeVerse
    ? t("bible.continueReading")
    : last.totalVerses
      ? t("bible.continueAtVerseOf", { verse: resumeVerse, total: last.totalVerses })
      : t("bible.continueAtVerse", { verse: resumeVerse });

  const list = (
    <IndexList className={heading ? undefined : className} data-bible-continue="">
      <IndexRow first href={href} left={`${name} ${last.chapter}`} right={where} />
    </IndexList>
  );
  if (!heading) return list;
  return (
    <section className={className}>
      <IndexEyebrow>{heading}</IndexEyebrow>
      {list}
    </section>
  );
}
