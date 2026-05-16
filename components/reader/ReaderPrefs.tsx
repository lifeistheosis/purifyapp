"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
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

const ReaderCtx = createContext<Ctx | null>(null);

export function ReaderPrefsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [size, setSizeState] = useState<ReaderSize>("md");
  const [font, setFontState] = useState<ReaderFont>("serif");

  useEffect(() => {
    try {
      const s = window.localStorage.getItem(SIZE_KEY);
      if (s && SIZES.includes(s as ReaderSize)) setSizeState(s as ReaderSize);
      const f = window.localStorage.getItem(FONT_KEY);
      if (f && FONTS.includes(f as ReaderFont)) setFontState(f as ReaderFont);
    } catch {
      /* ignore */
    }
  }, []);

  const setSize = useCallback((s: ReaderSize) => {
    setSizeState(s);
    try {
      window.localStorage.setItem(SIZE_KEY, s);
    } catch {
      /* ignore */
    }
  }, []);

  const setFont = useCallback((f: ReaderFont) => {
    setFontState(f);
    try {
      window.localStorage.setItem(FONT_KEY, f);
    } catch {
      /* ignore */
    }
  }, []);

  const cycleSize = useCallback(() => {
    setSizeState((cur) => {
      const next = SIZES[(SIZES.indexOf(cur) + 1) % SIZES.length];
      try {
        window.localStorage.setItem(SIZE_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const cycleFont = useCallback(() => {
    setFontState((cur) => {
      const next = FONTS[(FONTS.indexOf(cur) + 1) % FONTS.length];
      try {
        window.localStorage.setItem(FONT_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      size,
      font,
      setSize,
      setFont,
      cycleSize,
      cycleFont,
      sizeLabel: SIZE_LABELS[size],
      fontLabel: FONT_LABELS[font],
    }),
    [size, font, setSize, setFont, cycleSize, cycleFont],
  );

  return <ReaderCtx.Provider value={value}>{children}</ReaderCtx.Provider>;
}

export function useReaderPrefs(): Ctx {
  const ctx = useContext(ReaderCtx);
  if (!ctx) {
    return {
      size: "md",
      font: "serif",
      setSize: () => {},
      setFont: () => {},
      cycleSize: () => {},
      cycleFont: () => {},
      sizeLabel: SIZE_LABELS.md,
      fontLabel: FONT_LABELS.serif,
    };
  }
  return ctx;
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
