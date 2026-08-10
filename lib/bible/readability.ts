// How much of a patristic note to show, and how long it takes to read.
//
// Pure so it is testable without a browser, the same reason lib/gifts/grant.ts
// exists for the money math. The commentary rail is server-rendered inside a
// larger tree and cannot be driven reliably from a test browser, so the logic
// is proved here instead of by clicking.
//
// The numbers are measured from data/bible/commentary, not chosen:
//
//   4,479 notes | median 294 words | 75th 664 | 90th 2,059 | longest 90,758
//   56% of notes exceed 250 words
//
// A reader reported the commentary as too long. Opening a card used to hand
// over the whole note, so on the worst one that was 90,758 words of 19th
// century English arriving at once.

/**
 * Reading speed for this corpus. Deliberately below the 240 wpm usually quoted
 * for modern prose: these are Victorian translations of the Fathers, read
 * slowly and often re-read.
 */
export const WORDS_PER_MINUTE = 180;

/**
 * The preview budget. Sized so a median note (294 words) arrives essentially
 * whole and only the long tail is held back, because interrupting a short note
 * would be an insult to a reader who could have finished it.
 */
export const PREVIEW_WORDS = 220;

export function wordCount(text: string): number {
  const t = text.trim();
  return t === "" ? 0 : t.split(/\s+/).length;
}

/** Whole minutes, never zero, so a short note reads "1 min" rather than "0 min". */
export function readingMinutes(text: string): number {
  return Math.max(1, Math.round(wordCount(text) / WORDS_PER_MINUTE));
}

export function paragraphsOf(text: string): string[] {
  return text.split(/\n\n+/);
}

/**
 * Keep whole paragraphs until the budget is spent.
 *
 * Never cuts mid-sentence. A Father stopped mid-clause reads as a defect
 * rather than as an invitation, and the first paragraph is always kept whole
 * however long it runs, so the preview is never empty.
 */
export function previewParagraphs(paragraphs: string[]): {
  shown: string[];
  hidden: number;
} {
  let used = 0;
  const shown: string[] = [];
  for (const para of paragraphs) {
    shown.push(para);
    used += wordCount(para);
    if (used >= PREVIEW_WORDS) break;
  }
  return { shown, hidden: paragraphs.length - shown.length };
}
