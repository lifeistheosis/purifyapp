"use client";

import type { Verse, Token } from "@/lib/bible/load";
import type { StrongsEntry } from "@/lib/bible/strongs";
import { VerseRow } from "./VerseRow";
import {
  FONT_CLASSES,
  SIZE_CLASSES,
  useReaderPrefs,
} from "@/components/reader/ReaderPrefs";
import { cn } from "@/lib/cn";

export function ChapterReader({
  book,
  bookName,
  chapter,
  verses,
  commentaryVerses,
  originalByNum,
  tokensByNum,
  englishTokensByNum,
  strongs,
}: {
  book: string;
  /** Display name of the book (e.g. "Matthew"). Used by the verse
   *  right-click menu to build copy-as-quote and copy-reference strings. */
  bookName: string;
  chapter: number;
  verses: Verse[];
  commentaryVerses?: number[];
  /** Verse number -> original-language text (Greek NT or Greek LXX OT). */
  originalByNum?: Record<number, string>;
  /** Verse number -> tokenized original-language words (NT only, Strong's-tagged). */
  tokensByNum?: Record<number, Token[]>;
  /** Verse number -> tokenized English words with Strong's (NT only).
   *  Used for Greek-hover-highlights-English. */
  englishTokensByNum?: Record<number, { w: string; s?: string }[]>;
  /** Strong's mini-lexicon: only entries used in this chapter. */
  strongs?: Record<string, StrongsEntry>;
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
            bookName={bookName}
            chapter={chapter}
            verse={v}
            hasCommentary={has.has(v.n)}
            originalText={originalByNum?.[v.n]}
            originalTokens={tokensByNum?.[v.n]}
            englishTokens={englishTokensByNum?.[v.n]}
            strongs={strongs}
          />
        ))}
      </div>
    </article>
  );
}
