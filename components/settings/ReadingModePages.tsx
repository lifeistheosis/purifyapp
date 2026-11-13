"use client";

// The reading modes in Settings (1.8, the owner's pick A of round 3, "Lit
// panels"): five small pages side by side, each the Bible's page in its own
// palette, so each mode is shown as it really looks. His note 9 of build 80
// asked for exactly that: they were chips with a dot of colour.
//
// The same palettes and the same Plus gate as the chips the Bible's own
// settings keep (components/reader/ReadingModeChips.tsx, unchanged): Dark,
// Light and True black for every reader; Candlelight and Monastery with Plus,
// marked so only where the gate has said no; a collection palette only while
// it is the one applied. Each page's colours are its palette's own tokens,
// held beside them in app/globals.css ("Settings: lit panels") and checked
// against them by lib/settings/__tests__/litPanels.test.ts.
//
// From 1.9 there are fifteen looks beside these (lib/reader/readingModes.ts).
// They are chosen on a page of their own, which this row's head opens
// (./ReadingModeGallery.tsx), so the row stays the five a reader knows. A
// look that is applied stands here as a sixth page, as an applied collection
// palette does, so it can be seen and put down from Settings too. The page
// and the tile are exported for that gallery, which draws every palette with
// them.

import { Fragment, useRef, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { FONT_CLASSES, useReaderPrefs, type ReaderFont } from "@/components/reader/ReaderPrefs";
import { useEarnedPalettes } from "@/components/reader/useEarnedPalettes";
import { usePalettePick } from "@/components/reader/usePalettePick";
import { Check } from "@/components/ui/icons/Check";
import { cn } from "@/lib/cn";
import type { EarnedPalettes } from "@/lib/reader/earned";
import { READING_THEMES, isCollectionTheme, themeWorn, type ReadingTheme } from "@/lib/reader/readingModes";
import { JOHN_1_OPENING, PREVIEW_CHAPTER } from "@/lib/settings/preview";
import { movePage } from "@/lib/ui/inPageMove";

/** Wired to the reader's palette and the Plus gate. */
export function ReadingModePages() {
  const { theme, font } = useReaderPrefs();
  // The tap every picker shares, the palette the app is in (the check stands
  // there) and the app's one Plus answer (components/reader/usePalettePick.ts).
  const { pick, worn, allows, locked } = usePalettePick();
  return <ModePages theme={theme} worn={worn} font={font} allows={allows} locked={locked} onPick={pick} />;
}

export function ModePages({
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
  /** The gate has answered no: the paid pages say Purify Plus. */
  locked: boolean;
  onPick: (theme: ReadingTheme) => void;
}) {
  const { t } = useTranslate();
  // The five palettes, as ever, and under them the two earned by reading (1.9,
  // rec 79, lib/reader/earned.ts): until earned they stand as goals, with how
  // far the reader is, and say how under their row once tapped.
  const earned = useEarnedPalettes();
  const [goal, setGoal] = useState<keyof EarnedPalettes | null>(null);
  const goalBox = useRef<HTMLDivElement>(null);
  // The five, and a look only while it is the one applied (1.9): the rest are on their own page.
  const modes = READING_THEMES.filter((m) => !isCollectionTheme(m.id) && (!m.look || m.id === theme));
  const kept = READING_THEMES.filter((m) => isCollectionTheme(m.id));
  const book = t("bible.books.john");
  const chapter = t("bible.chapterN", { n: PREVIEW_CHAPTER });
  const palette = (mode: ReadingMode) => (
    <ModeTile key={mode.id} mode={mode} theme={theme} worn={worn} font={font} allows={allows} locked={locked} book={book} chapter={chapter} onPick={onPick} />
  );
  return (
    <>
      <div
        role="group"
        aria-label={t("ui.readingMode")}
        className="set-modes"
        data-count={modes.length}
        // What the release's tour lights for Settings (lib/whatsNew/tour.ts).
        data-tour="settings-panels"
      >
        {modes.map(palette)}
      </div>
      <div role="group" aria-label={t("settings.paletteEarnedRow")} className="set-modes set-modes-earned" data-count={kept.length}>
        {kept.map((mode) => {
          const id = mode.id as keyof EarnedPalettes;
          const progress = earned[id];
          // Earned, or already applied (so it can be put down again): a palette like the rest.
          if (!progress || progress.earned || theme === mode.id) return palette(mode);
          return (
            <GoalTile key={mode.id} mode={mode} progress={progress} open={goal === id} font={font} book={book} chapter={chapter} onToggle={() => movePage(() => setGoal(goal === id ? null : id), { grows: [goalBox.current] })} />
          );
        })}
      </div>
      {/* The goal's line is let down under the row and what follows glides,
          as a change inside the page (lib/ui/inPageMove.ts), where what was
          below jumped 47px (Gate 2.0). Its place stands empty, and takes no
          room, until a goal is open. */}
      <div ref={goalBox}>
        {goal ? (
          <p id="set-palette-goal" role="status" className="set-mode-goal-line" data-palette-goal-line="">
            {t(goal === "councils" ? "settings.paletteEarnCouncils" : "settings.paletteEarnCappadocian", { count: earned[goal].read, total: earned[goal].of })}
            {/* Plus is never promised to every reader: a reader without it is told before they read for it. */}
            {locked ? ` ${t("settings.palettePlusNote")}` : null}
          </p>
        ) : null}
      </div>
    </>
  );
}

export type ReadingMode = (typeof READING_THEMES)[number];

/**
 * A palette as a reader picks it: its small page, the check on the one
 * applied, its name, and Purify Plus under a paid one where the gate has said
 * no. `mark` false leaves that last line out, for a shelf whose family says
 * it once (./ReadingModeGallery.tsx); the title keeps it either way.
 */
export function ModeTile({
  mode,
  theme,
  worn,
  font,
  allows,
  locked,
  book,
  chapter,
  onPick,
  mark = true,
}: {
  mode: ReadingMode;
  theme: ReadingTheme;
  /**
   * The palette the app is in, read off the page (useThemeWorn): the check
   * stands on it. Without it, what the reader's own palette and the gate
   * make of it (themeWorn), which is all a drawing of this tile off the
   * device can know; on the device the page itself also knows the night
   * (Candlelight at Vespers).
   */
  worn?: ReadingTheme;
  font: ReaderFont;
  allows: (theme: ReadingTheme) => boolean;
  locked: boolean;
  book: string;
  chapter: string;
  onPick: (theme: ReadingTheme) => void;
  mark?: boolean;
}) {
  const { t } = useTranslate();
  const allowed = allows(mode.id);
  // The check stands on the palette the app is wearing: a stored palette the
  // gate does not let this reader wear leaves the app in Dark, and Dark then
  // carries the check.
  const on = (worn ?? themeWorn(theme, allows)) === mode.id;
  const paid = locked && !allowed;
  const name = mode.labelKey ? t(mode.labelKey) : mode.label;
  const blurb = mode.blurbKey ? t(mode.blurbKey) : mode.blurb;
  return (
    <button type="button" aria-pressed={on} title={paid ? `${blurb}. Purify Plus.` : blurb} onClick={() => onPick(mode.id)} className="set-mode">
      <ModePage palette={mode.id} font={font} book={book} chapter={chapter} />
      {on ? (
        <span aria-hidden className="set-check set-mode-check">
          <Check size={10} strokeWidth={2.8} />
        </span>
      ) : null}
      <span className="set-mode-name">{name}</span>
      {paid && mark ? <span className="set-mode-plus">Purify Plus</span> : null}
    </button>
  );
}

/** A palette still to be earned by reading (lib/reader/earned.ts): its page drawn whole but unlit, and how far the reader is. No dashed edge (build 93 note 4). */
export function GoalTile({
  mode,
  progress,
  open,
  font,
  book,
  chapter,
  onToggle,
}: {
  mode: ReadingMode;
  progress: { read: number; of: number };
  open: boolean;
  font: ReaderFont;
  book: string;
  chapter: string;
  onToggle: () => void;
}) {
  const { t } = useTranslate();
  return (
    <button type="button" data-palette-goal={mode.id} aria-expanded={open} aria-controls="set-palette-goal" onClick={onToggle} className="set-mode set-mode-goal">
      <ModePage palette={mode.id} font={font} book={book} chapter={chapter} />
      <span className="set-mode-name">{mode.labelKey ? t(mode.labelKey) : mode.label}</span>
      <span className="set-mode-progress">{t("settings.paletteProgress", { count: progress.read, total: progress.of })}</span>
    </button>
  );
}

/**
 * One page: the book, its chapter, a rule and the opening verses, in the
 * palette's ground and ink. Drawn at three times its size and scaled down,
 * so its small type is set as type (a browser's least font size would
 * otherwise swell it).
 *
 * It is a picture of a page, hidden from a screen reader, and the words a
 * reader goes by are the palette's name under it. So it says to the mock
 * checker (scripts/mock-check.mjs) what it is: its colours are one palette's
 * own whatever palette is on, and its small type is not held as body text.
 */
export function ModePage({
  palette,
  font,
  book,
  chapter,
}: {
  palette: ReadingTheme;
  font: ReaderFont;
  book: string;
  chapter: string;
}) {
  return (
    <span
      aria-hidden
      className="set-mode-page"
      data-palette={palette}
      data-mock-allow="contrast palette"
      data-mock-why="a small picture of a page in one palette's own colours, whatever palette is on; the palette's name is the words under it"
    >
      <span className="set-mode-canvas">
        <span className="set-mode-book">{book}</span>
        <span className="set-mode-chapter">{chapter}</span>
        <span className="set-mode-rule" />
        <span lang="en" dir="ltr" className={cn("set-mode-verses", FONT_CLASSES[font])}>
          {JOHN_1_OPENING.map((v) => (
            <Fragment key={v.n}>
              <span className="set-vn">{v.n}</span>
              {v.text}{" "}
            </Fragment>
          ))}
        </span>
      </span>
    </span>
  );
}
