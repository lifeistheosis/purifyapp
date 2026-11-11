// The reader's place kept through a change of translation (1.9, build 93
// note 20; the owner: "changing the bibles translation or the version of the
// Bible should be as easy as switching your chapter"; the arbiter's bar: "the
// switch keeps the reader's place (the same chapter and verse)"). The verse
// over the reading line is read as another translation is chosen
// (lib/bible/verseInView.ts), and once the chapter stands in the new one,
// that verse is set back at the reading place (lib/ui/readingPlace.ts), so the
// reader goes on from the verse they were at and the page never jumps to its
// top. Held for the page it was read on, and given back once.
//
// Measured from the page, so it is called from handlers and effects only.

import { verseAtReadingPlace } from "@/lib/bible/verseInView";
import { shiftToReadingPlace, visibleBand } from "@/lib/ui/readingPlace";

let held: { path: string; verse: number } | null = null;

/** Reads the verse over the reading line, to keep it through the switch about to happen. */
export function holdPlace(path: string, verse: number | null = verseAtReadingPlace()): void {
  held = verse ? { path, verse } : null;
}

/** The verse held for this page, given once; null when none was held, or for another page. */
export function takeHeldPlace(path: string): number | null {
  const h = held;
  held = null;
  return h && h.path === path ? h.verse : null;
}

/** The verse set back at the reading place; false while the chapter has no such verse on the page. */
export function landVerse(verse: number): boolean {
  if (typeof document === "undefined") return false;
  const row = document.getElementById(`v${verse}`);
  if (!row) return false;
  const r = row.getBoundingClientRect();
  const shift = shiftToReadingPlace(visibleBand(), { top: r.top, bottom: r.bottom });
  if (Math.abs(shift) >= 1) window.scrollBy({ top: shift, behavior: "instant" });
  return true;
}
