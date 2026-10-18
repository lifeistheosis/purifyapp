import type { Cite } from "@/lib/citations/cite";

/**
 * The verse the front page holds on black (app/page.tsx), and where it
 * stands (1.8). It is Nahum 1:7 as the app's own Old Testament gives it,
 * Brenton's Septuagint, word for word: the page held a modern wording
 * until the owner's word of 2026-10-18 to swap copyrighted wording for the
 * public-domain originals. Like every quotation of Scripture in the app, it
 * stays in its published English in every language. Held by
 * lib/citations/__tests__/quotes.test.ts.
 */
export const FRONT_VERSE = {
  en: "The Lord is good to them that wait on him in the day of affliction; and he knows them that reverence him.",
} as const;

export const FRONT_VERSE_CITE: Cite = { kind: "scripture", book: "nahum", chapter: 1, from: 7 };
