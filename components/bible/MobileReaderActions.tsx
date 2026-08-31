"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Bookmark } from "@/components/ui/icons/Bookmark";
import { Settings } from "@/components/ui/icons/Settings";
import {
  ReaderFontFamilyButton,
  ReaderFontSizeButton,
} from "@/components/reader/ReaderPrefs";
import { ReadingModeChips } from "@/components/reader/ReadingModeChips";
import { useBookmarks } from "@/lib/bookmarks";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";

/**
 * Mobile-only trailing-slot action cluster for the Bible reader top
 * bar. Two stub-or-live affordances modeled on the YouVersion top
 * right cluster:
 *
 *  - Bookmark: toggles a `bible-chapter` bookmark via the shared
 *    useBookmarks hook (so it appears on /saved and syncs when the
 *    reader is signed in). Filled gold when the current chapter is
 *    already saved; tapping again removes it.
 *  - Settings: opens the existing `ReaderFontFamilyButton` +
 *    `ReaderFontSizeButton` controls inside a bottom Sheet. These
 *    are the same controls the saints reader uses, so a reader's
 *    pick carries across.
 *
 * Hidden on `md+`, desktop has the inline control row.
 */
export function MobileReaderActions({
  book,
  bookName,
  chapter,
}: {
  book: string;
  bookName: string;
  chapter: number;
}) {
  const { t } = useTranslate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const bookmarks = useBookmarks();
  const isOn = bookmarks.isBookmarked({ kind: "bible-chapter", book, chapter });

  function toggleBookmark() {
    bookmarks.toggle({
      kind: "bible-chapter",
      book,
      bookName,
      chapter,
      label: `${bookName} ${chapter}`,
    });
  }

  return (
    <>
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          aria-pressed={isOn}
          aria-label={
            isOn
              ? t("bible.removeChapterBookmark")
              : t("bible.bookmarkThisChapter")
          }
          onClick={toggleBookmark}
          className={cn(
            "h-10 w-10 inline-flex items-center justify-center rounded-pill transition-colors",
            isOn ? "text-gold" : "text-paper/70 hover:text-paper",
          )}
        >
          <Bookmark size={18} fill={isOn ? "currentColor" : "none"} />
        </button>
        <button
          type="button"
          aria-label={t("bible.readerSettings")}
          onClick={() => setSettingsOpen(true)}
          className="h-10 w-10 inline-flex items-center justify-center rounded-pill text-paper/70 hover:text-paper"
        >
          <Settings size={18} />
        </button>
      </div>

      <Sheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title={t("bible.readerSettings")}
      >
        <div className="space-y-4 py-2">
          <div>
            <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/55 mb-2">
              {t("bible.typeface")}
            </p>
            <ReaderFontFamilyButton />
          </div>
          <div>
            <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/55 mb-2">
              {t("bible.sizeLabel")}
            </p>
            <ReaderFontSizeButton />
          </div>
          <ReadingModeChips />
          <p className="font-sans text-caption text-paper/45 leading-[1.55] pt-2">
            {t("bible.readerPrefsNote")}
          </p>
        </div>
      </Sheet>
    </>
  );
}
