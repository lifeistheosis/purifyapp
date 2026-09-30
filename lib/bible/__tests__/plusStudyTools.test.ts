import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { BOOKS } from "@/lib/bible/books";
import { chapterCrossRefs, isCrossRefBook } from "@/lib/bible/crossRefs";
import { crossRefHref, crossRefNumbers, parseCrossRef, previewText } from "@/lib/bible/crossRefShape";
import { byMonth, entryFrom, fromThisDay, sortJournal, type JournalEntry } from "@/lib/bible/journal";
import { wroteWhen } from "@/lib/bible/noteAge";

const NT_NAMES = new Map(BOOKS.filter((b) => b.testament === "NT").map((b) => [b.name, b.slug]));

describe("cross-references", () => {
  it("reads a reference, a range and a range across chapters", () => {
    expect(parseCrossRef("John 17:5", NT_NAMES)).toEqual({ book: "john", chapter: 17, verse: 5 });
    expect(parseCrossRef("1 John 1:1-2", NT_NAMES)).toEqual({ book: "1-john", chapter: 1, verse: 1, endVerse: 2 });
    expect(parseCrossRef("Romans 8:38–9:2", NT_NAMES)).toEqual({ book: "romans", chapter: 8, verse: 38, endChapter: 9, endVerse: 2 });
  });

  it("will not place a reference into the Old Testament, whose numbering is the Septuagint's", () => {
    expect(parseCrossRef("Genesis 1:1", NT_NAMES)).toBeNull();
    expect(parseCrossRef("Jeremiah 31:31", NT_NAMES)).toBeNull();
    expect(isCrossRefBook("genesis")).toBe(false);
    expect(isCrossRefBook("john")).toBe(true);
  });

  it("writes the numbers and the link as the reader sees them", () => {
    expect(crossRefNumbers({ chapter: 1, verse: 1, endVerse: 2 })).toBe("1:1-2");
    expect(crossRefNumbers({ chapter: 8, verse: 38, endChapter: 9, endVerse: 2 })).toBe("8:38-9:2");
    expect(crossRefHref({ book: "john", chapter: 17, verse: 5 })).toBe("/bible/john/17#v5");
  });

  it("cuts a preview on a word, never mid-word", () => {
    const long = "In the beginning was the Word, and the Word was with God, and the Word was God. ".repeat(4);
    const cut = previewText(long);
    expect(cut.length).toBeLessThanOrEqual(171);
    expect(cut.endsWith("…")).toBe(true);
    expect(cut).not.toMatch(/\s…$/);
    expect(previewText("Jesus wept.")).toBe("Jesus wept.");
  });

  it("gives John 1 its references, New Testament only, six at most, each with its words", async () => {
    const refs = await chapterCrossRefs("john", 1);
    const first = refs[1];
    expect(first.length).toBeGreaterThan(0);
    for (const list of Object.values(refs)) {
      expect(list.length).toBeLessThanOrEqual(6);
      for (const r of list) {
        expect(isCrossRefBook(r.book)).toBe(true);
        expect(r.text.length).toBeGreaterThan(0);
      }
    }
    // John 1:1 is echoed by John 17:5 in the data, and it lands on that verse.
    expect(first.some((r) => r.book === "john" && r.chapter === 17 && r.verse === 5)).toBe(true);
  });

  it("offers nothing on an Old Testament chapter", async () => {
    expect(await chapterCrossRefs("genesis", 1)).toEqual({});
  });
});

describe("the journal", () => {
  const e = (book: string, at: string | null): JournalEntry => ({ book, chapter: 1, verse: 1, note: "n", at });

  it("reads a note out of a verse's stored annotation, and nothing else", () => {
    expect(entryFrom("purify:bible:john:3:16", JSON.stringify({ note: "Love", noteAt: "2026-09-01T10:00:00Z" }))).toEqual({
      book: "john",
      chapter: 3,
      verse: 16,
      note: "Love",
      at: "2026-09-01T10:00:00Z",
    });
    expect(entryFrom("purify:bible:john:3:16", JSON.stringify({ highlighted: true }))).toBeNull();
    expect(entryFrom("purify:saint:x:y:1:2", JSON.stringify({ note: "n" }))).toBeNull();
  });

  it("puts the newest first and the undated last", () => {
    const sorted = sortJournal([e("a", null), e("b", "2026-05-01T00:00:00Z"), e("c", "2026-09-01T00:00:00Z")]);
    expect(sorted.map((x) => x.book)).toEqual(["c", "b", "a"]);
  });

  it("remembers the notes from this day of the month, four weeks back or more", () => {
    const now = new Date(2026, 8, 30, 10);
    const list = [e("june", new Date(2026, 5, 30, 9).toISOString()), e("today", new Date(2026, 8, 30, 8).toISOString()), e("other", new Date(2026, 6, 12).toISOString())];
    expect(fromThisDay(list, now).map((x) => x.book)).toEqual(["june"]);
  });

  it("groups by month", () => {
    const groups = byMonth([e("a", "2026-09-02T00:00:00Z"), e("b", "2026-09-20T00:00:00Z"), e("c", "2026-08-01T00:00:00Z"), e("d", null)]);
    expect(groups.map((g) => [g.key, g.entries.length])).toEqual([["2026-09", 2], ["2026-08", 1], ["undated", 1]]);
  });

  it("says how long ago in the reader's language", () => {
    const now = new Date("2026-09-30T12:00:00Z");
    expect(wroteWhen("2026-09-30T08:00:00Z", "en", now)).toBe("today");
    expect(wroteWhen("2026-09-29T08:00:00Z", "en", now)).toBe("yesterday");
    expect(wroteWhen("2026-06-30T08:00:00Z", "en", now)).toBe("3 months ago");
    expect(wroteWhen("2025-09-20T08:00:00Z", "en", now)).toBe("last year");
    expect(wroteWhen("2026-06-30T08:00:00Z", "de", now)).toBe("vor 3 Monaten");
  });
});

describe("the Bible text the study tools point into", () => {
  it("has every New Testament chapter a cross-reference could open", () => {
    for (const b of BOOKS.filter((x) => x.testament === "NT")) {
      expect(existsSync(path.join(process.cwd(), "data", "bible", b.slug, `${b.chapters}.json`)), b.slug).toBe(true);
    }
  });
});
