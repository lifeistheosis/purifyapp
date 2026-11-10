"use client";

// Try the reading modes (r3-07 A, "every row its own"): John 1 in Candlelight,
// and under it the small pages a reader picks from in Settings. Dark stands
// beside three that Plus adds: Candlelight, Monastery and one of the seventeen
// looks, Night sky (1.9). A tap repaints the page in the window, and only the
// page: the reader's own palette is never changed by a preview
// (lib/premium/plusTry.ts, TRY_PALETTES, held to app/globals.css).
//
// The three used to stand in one carved switch. Four names do not fit it:
// measured in the 21 languages, a name was cut at 390px in 5 and at 360px in
// 14. Settings' own small pages (ModeTile) carry a name of any length under
// them, and they are what a reader picks from once they have Plus.

import { useState, type CSSProperties } from "react";

import type { TryProps } from "@/components/billing/PlusTry";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { BIBLE_START_SIZE, useReaderPrefs } from "@/components/reader/ReaderPrefs";
import { ModeTile } from "@/components/settings/ReadingModePages";
import { TRY_CHAPTER, TRY_LOOK, TRY_PALETTES, TRY_PALETTE_ORDER, paletteVars, type TryPalette } from "@/lib/premium/plusTry";
import { READING_THEMES, type ReadingTheme } from "@/lib/reader/readingModes";

import { JohnPage } from "./TryBible";
import { TryWindow } from "./TryKit";

/** The four as the registry has them, in the preview's order. */
const MODES = TRY_PALETTE_ORDER.flatMap((p) => READING_THEMES.filter((m) => m.id === p.id));

/** Every page of a preview can be tried: nothing here is locked, and nothing is applied. */
const shown = () => true;

export default function TryReadingModes({ row }: TryProps) {
  const { t } = useTranslate();
  const { font } = useReaderPrefs(BIBLE_START_SIZE);
  const [palette, setPalette] = useState<TryPalette>("candlelight");
  const book = t("bible.books.john");
  const chapter = t("bible.chapterN", { n: TRY_CHAPTER.chapter });
  const pick = (id: ReadingTheme) => {
    if (id in TRY_PALETTES) setPalette(id as TryPalette);
  };

  return (
    <>
      {/* The window wears the palette it shows, never the reader's (TRY_PALETTES), and a look's own picture and sign with it. */}
      <div
        data-try-look={palette === TRY_LOOK ? palette : undefined}
        data-mock-allow="palette"
        data-mock-why="the preview wears the palette it shows, Dark, Candlelight, Monastery or Night sky, not the reader's"
      >
        <TryWindow label={t(row.name)} style={paletteVars(palette) as CSSProperties} className="motion-safe:transition-colors motion-safe:duration-300">
          <JohnPage />
        </TryWindow>
      </div>
      <div role="group" aria-label={t(row.name)} className="set-modes plus-try-modes" data-plus-try-modes="">
        {MODES.map((mode) => (
          <ModeTile key={mode.id} mode={mode} theme={palette} font={font} allows={shown} locked={false} book={book} chapter={chapter} onPick={pick} />
        ))}
      </div>
    </>
  );
}
