"use client";

import { useBookmarks } from "@/lib/bookmarks";
import { cn } from "@/lib/cn";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/**
 * 🔖 toggle for a writing section. Used in the WritingReader section header.
 * Saves a `writing-section` bookmark via the shared hook so /saved can list
 * it next to Bible verses and chapters.
 */
export function SectionBookmarkButton({
  saintSlug,
  saintName,
  workSlug,
  workTitle,
  sectionN,
  sectionTitle,
}: {
  saintSlug: string;
  saintName: string;
  workSlug: string;
  workTitle: string;
  sectionN: number;
  sectionTitle: string;
}) {
  const { t } = useTranslate();
  const bookmarks = useBookmarks();
  const locator = {
    kind: "writing-section" as const,
    saintSlug,
    workSlug,
    sectionN,
  };
  const isOn = bookmarks.isBookmarked(locator);

  function toggle() {
    bookmarks.toggle({
      kind: "writing-section",
      saintSlug,
      saintName,
      workSlug,
      workTitle,
      sectionN,
      sectionTitle,
      label: `${saintName}, ${workTitle}, ${sectionTitle}`,
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isOn ? t("saints.removeSectionBookmark") : t("saints.bookmarkThisSection")}
      aria-pressed={isOn}
      title={isOn ? t("study.saved.removeBookmark") : t("saints.bookmarkThisSection")}
      className={cn(
        "h-8 w-8 rounded-full border flex items-center justify-center text-detail transition-colors duration-150 shrink-0",
        isOn
          ? "bg-gold/25 border-gold/55 text-gold"
          : "border-paper/15 text-paper/55 hover:bg-paper/10 hover:text-paper",
      )}
    >
      {isOn ? "★" : "☆"}
    </button>
  );
}
