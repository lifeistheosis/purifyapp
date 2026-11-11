"use client";

// A tap on a palette, wired once for every place palettes are picked:
// Settings' row, the Reading mode page and the reader's own settings.
//
// The rule is lib/reader/pickPalette.ts (worn at once, or the Purify Plus
// sheet). This adds the one thing a rule cannot do by itself: a tap made
// while the Plus gate is still asking is not lost. It waits for the answer
// and is carried out the moment it comes, so on a slow signal a tap still
// ends in something a reader can see (build 93 note 3: "When I click on the
// stuff, it doesn't change anything").

import { useCallback, useEffect, useRef } from "react";

import { useUpgradeModal } from "@/components/billing/UpgradeModal";
import { useReaderPrefs } from "@/components/reader/ReaderPrefs";
import { usePlusReadingModes } from "@/components/reader/usePlusReadingModes";
import { useThemeWorn } from "@/components/theme/useWornPalette";
import { pickPalette } from "@/lib/reader/pickPalette";
import type { ReadingTheme } from "@/lib/reader/readingModes";

export type PalettePicker = {
  /** What a tap on a palette does. */
  pick: (id: ReadingTheme) => void;
  /** The palette the app is in, read off the page: a picker draws its check there. */
  worn: ReadingTheme;
  /** The app's one Plus answer for the palettes. */
  allows: (theme: ReadingTheme) => boolean;
  /** The gate has answered, and the answer is no. */
  locked: boolean;
};

export function usePalettePick(): PalettePicker {
  const upgrade = useUpgradeModal();
  const { setTheme } = useReaderPrefs();
  const { allows, allowed, locked } = usePlusReadingModes();
  const worn = useThemeWorn();
  // The palette tapped while the gate was asking, until its answer comes.
  const waiting = useRef<ReadingTheme | null>(null);

  const pick = useCallback(
    (id: ReadingTheme) => {
      const did = pickPalette(id, { worn, allows, locked, setTheme, sell: () => upgrade.open("palettes") });
      waiting.current = did === "waited" ? id : null;
    },
    [worn, allows, locked, setTheme, upgrade],
  );

  // The gate has answered: the tap that waited is carried out now.
  useEffect(() => {
    const id = waiting.current;
    if (id && (allowed || locked)) pick(id);
  }, [allowed, locked, pick]);

  return { pick, worn, allows, locked };
}
