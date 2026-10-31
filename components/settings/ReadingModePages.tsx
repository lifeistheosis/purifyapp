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

import { Fragment } from "react";

import { useUpgradeModal } from "@/components/billing/UpgradeModal";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { FONT_CLASSES, useReaderPrefs, type ReaderFont } from "@/components/reader/ReaderPrefs";
import { usePlusReadingModes } from "@/components/reader/usePlusReadingModes";
import { Check } from "@/components/ui/icons/Check";
import { cn } from "@/lib/cn";
import { READING_THEMES, isCollectionTheme, type ReadingTheme } from "@/lib/reader/readingModes";
import { JOHN_1_OPENING, PREVIEW_CHAPTER } from "@/lib/settings/preview";

/** Wired to the reader's palette and the Plus gate. */
export function ReadingModePages() {
  const upgrade = useUpgradeModal();
  const { theme, setTheme, font } = useReaderPrefs();
  const { allows, locked } = usePlusReadingModes();
  return (
    <ModePages
      theme={theme}
      font={font}
      allows={allows}
      locked={locked}
      onPick={(id) => {
        if (allows(id)) setTheme(id);
        // The modal, not a navigation: the chips' reason (ReadingModeChips).
        else if (locked) upgrade.open("palettes");
      }}
    />
  );
}

export function ModePages({
  theme,
  font,
  allows,
  locked,
  onPick,
}: {
  theme: ReadingTheme;
  font: ReaderFont;
  allows: (theme: ReadingTheme) => boolean;
  /** The gate has answered no: the paid pages say Purify Plus. */
  locked: boolean;
  onPick: (theme: ReadingTheme) => void;
}) {
  const { t } = useTranslate();
  const modes = READING_THEMES.filter((m) => !isCollectionTheme(m.id) || theme === m.id);
  const book = t("bible.books.john");
  const chapter = t("bible.chapterN", { n: PREVIEW_CHAPTER });
  return (
    <div
      role="group"
      aria-label={t("ui.readingMode")}
      className="set-modes"
      data-count={modes.length}
      // What the release's tour lights for Settings (lib/whatsNew/tour.ts).
      data-tour="settings-panels"
    >
      {modes.map((mode) => {
        const allowed = allows(mode.id);
        const on = theme === mode.id && allowed;
        const paid = locked && !allowed;
        const name = mode.labelKey ? t(mode.labelKey) : mode.label;
        const blurb = mode.blurbKey ? t(mode.blurbKey) : mode.blurb;
        return (
          <button
            key={mode.id}
            type="button"
            aria-pressed={on}
            title={paid ? `${blurb}. Purify Plus.` : blurb}
            onClick={() => onPick(mode.id)}
            className="set-mode"
          >
            <ModePage palette={mode.id} font={font} book={book} chapter={chapter} />
            {on ? (
              <span aria-hidden className="set-check set-mode-check">
                <Check size={10} strokeWidth={2.8} />
              </span>
            ) : null}
            <span className="set-mode-name">{name}</span>
            {paid ? <span className="set-mode-plus">Purify Plus</span> : null}
          </button>
        );
      })}
    </div>
  );
}

/**
 * One page: the book, its chapter, a rule and the opening verses, in the
 * palette's ground and ink. Drawn at three times its size and scaled down,
 * so its small type is set as type (a browser's least font size would
 * otherwise swell it).
 */
function ModePage({
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
    <span aria-hidden className="set-mode-page" data-palette={palette}>
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
