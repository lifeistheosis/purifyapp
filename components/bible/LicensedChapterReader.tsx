"use client";

import { ScriptureAttribution } from "./ScriptureAttribution";
import { Fums } from "./Fums";
import {
  FONT_CLASSES,
  SIZE_CLASSES,
  useReaderPrefs,
} from "@/components/reader/ReaderPrefs";
import { cn } from "@/lib/cn";
import type { LicensedChapter } from "@/lib/bible/api-bible";

/**
 * Renders a licensed translation (NKJV/NIV/NLT) exactly as API.Bible delivers
 * it: the chapter HTML is shown verbatim (footnotes included), with no
 * Strong's/interlinear/word-tagging overlay (content integrity), followed by
 * the required attribution and FUMS tracker.
 *
 * The reader's font-family and size preferences DO apply here — they only
 * restyle, never alter, the delivered text — so a licensed chapter honors the
 * same Size/Font controls as the public-domain reader.
 */
export function LicensedChapterReader({
  chapter,
  transId,
  translationLabel,
}: {
  chapter: LicensedChapter;
  transId: string;
  translationLabel: string;
}) {
  const { size, font } = useReaderPrefs();
  return (
    <article>
      <div
        className={cn(
          // Font-family + size come from the shared reader prefs so the
          // Size/Font pills work identically to the public-domain reader.
          // SIZE_CLASSES sets the base font-size + leading on the container;
          // the API's <p> tags inherit it (they carry no explicit size).
          FONT_CLASSES[font],
          SIZE_CLASSES[size],
          "text-paper/90",
          // `.licensed-scripture` (globals.css) restyles every USX/USFM class
          // the API emits — poetry, footnotes, cross-refs, red-letter, headings,
          // small-caps — without altering the delivered text.
          "licensed-scripture",
        )}
        dangerouslySetInnerHTML={{ __html: chapter.html }}
      />
      <ScriptureAttribution
        transId={transId}
        copyright={chapter.copyright}
        translationLabel={translationLabel}
      />
      <Fums fumsToken={chapter.fumsToken} />
    </article>
  );
}
