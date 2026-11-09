// The words of a search that found nothing (A11): what may be kept, under the
// three limits Edgar approved.

import { describe, expect, it } from "vitest";

import { missWords } from "../missWords";

describe("missWords", () => {
  it("keeps the words, lower case, one space apart", () => {
    expect(missWords("  Saint   Nektarios ")).toBe("saint nektarios");
    expect(missWords("Ἅγιος Νεκτάριος")).toBe("ἅγιος νεκτάριος");
    expect(missWords("Святой Серафим")).toBe("святой серафим");
  });

  it("takes out an email address, a phone number, a web address and an account id", () => {
    expect(missWords("prayer for maria.k@example.com")).toBe("prayer for");
    expect(missWords("call +1 (555) 123-4567 please")).toBe("call please");
    expect(missWords("https://example.org/x akathist")).toBe("akathist");
    expect(missWords("3f1c2b8e-1d2a-4f5b-9c7d-0a1b2c3d4e5f")).toBeNull();
  });

  it("keeps short numbers, which name a psalm or a chapter, not a person", () => {
    expect(missWords("psalm 151")).toBe("psalm 151");
    expect(missWords("john 3:16")).toBe("john 3:16");
  });

  it("keeps nothing too short, too long, or with no letter in it", () => {
    expect(missWords("a")).toBeNull();
    expect(missWords("x".repeat(81))).toBeNull();
    expect(missWords("1234")).toBeNull();
    expect(missWords("??")).toBeNull();
    expect(missWords(42)).toBeNull();
    expect(missWords("someone@example.com")).toBeNull();
  });
});
