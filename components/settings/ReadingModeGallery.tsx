"use client";

// Every palette, on a page of its own (1.9). The owner's words of
// 2026-11-10: "make a lot more designs ... and a nice scrollable theme
// system in the settings when picking a theme", and "I want clean and
// unique" (docs/1.9-build/notes/themes-fable.md, "The third set").
//
// Settings' Reading mode row opens it. First the three every reader has,
// under the screen's own line. Then a shelf for each family of Purify Plus
// palettes (lib/reader/readingModes.ts, THEME_FAMILIES): a shelf is Settings'
// own picture row, swept sideways, with the next page cut off at the edge so
// a reader sees there is more. Last the two earned by reading, as goals with
// how far the reader is, exactly as Settings shows them.
//
// Each palette is the same small lit page Settings draws
// (./ReadingModePages.tsx, ModeTile), taller here so the look's sign at the
// foot is in it. A family that needs Plus says so once, by its name, and only
// where the gate has said no, so Plus is never promised to every reader; a
// tap by a reader without it opens the same sheet the row opens. A tap by a
// reader with it applies the palette to the whole app at once, this page
// included, so the page itself is the preview. No haptic is added: the app
// ticks on its bars, not on a choice in Settings.

import { useEffect, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ReaderPrefsProvider, useReaderPrefs, type ReaderFont } from "@/components/reader/ReaderPrefs";
import { useEarnedPalettes } from "@/components/reader/useEarnedPalettes";
import { usePalettePick } from "@/components/reader/usePalettePick";
import type { EarnedPalettes } from "@/lib/reader/earned";
import { FREE_THEMES, READING_THEMES, THEME_FAMILIES, isCollectionTheme, themesOfFamily, type ReadingTheme } from "@/lib/reader/readingModes";
import { PREVIEW_CHAPTER } from "@/lib/settings/preview";

import { GoalTile, ModeTile } from "./ReadingModePages";

export function ReadingModeGallery() {
  // The pages' motion waits for the screen to be up, as Settings' does
  // (app/globals.css, "Settings: lit panels"): a choice read from the device
  // after the first draw must not move as the page opens.
  const [live, setLive] = useState(false);
  useEffect(() => {
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setLive(true));
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <ReaderPrefsProvider>
      <div className="set-root" data-live={live ? "" : undefined} data-reading-modes="">
        <Shelves />
      </div>
    </ReaderPrefsProvider>
  );
}

/** Wired to the reader's palette and the Plus gate. */
function Shelves() {
  const { theme, font } = useReaderPrefs();
  // The tap every picker shares, the palette the app is in (the check stands
  // there) and the app's one Plus answer (components/reader/usePalettePick.ts).
  const { pick, worn, allows, locked } = usePalettePick();
  return <GalleryShelves theme={theme} worn={worn} font={font} allows={allows} locked={locked} onPick={pick} />;
}

/** The shelves themselves, from what they are handed (lib/settings/__tests__/readingModeGallery.test.ts draws them). */
export function GalleryShelves({
  theme,
  worn,
  font,
  allows,
  locked,
  onPick,
}: {
  theme: ReadingTheme;
  /** The palette the app is in, where the caller knows it (ModeTile says what it is for). */
  worn?: ReadingTheme;
  font: ReaderFont;
  allows: (theme: ReadingTheme) => boolean;
  /** The gate has answered no: each Plus family says Purify Plus, once. */
  locked: boolean;
  onPick: (theme: ReadingTheme) => void;
}) {
  const { t } = useTranslate();
  const earned = useEarnedPalettes();
  const [goal, setGoal] = useState<keyof EarnedPalettes | null>(null);
  const book = t("bible.books.john");
  const chapter = t("bible.chapterN", { n: PREVIEW_CHAPTER });
  const tile = (mode: (typeof READING_THEMES)[number]) => (
    <ModeTile key={mode.id} mode={mode} theme={theme} worn={worn} font={font} allows={allows} locked={locked} book={book} chapter={chapter} onPick={onPick} mark={false} />
  );
  const free = READING_THEMES.filter((m) => FREE_THEMES.includes(m.id));
  const kept = READING_THEMES.filter((m) => isCollectionTheme(m.id));
  return (
    <>
      <section className="set-fam mt-7 scroll-mt-24 first:mt-0">
        <p className="set-hint">{t("settings.readingHint")}</p>
        <div role="group" aria-label={t("ui.readingMode")} className="set-shelf">
          {free.map(tile)}
        </div>
      </section>
      {THEME_FAMILIES.map((family) => (
        <section key={family.id} className="set-fam mt-7 scroll-mt-24 first:mt-0" data-family={family.id}>
          <div className="set-fam-head">
            <h2 className="set-h">{t(family.labelKey)}</h2>
            {/* Once for the family, and only where the gate has said no. */}
            {locked ? <span className="set-mode-plus">Purify Plus</span> : null}
          </div>
          <p className="set-hint">{t(family.lineKey)}</p>
          <div role="group" aria-label={t(family.labelKey)} className="set-shelf">
            {themesOfFamily(family.id).map(tile)}
          </div>
        </section>
      ))}
      <section className="set-fam mt-7 scroll-mt-24 first:mt-0">
        <h2 className="set-h">{t("settings.paletteEarnedRow")}</h2>
        <div role="group" aria-label={t("settings.paletteEarnedRow")} className="set-shelf">
          {kept.map((mode) => {
            const id = mode.id as keyof EarnedPalettes;
            const progress = earned[id];
            // Earned, or already applied (so it can be put down again): a palette like the rest.
            if (!progress || progress.earned || theme === mode.id) return tile(mode);
            return <GoalTile key={mode.id} mode={mode} progress={progress} open={goal === id} font={font} book={book} chapter={chapter} onToggle={() => setGoal(goal === id ? null : id)} />;
          })}
        </div>
        {goal ? (
          <p id="set-palette-goal" role="status" className="set-mode-goal-line" data-palette-goal-line="">
            {t(goal === "councils" ? "settings.paletteEarnCouncils" : "settings.paletteEarnCappadocian", { count: earned[goal].read, total: earned[goal].of })}
            {/* Plus is never promised to every reader: a reader without it is told before they read for it. */}
            {locked ? ` ${t("settings.palettePlusNote")}` : null}
          </p>
        ) : null}
      </section>
    </>
  );
}
