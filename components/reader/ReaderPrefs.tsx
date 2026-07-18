"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import {
  READING_THEMES,
  READING_THEME_KEY,
  coerceReadingTheme,
  type ReadingTheme,
} from "@/lib/reader/readingModes";
import { useProReadingModes } from "@/components/reader/useProReadingModes";

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
  theme: ReadingTheme;
};
const DEFAULT_SNAP: PrefsSnap = {
  size: "md",
  font: "serif",
  leading: "normal",
  focus: false,
  theme: "default",
};
let prefsCache: {
  rawS: string | null;
  rawF: string | null;
  rawL: string | null;
  rawFocus: string | null;
  rawT: string | null;
  val: PrefsSnap;
} | null = null;

function readPrefs(): PrefsSnap {
  if (typeof window === "undefined") return DEFAULT_SNAP;
  let rawS: string | null = null;
  let rawF: string | null = null;
  let rawL: string | null = null;
  let rawFocus: string | null = null;
  let rawT: string | null = null;
  try {
    rawS = window.localStorage.getItem(SIZE_KEY);
    rawF = window.localStorage.getItem(FONT_KEY);
    rawL = window.localStorage.getItem(LEADING_KEY);
    rawFocus = window.localStorage.getItem(FOCUS_KEY);
    rawT = window.localStorage.getItem(READING_THEME_KEY);
  } catch {
    return DEFAULT_SNAP;
  }
  if (
    prefsCache &&
    prefsCache.rawS === rawS &&
    prefsCache.rawF === rawF &&
    prefsCache.rawL === rawL &&
    prefsCache.rawFocus === rawFocus &&
    prefsCache.rawT === rawT
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
  const theme = coerceReadingTheme(rawT);
  const val: PrefsSnap = { size, font, leading, focus, theme };
  prefsCache = { rawS, rawF, rawL, rawFocus, rawT, val };
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
  theme: ReadingTheme;
  setSize: (s: ReaderSize) => void;
  setFont: (f: ReaderFont) => void;
  setLeading: (l: ReaderLeading) => void;
  setFocus: (v: boolean) => void;
  setTheme: (t: ReadingTheme) => void;
  cycleSize: () => void;
  cycleFont: () => void;
  cycleLeading: () => void;
  toggleFocus: () => void;
  cycleTheme: () => void;
  sizeLabel: string;
  fontLabel: string;
  leadingLabel: string;
  themeLabel: string;
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
  const { size, font, leading, focus, theme } = useSyncExternalStore(
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
  const setTheme = useCallback(
    (t: ReadingTheme) => write(READING_THEME_KEY, t),
    [],
  );
  const cycleTheme = useCallback(() => {
    const ids = READING_THEMES.map((t) => t.id);
    const cur = readPrefs().theme;
    write(READING_THEME_KEY, ids[(ids.indexOf(cur) + 1) % ids.length]);
  }, []);

  return {
    size,
    font,
    leading,
    focus,
    theme,
    setSize,
    setFont,
    setLeading,
    setFocus,
    setTheme,
    cycleSize,
    cycleFont,
    cycleLeading,
    toggleFocus,
    cycleTheme,
    sizeLabel: SIZE_LABELS[size],
    fontLabel: FONT_LABELS[font],
    leadingLabel: LEADING_LABELS[leading],
    themeLabel:
      READING_THEMES.find((t) => t.id === theme)?.label ?? "Standard",
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
 * Mounted once on the reader. Reflects the persisted reading-mode prefs onto
 * <html>: `focus` as the `.reader-focus` class (globals.css hides every
 * chrome element and collapses the reader grid) and `theme` as the
 * `data-reading-mode` attribute (globals.css re-maps the @theme palette
 * variables under it). Also renders the only always-reachable way out of
 * focus: a small floating "Exit focus" control.
 *
 * Premium themes are Pro-layer features: while the surface's enforcement
 * flag is off (today) everyone gets them; once it flips, non-Pro accounts
 * are coerced back to the default palette even if localStorage still holds
 * a premium theme id.
 */
export function ReadingModeController() {
  const { focus, setFocus, theme } = useReaderPrefs();
  const { allowed } = useProReadingModes();
  const effectiveTheme = allowed ? theme : "default";

  // Reflect the palette. A plain attribute swap: the CSS variables change
  // in one paint and every utility color follows. No View Transition here —
  // palette switches happen from an open settings sheet, where a full-page
  // crossfade reads as lag rather than polish.
  useEffect(() => {
    const el = document.documentElement;
    if (effectiveTheme === "default") {
      el.removeAttribute("data-reading-mode");
    } else {
      el.setAttribute("data-reading-mode", effectiveTheme);
    }
  }, [effectiveTheme]);

  // Unmount safety, mirroring the focus class below: never leak a reading
  // palette onto non-reader surfaces.
  useEffect(() => {
    return () => {
      document.documentElement.removeAttribute("data-reading-mode");
    };
  }, []);

  // Sync `html.reader-focus` with the `focus` preference. Uses the View
  // Transitions API when available so the browser crossfades the entire page
  // between its before/after layout snapshots — produces a true cinematic
  // dissolve in BOTH directions (entering and exiting focus) instead of
  // trying to animate dozens of chrome elements, some of which use
  // `display: contents` and can't be opacity-transitioned. Chrome 111+,
  // Safari 18+. Older browsers fall back to an instant snap.
  //
  // Critically, this effect has NO cleanup for the class toggle. Earlier we
  // returned `() => el.classList.remove("reader-focus")`, but useEffect
  // cleanup runs on every dependency change — so when focus flipped from
  // true to false, the cleanup would strip the class instantly BEFORE the
  // new effect's startViewTransition could snapshot it, killing the exit
  // animation. The class is now toggled solely by the effect body, and the
  // separate mount-only effect below handles unmount safety.
  useEffect(() => {
    const el = document.documentElement;
    type Doc = Document & {
      startViewTransition?: (cb: () => void) => { finished: Promise<void> };
    };
    const doc = document as Doc;
    if (typeof doc.startViewTransition === "function") {
      doc.startViewTransition(() => {
        el.classList.toggle("reader-focus", focus);
      });
    } else {
      el.classList.toggle("reader-focus", focus);
    }
  }, [focus]);

  // Safety: if the controller unmounts (e.g. user navigates away while focus
  // is on), strip the class so it doesn't leak onto other surfaces. Empty
  // deps ensures this cleanup only fires on actual unmount, never on a
  // focus-toggle re-render.
  useEffect(() => {
    return () => {
      document.documentElement.classList.remove("reader-focus");
    };
  }, []);

  // A guaranteed way out that no overlay can intercept: Escape exits focus
  // mode. Reported on the web reader (community, #purify-suggestions), where
  // the floating pill could sit under other fixed chrome on some desktop
  // layouts, leaving the reader with no working exit.
  useEffect(() => {
    if (!focus) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFocus(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focus, setFocus]);

  if (!focus) return null;
  // Portaled to <body>: rendered inline, the pill's fixed position still
  // stacks inside whatever transformed/filtered ancestor contains the reader,
  // and a z-40 sticky header can paint (and hit-test) OVER a z-[120] pill.
  // That is exactly how "Exit focus" went dead when the app-chrome tags were
  // dropped. At body level its z-index competes at the root, so the only
  // reachable exit stays reachable no matter what the page does.
  return createPortal(
    <button
      type="button"
      onClick={() => setFocus(false)}
      aria-label="Exit focus reading (or press Escape)"
      title="Exit focus reading (Esc)"
      data-reader-exit
      className="pointer-events-auto fixed right-3 top-3 z-[120] inline-flex h-[38px] items-center gap-2 rounded-pill border border-paper/25 bg-night/85 px-3.5 font-sans text-detail font-medium text-paper/85 shadow-pop backdrop-blur transition-colors hover:border-paper/45 hover:text-paper"
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
    </button>,
    document.body,
  );
}

// Backwards-compatible alias: the Bible chapter page mounts the controller
// under its original focus-only name.
export const ReaderFocusController = ReadingModeController;

/**
 * Compact cycle pill for toolbars that use the pill row (the saints
 * writings reader). Cycles Standard → Candlelight → Monastery → Parchment.
 * When the Pro gate is locked it routes to /pricing instead of applying.
 */
export function ReaderThemeButton() {
  const { theme, cycleTheme, themeLabel } = useReaderPrefs();
  const { allowed, locked } = useProReadingModes();
  return (
    <button
      type="button"
      onClick={() => {
        if (allowed) cycleTheme();
        else if (locked) window.location.href = "/pricing";
      }}
      title={
        allowed
          ? `Reading mode: ${themeLabel}. Click to change.`
          : "Reading modes are part of Purify Pro"
      }
      aria-label={
        allowed
          ? `Reading mode: ${themeLabel}. Click to change.`
          : "Reading modes are part of Purify Pro"
      }
      className={cn(
        "inline-flex items-center gap-2 rounded-pill border px-3 py-2 font-sans text-detail font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-paper/25",
        theme !== "default" && allowed
          ? "border-gold/55 bg-gold/15 text-paper"
          : "border-paper/15 bg-paper/[0.04] text-paper hover:border-paper/30 hover:bg-paper/10",
      )}
    >
      <ThemeGlyph />
      <span className="font-sans text-eyebrow font-semibold uppercase tracking-[1.2px] text-paper/50">
        Mode
      </span>
      <span className="font-sans text-caption text-paper/70">
        {allowed ? themeLabel : "Pro"}
      </span>
    </button>
  );
}

function ThemeGlyph() {
  // A quiet candle flame, matching the line style of the other glyphs.
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
      <path d="M12 3c1.8 2.1 2.7 3.8 2.7 5.2A2.7 2.7 0 0 1 12 11a2.7 2.7 0 0 1-2.7-2.8C9.3 6.8 10.2 5.1 12 3Z" />
      <path d="M8.5 14h7" />
      <path d="M9.5 14v5.5h5V14" />
    </svg>
  );
}
