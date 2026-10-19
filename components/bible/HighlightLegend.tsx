"use client";

import { useMemo, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Pen } from "@/components/ui/icons/Pen";
import { HIGHLIGHT_COLORS, highlightVars, useHighlightNames } from "@/lib/bible/highlightColors";
import { useSavedHighlights } from "@/lib/saved/highlights";
import { HighlightNamesSheet } from "./HighlightNamesSheet";

/**
 * The key to a chapter's highlights, under its last verse (1.7.1): each
 * colour the chapter wears, with what it means to the reader, and the way to
 * name them.
 *
 * Shown only on a chapter with a highlight in it. Until 1.7.1 every chapter
 * carried a boxed legend of all five colours and their fixed meanings,
 * highlighted or not, with an "Edit meanings" that turned each into a field
 * at the foot of the page; the names are given in their own sheet now
 * (HighlightNamesSheet), from here, the verse's tools and Saved.
 */
export function HighlightLegend({ book, chapter }: { book: string; chapter: number }) {
  const { t } = useTranslate();
  const { labelOf } = useHighlightNames();
  const highlights = useSavedHighlights();
  const [naming, setNaming] = useState(false);

  // The colours this chapter wears, in the palette's order.
  const used = useMemo(() => {
    const here = new Set(highlights.filter((h) => h.book === book && h.chapter === chapter).map((h) => h.color));
    return HIGHLIGHT_COLORS.map((c) => c.id).filter((id) => here.has(id));
  }, [highlights, book, chapter]);

  if (used.length === 0) return null;

  return (
    <section aria-label={t("bible.highlightColors")} className="mt-10 border-t border-paper/10 pt-3">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
        <ul className="flex min-w-0 flex-1 flex-wrap items-center gap-x-5 gap-y-2 py-2">
          {used.map((id) => (
            <li key={id} className="inline-flex min-w-0 items-center gap-2">
              <span
                aria-hidden
                data-hl-color={id}
                style={highlightVars(id) as React.CSSProperties}
                className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--hl-swatch)]"
              />
              <span className="truncate font-sans text-caption text-paper/70">{labelOf(id)}</span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setNaming(true)}
          className="tap-press hit-44 -me-2 inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-pill px-2 font-sans text-caption font-semibold text-paper/70 hover:text-paper active:bg-paper/10"
        >
          <Pen size={13} />
          {t("bible.highlightNames.open")}
        </button>
      </div>
      <HighlightNamesSheet open={naming} onClose={() => setNaming(false)} />
    </section>
  );
}
