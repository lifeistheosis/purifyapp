"use client";

import { useState } from "react";
import Link from "next/link";
import { nextChapter, prevChapter, getBook } from "@/lib/bible/books";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { MobileChapterSheet } from "./MobileChapterSheet";
import { ChevronLeft } from "@/components/ui/icons/ChevronLeft";
import { AmbienceButton } from "@/components/player/AmbienceButton";

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
        {dir === "‹" ? <ChevronLeft size={20} className="rtl:-scale-x-100" /> : <ChevronLeft size={20} className="-scale-x-100 rtl:scale-x-100" />}
      </span>
    );
  }
  return (
    <Link
      href={`/bible/${target.slug}/${target.chapter}`}
      aria-label={label}
      className="h-10 w-10 inline-flex items-center justify-center text-paper/85 hover:text-paper font-sans text-lede leading-none"
    >
      {dir === "‹" ? <ChevronLeft size={20} className="rtl:-scale-x-100" /> : <ChevronLeft size={20} className="-scale-x-100 rtl:scale-x-100" />}
    </Link>
  );
}

/**
 * Mobile-only YouVersion-style chapter pill. Always visible (not scroll-gated)
 * and centered above the bottom tab bar. Shows the current `<Book> <Chapter>`
 * with drawn chevrons to step backward and forward through the canon.
 *
 * Tapping the center label opens `MobileChapterSheet`, a real book +
 * chapter picker, instead of dumping to /bible.
 *
 * Reader chrome: focus mode puts it away (1.7), so the way out of focus can
 * stand at the foot of the screen with nothing under it. A chapter is still
 * turned there by the pager at the chapter's end. No blur behind it: a
 * blurred backdrop is redrawn on every frame of a scroll, and through a 95%
 * fill it showed nothing.
 *
 * The sound button closes it (1.7, the owner's note 25 of 2026-10-16): the
 * ambience "in the reader's bottom bar, by the chapter pager", lit while a
 * sound plays, opening the ambience sheet. A hairline sets it apart from the
 * arrows, so it reads as its own control and not a third arrow.
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
        data-reader-chrome
        className="md:hidden native-md-flex fixed inset-x-0 z-40 flex justify-center pointer-events-none"
        // Sit clear of the tab bar, the now-playing bar when one is up, AND the
        // iOS home indicator, plus a 12px gap. Both vars are 0 when the thing
        // they measure is not on screen, so this is one formula for every case.
        style={{
          bottom:
            "calc(var(--tab-bar-h) + var(--now-playing-h) + env(safe-area-inset-bottom, 0px) + 12px)",
        }}
      >
        <div className="pointer-events-auto inline-flex items-center gap-1 rounded-pill bg-night/95 border border-white/15 shadow-raise pl-1 pr-1 py-1">
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
            className="px-3 h-10 inline-flex min-w-0 max-w-[calc(100vw-10rem)] items-center font-sans text-ui font-semibold text-paper"
          >
            {/* A long name gives way before the chapter's number does, so
                the pill, with its sound button, stays on the screen. */}
            <span className="truncate">{bookName}</span>
            <span className="ms-1 shrink-0 tabular-nums">{chapter}</span>
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
          <span aria-hidden className="mx-0.5 h-5 w-px bg-white/15" />
          <AmbienceButton variant="pill" />
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
