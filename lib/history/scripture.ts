import { searchBible } from "@/lib/bible/books";
import { referenceHref } from "@/lib/bible/parseReferences";

/**
 * Where an event's Scripture reference opens in the app's Bible (1.7): "Acts
 * 2:1-41" opens Acts 2 with the verses lit, by the parser the Bible's own
 * search uses. A reference the parser cannot place exactly (a span across
 * chapters, "Acts 13:1-28:31") is null and stays plain words: a link must
 * land where it says.
 */
export function scriptureHref(ref: string): string | null {
  const hit = searchBible(ref, 1)[0];
  if (!hit || hit.kind === "book") return null;
  if ("passage" in hit && hit.passage) return null;
  // The book the parser found must be the one the reference names.
  const named = ref.trim().toLowerCase().replace(/\s+/g, " ");
  const book = hit.book.name.toLowerCase();
  if (!named.startsWith(book) || /\d+:\d+\s*[-–]\s*\d+:\d+/.test(named)) return null;
  return referenceHref(hit);
}
