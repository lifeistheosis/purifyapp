import { describe, expect, it } from "vitest";

import { MIN_WORDS, findQuote, normWords } from "../find";

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
});
