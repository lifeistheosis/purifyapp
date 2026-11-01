// The paragraph a reader is at in the work on the screen (1.8, round 6, the
// owner's note 79): the place a Father's work keeps (lib/reader/position.ts),
// read the way the Bible reads its verse since note 68 (lib/bible/
// verseInView.ts): the block over the reading line, the middle of what can be
// seen between the bars, which every block a link or a return lands on
// covers (lib/ui/readingPlace.ts, KEPT_AT), so a place left here and come back
// to is read here again as the same paragraph.
//
// Measured from the page, so it is called from effects and handlers only,
// never while rendering.

import { KEPT_AT, blockAt, placeIn, visibleBand } from "@/lib/ui/readingPlace";

/**
 * What the reader draws as a place, in the page's order, each carrying
 * `data-place="<section>:<paragraph>"`: every paragraph (components/saints/
 * ParagraphRow.tsx) and every edition's heading, and a section that stands
 * closed, as its top. The work's last paragraph also carries `data-work-end`.
 */
export const PLACE_ROWS = "[data-place]";

/** "12:3" as a place; null for anything else. */
export function parsePlace(value: string | null | undefined): { sectionN: number; paragraph: number } | null {
  const m = /^(\d+):(\d+)$/.exec(value ?? "");
  if (!m) return null;
  const sectionN = Number(m[1]);
  const paragraph = Number(m[2]);
  return sectionN >= 1 ? { sectionN, paragraph } : null;
}

/**
 * The place over the reading line, and whether the reader has read past the
 * end of the work (its last paragraph's foot above the line). Null when no
 * work is on the page (the reader has left it).
 */
export function paragraphAtReadingPlace(): { sectionN: number; paragraph: number; past: boolean } | null {
  if (typeof document === "undefined") return null;
  const rows = document.querySelectorAll<HTMLElement>(PLACE_ROWS);
  if (rows.length === 0) return null;
  const line = placeIn(visibleBand(), KEPT_AT);
  const at = blockAt(rows.length, (i) => rows[i].getBoundingClientRect().top, line);
  const place = parsePlace(rows[at].getAttribute("data-place"));
  if (!place) return null;
  const last = rows[rows.length - 1];
  const past = at === rows.length - 1 && last.hasAttribute("data-work-end") && last.getBoundingClientRect().bottom < line;
  return { ...place, past };
}

/** The element a place lands on: the paragraph, else its section's top. */
export function elementOfPlace(p: { sectionN: number; paragraph: number }): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return (
    (p.paragraph > 0 ? document.getElementById(`p-${p.sectionN}-${p.paragraph}`) : null) ??
    document.querySelector<HTMLElement>(`[data-place="${p.sectionN}:${p.paragraph}"]`) ??
    document.getElementById(`s${p.sectionN}`)
  );
}
