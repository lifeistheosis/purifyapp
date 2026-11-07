"use client";

// A book saved to listen offline, marked where books are chosen (1.9, the
// owner's yes to Listening 7 of docs/1.9-build/BRAINSTORM.md: "saved books
// marked in the Bible's book list"). The saved look of the player's own
// offline mark (components/player/SaveOffline.tsx), small: a check in a ring.
// Only in the apps, where a reading can be saved; nothing on the website.

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { useSavedBooks } from "@/lib/readAloud/offline";
import { cn } from "@/lib/cn";

export function SavedBookMark({ book, className }: { book: string; className?: string }) {
  const { t } = useTranslate();
  const saved = useSavedBooks();
  if (!saved.has(book)) return null;
  const label = t("player.offline.saved", { book: t(`bible.books.${book}`) });
  return (
    <span role="img" aria-label={label} title={label} data-saved-book="" className={cn("inline-flex shrink-0 text-paper/55", className)}>
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M8.2 12.3l2.6 2.6 5-5.4" />
      </svg>
    </span>
  );
}
