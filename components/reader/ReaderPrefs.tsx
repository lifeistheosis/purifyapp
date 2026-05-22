"use client";

import { useCallback } from "react";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";

export type ReaderSize = "sm" | "md" | "lg" | "xl";
export type ReaderFont = "serif" | "display" | "sans";

const SIZES: ReaderSize[] = ["sm", "md", "lg", "xl"];
const FONTS: ReaderFont[] = ["serif", "display", "sans"];

const SIZE_LABELS: Record<ReaderSize, string> = {
  sm: "Small",
  md: "Medium",
  lg: "Large",
  xl: "X-Large",
};
const FONT_LABELS: Record<ReaderFont, string> = {
  serif: "Serif",
  display: "Display",
  sans: "Sans",
};

const SIZE_KEY = "purify.reader.size";
const FONT_KEY = "purify.reader.font";
const PREFS_EVENT = "purify:reader-prefs";

// Verse-body text classes per size.
export const SIZE_CLASSES: Record<ReaderSize, string> = {
  sm: "text-[15px] md:text-[16px] leading-[1.55]",
  md: "text-[17px] md:text-[18px] leading-[1.6]",
  lg: "text-[19px] md:text-[20px] leading-[1.65]",
  xl: "text-[21px] md:text-[23px] leading-[1.7]",
};

// Font-family classes per preset.
export const FONT_CLASSES: Record<ReaderFont, string> = {
  serif: "font-serif",
  display: "font-display-serif",
  sans: "font-sans",
};

// ---- localStorage-backed store (read via useSyncExternalStore) -----------
// Avoids a hydrate-in-effect setState: the server renders the default snapshot,
// then the client re-reads localStorage. Writes broadcast `purify:reader-prefs`
// so every mounted control (size/font pills, the readers) stays in sync.

type PrefsSnap = { size: ReaderSize; font: ReaderFont };
const DEFAULT_SNAP: PrefsSnap = { size: "md", font: "serif" };
let prefsCache: { rawS: string | null; rawF: string | null; val: PrefsSnap } | null = null;

function readPrefs(): PrefsSnap {
  if (typeof window === "undefined") return DEFAULT_SNAP;
  let rawS: string | null = null;
  let rawF: string | null = null;
  try {
    rawS = window.localStorage.getItem(SIZE_KEY);
    rawF = window.localStorage.getItem(FONT_KEY);
  } catch {
    return DEFAULT_SNAP;
  }
  if (prefsCache && prefsCache.rawS === rawS && prefsCache.rawF === rawF) {
    return prefsCache.val;
  }
  const size =
    rawS && SIZES.includes(rawS as ReaderSize) ? (rawS as ReaderSize) : "md";
  const font =
    rawF && FONTS.includes(rawF as ReaderFont) ? (rawF as ReaderFont) : "serif";
  const val: PrefsSnap = { size, font };
  prefsCache = { rawS, rawF, val };
  return val;
}

function subscribePrefs(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(PREFS_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(PREFS_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

function write(keyName: string, value: string) {
  try {
    window.localStorage.setItem(keyName, value);
    prefsCache = null;
    window.dispatchEvent(new CustomEvent(PREFS_EVENT));
  } catch {
    /* storage may be unavailable */
  }
}

type Ctx = {
  size: ReaderSize;
  font: ReaderFont;
  setSize: (s: ReaderSize) => void;
  setFont: (f: ReaderFont) => void;
  cycleSize: () => void;
  cycleFont: () => void;
  sizeLabel: string;
  fontLabel: string;
};

// The provider is now a passthrough (state lives in the module store); kept so
// existing <ReaderPrefsProvider> mount points don't need to change.
export function ReaderPrefsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

export function useReaderPrefs(): Ctx {
  const { size, font } = useSyncExternalStore(
    subscribePrefs,
    readPrefs,
    () => DEFAULT_SNAP,
  );

  const setSize = useCallback((s: ReaderSize) => write(SIZE_KEY, s), []);
  const setFont = useCallback((f: ReaderFont) => write(FONT_KEY, f), []);
  const cycleSize = useCallback(() => {
    const cur = readPrefs().size;
    write(SIZE_KEY, SIZES[(SIZES.indexOf(cur) + 1) % SIZES.length]);
  }, []);
  const cycleFont = useCallback(() => {
    const cur = readPrefs().font;
    write(FONT_KEY, FONTS[(FONTS.indexOf(cur) + 1) % FONTS.length]);
  }, []);

  return {
    size,
    font,
    setSize,
    setFont,
    cycleSize,
    cycleFont,
    sizeLabel: SIZE_LABELS[size],
    fontLabel: FONT_LABELS[font],
  };
}

// Backwards-compatible alias for the existing import name.
export const useReaderSize = useReaderPrefs;

export function ReaderFontSizeButton() {
  const { size, cycleSize, sizeLabel } = useReaderPrefs();
  return (
    <button
      type="button"
      onClick={cycleSize}
      title={`Text size: ${sizeLabel}. Click to change.`}
      aria-label={`Text size: ${sizeLabel}. Click to change.`}
      className="inline-flex items-center gap-2 rounded-pill border border-paper/15 bg-paper/[0.04] hover:border-paper/30 hover:bg-paper/10 focus:outline-none focus:ring-2 focus:ring-paper/25 px-3 py-2 font-sans text-[13px] font-medium text-paper transition-colors"
    >
      <span className="font-sans text-[10.5px] font-semibold uppercase tracking-[1.2px] text-paper/50">
        Size
      </span>
      <span aria-hidden className="flex items-end gap-[3px]">
        {SIZES.map((s, i) => {
          const active = SIZES.indexOf(size) >= i;
          const h = 5 + i * 3;
          return (
            <span
              key={s}
              className={cn(
                "w-[3px] rounded-sm transition-colors",
                active ? "bg-paper/85" : "bg-paper/20",
              )}
              style={{ height: `${h}px` }}
            />
          );
        })}
      </span>
      <span className="font-sans text-[12.5px] text-paper/70">{sizeLabel}</span>
    </button>
  );
}

// Backwards-compatible alias.
export const ReaderFontButton = ReaderFontSizeButton;

export function ReaderFontFamilyButton() {
  const { font, cycleFont, fontLabel } = useReaderPrefs();
  // Render a tiny "Aa" preview that swaps font-family to advertise the choice.
  const previewClass = FONT_CLASSES[font];
  return (
    <button
      type="button"
      onClick={cycleFont}
      title={`Font: ${fontLabel}. Click to change.`}
      aria-label={`Font: ${fontLabel}. Click to change.`}
      className="inline-flex items-center gap-2 rounded-pill border border-paper/15 bg-paper/[0.04] hover:border-paper/30 hover:bg-paper/10 focus:outline-none focus:ring-2 focus:ring-paper/25 px-3 py-2 font-sans text-[13px] font-medium text-paper transition-colors"
    >
      <span className="font-sans text-[10.5px] font-semibold uppercase tracking-[1.2px] text-paper/50">
        Font
      </span>
      <span
        aria-hidden
        className={cn(
          "inline-flex items-baseline gap-[1px] text-paper/85",
          previewClass,
        )}
      >
        <span className="text-[14px] leading-none">A</span>
        <span className="text-[10px] leading-none">a</span>
      </span>
      <span className="font-sans text-[12.5px] text-paper/70">{fontLabel}</span>
    </button>
  );
}
