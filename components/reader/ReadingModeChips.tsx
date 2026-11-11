"use client";

// The Reading mode section of the reader's own settings: the phone's sheet
// and the computer's popover (components/bible/ReaderSettingsMenu.tsx).
// Palette half of Premium Reading Modes; the Focus toggle (chrome half) stays
// separate and composes with any palette.
//
// It was a grid of chips, each a dot of colour and a name, the two palettes
// earned by reading in dashed boxes, one of them alone on its row, and a "See
// all" row under them. The owner's note 4 of build 93 (2026-11-11): "Refine
// this section and refine the design also." By his standing rules for it:
// photos over words, no dashed placeholder boxes, no orphan on a row.
//
// So each mode is shown as itself: the small page Settings draws
// (components/settings/ReadingModePages.tsx, ModeTile), the Bible's page in
// that palette, on ONE shelf (app/globals.css, "The reader's own shelf"). On
// a phone the shelf is swept sideways and runs to the sheet's edges, the next
// page cut off so a reader sees there is more; in the computer's popover,
// where nothing sweeps, it wraps four to a row (seven or eight pages, so
// never one alone). The way to every mode
// (components/settings/ReadingModeGallery.tsx) is the head's own link, not a
// row under the shelf.
//
// What stands on it: the five a reader knows; a look (1.9) only while it is
// the reader's own, so it can be seen and put down; and the two earned by
// reading (lib/reader/earned.ts), which stand unlit with how far the reader
// is until they are earned, and say how under the shelf once tapped.
//
// No colour is copied here by hand any more: a small page takes its ground
// and ink from its palette's own tokens in the stylesheet
// (lib/settings/__tests__/litPanels.test.ts holds the two together).
//
// The file keeps its name, and its export: the reader's settings import it.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { useReaderPrefs } from "@/components/reader/ReaderPrefs";
import { useEarnedPalettes } from "@/components/reader/useEarnedPalettes";
import { usePalettePick } from "@/components/reader/usePalettePick";
import { GoalTile, ModeTile } from "@/components/settings/ReadingModePages";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import type { EarnedPalettes } from "@/lib/reader/earned";
import { READING_THEMES, isCollectionTheme } from "@/lib/reader/readingModes";
import { PREVIEW_CHAPTER } from "@/lib/settings/preview";

export function ReadingModeChips({
  touch = false,
}: {
  /** The phone's sheet: the shelf is swept. Without it (the computer's popover) it wraps. */
  touch?: boolean;
} = {}) {
  const { t } = useTranslate();
  const { theme, font } = useReaderPrefs();
  // The tap every picker shares, the palette the app is in (the check stands
  // there) and the app's one Plus answer (./usePalettePick.ts).
  const { pick, worn, allows, locked } = usePalettePick();
  const earned = useEarnedPalettes();
  // The goal a reader tapped: how it is earned, said under the shelf.
  const [goal, setGoal] = useState<keyof EarnedPalettes | null>(null);
  // The pages' motion waits for the section to be up, as Settings' does
  // (app/globals.css, "Settings: lit panels"): a choice read from the device
  // after the first draw must not move as the sheet opens.
  const [live, setLive] = useState(false);
  useEffect(() => {
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setLive(true));
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // The page the app is in is kept in sight on a shelf that is swept: when
  // the sheet opens it is already there (a look or Monastery would otherwise
  // be past the edge, and a reader could not see what is on), and a tap on a
  // page cut off at the edge brings it whole into view. Sideways only: the
  // sheet itself is never moved from here. And to a place the shelf rests
  // at, a page's own start: the shelf snaps to those, and a move to anywhere
  // else is pulled back by the snap, which left the page cut off again.
  const shelf = useRef<HTMLDivElement>(null);
  const opened = useRef(false);
  useEffect(() => {
    const row = shelf.current;
    if (!row || !touch) return;
    /** False until the shelf is laid out (the sheet may still be opening). */
    const align = (): boolean => {
      if (!row.clientWidth) return false;
      const pages = [...row.querySelectorAll<HTMLElement>(".set-mode")];
      const at = pages.findIndex((page) => page.getAttribute("aria-pressed") === "true");
      if (at < 0) return true;
      const edge = row.getBoundingClientRect();
      const on = pages[at].getBoundingClientRect();
      // The room the shelf keeps at each end (its padding, 1rem).
      const room = parseFloat(getComputedStyle(row).scrollPaddingInlineStart) || 16;
      if (on.left >= edge.left + room - 1 && on.right <= edge.right - room + 1) return true;
      // The page two before it leads the shelf, so it stands with a neighbour on each side.
      const lead = pages[Math.max(0, at - 2)].getBoundingClientRect();
      const by = getComputedStyle(row).direction === "rtl" ? lead.right - (edge.right - room) : lead.left - (edge.left + room);
      const still = !opened.current || document.documentElement.dataset.motion === "reduce";
      row.scrollBy({ left: by, behavior: still ? "auto" : "smooth" });
      return true;
    };
    if (align()) {
      opened.current = true;
      return;
    }
    if (typeof ResizeObserver === "undefined") return;
    const watch = new ResizeObserver(() => {
      if (!align()) return;
      opened.current = true;
      watch.disconnect();
    });
    watch.observe(row);
    return () => watch.disconnect();
  }, [worn, theme, touch]);

  const book = t("bible.books.john");
  const chapter = t("bible.chapterN", { n: PREVIEW_CHAPTER });
  const name = t("ui.readingMode");

  return (
    <div className="set-root reader-modes" data-live={live ? "" : undefined}>
      <div className="flex items-center justify-between gap-3">
        <p className="font-sans text-caption font-semibold text-paper/55">{name}</p>
        {/* Every palette, by family, on its own page: the head's own link, a finger tall. */}
        <Link
          href="/settings/reading-mode/"
          data-all-modes=""
          className="-me-2 inline-flex min-h-11 shrink-0 items-center gap-1 rounded-md px-2 font-sans text-caption font-medium text-paper/70 transition-colors hover:text-paper"
          aria-label={`${name}: ${t("common.seeAll")}`}
        >
          <span>{t("common.seeAll")}</span>
          <ChevronRight size={14} className="shrink-0 rtl:-scale-x-100" />
        </Link>
      </div>
      {/* A sideways sweep here is the shelf's, never the sheet's own pull (lib/ui/useDraggableSheet.ts). */}
      <div ref={shelf} role="group" aria-label={name} className="reader-shelf" data-touch={touch ? "" : undefined} data-sheet-nodrag="">
        {READING_THEMES.filter((mode) => !mode.look || mode.id === theme).map((mode) => {
          const progress = isCollectionTheme(mode.id) ? earned[mode.id as keyof EarnedPalettes] : null;
          // Earned, or already the reader's own (so it can be put down again): a palette like the rest.
          if (progress && !progress.earned && theme !== mode.id) {
            const id = mode.id as keyof EarnedPalettes;
            return <GoalTile key={mode.id} mode={mode} progress={progress} open={goal === id} font={font} book={book} chapter={chapter} onToggle={() => setGoal(goal === id ? null : id)} />;
          }
          return (
            <ModeTile
              key={mode.id}
              mode={mode}
              theme={theme}
              worn={worn}
              font={font}
              allows={allows}
              locked={locked}
              book={book}
              chapter={chapter}
              // Worn at once, or the Purify Plus sheet for a reader the gate
              // has said no to (lib/reader/pickPalette.ts). The sheet, not a
              // navigation: leaving the reader to sell a palette cost the
              // reader their place.
              onPick={pick}
            />
          );
        })}
      </div>
      {goal ? (
        <p id="set-palette-goal" role="status" className="set-mode-goal-line" data-palette-goal-line="">
          {t(goal === "councils" ? "settings.paletteEarnCouncils" : "settings.paletteEarnCappadocian", { count: earned[goal].read, total: earned[goal].of })}
          {/* Plus is never promised to every reader: a reader without it is told before they read for it. */}
          {locked ? ` ${t("settings.palettePlusNote")}` : null}
        </p>
      ) : null}
    </div>
  );
}
