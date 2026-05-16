"use client";

import type { Verse } from "@/lib/bible/load";
import { VerseRow } from "./VerseRow";
import {
  FONT_CLASSES,
  SIZE_CLASSES,
  useReaderPrefs,
} from "@/components/reader/ReaderPrefs";
import { cn } from "@/lib/cn";

export function ChapterReader({
  book,
  chapter,
  verses,
  commentaryVerses,
  originalByNum,
}: {
  book: string;
  chapter: number;
  verses: Verse[];
  commentaryVerses?: number[];
  /** Verse number -> original-language text (Greek NT or Greek LXX OT). */
  originalByNum?: Record<number, string>;
}) {
  const { size, font } = useReaderPrefs();
  const has = new Set(commentaryVerses ?? []);
  return (
    <article
      className={cn(
        "text-paper/90",
        FONT_CLASSES[font],
        SIZE_CLASSES[size],
      )}
    >
      <div className="space-y-1.5">
        {verses.map((v) => (
          <VerseRow
            key={v.n}
            book={book}
            chapter={chapter}
            verse={v}
            hasCommentary={has.has(v.n)}
            originalText={originalByNum?.[v.n]}
          />
        ))}
      </div>
    </article>
  );
}
