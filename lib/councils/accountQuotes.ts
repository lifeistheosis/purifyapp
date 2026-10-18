import type { Cite } from "@/lib/citations/cite";

/**
 * The quotations inside a council's account as it is written (1.8, the
 * owner's "whatever quote ... you can easily see where it comes from"): what
 * it defined, what it condemned, and its history. Each one's words as the
 * account gives them, and where they stand. The page numbers each where it
 * stands and lists it under the history (app/(app)/councils/[slug]/page.tsx).
 * Held by lib/citations/__tests__/quotes.test.ts.
 *
 * A party's name or a short label in quotation marks ("Spirit-fighters",
 * "out of nothing", "two natures") is a term, not a quotation, and carries
 * none.
 */
export const ACCOUNT_QUOTES: Readonly<Record<string, readonly { words: string; cite: Cite }[]>> = {
  "first-nicaea": [
    // Arius's words, as St Athanasius records them.
    { words: "there was when he was not", cite: { kind: "work", saint: "athanasius-the-great", work: "four-discourses-against-the-arians", section: 1, paragraph: 43 } },
  ],
  "first-constantinople": [
    { words: "This is the faith which ought to be sufficient for you, for us, for all who wrest not the word of the true faith.", cite: { kind: "council", council: "first-constantinople", document: "the-synodical-letter", section: 5 } },
    {
      words: "the Lord, the Giver of Life, who proceedeth from the Father, who with the Father and the Son together is worshipped and glorified",
      cite: {
        kind: "inexact",
        of: { kind: "council", council: "first-constantinople", document: "the-niceno-constantinopolitan-creed", section: 2 },
        differs: "Says \"the Lord, the Giver of Life\" where the app's text of the Creed (NPNF II 14) reads \"the Lord and Giver-of-Life\"; the rest is that text.",
      },
    },
    { words: "because Constantinople is New Rome", cite: { kind: "council", council: "first-constantinople", document: "the-seven-canons", section: 4 } },
  ],
  chalcedon: [
    {
      words: "one incarnate nature of the divine Word",
      cite: {
        kind: "inexact",
        of: { kind: "work", saint: "john-of-damascus", work: "exact-exposition-of-the-orthodox-faith", section: 50, paragraph: 3 },
        differs: "St Cyril's formula, from his letters to Succensus, which are not in the app. St John of Damascus gives it \"according to the blessed Cyril\" as \"one incarnate nature of God the Word\" (NPNF II 9).",
      },
    },
  ],
  "second-constantinople": [
    {
      words: "one incarnate nature of the divine Word",
      cite: {
        kind: "inexact",
        of: { kind: "work", saint: "john-of-damascus", work: "exact-exposition-of-the-orthodox-faith", section: 50, paragraph: 3 },
        differs: "St Cyril's formula, from his letters to Succensus, which are not in the app. St John of Damascus gives it \"according to the blessed Cyril\" as \"one incarnate nature of God the Word\" (NPNF II 9).",
      },
    },
    {
      words: "One of the Trinity suffered in the flesh",
      cite: {
        kind: "inexact",
        of: { kind: "council", council: "second-constantinople", document: "the-capitula", section: 11 },
        differs: "The Theopaschite formula as it is usually given. The council's tenth anathema (NPNF II 14) says \"our Lord Jesus Christ who was crucified in the flesh is true God and the Lord of Glory and one of the Holy Trinity\".",
      },
    },
  ],
  "carthage-256": [
    {
      words: "There is no salvation outside the Church,",
      cite: {
        kind: "untraced",
        searched: "St Cyprian's letter to Jubaianus (Epistle 72 in ANF 5), where the saying stands, is not in the app, and his works in the library do not have these words.",
      },
    },
  ],
};
