import { describe, expect, it } from "vitest";

import en from "@/lib/i18n/messages/en.json";
import { searchBible } from "@/lib/bible/books";
import { referenceHref } from "@/lib/bible/parseReferences";
import { referenceItems, referencesIn } from "@/lib/search/references";

const MESSAGES = en as Record<string, string>;

function fill(line: string, with_: Record<string, string | number> = {}): string {
  return line.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in with_ ? String(with_[name]) : whole,
  );
}
const t = (key: string, r?: Record<string, string | number>) => fill(MESSAGES[key] ?? key, r);
const tn = (base: string, count: number, r?: Record<string, string | number>) =>
  fill(MESSAGES[`${base}.${count === 1 ? "one" : "other"}`] ?? base, { ...r, count });

const rows = (query: string) => referenceItems(query, t, tn);
const opens = (query: string) => rows(query).map((r) => r.href);

describe("a typed Bible reference in the one search", () => {
  it("opens a verse where the reader will see it lit", () => {
    const [first, second] = rows("john 3:16");
    expect(first).toMatchObject({
      label: "John 3:16",
      sublabel: "Verse 16 of chapter 3",
      href: "/bible/john/3#v16",
      group: "Bible",
    });
    // The letter is offered too, after the Gospel.
    expect(second).toMatchObject({ label: "1 John 3:16", href: "/bible/1-john/3#v16" });
  });

  it("opens a chapter, and a range as a range", () => {
    expect(opens("ps 23")).toEqual(["/bible/psalms/23"]);
    expect(rows("Psalm 50")[0]).toMatchObject({ label: "Psalms 50", sublabel: "Chapter 50 of 151" });
    expect(rows("1 cor 13:4-8")).toEqual([
      {
        id: "ref-1-corinthians-13-4-8",
        label: "1 Corinthians 13:4–8",
        sublabel: "Verses 4–8 of chapter 13 · 5 verses",
        href: "/bible/1-corinthians/13#v4-8",
        group: "Bible",
      },
    ]);
  });

  it("reads the usual short forms", () => {
    expect(opens("mt 5")).toEqual(["/bible/matthew/5"]);
    expect(opens("jn 1:1")[0]).toBe("/bible/john/1#v1");
    expect(opens("gen 1:1")).toEqual(["/bible/genesis/1#v1"]);
    expect(opens("rev 21")).toEqual(["/bible/revelation/21"]);
    expect(opens("cor 13")).toEqual(["/bible/1-corinthians/13", "/bible/2-corinthians/13"]);
  });

  it("offers the books a word of whose name begins as typed, not every book that contains it", () => {
    // The Bible's own search takes a book whose name merely contains the
    // letters, so this query also names Esther and Matthew there.
    const loose = searchBible("the 2", 8).map((h) => h.book.slug);
    expect(loose).toContain("esther");
    expect(referencesIn("the 2").map((r) => r.book.slug)).toEqual([
      "1-thessalonians",
      "2-thessalonians",
    ]);
  });

  it("adds at most three rows", () => {
    expect(rows("john 1")).toHaveLength(3);
  });

  it("leaves a bare book and a passage known by name to the list, which has them", () => {
    expect(rows("john")).toEqual([]);
    expect(rows("psalms")).toEqual([]);
    expect(rows("susanna")).toEqual([]);
    expect(rows("bel and the dragon")).toEqual([]);
  });

  it("adds nothing for a chapter the book does not have, or for words that name no book", () => {
    expect(rows("john 99")).toEqual([]);
    expect(rows("jude 2")).toEqual([]);
    expect(rows("morning prayers 3")).toEqual([]);
    expect(rows("dark mode")).toEqual([]);
    expect(rows("")).toEqual([]);
    expect(rows("   ")).toEqual([]);
  });

  it("stacks several references on one page, as the Bible's search bar does", () => {
    expect(rows("John 3:16, Ps 23; 1 Tim 2:5")).toEqual([
      {
        id: "ref-multi",
        label: "Open 3 references",
        sublabel: "John 3:16 · Psalms 23 · 1 Timothy 2:5",
        href: "/bible/multi?q=John%203%3A16%2C%20Ps%2023%3B%201%20Tim%202%3A5",
        group: "Bible",
      },
    ]);
    expect(rows("john 3:16,")[0]).toMatchObject({ label: "Open 1 reference" });
    // A comma with no reference either side of it is just a comma.
    expect(rows("peter, paul")).toEqual([]);
  });

  it("builds the same address the Bible's search bar builds", () => {
    const [verse] = searchBible("james 2:14", 1);
    const [range] = searchBible("james 2:14-26", 1);
    const [chapter] = searchBible("james 2", 1);
    if (verse.kind === "book" || range.kind === "book" || chapter.kind === "book") {
      throw new Error("james 2 did not resolve past the book");
    }
    expect(referenceHref(verse)).toBe("/bible/james/2#v14");
    expect(referenceHref(range)).toBe("/bible/james/2#v14-26");
    expect(referenceHref(chapter)).toBe("/bible/james/2");
  });
});
