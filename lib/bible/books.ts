import booksJson from "@/data/bible/books.json";

export type Testament = "OT" | "NT";

export type BibleBook = {
  slug: string;
  name: string;
  testament: Testament;
  chapters: number;
  source: string;
};

export const BOOKS: BibleBook[] = booksJson as BibleBook[];

const BY_SLUG = new Map(BOOKS.map((b) => [b.slug, b]));
const ORDER = BOOKS.map((b) => b.slug);

export function getBook(slug: string): BibleBook | undefined {
  return BY_SLUG.get(slug);
}

export function getOldTestament(): BibleBook[] {
  return BOOKS.filter((b) => b.testament === "OT");
}

export function getNewTestament(): BibleBook[] {
  return BOOKS.filter((b) => b.testament === "NT");
}

export function nextChapter(slug: string, chapter: number): { slug: string; chapter: number } | null {
  const b = getBook(slug);
  if (!b) return null;
  if (chapter < b.chapters) return { slug, chapter: chapter + 1 };
  const idx = ORDER.indexOf(slug);
  const next = ORDER[idx + 1];
  return next ? { slug: next, chapter: 1 } : null;
}

export function prevChapter(slug: string, chapter: number): { slug: string; chapter: number } | null {
  const b = getBook(slug);
  if (!b) return null;
  if (chapter > 1) return { slug, chapter: chapter - 1 };
  const idx = ORDER.indexOf(slug);
  const prev = ORDER[idx - 1];
  const prevBook = prev ? getBook(prev) : undefined;
  return prevBook ? { slug: prev, chapter: prevBook.chapters } : null;
}

export function allChapterParams(): { book: string; chapter: string }[] {
  const out: { book: string; chapter: string }[] = [];
  for (const b of BOOKS) {
    for (let c = 1; c <= b.chapters; c++) {
      out.push({ book: b.slug, chapter: String(c) });
    }
  }
  return out;
}
