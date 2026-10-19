import type { Cite } from "@/lib/citations/cite";

/**
 * The quotations inside a heresy's claim and the Church's response as they
 * are written (1.8): each one's words, and where they stand. The page
 * numbers each where it stands and lists it under the two
 * (app/(app)/heresies/[slug]/page.tsx). Held by
 * lib/citations/__tests__/quotes.test.ts. A party's name in quotation marks
 * ("Spirit-fighters", "Three Chapters") is a term, not a quotation.
 */
export const HERESY_QUOTES: Readonly<Record<string, readonly { words: string; cite: Cite }[]>> = {
  arianism: [
    // Arius's words, as St Athanasius records them.
    { words: "there was when he was not", cite: { kind: "work", saint: "athanasius-the-great", work: "four-discourses-against-the-arians", section: 1, paragraph: 43 } },
  ],
  macedonianism: [
    // The Creed's article in the app's text of it (NPNF II 14), since 2026-10-18.
    {
      words: "the Lord and Giver-of-Life, who proceedeth from the Father, who with the Father and the Son together is worshipped and glorified.",
      cite: { kind: "council", council: "first-constantinople", document: "the-niceno-constantinopolitan-creed", section: 2 },
    },
  ],
  eutychianism: [
    {
      // Percival's English of the Definition (NPNF II 14), which the History of Chalcedon quotes; a later wording stood here until 2026-10-18.
      words: "unconfusedly, immutably, indivisibly, inseparably,",
      cite: { kind: "text", author: "The Council of Chalcedon", work: "The Definition of Faith", place: "the confession of the two natures", edition: "tr. Percival, NPNF II 14" },
    },
  ],
  monothelitism: [{ words: "not my will, but thine, be done.", cite: { kind: "scripture", book: "luke", chapter: 22, from: 42 } }],
  iconoclasm: [
    // The decree's own words (NPNF II 14), since 2026-10-18.
    { words: "the honour which is paid to the image passes on to that which the image represents.", cite: { kind: "council", council: "second-nicaea", document: "the-decree-on-the-holy-icons", section: 2 } },
  ],
};

/**
 * Quotations a heresy's page gave with no public-domain text behind them,
 * said in our own words instead, without quotation marks, on the owner's
 * word of 2026-10-18, and kept here with where we looked. Never shown.
 */
export const HIDDEN_HERESY_QUOTES: Readonly<Record<string, readonly { words: string; cite: Cite }[]>> = {
  eutychianism: [
    { words: "like a drop of honey in the sea.", cite: { kind: "untraced", searched: "An image of Eutyches's teaching in common use; not in the library, the councils' documents, or the commentary." } },
  ],
};
