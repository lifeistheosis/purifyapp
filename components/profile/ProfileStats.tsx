"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { useReadingStats } from "@/lib/profile/useReadingStats";

/**
 * Live counters drawn from localStorage, shared with the You tab through
 * lib/profile/useReadingStats.ts. This surface and that one used to run
 * two separate scans of the same keys, which is two answers waiting to
 * disagree about how much a reader has gathered.
 *
 * Four cards: verses highlighted, paragraphs highlighted, notes written,
 * bookmarks saved. The numbers update without a reload because every
 * highlight, note, or bookmark change broadcasts an event the hook
 * listens to. No prayer-streak counters: the rule is the rule, the day is
 * the day.
 */
export function ProfileStats() {
  const { t } = useTranslate();
  const stats = useReadingStats();

  const readingItems = [
    { id: "verses", label: t("ui.versesHighlighted"), value: stats.verses },
    {
      id: "paragraphs",
      label: t("ui.paragraphsHighlighted"),
      value: stats.paragraphs,
    },
    { id: "notes", label: t("ui.notesWritten"), value: stats.notes },
    { id: "bookmarks", label: t("ui.bookmarksSaved"), value: stats.bookmarks },
  ];
  return (
    <>
      <section className="mt-8">
        <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
          {t("ui.yourReading")}
        </p>
        <ul className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {readingItems.map((it) => (
            <li
              key={it.id}
              className="rounded-md border border-paper/12 bg-paper/[0.03] px-5 py-5"
            >
              <p className="font-sans text-heading md:text-display-sm font-bold text-gold tabular-nums leading-none">
                {it.value}
              </p>
              <p className="mt-2 font-sans text-caption text-paper/65 leading-[1.4]">
                {it.label}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
