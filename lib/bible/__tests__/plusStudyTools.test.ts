import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { BOOKS } from "@/lib/bible/books";
import { chapterCrossRefs, isCrossRefBook } from "@/lib/bible/crossRefs";
import { crossRefHref, crossRefNumbers, parseCrossRef, previewText } from "@/lib/bible/crossRefShape";
import { byMonth, entryFrom, fromThisDay, sortJournal, type JournalEntry } from "@/lib/bible/journal";
import { wroteWhen } from "@/lib/bible/noteAge";

const NAMES = new Map(BOOKS.map((b) => [b.name, b.slug]));

describe("cross-references", () => {
  it("reads a reference, a range and a range across chapters", () => {
    expect(parseCrossRef("John 17:5", NAMES)).toEqual({ book: "john", chapter: 17, verse: 5 });
    expect(parseCrossRef("1 John 1:1-2", NAMES)).toEqual({ book: "1-john", chapter: 1, verse: 1, endVerse: 2 });
    expect(parseCrossRef("Romans 8:38–9:2", NAMES)).toEqual({ book: "romans", chapter: 8, verse: 38, endChapter: 9, endVerse: 2 });
  });

  it("places a reference into the Old Testament from 1.9, the data written in the Septuagint's numbering", () => {
    expect(parseCrossRef("Genesis 1:1", NAMES)).toEqual({ book: "genesis", chapter: 1, verse: 1 });
    expect(parseCrossRef("Psalms 22:1", NAMES)).toEqual({ book: "psalms", chapter: 22, verse: 1 });
    expect(isCrossRefBook("genesis")).toBe(true);
    expect(isCrossRefBook("john")).toBe(true);
    expect(isCrossRefBook("nowhere")).toBe(false);
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

  it("gives John 1 its references, six at most, each with its words, Genesis 1:1 among them", async () => {
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
    // And by Genesis 1:1, which the Old Testament's numbering kept out until 1.9 (the owner's pick A).
    expect(first.some((r) => r.book === "genesis" && r.chapter === 1 && r.verse === 1)).toBe(true);
  });

  it("gives the Old Testament its references where the Septuagint has the verse", async () => {
    // The KJV's Jeremiah 31:31, the new covenant, is the app's 38:31; Hebrews 10:16 echoes it.
    const jeremiah = await chapterCrossRefs("jeremiah", 38);
    expect(jeremiah[31].some((r) => r.book === "hebrews" && r.chapter === 10 && r.verse === 16)).toBe(true);
    // And a New Testament verse points to it there: Hebrews 8:8 to Jeremiah 38:31.
    const hebrews = await chapterCrossRefs("hebrews", 8);
    expect(hebrews[8].some((r) => r.book === "jeremiah" && r.chapter === 38 && r.verse === 31)).toBe(true);
    // Its words are the app's own verse, not the KJV's.
    expect(hebrews[8].find((r) => r.book === "jeremiah")?.text).toMatch(/^Behold, the days come, saith the Lord/);
    // Nothing on a book OpenBible has nothing for.
    expect(await chapterCrossRefs("tobit", 1)).toEqual({});
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
