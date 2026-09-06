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
  "councils",
  "cappadocian",
];

/** The storage key, mirrored from lib/reader/readingModes.ts as a literal. */
const KEY = "purify.reader.theme";

export const THEME_PREPAINT = [
  "(function(){try{",
  `var t=localStorage.getItem('${KEY}');`,
  `if(t&&${JSON.stringify(PREPAINT_THEME_IDS)}.indexOf(t)>-1){`,
  "document.documentElement.setAttribute('data-reading-mode',t);}",
  "}catch(e){}})();",
].join("");
