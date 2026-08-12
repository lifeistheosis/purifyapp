// The reader glossary for 19th century patristic English.
//
// The load-bearing decision is what is NOT marked. "thou" occurs 23,677 times
// in the commentary corpus, "ye" 9,128, "hath" 8,767. Marking those would put a
// dotted underline under roughly every third word and make the page unreadable
// in the name of making it readable, and they are also the words a reader
// guesses correctly unaided. The entries worth interrupting for are the ones a
// reader misreads without knowing: "economy" is God's ordering of salvation,
// not finance.

import { describe, it, expect } from "vitest";
import {
  allEntries,
  isMarked,
  lookup,
  segment,
} from "@/lib/bible/glossary";

describe("the glossary data", () => {
  it("has entries", () => {
    expect(allEntries().length).toBeGreaterThan(30);
  });

  it("gives every entry a gloss and a known kind", () => {
    const kinds = new Set(["form", "false-friend", "term"]);
    for (const e of allEntries()) {
      expect(e.word.trim(), JSON.stringify(e)).not.toBe("");
      expect(e.gloss.trim(), e.word).not.toBe("");
      expect(kinds.has(e.kind), `${e.word} has kind ${e.kind}`).toBe(true);
    }
  });

  it("carries no em dash, which is a standing rule for reader-facing copy", () => {
    for (const e of allEntries()) {
      expect(e.gloss.includes("—"), e.word).toBe(false);
    }
  });

  it("has no duplicate words", () => {
    const words = allEntries().map((e) => e.word.toLowerCase());
    expect(new Set(words).size).toBe(words.length);
  });
});

describe("what gets marked", () => {
  it("leaves the common older forms unmarked", () => {
    // The design decision. If this ever flips, the reading page fills with
    // dotted underlines and the feature becomes the problem it was solving.
    for (const w of ["thou", "thee", "thy", "ye", "hath", "saith", "doth"]) {
      const entry = lookup(w);
      expect(entry, `${w} should still be defined`).not.toBeNull();
      expect(isMarked(entry!), `${w} must not be marked`).toBe(false);
    }
  });

  it("marks the false friends, which are the ones a reader misreads silently", () => {
    for (const w of ["economy", "dispensation", "condescension"]) {
      const entry = lookup(w);
      expect(entry, w).not.toBeNull();
      expect(isMarked(entry!), w).toBe(true);
    }
  });

  it("marks technical terms", () => {
    for (const w of ["hypostasis", "consubstantial", "catechumen"]) {
      expect(isMarked(lookup(w)!), w).toBe(true);
    }
  });
});

describe("segment", () => {
  it("returns one plain run when nothing is marked", () => {
    const parts = segment("For thou hast said unto thy servant, and ye know it.");
    expect(parts).toHaveLength(1);
    expect(parts[0].entry).toBeUndefined();
  });

  it("splits a marked word out of the surrounding text", () => {
    const parts = segment("He speaks here of the economy of salvation.");
    const marked = parts.filter((p) => p.entry);
    expect(marked).toHaveLength(1);
    expect(marked[0].text.toLowerCase()).toBe("economy");
    // Nothing is dropped: the parts rejoin to the original.
    expect(parts.map((p) => p.text).join("")).toBe(
      "He speaks here of the economy of salvation.",
    );
  });

  it("matches case-insensitively but preserves what was written", () => {
    const parts = segment("Economy and ECONOMY alike.");
    const marked = parts.filter((p) => p.entry);
    expect(marked.map((p) => p.text)).toEqual(["Economy", "ECONOMY"]);
  });

  it("never matches inside a longer word", () => {
    // "meat" is a false friend; "meaty" is not this word at all.
    const parts = segment("a meaty argument about schismatics");
    expect(parts.filter((p) => p.entry)).toHaveLength(0);
  });

  it("handles several marked words in one paragraph", () => {
    const parts = segment("The economy, the dispensation, and the schism.");
    expect(parts.filter((p) => p.entry)).toHaveLength(3);
  });

  it("rejoins to the original for any input", () => {
    for (const s of [
      "",
      "economy",
      "the economy",
      "economy of the dispensation",
      "no marked words at all here",
    ]) {
      expect(segment(s).map((p) => p.text).join("")).toBe(s);
    }
  });
});
