"use client";

// Three-row preview of the user's most recent bookmarks, read through
// lib/bookmarks.ts, the same store /saved and the account dashboard use.
// It used to parse purify:bookmarks itself against a hand-written
// permissive type, which is how the three surfaces drifted apart.
// Empty state is a single quiet line.

import Link from "next/link";
import { useMemo } from "react";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { bookmarkHref, useBookmarks, type Bookmark } from "@/lib/bookmarks";

const KIND_LABEL_KEY: Record<Bookmark["kind"], string> = {
  "bible-verse": "ui.savedKindVerse",
  "bible-chapter": "bible.chapterLabel",
  "writing-section": "ui.savedKindWriting",
  prayer: "onboard.focus.prayer",
  "prayer-rule": "ui.savedKindPrayerRule",
  "history-event": "study.saved.history",
  product: "ui.savedKindIcon",
};

export function SavedPreview() {
  const { t, tn } = useTranslate();
  const { bookmarks } = useBookmarks();
  const total = bookmarks.length;
  const items = useMemo(
    () => [...bookmarks].sort((a, b) => b.addedAt - a.addedAt).slice(0, 3),
    [bookmarks],
  );

  return (
    <div className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-4">
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <p className="font-sans text-eyebrow uppercase tracking-[1.5px] text-paper/55">
          {t("ui.recentlySaved")}
        </p>
        <Link
          href="/saved"
          className="font-sans text-caption text-paper/65 active:text-paper transition-colors"
        >
          {total > 0 ? tn("ui.allSavedCount", total) : t("ui.savedArrow")}
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="font-sans text-detail text-paper/55 italic">
          {t("ui.starAVerseChapterPrayer")}
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((b) => (
            <li key={b.id}>
              <Link
                href={bookmarkHref(b)}
                className="press-card flex items-center justify-between gap-3 rounded-md border border-paper/8 bg-paper/[0.02] px-3 py-2.5"
              >
                <span className="font-sans text-detail text-paper truncate flex-1">
                  {b.label ?? t("prayers.reader.bookmark")}
                </span>
                <span className="shrink-0 inline-flex items-center rounded-full border border-paper/15 bg-paper/[0.04] px-2 py-[1px] font-sans text-eyebrow font-semibold uppercase tracking-[1px] text-paper/65">
                  {t(KIND_LABEL_KEY[b.kind] ?? b.kind)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
