"use client";

import { useState } from "react";
import Link from "next/link";
import { nextChapter, prevChapter, getBook } from "@/lib/bible/books";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { MobileChapterSheet } from "./MobileChapterSheet";

/**
 * Hoisted out of the pill body so React (and the new
 * `react-hooks/static-components` rule) sees it as a stable component
 * definition rather than one re-created on every render.
 */
function Arrow({
  target,
  label,
  dir,
}: {
  target: { slug: string; chapter: number } | null;
  label: string;
  dir: "‹" | "›";
}) {
  if (!target) {
    return (
      <span
        aria-hidden
        className="h-10 w-10 inline-flex items-center justify-center text-paper/25 font-sans text-lede leading-none"
      >
        {dir}
      </span>
    );
  }
  return (
    <Link
      href={`/bible/${target.slug}/${target.chapter}`}
      aria-label={label}
      className="h-10 w-10 inline-flex items-center justify-center text-paper/85 hover:text-paper font-sans text-lede leading-none"
    >
      {dir}
    </Link>
  );
}

/**
 * Mobile-only YouVersion-style chapter pill. Always visible (not scroll-gated)
 * and centered above the bottom tab bar. Shows the current `<Book> <Chapter>`
 * with ‹ › arrows to step backward and forward through the canon.
 *
 * Tapping the center label opens `MobileChapterSheet`, a real book +
 * chapter picker, instead of dumping to /bible.
 */
export function MobileChapterPill({
  slug,
  chapter,
}: {
  slug: string;
  chapter: number;
}) {
  const { t } = useTranslate();
  const book = getBook(slug);
  const bookName = t(`bible.books.${slug}`);
  const prev = prevChapter(slug, chapter);
  const next = nextChapter(slug, chapter);
  const [sheetOpen, setSheetOpen] = useState(false);
  if (!book) return null;

  return (
    <>
      <div
        aria-label={t("bible.chapterSwitcher")}
        className="md:hidden fixed inset-x-0 z-40 flex justify-center pointer-events-none"
        // Sit clear of the tab bar, the now-playing bar when one is up, AND the
        // iOS home indicator, plus a 12px gap. Both vars are 0 when the thing
        // they measure is not on screen, so this is one formula for every case.
        style={{
          bottom:
            "calc(var(--tab-bar-h) + var(--now-playing-h) + env(safe-area-inset-bottom, 0px) + 12px)",
        }}
      >
        <div className="pointer-events-auto inline-flex items-center gap-1 rounded-pill bg-night/95 backdrop-blur border border-white/15 shadow-raise pl-1 pr-1 py-1">
          <Arrow
            target={prev}
            label={
              prev
                ? t("bible.previousTargetAria", {
                    book: t(`bible.books.${prev.slug}`),
                    chapter: prev.chapter,
                  })
                : t("bible.noPreviousChapter")
            }
            dir="‹"
          />
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-label={t("bible.pickChapterCurrentAria", {
              book: bookName,
              chapter,
            })}
            className="px-3 h-10 inline-flex items-center font-sans text-ui font-semibold text-paper"
          >
            {bookName} {chapter}
          </button>
          <Arrow
            target={next}
            label={
              next
                ? t("bible.nextTargetAria", {
                    book: t(`bible.books.${next.slug}`),
                    chapter: next.chapter,
                  })
                : t("bible.noNextChapter")
            }
            dir="›"
          />
        </div>
      </div>

      <MobileChapterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        currentSlug={slug}
        currentChapter={chapter}
      />
    </>
  );
}
