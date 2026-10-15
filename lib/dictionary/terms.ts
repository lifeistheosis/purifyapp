import data from "@/data/dictionary/terms.json";

/**
 * The Orthodox dictionary (1.7): the words a reader meets in church and in
 * Purify, each said plainly in a sentence or two, with a link or three to
 * where the app says more.
 *
 * The owner said yes to it on 2026-10-15 ("sure a orthodox dictionary").
 * The definitions are our own words of accepted Eastern Orthodox teaching
 * and usage, not quotations, and no Father is quoted in them. They were
 * drafted for his read and his priest's before 1.7 ships
 * (docs/editorial-standards.md: drafted doctrinal framing is read before it
 * ships). English only for now; other languages show the English with the
 * app's not-yet-translated note.
 */
export type DictionaryGroup = "faith" | "worship" | "prayer-life" | "church" | "year";

export type DictionaryLink = { href: string; label: string };

export type DictionaryTerm = {
  id: string;
  term: string;
  greek?: string;
  also?: string[];
  group: DictionaryGroup;
  definition: string;
  see?: DictionaryLink[];
};

export const DICTIONARY: readonly DictionaryTerm[] = (data as { terms: DictionaryTerm[] }).terms;

/** Letters and accents folded away, so "theosis" finds "Theósis". */
export function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

/**
 * The terms a reader's words find: by the term, its other names or its
 * Greek first, then by its definition. Empty words find everything.
 */
export function termsMatching(query: string, terms: readonly DictionaryTerm[] = DICTIONARY): DictionaryTerm[] {
  const q = fold(query);
  if (!q) return [...terms];
  const named = terms.filter((t) => [t.term, t.greek ?? "", ...(t.also ?? [])].some((n) => fold(n).includes(q)));
  const told = terms.filter((t) => !named.includes(t) && fold(t.definition).includes(q));
  return [...named, ...told];
}

/** The first letter a term is listed under. */
export function letterOf(term: string): string {
  return fold(term).charAt(0).toUpperCase();
}
