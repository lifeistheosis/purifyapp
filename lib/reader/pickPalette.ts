// A tap on a palette, wherever palettes are picked: Settings' row, the
// Reading mode page, the reader's own settings.
//
// The owner's note 3 of build 93 (2026-11-11), on You, Reading mode: "So this
// screen actually doesn't do anything. When I click on the stuff, it doesn't
// change anything." The arbiter's bar from it: a tap must always visibly do
// something. A reader with Plus wears the look at once; a reader without it
// sees the house's Plus sheet; never a check with no change.
//
// Pure, so the rule is held without a phone
// (lib/reader/__tests__/pickPalette.test.ts).

import type { ReadingTheme } from "./readingModes";

export type PalettePick = {
  /** The palette the app is in now (components/theme/useWornPalette.ts, useThemeWorn). */
  worn: ReadingTheme;
  /** The app's one Plus answer for the palettes (components/reader/usePlusReadingModes.ts). */
  allows: (theme: ReadingTheme) => boolean;
  /** The gate has answered, and the answer is no. */
  locked: boolean;
  /** Wear it: the reader's palette is written and the whole app follows. */
  setTheme: (theme: ReadingTheme) => void;
  /** Open the Purify Plus sheet for the palettes: a sheet, not a navigation, so the reader keeps their place. */
  sell: () => void;
};

/**
 * What a tap on a palette does:
 *
 *  - the palette the app is already in: nothing to do, and its check says so.
 *    It is not written again: after sunset with Candlelight at Vespers on, a
 *    tap on the Candlelight the app is in would otherwise make Candlelight
 *    the reader's palette by day as well.
 *  - a palette this reader may wear: worn at once, the whole app with it;
 *  - a Purify Plus palette, for a reader the gate has said no to: the sheet.
 *
 * While the gate is still asking (neither yes nor no yet) a Plus palette
 * waits for the answer, which the page then draws: its lock, or nothing.
 *
 * @returns what was done, for the tests: "kept", "worn", "sold" or "waited"
 */
export function pickPalette(id: ReadingTheme, { worn, allows, locked, setTheme, sell }: PalettePick): "kept" | "worn" | "sold" | "waited" {
  if (id === worn) return "kept";
  if (allows(id)) {
    setTheme(id);
    return "worn";
  }
  if (locked) {
    sell();
    return "sold";
  }
  return "waited";
}
