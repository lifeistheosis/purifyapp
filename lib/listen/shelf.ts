import { parseListenId, type ListenRef } from "./texts";

/**
 * A text's recordings kept on the phone (1.9), in the place a book's chapters
 * are kept (lib/readAloud/offline.ts): the saving, its waiting for Wi-Fi, its
 * resuming, Plus, the mark in the player and the row under Settings, Storage
 * are the Bible's own, unchanged. A document is a shelf of its own there, as
 * a book is, named so that no book of the Bible can be mistaken for it:
 *
 *   ~council~first-nicaea~the-twenty-canons   its sections, by number
 *   ~work~athanasius-the-great~life-of-antony its sections, by number
 *   ~theology~papacy                          its parts, by number
 *   ~life~anthony-the-great                   one recording, numbered 0
 *   ~history~pentecost                        one recording, numbered 0
 *
 * Pure: the names and nothing else.
 */

export const isTextShelf = (book: string): boolean => book.startsWith("~");

export function shelfOf(ref: ListenRef): { book: string; chapter: number } {
  if (ref.kind === "council" || ref.kind === "work") return { book: `~${ref.kind}~${ref.slug}~${ref.doc}`, chapter: ref.n };
  if (ref.kind === "theology") return { book: `~theology~${ref.slug}`, chapter: ref.n };
  return { book: `~${ref.kind}~${ref.slug}`, chapter: 0 };
}

/** The recording a shelf's chapter is, by its name, or null when the shelf is no text's. */
export function idOfShelf(book: string, chapter: number): string | null {
  if (!isTextShelf(book)) return null;
  const [kind, slug, doc] = book.slice(1).split("~");
  const id = kind === "council" || kind === "work" ? `${kind}/${slug}/${doc}/${chapter}` : kind === "theology" ? `theology/${slug}/${chapter}` : `${kind}/${slug}`;
  return parseListenId(id) ? id : null;
}

/** The recording a saved file's address is: .../audio/read/~council~first-nicaea~the-twenty-canons/7.mp3 */
export function idOfSavedSrc(src: string | null): string | null {
  const m = src ? /\/audio\/read\/(~[a-z0-9~-]+)\/(\d+)\.mp3(?:$|\?)/.exec(decodeURIComponent(src)) : null;
  return m ? idOfShelf(m[1], Number(m[2])) : null;
}

/** The recordings of the same shelf among those given: what "save this" saves. */
export function shelfChapters(ref: ListenRef, recorded: Iterable<string>): number[] {
  const { book } = shelfOf(ref);
  const out: number[] = [];
  for (const id of recorded) {
    const there = parseListenId(id);
    if (!there) continue;
    const s = shelfOf(there);
    if (s.book === book) out.push(s.chapter);
  }
  return out.sort((a, b) => a - b);
}

const SMALL = new Set(["the", "of", "and", "in", "on", "at", "to", "a"]);
const words = (slug: string) =>
  slug
    .split("-")
    .filter(Boolean)
    .map((w, i) => (i > 0 && SMALL.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");

/**
 * A shelf's name where no page is at hand to give it (Settings, Storage):
 * from its address, which is written from the name. "First Nicaea · The
 * Twenty Canons", "Athanasius the Great · Life of Antony", "Pentecost".
 */
export function shelfName(book: string): string {
  const [, slug, doc] = book.slice(1).split("~");
  return [slug, doc].filter(Boolean).map(words).join(" · ");
}
