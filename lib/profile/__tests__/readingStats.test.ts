// The reading counters shown on the You tab and the account dashboard.
//
// These used to be two separate localStorage scans that happened to agree.
// The counting is pure now, so it can be held to the rules directly.

import { describe, expect, it } from "vitest";

import { countAnnotations } from "@/lib/profile/readingStats";

function entries(o: Record<string, string | null>) {
  return Object.entries(o);
}

describe("countAnnotations", () => {
  it("counts a highlighted verse and a highlighted paragraph separately", () => {
    expect(
      countAnnotations(
        entries({
          "purify:bible:john.1.1": JSON.stringify({ highlighted: true }),
          "purify:saint:athanasius.on-the-incarnation.3": JSON.stringify({
            highlighted: true,
          }),
        }),
      ),
    ).toEqual({ verses: 1, paragraphs: 1, notes: 0 });
  });

  it("counts a note from either side, and counts both when an entry has both", () => {
    expect(
      countAnnotations(
        entries({
          "purify:bible:john.1.1": JSON.stringify({
            highlighted: true,
            note: "the Word",
          }),
          "purify:saint:basil.hexaemeron.2": JSON.stringify({ note: "on light" }),
        }),
      ),
    ).toEqual({ verses: 1, paragraphs: 0, notes: 2 });
  });

  it("ignores a whitespace-only note", () => {
    expect(
      countAnnotations(
        entries({ "purify:bible:john.1.1": JSON.stringify({ note: "   " }) }),
      ).notes,
    ).toBe(0);
  });

  it("skips a malformed entry rather than losing the whole tally", () => {
    expect(
      countAnnotations(
        entries({
          "purify:bible:broken": "{not json",
          "purify:bible:john.1.1": JSON.stringify({ highlighted: true }),
        }),
      ),
    ).toEqual({ verses: 1, paragraphs: 0, notes: 0 });
  });

  it("does not miscount the other keys that share the purify:bible: prefix", () => {
    // The last-read pointer, the testament tab and the highlight legend all
    // live under this prefix and are not annotations.
    expect(
      countAnnotations(
        entries({
          "purify:bible:last": JSON.stringify({
            book: "john",
            chapter: 1,
            verse: 1,
          }),
          "purify:bible:lastTestament": JSON.stringify("nt"),
          "purify:bible:highlight-legend": JSON.stringify({ gold: "Promise" }),
        }),
      ),
    ).toEqual({ verses: 0, paragraphs: 0, notes: 0 });
  });

  it("ignores keys outside both prefixes", () => {
    expect(
      countAnnotations(
        entries({
          "purify:bookmarks": JSON.stringify([{ id: "a" }, { id: "b" }]),
          "purify:intentions:living": JSON.stringify([{ name: "Maria" }]),
        }),
      ),
    ).toEqual({ verses: 0, paragraphs: 0, notes: 0 });
  });

  it("counts nothing from an empty store", () => {
    expect(countAnnotations([])).toEqual({
      verses: 0,
      paragraphs: 0,
      notes: 0,
    });
  });
});
