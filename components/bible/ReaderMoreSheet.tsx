"use client";

import { useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { openSearch } from "@/components/search/SearchTrigger";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { Search } from "@/components/ui/icons/Search";
import { Sheet } from "@/components/ui/Sheet";
import { getBook } from "@/lib/bible/books";
import { useInterlinear } from "@/lib/bible/interlinear";
import { useBookmarks } from "@/lib/bookmarks";
import { softTick } from "@/lib/ui/softTick";

import { BibleSearch } from "./BibleSearch";
import { MobileChapterSheet } from "./MobileChapterSheet";
import { MobileChapterStrip } from "./MobileChapterStrip";
import { ToggleRow } from "./ReaderSettingsMenu";
import { TranslationList, useTranslationChoice } from "./TranslationList";

/**
 * The reader's ••• button, the second of the two round buttons over the page
 * (1.8, the owner's pick B of round 2, "The page": no bar at all). The
 * chapter opens on its words, so what stood above its title and in its top
 * bar until 1.7 is here, one tap away:
 *
 *  - the search for a verse (BibleSearch, which opens as a screen of its own),
 *  - the book's chapters, the slim strip with the one being read lit,
 *  - the translation and the book, each opening its own sheet as the pills
 *    did (this sheet goes first, so one sheet never opens over another),
 *  - the Greek beside the English, where it is offered,
 *  - the chapter's bookmark,
 *  - and the search of the whole app, which every phone bar carried.
 *
 * The way back is the round button opposite; Aa holds the reader's settings
 * (ReaderSettingsSheet); the pill at the foot turns the chapter and holds
 * Listen. lib/bible/__tests__/readerScreen.test.ts holds the list.
 */
export function ReaderMoreSheet({
  open,
  onClose,
  book,
  bookName,
  chapter,
  showInterlinear,
  configuredLicensed,
}: {
  open: boolean;
  onClose: () => void;
  /** The book's slug. */
  book: string;
  /** The book's English name: the bookmark's label, as the computer's Save writes it. */
  bookName: string;
  chapter: number;
  /** The Greek can stand beside this chapter's verses. */
  showInterlinear: boolean;
  /** Licensed translations that are set up. */
  configuredLicensed: readonly string[];
}) {
  const { t } = useTranslate();
  const [next, setNext] = useState<"translation" | "book" | null>(null);
  const { testament, list, current, choose } = useTranslationChoice(book, configuredLicensed);
  const { on: greek, toggle: toggleGreek } = useInterlinear();
  const bookmarks = useBookmarks();
  const saved = bookmarks.isBookmarked({ kind: "bible-chapter", book, chapter });
  const bibleBook = getBook(book);
  const name = t(`bible.books.${book}`);

  /** This sheet goes, then the next one opens. */
  const go = (to: "translation" | "book") => {
    onClose();
    setNext(to);
  };

  function toggleSaved() {
    bookmarks.toggle({
      kind: "bible-chapter",
      book,
      bookName,
      chapter,
      label: `${bookName} ${chapter}`,
    });
    // Saving the chapter is felt in the phone apps. Removing it is not.
    if (!saved) softTick();
  }

  return (
    <>
      <Sheet open={open} onClose={onClose} title={`${name} ${chapter}`}>
        <div className="space-y-4 pt-1">
          <BibleSearch layer onNavigate={onClose} />
          {bibleBook ? (
            // The strip runs to the sheet's edges as it ran to the screen's:
            // its row reaches past its box by the page's gutter, which is a
            // little more than the sheet's.
            <div className="mx-1">
              <MobileChapterStrip book={bibleBook} current={chapter} onPick={onClose} />
            </div>
          ) : null}
          <div className="space-y-2.5">
            <SheetRow label={t("bible.translationLabel")} value={current.shortLabel} onClick={() => go("translation")} />
            <SheetRow label={t("bible.bookLabel")} value={name} onClick={() => go("book")} />
            {showInterlinear ? (
              <ToggleRow on={greek} touch label={t("bible.interlinearGreek")} onClick={toggleGreek} />
            ) : null}
            <ToggleRow on={saved} touch label={t("bible.bookmarkThisChapter")} onClick={toggleSaved} />
            <SheetRow
              label={t("search.ariaLabel")}
              icon={<Search size={16} className="shrink-0" />}
              onClick={() => {
                onClose();
                openSearch();
              }}
            />
          </div>
        </div>
      </Sheet>

      <Sheet open={next === "translation"} onClose={() => setNext(null)} title={t("bible.translationLabel")}>
        <TranslationList
          testament={testament}
          list={list}
          current={current}
          configured={configuredLicensed}
          onChoose={(tr) => {
            setNext(null);
            choose(tr);
          }}
        />
      </Sheet>
      <MobileChapterSheet open={next === "book"} onClose={() => setNext(null)} currentSlug={book} currentChapter={chapter} />
    </>
  );
}

/** A row that opens something: its name, then what it holds now. */
function SheetRow({
  label,
  value,
  icon,
  onClick,
}: {
  label: string;
  value?: string;
  icon?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={onClick}
      className="inline-flex min-h-12 w-full items-center justify-between gap-3 rounded-pill border border-paper/15 bg-paper/[0.04] px-3.5 font-sans text-detail font-medium text-paper/85 hover:border-paper/30 hover:bg-paper/10"
    >
      <span className="inline-flex min-w-0 items-center gap-2">
        {icon}
        <span className="truncate">{label}</span>
      </span>
      <span className="inline-flex min-w-0 shrink items-center gap-1 font-semibold">
        {value ? <span className="truncate">{value}</span> : null}
        <ChevronRight size={14} className="shrink-0 text-paper/55 rtl:-scale-x-100" />
      </span>
    </button>
  );
}
