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
const CYRIL_FORMULA: Cite = { kind: "work", saint: "john-of-damascus", work: "exact-exposition-of-the-orthodox-faith", section: 50, paragraph: 3 };

export const ACCOUNT_QUOTES: Readonly<Record<string, readonly { words: string; cite: Cite }[]>> = {
  "first-nicaea": [
    // Arius's words, as St Athanasius records them.
    { words: "there was when he was not", cite: { kind: "work", saint: "athanasius-the-great", work: "four-discourses-against-the-arians", section: 1, paragraph: 43 } },
  ],
  "first-constantinople": [
    { words: "This is the faith which ought to be sufficient for you, for us, for all who wrest not the word of the true faith.", cite: { kind: "council", council: "first-constantinople", document: "the-synodical-letter", section: 5 } },
    // The Creed's article on the Spirit in the app's text of it (NPNF II 14), since 2026-10-18.
    {
      words: "the Lord and Giver-of-Life, who proceedeth from the Father, who with the Father and the Son together is worshipped and glorified",
      cite: { kind: "council", council: "first-constantinople", document: "the-niceno-constantinopolitan-creed", section: 2 },
    },
    { words: "because Constantinople is New Rome", cite: { kind: "council", council: "first-constantinople", document: "the-seven-canons", section: 4 } },
  ],
  // St Cyril's formula in the public-domain words St John of Damascus gives it "according to the blessed Cyril" (NPNF II 9).
  chalcedon: [{ words: "one incarnate nature of God the Word", cite: CYRIL_FORMULA }],
  "second-constantinople": [
    { words: "one incarnate nature of God the Word", cite: CYRIL_FORMULA },
    {
      words: "One of the Trinity suffered in the flesh",
      cite: {
        kind: "inexact",
        of: { kind: "council", council: "second-constantinople", document: "the-capitula", section: 11 },
        differs: "The Theopaschite formula as it is usually given. The council's tenth anathema (NPNF II 14) says \"our Lord Jesus Christ who was crucified in the flesh is true God and the Lord of Glory and one of the Holy Trinity\".",
      },
    },
  ],
};

/**
 * Quotations an account gave with no public-domain text behind them, said in
 * our own words instead, without quotation marks, on the owner's word of
 * 2026-10-18, and kept here with where we looked. Never shown.
 */
export const HIDDEN_ACCOUNT_QUOTES: Readonly<Record<string, readonly { words: string; cite: Cite }[]>> = {
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
