// Premium Reading Modes — the palette half of the Plus reading layer.
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

export type ReadingTheme =
  | "default"
  | "candlelight"
  | "monastery"
  | "parchment"
  // Collection palettes: one per study collection, named by theme_id in
  // data/catechism/collections.json. Paid like Candlelight and Monastery;
  // shown in the chips only once the collection is complete.
  | "councils"
  | "cappadocian";

export const READING_THEME_KEY = "purify.reader.theme";

export const READING_THEMES: {
  id: ReadingTheme;
  label: string;
  blurb: string;
  /**
   * A palette paired with a study collection (lib/catechism/collections.ts).
   * Same gate as the other paid palettes; the difference is where it is
   * offered. ReadingModeChips lists a collection palette only while it is the
   * active one or its collection is complete, so the grid does not advertise
   * palettes a reader has no path to yet.
   */
  collection?: true;
}[] = [
  { id: "default", label: "Dark", blurb: "The Purify night palette" },
  // The id stays `parchment` so a palette already chosen on a reader's device
  // survives the rename. Only what they are shown changes.
  { id: "parchment", label: "Light", blurb: "Warm paper, dark ink" },
  { id: "candlelight", label: "Candlelight", blurb: "Warm amber, late-hour reading" },
  { id: "monastery", label: "Monastery", blurb: "Cool stone and quiet indigo" },
  // Collection palettes. Adding one: a token block in app/globals.css under
  // html[data-reading-mode="<id>"], the id in the ReadingTheme union above, an
  // entry here with `collection: true`, the id in lib/reader/prepaint.ts, a
  // swatch in components/reader/ReadingModeChips.tsx, and a collection in
  // data/catechism/collections.json that names it. docs/CATECHISM.md walks it.
  { id: "councils", label: "Councils", blurb: "Deep navy and gold", collection: true },
  { id: "cappadocian", label: "Cappadocian", blurb: "Warm dusk, cream and rubric red", collection: true },
];

/**
 * The palettes every reader gets, entitlement or not.
 *
 * Light mode is an accessibility setting, not a premium feature. It was asked
 * for by elderly readers who reported dizziness on the dark palette, and the
 * answer given publicly on 2026-07-25 was that it would not sit behind a
 * paywall:
 * "being able to read is not a premium feature". Candlelight and Monastery are
 * preferences rather than needs, so they stay in the paid layer, which moved
 * from Pro to Plus on 2026-08-12.
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

/** The palettes that belong to a study collection, by id. */
export const COLLECTION_THEME_IDS: ReadonlySet<string> = new Set(
  READING_THEMES.filter((t) => t.collection).map((t) => t.id),
);

export function isCollectionTheme(theme: string): boolean {
  return COLLECTION_THEME_IDS.has(theme);
}

/** The label a reader sees for a palette id, or the id when unknown. */
export function themeLabel(theme: string): string {
  return READING_THEMES.find((t) => t.id === theme)?.label ?? theme;
}

/** Coerce an untrusted raw value (localStorage, query, anything) to a
 * valid theme; anything unknown falls back to the default palette. */
export function coerceReadingTheme(
  raw: string | null | undefined,
): ReadingTheme {
  return raw && THEME_IDS.has(raw) ? (raw as ReadingTheme) : "default";
}
