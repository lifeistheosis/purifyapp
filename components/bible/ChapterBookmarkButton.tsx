"use client";

import { useBookmarks } from "@/lib/bookmarks";
import { Bookmark } from "@/components/ui/icons/Bookmark";
import { cn } from "@/lib/cn";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/**
 * Desktop chapter-bookmark toggle for the Bible reader control row. Mirrors
 * the pill styling of ReaderFontSizeButton / ReaderFontFamilyButton so it reads
 * as the same family, and writes a `bible-chapter` bookmark via the shared
 * `useBookmarks` hook (same plumbing as verse + saint-section bookmarks, so it
 * shows up on /saved and syncs to Supabase when signed in).
 *
 * The mobile equivalent lives in MobileReaderActions (the top-bar icon).
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
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isOn}
      title={isOn ? t("bible.removeChapterBookmark") : t("bible.bookmarkThisChapter")}
      aria-label={isOn ? t("bible.removeChapterBookmark") : t("bible.bookmarkThisChapter")}
      className={cn(
        "inline-flex items-center gap-2 rounded-pill border px-3 py-2 font-sans text-detail font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-paper/25",
        isOn
          ? "border-gold/55 bg-gold/15 text-gold hover:bg-gold/20"
          : "border-paper/15 bg-paper/[0.04] text-paper hover:border-paper/30 hover:bg-paper/10",
      )}
    >
      <Bookmark size={15} fill={isOn ? "currentColor" : "none"} />
      <span className="font-sans text-eyebrow font-semibold uppercase tracking-[1.2px]">
        {isOn ? t("common.saved") : t("common.save")}
      </span>
    </button>
  );
}
