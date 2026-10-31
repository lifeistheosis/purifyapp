// The verse a reader is at in the chapter on the screen (1.8, the owner's
// note 68 of 2026-10-31). One rule for the two things that say it: the place
// the Bible keeps (components/bible/ReadingProgressBar.tsx), which the tab
// opens on, and the running line over the chapter's pill, "v 14 of 36"
// (components/bible/ChapterVerseStatus.tsx). They read it two ways until
// 1.8, the topmost verse and the one with the most of itself near the top,
// and neither was the verse a link lands on: a return that landed on verse
// 16 was kept as 13 while the line said 14.
//
// The rule is lib/ui/readingPlace.ts's: the verse over the reading line, the
// middle of what can be seen between the bars, which every verse a link
// lands on covers (KEPT_AT). Measured from the page, so it is called from
// effects and handlers only, never while rendering.

import { KEPT_AT, blockAt, placeIn, visibleBand } from "@/lib/ui/readingPlace";

/** The verses of a chapter, as VerseRow draws them: `<div id="v{n}" data-verse>`. */
export const VERSE_ROWS = "[data-verse][id^='v']";

/** The verse over the reading line, or null when no chapter is on the page (the reader has left it). */
export function verseAtReadingPlace(): number | null {
  if (typeof document === "undefined") return null;
  const verses = document.querySelectorAll<HTMLElement>(VERSE_ROWS);
  if (verses.length === 0) return null;
  const line = placeIn(visibleBand(), KEPT_AT);
  const at = blockAt(verses.length, (i) => verses[i].getBoundingClientRect().top, line);
  const n = Number(verses[at].id.slice(1));
  return Number.isInteger(n) && n >= 1 ? n : null;
}
