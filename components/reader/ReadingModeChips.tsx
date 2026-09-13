"use client";

// The Reading-mode chip grid, shared by the Bible reader's settings menu
// (desktop popover) and the mobile settings sheet. Palette half of
// Premium Reading Modes; the Focus toggle (chrome half) stays separate
// and composes with any palette.

import { useReaderPrefs } from "@/components/reader/ReaderPrefs";
import { usePlusReadingModes } from "@/components/reader/usePlusReadingModes";
import { READING_THEMES } from "@/lib/reader/readingModes";
import { cn } from "@/lib/cn";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { useUpgradeModal } from "@/components/billing/UpgradeModal";

/** Tiny page/ink swatch advertising each palette inside its chip. Hexes
 * mirror the html[data-reading-mode] blocks in app/globals.css. */
const THEME_SWATCHES: Record<string, { page: string; ink: string }> = {
  default: { page: "#101013", ink: "#eaeaec" },
  candlelight: { page: "#171006", ink: "#d9b45a" },
  monastery: { page: "#0d1119", ink: "#aebedd" },
  parchment: { page: "#f1e8d4", ink: "#2b2317" },
};

export function ReadingModeChips() {
  const { t } = useTranslate();
  const upgrade = useUpgradeModal();
  const { theme, setTheme } = useReaderPrefs();
  const { allows, locked } = usePlusReadingModes();

  return (
    <div>
      {/* The badge moved off the group heading and onto the chips that are
          actually paid. It sat here while light mode was gated with the rest,
          which told a reader looking for a readable page that reading was a
          paid feature. It is not. See FREE_THEMES in lib/reader/readingModes.
          The tier named here is Plus since 2026-08-12; the palettes moved down
          from Pro, so the badge has to move with them or it sells the wrong
          subscription. */}
      <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.2px] text-paper/55 mb-2">
        {t("ui.readingMode")}
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {READING_THEMES.map((t) => {
          const sw = THEME_SWATCHES[t.id];
          const themeAllowed = allows(t.id);
          const active = theme === t.id && themeAllowed;
          const showPaidBadge = locked && !themeAllowed;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                if (themeAllowed) setTheme(t.id);
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
              title={showPaidBadge ? `${t.blurb}. Purify Plus.` : t.blurb}
              aria-pressed={active}
              className={cn(
                "inline-flex items-center gap-2 rounded-md border px-2.5 py-2 font-sans text-caption font-medium transition-colors",
                active
                  ? "bg-paper/15 border-paper/45 text-paper"
                  : "border-paper/12 text-paper/65 hover:bg-paper/8 hover:text-paper",
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
              {t.label}
              {showPaidBadge && (
                // "Purify Plus" rather than "Plus": the brand name is what the
                // i18n ratchet allows as a literal (eslint.config.mjs, brand
                // names never translate), and it is clearer besides.
                <span className="ml-auto shrink-0 font-sans text-[10px] font-semibold tracking-[0.6px] text-gold-pale/80">
                  Purify Plus
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
