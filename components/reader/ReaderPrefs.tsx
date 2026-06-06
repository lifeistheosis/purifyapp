"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";

export type ReaderSize = "sm" | "md" | "lg" | "xl";
export type ReaderFont = "serif" | "display" | "sans";
export type ReaderLeading = "normal" | "relaxed" | "loose";

const SIZES: ReaderSize[] = ["sm", "md", "lg", "xl"];
const FONTS: ReaderFont[] = ["serif", "display", "sans"];
const LEADINGS: ReaderLeading[] = ["normal", "relaxed", "loose"];

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
const LEADING_LABELS: Record<ReaderLeading, string> = {
  normal: "Normal",
  relaxed: "Relaxed",
  loose: "Loose",
};
// Line-height as a unitless multiplier. `normal` returns undefined so each
// size preset keeps its own baked-in leading as the default; relaxed/loose
// apply an inline lineHeight that reliably wins over the utility class — a
// non-destructive override that leaves every other reader untouched.
export const LEADING_VALUE: Record<ReaderLeading, number | undefined> = {
  normal: undefined,
  relaxed: 1.9,
  loose: 2.15,
};

const SIZE_KEY = "purify.reader.size";
const FONT_KEY = "purify.reader.font";
const LEADING_KEY = "purify.reader.leading";
const FOCUS_KEY = "purify.reader.focus";
const PREFS_EVENT = "purify:reader-prefs";

// Verse-body text classes per size. Each step must be a distinct size at
// BOTH breakpoints — previously md and lg both mapped to md:text-lede, so
// "Large" was a no-op on desktop. Scale (mobile → desktop):
//   sm 14→17 · md 17→19 · lg 19→22 · xl 22→28
export const SIZE_CLASSES: Record<ReaderSize, string> = {
  sm: "text-ui md:text-body leading-[1.55]",
  md: "text-body md:text-lede leading-[1.6]",
  lg: "text-lede md:text-title-sm leading-[1.65]",
  xl: "text-title-sm md:text-title leading-[1.7]",
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

type PrefsSnap = {
  size: ReaderSize;
  font: ReaderFont;
  leading: ReaderLeading;
  focus: boolean;
};
const DEFAULT_SNAP: PrefsSnap = {
  size: "md",
  font: "serif",
  leading: "normal",
  focus: false,
};
let prefsCache: {
  rawS: string | null;
  rawF: string | null;
  rawL: string | null;
  rawFocus: string | null;
  val: PrefsSnap;
} | null = null;

function readPrefs(): PrefsSnap {
  if (typeof window === "undefined") return DEFAULT_SNAP;
  let rawS: string | null = null;
  let rawF: string | null = null;
  let rawL: string | null = null;
  let rawFocus: string | null = null;
  try {
    rawS = window.localStorage.getItem(SIZE_KEY);
    rawF = window.localStorage.getItem(FONT_KEY);
    rawL = window.localStorage.getItem(LEADING_KEY);
    rawFocus = window.localStorage.getItem(FOCUS_KEY);
  } catch {
    return DEFAULT_SNAP;
  }
  if (
    prefsCache &&
    prefsCache.rawS === rawS &&
    prefsCache.rawF === rawF &&
    prefsCache.rawL === rawL &&
    prefsCache.rawFocus === rawFocus
  ) {
    return prefsCache.val;
  }
  const size =
    rawS && SIZES.includes(rawS as ReaderSize) ? (rawS as ReaderSize) : "md";
  const font =
    rawF && FONTS.includes(rawF as ReaderFont) ? (rawF as ReaderFont) : "serif";
  const leading =
    rawL && LEADINGS.includes(rawL as ReaderLeading)
      ? (rawL as ReaderLeading)
      : "normal";
  const focus = rawFocus === "1";
  const val: PrefsSnap = { size, font, leading, focus };
  prefsCache = { rawS, rawF, rawL, rawFocus, val };
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
  leading: ReaderLeading;
  focus: boolean;
  setSize: (s: ReaderSize) => void;
  setFont: (f: ReaderFont) => void;
  setLeading: (l: ReaderLeading) => void;
  setFocus: (v: boolean) => void;
  cycleSize: () => void;
  cycleFont: () => void;
  cycleLeading: () => void;
  toggleFocus: () => void;
  sizeLabel: string;
  fontLabel: string;
  leadingLabel: string;
  leadingValue: number | undefined;
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
  const { size, font, leading, focus } = useSyncExternalStore(
    subscribePrefs,
    readPrefs,
    () => DEFAULT_SNAP,
  );

  const setSize = useCallback((s: ReaderSize) => write(SIZE_KEY, s), []);
  const setFont = useCallback((f: ReaderFont) => write(FONT_KEY, f), []);
  const setLeading = useCallback(
    (l: ReaderLeading) => write(LEADING_KEY, l),
    [],
  );
  const setFocus = useCallback(
    (v: boolean) => write(FOCUS_KEY, v ? "1" : "0"),
    [],
  );
  const cycleSize = useCallback(() => {
    const cur = readPrefs().size;
    write(SIZE_KEY, SIZES[(SIZES.indexOf(cur) + 1) % SIZES.length]);
  }, []);
  const cycleFont = useCallback(() => {
    const cur = readPrefs().font;
    write(FONT_KEY, FONTS[(FONTS.indexOf(cur) + 1) % FONTS.length]);
  }, []);
  const cycleLeading = useCallback(() => {
    const cur = readPrefs().leading;
    write(LEADING_KEY, LEADINGS[(LEADINGS.indexOf(cur) + 1) % LEADINGS.length]);
  }, []);
  const toggleFocus = useCallback(() => {
    write(FOCUS_KEY, readPrefs().focus ? "0" : "1");
  }, []);

  return {
    size,
    font,
    leading,
    focus,
    setSize,
    setFont,
    setLeading,
    setFocus,
    cycleSize,
    cycleFont,
    cycleLeading,
    toggleFocus,
    sizeLabel: SIZE_LABELS[size],
    fontLabel: FONT_LABELS[font],
    leadingLabel: LEADING_LABELS[leading],
    leadingValue: LEADING_VALUE[leading],
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
      className="inline-flex items-center gap-2 rounded-pill border border-paper/15 bg-paper/[0.04] hover:border-paper/30 hover:bg-paper/10 focus:outline-none focus:ring-2 focus:ring-paper/25 px-3 py-2 font-sans text-detail font-medium text-paper transition-colors"
    >
      <span className="font-sans text-eyebrow font-semibold uppercase tracking-[1.2px] text-paper/50">
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
      <span className="font-sans text-caption text-paper/70">{sizeLabel}</span>
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
      className="inline-flex items-center gap-2 rounded-pill border border-paper/15 bg-paper/[0.04] hover:border-paper/30 hover:bg-paper/10 focus:outline-none focus:ring-2 focus:ring-paper/25 px-3 py-2 font-sans text-detail font-medium text-paper transition-colors"
    >
      <span className="font-sans text-eyebrow font-semibold uppercase tracking-[1.2px] text-paper/50">
        Font
      </span>
      <span
        aria-hidden
        className={cn(
          "inline-flex items-baseline gap-[1px] text-paper/85",
          previewClass,
        )}
      >
        <span className="text-ui leading-none">A</span>
        <span className="text-eyebrow leading-none">a</span>
      </span>
      <span className="font-sans text-caption text-paper/70">{fontLabel}</span>
    </button>
  );
}

export function ReaderLeadingButton() {
  const { leading, cycleLeading, leadingLabel } = useReaderPrefs();
  const gap =
    leading === "loose" ? "4px" : leading === "relaxed" ? "3px" : "2px";
  return (
    <button
      type="button"
      onClick={cycleLeading}
      title={`Line spacing: ${leadingLabel}. Click to change.`}
      aria-label={`Line spacing: ${leadingLabel}. Click to change.`}
      className="inline-flex items-center gap-2 rounded-pill border border-paper/15 bg-paper/[0.04] hover:border-paper/30 hover:bg-paper/10 focus:outline-none focus:ring-2 focus:ring-paper/25 px-3 py-2 font-sans text-detail font-medium text-paper transition-colors"
    >
      <span className="font-sans text-eyebrow font-semibold uppercase tracking-[1.2px] text-paper/50">
        Spacing
      </span>
      <span
        aria-hidden
        className="flex w-[14px] flex-col justify-center"
        style={{ gap }}
      >
        <span className="h-px w-full bg-paper/80" />
        <span className="h-px w-full bg-paper/80" />
        <span className="h-px w-3/4 bg-paper/80" />
      </span>
      <span className="font-sans text-caption text-paper/70">
        {leadingLabel}
      </span>
    </button>
  );
}

export function ReaderFocusButton() {
  const { focus, toggleFocus } = useReaderPrefs();
  return (
    <button
      type="button"
      onClick={toggleFocus}
      aria-pressed={focus}
      title="Focus reading — hide everything but the text"
      aria-label="Focus reading"
      className={cn(
        "inline-flex items-center gap-2 rounded-pill border px-3 py-2 font-sans text-detail font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-paper/25",
        focus
          ? "border-gold/55 bg-gold/15 text-paper"
          : "border-paper/15 bg-paper/[0.04] text-paper hover:border-paper/30 hover:bg-paper/10",
      )}
    >
      <FocusGlyph />
      <span>Focus</span>
    </button>
  );
}

function FocusGlyph() {
  return (
    <svg
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M16 3h3a2 2 0 0 1 2 2v3" />
      <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

/**
 * Mounted once on the reader. Reflects the persisted `focus` preference onto
 * <html> as `.reader-focus` (globals.css hides every chrome element and
 * collapses the reader grid), and renders the only always-reachable way out:
 * a small floating "Exit focus" control. Returns null when focus is off.
 */
export function ReaderFocusController() {
  const { focus, setFocus } = useReaderPrefs();
  useEffect(() => {
    const el = document.documentElement;
    el.classList.toggle("reader-focus", focus);
    return () => {
      el.classList.remove("reader-focus");
    };
  }, [focus]);
  if (!focus) return null;
  return (
    <button
      type="button"
      onClick={() => setFocus(false)}
      aria-label="Exit focus reading"
      className="fixed right-3 top-3 z-[70] inline-flex h-[38px] items-center gap-2 rounded-pill border border-paper/25 bg-night/85 px-3.5 font-sans text-detail font-medium text-paper/85 shadow-pop backdrop-blur transition-colors hover:border-paper/45 hover:text-paper"
    >
      <svg
        width={14}
        height={14}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </svg>
      Exit focus
    </button>
  );
}
