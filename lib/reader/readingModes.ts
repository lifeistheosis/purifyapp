// Premium Reading Modes — the palette half of the Pro reading layer.
// Pure module (no window, no React) so it tests under the node vitest
// environment and imports cleanly from server and client alike.
//
// A reading theme re-colors the reading surface by setting
// `data-reading-mode` on <html>; app/globals.css overrides the Tailwind
// @theme variables (--color-night/-soft, --color-paper, --color-gold*)
// under that attribute, so every existing utility class re-themes with
// zero per-component styling. Focus Mode is deliberately NOT a theme:
// it hides chrome (an orthogonal boolean in ReaderPrefs) and composes
// with any palette — Candlelight plus Focus is the intended best pairing.

export type ReadingTheme = "default" | "candlelight" | "monastery" | "parchment";

export const READING_THEME_KEY = "purify.reader.theme";

export const READING_THEMES: {
  id: ReadingTheme;
  label: string;
  blurb: string;
}[] = [
  { id: "default", label: "Standard", blurb: "The Purify night palette" },
  { id: "candlelight", label: "Candlelight", blurb: "Warm amber, late-hour reading" },
  { id: "monastery", label: "Monastery", blurb: "Cool stone and quiet indigo" },
  { id: "parchment", label: "Parchment", blurb: "Aged paper, dark ink" },
];

const THEME_IDS = new Set<string>(READING_THEMES.map((t) => t.id));

/** Coerce an untrusted raw value (localStorage, query, anything) to a
 * valid theme; anything unknown falls back to the default palette. */
export function coerceReadingTheme(
  raw: string | null | undefined,
): ReadingTheme {
  return raw && THEME_IDS.has(raw) ? (raw as ReadingTheme) : "default";
}
