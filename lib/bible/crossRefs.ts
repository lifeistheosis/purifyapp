import "server-only";

import { BOOKS, getBook } from "./books";
import { loadChapter, loadCrossRefs } from "./load";
import { parseCrossRef, previewText, type CrossRefItem } from "./crossRefShape";

export type { CrossRefItem } from "./crossRefShape";

/**
 * Cross-references for one chapter, for the Plus reader (2026-09-30).
 *
 * The data is OpenBible.info's (CC BY, scripts/cr/cross_references.txt, built
 * into data/bible/cross-refs), ranked by readers' votes. It is numbered as
 * the King James Version is. Purify's New Testament is the King James text
 * and numbered the same, so a reference in it lands on the right verse.
 * Purify's Old Testament is the Septuagint in Brenton's English, numbered as
 * the Septuagint is: the KJV's Jeremiah 31:31 is Purify's Jeremiah 38:31, the
 * commandments run in another order in Exodus 20, Daniel 3 carries the Song
 * of the Three. A KJV-numbered reference into it would open the wrong verse,
 * so until a numbering map exists this is the New Testament to the New
 * Testament only, and a reference that cannot be placed exactly is left out.
 *
 * At most SIX per verse, the most-voted first, each with the words of the
 * verse it points to so the reader can see the echo without leaving.
 */

const PER_VERSE = 6;

const NT = new Set(BOOKS.filter((b) => b.testament === "NT").map((b) => b.slug));

/** Book display name ("1 John") to slug, for the New Testament. */
const SLUG_BY_NAME = new Map(BOOKS.filter((b) => NT.has(b.slug)).map((b) => [b.name, b.slug]));

export function isCrossRefBook(slug: string): boolean {
  return NT.has(slug);
}

export async function chapterCrossRefs(
  book: string,
  chapter: number,
): Promise<Record<number, CrossRefItem[]>> {
  if (!isCrossRefBook(book)) return {};
  const raw = await loadCrossRefs(book, chapter);
  const chapters = new Map<string, Awaited<ReturnType<typeof loadChapter>>>();
  const textOf = async (slug: string, ch: number, verse: number): Promise<string | null> => {
    const key = `${slug}:${ch}`;
    if (!chapters.has(key)) chapters.set(key, await loadChapter(slug, ch));
    const found = chapters.get(key)?.verses.find((v) => v.n === verse);
    return found ? found.text : null;
  };

  const out: Record<number, CrossRefItem[]> = {};
  for (const [verseKey, refs] of Object.entries(raw)) {
    const items: CrossRefItem[] = [];
    for (const ref of refs) {
      if (items.length >= PER_VERSE) break;
      const parsed = parseCrossRef(ref.display, SLUG_BY_NAME);
      if (!parsed) continue;
      const target = getBook(parsed.book);
      if (!target || parsed.chapter > target.chapters) continue;
      const text = await textOf(parsed.book, parsed.chapter, parsed.verse);
      if (!text) continue;
      items.push({ ...parsed, text: previewText(text) });
    }
    if (items.length > 0) out[Number(verseKey)] = items;
  }
  return out;
}
