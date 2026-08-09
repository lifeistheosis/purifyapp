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
  const { allows, locked } = useProReadingModes();

  return (
    <div>
      {/* The Pro badge moved off the group heading and onto the chips that are
          actually Pro. It sat here while light mode was gated with the rest,
          which told a reader looking for a readable page that reading was a
          paid feature. It is not. See FREE_THEMES in lib/reader/readingModes. */}
      <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.2px] text-paper/55 mb-2">
        {t("ui.readingMode")}
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {READING_THEMES.map((t) => {
          const sw = THEME_SWATCHES[t.id];
          const themeAllowed = allows(t.id);
          const active = theme === t.id && themeAllowed;
          const showPro = locked && !themeAllowed;
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
                else if (locked) router.push("/pricing");
              }}
              title={showPro ? `${t.blurb}. Purify Pro.` : t.blurb}
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
              {showPro && (
                // "Purify Pro" rather than "Pro": the brand name is what the
                // i18n ratchet allows as a literal (eslint.config.mjs, brand
                // names never translate), and it is clearer besides.
                <span className="ml-auto shrink-0 font-sans text-[10px] font-semibold tracking-[0.6px] text-gold-pale/80">
                  Purify Pro
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
