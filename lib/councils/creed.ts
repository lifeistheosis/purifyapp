/**
 * The Creed by council (1.9, s6-07 of docs/1.9-build/ideas.json: "The Creed
 * line by line, showing which council gave which line").
 *
 * The Creed the Church recites is the Symbol of the 150 Fathers at
 * Constantinople in 381, which took the Symbol of the 318 Fathers at Nicaea
 * in 325 and filled it out. Here is the Creed of 381 in its twelve articles,
 * as the Orthodox catechisms number them (St Philaret of Moscow's Longer
 * Catechism among them), each article in pieces, each piece marked with the
 * council whose Symbol first has it.
 *
 * The words are the app's own copies of both Symbols, word for word
 * (data/councils/first-constantinople/the-niceno-constantinopolitan-creed.json
 * and data/councils/first-nicaea/the-symbol-of-the-faith.json, Schaff and
 * Wace's NPNF II 14, public domain), and the marks are not a reading of
 * them: lib/councils/__tests__/creed.test.ts holds every piece to the two
 * texts. Joined, the pieces are the Creed of 381 letter for letter; a piece
 * marked Nicaea is found in the Symbol of 325 as it stands, and a piece marked
 * Constantinople is found nowhere in it. Where 381 moved a phrase of 325 (the
 * only begotten, before the Son of God), each part is marked where it is
 * found. The few words of 325 that 381 does not repeat ("of the substance of
 * the Father", "God of God", "both which be in heaven and in earth") are not
 * in the Creed recited, so they are not here; the Symbol of 325 is read whole
 * on its own page.
 */

export type CreedCouncil = "first-nicaea" | "first-constantinople";

/** A run of an article's words, and the council whose Symbol first has them. */
export type CreedPiece = { words: string; from: CreedCouncil };

/** One of the twelve articles, as its pieces. Joined with no space added, the pieces are the article. */
export type CreedArticle = { n: number; pieces: readonly CreedPiece[] };

const N = (words: string): CreedPiece => ({ words, from: "first-nicaea" });
const C = (words: string): CreedPiece => ({ words, from: "first-constantinople" });

/** Where the words of 381 and of 325 are kept, for the test and for the page's link. */
export const CREED_SOURCES = {
  "first-constantinople": { council: "first-constantinople", document: "the-niceno-constantinopolitan-creed", section: 2, year: 381 },
  "first-nicaea": { council: "first-nicaea", document: "the-symbol-of-the-faith", section: 2, year: 325 },
} as const satisfies Record<CreedCouncil, { council: CreedCouncil; document: string; section: number; year: number }>;

export const CREED_ARTICLES: readonly CreedArticle[] = [
  { n: 1, pieces: [N("We believe in one God, the Father Almighty, maker of "), C("heaven and earth and of "), N("all things visible and invisible.")] },
  {
    n: 2,
    pieces: [
      N("And in one Lord Jesus Christ, the "),
      N("only begotten "),
      N("Son of God, "),
      N("begotten of his Father "),
      C("before all worlds, "),
      N("Light of Light, very God of very God, begotten not made, being of one substance with the Father, by whom all things were made."),
    ],
  },
  {
    n: 3,
    pieces: [
      N("Who for us men and for our salvation came down from heaven and was incarnate "),
      C("by the Holy Ghost and the Virgin Mary, "),
      N("and was made man,"),
    ],
  },
  { n: 4, pieces: [C("and was crucified also for us under Pontius Pilate. "), N("He suffered "), C("and was buried,")] },
  { n: 5, pieces: [N("and the third day he rose again "), C("according to the Scriptures,")] },
  { n: 6, pieces: [N("and ascended into heaven, "), C("and sitteth at the Right Hand of the Father.")] },
  {
    n: 7,
    pieces: [N("And he shall come again "), C("with glory "), N("to judge both the quick and the dead. "), C("Whose kingdom shall have no end.")],
  },
  {
    n: 8,
    pieces: [
      N("And we believe in the Holy Ghost, "),
      C("the Lord and Giver-of-Life, who proceedeth from the Father, who with the Father and the Son together is worshipped and glorified, who spake by the prophets."),
    ],
  },
  { n: 9, pieces: [C("And we believe in one, holy, Catholic and Apostolic Church.")] },
  { n: 10, pieces: [C("We acknowledge one Baptism for the remission of sins,")] },
  { n: 11, pieces: [C("and we look for the resurrection of the dead")] },
  { n: 12, pieces: [C("and the life of the world to come. Amen.")] },
];

/** An article's words, whole. */
export function articleText(article: CreedArticle): string {
  return article.pieces.map((p) => p.words).join("");
}

/**
 * Which council an article is from, as a reader is told it: Nicaea where
 * every piece is Nicaea's, Constantinople where every piece is
 * Constantinople's, and both where Constantinople filled out an article of
 * Nicaea.
 */
export function articleCouncils(article: CreedArticle): readonly CreedCouncil[] {
  const from = new Set(article.pieces.filter((p) => /\p{L}/u.test(p.words)).map((p) => p.from));
  return (["first-nicaea", "first-constantinople"] as const).filter((c) => from.has(c));
}
