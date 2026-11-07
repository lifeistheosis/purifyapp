import "server-only";

import { BOOKS, getBook } from "./books";
import { loadChapter, loadCrossRefs } from "./load";
import { parseCrossRef, previewText, type CrossRefItem } from "./crossRefShape";

export type { CrossRefItem } from "./crossRefShape";

/**
 * Cross-references for one chapter, for the Plus reader (2026-09-30).
 *
 * The data is OpenBible.info's (CC BY, scripts/cr/cross_references.txt, built
 * into data/bible/cross-refs by scripts/ingest-cross-refs.mjs), ranked by
 * readers' votes. OpenBible numbers every book as the King James Version
 * does; the app's Old Testament is the Septuagint in Brenton's English,
 * numbered as the Septuagint is (the KJV's Jeremiah 31:31 is the app's
 * 38:31, its Psalm 23 the app's 22, Daniel 3 carries the Song of the Three).
 * From 1.9 (item 22 of docs/1.9-build/PLAN.md, the owner's pick "the Old
 * Testament in the Septuagint") the data is written in the app's numbering:
 * each Old Testament verse, the one a reference is on and the one it points
 * to, placed through the verse map (data/bible/kjv-to-lxx.json). A verse the
 * map cannot place surely is left out, so a reference never opens a
 * neighbour. Until 1.9 this was the New Testament to the New Testament only.
 *
 * At most SIX per verse, the most-voted first, each with the words of the
 * verse it points to so the reader can see the echo without leaving.
 */

const PER_VERSE = 6;

/** Book display name ("1 John", "Psalms") to slug. */
const SLUG_BY_NAME = new Map(BOOKS.map((b) => [b.name, b.slug]));

/** Any of the app's books: a book OpenBible has nothing on (the deuterocanon) simply has no file. */
export function isCrossRefBook(slug: string): boolean {
  return Boolean(getBook(slug));
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
