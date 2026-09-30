"use client";

import { useState } from "react";
import type { Verse, Token, ChapterCommentary } from "@/lib/bible/load";
import type { CrossRefItem } from "@/lib/bible/crossRefShape";
import { plusFeaturesNow } from "@/lib/entitlements/usePlusFeatures";
import { useUpgradeModal } from "@/components/billing/UpgradeModal";
import { CrossRefSheet } from "./CrossRefSheet";
import type { StrongsEntry } from "@/lib/bible/strongs";
import { VerseRow } from "./VerseRow";
import { MobileCommentarySheet } from "./MobileCommentarySheet";
import { HighlightLegend } from "./HighlightLegend";
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
  commentary,
  originalByNum,
  tokensByNum,
  englishTokensByNum,
  strongs,
  crossRefs,
}: {
  book: string;
  /** Display name of the book (e.g. "Matthew"). Used by the verse
   *  right-click menu to build copy-as-quote and copy-reference strings. */
  bookName: string;
  chapter: number;
  verses: Verse[];
  commentaryVerses?: number[];
  /** Full commentary map for the chapter. Passed through so the mobile
   *  commentary sheet can pull the right verse's notes when opened. */
  commentary?: ChapterCommentary;
  /** Verse number -> original-language text (Greek NT or Greek LXX OT). */
  originalByNum?: Record<number, string>;
  /** Verse number -> tokenized original-language words (NT only, Strong's-tagged). */
  tokensByNum?: Record<number, Token[]>;
  /** Verse number -> tokenized English words with Strong's (NT only).
   *  Used for Greek-hover-highlights-English. */
  englishTokensByNum?: Record<number, { w: string; s?: string }[]>;
  /** Strong's mini-lexicon: only entries used in this chapter. */
  strongs?: Record<string, StrongsEntry>;
  /** Verse number -> the passages it echoes (New Testament only,
   *  lib/bible/crossRefs.ts). A Purify Plus tool. */
  crossRefs?: Record<number, CrossRefItem[]>;
}) {
  const { size, font, leadingValue } = useReaderPrefs();
  const has = new Set(commentaryVerses ?? []);
  const [openVerse, setOpenVerse] = useState<number | null>(null);
  // Cross-references are Plus: shown to everyone, opened for Plus, and the
  // upgrade sheet named for them for everyone else
  // (lib/entitlements/usePlusFeatures.ts).
  const [refsVerse, setRefsVerse] = useState<number | null>(null);
  const upgrade = useUpgradeModal();
  const openRefs = (n: number) => {
    void plusFeaturesNow().then((ok) => {
      if (ok === false) upgrade.open("crossrefs");
      else setRefsVerse(n);
    });
  };
  return (
    <>
      <article
        className={cn(
          "text-paper/90",
          FONT_CLASSES[font],
          SIZE_CLASSES[size],
        )}
        style={leadingValue ? { lineHeight: leadingValue } : undefined}
      >
        <div className="space-y-2">
          {verses.map((v, i) => (
            <VerseRow
              key={v.n}
              book={book}
              bookName={bookName}
              chapter={chapter}
              verse={v}
              dropCap={i === 0}
              hasCommentary={has.has(v.n)}
              onOpenCommentary={
                has.has(v.n) ? () => setOpenVerse(v.n) : undefined
              }
              originalText={originalByNum?.[v.n]}
              originalTokens={tokensByNum?.[v.n]}
              englishTokens={englishTokensByNum?.[v.n]}
              strongs={strongs}
              onOpenCrossRefs={crossRefs?.[v.n]?.length ? () => openRefs(v.n) : undefined}
            />
          ))}
        </div>
        <HighlightLegend />
      </article>
      <CrossRefSheet
        book={book}
        chapter={chapter}
        verse={refsVerse}
        items={refsVerse !== null ? (crossRefs?.[refsVerse] ?? []) : []}
        onClose={() => setRefsVerse(null)}
      />
      {commentary && (
        <MobileCommentarySheet
          bookName={bookName}
          chapter={chapter}
          verse={openVerse}
          commentary={commentary}
          onClose={() => setOpenVerse(null)}
        />
      )}
    </>
  );
}
