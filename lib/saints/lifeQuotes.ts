import type { Cite } from "@/lib/citations/cite";

/**
 * The quotations inside a saint's life as it is written (1.8, the owner's
 * "whatever quote ... you can easily see where it comes from"): each one's
 * words as the life gives them, and where they stand. The page numbers each
 * where it stands and lists it under the life (components/saints/
 * LifeSection.tsx). A life in another language has its own words, and its
 * marks show only where these words are found. Held by
 * lib/citations/__tests__/quotes.test.ts.
 *
 * A name's meaning in quotation marks ("who is like God?", "Khoni") is a
 * gloss, not a quotation, and carries none.
 */
export const LIFE_QUOTES: Readonly<Record<string, readonly { words: string; cite: Cite }[]>> = {
  "archangel-michael": [
    // Brenton's Daniel, the app's own (the life gave the King James words until 2026-10-18).
    { words: "that stands over the children of thy people", cite: { kind: "scripture", book: "daniel", chapter: 12, from: 1 } },
    { words: "the Lord rebuke thee", cite: { kind: "scripture", book: "jude", chapter: 1, from: 9 } },
  ],
  "alexander-of-alexandria": [
    // Arius's words, as St Athanasius records them.
    { words: "there was when He was not", cite: { kind: "work", saint: "athanasius-the-great", work: "four-discourses-against-the-arians", section: 1, paragraph: 43 } },
  ],
  "cyril-of-jerusalem": [
    {
      words: "the right reverend and most religious Cyril is bishop, who was some time ago canonically ordained by the bishops of the province, and has in several places fought a good fight against the Arians.",
      cite: { kind: "council", council: "first-constantinople", document: "the-synodical-letter", section: 6 },
    },
  ],
};

/**
 * Quotations a life gave with no public-domain text behind them, taken out
 * of its words (told in our own voice instead, without quotation marks) on
 * the owner's word of 2026-10-18, and kept here with where we looked so they
 * can come back once sourced. Never shown.
 */
export const HIDDEN_LIFE_QUOTES: Readonly<Record<string, readonly { words: string; cite: Cite }[]>> = {
  "moses-the-ethiopian": [
    {
      words: "My own sins run out behind me, and I do not see them, and I have come today to judge the sins of another.",
      cite: {
        kind: "untraced",
        searched: "The saying of the basket of sand (Sayings of the Desert Fathers, Moses 2) is not in any public-domain text the app carries: no Apophthegmata is in the library, and Budge's Paradise of the Fathers, the public-domain English, is not in the app.",
      },
    },
  ],
};
