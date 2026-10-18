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
    {
      words: "the Lord, the Giver of Life, who proceedeth from the Father, who with the Father and the Son together is worshipped and glorified.",
      cite: {
        kind: "inexact",
        of: { kind: "council", council: "first-constantinople", document: "the-niceno-constantinopolitan-creed", section: 2 },
        differs: "Says \"the Lord, the Giver of Life\" where the app's text of the Creed (NPNF II 14) reads \"the Lord and Giver-of-Life\"; the rest is that text.",
      },
    },
  ],
  eutychianism: [
    {
      words: "like a drop of honey in the sea.",
      cite: { kind: "untraced", searched: "An image of Eutyches's teaching in common use; not in the library, the councils' documents, or the commentary." },
    },
    {
      words: "without confusion, without change, without division, without separation,",
      cite: {
        kind: "untraced",
        searched: "Chalcedon's Definition of Faith is not among the app's documents of the council (it has the canons). The History of Chalcedon quotes Percival's English of it (NPNF II 14): \"unconfusedly, immutably, indivisibly, inseparably\"; these words are a later rendering.",
      },
    },
  ],
  monothelitism: [{ words: "not my will, but thine, be done.", cite: { kind: "scripture", book: "luke", chapter: 22, from: 42 } }],
  iconoclasm: [
    {
      words: "the honour paid to the image passes to its prototype.",
      cite: {
        kind: "inexact",
        of: { kind: "council", council: "second-nicaea", document: "the-decree-on-the-holy-icons", section: 2 },
        differs: "The council's decree (NPNF II 14) reads \"the honour which is paid to the image passes on to that which the image represents\". The words are closer to St Basil's, on which the council drew: \"the honour paid to the image passes on to the prototype\" (On the Holy Spirit 18.45, NPNF II 8).",
      },
    },
  ],
};
