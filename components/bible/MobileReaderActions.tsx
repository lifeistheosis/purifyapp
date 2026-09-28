"use client";

import { useState } from "react";
import { ReaderSettingsSheet } from "@/components/bible/ReaderSettingsMenu";
import { Bookmark } from "@/components/ui/icons/Bookmark";
import { Settings } from "@/components/ui/icons/Settings";
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
 *  - Settings: opens ReaderSettingsSheet, the same sheet the Reader
 *    pill under the book picker opens, with every reader preference in
 *    it. It used to offer typeface and size only, so the gear and the
 *    pill showed two different panels for one set of settings. The
 *    preferences are the ones the saints reader uses, so a pick carries
 *    across.
 *
 * Hidden on `md+`, desktop has the inline control row.
 */
export function MobileReaderActions({
  book,
  bookName,
  chapter,
  showInterlinear = false,
}: {
  book: string;
  bookName: string;
  chapter: number;
  /** Whether this chapter offers the Interlinear Greek toggle (NT, public-domain text). */
  showInterlinear?: boolean;
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

      <ReaderSettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        showInterlinear={showInterlinear}
      />
    </>
  );
}
