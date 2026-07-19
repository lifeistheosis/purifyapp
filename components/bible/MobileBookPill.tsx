"use client";

import { useState } from "react";
import { getBook } from "@/lib/bible/books";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { MobileChapterSheet } from "./MobileChapterSheet";

/**
 * Mobile replacement for the BookSwitcher's anchored popover: the same
 * "Book · <name>" pill, but it opens the bottom-sheet book + chapter picker
 * (MobileChapterSheet) instead of a 380px desktop dropdown — the popover was
 * the community's "window that pops up isn't optimized for mobile". Desktop
 * keeps BookSwitcher.
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
  const current = getBook(currentSlug);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-pill border border-paper/15 bg-paper/[0.04] hover:border-paper/30 hover:bg-paper/10 focus:outline-none focus:ring-2 focus:ring-paper/25 pl-3 pr-2.5 py-2 font-sans text-detail font-medium text-paper transition-colors"
      >
        <span className="font-sans text-eyebrow font-semibold uppercase tracking-[1.2px] text-paper/55">
          {t("bible.bookLabel")}
        </span>
        <span className="font-sans text-detail font-medium text-paper">
          {current?.name ?? "Select"}
        </span>
        <span aria-hidden className="text-eyebrow text-paper/55">
          ▾
        </span>
      </button>
      <MobileChapterSheet
        open={open}
        onClose={() => setOpen(false)}
        currentSlug={currentSlug}
        currentChapter={currentChapter}
      />
    </>
  );
}
