"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Highlight palette + user-editable legend.
 *
 * Highlights now carry a color (stored on each VerseAnnotation as `color`).
 * The palette below is fixed; what each color *means* is up to the reader,
 * who can rename the meanings in the legend (persisted in localStorage and
 * shown under the chapter as a footnote key). The standard/default color is
 * yellow.
 */

export type HighlightColor = {
  id: string;
  /** Solid accent: the annotation toolbar chip border/text. (Historically
   * this drew a left margin bar on highlighted verses; the verse now gets
   * a per-line text wash — `verseBg` — like a real highlighter stroke.) */
  bar: string;
  /** Translucent fill for word-level highlights. */
  wordBg: string;
  /** Quieter translucent wash for a whole-verse highlight. Deliberately
   * fainter than wordBg so a word-level emphasis still reads inside a
   * washed verse. */
  verseBg: string;
  /** Solid swatch color for pickers and the legend dots. */
  swatch: string;
  /** Default meaning label; the reader can override it in the legend. */
  defaultLabel: string;
};

export const HIGHLIGHT_COLORS: HighlightColor[] = [
  {
    id: "yellow",
    bar: "rgb(233,196,106)",
    wordBg: "rgba(233,196,106,0.32)",
    verseBg: "rgba(233,196,106,0.15)",
    swatch: "rgb(233,196,106)",
    defaultLabel: "Key verse",
  },
  {
    id: "green",
    bar: "rgb(127,176,105)",
    wordBg: "rgba(127,176,105,0.32)",
    verseBg: "rgba(127,176,105,0.15)",
    swatch: "rgb(127,176,105)",
    defaultLabel: "Promise",
  },
  {
    id: "blue",
    bar: "rgb(107,164,201)",
    wordBg: "rgba(107,164,201,0.32)",
    verseBg: "rgba(107,164,201,0.15)",
    swatch: "rgb(107,164,201)",
    defaultLabel: "Teaching",
  },
  {
    id: "rose",
    bar: "rgb(217,138,168)",
    wordBg: "rgba(217,138,168,0.32)",
    verseBg: "rgba(217,138,168,0.15)",
    swatch: "rgb(217,138,168)",
    defaultLabel: "Prayer",
  },
  {
    id: "purple",
    bar: "rgb(169,138,217)",
    wordBg: "rgba(169,138,217,0.32)",
    verseBg: "rgba(169,138,217,0.15)",
    swatch: "rgb(169,138,217)",
    defaultLabel: "Prophecy",
  },
];

/** The standard highlight color, used when none is chosen. */
export const DEFAULT_HIGHLIGHT_COLOR = "yellow";

const BY_ID = new Map(HIGHLIGHT_COLORS.map((c) => [c.id, c]));

/** Resolve a color id to its definition, falling back to the default. */
export function colorById(id?: string): HighlightColor {
  return (id ? BY_ID.get(id) : undefined) ?? BY_ID.get(DEFAULT_HIGHLIGHT_COLOR)!;
}

// ---------------------------------------------------------------------------
// User-editable legend labels.
// ---------------------------------------------------------------------------

const LEGEND_KEY = "purify:bible:highlight-legend";
const LEGEND_EVENT = "purify:highlight-legend";

type LegendMap = Record<string, string>;

const SERVER_EMPTY: LegendMap = {};

// Cache the parsed object keyed by the raw string so useSyncExternalStore gets
// a stable reference between reads (otherwise it loops).
let legendCache: { raw: string | null; val: LegendMap } | null = null;

function readLegend(): LegendMap {
  if (typeof window === "undefined") return SERVER_EMPTY;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(LEGEND_KEY);
  } catch {
    return SERVER_EMPTY;
  }
  if (legendCache && legendCache.raw === raw) return legendCache.val;
  let val: LegendMap = SERVER_EMPTY;
  if (raw) {
    try {
      val = JSON.parse(raw) as LegendMap;
    } catch {
      val = SERVER_EMPTY;
    }
  }
  legendCache = { raw, val };
  return val;
}

function subscribe(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(LEGEND_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(LEGEND_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/**
 * Read + edit the highlight legend (the per-color meanings). Backed by
 * localStorage and synced across mounted instances via the same custom-event
 * pattern as verse annotations.
 */
export function useHighlightLegend() {
  const overrides = useSyncExternalStore(
    subscribe,
    readLegend,
    () => SERVER_EMPTY,
  );

  const labelFor = useCallback(
    (id: string) => overrides[id] ?? colorById(id).defaultLabel,
    [overrides],
  );

  const setLabel = useCallback((id: string, label: string) => {
    try {
      const cur = readLegend();
      const next: LegendMap = { ...cur };
      const trimmed = label.trim();
      if (!trimmed || trimmed === colorById(id).defaultLabel) {
        delete next[id];
      } else {
        next[id] = trimmed;
      }
      if (Object.keys(next).length > 0) {
        window.localStorage.setItem(LEGEND_KEY, JSON.stringify(next));
      } else {
        window.localStorage.removeItem(LEGEND_KEY);
      }
      legendCache = null;
      window.dispatchEvent(new CustomEvent(LEGEND_EVENT));
    } catch {
      /* storage may be unavailable */
    }
  }, []);

  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(LEGEND_KEY);
      legendCache = null;
      window.dispatchEvent(new CustomEvent(LEGEND_EVENT));
    } catch {
      /* storage may be unavailable */
    }
  }, []);

  return { colors: HIGHLIGHT_COLORS, labelFor, setLabel, reset };
}
