import type { Cite } from "@/lib/citations/cite";

/**
 * The verse the front page holds on black (app/page.tsx), and where it
 * stands (1.8, the owner's "full transparency"): close to Nahum 1:7, not as
 * the app's Bible gives it. Brenton, the app's Old Testament, reads "The
 * Lord is good to them that wait on him in the day of affliction; and he
 * knows them that reverence him". The page says so under the verse, with
 * the verse to compare; which words stand there is the owner's call.
 * Held by lib/citations/__tests__/quotes.test.ts.
 */
export const FRONT_VERSE = {
  en: "The Lord is good to those who trust in him.",
  de: "Der Herr ist gut zu denen, die auf ihn vertrauen.",
} as const;

export const FRONT_VERSE_CITE: Cite = {
  kind: "inexact",
  of: { kind: "scripture", book: "nahum", chapter: 1, from: 7 },
  differs:
    "A modern wording, close to the New King James Version's \"The Lord is good ... And He knows those who trust in Him\"; Brenton reads \"The Lord is good to them that wait on him in the day of affliction; and he knows them that reverence him\". The German is a rendering of the English.",
};
