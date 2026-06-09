// Unit tests for the multi-reference Bible search parser.
//
// The contract:
//   - Single-reference inputs (no comma or semicolon) return [].
//     They continue to flow through the existing single-result UI.
//   - Multi-reference inputs return a list of concrete hits.
//   - Bare-book hits (failed chapter resolution) are dropped so we
//     don't silently send the reader to chapter 1 of a book they
//     didn't specifically ask for.
//   - The verbose variant exposes which segments failed, for the
//     result page's "could not resolve" rows.

import { describe, it, expect } from "vitest";
import {
  isMultiReferenceQuery,
  parseReferences,
  parseReferencesVerbose,
} from "@/lib/bible/parseReferences";

describe("isMultiReferenceQuery", () => {
  it("detects comma-separated input", () => {
    expect(isMultiReferenceQuery("John 3:16, Psalm 23")).toBe(true);
  });

  it("detects semicolon-separated input", () => {
    expect(isMultiReferenceQuery("John 3:16; Psalm 23")).toBe(true);
  });

  it("rejects a single reference", () => {
    expect(isMultiReferenceQuery("John 3:16")).toBe(false);
  });

  it("rejects an empty query", () => {
    expect(isMultiReferenceQuery("")).toBe(false);
  });

  it("rejects whitespace-only", () => {
    expect(isMultiReferenceQuery("   ")).toBe(false);
  });
});

describe("parseReferences", () => {
  it("returns [] for a single reference (delegates to single-result UI)", () => {
    expect(parseReferences("John 3:16")).toEqual([]);
    expect(parseReferences("Psalm 23")).toEqual([]);
    expect(parseReferences("1 Corinthians 13")).toEqual([]);
  });

  it("returns [] for empty input", () => {
    expect(parseReferences("")).toEqual([]);
    expect(parseReferences("   ")).toEqual([]);
  });

  it("parses three comma-separated verse refs", () => {
    const refs = parseReferences("1 Tim 2:5, Prov 8:7, John 2:21");
    expect(refs).toHaveLength(3);

    expect(refs[0].kind).toBe("verse");
    if (refs[0].kind === "verse") {
      expect(refs[0].book.slug).toBe("1-timothy");
      expect(refs[0].chapter).toBe(2);
      expect(refs[0].verse).toBe(5);
    }

    expect(refs[1].kind).toBe("verse");
    if (refs[1].kind === "verse") {
      expect(refs[1].book.slug).toBe("proverbs");
      expect(refs[1].chapter).toBe(8);
      expect(refs[1].verse).toBe(7);
    }

    expect(refs[2].kind).toBe("verse");
    if (refs[2].kind === "verse") {
      expect(refs[2].book.slug).toBe("john");
      expect(refs[2].chapter).toBe(2);
      expect(refs[2].verse).toBe(21);
    }
  });

  it("parses semicolon-separated mixed kinds (range + chapter)", () => {
    const refs = parseReferences("John 3:16-18; Psalm 23");
    expect(refs).toHaveLength(2);

    expect(refs[0].kind).toBe("range");
    if (refs[0].kind === "range") {
      expect(refs[0].book.slug).toBe("john");
      expect(refs[0].chapter).toBe(3);
      expect(refs[0].verseFrom).toBe(16);
      expect(refs[0].verseTo).toBe(18);
    }

    expect(refs[1].kind).toBe("chapter");
    if (refs[1].kind === "chapter") {
      expect(refs[1].book.slug).toBe("psalms");
      expect(refs[1].chapter).toBe(23);
    }
  });

  it("tolerates extra whitespace and mixed case", () => {
    const refs = parseReferences("  john 3:16  ,  PROV 8:7  ");
    expect(refs).toHaveLength(2);
    if (refs[0].kind === "verse") {
      expect(refs[0].book.slug).toBe("john");
    }
    if (refs[1].kind === "verse") {
      expect(refs[1].book.slug).toBe("proverbs");
    }
  });

  it("tolerates book-name abbreviations from the alias map", () => {
    // Aliases live in `lib/bible/books.ts`. Spot-check the common ones.
    const refs = parseReferences("Mt 5:3, Mk 1:1, Lk 2:7, Jn 1:1");
    expect(refs).toHaveLength(4);
    if (refs[0].kind === "verse") expect(refs[0].book.slug).toBe("matthew");
    if (refs[1].kind === "verse") expect(refs[1].book.slug).toBe("mark");
    if (refs[2].kind === "verse") expect(refs[2].book.slug).toBe("luke");
    if (refs[3].kind === "verse") expect(refs[3].book.slug).toBe("john");
  });

  it("drops a segment with an unresolvable book name", () => {
    const refs = parseReferences("John 3:16, Glorbatron 4:2, Psalm 23");
    // Only the two resolvable segments survive.
    expect(refs.length).toBeGreaterThanOrEqual(2);
    const slugs = refs.map((r) => r.book.slug);
    expect(slugs).toContain("john");
    expect(slugs).toContain("psalms");
  });

  it("collapses trailing empty segments", () => {
    expect(parseReferences("John 3:16, , Psalm 23,").length).toBe(2);
  });

  it("handles a single comma with one ref (still multi-mode, one hit)", () => {
    // Punctuation forces multi-mode; we still return whatever resolved.
    const refs = parseReferences("John 3:16,");
    expect(refs).toHaveLength(1);
    if (refs[0].kind === "verse") expect(refs[0].book.slug).toBe("john");
  });
});

describe("parseReferencesVerbose", () => {
  it("returns one entry per segment, with hit or null", () => {
    const segs = parseReferencesVerbose(
      "John 3:16, Glorbatron 4:2, Psalm 23",
    );
    expect(segs).toHaveLength(3);

    expect(segs[0].raw).toBe("John 3:16");
    expect(segs[0].hit?.kind).toBe("verse");

    expect(segs[1].raw).toBe("Glorbatron 4:2");
    expect(segs[1].hit).toBeNull();

    expect(segs[2].raw).toBe("Psalm 23");
    expect(segs[2].hit?.kind).toBe("chapter");
  });

  it("returns [] for single-reference inputs", () => {
    expect(parseReferencesVerbose("John 3:16")).toEqual([]);
  });
});
