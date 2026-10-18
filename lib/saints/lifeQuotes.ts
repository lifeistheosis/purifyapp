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
    {
      words: "the great prince which standeth for the children of thy people",
      cite: {
        kind: "inexact",
        of: { kind: "scripture", book: "daniel", chapter: 12, from: 1 },
        differs: "The King James wording of Daniel 12:1. Brenton, the app's Old Testament, reads \"Michael the great prince shall stand up, that stands over the children of thy people\".",
      },
    },
    { words: "the Lord rebuke thee", cite: { kind: "scripture", book: "jude", chapter: 1, from: 9 } },
  ],
  "alexander-of-alexandria": [
    // Arius's words, as St Athanasius records them.
    { words: "there was when He was not", cite: { kind: "work", saint: "athanasius-the-great", work: "four-discourses-against-the-arians", section: 1, paragraph: 43 } },
  ],
  "cyril-of-jerusalem": [
    {
      words: "the right reverend and most religious Cyril, who was some time ago canonically ordained by the bishops of the province, and has in several places fought a good fight against the Arians.",
      cite: {
        kind: "inexact",
        of: { kind: "council", council: "first-constantinople", document: "the-synodical-letter", section: 6 },
        differs: "Leaves out, with no mark, \"is bishop\" after \"Cyril\": the letter reads \"the right reverend and most religious Cyril is bishop, who was some time ago canonically ordained ...\" (NPNF II 14).",
      },
    },
  ],
  "moses-the-ethiopian": [
    {
      words: "My own sins run out behind me, and I do not see them,",
      cite: {
        kind: "untraced",
        searched: "The saying of the basket of sand (Sayings of the Desert Fathers, Moses 2) is not in any public-domain text the app carries: no Apophthegmata is in the library, and Budge's Paradise of the Fathers, the public-domain English, is not in the app.",
      },
    },
  ],
};
