import file from "@/data/today/saint-words.json";

import type { ShownCite } from "@/lib/citations/cite";

/**
 * Today's saint in their own words (1.8, the owner's word of 2026-10-24): on
 * a day whose saint has a page, a line of theirs under the day's list, with
 * the source line every quotation wears. Only words traced to where they
 * stand: the saint's traced quotation, or a sentence picked by hand from a
 * work of theirs the reading room checked word for word
 * (data/today/saint-words.json; its test holds each to its paragraph). A
 * saint with none shows nothing new.
 */
export type SaintWords = { text: string; shown: ShownCite };

const WORDS = (file as unknown as { words: Record<string, SaintWords> }).words;

export function saintWordsFor(slug: string | null | undefined): SaintWords | null {
  return slug ? (WORDS[slug] ?? null) : null;
}

export const SAINT_WORDS_SLUGS: readonly string[] = Object.keys(WORDS);
