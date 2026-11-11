import { describe, expect, it } from "vitest";

import { MIN_WORDS, bookWords, findQuote, normWords } from "../find";

// "Who said it" (1.8): a line is found where the app carries it word for
// word, a reworded one is found as close and said to be, and one the app does
// not carry is not found, never matched to our own retellings.

describe("who said it", () => {
  it("finds a line word for word, and says where", () => {
    const [first] = findQuote("Let no one fear death, for the Saviour's death hath set us free.");
    expect(first.match).toBe("exact");
    expect(first.cite.href).toBe("/saints/john-chrysostom/paschal-homily#p-1-4");
    expect(first.cite.work).toBe("The Paschal Homily");
  });

  it("finds the line as the book prints it when the words going round differ", () => {
    // How the homily is usually quoted online, not Hapgood's words.
    const found = findQuote("Let no one fear death, for the Savior's death has set us free. He has destroyed it by enduring it.");
    expect(found.length).toBeGreaterThan(0);
    expect(found.every((f) => f.match === "close")).toBe(true);
  });

  it("finds a Father in the councils' own documents", () => {
    const [first] = findQuote("of one substance with the Father, by whom all things were made. Who for us men and for our salvation came down");
    expect(first?.match).toBe("exact");
    expect(first?.cite.href).toMatch(/^\/councils\//);
  });

  it("finds nothing for words no public-domain text we carry has", () => {
    // Given to St Seraphim everywhere; no public-domain English of it has been found.
    expect(findQuote("Acquire a peaceful spirit, and around you thousands will be saved.")).toEqual([]);
  });

  it("never matches our own retellings", () => {
    // A sentence of St Ephraim's page, which is our summary (editorial).
    expect(findQuote("as if there were two suns, the one in the sky and the one in His face")).toEqual([]);
  });

  it("asks for enough words to mean something", () => {
    expect(normWords("God is love")).toHaveLength(3);
    expect(findQuote("God is love")).toEqual([]);
    expect(MIN_WORDS).toBe(5);
  });

  // 1.9, build 93 note 11: what a reader learns by heart is the book's own
  // words for the line, never the line as it was pasted.
  describe("the book's own words for a line", () => {
    const PARA =
      "And he said: \u201cLet no one fear death, for the Saviour\u2019s death hath set us free. He hath destroyed it by enduring it.\u201d Thus far the well-known homily; the rest is not ours to add.";

    it("are exactly the words a line matched, as the book prints them", () => {
      // Pasted in the spelling that goes round: the book's spelling comes back.
      expect(bookWords(PARA, "let no one fear death for the saviors death has set us free")).toBe(
        "Let no one fear death, for the Saviour\u2019s death hath set us free.",
      );
      // A word the book joins with a hyphen is two plain words and one printed run.
      expect(bookWords(PARA, "thus far the well known homily")).toBe("Thus far the well-known homily");
    });

    it("are the stretch that holds most of a line that is close, and never the paste", () => {
      const pasted = "Let no one fear death, because the Savior's death has set us free and he destroyed it by enduring it";
      const words = bookWords(PARA, pasted)!;
      expect(words).toContain("the Saviour\u2019s death hath set us free");
      expect(words).not.toContain("because");
      expect(PARA).toContain(words);
    });

    it("are nothing for a line the paragraph does not hold", () => {
      expect(bookWords(PARA, "acquire a peaceful spirit and thousands around you")).toBeNull();
    });

    it("come with every answer, word for word in its paragraph", () => {
      const [exact] = findQuote("Let no one fear death, for the Saviour's death hath set us free.");
      expect(normWords(exact.words)).toEqual(normWords("Let no one fear death, for the Saviour's death hath set us free."));
      expect(exact.words).toMatch(/^Let no one fear death/);
      const close = findQuote("Let no one fear death, for the Savior's death has set us free. He has destroyed it by enduring it.");
      for (const f of close) {
        expect(f.words.length).toBeGreaterThan(20);
        expect(f.words.length).toBeLessThanOrEqual(600);
        expect(f.words).not.toMatch(/^\u2026|\u2026$/);
      }
    });
  });
});
