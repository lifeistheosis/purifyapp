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
// From 1.9 there are fourteen looks beside these (lib/reader/readingModes.ts).
// They are chosen on a page of their own, which this row's head opens
// (./ReadingModeGallery.tsx), so the row stays the five a reader knows. A
// look that is applied stands here as a sixth page, as an applied collection
// palette does, so it can be seen and put down from Settings too. The page
// and the tile are exported for that gallery, which draws every palette with
// them.
//
// One row, swept sideways (build 95 note 18, the owner: "reading mode chooser
// here should be a clean scroller with haptic feedback rather than stacks").
// The five, a look while it is the one applied, and the two earned by reading
// stand on one row in that order, each with its state (Purify Plus under a
// paid one where the gate has said no, how far the reader is under a goal).
// On a phone the row runs to the panel's edges and the next page is cut off
// at the edge, so a reader sees there is more; it comes to rest on a page,
// never between two (app/globals.css, "The reading modes in Settings, one
// row"). A light click in the hand as each page passes the row's middle, the
// chapter strip's own (lib/ui/scrollTicks.ts): the phone apps only, never
// with Clicks as you scroll off. The page that is on is in sight when the
// screen opens, and a page tapped at the edge comes whole into view; the row
// alone moves, never the screen. On a computer all of them fit on the row.

import { Fragment, useLayoutEffect, useRef, useState, type RefObject } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { FONT_CLASSES, useReaderPrefs, type ReaderFont } from "@/components/reader/ReaderPrefs";
import { EarnMarks } from "@/components/reader/EarnMarks";
import { EarnSheet } from "@/components/reader/EarnSheet";
import { useEarnedPalettes } from "@/components/reader/useEarnedPalettes";
import { usePalettePick } from "@/components/reader/usePalettePick";
import { Check } from "@/components/ui/icons/Check";
import { cn } from "@/lib/cn";
import type { EarnedPalettes } from "@/lib/reader/earned";
import { READING_THEMES, isCollectionTheme, themeWorn, type ReadingTheme } from "@/lib/reader/readingModes";
import { inSightBy } from "@/lib/settings/modeRow";
import { JOHN_1_OPENING, PREVIEW_CHAPTER } from "@/lib/settings/preview";
import { useScrollTicks } from "@/lib/ui/scrollTicks";

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
  // The two earned by reading (1.9, rec 79, lib/reader/earned.ts): until
  // earned they stand as goals, with how far the reader is, and say how under
  // the row once tapped.
  const earned = useEarnedPalettes();
  const [goal, setGoal] = useState<keyof EarnedPalettes | null>(null);
  // The five, a look only while it is the one applied (1.9: the rest are on
  // their own page), and the two earned by reading, in the registry's order.
  const modes = READING_THEMES.filter((m) => !m.look || m.id === theme);
  const row = useRef<HTMLDivElement>(null);
  useScrollTicks(row);
  useOnInSight(row, worn ?? themeWorn(theme, allows));
  const book = t("bible.books.john");
  const chapter = t("bible.chapterN", { n: PREVIEW_CHAPTER });
  return (
    <>
      <div
        ref={row}
        role="group"
        aria-label={t("ui.readingMode")}
        className="set-mode-row"
        data-count={modes.length}
        // What the release's tour lights for Settings (lib/whatsNew/tour.ts).
        data-tour="settings-panels"
      >
        {modes.map((mode) => {
          const progress = isCollectionTheme(mode.id) ? earned[mode.id as keyof EarnedPalettes] : null;
          // Still to be earned, and not the one applied: a goal. Earned, or
          // already applied (so it can be put down again): a palette like the rest.
          if (progress && !progress.earned && theme !== mode.id) {
            const id = mode.id as keyof EarnedPalettes;
            return (
              <GoalTile key={mode.id} mode={mode} progress={progress} open={goal === id} font={font} book={book} chapter={chapter} onToggle={() => setGoal(goal === id ? null : id)} />
            );
          }
          return <ModeTile key={mode.id} mode={mode} theme={theme} worn={worn} font={font} allows={allows} locked={locked} book={book} chapter={chapter} onPick={onPick} />;
        })}
      </div>
      {/* What is left to read, each a door to it (build 95 note 27). */}
      <EarnSheet goal={goal} locked={locked} onClose={() => setGoal(null)} />
    </>
  );
}

/**
 * The page that is on, in sight on the row (build 95 note 18). When the
 * screen opens it is already there: a look or Monastery would otherwise
 * stand past the edge, and a reader could not see what is on. A page tapped
 * where the edge cuts it comes whole into view. The row alone moves, never
 * the screen, and to a place it rests at (a page's own start, where the row
 * comes to rest): the page before the one that is on leads the row, so it
 * stands with a neighbour on each side. Still until the screen is up (a
 * choice read from the device after the first draw must not glide in as the
 * screen opens) and under reduced motion; a glide otherwise.
 */
function useOnInSight(row: RefObject<HTMLDivElement | null>, on: string): void {
  useLayoutEffect(() => {
    const box = row.current;
    if (!box) return;
    /** False until the row is laid out. */
    const place = (): boolean => {
      if (!box.clientWidth) return false;
      const pages = [...box.querySelectorAll<HTMLElement>(":scope > .set-mode")];
      const at = pages.findIndex((page) => page.getAttribute("aria-pressed") === "true");
      if (at < 0) return true;
      const style = getComputedStyle(box);
      const by = inSightBy({
        row: box.getBoundingClientRect(),
        page: pages[at].getBoundingClientRect(),
        lead: pages[Math.max(0, at - 1)].getBoundingClientRect(),
        // Where a page rests: the row's own padding in from its start.
        room: parseFloat(style.scrollPaddingInlineStart) || 0,
        rtl: style.direction === "rtl",
      });
      if (by === null) return true;
      const still = !box.closest(".set-root")?.hasAttribute("data-live") || document.documentElement.dataset.motion === "reduce";
      box.scrollBy({ left: by, behavior: still ? "auto" : "smooth" });
      return true;
    };
    if (place() || typeof ResizeObserver === "undefined") return;
    const watch = new ResizeObserver(() => {
      if (place()) watch.disconnect();
    });
    watch.observe(box);
    return () => watch.disconnect();
  }, [row, on]);
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

/**
 * A palette still to be earned by reading (lib/reader/earned.ts): the look
 * itself, lit as it will be, and how far the reader is shown as what it is
 * (./EarnMarks: the councils as marks that fill, the three Fathers as faces
 * that light), build 95 note 27. A tap opens what is left to read
 * (components/reader/EarnSheet.tsx). No dashed edge (build 93 note 4).
 */
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
    <button type="button" data-palette-goal={mode.id} aria-haspopup="dialog" aria-expanded={open} onClick={onToggle} className="set-mode set-mode-goal">
      <ModePage palette={mode.id} font={font} book={book} chapter={chapter} />
      <span className="set-mode-name">{mode.labelKey ? t(mode.labelKey) : mode.label}</span>
      <EarnMarks goal={mode.id as keyof EarnedPalettes} progress={progress} />
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
