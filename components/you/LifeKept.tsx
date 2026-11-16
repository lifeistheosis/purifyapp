"use client";

// The life a reader keeps, as one piece standing on the page (1.9, round 3 of
// the fifteen screens and build 98 note 11): the days in a row, this week's
// knots on the prayer rope, and under them what the week held ("This week ·
// 3 verses kept · 2 notes written"). The same piece on You, at the Ladder's
// foot, and on Profile.
//
// It was two things on You: the rope in a card of its own and the week's
// line loose under it, and fresh eyes met "0 days" there right after meeting
// it on Today. The streak is said once now, on the page, and a reader with
// no day kept yet is not shown a count at all: on You one invitation in words
// stands in the piece's place (`invite`), the only empty thing on the screen,
// and on Profile nothing does.

import { useMemo } from "react";

import { StreakRope } from "@/components/today/StreakRow";
import { WeekLine } from "@/components/you/WeekLine";
import { useJournal } from "@/lib/bible/journal";
import { useBookmarks } from "@/lib/bookmarks";
import { cn } from "@/lib/cn";
import { useJournalRecords } from "@/lib/journal/entries";
import { journalFeed, type JournalItem } from "@/lib/journal/feed";
import { savedFeed, type SavedItem } from "@/lib/saved/feed";
import { useSavedHighlights } from "@/lib/saved/highlights";
import { useSavedPassages, useSavedWords } from "@/lib/saved/passages";

export function LifeKept({
  feed,
  journal,
  invite = false,
  className,
}: {
  /** What the reader has kept and written, as the screen has already read it off the device. */
  feed: readonly SavedItem[];
  journal: readonly JournalItem[];
  /** With no day kept yet: the invitation in the piece's place, or nothing. */
  invite?: boolean;
  className?: string;
}) {
  return (
    <div data-life-kept="" className={cn("empty:hidden", className)}>
      <StreakRope className="you-rope" invite={invite}>
        <WeekLine className="mt-1.5" feed={feed} journal={journal} />
      </StreakRope>
    </div>
  );
}

/** The same piece on a screen that has not read the reader's keeping itself (Profile). */
export function LifeKeptHere({ className }: { className?: string }) {
  const { bookmarks } = useBookmarks();
  const highlights = useSavedHighlights();
  const passages = useSavedPassages();
  const marked = useSavedWords();
  const notes = useJournal();
  const records = useJournalRecords();
  const feed = useMemo(() => savedFeed(bookmarks, highlights, passages, marked), [bookmarks, highlights, passages, marked]);
  const journal = useMemo(() => journalFeed(notes, records), [notes, records]);
  return <LifeKept feed={feed} journal={journal} className={className} />;
}
