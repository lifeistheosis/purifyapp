/**
 * The shape of a cross-reference as the reader shows it, and the two pure
 * steps that make one (lib/bible/crossRefs.ts does the reading). Import-free
 * so the client sheet and the tests can have it.
 */

export type CrossRefItem = {
  /** Book slug, e.g. "1-john". */
  book: string;
  chapter: number;
  verse: number;
  /** Last verse of a range, in the last chapter of the range. */
  endVerse?: number;
  /** Set only when the range runs into another chapter. */
  endChapter?: number;
  /** The words of the first verse, trimmed for a preview. */
  text: string;
};

/**
 * "1 John 1:1-2", "Genesis 4:25–5:32", "John 17:5" into a place. Null when the
 * book is not one we can place (`slugByName` holds only those) or the shape is
 * not a single reference.
 */
export function parseCrossRef(
  display: string,
  slugByName: ReadonlyMap<string, string>,
): Omit<CrossRefItem, "text"> | null {
  const m = /^(.+?) (\d+):(\d+)(?:[-–](?:(\d+):)?(\d+))?$/.exec(display.trim());
  if (!m) return null;
  const book = slugByName.get(m[1]);
  if (!book) return null;
  const chapter = Number(m[2]);
  const verse = Number(m[3]);
  const endChapter = m[4] ? Number(m[4]) : undefined;
  const endVerse = m[5] ? Number(m[5]) : undefined;
  return {
    book,
    chapter,
    verse,
    ...(endVerse !== undefined ? { endVerse } : {}),
    ...(endChapter !== undefined && endChapter !== chapter ? { endChapter } : {}),
  };
}

/** A verse cut to about a line and a half, on a word, never mid-word. */
export function previewText(text: string, max = 170): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const at = cut.lastIndexOf(" ");
  return `${(at > 60 ? cut.slice(0, at) : cut).replace(/[,;:.]$/, "")}…`;
}

/** "5:1-2", "4:25-5:32", "17:5": the numbers after the book's name. */
export function crossRefNumbers(ref: Pick<CrossRefItem, "chapter" | "verse" | "endVerse" | "endChapter">): string {
  const start = `${ref.chapter}:${ref.verse}`;
  if (ref.endChapter !== undefined && ref.endVerse !== undefined) return `${start}-${ref.endChapter}:${ref.endVerse}`;
  if (ref.endVerse !== undefined) return `${start}-${ref.endVerse}`;
  return start;
}

/** Where a reference opens: the chapter, at the verse. */
export function crossRefHref(ref: Pick<CrossRefItem, "book" | "chapter" | "verse">): string {
  return `/bible/${ref.book}/${ref.chapter}#v${ref.verse}`;
}
