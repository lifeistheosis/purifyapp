"use client";

import { useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { Sheet } from "@/components/ui/Sheet";
import { getBook } from "@/lib/bible/books";
import { useInterlinear } from "@/lib/bible/interlinear";
import { useBookmarks } from "@/lib/bookmarks";
import { softTick } from "@/lib/ui/softTick";

import { BibleSearch } from "./BibleSearch";
import { MobileChapterStrip } from "./MobileChapterStrip";
import { ToggleRow } from "./ReaderSettingsMenu";
import { TranslationList, useTranslationChoice } from "./TranslationList";

/**
 * The reader's ••• button, the second of the two round buttons over the page
 * (1.8, the owner's pick B of round 2, "The page": no bar at all). The
 * chapter opens on its words, so what stood above its title and in its top
 * bar until 1.7 is here, one tap away:
 *
 *  - first, the reader's settings (the owner's pick B of 2026-10-28, "Two
 *    (Aa inside •••)": they had a round Aa button of their own until then),
 *    opening the same sheet Aa opened, which this sheet makes way for,
 *  - the search: the app's one search (BibleSearch), opened on the Bible,
 *    where Everything is one door away for a reader who wants all of Purify,
 *  - the book's chapters, the slim strip with the one being read lit,
 *  - the translation, opening its own sheet as its pill did (this sheet goes
 *    first, so one sheet never opens over another),
 *  - the Greek beside the English, where it is offered,
 *  - and the chapter's bookmark.
 *
 * Until build 87 it also held "Search Purify" at its foot, the same screen
 * opened on Everything, and a Book row, which the chapter's title has done
 * since r3-20 A (it opens the books sheet). Two searches for one job and a
 * row for the title's: the owner's note 82 of build 86.
 *
 * The way back is the round button opposite; the pill at the foot turns the
 * chapter and holds Listen. lib/bible/__tests__/readerScreen.test.ts holds
 * the list.
 */
export function ReaderMoreSheet({
  open,
  onClose,
  onSettings,
  book,
  bookName,
  chapter,
  showInterlinear,
  configuredLicensed,
}: {
  open: boolean;
  onClose: () => void;
  /** Open the reader's settings in place of this sheet: the one who holds both closes this one as it opens them. */
  onSettings: () => void;
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
  const [translations, setTranslations] = useState(false);
  const { testament, list, current, choose, shown, chooseBible, label } = useTranslationChoice(book, configuredLicensed);
  const { on: greek, toggle: toggleGreek } = useInterlinear();
  const bookmarks = useBookmarks();
  const saved = bookmarks.isBookmarked({ kind: "bible-chapter", book, chapter });
  const bibleBook = getBook(book);
  const name = t(`bible.books.${book}`);

  /** This sheet goes, then the translations open. */
  const openTranslations = () => {
    onClose();
    setTranslations(true);
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
          {/* The sheet's first row: the reader's settings, Aa's own sheet. */}
          <SheetRow label={t("bible.readerSettings")} icon={<AaMark />} onClick={onSettings} />
          {/* The one search, on the Bible first (note 82). */}
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
            <SheetRow label={t("bible.translationLabel")} value={label} onClick={openTranslations} />
            {showInterlinear ? (
              <ToggleRow on={greek} touch label={t("bible.interlinearGreek")} onClick={toggleGreek} />
            ) : null}
            <ToggleRow on={saved} touch label={t("bible.bookmarkThisChapter")} onClick={toggleSaved} />
          </div>
        </div>
      </Sheet>

      <Sheet open={translations} onClose={() => setTranslations(false)} title={t("bible.translationLabel")}>
        <TranslationList
          testament={testament}
          list={list}
          current={current}
          configured={configuredLicensed}
          onChoose={(tr) => {
            setTranslations(false);
            choose(tr);
          }}
          book={book}
          shown={shown}
          onChooseBible={(bible) => {
            setTranslations(false);
            chooseBible(bible);
          }}
        />
      </Sheet>
    </>
  );
}

/**
 * The mark of the reader's settings, "Aa", drawn as the round button drew it
 * until it moved in here (the letter twice, as the settings' own size
 * previews draw it), so the mark is a drawing and not a word.
 */
function AaMark() {
  return (
    <span aria-hidden className="inline-flex shrink-0 items-baseline font-serif text-[14px] font-semibold leading-none">
      <span>A</span>
      <span>a</span>
    </span>
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
