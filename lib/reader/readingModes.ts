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
  { id: "default", label: "Dark", blurb: "The Purify night palette" },
  // The id stays `parchment` so a palette already chosen on a reader's device
  // survives the rename. Only what they are shown changes.
  { id: "parchment", label: "Light", blurb: "Warm paper, dark ink" },
  { id: "candlelight", label: "Candlelight", blurb: "Warm amber, late-hour reading" },
  { id: "monastery", label: "Monastery", blurb: "Cool stone and quiet indigo" },
];

/**
 * The palettes every reader gets, entitlement or not.
 *
 * Light mode is an accessibility setting, not a premium feature. It was asked
 * for by elderly readers who reported dizziness on the dark palette, and the
 * answer given publicly on 2026-07-25 was that it would not sit behind Pro:
 * "being able to read is not a premium feature". Candlelight and Monastery are
 * preferences rather than needs, so they stay in the Pro layer.
 *
 * If you are about to add a palette here, the test in
 * lib/reader/__tests__/readingModes.test.ts is what holds that promise in
 * place. Move a theme out of this list and it fails, on purpose.
 */
export const FREE_THEMES: readonly ReadingTheme[] = ["default", "parchment"];

/** Is this palette available to every reader? */
export function isFreeTheme(theme: ReadingTheme): boolean {
  return FREE_THEMES.includes(theme);
}

const THEME_IDS = new Set<string>(READING_THEMES.map((t) => t.id));

/** Coerce an untrusted raw value (localStorage, query, anything) to a
 * valid theme; anything unknown falls back to the default palette. */
export function coerceReadingTheme(
  raw: string | null | undefined,
): ReadingTheme {
  return raw && THEME_IDS.has(raw) ? (raw as ReadingTheme) : "default";
}
