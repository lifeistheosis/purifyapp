// The palette ids the pre-paint script in app/layout.tsx may apply before
// React runs.
//
// A hand-kept literal list on purpose, not a projection of READING_THEMES:
// the script is a string injected into <head>, it must not depend on the
// bundling order of anything else, and the list is what
// lib/reader/__tests__/prepaint.test.ts holds against READING_THEMES so a
// palette added to the registry cannot be forgotten here. "default" is not
// listed because it is the absence of the attribute.
//
// A look (1.9) is not in that list: it has two of its own below, by what it
// is worn over.
//
// Applying is optimistic. The script cannot consult entitlements (they are
// async and it runs before paint), so it applies whatever the device stored
// and components/theme/AppThemeController.tsx corrects it a frame later when
// the reader is not entitled. That was already true for Candlelight and
// Monastery; the collection palettes follow the same rule.

export const PREPAINT_THEME_IDS: readonly string[] = [
  "candlelight",
  "monastery",
  "parchment",
  "black",
  "councils",
  "cappadocian",
];

// The looks (1.9), by what each is worn over: `data-look` alone over Dark,
// and over Light with Light's own mode beside it (themeAttributes in
// lib/reader/readingModes.ts, which the test holds these two lists to).
export const PREPAINT_LOOKS_DARK: readonly string[] = ["nightsky", "dawn", "incense", "athos", "forest", "galilee", "mosaic", "damask"];
export const PREPAINT_LOOKS_LIGHT: readonly string[] = ["desert", "jordan", "patmos", "blush", "rose", "lavender", "olive", "stone", "linen"];

// A palette the app no longer offers, and what stands in for it, mirrored
// from RETIRED_THEMES in lib/reader/readingModes.ts as a literal: a device
// that still stores Fire opens in Candlelight from the first paint, not in
// Dark for a frame. Each stand-in is a palette of PREPAINT_THEME_IDS.
export const PREPAINT_RETIRED: Readonly<Record<string, string>> = { fire: "candlelight" };

/** The storage key, mirrored from lib/reader/readingModes.ts as a literal. */
const KEY = "purify.reader.theme";
/** Candlelight at Vespers (1.9), mirrored from lib/reader/vespers.ts: the switch, and the night's two moments. */
const VESPERS = "purify.reader.vespers";
const VESPERS_WINDOW = "purify.reader.vespers.window";

export const THEME_PREPAINT = [
  "(function(){try{",
  `var t=localStorage.getItem('${KEY}');`,
  // A palette the app no longer offers reads as its stand-in.
  `var r=${JSON.stringify(PREPAINT_RETIRED)};if(t&&Object.prototype.hasOwnProperty.call(r,t))t=r[t];`,
  // Through the night kept by AppThemeController, while the switch is on:
  // Candlelight, so the app opens after dark already in it.
  `if(localStorage.getItem('${VESPERS}')==='1'){`,
  `var w=(localStorage.getItem('${VESPERS_WINDOW}')||'').split(','),n=Date.now();`,
  "if(w.length===2&&n>=+w[0]&&n<+w[1])t='candlelight';}",
  "var d=document.documentElement;",
  `if(t&&${JSON.stringify(PREPAINT_THEME_IDS)}.indexOf(t)>-1){`,
  "d.setAttribute('data-reading-mode',t);}",
  // A look: itself over Dark, or over Light with Light's mode beside it.
  `else if(t&&${JSON.stringify(PREPAINT_LOOKS_DARK)}.indexOf(t)>-1){`,
  "d.setAttribute('data-look',t);}",
  `else if(t&&${JSON.stringify(PREPAINT_LOOKS_LIGHT)}.indexOf(t)>-1){`,
  "d.setAttribute('data-reading-mode','parchment');d.setAttribute('data-look',t);}",
  "}catch(e){}})();",
].join("");
