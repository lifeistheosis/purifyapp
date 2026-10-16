"use client";

import { useState } from "react";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { MobileChapterSheet } from "./MobileChapterSheet";
import { ReaderPill } from "./ReaderPill";

/**
 * The phone's and the tablet's book pill: the book's name in the reader's
 * language, opening the book and chapter sheet (MobileChapterSheet). It is
 * the pill in the row that gives way: on a narrow phone with the Greek
 * offered, a long name ends in an ellipsis before the row can overflow.
 * The computer keeps BookSwitcher's popover.
 */
export function MobileBookPill({
  currentSlug,
  currentChapter,
}: {
  currentSlug: string;
  currentChapter: number;
}) {
  const { t } = useTranslate();
  const [open, setOpen] = useState(false);
  const name = t(`bible.books.${currentSlug}`);

  return (
    <>
      <ReaderPill
        chevron
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t("bible.pickChapterCurrentAria", { book: name, chapter: currentChapter })}
        // It gives way before the others: so heavy a shrink factor takes all
        // of a shortfall until the pill is down to 3.5rem, and the row's
        // other pills give only what is left after that.
        className="min-w-[3.5rem] shrink-[1000000]"
      >
        <span className="truncate">{name}</span>
      </ReaderPill>
      <MobileChapterSheet
        open={open}
        onClose={() => setOpen(false)}
        currentSlug={currentSlug}
        currentChapter={currentChapter}
      />
    </>
  );
}
