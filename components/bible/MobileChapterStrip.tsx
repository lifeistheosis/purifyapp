"use client";

import Link from "next/link";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ChipScroller } from "@/components/ui/ChipScroller";
import type { BibleBook } from "@/lib/bible/books";
import { cn } from "@/lib/cn";

/**
 * The book's chapters as one slim row, for the phone and the tablet (the
 * computer has the sidebar). Plain numbers with no ring around them, and the
 * chapter being read filled, opening in the middle of the row (the owner's
 * note 6 of 2026-10-16, "could look much better", and his pick of the slim
 * strip). It sits in the text's column, so on a tablet it ends where the
 * verses end; on a phone it runs to the screen's edge. ChipScroller fades the
 * end that has more and gives a mouse its arrows, and in the phone apps each
 * chapter scrolled past is a small click in the hand (1.7.2, the owner's note
 * of 2026-10-19, lib/ui/scrollTicks.ts).
 */
export function MobileChapterStrip({
  book,
  current,
}: {
  book: BibleBook;
  current: number;
}) {
  const { t } = useTranslate();
  if (book.chapters <= 1) return null;

  return (
    <ChipScroller label={t("bible.chaptersLabel")} gap="gap-1" bleed="phone" centerOn={`${book.slug}/${current}`} ticks className="mb-5">
      {Array.from({ length: book.chapters }, (_, i) => i + 1).map((ch) => {
        const active = ch === current;
        return (
          <Link
            // No prefetch: this strip renders every chapter in the book (150 for
            // Psalms), so viewport prefetch pulls a full RSC payload per chapter the
            // reader is merely scrolling past. Measured on /bible/john/3, one page
            // view fired 137 requests, most of them prefetch for chapters never
            // opened. The chapter is already bundled on device.
            prefetch={false}
            key={ch}
            href={`/bible/${book.slug}/${ch}`}
            aria-current={active ? "page" : undefined}
            className={cn(
              "tap-press hit-44 inline-flex h-9 min-w-9 items-center justify-center rounded-pill px-2.5 font-sans text-detail tabular-nums",
              active
                ? "bg-gold font-semibold text-night"
                : "font-medium text-paper/60 hover:bg-paper/[0.06] hover:text-paper",
            )}
          >
            {ch}
          </Link>
        );
      })}
    </ChipScroller>
  );
}
