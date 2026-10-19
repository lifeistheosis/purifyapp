"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { readerPillClass } from "@/components/bible/ReaderPill";
import { Close } from "@/components/ui/icons/Close";
import { useOverlayOpen } from "@/lib/ui/overlay";
import {
  READING_THEMES,
  READING_THEME_KEY,
  coerceReadingTheme,
  type ReadingTheme,
} from "@/lib/reader/readingModes";
import { usePlusReadingModes } from "@/components/reader/usePlusReadingModes";
import { useTranslate } from "@/components/i18n/MessagesProvider";

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
// apply an inline lineHeight that reliably wins over the utility class, a
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
// BOTH breakpoints: previously md and lg both mapped to md:text-lede, so
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
  cycleTheme: (allows?: (t: ReadingTheme) => boolean) => void;
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
  /**
   * Step to the next palette. Pass `allows` from usePlusReadingModes to skip
   * the ones this reader is not entitled to, so an unentitled tap lands on a
   * palette that actually applies instead of one the theme controller will
   * silently undo a frame later.
   */
  const cycleTheme = useCallback((allows?: (t: ReadingTheme) => boolean) => {
    const ids = READING_THEMES.map((t) => t.id).filter(
      (id) => !allows || allows(id),
    );
    if (ids.length === 0) return;
    const cur = readPrefs().theme;
    const at = ids.indexOf(cur);
    write(READING_THEME_KEY, ids[(at + 1) % ids.length]);
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
  const { t } = useTranslate();
  const { size, cycleSize, sizeLabel } = useReaderPrefs();
  return (
    <button
      type="button"
      onClick={cycleSize}
      title={`Text size: ${sizeLabel}. Click to change.`}
      aria-label={`Text size: ${sizeLabel}. Click to change.`}
      className="inline-flex items-center gap-2 rounded-pill border border-paper/15 bg-paper/[0.04] hover:border-paper/30 hover:bg-paper/10 focus:outline-none focus:ring-2 focus:ring-paper/25 px-3 py-2 font-sans text-detail font-medium text-paper transition-colors"
    >
      <span className="font-sans text-caption font-semibold text-paper/50">
        {t("ui.size")}
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
  const { t } = useTranslate();
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
      <span className="font-sans text-caption font-semibold text-paper/50">
        {t("ui.font")}
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
  const { t } = useTranslate();
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
      <span className="font-sans text-caption font-semibold text-paper/50">
        {t("ui.spacing")}
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
  const { t } = useTranslate();
  const { focus, toggleFocus } = useReaderPrefs();
  return (
    <button
      type="button"
      onClick={toggleFocus}
      aria-pressed={focus}
      title={t("ui.focusReadingHideEverythingBut")}
      aria-label={t("bible.focusReading")}
      // The reader's pill (components/bible/ReaderPill.tsx), so the toolbar's
      // six controls stand at one height.
      className={readerPillClass({ pressed: focus })}
    >
      <FocusGlyph />
      <span>{t("ui.focus")}</span>
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
 * How long the way out of focus stays in sight after the reader last tapped.
 * A tap brings it back; scrolling, which is reading, does not.
 */
const EXIT_SHOWN_MS = 3000;

/**
 * The way out of focus (1.7). It sits at the foot of the screen, in the
 * middle, clear of the mini player and today's readings when either is up:
 * at the top right it sat on the top bar's search, bookmark and settings
 * (the owner's note 7 of 2026-10-16, on a tablet: "the exit button clashes
 * with the cards in the top right"). It shows as focus begins, fades after
 * a few seconds so only the text is left, and comes back on a tap anywhere,
 * a mouse moving, or Tab; Escape leaves focus at any time. While a sheet is
 * open over the text (the Fathers) it steps aside.
 *
 * Focus hides the top bar, so it also covers the strip under the phone's
 * clock, which nothing else does then: the text would scroll under it.
 */
function FocusExit({ onExit }: { onExit: () => void }) {
  const { t } = useTranslate();
  const [shown, setShown] = useState(true);
  const covered = useOverlayOpen();

  useEffect(() => {
    let timer = window.setTimeout(() => setShown(false), EXIT_SHOWN_MS);
    const show = () => {
      setShown(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setShown(false), EXIT_SHOWN_MS);
    };
    // A tap is a finger that comes up about where it went down. A scroll
    // never comes up: the browser takes it and sends pointercancel.
    let down: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY };
    };
    const onUp = (e: PointerEvent) => {
      if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 12) show();
      down = null;
    };
    const onCancel = () => {
      down = null;
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "mouse") show();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Tab") show();
    };
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onCancel, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const visible = shown && !covered;
  // Portaled to <body>: rendered inline, the pill's fixed position still
  // stacks inside whatever transformed/filtered ancestor contains the reader,
  // and a z-40 sticky header can paint (and hit-test) OVER a z-[120] pill.
  // That is exactly how "Exit focus" went dead when the app-chrome tags were
  // dropped. At body level its z-index competes at the root, so the only
  // reachable exit stays reachable no matter what the page does.
  return createPortal(
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-[119] bg-night"
        style={{ height: "env(safe-area-inset-top, 0px)" }}
      />
      <div
        className="pointer-events-none fixed inset-x-0 z-[120] flex justify-center px-4"
        style={{
          bottom:
            "calc(env(safe-area-inset-bottom, 0px) + var(--tab-bar-h, 0px) + var(--now-playing-h, 0px) + var(--readings-flow-h, 0px) + 20px)",
        }}
      >
        <button
          type="button"
          onClick={onExit}
          aria-label={t("ui.exitFocusReadingOrPress")}
          title={t("ui.exitFocusReadingEsc")}
          data-reader-exit
          className={cn(
            "hit-44 inline-flex h-10 items-center gap-2 rounded-pill border border-paper/15 bg-night-soft px-4 font-sans text-detail font-medium text-paper/85 shadow-pop hover:border-paper/35 hover:text-paper",
            "focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper",
            "motion-safe:transition-opacity motion-safe:duration-300",
            visible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          <Close size={14} />
          {t("ui.exitFocus")}
        </button>
      </div>
    </>,
    document.body,
  );
}

/**
 * The verse (or a work's paragraph) at the top of the screen keeps its place
 * while `change` adds or removes the bars above it. Entering focus takes the
 * top bar and the controls away, and the text would jump up by their height;
 * Android's WebView keeps its place by itself, an iPad's does not. At the very
 * top of the page nothing is held, so leaving focus there shows the controls.
 */
function holdPlace(change: () => void) {
  const root = document.documentElement;
  let anchor: HTMLElement | null = null;
  if (window.scrollY > 0) {
    for (const el of document.querySelectorAll<HTMLElement>("[data-verse], [data-own-press]")) {
      if (el.getBoundingClientRect().bottom > 96) {
        anchor = el;
        break;
      }
    }
  }
  const before = anchor?.getBoundingClientRect().top ?? 0;
  const was = root.style.overflowAnchor;
  root.style.overflowAnchor = "none";
  change();
  if (anchor) {
    const after = anchor.getBoundingClientRect();
    if (after.height > 0 && Math.abs(after.top - before) > 1) window.scrollBy(0, after.top - before);
  }
  root.style.overflowAnchor = was;
}

/**
 * Mounted once on the reader. Reflects the persisted reading-mode prefs onto
 * <html>: `focus` as the `.reader-focus` class (globals.css hides every
 * chrome element and collapses the reader grid) and `theme` as the
 * `data-reading-mode` attribute (globals.css re-maps the @theme palette
 * variables under it). Also renders the only always-reachable way out of
 * focus, FocusExit above, with Escape beside it.
 *
 * Premium themes are Plus-layer features: while the surface's enforcement
 * flag is off (today) everyone gets them; once it flips, unentitled accounts
 * are coerced back to the default palette even if localStorage still holds
 * a premium theme id.
 */
export function ReadingModeController() {
  const { focus, setFocus } = useReaderPrefs();

  // The palette is applied app-wide by components/theme/AppThemeController,
  // mounted in the root layout, and is NOT applied or stripped here any more.
  //
  // This used to own it, and stripped `data-reading-mode` on unmount so a
  // palette could never "leak" onto a non-reader surface. That was the whole
  // reason a chosen palette stopped at the reader's edge: leaving the reader
  // put you back on the default colours. The palette is the app's palette
  // now, so leaking is the intended behaviour and the strip is gone.
  //
  // The paid gate is unchanged and still lives here in `effectiveTheme`: this
  // release promoted the mechanism, not the entitlement.

  // Sync `html.reader-focus` with the `focus` preference. Uses the View
  // Transitions API when available so the browser crossfades the entire page
  // between its before/after layout snapshots, which produces a true cinematic
  // dissolve in BOTH directions (entering and exiting focus) instead of
  // trying to animate dozens of chrome elements, some of which use
  // `display: contents` and can't be opacity-transitioned. Chrome 111+,
  // Safari 18+. Older browsers fall back to an instant snap.
  //
  // Only a real change animates. `lastFocus` holds the value this effect
  // last applied (null before its first run), so the initial mount just sets
  // the class: there is nothing to dissolve from, and a transition started
  // while the page is still loading is often skipped. The browser can also
  // skip one mid-flight (the tab is hidden, or another transition starts).
  // A skipped transition still runs the callback, so the class lands either
  // way, but its `ready` promise rejects with "AbortError: Transition was
  // skipped". Nothing else observes it, so the rejection is swallowed rather
  // than left to surface as an uncaught page error. `finished` stays
  // unawaited.
  //
  // Critically, this effect has NO cleanup for the class toggle. Earlier we
  // returned `() => el.classList.remove("reader-focus")`, but useEffect
  // cleanup runs on every dependency change, so when focus flipped from
  // true to false, the cleanup would strip the class instantly BEFORE the
  // new effect's startViewTransition could snapshot it, killing the exit
  // animation. The class is now toggled solely by the effect body, and the
  // separate mount-only effect below handles unmount safety.
  const lastFocus = useRef<boolean | null>(null);
  useEffect(() => {
    const el = document.documentElement;
    const changed = lastFocus.current !== null && lastFocus.current !== focus;
    lastFocus.current = focus;
    type Doc = Document & {
      startViewTransition?: (cb: () => void) => {
        ready: Promise<void>;
        finished: Promise<void>;
      };
    };
    const doc = document as Doc;
    const apply = () => holdPlace(() => el.classList.toggle("reader-focus", focus));
    if (changed && typeof doc.startViewTransition === "function") {
      doc.startViewTransition(apply).ready.catch(() => {});
    } else if (changed) {
      apply();
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
  return <FocusExit onExit={() => setFocus(false)} />;
}

// Backwards-compatible alias: the Bible chapter page mounts the controller
// under its original focus-only name.
export const ReaderFocusController = ReadingModeController;

/**
 * Compact cycle pill for toolbars that use the pill row (the saints
 * writings reader). Cycles Dark → Light → True black for every reader, and
 * on through Candlelight and Monastery for a Plus one.
 */
export function ReaderThemeButton() {
  const { t } = useTranslate();
  const { theme, cycleTheme, themeLabel } = useReaderPrefs();
  const { allows } = usePlusReadingModes();
  // The palette's name in the reader's language, from the catalog key the
  // registry holds beside the English (lib/reader/readingModes.ts). A
  // collection palette has no key yet and keeps the name the registry wrote.
  const nameKey = READING_THEMES.find((m) => m.id === theme)?.labelKey;
  const paletteName = nameKey ? t(nameKey) : themeLabel;
  // Every reader has at least Dark and Light, so this button always has
  // somewhere to go and never needs to send anyone to /pricing. The paid
  // upsell lives on the chips in the settings menu, where the palettes a
  // reader cannot reach are actually shown.
  return (
    <button
      type="button"
      onClick={() => cycleTheme(allows)}
      title={`Reading mode: ${paletteName}. Click to change.`}
      aria-label={`Reading mode: ${paletteName}. Click to change.`}
      className={cn(
        "inline-flex items-center gap-2 rounded-pill border px-3 py-2 font-sans text-detail font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-paper/25",
        theme !== "default" && allows(theme)
          ? "border-gold/55 bg-gold/15 text-paper"
          : "border-paper/15 bg-paper/[0.04] text-paper hover:border-paper/30 hover:bg-paper/10",
      )}
    >
      <ThemeGlyph />
      <span className="font-sans text-caption font-semibold text-paper/50">
        {t("ui.mode")}
      </span>
      <span className="font-sans text-caption text-paper/70">{paletteName}</span>
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
