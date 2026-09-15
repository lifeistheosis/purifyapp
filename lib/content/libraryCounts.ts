import "server-only";

import { BOOKS } from "@/lib/bible/books";
import { loadChapter } from "@/lib/bible/load";
import type { LibraryCounts } from "@/lib/email/templates/contentBodies";
import { SAINTS } from "@/lib/saints/saints";

/**
 * How big the library is right now, for the monthly "what was added" note.
 *
 * There was no endpoint for this. Saints and books are the registries, chapters
 * are declared per book, and verses are counted by loading every chapter.
 *
 * THROUGH loadChapter, NOT fs. The Bible reader already reads data/bible
 * through lib/bible/load.ts, and the build traces that one file pattern (all
 * ~17,600 files) once. An fs.readFileSync over the same tree from here was a
 * second pattern, which the production build flagged as over-broad on the first
 * try, and 1.3 has already run Render's builder out of memory once. Reusing the
 * loader adds no new pattern.
 *
 * Read at most once an hour per server process, only when an admin opens or
 * sends the monthly note.
 */

let cached: { at: number; counts: LibraryCounts } | null = null;
const HOUR = 3_600_000;

export async function libraryCounts(): Promise<LibraryCounts> {
  if (cached && Date.now() - cached.at < HOUR) return cached.counts;

  let verses = 0;
  for (const book of BOOKS) {
    const total = Number.isFinite(book.chapters) ? book.chapters : 0;
    for (let n = 1; n <= total; n++) {
      const chapter = await loadChapter(book.slug, n);
      if (chapter && Array.isArray(chapter.verses)) verses += chapter.verses.length;
    }
  }

  const counts: LibraryCounts = {
    saints: SAINTS.length,
    books: BOOKS.length,
    chapters: BOOKS.reduce((sum, b) => sum + (Number.isFinite(b.chapters) ? b.chapters : 0), 0),
    verses,
  };
  cached = { at: Date.now(), counts };
  return counts;
}
