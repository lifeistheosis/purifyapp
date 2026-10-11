import { describe, expect, it } from "vitest";

import el from "@/lib/i18n/messages/el.json";
import en from "@/lib/i18n/messages/en.json";
import fil from "@/lib/i18n/messages/fil.json";
import ro from "@/lib/i18n/messages/ro.json";
import { BOOKS, localBookNames, searchBible } from "@/lib/bible/books";
import { parseReferences, parseReferencesVerbose } from "@/lib/bible/parseReferences";

/**
 * A book is found by its name in the reader's own language.
 *
 * Until 1.6 a reference could only be typed in English: "John 3:16" opened
 * and "Ioan 3:16" found nothing, in an app that names the book "Ioan" on
 * every screen a Romanian reader sees. These run against the real catalogs
 * of the three languages 1.6 is built around.
 */

const catalog = (messages: Record<string, string>) => (key: string) => messages[key] ?? key;
const GREEK = localBookNames(catalog(el as Record<string, string>));
const ROMANIAN = localBookNames(catalog(ro as Record<string, string>));
const FILIPINO = localBookNames(catalog(fil as Record<string, string>));
const ENGLISH = localBookNames(catalog(en as Record<string, string>));

const first = (query: string, books: Readonly<Record<string, string>>) => {
  const hit = searchBible(query, 8, {}, books)[0];
  if (!hit) return null;
  if (hit.kind === "verse") return `${hit.book.slug} ${hit.chapter}:${hit.verse}`;
  if (hit.kind === "range") return `${hit.book.slug} ${hit.chapter}:${hit.verseFrom}-${hit.verseTo}`;
  if (hit.kind === "chapter") return `${hit.book.slug} ${hit.chapter}`;
  return hit.book.slug;
};
const all = (query: string, books: Readonly<Record<string, string>>) =>
  searchBible(query, 8, {}, books).map((h) => h.book.slug);

describe("the books' names in a language", () => {
  it("gives every book the catalog names, by slug", () => {
    expect(Object.keys(ENGLISH)).toHaveLength(BOOKS.length);
    expect(GREEK.john).toBe("Κατά Ιωάννην");
    expect(ROMANIAN.john).toBe("Ioan");
    expect(FILIPINO.john).toBe("Juan");
  });

  it("leaves out a book the catalog has no line for", () => {
    const names = localBookNames((key) => (key === "bible.books.john" ? "Ioan" : key));
    expect(names).toEqual({ john: "Ioan" });
  });

  it("is worked out once for a language", () => {
    const t = catalog(ro as Record<string, string>);
    expect(localBookNames(t)).toBe(localBookNames(t));
  });
});

describe("a reference typed the way the reader's own Bible prints it", () => {
  it("Greek, with its accents or without", () => {
    expect(first("Ιωάννην 3:16", GREEK)).toBe("john 3:16");
    expect(first("ιωαννην 3:16", GREEK)).toBe("john 3:16");
    expect(first("Ψαλμοί 50", GREEK)).toBe("psalms 50");
    expect(first("Γένεσις 1:1-5", GREEK)).toBe("genesis 1:1-5");
  });

  it("Romanian and Filipino", () => {
    expect(first("Ioan 3:16", ROMANIAN)).toBe("john 3:16");
    expect(first("Facerea 1:1", ROMANIAN)).toBe("genesis 1:1");
    expect(first("Psalmii 50", ROMANIAN)).toBe("psalms 50");
    expect(first("Juan 3:16", FILIPINO)).toBe("john 3:16");
    expect(first("Mga Salmo 23", FILIPINO)).toBe("psalms 23");
  });

  it("by the start of the name, as the English is", () => {
    expect(first("Ιωαν 3", GREEK)).toBe("john 3");
    expect(first("Corint 13", ROMANIAN)).toBe("1-corinthians 13");
    expect(all("Corint 13", ROMANIAN)).toEqual(["1-corinthians", "2-corinthians"]);
  });

  it("reads the book's number off the book, whatever the language writes it as", () => {
    // The Greek catalog writes First Corinthians with a letter, not a digit.
    expect(GREEK["1-corinthians"]).toBe("Α΄ Προς Κορινθίους");
    expect(all("1 Κορινθίους 13", GREEK)).toEqual(["1-corinthians"]);
    expect(all("2 Κορινθίους 13", GREEK)).toEqual(["2-corinthians"]);
    expect(first("1 Corinteni 13:4-8", ROMANIAN)).toBe("1-corinthians 13:4-8");
    expect(first("1 Juan 4:8", FILIPINO)).toBe("1-john 4:8");
  });

  it("keeps the English names and short forms working in every language", () => {
    for (const books of [GREEK, ROMANIAN, FILIPINO]) {
      expect(first("John 3:16", books)).toBe("john 3:16");
      expect(first("ps 23", books)).toBe("psalms 23");
      expect(first("1 cor 13", books)).toBe("1-corinthians 13");
    }
  });

  it("changes nothing for a reader in English", () => {
    for (const query of ["john 3:16", "ps 23", "1 cor 13:4-8", "the 2", "gen 1:1", "jo 3", "wisdom 3", "xyz 4", "john"]) {
      expect(all(query, ENGLISH), query).toEqual(searchBible(query, 8).map((h) => h.book.slug));
    }
  });

  it("does not take one letter, or a word that names no book, for a book", () => {
    expect(all("Ι 3", GREEK)).toEqual([]);
    expect(all("Liturghie 3", ROMANIAN)).toEqual([]);
    // Until 1.6 a name in letters that are not Latin matched all 78 books,
    // with or without the reader's names handed over.
    expect(all("Иоанн 3", {})).toEqual([]);
    expect(all("κάτι 4", GREEK)).toEqual([]);
  });
});

describe("several references at once, in the reader's language", () => {
  it("each part is read as one would be", () => {
    const refs = parseReferences("Ioan 3:16, Psalmii 23; 1 Corinteni 13", ROMANIAN);
    expect(refs.map((r) => `${r.book.slug} ${r.chapter}`)).toEqual(["john 3", "psalms 23", "1-corinthians 13"]);
  });

  it("the stacked page says which part it could not read, as before", () => {
    const parts = parseReferencesVerbose("Ιωάννην 3:16, κάτι 4", GREEK);
    expect(parts.map((p) => [p.raw, p.hit?.book.slug ?? null])).toEqual([
      ["Ιωάννην 3:16", "john"],
      ["κάτι 4", null],
    ]);
  });

  it("reads English names with no local names handed over, as it always did", () => {
    expect(parseReferences("John 3:16, Ps 23").map((r) => r.book.slug)).toEqual(["john", "psalms"]);
    expect(parseReferences("Ioan 3:16, Psalmii 23")).toEqual([]);
  });
});
