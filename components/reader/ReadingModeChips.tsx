"use client";

// The Reading-mode chip grid, shared by the Bible reader's settings menu
// (desktop popover) and the mobile settings sheet. Palette half of
// Premium Reading Modes; the Focus toggle (chrome half) stays separate
// and composes with any palette.

import { useRouter } from "next/navigation";
import { useReaderPrefs } from "@/components/reader/ReaderPrefs";
import { useProReadingModes } from "@/components/reader/useProReadingModes";
import { READING_THEMES } from "@/lib/reader/readingModes";
import { cn } from "@/lib/cn";
import { useTranslate } from "@/components/i18n/MessagesProvider";

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
  const router = useRouter();
  const { theme, setTheme } = useReaderPrefs();
  const { allowed, locked } = useProReadingModes();

  return (
    <div>
      <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.2px] text-paper/55 mb-2">
        {t("ui.readingMode")}
        {locked && (
          <span className="ml-2 inline-flex items-center rounded-pill border border-gold/45 bg-gold/12 px-1.5 py-px font-sans text-[10px] font-semibold tracking-[0.6px] text-gold-pale normal-case">
            Purify Pro
          </span>
        )}
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {READING_THEMES.map((t) => {
          const sw = THEME_SWATCHES[t.id];
          const active = theme === t.id && allowed;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                if (allowed) setTheme(t.id);
                // Router push, never `window.location.href`. The Android
                // export is trailingSlash:true, so the bundled file is
                // /pricing/index.html; a raw assignment to the bare string
                // is unresolvable in the Capacitor shell, which falls back
                // to the root document and dumps the reader on Today.
                // Reported by a member on 2026-07-31. Same failure shape as
                // the bible/multi note in scripts/android-build.mjs.
                else if (locked) router.push("/pricing");
              }}
              title={t.blurb}
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
            </button>
          );
        })}
      </div>
    </div>
  );
}
