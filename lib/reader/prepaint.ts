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

/** The storage key, mirrored from lib/reader/readingModes.ts as a literal. */
const KEY = "purify.reader.theme";
/** Candlelight at Vespers (1.9), mirrored from lib/reader/vespers.ts: the switch, and the night's two moments. */
const VESPERS = "purify.reader.vespers";
const VESPERS_WINDOW = "purify.reader.vespers.window";

export const THEME_PREPAINT = [
  "(function(){try{",
  `var t=localStorage.getItem('${KEY}');`,
  // Through the night kept by AppThemeController, while the switch is on:
  // Candlelight, so the app opens after dark already in it.
  `if(localStorage.getItem('${VESPERS}')==='1'){`,
  `var w=(localStorage.getItem('${VESPERS_WINDOW}')||'').split(','),n=Date.now();`,
  "if(w.length===2&&n>=+w[0]&&n<+w[1])t='candlelight';}",
  `if(t&&${JSON.stringify(PREPAINT_THEME_IDS)}.indexOf(t)>-1){`,
  "document.documentElement.setAttribute('data-reading-mode',t);}",
  "}catch(e){}})();",
].join("");
