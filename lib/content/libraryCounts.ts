import "server-only";

import fs from "node:fs";
import path from "node:path";

import { BOOKS } from "@/lib/bible/books";
import type { LibraryCounts } from "@/lib/email/templates/contentBodies";
import { SAINTS } from "@/lib/saints/saints";

/**
 * How big the library is right now, for the monthly "what was added" note.
 *
 * There was no endpoint for this. Saints and books are the registries; chapters
 * are declared per book; verses are counted by reading every chapter file under
 * data/bible, the same tree /api/admin/content-health walks at runtime from
 * process.cwd(). Roughly twelve hundred small files, read at most once an hour
 * per server process, only when an admin opens or sends the monthly note.
 */

let cached: { at: number; counts: LibraryCounts } | null = null;
const HOUR = 3_600_000;

export function libraryCounts(root: string = process.cwd()): LibraryCounts {
  if (cached && Date.now() - cached.at < HOUR) return cached.counts;

  let verses = 0;
  const bibleRoot = path.join(root, "data", "bible");
  for (const book of BOOKS) {
    let files: string[];
    try {
      files = fs.readdirSync(path.join(bibleRoot, book.slug)).filter((f) => f.endsWith(".json"));
    } catch {
      continue;
    }
    for (const file of files) {
      try {
        const chapter = JSON.parse(fs.readFileSync(path.join(bibleRoot, book.slug, file), "utf8")) as {
          verses?: unknown[];
        };
        if (Array.isArray(chapter.verses)) verses += chapter.verses.length;
      } catch {
        // One unreadable chapter must not zero the month's count.
      }
    }
  }

  const counts: LibraryCounts = {
    saints: SAINTS.length,
    books: BOOKS.length,
    chapters: BOOKS.reduce((n, b) => n + (Number.isFinite(b.chapters) ? b.chapters : 0), 0),
    verses,
  };
  cached = { at: Date.now(), counts };
  return counts;
}
