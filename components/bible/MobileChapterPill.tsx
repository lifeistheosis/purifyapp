"use client";

import { useState } from "react";
import Link from "next/link";
import { nextChapter, prevChapter, getBook } from "@/lib/bible/books";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ChapterVerseStatus } from "./ChapterVerseStatus";
import { MobileChapterSheet } from "./MobileChapterSheet";
import { ReadAloudPillButton } from "./ReadAloud";
import { ChevronLeft } from "@/components/ui/icons/ChevronLeft";
import { AmbienceButton } from "@/components/player/AmbienceButton";
import { cn } from "@/lib/cn";
import { useHasReadAloud } from "@/lib/readAloud/chapters";
import { useOverlayOpen } from "@/lib/ui/overlay";

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
        className="h-10 w-10 shrink-0 inline-flex items-center justify-center text-paper/25 font-sans text-lede leading-none"
      >
        {dir === "‹" ? <ChevronLeft size={20} className="rtl:-scale-x-100" /> : <ChevronLeft size={20} className="-scale-x-100 rtl:scale-x-100" />}
      </span>
    );
  }
  return (
    <Link
      href={`/bible/${target.slug}/${target.chapter}`}
      aria-label={label}
      className="h-10 w-10 shrink-0 inline-flex items-center justify-center text-paper/85 hover:text-paper font-sans text-lede leading-none"
    >
      {dir === "‹" ? <ChevronLeft size={20} className="rtl:-scale-x-100" /> : <ChevronLeft size={20} className="-scale-x-100 rtl:scale-x-100" />}
    </Link>
  );
}

/**
 * The chapter's pill, floating at the foot of the page on a phone and a
 * tablet (1.8, the owner's pick B of round 2, "The page": "The floating pill
 * comes back when you scroll up, with Listen"; Homebase/boards/purify-master/
 * variants/02-bible). The arrows step back and forward through the canon,
 * and the name between them opens the book and chapter sheet
 * (MobileChapterSheet). After a hairline, the sound button, then Listen,
 * white and softly lit, where the chapter has a reading. Over the pill, once
 * the title has gone up, a running line says the verse being read and the
 * minutes left (ChapterVerseStatus, which was the top bar's second line
 * until the bar went).
 *
 * It floats on a fade of the page, as drawn: the words go quiet under it.
 * It leaves with the round buttons over the page while the reader reads on,
 * and comes back with them on a scroll up and at the top of the chapter
 * (lib/ui/scrollAway.ts; globals.css, "The page: the Bible reader with no
 * bar"). No blur behind it: a blurred backdrop is redrawn on every frame of
 * a scroll.
 *
 * The sound button stays on it (1.7, the owner's note 25 of 2026-10-16: the
 * ambience "in the reader's bottom bar, by the chapter pager", lit while a
 * sound plays, opening the ambience sheet). A chapter with no reading keeps
 * the pill without Listen, and no button stands there that does nothing.
 *
 * Reader chrome: focus mode puts it away (1.7), so the way out of focus can
 * stand at the foot of the screen with nothing under it.
 *
 * It steps aside, as the tab bar does, while anything rises over the reader
 * (lib/ui/overlay.ts): the Copy pill of a hold and a verse's tools take its
 * very place, and the search screen and the sheets cover it (1.7.1, the
 * owner: "pill buttons colliding here"). It comes back as they go.
 *
 * It never runs past the screen: the name gives way first, down to a few
 * letters and the chapter's number, which never goes.
 */
export function MobileChapterPill({
  slug,
  chapter,
  totalVerses,
}: {
  slug: string;
  chapter: number;
  totalVerses: number;
}) {
  const { t } = useTranslate();
  const book = getBook(slug);
  const bookName = t(`bible.books.${slug}`);
  const prev = prevChapter(slug, chapter);
  const next = nextChapter(slug, chapter);
  const [sheetOpen, setSheetOpen] = useState(false);
  const covered = useOverlayOpen();
  // Only a chapter that has a reading carries Listen.
  const reads = useHasReadAloud(slug, chapter);
  if (!book) return null;

  return (
    <>
      <div
        aria-label={t("bible.chapterSwitcher")}
        data-reader-chrome
        data-reader-pill
        // What stands at the foot of the screen, the running line over the
        // pill with it (lib/ui/readingPlace.ts): the verse being read aloud,
        // or landed on, stands clear of it.
        data-screen-edge="bottom"
        // Out of reach and out of hearing while something stands over it.
        aria-hidden={covered || undefined}
        className={cn(
          "md:hidden native-md-flex fixed inset-x-0 z-40 flex flex-col items-center gap-1.5 px-4 pointer-events-none motion-safe:transition-opacity motion-safe:duration-200",
          covered && "opacity-0",
        )}
        // Sit clear of the tab bar, the now-playing bar when one is up, AND the
        // iOS home indicator, plus a 12px gap. Both vars are 0 when the thing
        // they measure is not on screen, so this is one formula for every case.
        style={{
          bottom:
            "calc(var(--tab-bar-h) + var(--now-playing-h) + var(--readings-flow-h, 0px) + env(safe-area-inset-bottom, 0px) + 12px)",
        }}
      >
        {/* The fade the pill floats on, down to the tab bar, behind it. */}
        <span aria-hidden className="pill-fade pointer-events-none absolute inset-x-0 -bottom-3 -z-10 h-44" />
        {/* The verse being read and the minutes left, a running line over
            the pill once the title has gone up, as a printed page carries
            its place at its foot. Over the pill and not inside it, so the
            pill keeps its width and the name its room. */}
        <ChapterVerseStatus chapterKey={`${slug}/${chapter}`} totalVerses={totalVerses} />
        <div
          className={cn(
            "flex h-14 min-w-0 max-w-full items-center gap-0.5 rounded-pill border border-paper/10 bg-night-soft px-1.5 shadow-[0_14px_34px_rgba(0,0,0,0.55)]",
            covered ? "pointer-events-none" : "pointer-events-auto",
          )}
        >
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
            className="flex h-11 min-w-0 items-center px-2 font-sans text-[15px] font-semibold leading-tight text-paper"
          >
            {/* A long name gives way before the chapter's number does. */}
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
          <span aria-hidden className="mx-1.5 h-6 w-px shrink-0 bg-paper/15" />
          <AmbienceButton variant="pill" />
          {reads ? <ReadAloudPillButton book={slug} chapter={chapter} title={`${bookName} ${chapter}`} /> : null}
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
