/** Twenty sections or more read as a list of chapters, as before 1.8. */
export const CHAPTERS_FROM_SECTIONS = 20;

/** About 40,000 words, counted in characters (a word runs to about six). */
export const CHAPTERS_FROM_CHARS = 240_000;

/**
 * Whether a work reads as a list of its chapters, each drawn only when it is
 * opened (WritingReader's accordion), or straight through. A work drawn
 * straight through mounts every paragraph and its annotations at once.
 *
 * Twenty sections or more, as before; and from 1.8 a long work in a few big
 * sections too. The owner's screenshot of 2026-10-26 ("super laggy") was the
 * Confessions: thirteen books, 111,772 words drawn at once, 11,000 elements
 * in a page 450,000 px tall, every change to the page restyling all of it.
 * A work in one section gains nothing from the list, so it stays as it is.
 */
export function readsAsChapters(sections: readonly { paragraphs: readonly string[] }[]): boolean {
  if (sections.length >= CHAPTERS_FROM_SECTIONS) return true;
  if (sections.length < 2) return false;
  let chars = 0;
  for (const s of sections) for (const p of s.paragraphs) chars += p.length;
  return chars >= CHAPTERS_FROM_CHARS;
}
