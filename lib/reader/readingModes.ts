// Premium Reading Modes: the palette half of the Plus reading layer.
// Pure module (no window, no React) so it tests under the node vitest
// environment and imports cleanly from server and client alike.
//
// A reading theme re-colors the reading surface by setting
// `data-reading-mode` on <html>; app/globals.css overrides the Tailwind
// @theme variables (--color-night/-soft, --color-paper, --color-gold*)
// under that attribute, so every existing utility class re-themes with
// zero per-component styling. Focus Mode is deliberately NOT a theme:
// it hides chrome (an orthogonal boolean in ReaderPrefs) and composes
// with any palette. Candlelight plus Focus is the intended best pairing.

export type ReadingTheme =
  | "default"
  | "candlelight"
  | "monastery"
  | "parchment"
  // True black (1.6): the Dark palette on a pure #000000 ground, for OLED
  // screens. Free, see FREE_THEMES below.
  | "black"
  // Collection palettes: one per study collection, named by theme_id in
  // data/catechism/collections.json. Paid like Candlelight and Monastery;
  // shown in the chips only once the collection is complete.
  | "councils"
  | "cappadocian"
  // The looks (1.9): seventeen Plus themes in four families. A look is worn
  // over Dark or over Light as a second attribute, `data-look`, so every rule
  // the app has for those two palettes still answers (themeAttributes below).
  // There were eighteen: Fire came out before the looks were released
  // (RETIRED_THEMES below).
  | "nightsky"
  | "dawn"
  | "incense"
  | "athos"
  | "forest"
  | "desert"
  | "jordan"
  | "galilee"
  | "patmos"
  | "blush"
  | "rose"
  | "lavender"
  | "olive"
  | "mosaic"
  | "stone"
  | "damask"
  | "linen";

/** The four families the looks are shelved in (the picker, components/settings/ReadingModeGallery.tsx). */
export type ThemeFamily = "night" | "land" | "garden" | "sanctuary";

export const THEME_FAMILIES: {
  id: ThemeFamily;
  label: string;
  line: string;
  labelKey: string;
  lineKey: string;
}[] = [
  { id: "night", label: "Night", line: "The hours of the dark, and what lights them", labelKey: "settings.familyNight", lineKey: "settings.familyNightLine" },
  { id: "land", label: "Land and sea", line: "The places the Church has prayed in", labelKey: "settings.familyLand", lineKey: "settings.familyLandLine" },
  { id: "garden", label: "Garden", line: "Paper and flowers", labelKey: "settings.familyGarden", lineKey: "settings.familyGardenLine" },
  { id: "sanctuary", label: "Sanctuary", line: "What the hands of the Church have made", labelKey: "settings.familySanctuary", lineKey: "settings.familySanctuaryLine" },
];

export const READING_THEME_KEY = "purify.reader.theme";

export const READING_THEMES: {
  id: ReadingTheme;
  label: string;
  blurb: string;
  /**
   * Where the message catalogs hold this palette's name and its one line, so
   * the screen that draws them can say them in the reader's language
   * (components/reader/ReadingModeChips.tsx). This module stays free of
   * React, so it carries the keys and not the words. The English beside
   * them is the fallback and what the tests read, and it has to stay the
   * same, letter for letter, as en.json under these keys
   * (lib/i18n/__tests__/smallLabels.test.ts holds the two together).
   *
   * A collection palette has no keys yet: its name is drawn as written here
   * until it has been translated.
   */
  labelKey?: string;
  blurbKey?: string;
  /**
   * A palette paired with a study collection (lib/catechism/collections.ts).
   * Same gate as the other paid palettes; the difference is where it is
   * offered: from its collection on /catechism/collections once that is
   * complete (components/catechism/ThemeRow.tsx). ReadingModeChips lists a
   * collection palette only while it is the active one, so the grid does not
   * advertise palettes a reader has no path to yet.
   */
  collection?: true;
  /**
   * A look (1.9): a Plus theme with a sign of its own, shelved under this
   * family in the picker. Candlelight and Monastery are shelved too, so the
   * picker has every palette; they are palettes of their own, not looks.
   */
  family?: ThemeFamily;
  /** A look, and what it is worn over: Dark, or Light (whose rules it then keeps). */
  look?: "dark" | "light";
}[] = [
  {
    id: "default",
    label: "Dark",
    blurb: "The Purify night palette",
    labelKey: "settings.paletteDark",
    blurbKey: "settings.paletteDarkHint",
  },
  // The id stays `parchment` so a palette already chosen on a reader's device
  // survives the rename. Only what they are shown changes.
  {
    id: "parchment",
    label: "Light",
    blurb: "Warm paper, dark ink",
    labelKey: "settings.paletteLight",
    blurbKey: "settings.paletteLightHint",
  },
  // After Light, so Dark and Light keep the first row of the chips, and
  // before the paid ones, because it is free. A palette of this kind follows
  // the list below less the collection, and joins the palette list in
  // lib/ui/__tests__/litPalette.test.ts, which checks its contrast.
  {
    id: "black",
    label: "True black",
    blurb: "Pure black for OLED screens",
    labelKey: "settings.paletteTrueBlack",
    blurbKey: "settings.paletteTrueBlackHint",
  },
  {
    id: "candlelight",
    label: "Candlelight",
    blurb: "Black and light grey, late-hour reading",
    labelKey: "settings.paletteCandlelight",
    blurbKey: "settings.paletteCandlelightHint",
    family: "night",
  },
  {
    id: "monastery",
    label: "Monastery",
    blurb: "Cool stone and quiet indigo",
    labelKey: "settings.paletteMonastery",
    blurbKey: "settings.paletteMonasteryHint",
    family: "sanctuary",
  },
  // The looks (1.9, docs/1.9-build/notes/themes-fable.md, "The third set"):
  // Plus, like the two above. Each is one calm page and one sign: a still
  // picture at the foot of the screen, or the rule at a page's head. Five carry
  // the names of the quote picture looks they are painted from
  // (lib/share/verseCard.ts, QUOTE_LOOKS), already in every catalog. Adding
  // one: its entry here, its id in the ReadingTheme union and in
  // lib/reader/prepaint.ts, its block in app/globals.css under
  // html[data-look="<id>"], its small page (.set-mode-page[data-palette]),
  // and its words in the catalogs.
  {
    id: "nightsky",
    label: "Night sky",
    blurb: "A still night, small stars, the star above",
    labelKey: "settings.paletteNightSky",
    blurbKey: "settings.paletteNightSkyHint",
    family: "night",
    look: "dark",
  },
  {
    id: "dawn",
    label: "Dawn",
    blurb: "The last of the night, and the light coming up",
    labelKey: "picture.look.dawn",
    blurbKey: "settings.paletteDawnHint",
    family: "night",
    look: "dark",
  },
  {
    id: "incense",
    label: "Incense",
    blurb: "The evening's smoke, rising slowly",
    labelKey: "settings.paletteIncense",
    blurbKey: "settings.paletteIncenseHint",
    family: "night",
    look: "dark",
  },
  {
    id: "athos",
    label: "Holy Mountain",
    blurb: "The peak of Athos over the sea at dusk",
    labelKey: "settings.paletteHolyMountain",
    blurbKey: "settings.paletteHolyMountainHint",
    family: "land",
    look: "dark",
  },
  {
    id: "forest",
    label: "Forest",
    blurb: "The firs of the north, mist between them",
    labelKey: "settings.paletteForest",
    blurbKey: "settings.paletteForestHint",
    family: "land",
    look: "dark",
  },
  {
    id: "desert",
    label: "Desert",
    blurb: "The dunes of the Fathers in the last light",
    labelKey: "settings.paletteDesert",
    blurbKey: "settings.paletteDesertHint",
    family: "land",
    look: "light",
  },
  {
    id: "jordan",
    label: "Jordan",
    blurb: "Still water, and the rings going out over it",
    labelKey: "settings.paletteJordan",
    blurbKey: "settings.paletteJordanHint",
    family: "land",
    look: "light",
  },
  {
    id: "galilee",
    label: "Galilee",
    blurb: "The sea by night, and the light lying on the water",
    labelKey: "settings.paletteGalilee",
    blurbKey: "settings.paletteGalileeHint",
    family: "land",
    look: "dark",
  },
  {
    id: "patmos",
    label: "Patmos",
    blurb: "A white wall, and the sea beyond it",
    labelKey: "settings.palettePatmos",
    blurbKey: "settings.palettePatmosHint",
    family: "land",
    look: "light",
  },
  {
    id: "blush",
    label: "Blush",
    blurb: "Pink paper, a bloom of rose low on the page",
    labelKey: "picture.look.blush",
    blurbKey: "settings.paletteBlushHint",
    family: "garden",
    look: "light",
  },
  {
    id: "rose",
    label: "Roses",
    blurb: "Cream paper and Redouté's roses",
    labelKey: "picture.look.rose",
    blurbKey: "settings.paletteRosesHint",
    family: "garden",
    look: "light",
  },
  {
    id: "lavender",
    label: "Lavender",
    blurb: "Lilac paper and sprigs of lavender",
    labelKey: "picture.look.lavender",
    blurbKey: "settings.paletteLavenderHint",
    family: "garden",
    look: "light",
  },
  {
    id: "olive",
    label: "Olive",
    blurb: "Pale green paper and a branch of olive",
    labelKey: "picture.look.olive",
    blurbKey: "settings.paletteOliveHint",
    family: "garden",
    look: "light",
  },
  {
    id: "mosaic",
    label: "Mosaic",
    blurb: "Lapis, and a wall of tesserae",
    labelKey: "settings.paletteMosaic",
    blurbKey: "settings.paletteMosaicHint",
    family: "sanctuary",
    look: "dark",
  },
  {
    id: "stone",
    label: "Stone",
    blurb: "The foot of a monastery wall",
    labelKey: "settings.paletteStone",
    blurbKey: "settings.paletteStoneHint",
    family: "sanctuary",
    look: "light",
  },
  {
    id: "damask",
    label: "Damask",
    blurb: "Wine-red cloth, its own weave a step lighter",
    labelKey: "settings.paletteDamask",
    blurbKey: "settings.paletteDamaskHint",
    family: "sanctuary",
    look: "dark",
  },
  {
    id: "linen",
    label: "Linen",
    blurb: "White cloth, embroidered in red",
    labelKey: "settings.paletteLinen",
    blurbKey: "settings.paletteLinenHint",
    family: "sanctuary",
    look: "light",
  },
  // Collection palettes. Adding one: a token block in app/globals.css under
  // html[data-reading-mode="<id>"], the id in the ReadingTheme union above, an
  // entry here with `collection: true`, the id in lib/reader/prepaint.ts, a
  // swatch in components/reader/ReadingModeChips.tsx, and a collection in
  // data/catechism/collections.json that names it. docs/CATECHISM.md walks it.
  // From 1.9 these two are earned by reading (lib/reader/earned.ts, rec 79),
  // and have their names in every language.
  {
    id: "councils",
    label: "Councils",
    blurb: "Deep navy, cream and silver",
    labelKey: "settings.paletteCouncils",
    blurbKey: "settings.paletteCouncilsHint",
    collection: true,
  },
  {
    id: "cappadocian",
    label: "Cappadocian",
    blurb: "Warm dusk, cream and rubric red",
    labelKey: "settings.paletteCappadocian",
    blurbKey: "settings.paletteCappadocianHint",
    collection: true,
  },
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
 * True black joined on 2026-10-10, by the owner's word that day: the touches
 * that make the app feel at home on a phone, true black among them, are free
 * to every reader. It is the Dark palette with the screen's own black under
 * it, not a new look to sell.
 *
 * If you are about to add a palette here, the test in
 * lib/reader/__tests__/readingModes.test.ts is what holds that promise in
 * place. Move a theme out of this list and it fails, on purpose.
 */
export const FREE_THEMES: readonly ReadingTheme[] = ["default", "parchment", "black"];

/** Is this palette available to every reader? */
export function isFreeTheme(theme: ReadingTheme): boolean {
  return FREE_THEMES.includes(theme);
}

/**
 * The palette a reader WEARS, as against the one they have stored: their own
 * where the Plus gate lets them wear it, and Dark where it does not.
 *
 * The part that dresses the app and every picker ask with this one rule
 * (components/theme/AppThemeController.tsx, components/settings/
 * ReadingModePages.tsx, components/reader/ReadingModeChips.tsx), so the check
 * a picker draws stands on what the app is wearing. Build 93 note 3 was a
 * check on a look the app was not wearing.
 */
export function themeWorn(stored: ReadingTheme, allows: (theme: ReadingTheme) => boolean): ReadingTheme {
  return allows(stored) ? stored : "default";
}

const THEME_IDS = new Set<string>(READING_THEMES.map((t) => t.id));

/**
 * A palette the app once offered and no longer does, and what a device that
 * still stores it wears instead.
 *
 * Fire (the owner's word, 2026-11-10: "also I don't really like the fire
 * theme", then "remove fire") was one of the looks of 1.9 and came out before
 * they were released, so only a tester's device can hold it. It reads as
 * Candlelight, the nearest plain dark palette: black, warm, and Plus as Fire
 * was, so the same reader is entitled to it. Nothing made is deleted: what
 * Fire was is kept, out of the app's reach, in docs/1.9-build/kept/fire-look/.
 *
 * coerceReadingTheme applies this, so every reader of a stored palette gets
 * it (the controller, the reader's settings, the server's write, which then
 * refuses the old id as it refuses any unknown one), and the pre-paint script
 * says the same from its own literal (lib/reader/prepaint.ts).
 * lib/reader/__tests__/retiredThemes.test.ts holds all of it.
 */
export const RETIRED_THEMES: Readonly<Record<string, ReadingTheme>> = { fire: "candlelight" };

/** The palettes that belong to a study collection, by id. */
export const COLLECTION_THEME_IDS: ReadonlySet<string> = new Set(
  READING_THEMES.filter((t) => t.collection).map((t) => t.id),
);

export function isCollectionTheme(theme: string): boolean {
  return COLLECTION_THEME_IDS.has(theme);
}

/** Is this a look: a Plus theme of 1.9, worn over Dark or over Light? */
export function isLook(theme: string): boolean {
  return READING_THEMES.some((t) => t.id === theme && t.look !== undefined);
}

/**
 * What a palette puts on <html>. The palettes the app has always had are
 * their own `data-reading-mode` (Dark is its absence). A look is `data-look`
 * over Dark, or over Light with Light's own mode beside it, so the two
 * hundred rules written for Light answer every light look unchanged.
 * components/theme/AppThemeController.tsx writes these, and the pre-paint
 * script (lib/reader/prepaint.ts) the same from its own literal lists.
 */
export function themeAttributes(theme: ReadingTheme): { mode: string | null; look: string | null } {
  const entry = READING_THEMES.find((t) => t.id === theme);
  if (entry?.look) return { mode: entry.look === "light" ? "parchment" : null, look: theme };
  return { mode: theme === "default" ? null : theme, look: null };
}

/** The palettes of one family, in the order the picker shelves them: its looks, then a palette the app had before them. */
export function themesOfFamily(family: ThemeFamily): (typeof READING_THEMES)[number][] {
  const mine = READING_THEMES.filter((t) => t.family === family);
  return [...mine.filter((t) => t.look), ...mine.filter((t) => !t.look)];
}

/** The label a reader sees for a palette id, or the id when unknown. */
export function themeLabel(theme: string): string {
  return READING_THEMES.find((t) => t.id === theme)?.label ?? theme;
}

/** Coerce an untrusted raw value (localStorage, query, anything) to a
 * valid theme; a palette the app no longer offers reads as the one that
 * stands in for it (RETIRED_THEMES), and anything unknown falls back to the
 * default palette. */
export function coerceReadingTheme(
  raw: string | null | undefined,
): ReadingTheme {
  if (!raw) return "default";
  if (THEME_IDS.has(raw)) return raw as ReadingTheme;
  // An own key only: "constructor" is on every object, and is no palette.
  return Object.prototype.hasOwnProperty.call(RETIRED_THEMES, raw) ? RETIRED_THEMES[raw] : "default";
}
