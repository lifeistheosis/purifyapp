"use client";

import { useBookmarks } from "@/lib/bookmarks";
import { Bookmark } from "@/components/ui/icons/Bookmark";
import { softTick } from "@/lib/ui/softTick";
import { useTranslate } from "@/components/i18n/MessagesProvider";

import { ReaderPill } from "./ReaderPill";

/**
 * The computer's chapter bookmark, in the reader's toolbar: the reader's pill
 * (components/bible/ReaderPill.tsx), filled once the chapter is saved. It
 * writes a `bible-chapter` bookmark through the shared `useBookmarks` hook
 * (the plumbing verses and saints' sections use, so it shows on /saved and
 * syncs when signed in).
 *
 * Phones and tablets save from the top bar's icon (MobileReaderActions): the
 * toolbar is the website's on a wide screen only.
 */
export function ChapterBookmarkButton({
  book,
  bookName,
  chapter,
}: {
  book: string;
  bookName: string;
  chapter: number;
}) {
  const { t } = useTranslate();
  const bookmarks = useBookmarks();
  const locator = { kind: "bible-chapter" as const, book, chapter };
  const isOn = bookmarks.isBookmarked(locator);

  function toggle() {
    bookmarks.toggle({
      kind: "bible-chapter",
      book,
      bookName,
      chapter,
      label: `${bookName} ${chapter}`,
    });
    // The same save as the phone's top bar, felt the same way where a
    // device can. Removing it is not felt.
    if (!isOn) softTick();
  }

  return (
    <ReaderPill
      pressed={isOn}
      onClick={toggle}
      aria-pressed={isOn}
      // The word on the pill is its name; the longer line is its tooltip.
      title={isOn ? t("bible.removeChapterBookmark") : t("bible.bookmarkThisChapter")}
    >
      <Bookmark size={15} fill={isOn ? "currentColor" : "none"} className="shrink-0" />
      <span>{isOn ? t("common.saved") : t("common.save")}</span>
    </ReaderPill>
  );
}
