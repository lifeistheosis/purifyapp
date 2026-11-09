import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { CREED_ARTICLES, CREED_SOURCES, articleCouncils, articleText } from "../creed";

// The Creed by council (lib/councils/creed.ts): every mark held to the two
// Symbols the app carries, word for word, so no line is said to be a
// council's that its Symbol does not have.

type Doc = { sections: { n: number; paragraphs: string[] }[] };
const doc = (council: string, document: string): Doc => JSON.parse(readFileSync(`data/councils/${council}/${document}.json`, "utf8"));
const section = (d: Doc, n: number) => d.sections.find((s) => s.n === n)!;

const C381 = CREED_SOURCES["first-constantinople"];
const C325 = CREED_SOURCES["first-nicaea"];
const creed381 = section(doc(C381.council, C381.document), C381.section).paragraphs.join(" ");
// The Symbol of 325 itself: its first paragraph. The second is its anathemas,
// which are not the Creed.
const symbol325 = section(doc(C325.council, C325.document), C325.section).paragraphs[0];

/**
 * Words only, to compare runs of them: the edition's Greek glosses in
 * brackets taken out ("begotten (γεννηθέντα), not made"), "only-begotten"
 * read as "only begotten", the case and the punctuation set aside.
 */
const plain = (text: string) =>
  ` ${text
    .replace(/\([^)]*[Ͱ-Ͽ][^)]*\)/g, " ")
    .replace(/-/g, " ")
    .toLowerCase()
    .replace(/[^\p{L}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()} `;

describe("the Creed by council", () => {
  it("is the Creed of 381, letter for letter, in twelve articles", () => {
    expect(CREED_ARTICLES.map((a) => a.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(CREED_ARTICLES.map(articleText).join(" ")).toBe(creed381);
    // The article on the Holy Spirit begins the Symbol's second paragraph.
    expect(articleText(CREED_ARTICLES[7]).startsWith("And we believe in the Holy Ghost")).toBe(true);
  });

  it("marks Nicaea only where the Symbol of 325 has those words", () => {
    const nicene = CREED_ARTICLES.flatMap((a) => a.pieces).filter((p) => p.from === "first-nicaea");
    expect(nicene.length).toBeGreaterThan(10);
    for (const piece of nicene) expect(plain(symbol325), piece.words).toContain(plain(piece.words));
  });

  it("marks Constantinople only where the Symbol of 325 has nothing of the kind", () => {
    const added = CREED_ARTICLES.flatMap((a) => a.pieces).filter((p) => p.from === "first-constantinople");
    expect(added.length).toBeGreaterThan(10);
    for (const piece of added) expect(plain(symbol325), piece.words).not.toContain(plain(piece.words));
  });

  it("gives back every word of the Symbol of 325 that 381 repeats", () => {
    let rest = plain(symbol325);
    for (const piece of CREED_ARTICLES.flatMap((a) => a.pieces).filter((p) => p.from === "first-nicaea")) {
      rest = rest.replace(plain(piece.words), " ");
    }
    // What 381 does not repeat, and so is marked nowhere: read on the Symbol's own page.
    for (const words of ["of the substance of the father", "god of god", "both which be in heaven and in earth"]) {
      expect(rest, words).toContain(` ${words} `);
      rest = rest.replace(` ${words} `, " ");
    }
    // And the one place this English cannot be cut twice: 325's "the
    // only-begotten of his Father" gives 381 both its "only begotten" and its
    // "begotten of his Father", as the Greek of 325 has both (μονογενῆ, and
    // γεννηθέντα ἐκ τοῦ πατρὸς). Nothing else of 325 is left over.
    expect(rest.trim().split(/\s+/)).toEqual(["the", "of", "his", "father"]);
  });

  it("says which council each article is from, as the Creed's history has it", () => {
    const from = CREED_ARTICLES.map(articleCouncils);
    // The Father, the Son, and the Holy Spirit's first words are Nicaea's, filled out at Constantinople.
    expect(from[0]).toEqual(["first-nicaea", "first-constantinople"]);
    expect(from[7]).toEqual(["first-nicaea", "first-constantinople"]);
    // The Church, baptism, the resurrection and the age to come were added in 381.
    for (const n of [9, 10, 11, 12]) expect(from[n - 1]).toEqual(["first-constantinople"]);
    // The Filioque is not in the Creed.
    expect(CREED_ARTICLES.map(articleText).join(" ")).not.toMatch(/and the Son\b(?! together)/);
  });

  it("carries no em dash", () => {
    for (const a of CREED_ARTICLES) expect(articleText(a)).not.toContain("—");
  });
});
