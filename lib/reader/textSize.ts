/**
 * The reader's text size, as stored, and the size a reader who has never
 * chosen one starts at (1.8). Pure, so lib/reader/__tests__/textSize.test.ts
 * holds the rule; components/reader/ReaderPrefs.tsx keeps the choice on the
 * device and every reader reads it from there.
 */

/** The four sizes, smallest first (components/reader/ReaderPrefs.tsx, SIZE_CLASSES). */
export const TEXT_SIZES = ["sm", "md", "lg", "xl"] as const;
export type TextSize = (typeof TEXT_SIZES)[number];

/** What the store answers for a reader who has never chosen: Medium, as it always has. */
export const STORE_DEFAULT_SIZE: TextSize = "md";

/**
 * The size the Bible reads at for a reader who has never chosen one: Large,
 * 19px on a phone, as the owner's pick of the page draws its words (round 2
 * B, Homebase/boards/purify-master/variants/02-bible), with his "add
 * everything we left out" of 2026-10-28. A reader who chose a size keeps it,
 * wherever they chose it. Only the Bible starts here: the prayers and the
 * Fathers' works read the same choice and start where they always did, so a
 * phone reads 19px in the Bible and in the prayers alike until the reader
 * chooses (the prayers' own scale is a step larger, PrayerStep LINE_SIZE).
 */
export const BIBLE_START_SIZE: TextSize = "lg";

/** The stored size, if it is one, and whether the reader ever chose it. */
export function storedSize(raw: string | null): { size: TextSize; chosen: boolean } {
  return raw && (TEXT_SIZES as readonly string[]).includes(raw)
    ? { size: raw as TextSize, chosen: true }
    : { size: STORE_DEFAULT_SIZE, chosen: false };
}

/** The size a reader sees: theirs once they chose one, else the start the reader asks with, else the store's. */
export function sizeShown(prefs: { size: TextSize; sizeChosen: boolean }, start?: TextSize): TextSize {
  return prefs.sizeChosen || !start ? prefs.size : start;
}
