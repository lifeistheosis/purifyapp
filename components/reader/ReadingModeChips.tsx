"use client";

// The Reading-mode chip grid, shared by the Bible reader's settings menu
// (desktop popover) and the mobile settings sheet. Palette half of
// Premium Reading Modes; the Focus toggle (chrome half) stays separate
// and composes with any palette.

import Link from "next/link";
import { useState } from "react";

import { useReaderPrefs } from "@/components/reader/ReaderPrefs";
import { useEarnedPalettes } from "@/components/reader/useEarnedPalettes";
import { usePlusReadingModes } from "@/components/reader/usePlusReadingModes";
import type { EarnedPalettes } from "@/lib/reader/earned";
import { READING_THEMES, isCollectionTheme } from "@/lib/reader/readingModes";
import { cn } from "@/lib/cn";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { useUpgradeModal } from "@/components/billing/UpgradeModal";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";

/** Tiny page/ink swatch advertising each palette inside its chip. Hexes
 * mirror the html[data-reading-mode] blocks in app/globals.css. */
const THEME_SWATCHES: Record<string, { page: string; ink: string }> = {
  default: { page: "#101013", ink: "#eaeaec" },
  candlelight: { page: "#050505", ink: "#d4d4d8" },
  monastery: { page: "#0d1119", ink: "#aebedd" },
  parchment: { page: "#f1e8d4", ink: "#2b2317" },
  black: { page: "#000000", ink: "#ffffff" },
  councils: { page: "#0a1020", ink: "#eaeaec" },
  cappadocian: { page: "#160f12", ink: "#eaeaec" },
};

/** An applied look's swatch: the page and the ink the app is wearing. */
const WORN = { page: "var(--color-night)", ink: "var(--color-paper)" };

export function ReadingModeChips({
  touch = false,
}: {
  /** 44px chips and the larger label, to match the phone reader sheet. */
  touch?: boolean;
} = {}) {
  const { t } = useTranslate();
  const upgrade = useUpgradeModal();
  const { theme, setTheme } = useReaderPrefs();
  const { allows, locked } = usePlusReadingModes();
  const earned = useEarnedPalettes();
  // The goal a reader tapped: how it is earned, said under the grid.
  const [goal, setGoal] = useState<keyof EarnedPalettes | null>(null);

  return (
    <div>
      {/* The badge moved off the group heading and onto the chips that are
          actually paid. It sat here while light mode was gated with the rest,
          which told a reader looking for a readable page that reading was a
          paid feature. It is not. See FREE_THEMES in lib/reader/readingModes.
          The tier named here is Plus since 2026-08-12; the palettes moved down
          from Pro, so the badge has to move with them or it sells the wrong
          subscription. */}
      <p className="font-sans text-caption font-semibold text-paper/55 mb-2">
        {t("ui.readingMode")}
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {/* The earned palettes (1.9, rec 79, lib/reader/earned.ts): Councils
            and Cappadocian stand here as goals, with how far the reader is,
            until they are earned by reading; then they are palettes like the
            rest. One already applied stays, so it can be put down again. */}
        {/* The looks (1.9) are chosen on their own page, seventeen of them:
            here only the one applied stands with the palettes, so it can be
            put down, and the row under the grid opens the rest. Its swatch is
            the page and ink the app is wearing. */}
        {READING_THEMES.filter((mode) => !mode.look || mode.id === theme).map((mode) => {
          const sw = THEME_SWATCHES[mode.id] ?? (mode.look ? WORN : undefined);
          const progress = isCollectionTheme(mode.id) ? earned[mode.id as keyof EarnedPalettes] : null;
          if (progress && !progress.earned && theme !== mode.id) {
            const id = mode.id as keyof EarnedPalettes;
            const label = mode.labelKey ? t(mode.labelKey) : mode.label;
            return (
              <button
                key={mode.id}
                type="button"
                data-palette-goal={mode.id}
                aria-expanded={goal === id}
                aria-controls="palette-goal"
                onClick={() => setGoal(goal === id ? null : id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md border border-dashed border-paper/20 px-2.5 py-2 text-start font-sans font-medium text-paper/70 transition-colors hover:text-paper",
                  touch ? "min-h-11 text-detail" : "text-caption",
                )}
              >
                <span aria-hidden className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-paper/25" style={{ backgroundColor: sw?.page }}>
                  <span className="block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: sw?.ink }} />
                </span>
                <span className="min-w-0 flex-1 break-words leading-tight">
                  <span className="block">{label}</span>
                  <span className="mt-0.5 block font-sans text-[10px] font-semibold tabular-nums text-paper/55">
                    {t("settings.paletteProgress", { count: progress.read, total: progress.of })}
                  </span>
                </span>
              </button>
            );
          }
          const themeAllowed = allows(mode.id);
          const active = theme === mode.id && themeAllowed;
          const showPaidBadge = locked && !themeAllowed;
          // The palette's name and its one line, in the reader's language. The
          // registry holds the catalog keys beside the English (see labelKey in
          // lib/reader/readingModes.ts), the earned two among them since 1.9.
          const label = mode.labelKey ? t(mode.labelKey) : mode.label;
          const blurb = mode.blurbKey ? t(mode.blurbKey) : mode.blurb;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => {
                if (themeAllowed) setTheme(mode.id);
                // Router push, never `window.location.href`. The Android
                // export is trailingSlash:true, so the bundled file is
                // /pricing/index.html; a raw assignment to the bare string
                // is unresolvable in the Capacitor shell, which falls back
                // to the root document and dumps the reader on Today.
                // Reported by a member on 2026-07-31. Same failure shape as
                // the bible/multi note in scripts/native-build.mjs.
                // The modal, not a navigation. Leaving the reader to sell them a
                // palette cost them their place, and /pricing then pitched the
                // whole tier rather than the one thing they had reached for.
                // useUpgradeModal falls back to /pricing on its own when no
                // provider is mounted above, and that fallback is a router push
                // rather than a bare window.location.href for the reason the
                // comment above records.
                else if (locked) upgrade.open("palettes");
              }}
              title={showPaidBadge ? `${blurb}. Purify Plus.` : blurb}
              aria-pressed={active}
              className={cn(
                "inline-flex items-center gap-2 rounded-md border px-2.5 py-2 text-start font-sans font-medium transition-colors",
                touch ? "min-h-11 text-detail" : "text-caption",
                active
                  ? "bg-paper/15 border-paper/45 text-paper"
                  : "border-paper/12 text-paper/70 hover:bg-paper/8 hover:text-paper",
              )}
            >
              <span
                aria-hidden
                className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-paper/25"
                style={{ backgroundColor: sw?.page }}
              >
                <span
                  className="block h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: sw?.ink }}
                />
              </span>
              {/* The badge sits under the name, not beside it. Beside it, in
                  a two-column grid inside a popover about 250px wide, a name
                  as long as Candlelight left no room, and the badge was drawn
                  over the name: "Purify PluMonastery", reported 2026-09-27. */}
              <span className="min-w-0 flex-1 break-words leading-tight">
                <span className="block">{label}</span>
                {showPaidBadge && (
                  // "Purify Plus" rather than "Plus": the brand name is what the
                  // i18n ratchet allows as a literal (eslint.config.mjs, brand
                  // names never translate), and it is clearer besides.
                  <span className="mt-0.5 block font-sans text-[10px] font-semibold tracking-[0.6px] text-gold-pale/80">
                    Purify Plus
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
      {/* Every palette, by family, on its own page (components/settings/ReadingModeGallery.tsx). */}
      <Link
        href="/settings/reading-mode/"
        data-all-modes=""
        className="mt-1.5 flex min-h-11 items-center justify-between gap-2 rounded-md px-2.5 font-sans text-caption font-medium text-paper/70 transition-colors hover:bg-paper/8 hover:text-paper"
      >
        <span>{t("common.seeAll")}</span>
        <ChevronRight size={14} className="shrink-0 rtl:-scale-x-100" />
      </Link>
      {goal ? (
        <p id="palette-goal" role="status" className="mt-2 font-sans text-caption leading-[1.45] text-paper/70" data-palette-goal-line="">
          {t(goal === "councils" ? "settings.paletteEarnCouncils" : "settings.paletteEarnCappadocian", { count: earned[goal].read, total: earned[goal].of })}
          {/* Plus is never promised to every reader: a reader without it is told before they read for it. */}
          {locked ? ` ${t("settings.palettePlusNote")}` : null}
        </p>
      ) : null}
    </div>
  );
}
